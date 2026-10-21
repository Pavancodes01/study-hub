(function(){
var SRC = String.raw`import java.util.*;
import java.util.concurrent.*;

enum Level { DEBUG, INFO, WARN, ERROR }

record LogRecord(Level level, String message, String logger) {}

interface Formatter { String format(LogRecord r); }
class SimpleFormatter implements Formatter {
    public String format(LogRecord r) { return "[" + r.level() + "] " + r.logger() + ": " + r.message(); }
}

interface Appender { void append(String line); }               // where logs go
class ConsoleAppender implements Appender {
    public void append(String line) { System.out.println(line); }
}
class MemoryAppender implements Appender {
    final List<String> lines = new CopyOnWriteArrayList<>();
    public void append(String line) { lines.add(line); }
}

class Logger {
    private final String name;
    private volatile Level threshold;
    private final List<Appender> appenders = new CopyOnWriteArrayList<>();
    private final Formatter formatter;
    Logger(String name, Level threshold, Formatter formatter) { this.name = name; this.threshold = threshold; this.formatter = formatter; }

    void addAppender(Appender a) { appenders.add(a); }
    void setLevel(Level level) { threshold = level; }

    void log(Level level, String msg) {
        if (level.ordinal() < threshold.ordinal()) return;      // filtered cheaply, nothing formatted
        String line = formatter.format(new LogRecord(level, msg, name));
        for (Appender a : appenders) a.append(line);            // fan out to every destination
    }
    void debug(String m) { log(Level.DEBUG, m); }
    void info(String m) { log(Level.INFO, m); }
    void warn(String m) { log(Level.WARN, m); }
    void error(String m) { log(Level.ERROR, m); }
}

class LogManager {                                              // one registry of loggers
    private static final LogManager INSTANCE = new LogManager();
    private final Map<String, Logger> loggers = new ConcurrentHashMap<>();
    private LogManager() {}
    static LogManager get() { return INSTANCE; }
    Logger logger(String name) {
        return loggers.computeIfAbsent(name, n -> {
            Logger l = new Logger(n, Level.INFO, new SimpleFormatter());
            l.addAppender(new ConsoleAppender());
            return l;
        });
    }
}

class LoggerDemo {
    public static void main(String[] args) {
        Logger log = LogManager.get().logger("payments");
        log.debug("hidden");
        log.info("started");
        MemoryAppender memory = new MemoryAppender();
        log.addAppender(memory);
        log.error("card declined");
        log.setLevel(Level.DEBUG);
        log.debug("retrying");
        System.out.println(LogManager.get().logger("payments") == log);
        System.out.println("memory has " + memory.lines.size());
    }
}`;
var dg = { kind: 'class', w: 860, h: 445, classes: [
  { id: 'mgr', name: 'LogManager', x: 20, y: 30, w: 250, fields: ['- static INSTANCE', '- loggers: Map<String, Logger>'], methods: ['+ static get(): LogManager', '+ logger(name): Logger'] },
  { id: 'lg', name: 'Logger', x: 330, y: 30, w: 250, fields: ['- threshold: Level', '- appenders: List<Appender>', '- formatter: Formatter'], methods: ['+ log(level, msg)', '+ info(msg), error(msg)…'] },
  { id: 'fm', name: 'Formatter', stereo: 'interface', x: 640, y: 30, w: 200, fields: [], methods: ['+ format(r): String'] },
  { id: 'ap', name: 'Appender', stereo: 'interface', x: 330, y: 260, w: 220, fields: [], methods: ['+ append(line)'] },
  { id: 'con', name: 'ConsoleAppender', x: 160, y: 360, w: 180, fields: [], methods: [] },
  { id: 'mem', name: 'MemoryAppender', x: 560, y: 360, w: 180, fields: [], methods: [] },
  { id: 'lv', name: 'Level', stereo: 'enumeration', x: 660, y: 180, w: 180, fields: ['DEBUG < INFO', '< WARN < ERROR'], methods: [] }
], rels: [
  { from: 'mgr', to: 'lg', type: 'aggregation', fm: '1', tm: '*' },
  { from: 'lg', to: 'fm', type: 'association' },
  { from: 'lg', to: 'ap', type: 'aggregation', fm: '1', tm: '*' },
  { from: 'con', to: 'ap', type: 'implements' },
  { from: 'mem', to: 'ap', type: 'implements' },
  { from: 'lg', to: 'lv', type: 'dependency' }
] };
var seq = { kind: 'seq', w: 800, parts: [{ id: 'c', name: 'PaymentService' }, { id: 'l', name: 'Logger' }, { id: 'f', name: 'Formatter' }, { id: 'a', name: 'Appenders' }], msgs: [
  { from: 'c', to: 'l', label: 'debug("hidden")', text: 'Threshold is INFO, so DEBUG is dropped before any work is done.', code: ['log.debug("hidden");', 'if (level.ordinal() < threshold.ordinal()) return;'] },
  { from: 'c', to: 'l', label: 'error("card declined")', text: 'ERROR passes the threshold.', code: ['log.error("card declined");'] },
  { from: 'l', to: 'f', label: 'format(record)', text: 'The formatter strategy turns the record into a line.', code: ['String line = formatter.format(new LogRecord(level, msg, name));'] },
  { from: 'f', to: 'l', label: '"[ERROR] payments: …"', ret: true, text: 'Formatting is swappable (JSON for production, text for dev).', code: ['return "[" + r.level() + "] " + r.logger() + ": " + r.message();'] },
  { from: 'l', to: 'a', label: 'append(line) ×2', text: 'Fan out to every appender: console and memory. Adding a file appender is one class.', code: ['for (Appender a : appenders) a.append(line);'] }
] };
registerDesign({
  slug: 'logger', order: 8, title: 'Logging framework',
  one: 'Named loggers filter by level, ==format with a pluggable formatter, and fan out to many appenders== (console, file, memory), all thread-safe.',
  questions: ['Which levels? Per-logger thresholds?', 'Which destinations: console, file, remote?', 'Text or JSON format?', 'Synchronous or async writes?', 'Can configuration change at runtime?'],
  reqs: { func: ['Get a logger by name', 'Log at DEBUG/INFO/WARN/ERROR', 'Drop messages below the threshold', 'Send each message to all configured appenders'], nonfunc: ['Cheap when filtered out', 'Thread-safe', 'New formats and destinations without changing Logger'], out: ['log rotation', 'remote shipping', 'MDC/trace IDs'] },
  entities: [['log manager', '`LogManager` (singleton)', 'Registry: one logger per name'], ['logger', '`Logger`', 'Threshold, formatting, fan-out'], ['level', '`Level` enum', 'Ordered severities'], ['record', '`LogRecord`', 'Level, message, logger name'], ['format', '`Formatter`', 'Record → line'], ['destination', '`Appender`', 'Where lines go']],
  diagramNotes: ['`LogManager` is a singleton registry so the same name always returns the same `Logger`. Each logger has one formatter (strategy) and many appenders (observer-like fan-out).', 'Level filtering happens first, so disabled debug logs cost almost nothing.'],
  flowNotes: ['A filtered call returns immediately; an accepted one is formatted once and appended to every destination.'],
  flows: [
    { name: 'Class diagram', title: 'Logging classes', diagram: dg, progressive: true, code: '@main', steps: [
      { title: 'Logger and levels', add: ['lg', 'lv'], on: ['lg', 'lv'], text: 'A logger has a threshold; levels are an ordered enum.', code: ['class Logger {', 'enum Level { DEBUG, INFO, WARN, ERROR }'] },
      { title: 'Formatting strategy', add: ['fm'], on: ['fm'], rels: ['lg-fm'], text: 'How a record becomes text is pluggable.', code: ['interface Formatter { String format(LogRecord r); }'] },
      { title: 'Many destinations', add: ['ap', 'con', 'mem'], on: ['ap'], rels: ['lg-ap'], text: 'Each appender is a destination; a logger fans out to all of them.', code: ['interface Appender { void append(String line); }', 'for (Appender a : appenders) a.append(line);'] },
      { title: 'One registry', add: ['mgr'], on: ['mgr'], rels: ['mgr-lg'], text: 'A singleton manager returns the same logger for the same name.', code: ['class LogManager {', 'return loggers.computeIfAbsent(name, n -> {'] }
    ]},
    { name: 'Log a message', title: 'Filter, format, fan out', diagram: seq, code: '@main' }
  ],
  patterns: [['Singleton', '`LogManager`', 'One registry per process.'], ['Strategy', '`Formatter`', 'Text vs JSON vs custom.'], ['Observer-like fan-out', '`Appender` list', 'Any number of destinations.'], ['Chain of Responsibility (alternative)', 'Level handlers', 'Some designs pass records along handler chains.']],
  code: { file: 'LoggerDemo.java', src: SRC, expect: '[INFO] payments: started\n[ERROR] payments: card declined\n[DEBUG] payments: retrying\ntrue\nmemory has 2' },
  concurrency: [['Many threads logging at once', 'Appenders list is a `CopyOnWriteArrayList`; each appender must be thread-safe itself.'], ['Threshold changed at runtime', '`volatile` so all threads see the new level.'], ['Slow file or network appenders block callers', 'Async appender: put lines in a bounded queue, one background thread writes them.']],
  extensions: [['File appender with rotation', 'New `Appender` that rolls files by size or date.'], ['JSON logs', 'New `Formatter`.'], ['Async logging', '`AsyncAppender` decorator wrapping another appender with a queue.'], ['Per-package levels', 'Hierarchical names; child loggers inherit parent thresholds.']],
  probe: [['How do you make logging cheap when disabled?', ['Check the level before building the message; use lambdas/suppliers (`log.debug(() -> expensive())`) so arguments are not computed.']], ['How would you add async logging?', ['Wrap an appender in an `AsyncAppender` that puts lines in a bounded queue and has one worker write them; decide what happens when the queue is full (drop or block).']], ['Why a singleton manager?', ['So every part of the app gets the same logger instance and configuration by name; the logger objects themselves are normal objects.']]],
  say: ['Loggers filter by level first, format with a pluggable formatter, and fan out to a list of appenders.', 'The manager is a singleton registry keyed by logger name.', 'Slow appenders go behind an async queue so callers never block.'],
  facts: [['filter first', 'cheap disabled logs'], ['Formatter', 'Strategy'], ['Appenders', 'fan-out'], ['LogManager', 'Singleton']],
  checklist: ['Draw manager, logger, formatter, appenders.', 'Write the level check and fan-out.', 'Explain async appenders.'],
  drills: {
    mcq: [{ id: 'mcq-log', title: 'New destination', ask: 'Logs must also go to a remote server. What changes?', options: [['Add a `RemoteAppender implements Appender` and register it', true, 'Logger and other appenders unchanged.'], ['Edit `Logger.log` to call the server', false, 'Mixes destinations into the logger.'], ['Change the Level enum', false, 'Unrelated.'], ['Subclass LogManager', false, 'Unnecessary.']] }],
    code: [{ id: 'code-log', title: 'Level filter', ask: 'Drop messages below the threshold.', run: 'LevelDemo', expect: 'WARN disk low', code: String.raw`enum Level { DEBUG, INFO, WARN, ERROR }
class Log {
    Level threshold = Level.WARN;
    void log(Level l, String m) {
        if (l.[[ordinal()]] < threshold.ordinal()) [[return]];
        System.out.println(l + " " + m);
    }
}
class LevelDemo { public static void main(String[] a) { Log log = new Log(); log.log(Level.INFO, "hi"); log.log([[Level.WARN]], "disk low"); } }` }],
    order: [{ id: 'ord-log', title: 'Log call', ask: 'Order what happens.', steps: ['Caller invokes log(level, message)', 'Compare level with the threshold and stop if lower', 'Build a LogRecord', 'Format it once with the formatter', 'Append the line to every appender'], extra: ['Format the message before checking the level'] }],
    classes: { id: 'cls-log', title: 'Design the logger', reqs: ['Levels with thresholds', 'Several destinations', 'Formats can change'], parts: [['Logger', 'must', 'Filtering and fan-out.'], ['Level enum', 'must', 'Ordered severities.'], ['Appender interface', 'must', 'Destinations.'], ['Formatter interface', 'must', 'Pluggable formatting.'], ['LogManager', 'good', 'Registry by name.'], ['One Logger subclass per destination', 'no', 'Destinations should compose, not subclass.'], ['static println everywhere', 'no', 'No filtering or routing.']] }
  }
});
})();
