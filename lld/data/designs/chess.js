(function(){
var SRC = String.raw`enum Color { WHITE, BLACK }

record Pos(int row, int col) {
    static Pos of(String s) { return new Pos(s.charAt(1) - '1', s.charAt(0) - 'a'); }   // "e2" -> row 1, col 4
}

abstract class Piece {
    final Color color;
    Piece(Color color) { this.color = color; }
    abstract boolean canMove(Board b, Pos from, Pos to);       // each piece knows its own rule
}

class Rook extends Piece {
    Rook(Color c) { super(c); }
    boolean canMove(Board b, Pos f, Pos t) { return (f.row() == t.row() || f.col() == t.col()) && b.pathClear(f, t); }
}
class Bishop extends Piece {
    Bishop(Color c) { super(c); }
    boolean canMove(Board b, Pos f, Pos t) { return Math.abs(f.row() - t.row()) == Math.abs(f.col() - t.col()) && b.pathClear(f, t); }
}
class Queen extends Piece {
    Queen(Color c) { super(c); }
    boolean canMove(Board b, Pos f, Pos t) { return new Rook(color).canMove(b, f, t) || new Bishop(color).canMove(b, f, t); }
}
class Knight extends Piece {
    Knight(Color c) { super(c); }
    boolean canMove(Board b, Pos f, Pos t) {
        int dr = Math.abs(f.row() - t.row()), dc = Math.abs(f.col() - t.col());
        return dr * dc == 2;                                   // (1,2) or (2,1)
    }
}
class King extends Piece {
    King(Color c) { super(c); }
    boolean canMove(Board b, Pos f, Pos t) { return Math.max(Math.abs(f.row() - t.row()), Math.abs(f.col() - t.col())) == 1; }
}
class Pawn extends Piece {
    Pawn(Color c) { super(c); }
    boolean canMove(Board b, Pos f, Pos t) {
        int dir = color == Color.WHITE ? 1 : -1, start = color == Color.WHITE ? 1 : 6;
        int dr = t.row() - f.row(), dc = Math.abs(t.col() - f.col());
        if (dc == 0 && b.at(t) == null) return dr == dir || (dr == 2 * dir && f.row() == start && b.pathClear(f, t));
        return dc == 1 && dr == dir && b.at(t) != null;        // diagonal capture
    }
}

class Board {
    private final Piece[][] grid = new Piece[8][8];
    Piece at(Pos p) { return grid[p.row()][p.col()]; }
    void put(Pos p, Piece piece) { grid[p.row()][p.col()] = piece; }
    boolean pathClear(Pos f, Pos t) {                          // squares strictly between f and t are empty
        int dr = Integer.signum(t.row() - f.row()), dc = Integer.signum(t.col() - f.col());
        for (int r = f.row() + dr, c = f.col() + dc; r != t.row() || c != t.col(); r += dr, c += dc) {
            if (grid[r][c] != null) return false;
        }
        return true;
    }
    static Board standard() {
        Board b = new Board();
        for (Color color : Color.values()) {
            int back = color == Color.WHITE ? 0 : 7, pawns = color == Color.WHITE ? 1 : 6;
            Piece[] row = { new Rook(color), new Knight(color), new Bishop(color), new Queen(color),
                            new King(color), new Bishop(color), new Knight(color), new Rook(color) };
            for (int c = 0; c < 8; c++) { b.grid[back][c] = row[c]; b.grid[pawns][c] = new Pawn(color); }
        }
        return b;
    }
}

class Game {
    private final Board board = Board.standard();
    private Color turn = Color.WHITE;
    private boolean over;

    String move(String f, String t) {
        if (over) return "game over";
        Pos from = Pos.of(f), to = Pos.of(t);
        Piece p = board.at(from);
        if (p == null || p.color != turn) return "illegal: not your piece";
        Piece target = board.at(to);
        if (target != null && target.color == turn) return "illegal: own piece at " + t;
        if (!p.canMove(board, from, to)) return "illegal: " + p.getClass().getSimpleName() + " cannot move " + f + "-" + t;
        board.put(to, p);
        board.put(from, null);
        String msg = p.getClass().getSimpleName() + " " + f + "-" + t + (target != null ? " captures " + target.getClass().getSimpleName() : "");
        if (target instanceof King) { over = true; msg += ", " + turn + " wins"; }
        turn = turn == Color.WHITE ? Color.BLACK : Color.WHITE;
        return msg;
    }
}

class ChessDemo {
    public static void main(String[] args) {
        Game g = new Game();
        String[] moves = { "a1 a3", "e7 e5", "e2 e4", "e7 e5", "f1 c4", "b8 c6", "d1 h5", "g8 f6", "h5 f7", "e8 f7" };
        for (String m : moves) {
            String[] p = m.split(" ");
            System.out.println(g.move(p[0], p[1]));
        }
    }
}`;
var dg = { kind: 'class', w: 880, h: 460, classes: [
  { id: 'game', name: 'Game', x: 20, y: 20, w: 230, fields: ['- board: Board', '- turn: Color', '- over: boolean'], methods: ['+ move(from, to): String'] },
  { id: 'board', name: 'Board', x: 320, y: 20, w: 240, fields: ['- grid: Piece[8][8]'], methods: ['+ at(pos): Piece', '+ pathClear(from, to)', '+ static standard(): Board'] },
  { id: 'piece', name: 'Piece', stereo: 'abstract', x: 320, y: 220, w: 260, fields: ['# color: Color'], methods: ['+ canMove(board, from, to)'] },
  { id: 'pos', name: 'Pos', stereo: 'record', x: 640, y: 30, w: 200, fields: ['row: int', 'col: int'], methods: ['+ static of("e2"): Pos'] },
  { id: 'k', name: 'King', x: 20, y: 380, w: 110, fields: [], methods: [] },
  { id: 'q', name: 'Queen', x: 145, y: 380, w: 110, fields: [], methods: [] },
  { id: 'r', name: 'Rook', x: 270, y: 380, w: 110, fields: [], methods: [] },
  { id: 'b', name: 'Bishop', x: 395, y: 380, w: 110, fields: [], methods: [] },
  { id: 'n', name: 'Knight', x: 520, y: 380, w: 110, fields: [], methods: [] },
  { id: 'p', name: 'Pawn', x: 645, y: 380, w: 110, fields: [], methods: [] }
], rels: [
  { from: 'game', to: 'board', type: 'composition' },
  { from: 'board', to: 'piece', type: 'aggregation', fm: '1', tm: '0..32' },
  { from: 'k', to: 'piece', type: 'inherits' }, { from: 'q', to: 'piece', type: 'inherits' }, { from: 'r', to: 'piece', type: 'inherits' },
  { from: 'b', to: 'piece', type: 'inherits' }, { from: 'n', to: 'piece', type: 'inherits' }, { from: 'p', to: 'piece', type: 'inherits' },
  { from: 'board', to: 'pos', type: 'dependency' }
] };
var seq = { kind: 'seq', w: 800, parts: [{ id: 'pl', name: 'Player' }, { id: 'g', name: 'Game' }, { id: 'b', name: 'Board' }, { id: 'q', name: 'Queen' }], msgs: [
  { from: 'pl', to: 'g', label: 'move("d1", "h5")', text: 'White moves the queen.', code: ['String move(String f, String t) {'] },
  { from: 'g', to: 'b', label: 'at(d1), at(h5)', text: 'Game checks turn and that the target is not its own piece.', code: ['if (p == null || p.color != turn) return "illegal: not your piece";', 'if (target != null && target.color == turn)'] },
  { from: 'g', to: 'q', label: 'canMove(board, d1, h5)', text: 'The piece checks its own movement rule: a queen moves like a rook or a bishop.', code: ['if (!p.canMove(board, from, to))', 'return new Rook(color).canMove(b, f, t) || new Bishop(color).canMove(b, f, t);'] },
  { from: 'q', to: 'b', label: 'pathClear(d1, h5)', text: 'Sliding pieces need an empty path: e2, f3, g4.', code: ['boolean pathClear(Pos f, Pos t) {'] },
  { from: 'q', to: 'g', label: 'true', ret: true, text: 'Legal.', code: ['return (f.row() == t.row() || f.col() == t.col()) && b.pathClear(f, t);'] },
  { from: 'g', to: 'b', label: 'put(h5, queen)', text: 'Apply the move and pass the turn.', code: ['board.put(to, p);', 'turn = turn == Color.WHITE ? Color.BLACK : Color.WHITE;'] }
] };
registerDesign({
  slug: 'chess', order: 6, title: 'Chess game',
  one: 'Each piece type knows its own movement rule (==polymorphism==), the board knows positions and paths, and the game enforces turns and captures.',
  questions: ['Two human players on one device, or online?', 'Full rules (check, checkmate, castling, en passant, promotion) or basic moves?', 'Move history and undo?', 'Timers?', 'AI opponent?'],
  reqs: { func: ['Standard starting position', 'Validate moves per piece type', 'Alternate turns, capture pieces', 'End the game when a king is captured (simplified)'], nonfunc: ['Adding a rule (e.g. castling) touches few classes', 'Board logic testable without UI'], out: ['check/checkmate detection', 'castling', 'en passant', 'promotion', 'timers'] },
  entities: [['game', '`Game`', 'Turn order, applying moves, end of game'], ['board', '`Board`', 'Grid of pieces, path checks, setup'], ['piece', '`Piece` (abstract) + 6 subclasses', 'Movement rule per type'], ['square', '`Pos` (record)', 'Row and column, parsed from "e2"'], ['color', '`Color` enum', 'White or black']],
  diagramNotes: ['The key design choice: `canMove` is **abstract on Piece** and each subclass implements its own rule. The game never switches on piece type.', 'The board owns geometry (`pathClear`) because several pieces need it. Rules involving the whole position (check, castling) belong in `Game` or a separate `RuleValidator`.'],
  flowNotes: ['A move: turn check → own-piece check → piece rule (with path check for sliders) → apply → switch turn.'],
  flows: [
    { name: 'Class diagram', title: 'Chess classes', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'The game', add: ['game'], on: ['game'], text: 'Owns the board and whose turn it is.', code: ['class Game {', 'private Color turn = Color.WHITE;'] },
      { title: 'Board and squares', add: ['board', 'pos'], on: ['board', 'pos'], rels: ['game-board'], text: 'An 8×8 array of pieces, plus a `Pos` value type for squares.', code: ['class Board {', 'record Pos(int row, int col) {'] },
      { title: 'Abstract piece', add: ['piece'], on: ['piece'], rels: ['board-piece'], text: 'Every piece answers one question: can I move from here to there?', code: ['abstract class Piece {', 'abstract boolean canMove(Board b, Pos from, Pos to);'] },
      { title: 'Six piece types', add: ['k', 'q', 'r', 'b', 'n', 'p'], on: ['n', 'p'], text: 'Each implements its own rule. Knight: `dr * dc == 2`. Pawn: forward into empty, diagonal to capture.', code: ['class Knight extends Piece {', 'return dr * dc == 2;', 'class Pawn extends Piece {'] }
    ]},
    { name: 'A move', title: 'Moving the queen', diagram: seq, code: '@main' }
  ],
  patterns: [['Polymorphism / Strategy', '`Piece.canMove`', 'Each piece type owns its rule.'], ['Factory', '`Board.standard()`', 'One place builds the starting position.'], ['Command (extension)', 'Moves as objects', 'Enables undo and move history.'], ['Memento (extension)', 'Board snapshots', 'Undo and replay.']],
  code: { file: 'ChessDemo.java', src: SRC, expect: 'illegal: Rook cannot move a1-a3\nillegal: not your piece\nPawn e2-e4\nPawn e7-e5\nBishop f1-c4\nKnight b8-c6\nQueen d1-h5\nKnight g8-f6\nQueen h5-f7 captures Pawn\nKing e8-f7 captures Queen' },
  concurrency: [['Online play: two moves arrive at once', 'Serialize moves per game (synchronized `move`, or one actor per game).'], ['Many games on one server', 'Games are independent objects; no shared mutable state between them.']],
  extensions: [['Check detection', 'After a move, ask: can any enemy piece `canMove` to my king? If yes, the move is illegal.'], ['Undo', 'Store each move as a `Move` command with captured piece; undo reverses it.'], ['Castling, en passant', 'Track whether king/rooks moved and the last move; validate in `Game`.'], ['Promotion', 'When a pawn reaches the last row, replace it with a chosen piece.']],
  probe: [['Why not one big switch on piece type?', ['Every new rule would edit the switch. With `canMove` on each subclass, piece rules are isolated and testable.']], ['Where does check detection go?', ['It depends on the whole position, so in `Game` (or a `RuleValidator`): apply the move on a copy, then see if any opponent piece attacks the king.']], ['How would you add undo?', ['Represent moves as Command objects (from, to, moved piece, captured piece) and keep a stack.']]],
  say: ['Each piece implements `canMove`, so the game never switches on type.', 'The board handles geometry like path checks; whole-position rules like check live in the game.', 'Moves can become Command objects for undo and history.'],
  facts: [['rule', 'Piece.canMove (polymorphic)'], ['path', 'Board.pathClear'], ['setup', 'Board.standard() factory'], ['undo', 'Command']],
  checklist: ['Draw Game, Board, Piece hierarchy.', 'Write canMove for knight and pawn.', 'Explain where check detection goes.'],
  drills: {
    mcq: [{ id: 'mcq-ch', title: 'Adding a fairy piece', ask: 'You add an "Archbishop" (bishop + knight moves). What changes?', options: [['One new subclass implementing `canMove`', true, 'Polymorphism keeps other code untouched.'], ['A new case in every switch on piece type', false, 'There should be no such switches.'], ['Change Board.grid size', false, 'Unrelated.'], ['Change Color', false, 'Unrelated.']] }],
    code: [{ id: 'code-ch', title: 'Knight rule', ask: 'Complete the knight\'s move check.', run: 'KnightDemo', expect: 'true\nfalse', code: String.raw`class KnightDemo {
    static boolean knight(int fr, int fc, int tr, int tc) {
        int dr = [[Math.abs(fr - tr)]], dc = Math.abs(fc - tc);
        return dr * dc == [[2]];
    }
    public static void main(String[] args) {
        System.out.println(knight(0, 1, 2, 2));
        System.out.println(knight(0, 1, [[2]], 1));
    }
}` }],
    order: [{ id: 'ord-ch', title: 'Validate a move', ask: 'Order the checks in `Game.move`.', steps: ['Game is not over', 'There is a piece of the current player on the from square', 'The target square does not hold your own piece', 'The piece\'s own rule allows the move (including path)', 'Apply the move, record any capture, switch turns'], extra: ['Switch turns before validating'] }],
    classes: { id: 'cls-ch', title: 'Design chess', reqs: ['Two players, standard pieces', 'Validate moves', 'Easy to add new rules'], parts: [['Game', 'must', 'Turns and move application.'], ['Board', 'must', 'Squares and geometry.'], ['Piece (abstract)', 'must', 'Common type with canMove.'], ['King/Queen/Rook/Bishop/Knight/Pawn', 'must', 'One rule each.'], ['Pos', 'good', 'Clean square handling.'], ['Move (command)', 'good', 'Needed for undo and history.'], ['PieceType enum with a switch in Game', 'no', 'Defeats polymorphism.'], ['WhiteKnight / BlackKnight classes', 'no', 'Colour is data.']] }
  }
});
})();
