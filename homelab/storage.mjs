// Production, file-backed adapter for the existing API. No cloud database required.
import { DatabaseSync, backup } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, chmodSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export class RegisterDatabase {
  constructor(filename, migrations = new URL('../migrations/', import.meta.url)) {
    if (!filename || filename === ':memory:') throw new Error('A persistent database path is required.');
    this.filename = resolve(filename);
    mkdirSync(dirname(this.filename), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(this.filename);
    try {
      chmodSync(this.filename, 0o600);
      this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
      this.db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');
      const files = readdirSync(migrations).filter(n => /^\d{4}_[a-z0-9_-]+\.sql$/.test(n)).sort();
      if (!files.length) throw new Error('No database migrations found.');
      // Unknown future migrations mean this binary is too old. Do not downgrade silently.
      for (const row of this.db.prepare('SELECT name FROM schema_migrations').all()) {
        if (!files.includes(row.name)) throw new Error('Database is newer than this application.');
      }
      for (const name of files) {
        const sql = readFileSync(migrations instanceof URL ? new URL(name, migrations) : join(migrations, name), 'utf8');
        const checksum = createHash('sha256').update(sql).digest('hex');
        this.db.exec('BEGIN IMMEDIATE');
        try {
          const existing = this.db.prepare('SELECT checksum FROM schema_migrations WHERE name=?').get(name);
          if (existing && existing.checksum !== checksum) throw new Error('Applied migration changed; restore the reviewed migration file.');
          if (!existing) {
            this.db.exec(sql);
            this.db.prepare('INSERT INTO schema_migrations VALUES (?,?,?)').run(name, checksum, new Date().toISOString());
          }
          this.db.exec('COMMIT');
        } catch (error) { this.db.exec('ROLLBACK'); throw error; }
      }
    } catch (error) { this.db.close(); throw error; }
  }
  prepare(sql) {
    const db = this.db;
    const statement = (values = []) => ({
      bind: (...args) => statement(args),
      first: async () => db.prepare(sql).get(...values) ?? null,
      all: async () => ({ results: db.prepare(sql).all(...values) }),
      run: async () => db.prepare(sql).run(...values)
    });
    return statement();
  }
  close() { this.db.close(); }
}

export function verifyBackup(filename) {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    const checks = db.prepare('PRAGMA integrity_check').all();
    if (checks.length !== 1 || checks[0].integrity_check !== 'ok') throw new Error('Database integrity check failed.');
    const state = db.prepare('SELECT version FROM register_state WHERE id=1').get();
    if (state && !db.prepare('SELECT version FROM register_audit WHERE version=?').get(state.version)) throw new Error('Latest revision is missing its audit record.');
    return { version: state?.version ?? 0 };
  } finally { db.close(); }
}

// SQLite's online backup API includes committed WAL data. Never copy only the .sqlite file.
export async function createBackup(database, directory, keep = 28) {
  if (!Number.isInteger(keep) || keep < 2 || keep > 1000) throw new Error('Invalid backup retention.');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const name = `invictus-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.sqlite`;
  const target = join(directory, name), temporary = target + '.partial';
  try {
    await backup(database.db, temporary);
    chmodSync(temporary, 0o600);
    // A copy of a WAL database inherits WAL mode. Convert this separate snapshot
    // to a standalone file before verification/rename (never change the live DB).
    const snapshot = new DatabaseSync(temporary);
    try { snapshot.exec('PRAGMA journal_mode=DELETE;'); } finally { snapshot.close(); }
    verifyBackup(temporary);
    renameSync(temporary, target);
    const own = readdirSync(directory).filter(n => /^invictus-\d{4}-\d{2}-\d{2}T[0-9TZ-]+-[a-f0-9-]{36}\.sqlite$/.test(n)).sort().reverse();
    for (const old of own.slice(keep)) unlinkSync(join(directory, old));
    return target;
  } finally { for (const file of [temporary, temporary + '-wal', temporary + '-shm']) if (existsSync(file)) unlinkSync(file); }
}
