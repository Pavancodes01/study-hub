(function(){
var SRC = String.raw`import java.util.*;

record Book(String isbn, String title, String author) {}

class BookCopy {                                       // one physical copy of a book
    final String id;
    final Book book;
    boolean available = true;
    BookCopy(String id, Book book) { this.id = id; this.book = book; }
}

class Member {
    final String id, name;
    final int maxLoans;
    final List<Loan> loans = new ArrayList<>();
    Member(String id, String name, int maxLoans) { this.id = id; this.name = name; this.maxLoans = maxLoans; }
}

class Loan {
    final BookCopy copy;
    final Member member;
    final int dueDay;
    Loan(BookCopy copy, Member member, int dueDay) { this.copy = copy; this.member = member; this.dueDay = dueDay; }
}

interface FinePolicy { int fine(int daysLate); }
class PerDayFine implements FinePolicy {
    public int fine(int daysLate) { return Math.max(0, daysLate) * 10; }
}

interface ReservationListener { void available(Member m, Book b); }

class Library {
    private static final int LOAN_DAYS = 14;
    private final Map<String, List<BookCopy>> copiesByIsbn = new HashMap<>();
    private final Map<String, Deque<Member>> reservations = new HashMap<>();
    private final FinePolicy fines;
    private final ReservationListener listener;
    Library(FinePolicy fines, ReservationListener listener) { this.fines = fines; this.listener = listener; }

    void addCopy(BookCopy c) { copiesByIsbn.computeIfAbsent(c.book.isbn(), k -> new ArrayList<>()).add(c); }

    List<Book> searchByAuthor(String author) {
        return copiesByIsbn.values().stream().map(l -> l.get(0).book)
            .filter(b -> b.author().contains(author)).toList();
    }

    synchronized Optional<Loan> checkout(Member m, String isbn, int today) {
        if (m.loans.size() >= m.maxLoans) return Optional.empty();
        for (BookCopy c : copiesByIsbn.getOrDefault(isbn, List.of())) {
            if (c.available) {
                c.available = false;
                Loan loan = new Loan(c, m, today + LOAN_DAYS);
                m.loans.add(loan);
                return Optional.of(loan);
            }
        }
        return Optional.empty();
    }

    synchronized void reserve(Member m, String isbn) {
        reservations.computeIfAbsent(isbn, k -> new ArrayDeque<>()).add(m);
    }

    synchronized int giveBack(Loan loan, int today) {
        loan.copy.available = true;
        loan.member.loans.remove(loan);
        Deque<Member> queue = reservations.get(loan.copy.book.isbn());
        if (queue != null && !queue.isEmpty()) listener.available(queue.poll(), loan.copy.book);   // first in line
        return fines.fine(today - loan.dueDay);
    }
}

class LibraryDemo {
    public static void main(String[] args) {
        Library lib = new Library(new PerDayFine(),
            (m, b) -> System.out.println("notify " + m.name + ": " + b.title() + " is available"));
        Book cleanCode = new Book("111", "Clean Code", "Robert Martin");
        lib.addCopy(new BookCopy("C1", cleanCode));
        Member maya = new Member("M1", "Maya", 2), ravi = new Member("M2", "Ravi", 2);

        System.out.println(lib.searchByAuthor("Martin").size() + " book found");
        Loan loan = lib.checkout(maya, "111", 1).orElseThrow();
        System.out.println("Maya due day " + loan.dueDay);
        System.out.println("Ravi got copy: " + lib.checkout(ravi, "111", 2).isPresent());
        lib.reserve(ravi, "111");
        System.out.println("fine " + lib.giveBack(loan, 18));
    }
}`;
var dg = { kind: 'class', w: 880, h: 440, classes: [
  { id: 'lib', name: 'Library', x: 20, y: 20, w: 290, fields: ['- copiesByIsbn: Map<String, List>', '- reservations: Map<String, Deque>', '- fines: FinePolicy'], methods: ['+ checkout(m, isbn, today)', '+ giveBack(loan, today): int', '+ reserve(m, isbn)'] },
  { id: 'book', name: 'Book', stereo: 'record', x: 400, y: 30, w: 200, fields: ['isbn, title, author'], methods: [] },
  { id: 'copy', name: 'BookCopy', x: 400, y: 170, w: 200, fields: ['- id: String', '- available: boolean'], methods: [] },
  { id: 'loan', name: 'Loan', x: 400, y: 320, w: 200, fields: ['- copy, member', '- dueDay: int'], methods: [] },
  { id: 'mem', name: 'Member', x: 680, y: 300, w: 180, fields: ['- maxLoans: int', '- loans: List<Loan>'], methods: [] },
  { id: 'fp', name: 'FinePolicy', stereo: 'interface', x: 680, y: 30, w: 180, fields: [], methods: ['+ fine(daysLate)'] },
  { id: 'rl', name: 'ReservationListener', stereo: 'interface', x: 20, y: 300, w: 270, fields: [], methods: ['+ available(member, book)'] }
], rels: [
  { from: 'lib', to: 'copy', type: 'aggregation', fm: '1', tm: '*' },
  { from: 'copy', to: 'book', type: 'association' },
  { from: 'loan', to: 'copy', type: 'association' },
  { from: 'mem', to: 'loan', type: 'aggregation', fm: '1', tm: '0..max' },
  { from: 'lib', to: 'fp', type: 'association', via: [[165, 8], [770, 8]] },
  { from: 'lib', to: 'rl', type: 'association' }
] };
var seq = { kind: 'seq', w: 800, parts: [{ id: 'm', name: 'Maya' }, { id: 'l', name: 'Library' }, { id: 'f', name: 'PerDayFine' }, { id: 'r', name: 'Listener' }], msgs: [
  { from: 'm', to: 'l', label: 'giveBack(loan, day 18)', text: 'Maya returns the book 3 days after the due day (15).', code: ['synchronized int giveBack(Loan loan, int today) {'] },
  { from: 'l', to: 'l', label: 'copy.available = true', text: 'The copy is free again and the loan leaves Maya\'s list.', code: ['loan.copy.available = true;', 'loan.member.loans.remove(loan);'] },
  { from: 'l', to: 'r', label: 'available(Ravi, Clean Code)', text: 'Ravi reserved this book, so the first person in the queue is notified.', code: ['if (queue != null && !queue.isEmpty()) listener.available(queue.poll(), loan.copy.book);'] },
  { from: 'l', to: 'f', label: 'fine(3)', text: 'Fines are a policy (strategy): 10 per day here.', code: ['return fines.fine(today - loan.dueDay);'] },
  { from: 'f', to: 'l', label: '30', ret: true, text: 'Returned to the desk.', code: ['public int fine(int daysLate) { return Math.max(0, daysLate) * 10; }'] }
] };
registerDesign({
  slug: 'library', order: 10, title: 'Library management',
  one: 'Separate the ==book (title) from its physical copies==, track loans per member with limits, reserve books, notify on return, and charge fines through a policy.',
  questions: ['Can a library have several copies of the same book?', 'Borrowing limits and loan period?', 'Reservations / waiting lists?', 'How are fines calculated?', 'Search by title, author, ISBN?'],
  reqs: { func: ['Search books', 'Check out an available copy', 'Return a copy and compute a fine', 'Reserve a book and notify when available'], nonfunc: ['Two members cannot get the same copy', 'Fine rules can change', 'Notification channel can change'], out: ['payments', 'e-books', 'inter-library loans'] },
  entities: [['book (title)', '`Book` record', 'ISBN, title, author'], ['copy', '`BookCopy`', 'One physical item, available or not'], ['member', '`Member`', 'Loan limit, current loans'], ['loan', '`Loan`', 'Copy, member, due day'], ['fine rule', '`FinePolicy`', 'Days late → amount'], ['notification', '`ReservationListener`', 'Tell reservers a book is back']],
  diagramNotes: ['The classic modelling trap is one `Book` class for both the title and the physical item. Separating `Book` (what) from `BookCopy` (which one) makes several copies, availability and loans natural.', 'Fines and notifications are interfaces because they are the parts most likely to change.'],
  flowNotes: ['Return: free the copy, notify the first reserver, compute the fine.'],
  flows: [
    { name: 'Class diagram', title: 'Library classes', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'Book vs copy', add: ['book', 'copy'], on: ['book', 'copy'], text: 'A title can have many physical copies. Only copies are borrowed.', code: ['record Book(String isbn, String title, String author) {}', 'class BookCopy {'] },
      { title: 'Members and loans', add: ['loan', 'mem'], on: ['loan', 'mem'], text: 'A loan links one copy to one member with a due day. Members have a loan limit.', code: ['class Loan {', 'class Member {'] },
      { title: 'The library', add: ['lib'], on: ['lib'], rels: ['lib-copy'], text: 'Indexes copies by ISBN and runs checkout and return.', code: ['class Library {', 'synchronized Optional<Loan> checkout(Member m, String isbn, int today) {'] },
      { title: 'Policies', add: ['fp', 'rl'], on: ['fp', 'rl'], rels: ['lib-fp', 'lib-rl'], text: 'Fines and reservation notifications plug in from outside.', code: ['interface FinePolicy', 'interface ReservationListener'] }
    ]},
    { name: 'Return late', title: 'Return, notify, fine', diagram: seq, code: '@main' }
  ],
  patterns: [['Strategy', '`FinePolicy`', 'Different fine rules per member type or library.'], ['Observer', '`ReservationListener`', 'Notify reservers without the library knowing how.'], ['Repository (extension)', 'Storage of books and members', 'Swap in-memory for a database.']],
  code: { file: 'LibraryDemo.java', src: SRC, expect: '1 book found\nMaya due day 15\nRavi got copy: false\nnotify Ravi: Clean Code is available\nfine 30' },
  concurrency: [['Two members check out the last copy', '`checkout` is synchronized; at scale, lock per ISBN or use a DB conditional update.'], ['Return and reserve at the same time', 'Both synchronized on the library, so the queue is consistent.']],
  extensions: [['Different fines for students', 'Another `FinePolicy`, chosen per member type.'], ['Email and SMS notifications', 'Listeners for each channel.'], ['Hold a returned book for the reserver', 'Copy state: AVAILABLE, ON_HOLD, BORROWED.'], ['Search by many fields', 'Separate `Catalog` with indexes per field.']],
  probe: [['Why separate Book and BookCopy?', ['Title data is shared by all copies; availability and loans belong to a specific copy. One class would duplicate title data or make multiple copies awkward.']], ['How do you prevent two people borrowing the same copy?', ['Make "find available copy and mark it borrowed" atomic: synchronized method, lock per ISBN, or a DB update with `WHERE available = true`.']], ['Where should fine logic go?', ['In a `FinePolicy` strategy, so rules can vary by member type without touching the library.']]],
  say: ['I separate the title (`Book`) from physical `BookCopy` objects; loans point to copies.', 'Fines are a strategy and reservations use a listener.', 'Checkout is atomic so two members never get the same copy.'],
  facts: [['Book', 'what (title)'], ['BookCopy', 'which one (physical)'], ['fines', 'Strategy'], ['reserve', 'queue + listener']],
  checklist: ['Explain Book vs BookCopy.', 'Write checkout and return.', 'Add a fine policy and a reservation listener.'],
  drills: {
    mcq: [{ id: 'mcq-lib', title: 'Modelling copies', ask: 'A library has 5 copies of "Clean Code". Best model?', options: [['One `Book` and five `BookCopy` objects', true, 'Shared title data, separate availability.'], ['Five `Book` objects with the same title', false, 'Duplicates data; hard to search and reserve.'], ['One `Book` with a `copies` counter', false, 'Cannot track which copy is with whom.'], ['A subclass per copy', false, 'Copies are data.']] }],
    code: [{ id: 'code-lib', title: 'Find a free copy', ask: 'Borrow the first available copy.', run: 'CopyFind', expect: 'C2', code: String.raw`import java.util.*;
class Copy { final String id; boolean available; Copy(String id, boolean a) { this.id = id; available = a; } }
class CopyFind {
    public static void main(String[] args) {
        List<Copy> copies = List.of(new Copy("C1", false), new Copy("C2", true));
        for (Copy c : copies) {
            if ([[c.available]]) { c.available = [[false]]; System.out.println(c.id); [[break]]; }
        }
    }
}` }],
    order: [{ id: 'ord-lib', title: 'Return a book', ask: 'Order the steps.', steps: ['Mark the copy available', 'Remove the loan from the member', 'If someone reserved the book, notify the first in line', 'Compute the fine with the fine policy', 'Return the fine amount'], extra: ['Delete the Book record'] }],
    classes: { id: 'cls-lib', title: 'Design the library', reqs: ['Many copies per title', 'Loans with due dates and limits', 'Reservations and fines'], parts: [['Book', 'must', 'Title data.'], ['BookCopy', 'must', 'Physical item.'], ['Member', 'must', 'Limits and loans.'], ['Loan', 'must', 'Who has which copy until when.'], ['FinePolicy', 'must', 'Pluggable fines.'], ['ReservationListener', 'good', 'Notifications.'], ['Librarian extends Member', 'no', 'Roles do not need inheritance here.'], ['Book with an isBorrowed flag', 'no', 'Breaks with several copies.']] }
  }
});
})();
