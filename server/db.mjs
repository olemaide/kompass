import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Each migration runs once; PRAGMA user_version records how far we got.
const MIGRATIONS = [
  `
  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#3E63DD',
    status TEXT NOT NULL DEFAULT 'active',
    url TEXT NOT NULL DEFAULT '',
    repo TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    position REAL NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    why TEXT NOT NULL DEFAULT '',
    values_text TEXT NOT NULL DEFAULT '',
    deadline TEXT,
    successes TEXT NOT NULL DEFAULT '',
    obstacles TEXT NOT NULL DEFAULT '',
    solutions TEXT NOT NULL DEFAULT '',
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    position REAL NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- One row per filled square of a 64 chart. slot = -1 is the pillar itself,
  -- slot 0..7 are the eight actions around it.
  CREATE TABLE cells (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    pillar INTEGER NOT NULL CHECK (pillar BETWEEN 0 AND 7),
    slot INTEGER NOT NULL CHECK (slot BETWEEN -1 AND 7),
    title TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL DEFAULT 'task',
    done INTEGER NOT NULL DEFAULT 0,
    start_date TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (goal_id, pillar, slot)
  );

  CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'todo',
    priority INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    cell_id TEXT REFERENCES cells(id) ON DELETE SET NULL,
    position REAL NOT NULL DEFAULT 0,
    focus INTEGER NOT NULL DEFAULT 0,
    checklist TEXT NOT NULL DEFAULT '[]',
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    platforms TEXT NOT NULL DEFAULT '[]',
    format TEXT NOT NULL DEFAULT 'post',
    status TEXT NOT NULL DEFAULT 'idea',
    scheduled_date TEXT,
    scheduled_time TEXT,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    link TEXT NOT NULL DEFAULT '',
    published_url TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    position REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE routine_logs (
    cell_id TEXT NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    PRIMARY KEY (cell_id, date)
  );

  CREATE TABLE journal (
    date TEXT PRIMARY KEY,
    plan TEXT NOT NULL DEFAULT '',
    reflection TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

  CREATE INDEX tasks_project ON tasks(project_id);
  CREATE INDEX posts_date ON posts(scheduled_date);
  CREATE INDEX cells_goal ON cells(goal_id);
  `,
];

// Whitelisted writable columns per collection. Anything else in a request body is ignored.
export const COLLECTIONS = {
  projects: {
    cols: ['name', 'description', 'color', 'status', 'url', 'repo', 'notes', 'position', 'archived'],
    bool: ['archived'],
    json: [],
  },
  goals: {
    cols: ['title', 'why', 'values_text', 'deadline', 'successes', 'obstacles', 'solutions', 'project_id', 'position', 'archived'],
    bool: ['archived'],
    json: [],
  },
  cells: {
    cols: ['goal_id', 'pillar', 'slot', 'title', 'kind', 'done', 'start_date', 'notes'],
    bool: ['done'],
    json: [],
  },
  tasks: {
    cols: ['title', 'description', 'status', 'priority', 'due_date', 'project_id', 'cell_id', 'position', 'focus', 'checklist', 'completed_at'],
    bool: ['focus'],
    json: ['checklist'],
  },
  posts: {
    cols: ['title', 'body', 'platforms', 'format', 'status', 'scheduled_date', 'scheduled_time', 'project_id', 'link', 'published_url', 'notes', 'position'],
    bool: [],
    json: ['platforms'],
  },
};

const ORDER = {
  projects: 'position, created_at',
  goals: 'position, created_at',
  cells: 'goal_id, pillar, slot',
  tasks: 'position, created_at',
  posts: 'position, created_at',
};

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function toDb(spec, key, value) {
  if (spec.json.includes(key)) return JSON.stringify(value ?? []);
  if (value === undefined) return null;
  if (spec.bool.includes(key)) return value ? 1 : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value !== null && typeof value === 'object') throw new HttpError(400, `Invalid value for ${key}`);
  return value;
}

function fromDb(spec, row) {
  if (!row) return row;
  const out = { ...row };
  for (const k of spec.json) {
    try {
      out[k] = JSON.parse(out[k] ?? '[]');
    } catch {
      out[k] = [];
    }
  }
  for (const k of spec.bool) out[k] = Boolean(out[k]);
  return out;
}

