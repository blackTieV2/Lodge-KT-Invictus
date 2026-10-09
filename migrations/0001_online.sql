-- Working register only. No statutory/financial action is executed by this store.
CREATE TABLE IF NOT EXISTS register_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL CHECK (version > 0),
  data TEXT NOT NULL CHECK (json_valid(data)),
  saved_at TEXT NOT NULL, actor TEXT NOT NULL,
  summary TEXT NOT NULL, reference TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS register_audit (
  version INTEGER PRIMARY KEY, saved_at TEXT NOT NULL,
  actor TEXT NOT NULL, summary TEXT NOT NULL, reference TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS register_backups (
  version INTEGER PRIMARY KEY, saved_at TEXT NOT NULL, data TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS register_insert AFTER INSERT ON register_state BEGIN
  INSERT INTO register_audit VALUES (NEW.version, NEW.saved_at, NEW.actor, NEW.summary, NEW.reference);
  INSERT INTO register_backups VALUES (NEW.version, NEW.saved_at, NEW.data);
END;
CREATE TRIGGER IF NOT EXISTS register_update AFTER UPDATE ON register_state BEGIN
  INSERT INTO register_audit VALUES (NEW.version, NEW.saved_at, NEW.actor, NEW.summary, NEW.reference);
  INSERT INTO register_backups VALUES (NEW.version, NEW.saved_at, NEW.data);
  DELETE FROM register_backups WHERE version NOT IN (SELECT version FROM register_backups ORDER BY version DESC LIMIT 60);
END;
