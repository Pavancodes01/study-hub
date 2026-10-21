(function(){
var SRC = String.raw`import java.util.*;

interface Dice { int roll(); }

class RandomDice implements Dice {
    private final Random random = new Random();
    public int roll() { return random.nextInt(6) + 1; }
}

class FixedDice implements Dice {                         // for tests: predictable rolls
    private final Deque<Integer> rolls;
    FixedDice(Integer... values) { rolls = new ArrayDeque<>(List.of(values)); }
    public int roll() { return rolls.poll(); }
}

class Board {
    final int size;
    private final Map<Integer, Integer> jumps = new HashMap<>();     // snakes and ladders: from -> to
    Board(int size) { this.size = size; }
    void addSnake(int head, int tail) {
        if (tail >= head) throw new IllegalArgumentException("snake must go down");
        jumps.put(head, tail);
    }
    void addLadder(int bottom, int top) {
        if (top <= bottom) throw new IllegalArgumentException("ladder must go up");
        jumps.put(bottom, top);
    }
    int jump(int pos) { return jumps.getOrDefault(pos, pos); }
}

class Player {
    final String name;
    int position;
    Player(String name) { this.name = name; }
}

class Game {
    private final Board board;
    private final Dice dice;
    private final Deque<Player> turns = new ArrayDeque<>();
    Game(Board board, Dice dice, List<Player> players) { this.board = board; this.dice = dice; turns.addAll(players); }

    Optional<Player> playTurn() {
        Player p = turns.poll();
        int roll = dice.roll();
        int next = p.position + roll;
        if (next > board.size) {                              // must land exactly on the last square
            System.out.println(p.name + " rolls " + roll + ", needs exact roll");
            turns.add(p);
            return Optional.empty();
        }
        int landed = board.jump(next);
        System.out.println(p.name + " rolls " + roll + ": " + p.position + " -> " + next
            + (landed > next ? " ladder to " + landed : landed < next ? " snake to " + landed : ""));
        p.position = landed;
        if (landed == board.size) return Optional.of(p);
        turns.add(p);                                         // back of the queue
        return Optional.empty();
    }

    Player play() {
        while (true) {
            Optional<Player> winner = playTurn();
            if (winner.isPresent()) return winner.get();
        }
    }
}

class SnakeLadderDemo {
    public static void main(String[] args) {
        Board board = new Board(20);
        board.addLadder(3, 12);
        board.addSnake(17, 5);
        board.addLadder(8, 16);
        Game game = new Game(board, new FixedDice(3, 4, 5, 4, 3, 6, 4), List.of(new Player("Maya"), new Player("Ravi")));
        System.out.println(game.play().name + " wins");
    }
}`;
var dg = { kind: 'class', w: 840, h: 380, classes: [
  { id: 'game', name: 'Game', x: 20, y: 30, w: 250, fields: ['- board: Board', '- dice: Dice', '- turns: Deque<Player>'], methods: ['+ playTurn(): Optional<Player>', '+ play(): Player'] },
  { id: 'board', name: 'Board', x: 340, y: 30, w: 250, fields: ['- size: int', '- jumps: Map<Integer, Integer>'], methods: ['+ addSnake(head, tail)', '+ addLadder(bottom, top)', '+ jump(pos): int'] },
  { id: 'player', name: 'Player', x: 20, y: 250, w: 200, fields: ['- name: String', '- position: int'], methods: [] },
  { id: 'dice', name: 'Dice', stereo: 'interface', x: 340, y: 250, w: 180, fields: [], methods: ['+ roll(): int'] },
  { id: 'rd', name: 'RandomDice', x: 560, y: 220, w: 160, fields: [], methods: [] },
  { id: 'fd', name: 'FixedDice', x: 560, y: 310, w: 160, fields: [], methods: [] }
], rels: [
  { from: 'game', to: 'board', type: 'composition' },
  { from: 'game', to: 'player', type: 'aggregation', fm: '1', tm: '2..*' },
  { from: 'game', to: 'dice', type: 'association' },
  { from: 'rd', to: 'dice', type: 'implements' },
  { from: 'fd', to: 'dice', type: 'implements' }
] };
var seq = { kind: 'seq', w: 760, parts: [{ id: 'g', name: 'Game' }, { id: 'd', name: 'Dice' }, { id: 'b', name: 'Board' }, { id: 'p', name: 'Maya' }], msgs: [
  { from: 'g', to: 'g', label: 'turns.poll()', text: 'The next player comes off the front of the queue.', code: ['Player p = turns.poll();'] },
  { from: 'g', to: 'd', label: 'roll()', text: 'Dice is an interface: random in real games, fixed in tests.', code: ['int roll = dice.roll();'] },
  { from: 'd', to: 'g', label: '3', ret: true, text: 'Maya rolls 3: 0 → 3.', code: ['public int roll() { return rolls.poll(); }'] },
  { from: 'g', to: 'b', label: 'jump(3)', text: 'The board knows snakes and ladders as one map from → to.', code: ['int landed = board.jump(next);'] },
  { from: 'b', to: 'g', label: '12 (ladder)', ret: true, text: 'Square 3 has a ladder to 12.', code: ['int jump(int pos) { return jumps.getOrDefault(pos, pos); }'] },
  { from: 'g', to: 'p', label: 'position = 12', text: 'Update the player and put them at the back of the queue.', code: ['p.position = landed;', 'turns.add(p);'] }
] };
registerDesign({
  slug: 'snake-ladder', order: 11, title: 'Snake and ladder',
  one: 'A small game that shows clean modelling: ==the board knows jumps, the dice is an interface, players take turns from a queue==, and fixed dice make it testable.',
  questions: ['Board size? Number of players?', 'Exact roll needed to finish?', 'Several dice? Extra turn on a six?', 'Can a square have both a snake head and a ladder bottom?', 'Do we need replay or undo?'],
  reqs: { func: ['Board with snakes and ladders', 'Players take turns rolling a die', 'Apply jumps', 'First to reach the last square exactly wins'], nonfunc: ['Deterministic tests', 'New rules (two dice, extra turn on six) easy to add'], out: ['UI', 'network play', 'saving games'] },
  entities: [['game', '`Game`', 'Turn order, rules, winner'], ['board', '`Board`', 'Size, snakes and ladders'], ['snake / ladder', 'entries in a `Map<Integer, Integer>`', 'From square → to square'], ['player', '`Player`', 'Name and position'], ['dice', '`Dice` interface', 'Random or fixed rolls']],
  diagramNotes: ['Snakes and ladders are the same thing: "if you land on X, go to Y". One map handles both, and the constructors validate direction.', '`Dice` is an interface so tests inject `FixedDice` and get the same game every time.'],
  flowNotes: ['A turn: next player from the queue → roll → move → apply jump → win check → back of the queue.'],
  flows: [
    { name: 'Class diagram', title: 'Snake and ladder classes', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'The board', add: ['board'], on: ['board'], text: 'Snakes and ladders are both jumps in one map.', code: ['class Board {', 'private final Map<Integer, Integer> jumps = new HashMap<>();'] },
      { title: 'Players and turns', add: ['game', 'player'], on: ['game', 'player'], rels: ['game-board', 'game-player'], text: 'A queue gives round-robin turns: poll the front, add back at the end.', code: ['private final Deque<Player> turns = new ArrayDeque<>();'] },
      { title: 'Dice as an interface', add: ['dice', 'rd', 'fd'], on: ['dice'], rels: ['game-dice'], text: 'Random in production, fixed in tests.', code: ['interface Dice { int roll(); }', 'class FixedDice implements Dice {'] }
    ]},
    { name: 'One turn', title: 'Maya\'s first turn', diagram: seq, code: '@main' }
  ],
  patterns: [['Strategy', '`Dice`', 'Random vs fixed vs loaded dice.'], ['Dependency injection', 'Dice passed into Game', 'Deterministic tests.'], ['Queue for turns', '`Deque<Player>`', 'Simple round robin.']],
  code: { file: 'SnakeLadderDemo.java', src: SRC, expect: 'Maya rolls 3: 0 -> 3 ladder to 12\nRavi rolls 4: 0 -> 4\nMaya rolls 5: 12 -> 17 snake to 5\nRavi rolls 4: 4 -> 8 ladder to 16\nMaya rolls 3: 5 -> 8 ladder to 16\nRavi rolls 6, needs exact roll\nMaya rolls 4: 16 -> 20\nMaya wins' },
  concurrency: [['One game', 'Single-threaded by nature; turns are sequential.'], ['Many games on a server', 'Each game is an independent object; no shared state.']],
  extensions: [['Two dice', '`Dice` implementation that sums two rolls.'], ['Extra turn on a six', 'Do not add the player to the back of the queue when roll == 6.'], ['Chains of jumps', 'Loop `jump` until the position stops changing (and validate no cycles).'], ['Undo', 'Record moves as commands.']],
  probe: [['How do you test a game with dice?', ['Make dice an interface and inject a fixed sequence of rolls, then assert the exact output.']], ['Why one map for snakes and ladders?', ['Both are "landing on X moves you to Y". Separate classes add no behaviour; validation in `addSnake`/`addLadder` keeps them correct.']], ['How do you add a new rule like an extra turn?', ['Keep rules in `Game.playTurn` or extract a `Rule` interface if they grow; dice and board stay unchanged.']]],
  say: ['Snakes and ladders are one jump map on the board.', 'Dice is an interface, so tests use fixed rolls.', 'A deque gives round-robin turns.'],
  facts: [['jumps', 'Map from → to'], ['turns', 'Deque poll/add'], ['test', 'FixedDice'], ['win', 'exact landing']],
  checklist: ['Draw the classes.', 'Write playTurn with exact-finish rule.', 'Explain how to test with fixed dice.'],
  drills: {
    mcq: [{ id: 'mcq-sl', title: 'Testing randomness', ask: 'How do you write a reliable test for a full game?', options: [['Inject a `FixedDice` with a known sequence of rolls', true, 'Same rolls, same game, assertable output.'], ['Run the game 1000 times and hope', false, 'Not a precise test.'], ['Seed `Math.random` globally', false, 'Fragile and hidden.'], ['Skip testing', false, 'No.']] }],
    code: [{ id: 'code-sl', title: 'Apply a jump', ask: 'Use the jump map.', run: 'JumpDemo', expect: '12\n7', code: String.raw`import java.util.*;
class JumpDemo {
    public static void main(String[] args) {
        Map<Integer, Integer> jumps = new HashMap<>();
        jumps.put(3, 12);
        System.out.println(jumps.[[getOrDefault]](3, 3));
        System.out.println(jumps.getOrDefault(7, [[7]]));
    }
}` }],
    order: [{ id: 'ord-sl', title: 'A turn', ask: 'Order the steps.', steps: ['Take the next player from the front of the queue', 'Roll the dice', 'If the roll overshoots the last square, skip the move', 'Move and apply any snake or ladder', 'Check for a win, else put the player at the back'], extra: ['Let every player roll at the same time'] }],
    classes: { id: 'cls-sl', title: 'Design snake and ladder', reqs: ['Board with snakes and ladders', '2+ players', 'Testable dice'], parts: [['Game', 'must', 'Turns and rules.'], ['Board', 'must', 'Size and jumps.'], ['Player', 'must', 'Position.'], ['Dice interface', 'must', 'Random or fixed.'], ['Snake and Ladder classes', 'good', 'Optional; a map is enough unless they gain behaviour.'], ['Cell class for each of 100 squares', 'no', 'Squares are just numbers.'], ['Math.random() inside Game', 'no', 'Untestable.']] }
  }
});
})();