export function openStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'kompass.db');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');

  const version = db.prepare('PRAGMA user_version').get().user_version;
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  const spec = (collection) => {
    const s = COLLECTIONS[collection];
    if (!s) throw new HttpError(404, `Unknown collection: ${collection}`);
    return s;
  };

  function get(collection, id) {
    const s = spec(collection);
    return fromDb(s, db.prepare(`SELECT * FROM ${collection} WHERE id = ?`).get(id));
  }

  function list(collection) {
    const s = spec(collection);
    return db.prepare(`SELECT * FROM ${collection} ORDER BY ${ORDER[collection]}`).all().map((r) => fromDb(s, r));
  }

  function create(collection, data = {}) {
    const s = spec(collection);
    const now = new Date().toISOString();
    const row = {
      id: typeof data.id === 'string' && data.id ? data.id : randomUUID(),
      created_at: typeof data.created_at === 'string' ? data.created_at : now,
      updated_at: now,
    };
    for (const k of s.cols) if (k in data) row[k] = toDb(s, k, data[k]);
    const keys = Object.keys(row);
    db.prepare(`INSERT INTO ${collection} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(
      ...keys.map((k) => row[k]),
    );
    return get(collection, row.id);
  }

  function update(collection, id, data = {}) {
    const s = spec(collection);
    const keys = s.cols.filter((k) => k in data);
    if (keys.length) {
      const sets = keys.map((k) => `${k} = ?`).join(', ');
      const res = db
        .prepare(`UPDATE ${collection} SET ${sets}, updated_at = ? WHERE id = ?`)
        .run(...keys.map((k) => toDb(s, k, data[k])), new Date().toISOString(), id);
      if (res.changes === 0) throw new HttpError(404, 'Item not found');
    }
    return get(collection, id);
  }

  function remove(collection, id) {
    spec(collection);
    db.prepare(`DELETE FROM ${collection} WHERE id = ?`).run(id);
  }

  function transaction(fn) {
    db.exec('BEGIN');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  function batch(ops) {
    if (!Array.isArray(ops)) throw new HttpError(400, 'ops must be an array');
    return transaction(() =>
      ops.map((op) => {
        if (op.op === 'create') return create(op.collection, op.data);
        if (op.op === 'update') return update(op.collection, op.id, op.data);
        if (op.op === 'delete') return remove(op.collection, op.id), null;
        throw new HttpError(400, `Unknown operation: ${op.op}`);
      }),
    );
  }

  function setRoutine(cellId, date, done) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, 'Invalid date');
    if (done) db.prepare('INSERT OR IGNORE INTO routine_logs (cell_id, date) VALUES (?, ?)').run(cellId, date);
    else db.prepare('DELETE FROM routine_logs WHERE cell_id = ? AND date = ?').run(cellId, date);
  }

  function saveJournal(date, data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, 'Invalid date');
    const current = db.prepare('SELECT * FROM journal WHERE date = ?').get(date) ?? { plan: '', reflection: '' };
    const plan = typeof data.plan === 'string' ? data.plan : current.plan;
    const reflection = typeof data.reflection === 'string' ? data.reflection : current.reflection;
    db.prepare(
      `INSERT INTO journal (date, plan, reflection, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET plan = excluded.plan, reflection = excluded.reflection, updated_at = excluded.updated_at`,
    ).run(date, plan, reflection, new Date().toISOString());
  }

  function snapshot() {
    const out = {};
    for (const c of Object.keys(COLLECTIONS)) out[c] = list(c);
    out.routine_logs = db.prepare('SELECT cell_id, date FROM routine_logs ORDER BY date').all().map((r) => ({ ...r }));
    out.journal = db.prepare('SELECT * FROM journal ORDER BY date').all().map((r) => ({ ...r }));
    return out;
  }

  // Replaces everything with the content of an export file.
  function importAll(data) {
    if (!data || typeof data !== 'object') throw new HttpError(400, 'Invalid export file');
    transaction(() => {
      for (const t of ['routine_logs', 'journal', 'tasks', 'posts', 'cells', 'goals', 'projects']) db.exec(`DELETE FROM ${t}`);
      for (const c of ['projects', 'goals', 'cells', 'tasks', 'posts']) {
        for (const row of data[c] ?? []) create(c, row);
      }
      for (const l of data.routine_logs ?? []) setRoutine(l.cell_id, l.date, true);
      for (const j of data.journal ?? []) saveJournal(j.date, j);
    });
  }

  // Daily copy of the database; keeps the newest `keep` files.
  function backup(keep = 14) {
    const dir = path.join(dataDir, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const today = new Date().toLocaleDateString('sv-SE');
    const target = path.join(dir, `kompass-${today}.db`);
    if (!fs.existsSync(target)) db.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
    const files = fs
      .readdirSync(dir)
      .filter((f) => /^kompass-\d{4}-\d{2}-\d{2}\.db$/.test(f))
      .sort();
    for (const f of files.slice(0, Math.max(0, files.length - keep))) fs.rmSync(path.join(dir, f));
    return dir;
  }

  function close() {
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch {}
    db.close();
  }

  return { file, get, list, create, update, remove, batch, setRoutine, saveJournal, snapshot, importAll, backup, close };
}
