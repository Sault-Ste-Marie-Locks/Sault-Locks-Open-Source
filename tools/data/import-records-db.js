#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

let Database;
let usingBuiltInSqlite = false;
try {
  Database = require('node:sqlite').DatabaseSync;
  usingBuiltInSqlite = true;
} catch (builtinErr) {
  try {
    Database = require('better-sqlite3');
  } catch (pkgErr) {
    console.error('SQLite support was not found. Use Node.js 22 or run this from the app source after npm install.');
    console.error('Node error:', builtinErr && builtinErr.message || builtinErr);
    process.exit(2);
  }
}

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : '';
}
function boolArg(name) { return process.argv.includes(name); }
function hash(s) { return crypto.createHash('sha1').update(String(s)).digest('hex'); }
function localDateKey(value) {
  const d = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function normalizeDateKey(value, fallback = localDateKey(new Date())) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? text.slice(0,10) : localDateKey(parsed);
  }
  if (text) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return localDateKey(parsed);
  }
  return fallback;
}
function normalizeTime24(value, fallback = '') {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  let m = text.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([ap])\.?m\.?$/i);
  if (m) {
    let h = Number(m[1]);
    const min = Number(m[2] || 0);
    if (h >= 1 && h <= 12 && min >= 0 && min < 60) {
      if (m[3].toLowerCase() === 'p' && h !== 12) h += 12;
      if (m[3].toLowerCase() === 'a' && h === 12) h = 0;
      return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
    }
  }
  m = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h >= 0 && h < 24 && min >= 0 && min < 60) return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  }
  const d = new Date(text);
  if (!Number.isNaN(d.getTime())) return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return fallback || text;
}
function recKey(r) {
  if (r && r.mobileId) return 'mobile:' + r.mobileId;
  if (r && r.oldId) return 'old:' + r.oldId;
  if (r && r.id) return 'id:' + r.id;
  return 'key:' + hash([r?.date || '', r?.time || '', r?.canal || '', String(r?.vessel || '').toUpperCase(), r?.type || '', r?.direction || ''].join('|'));
}
function recordParams(r) {
  const id = recKey(r);
  const militaryTime = normalizeTime24(r.time || r.entryTime || r.reverseTime, String(r.time || ''));
  const normalized = { ...r, time: militaryTime, entryTime: militaryTime, reverseTime: r.reverseTime ? militaryTime : r.reverseTime, dashboardId: id };
  return {
    record_id: id,
    date: normalizeDateKey(r.date, localDateKey(new Date())),
    time: militaryTime,
    canal: String(r.canal || 'Sault Canada Locks'),
    vessel: String(r.vessel || '').toUpperCase(),
    type: String(r.type || ''),
    direction: String(r.direction || ''),
    destination: String(r.destination || ''),
    home_port: String(r.homePort || ''),
    mobile_id: String(r.mobileId || ''),
    old_id: String(r.oldId || ''),
    json: JSON.stringify(normalized),
    updated_at: String(r.updatedAt || r.createdAt || new Date().toISOString())
  };
}
function runPrepared(stmt, params) {
  if (typeof stmt.run === 'function') return stmt.run(params);
  throw new Error('Invalid SQLite statement.');
}
function queryOne(db, sql, params = []) {
  const st = db.prepare(sql);
  return st.get(...params);
}
function exec(db, sql) { return db.exec(sql); }
function findDbPath() {
  const cliDb = argValue('--db');
  if (cliDb) return path.resolve(cliDb);
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const candidates = [
    process.env.LOCK_RELEASE_DB_FILE,
    path.join(appData, 'Lock Release', 'database', 'soo-locks.db'),
    path.join(localAppData, 'LockReleaseDesktop', 'Lock Release-win32-x64', 'resources', 'app', 'database', 'soo-locks.db'),
    path.join(localAppData, 'Lock Release Desktop', 'Lock Release-win32-x64', 'resources', 'app', 'database', 'soo-locks.db'),
    path.join(process.cwd(), 'database', 'soo-locks.db')
  ].filter(Boolean);
  const existing = candidates.find(p => fs.existsSync(p));
  return existing || candidates[0];
}
function findJsonPath() {
  const cliJson = argValue('--json');
  if (!cliJson) throw new Error('Pass the import file explicitly: --json C:\\path\\to\\records.json');
  const file = path.resolve(cliJson);
  if (!fs.existsSync(file)) throw new Error('Import JSON was not found: ' + file);
  return file;
}
function ensureSchema(db) {
  exec(db, `
CREATE TABLE IF NOT EXISTS records (
  record_id TEXT PRIMARY KEY,
  date TEXT,
  time TEXT,
  canal TEXT,
  vessel TEXT,
  type TEXT,
  direction TEXT,
  destination TEXT,
  home_port TEXT,
  mobile_id TEXT,
  old_id TEXT,
  json TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
CREATE INDEX IF NOT EXISTS idx_records_month ON records(date, time);
CREATE INDEX IF NOT EXISTS idx_records_vessel ON records(vessel);
CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
CREATE TABLE IF NOT EXISTS registry (
  registry_id TEXT PRIMARY KEY,
  canal TEXT,
  vessel TEXT,
  owner TEXT,
  type TEXT,
  json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_registry_vessel ON registry(vessel);
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);
}
function backupDb(dbPath) {
  if (!fs.existsSync(dbPath)) return '';
  const desktop = path.join(os.homedir(), 'Desktop');
  const outDir = path.join(desktop, 'Lock Release DB Backup');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0,19);
  const out = path.join(outDir, `soo-locks-before-json-import-${stamp}.db`);
  fs.copyFileSync(dbPath, out);
  return out;
}

function main() {
  const jsonPath = findJsonPath();
  const dbPath = findDbPath();
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const payload = JSON.parse(raw);
  const records = Array.isArray(payload) ? payload : Array.isArray(payload.records) ? payload.records : Array.isArray(payload.traffic) ? payload.traffic : [];
  if (!records.length) throw new Error('No records array was found in the JSON import.');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const backup = backupDb(dbPath);
  const db = new Database(dbPath);
  if (usingBuiltInSqlite) {
    exec(db, 'PRAGMA journal_mode = WAL');
    exec(db, 'PRAGMA synchronous = NORMAL');
  } else {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }
  ensureSchema(db);
  const date = normalizeDateKey(payload.date || records[0]?.date, localDateKey(new Date()));
  const before = queryOne(db, 'SELECT COUNT(*) AS c FROM records WHERE date=?', [date]).c;
  const upsert = db.prepare(`INSERT INTO records(record_id,date,time,canal,vessel,type,direction,destination,home_port,mobile_id,old_id,json,updated_at)
    VALUES(@record_id,@date,@time,@canal,@vessel,@type,@direction,@destination,@home_port,@mobile_id,@old_id,@json,@updated_at)
    ON CONFLICT(record_id) DO UPDATE SET date=excluded.date,time=excluded.time,canal=excluded.canal,vessel=excluded.vessel,type=excluded.type,direction=excluded.direction,destination=excluded.destination,home_port=excluded.home_port,mobile_id=excluded.mobile_id,old_id=excluded.old_id,json=excluded.json,updated_at=excluded.updated_at`);
  exec(db, 'BEGIN IMMEDIATE');
  try {
    for (const record of records) runPrepared(upsert, recordParams(record));
    exec(db, 'COMMIT');
  } catch (err) {
    try { exec(db, 'ROLLBACK'); } catch (_) {}
    throw err;
  }
  const after = queryOne(db, 'SELECT COUNT(*) AS c FROM records WHERE date=?', [date]).c;
  const total = queryOne(db, 'SELECT COUNT(*) AS c FROM records').c;
  try { if (db && typeof db.close === 'function') db.close(); } catch (_) {}
  console.log('Lock Release JSON record import');
  console.log('JSON:', jsonPath);
  console.log('DB:', dbPath);
  if (backup) console.log('Backup:', backup);
  console.log(`${date} records: ${before} -> ${after}`);
  console.log(`Total DB records: ${total}`);
  console.log(`Imported/updated from JSON: ${records.length}`);
  console.log('Done. Reopen Lock Release or refresh Search/Records.');
}

try { main(); }
catch (err) { console.error('FAILED:', err && err.message || err); process.exit(1); }
