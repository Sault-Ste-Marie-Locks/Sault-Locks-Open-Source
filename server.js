process.env.TZ = process.env.TZ || 'America/Toronto';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
let Database;
let usingBuiltInSqlite = false;
try {
  Database = require('node:sqlite').DatabaseSync;
  usingBuiltInSqlite = true;
} catch (builtinErr) {
  try { Database = require('better-sqlite3'); }
  catch (pkgErr) {
    console.error('\nSQLite support was not found.');
    console.error('Install Node.js 22 or newer, or run: npm install');
    console.error('Then start again with: npm start\n');
    process.exit(1);
  }
}

const DASHBOARD_PORT = Number(process.env.SERVER_PORT || process.env.PORT || 6117);
const PUBLIC_HOST = process.env.PUBLIC_HOST || '';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';
const root = __dirname;

// IMPORTANT: live data must never live inside the installed app folder.
// Updates replace files under resources/app, so the SQLite DB and writable data
// are stored under Electron userData/AppData instead. On Pterodactyl/plain Node,
// LOCK_RELEASE_* env vars can point these paths wherever the server should store data.
const defaultUserRoot = process.env.APPDATA ? path.join(process.env.APPDATA, 'Lock Release') : root;
const userRoot = process.env.LOCK_RELEASE_USER_DATA || defaultUserRoot;
const dbDir = process.env.LOCK_RELEASE_DB_DIR || path.join(userRoot, 'database');
const dbFile = path.join(dbDir, 'soo-locks.db');
const dataDir = process.env.LOCK_RELEASE_DATA_DIR || path.join(userRoot, 'data');
const dataBackupDir = process.env.LOCK_RELEASE_DATA_BACKUP_DIR || path.join(userRoot, 'data-backup');
const legacyDbDir = path.join(root, 'database');
const legacyDbFile = path.join(legacyDbDir, 'soo-locks.db');
const legacyDataDir = path.join(root, 'data');
const legacyBackupDir = path.join(root, 'data-backup');
const jsonDataFile = path.join(dataBackupDir, 'dashboard-data-before-sqlite.json');
const jsonFallbackFile = path.join(dataDir, 'dashboard-data.json');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};

function copyFileIfMissing(src, dst) {
  try {
    if (src && fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
    }
  } catch (err) {
    console.warn('Seed copy skipped:', src, '->', dst, err && err.message || err);
  }
}
function copyDirIfMissing(src, dst) {
  try {
    if (!src || !fs.existsSync(src)) return;
    fs.mkdirSync(dst, { recursive: true });
    for (const item of fs.readdirSync(src, { withFileTypes: true })) {
      const from = path.join(src, item.name);
      const to = path.join(dst, item.name);
      if (item.isDirectory()) copyDirIfMissing(from, to);
      else if (item.isFile()) copyFileIfMissing(from, to);
    }
  } catch (err) {
    console.warn('Seed folder copy skipped:', src, '->', dst, err && err.message || err);
  }
}

fs.mkdirSync(dbDir, {recursive:true});
fs.mkdirSync(dataDir, {recursive:true});
fs.mkdirSync(dataBackupDir, {recursive:true});

// One-time migration/seed from older installs that kept data under resources/app.
// Existing AppData files always win, so updates cannot overwrite live data.
copyFileIfMissing(legacyDbFile, dbFile);
copyDirIfMissing(legacyDataDir, dataDir);
copyDirIfMissing(legacyBackupDir, dataBackupDir);

const db = new Database(dbFile);
if (usingBuiltInSqlite) {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA foreign_keys = ON');
} else {
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
}


db.exec(`
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

const stmt = {
  recordById: db.prepare('SELECT json FROM records WHERE record_id=?'),
  upsertRecord: db.prepare(`INSERT INTO records(record_id,date,time,canal,vessel,type,direction,destination,home_port,mobile_id,old_id,json,updated_at)
    VALUES(@record_id,@date,@time,@canal,@vessel,@type,@direction,@destination,@home_port,@mobile_id,@old_id,@json,@updated_at)
    ON CONFLICT(record_id) DO UPDATE SET date=excluded.date,time=excluded.time,canal=excluded.canal,vessel=excluded.vessel,type=excluded.type,direction=excluded.direction,destination=excluded.destination,home_port=excluded.home_port,mobile_id=excluded.mobile_id,old_id=excluded.old_id,json=excluded.json,updated_at=excluded.updated_at`),
  deleteRecord: db.prepare('DELETE FROM records WHERE record_id=?'),
  upsertRegistry: db.prepare(`INSERT INTO registry(registry_id,canal,vessel,owner,type,json) VALUES(@registry_id,@canal,@vessel,@owner,@type,@json)
    ON CONFLICT(registry_id) DO UPDATE SET canal=excluded.canal,vessel=excluded.vessel,owner=excluded.owner,type=excluded.type,json=excluded.json`),
  kvGet: db.prepare('SELECT value FROM kv WHERE key=?'),
  kvSet: db.prepare('INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
};

function backupDatabaseFile(name, overwrite=false){
  try{
    const count=db.prepare('SELECT COUNT(*) AS c FROM records').get().c;
    if(!count) return '';
    const safe=String(name||'soo-locks-backup.db').replace(/[^A-Za-z0-9._-]/g,'-');
    const target=path.join(dataBackupDir,safe);
    if(!overwrite && fs.existsSync(target)) return target;
    try{ db.exec('PRAGMA wal_checkpoint(FULL)'); }catch(_){}
    fs.copyFileSync(dbFile,target);
    return target;
  }catch(err){
    console.warn('Database safety backup failed:', err && err.message || err);
    return '';
  }
}

function runTx(fn){
  if(typeof db.transaction === 'function') return db.transaction(fn)();
  db.exec('BEGIN IMMEDIATE');
  try { const result = fn(); db.exec('COMMIT'); return result; }
  catch(err){ try{ db.exec('ROLLBACK'); }catch(_){} throw err; }
}
function safeJsonParse(v, fallback){ try { return JSON.parse(v); } catch { return fallback; } }
function canonicalTrafficType(value){
  const raw=String(value||'').replace(/\s+/g,' ').trim();
  const lower=raw.toLowerCase();
  if(!raw) return '';
  if(lower==='k' || lower==='kayak' || lower==='kayak entry' || lower.includes('kayak')) return 'RB';
  if(lower==='returning boat' || lower.includes('returning') || lower.includes('returned') || lower==='return' || lower==='ret') return 'RB';
  if(lower==='rb' || lower==='recreational boat' || lower==='recreational' || lower.includes('recreational')) return 'RB';
  if(lower==='tb' || lower==='tour boat' || lower==='tour' || lower.includes('tour')) return 'TB';
  if(lower==='gov' || lower==='government boat' || lower==='government' || lower.includes('government')) return 'Gov';
  if(lower==='com' || lower==='commercial boat' || lower==='commercial' || lower.includes('commercial')) return 'Com';
  if(lower==='lr' || lower==='lock reversal' || lower.includes('reversal')) return 'LR';
  if(lower==='lt' || lower==='lock test' || lower.includes('lock test')) return 'LT';
  return raw;
}
function normalizeTrafficRecord(record){
  if(!record || typeof record!=='object') return record;
  const rawType=String(record.type || record.entryType || record.formType || '').trim();
  const type=canonicalTrafficType(rawType);
  const normalized={...record};
  if(type){
    if(rawType && type!==rawType && !normalized.sourceType) normalized.sourceType=rawType;
    normalized.type=type;
  }
  return normalized;
}
function readBody(req){ return new Promise(resolve=>{ let b=''; req.on('data',c=>{ b+=c; if(b.length>100e6) req.destroy(); }); req.on('end',()=>resolve(safeJsonParse(b || '{}', {}))); }); }
function sendJson(res,obj,status=200){ res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}); res.end(JSON.stringify(obj)); }
function hash(s){ return crypto.createHash('sha1').update(String(s)).digest('hex'); }
function rowJson(row){
  if(!row) return null;
  const parsed=safeJsonParse(row.json, null);
  if(!parsed || typeof parsed!=="object") return parsed;
  const record=normalizeTrafficRecord(parsed);
  const militaryTime=normalizeTime24(record.time||record.entryTime||record.reverseTime, String(record.time||""));
  return {...record,time:militaryTime,entryTime:militaryTime,reverseTime:record.reverseTime?militaryTime:record.reverseTime};
}
function rowsJson(rows){ return (rows||[]).map(rowJson).filter(Boolean); }
function localDateKey(value){
  const d = value instanceof Date ? value : new Date(value || Date.now());
  if(Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function normalizeDateKey(value, fallback=todayISO()){
  const text = String(value || '').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if(/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? text.slice(0,10) : localDateKey(parsed);
  }
  if(text){
    const parsed = new Date(text);
    if(!Number.isNaN(parsed.getTime())) return localDateKey(parsed);
  }
  return fallback;
}
function todayISO(){ return localDateKey(new Date()); }
function normalizeTime24(value, fallback=''){
  const text=String(value ?? '').trim();
  if(!text) return fallback;
  let m=text.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([ap])\.?m\.?$/i);
  if(m){ let h=Number(m[1]); const min=Number(m[2]||0); if(h>=1&&h<=12&&min>=0&&min<60){ if(m[3].toLowerCase()==='p'&&h!==12)h+=12; if(m[3].toLowerCase()==='a'&&h===12)h=0; return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`; } }
  m=text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if(m){ const h=Number(m[1]), min=Number(m[2]); if(h>=0&&h<24&&min>=0&&min<60) return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`; }
  const d=new Date(text); if(!Number.isNaN(d.getTime())) return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return fallback || text;
}
function escLike(v){ return '%' + String(v || '').replace(/[\\%_]/g, m => '\\' + m).toLowerCase() + '%'; }
function cleanLimit(v, fallback=750, max=5000){ const n=Number(v); return Number.isFinite(n) ? Math.max(1, Math.min(max, Math.floor(n))) : fallback; }
function kvDefault(key){ if(key==='entryPresets') return {RB:[],TB:[],Gov:[],Com:[],K:[]}; if(key==='deletedPresets') return []; if(key==='deletedEntryMarks') return []; if(key==='phoneServer') return {running:false,startedAt:null}; return []; }
function getKV(key){ const row=stmt.kvGet.get(key); return row ? safeJsonParse(row.value, kvDefault(key)) : kvDefault(key); }
function setKV(key, value){ stmt.kvSet.run(key, JSON.stringify(value)); }
function addPhoneEvent(type, detail){ const events=Array.isArray(getKV('phoneEvents')) ? getKV('phoneEvents') : []; events.unshift({type, detail, at:new Date().toLocaleString()}); setKV('phoneEvents', events.slice(0,100)); }
function recKey(r){ if(r?.mobileId) return 'mobile:'+r.mobileId; if(r?.oldId) return 'old:'+r.oldId; if(r?.id) return 'id:'+r.id; return 'key:'+hash([r?.date||'', r?.time||'', r?.canal||'', String(r?.vessel||'').toUpperCase(), r?.type||'', r?.direction||''].join('|')); }
function regKey(r){ const raw=[r?.canal||'', String(r?.vessel||'').toUpperCase(), r?.vesselReg||''].map(x=>String(x).trim()).join('|'); return hash(raw === '||' ? JSON.stringify(r) : raw); }
function recordParams(r){ const input=normalizeTrafficRecord(r||{}); const id=recKey(input); const militaryTime=normalizeTime24(input.time||input.entryTime||input.reverseTime,String(input.time||'')); const normalized={...input,time:militaryTime,entryTime:militaryTime,reverseTime:input.reverseTime?militaryTime:input.reverseTime}; return {record_id:id,date:normalizeDateKey(input.date, todayISO()),time:militaryTime,canal:String(input.canal||''),vessel:String(input.vessel||'').toUpperCase(),type:String(canonicalTrafficType(input.type)||''),direction:String(input.direction||''),destination:String(input.destination||''),home_port:String(input.homePort||''),mobile_id:String(input.mobileId||''),old_id:String(input.oldId||''),json:JSON.stringify({...normalized, dashboardId:id}),updated_at:String(input.updatedAt||input.createdAt||new Date().toISOString())}; }
function saveRecord(r){ const params=recordParams(r); stmt.upsertRecord.run(params); return safeJsonParse(params.json, {...r, dashboardId:params.record_id}); }
function saveRegistry(r){ stmt.upsertRegistry.run({registry_id:regKey(r),canal:String(r.canal||''),vessel:String(r.vessel||'').toUpperCase(),owner:String(r.owner||''),type:String(r.type||r.vesselType||''),json:JSON.stringify(r)}); }
function compactIdValue(value){ return String(value ?? '').replace(/\s+/g,' ').trim(); }
function stripRecordPrefix(value){ return compactIdValue(value).replace(/^(mobile:|old:|id:|key:)/i,''); }
function addCandidate(list, value){
  const raw=compactIdValue(value);
  if(!raw) return;
  [raw, stripRecordPrefix(raw)].forEach(v=>{
    v=compactIdValue(v);
    if(v && !list.includes(v)) list.push(v);
  });
}
function entryIdCandidates(id, fallback){
  const list=[];
  addCandidate(list, id);
  if(fallback && typeof fallback==='object'){
    ['dashboardId','recordId','record_id','id','mobileId','mobile_id','oldId','old_id'].forEach(k=>addCandidate(list, fallback[k]));
    try{ addCandidate(list, recKey(fallback)); }catch(e){}
  }
  const expanded=[...list];
  for(const v of list){
    if(!/^(mobile:|old:|id:|key:)/i.test(v)){
      expanded.push('mobile:'+v, 'old:'+v, 'id:'+v);
    }
  }
  return [...new Set(expanded.filter(Boolean))];
}
function readDeletedEntryMarks(){ const list=getKV('deletedEntryMarks'); return Array.isArray(list)?list.filter(x=>x&&Array.isArray(x.keys)&&x.keys.length):[]; }
function saveDeletedEntryMarks(list){ setKV('deletedEntryMarks', (list||[]).filter(x=>x&&Array.isArray(x.keys)&&x.keys.length).slice(-3000)); }
function entryFingerprint(entry){
  if(!entry || typeof entry!=='object') return '';
  return hash([
    String(entry.date||'').slice(0,10),
    String(entry.time||entry.entryTime||entry.reverseTime||''),
    String(entry.vessel||entry.vesselName||'').replace(/\s+/g,' ').trim().toUpperCase(),
    String(entry.type||entry.entryType||entry.formType||''),
    String(entry.direction||entry.dir||entry.reverseDir||'')
  ].join('|'));
}
function hasExplicitEntryId(id, entry){
  const values=[id];
  if(entry && typeof entry==='object'){
    ['dashboardId','recordId','record_id','id','mobileId','mobile_id','oldId','old_id'].forEach(k=>values.push(entry[k]));
  }
  return values.some(v=>compactIdValue(v));
}
function deletedEntryKeys(id, entry){
  const keys=entryIdCandidates(id, entry);
  // Only legacy ID-less records use a fingerprint tombstone. Distinct modern
  // records can legitimately share date/time/vessel/direction (e.g. kayak groups).
  if(!hasExplicitEntryId(id, entry)){
    const fp=entryFingerprint(entry);
    if(fp) keys.push('fp:'+fp);
  }
  return [...new Set(keys.filter(Boolean))];
}
function markEntryDeleted(id, entry, meta){
  const keys=deletedEntryKeys(id, entry);
  if(!keys.length) return;
  const next=readDeletedEntryMarks().filter(m=>!m.keys.some(k=>keys.includes(k)));
  next.push({keys, date:normalizeDateKey((entry&&entry.date)||meta?.date, todayISO()), deletedAt:new Date().toISOString(), source:meta?.source||'mobile'});
  saveDeletedEntryMarks(next);
}
function clearEntryDeletedMark(id, entry){
  const keys=deletedEntryKeys(id, entry);
  if(!keys.length) return;
  saveDeletedEntryMarks(readDeletedEntryMarks().filter(m=>!m.keys.some(k=>keys.includes(k))));
}
function isEntryDeletedMarked(id, entry){
  const keys=deletedEntryKeys(id, entry);
  if(!keys.length) return false;
  return readDeletedEntryMarks().some(m=>m.keys.some(k=>keys.includes(k)));
}
function recordByAnyId(id, fallback){
  const hasExplicitId=hasExplicitEntryId(id, fallback);
  const candidates=entryIdCandidates(id, fallback);
  for(const wanted of candidates){
    const exact=rowJson(stmt.recordById.get(wanted));
    if(exact) return {id:wanted, record:exact};
    const row=db.prepare('SELECT record_id,json FROM records WHERE mobile_id=? OR old_id=? OR record_id=? LIMIT 1').get(wanted,wanted,wanted);
    if(row) return {id:row.record_id, record:rowJson(row)};
  }
  // Fingerprint matching is only safe for legacy records that truly have no ID.
  // If an entry has a mobile/desktop ID, another record at the same time with the
  // same vessel and direction is a distinct record (important for kayak groups).
  if(!hasExplicitId && fallback && typeof fallback==='object'){
    const fp=entryFingerprint(fallback);
    if(fp){
      const row=db.prepare('SELECT record_id,json FROM records WHERE date=? AND time=? AND UPPER(vessel)=? AND type=? AND direction=? LIMIT 1').get(
        String(fallback.date||'').slice(0,10),
        String(fallback.time||fallback.entryTime||fallback.reverseTime||''),
        String(fallback.vessel||fallback.vesselName||'').replace(/\s+/g,' ').trim().toUpperCase(),
        String(fallback.type||fallback.entryType||fallback.formType||''),
        String(fallback.direction||fallback.dir||fallback.reverseDir||'')
      );
      if(row) return {id:row.record_id, record:rowJson(row)};
    }
  }
  return null;
}
function allRegistry(){ return rowsJson(db.prepare('SELECT json FROM registry ORDER BY vessel, canal').all()); }
function getDay(date, limit=1000){ return rowsJson(db.prepare('SELECT json FROM records WHERE date=? ORDER BY time, vessel LIMIT ?').all(normalizeDateKey(date, todayISO()), limit)); }
function getMonth(month, limit=5000){ return rowsJson(db.prepare('SELECT json FROM records WHERE date>=? AND date<? ORDER BY date, time LIMIT ?').all(month+'-01', nextMonth(month), limit)); }
function getRange(start,end,limit=5000){ return rowsJson(db.prepare('SELECT json FROM records WHERE date>=? AND date<=? ORDER BY date, time LIMIT ?').all(normalizeDateKey(start, todayISO()), normalizeDateKey(end, todayISO()), limit)); }
function nextMonth(ym){ const [y,m]=String(ym||todayISO().slice(0,7)).split('-').map(Number); const d=new Date(y || new Date().getFullYear(), (m || 1), 1); return localDateKey(d); }
function bootstrapTraffic(){ const today=getDay(todayISO(), 300); const recent=rowsJson(db.prepare('SELECT json FROM records ORDER BY date DESC, time DESC LIMIT 250').all()); const map=new Map(); [...today,...recent].forEach(r=>map.set(recKey(r), r)); return [...map.values()].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')) || String(a.time||'').localeCompare(String(b.time||''))); }
function dataShape(traffic){ return {traffic, registry:allRegistry(), phones:getKV('phones'), pairs:getKV('pairs'), phoneEvents:getKV('phoneEvents'), countries:getKV('countries'), states:getKV('states'), entryPresets:applyPresetDeletes(getKV('entryPresets')), deletedPresets:getKV('deletedPresets'), phoneServer:getKV('phoneServer')}; }
function fullExportShape(){
  return {
    backupFormat:'sault-locks-backup',
    backupVersion:3,
    exportedAt:new Date().toISOString(),
    traffic:rowsJson(db.prepare('SELECT json FROM records ORDER BY date, time, record_id').all()),
    registry:allRegistry(),
    countries:getKV('countries'),
    states:getKV('states'),
    entryPresets:applyPresetDeletes(getKV('entryPresets')),
    deletedPresets:getKV('deletedPresets'),
    deletedEntryMarks:getKV('deletedEntryMarks'),
    phoneEvents:getKV('phoneEvents')
  };
}
function importedTraffic(payload){
  if(Array.isArray(payload)) return payload;
  if(Array.isArray(payload?.traffic)) return payload.traffic;
  if(Array.isArray(payload?.records)) return payload.records;
  if(Array.isArray(payload?.logs)) return payload.logs;
  return [];
}
function importBackup(payload, mode='merge'){
  payload=(payload && typeof payload==='object') ? payload : {};
  const records=importedTraffic(payload);
  const registry=Array.isArray(payload.registry) ? payload.registry : [];
  const replace=String(mode||'merge').toLowerCase()==='replace';
  if(replace) backupDatabaseFile('soo-locks-before-last-import.db', true);
  let savedRecords=0, savedRegistry=0;
  runTx(()=>{
    if(replace){
      db.prepare('DELETE FROM records').run();
      db.prepare('DELETE FROM registry').run();
      // Tombstones from another database can hide restored records, so a true
      // restore starts with a clean deleted-entry list.
      setKV('deletedEntryMarks', []);
    }
    for(const source of records){
      if(!source || typeof source!=='object') continue;
      for(const piece of expandKayakEntries(source)){
        saveRecord(piece);
        savedRecords++;
      }
    }
    for(const row of registry){
      if(!row || typeof row!=='object') continue;
      saveRegistry(row);
      savedRegistry++;
    }
    for(const key of ['countries','states','entryPresets','deletedPresets','phoneEvents']){
      if(payload[key]!==undefined) setKV(key, payload[key]);
    }
    if(payload.deletedEntryMarks!==undefined && !replace) setKV('deletedEntryMarks', payload.deletedEntryMarks);
  });
  return {mode:replace?'replace':'merge',savedRecords,savedRegistry,totalRecords:db.prepare('SELECT COUNT(*) AS c FROM records').get().c};
}
function importJsonIfDbEmpty(){
  const count=db.prepare('SELECT COUNT(*) AS c FROM records').get().c;
  if(count>0) return;
  const src=fs.existsSync(jsonDataFile) ? jsonDataFile : jsonFallbackFile;
  if(!fs.existsSync(src)) return;
  const data=safeJsonParse(fs.readFileSync(src,'utf8'), {});
  runTx(()=>{
    (data.traffic||[]).forEach(saveRecord);
    (data.registry||[]).forEach(saveRegistry);
    ['phones','pairs','phoneEvents','countries','states','entryPresets','phoneServer'].forEach(k=>setKV(k, data[k] ?? kvDefault(k)));
  });
}
backupDatabaseFile('soo-locks-before-v3-sync-fix.db', false);
importJsonIfDbEmpty();

function migrateLegacyRecreationalTypes(){
  const rows=db.prepare(`SELECT record_id,type,json FROM records
    WHERE LOWER(TRIM(type)) IN ('k','kayak','kayak entry','returning boat','return','ret')
       OR LOWER(type) LIKE '%kayak%'
       OR LOWER(type) LIKE '%returning%'
       OR LOWER(type) LIKE '%returned%'`).all();
  if(!rows.length) return 0;
  const update=db.prepare('UPDATE records SET type=?, json=?, updated_at=? WHERE record_id=?');
  let changed=0;
  runTx(()=>{
    for(const row of rows){
      const parsed=safeJsonParse(row.json, {});
      const rawType=String(parsed.type || row.type || parsed.entryType || parsed.formType || '').trim();
      const canonical=canonicalTrafficType(rawType);
      if(canonical!=='RB') continue;
      const next={...parsed};
      if(rawType && rawType!=='RB' && !next.sourceType) next.sourceType=rawType;
      next.type='RB';
      update.run('RB', JSON.stringify(next), String(next.updatedAt||next.createdAt||new Date().toISOString()), row.record_id);
      changed++;
    }
  });
  if(changed) console.log(`Normalized ${changed} Kayak/Returning Boat record${changed===1?'':'s'} to Recreational (RB).`);
  return changed;
}
migrateLegacyRecreationalTypes();


function migrateLegacyMultiKayakRecords(){
  const rows=db.prepare('SELECT record_id,json FROM records').all();
  const groups=[];
  for(const row of rows){
    const parsed=safeJsonParse(row.json, null);
    if(!parsed || typeof parsed!=='object') continue;
    if(kayakMultiplicity(parsed)<=1 || !isKayakGroupEntry(parsed)) continue;
    groups.push({row, parsed});
  }
  if(!groups.length) return {groups:0,records:0};

  let created=0;
  runTx(()=>{
    for(const {row,parsed} of groups){
      const source={...parsed,dashboardId:parsed.dashboardId||row.record_id};
      const pieces=expandKayakEntries(source);
      if(pieces.length<=1) continue;
      stmt.deleteRecord.run(row.record_id);
      for(const piece of pieces){ saveRecord(piece); created++; }
    }
  });
  console.log(`Expanded ${groups.length} legacy multi-kayak group${groups.length===1?'':'s'} into ${created} individual Recreational records.`);
  return {groups:groups.length,records:created};
}
migrateLegacyMultiKayakRecords();

function repairAccidentalMobileShadowDuplicates(){
  const rows=db.prepare(`SELECT record_id,mobile_id,json FROM records
    WHERE mobile_id LIKE 'id:%' OR mobile_id LIKE 'old:%' OR mobile_id LIKE 'key:%'`).all();
  if(!rows.length) return 0;
  let repaired=0;
  runTx(()=>{
    for(const row of rows){
      const targetId=String(row.mobile_id||'').trim();
      if(!targetId || targetId===row.record_id) continue;
      const originalRow=db.prepare('SELECT json FROM records WHERE record_id=?').get(targetId);
      const original=originalRow ? safeJsonParse(originalRow.json,{}) : {};
      const shadow=safeJsonParse(row.json,{});
      // If the original row still exists, fold the shadow's latest edits back
      // into it. If it does not, simply re-key the shadow to the proper id.
      const merged={...original,...shadow,dashboardId:targetId};
      delete merged.mobileId;
      delete merged.mobile_id;
      if(/^id:/i.test(targetId)) merged.id=stripRecordPrefix(targetId);
      else if(/^old:/i.test(targetId)) merged.oldId=stripRecordPrefix(targetId);
      else if(/^key:/i.test(targetId)){ delete merged.id; delete merged.oldId; }
      const params=recordParams(merged);
      params.record_id=targetId;
      const json=safeJsonParse(params.json, merged);
      json.dashboardId=targetId;
      params.json=JSON.stringify(json);
      params.mobile_id='';
      stmt.upsertRecord.run(params);
      stmt.deleteRecord.run(row.record_id);
      repaired++;
    }
  });
  if(repaired) console.log(`Repaired ${repaired} accidental mobile shadow duplicate${repaired===1?'':'s'}.`);
  return repaired;
}
repairAccidentalMobileShadowDuplicates();

function configuredPublicBase(){
  const base=String(PUBLIC_BASE_URL||'').trim();
  if(base) return base.replace(/\/$/,'');
  const host=String(PUBLIC_HOST||'').trim();
  if(!host) return '';
  if(/^https?:\/\//i.test(host)) return host.replace(/\/$/,'');
  return `http://${host}${/:[0-9]+$/.test(host)?'':':' + DASHBOARD_PORT}`.replace(/\/$/,'');
}
function splitHost(raw){
  const value=String(raw||'').trim();
  if(!value) return {host:'', port:''};
  try{ const u=new URL('http://'+value); return {host:u.hostname.replace(/^\[|\]$/g,''), port:u.port}; }
  catch(e){ return {host:value.split(':')[0], port:''}; }
}
function isLoopbackHost(host){
  const h=String(host||'').toLowerCase();
  return !h || h==='localhost' || h==='::1' || h.startsWith('127.') || h==='0.0.0.0';
}
function firstLanIPv4(){
  const nets=os.networkInterfaces();
  for(const name of Object.keys(nets)){
    for(const ni of nets[name]||[]){
      if(ni && ni.family==='IPv4' && !ni.internal && ni.address) return ni.address;
    }
  }
  return '';
}
function publicBase(req){
  const configured=configuredPublicBase();
  if(configured) return configured;
  const headers=req?.headers||{};
  const proto=String(headers['x-forwarded-proto'] || (req?.socket?.encrypted?'https':'http')).split(',')[0].trim() || 'http';
  const rawHost=String(headers['x-forwarded-host'] || headers.host || `localhost:${DASHBOARD_PORT}`).split(',')[0].trim();
  const parsed=splitHost(rawHost);
  if(parsed.host && !isLoopbackHost(parsed.host)) return `${proto}://${rawHost}`.replace(/\/$/,'');
  const lan=firstLanIPv4();
  if(lan) return `${proto}://${lan}:${parsed.port || DASHBOARD_PORT}`.replace(/\/$/,'');
  return `${proto}://${rawHost || 'localhost:' + DASHBOARD_PORT}`.replace(/\/$/,'');
}
function phoneUrl(req){ return publicBase(req) + '/mobile/pair'; }
function status(req){ const ps=getKV('phoneServer'); return {ok:true,running:!!ps.running,port:DASHBOARD_PORT,url:ps.running?phoneUrl(req):'',startedAt:ps.running?ps.startedAt:null,mainUrl:publicBase(req)}; }
function phoneSystemRequired(res){ if(status({headers:{},socket:{}}).running) return false; sendJson(res,{ok:false,error:'Phone system is stopped. Start Phone Link on the dashboard first.'},423); return true; }
function cleanPairs(){ const now=Date.now(); const pairs=(getKV('pairs')||[]).filter(p=>p && p.expires>now && !p.used); setKV('pairs', pairs); return pairs; }
function findLinkedPhone(token){ return (getKV('phones')||[]).find(p=>p && p.token===token); }
function savePhones(phones){ setKV('phones', phones || []); }
function requestIp(req){
  const headers=(req&&req.headers)||{};
  let ip=String(headers['cf-connecting-ip']||headers['x-real-ip']||headers['x-forwarded-for']||'').split(',')[0].trim();
  if(!ip) ip=String(req?.socket?.remoteAddress||req?.connection?.remoteAddress||'').trim();
  ip=ip.replace(/^::ffff:/,'');
  return ip.slice(0,80);
}
function markPhoneSeen(phone,req){
  if(!phone) return phone;
  const ip=requestIp(req);
  if(ip){ phone.ipAddress=ip; phone.lastIp=ip; phone.ipUpdatedAt=new Date().toISOString(); }
  const ua=String(req?.headers?.['user-agent']||'').trim();
  if(ua) phone.userAgent=ua.slice(0,180);
  return phone;
}
function cleanDeviceId(value){
  const raw=String(value||'').trim();
  return /^[A-Za-z0-9_-]{24,180}$/.test(raw) ? raw : '';
}
function bindPhoneDevice(phone, deviceId){
  if(!phone) return phone;
  const clean=cleanDeviceId(deviceId);
  if(!clean) return phone;
  if(!phone.deviceId){
    phone.deviceId=clean;
    phone.deviceBoundAt=new Date().toISOString();
  }
  return phone;
}
function authorizedPhone(body, req){
  const b=(body && typeof body==='object') ? body : {};
  const phone=findLinkedPhone(String(b.token||'').trim());
  if(!phone) return null;
  bindPhoneDevice(phone,b.deviceId);
  markPhoneSeen(phone,req);
  return phone;
}
function findWhitelistedPhone(deviceId){
  const clean=cleanDeviceId(deviceId);
  if(!clean) return null;
  return (getKV('phones')||[]).find(p=>p && p.whitelisted===true && cleanDeviceId(p.deviceId)===clean) || null;
}
function headerDeviceName(req){ const ua=String(req.headers['user-agent']||''); return /iPhone/i.test(ua)?'iPhone':/iPad/i.test(ua)?'iPad':/Android/i.test(ua)?'Android Device':/Windows/i.test(ua)?'Windows Device':/Macintosh|MacIntel/i.test(ua)?'Mac':'Mobile Device'; }
function cleanDeviceName(name, req){ const raw=String(name||'').trim(); if(!raw || /^phone\s*\d+$/i.test(raw) || /^iphone\s*\d+$/i.test(raw)) return headerDeviceName(req); return raw.slice(0,80); }
function typeCode(t){ const raw=String(t||'').trim(); return canonicalTrafficType(raw) || raw || 'Mobile'; }
function normalizeMobileEntry(e, phone){
  e=(e && typeof e==='object') ? e : {};
  const code=typeCode(e.type||e.entryType||e.formType||'Mobile Entry');
  const isReverse=code==='LR';
  const isTest=code==='LT';
  const vessel=e.vessel||e.vesselName||(isReverse?'Lock Reversal':isTest?'Lock Test':'Mobile Entry');
  const n=Number(e.passengers ?? e.pass ?? 0);
  const dashboardId=compactIdValue(e.dashboardId||e.recordId||e.record_id);
  const rawId=compactIdValue(e.id);
  let mobileId=compactIdValue(e.mobileId||e.mobile_id);
  if(/^mobile:/i.test(mobileId)) mobileId=stripRecordPrefix(mobileId);
  // A dashboard id (id:/old:/key:) is not a mobile id. Treating it as one was
  // the bug that cloned every server-origin record whenever the phone bulk-synced.
  if(!mobileId && !dashboardId && rawId && !/^(mobile:|old:|id:|key:)/i.test(rawId)) mobileId=rawId;
  if(!mobileId && !dashboardId && !rawId){
    mobileId='legacy_'+hash([e.date||'',e.time||e.entryTime||'',e.vessel||e.vesselName||'',e.type||e.entryType||'',e.direction||e.dir||'',e.createdAt||''].join('|'));
  }
  const completed=e.completed===true || String(e.status||'').toLowerCase()==='completed';
  const out={...e,date:normalizeDateKey(e.date, todayISO()),canal:e.canal||e.canalReg||'Sault Canada Locks',vessel,vesselReg:e.vesselReg||e.registration||e.reg||'',type:code,direction:e.direction||e.dir||e.reverseDir||'',reverse:isReverse?'Yes':(e.reverse||''),time:normalizeTime24(e.time||e.entryTime||e.reverseTime,new Date().toTimeString().slice(0,5)),passengers:Number.isFinite(n)?n:0,destination:e.destination||e.dest||'',homePort:e.homePort||'',notes:e.notes||e.reason||e.reverseReason||'',kayakCount:e.kayakCount||e.numberOfKayaks||e.kayaks||'',numberOfKayaks:e.numberOfKayaks||e.kayakCount||e.kayaks||'',sourcePhone:phone?.name||e.sourcePhone||'Mobile App',sourcePhoneToken:phone?.token||phone?.id||e.sourcePhoneToken||'',createdAt:e.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),status:completed?'Completed':(e.status||'Pending'),completed};
  if(dashboardId) out.dashboardId=dashboardId;
  if(mobileId) out.mobileId=mobileId; else delete out.mobileId;
  if(rawId && !/^(mobile:|old:|id:|key:)/i.test(rawId)) out.id=rawId;
  return out;
}
function kayakMultiplicity(entry){
  if(!entry || typeof entry!=='object') return 1;
  const values=[entry.kayakCount,entry.numberOfKayaks,entry.kayaks];
  for(const value of values){
    const n=Math.floor(Number(value));
    if(Number.isFinite(n) && n>0) return Math.max(1,Math.min(100,n));
  }
  return 1;
}
function isKayakGroupEntry(entry){
  if(!entry || typeof entry!=='object') return false;
  if(kayakMultiplicity(entry)>1) return true;
  const text=[entry.sourceType,entry.entryType,entry.formType,entry.vesselType,entry.regType,entry.notes]
    .map(v=>String(v||'').toLowerCase()).join(' ');
  return text.includes('kayak');
}
function cleanKayakGroupNotes(value){
  return String(value||'')
    .replace(/\bNumber of Kayaks\s*:\s*\d+\s*\|?\s*/ig,'')
    .replace(/^\|\s*|\s*\|$/g,'')
    .trim();
}
function expandKayakEntries(entry){
  if(!entry || typeof entry!=='object') return [entry];
  const count=kayakMultiplicity(entry);
  if(count<=1 || !isKayakGroupEntry(entry)) return [entry];

  const totalPassengers=Math.max(0,Math.floor(Number(entry.passengers ?? entry.pass ?? 0)||0));
  const basePassengers=Math.floor(totalPassengers/count);
  const passengerRemainder=totalPassengers%count;
  const baseKey=String(entry.mobileId||entry.id||entry.dashboardId||entry.oldId||`kayak_${hash(JSON.stringify([entry.date,entry.time,entry.vessel,entry.direction,entry.createdAt]))}`);
  const groupId=String(entry.kayakGroupId||`${baseKey}:group`);
  const cleanNotes=cleanKayakGroupNotes(entry.notes||entry.reason||'');
  const pieces=[];

  for(let index=0;index<count;index++){
    const piece={...entry};
    const suffix=`:kayak:${String(index+1).padStart(2,'0')}`;
    if(entry.mobileId){
      piece.mobileId=String(entry.mobileId)+suffix;
      piece.id=piece.mobileId;
    }else{
      piece.id=String(entry.id||entry.dashboardId||entry.oldId||baseKey)+suffix;
      delete piece.mobileId;
    }
    delete piece.dashboardId;
    piece.type='RB';
    piece.sourceType='Kayak';
    piece.passengers=basePassengers+(index<passengerRemainder?1:0);
    piece.pass=String(piece.passengers);
    piece.kayakCount='1';
    piece.numberOfKayaks='1';
    piece.kayakGroupId=groupId;
    piece.kayakGroupCount=count;
    piece.kayakGroupIndex=index+1;
    piece.notes=[cleanNotes&&cleanNotes!=='-'?cleanNotes:'',`Kayak ${index+1} of ${count}`].filter(Boolean).join(' | ');
    pieces.push(piece);
  }
  return pieces;
}

function dashboardToMobileLog(r){ const stableId=recKey(r); return {id:stableId,dashboardId:stableId,mobileId:r.mobileId||'',fromDashboard:true,entryType:r.type||'Entry',formType:r.type||'Entry',type:r.type||'Entry',vessel:r.vessel||'',vesselName:r.vessel||'',reg:r.vesselReg||r.registration||r.reg||'',registration:r.vesselReg||r.registration||r.reg||'',canal:r.canal||'Sault Canada Locks',dir:r.direction||r.dir||'',direction:r.direction||r.dir||'',pass:String(r.passengers??r.pass??0),passengers:String(r.passengers??r.pass??0),dest:r.destination||r.dest||'',destination:r.destination||r.dest||'',homePort:r.homePort||'',time:normalizeTime24(r.time||r.entryTime||r.reverseTime,''),entryTime:normalizeTime24(r.time||r.entryTime||r.reverseTime,''),reverseTime:normalizeTime24(r.reverseTime||r.time||''),date:r.date||'',reason:r.reason||r.notes||'',reverseReason:r.reverseReason||r.reason||r.notes||'',notes:r.notes||'',kayakCount:r.kayakCount||r.numberOfKayaks||'',numberOfKayaks:r.numberOfKayaks||r.kayakCount||'',returningExpected:r.returningExpected===true||r.returningExpected===1||String(r.returningExpected||'').toLowerCase()==='true',willReturn:r.willReturn===true||r.willReturn===1||String(r.willReturn||'').toLowerCase()==='true',status:r.status||(r.completed?'Completed':'Pending'),completed:!!r.completed,createdAt:r.createdAt||new Date().toISOString(),syncedAt:new Date().toISOString()}; }
function updateTrafficFromMobile(existing, incoming, phone){ const rec=normalizeMobileEntry(incoming||{}, phone||{}); const merged={...(existing||{}), ...rec}; if(existing?.id) merged.id=existing.id; if(existing?.oldId) merged.oldId=existing.oldId; if(existing?.mobileId || rec.mobileId) merged.mobileId=existing?.mobileId || rec.mobileId; merged.updatedAt=new Date().toISOString(); return merged; }
function presetTextKey(value){ return String(value||'').replace(/\s+/g,' ').trim().toUpperCase(); }
function normalizePresetType(type){ const raw=String(type||'').replace(/\s+/g,' ').trim(); const lower=raw.toLowerCase(); if(raw==='G'||lower==='gov'||lower==='government'||lower==='government boat') return 'Gov'; if(raw==='C'||lower==='com'||lower==='commercial'||lower==='commercial boat') return 'Com'; if(raw==='K'||lower==='k'||lower==='kayak'||lower==='kayak entry') return 'K'; if(raw==='RB'||lower==='rb'||lower==='recreational'||lower==='recreational boat') return 'RB'; if(raw==='TB'||lower==='tb'||lower==='tour'||lower==='tour boat') return 'TB'; return ['RB','TB','Gov','Com','K'].includes(raw)?raw:''; }
function cleanPresetGroups(groups){ const out={RB:[],TB:[],Gov:[],Com:[],K:[]}; for(const type of Object.keys(out)){ const map=new Map(); for(const p of (groups?.[type]||[])){ if(!p) continue; const name=String(p.name||p.vessel||'').replace(/\s+/g,' ').trim(); if(!name) continue; map.set(presetTextKey(name), {...p, type, name}); } out[type]=[...map.values()].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))); } if(!out.K.length) out.K.push({type:'K',name:'Birds Eye Tours',vessel:'Birds Eye Tours',reg:'K',canalReg:'K',registration:'K',regType:'Kayak',vesselType:'K',owner:'Birds Eye Tours'}); return out; }
function readDeletedPresetMarks(){ const list=getKV('deletedPresets'); return Array.isArray(list)?list.filter(x=>x&&x.nameKey):[]; }
function saveDeletedPresetMarks(list){ setKV('deletedPresets', (list||[]).filter(x=>x&&x.nameKey).slice(-1000)); }
function markPresetDeleted(type,name){ const typeKey=normalizePresetType(type); const clean=String(name||'').replace(/\s+/g,' ').trim(); const nameKey=presetTextKey(clean); if(!nameKey) return; const next=readDeletedPresetMarks().filter(x=>!(x.nameKey===nameKey && (!typeKey || !x.type || x.type===typeKey))); next.push({type:typeKey,name:clean,nameKey,deletedAt:new Date().toISOString()}); saveDeletedPresetMarks(next); }
function mergeDeletedPresetMarks(incoming){ for(const m of (Array.isArray(incoming)?incoming:[])){ if(m && (m.name || m.nameKey)) markPresetDeleted(m.type, m.name || m.nameKey); } }
function clearPresetDeleteMark(type,name){ const typeKey=normalizePresetType(type); const nameKey=presetTextKey(name); if(!nameKey) return; saveDeletedPresetMarks(readDeletedPresetMarks().filter(x=>!(x.nameKey===nameKey && (!typeKey || !x.type || x.type===typeKey)))); }
function applyPresetDeletes(groups){ const out=cleanPresetGroups(groups); const marks=readDeletedPresetMarks(); if(!marks.length) return out; for(const type of Object.keys(out)){ out[type]=out[type].filter(p=>!marks.some(m=>m.nameKey===presetTextKey(p.name||p.vessel) && (!m.type || m.type===type))); } return out; }
function removePresetFromServerGroups(type,name){ const typeKey=normalizePresetType(type); const nameKey=presetTextKey(name); const groups=cleanPresetGroups(getKV('entryPresets')); for(const t of Object.keys(groups)){ if(!typeKey || t===typeKey){ groups[t]=groups[t].filter(p=>presetTextKey(p.name||p.vessel)!==nameKey); } } const filtered=applyPresetDeletes(groups); setKV('entryPresets', filtered); return filtered; }
function mergeEntryPresets(existing, incoming){ const out={RB:[],TB:[],Gov:[],Com:[],K:[]}; for(const type of Object.keys(out)){ const map=new Map(); [...(existing?.[type]||[]), ...(incoming?.[type]||[])].forEach(p=>{ if(!p) return; const name=String(p.name||p.vessel||'').trim(); if(!name) return; map.set(presetTextKey(name), {...(map.get(presetTextKey(name))||{}), ...p, type, name}); }); out[type]=[...map.values()].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))); } return applyPresetDeletes(out); }

function searchRecords(params){
  const where=[], args=[];
  if(params.date){ where.push('date=?'); args.push(String(params.date).slice(0,10)); }
  if(params.canal){ where.push("LOWER(canal) LIKE ? ESCAPE \'\\\'"); args.push(escLike(params.canal)); }
  if(params.vessel){ where.push("LOWER(vessel) LIKE ? ESCAPE \'\\\'"); args.push(escLike(params.vessel)); }
  if(params.type){ where.push("LOWER(type) LIKE ? ESCAPE \'\\\'"); args.push(escLike(params.type)); }
  if(params.destination){ where.push("LOWER(destination) LIKE ? ESCAPE \'\\\'"); args.push(escLike(params.destination)); }
  if(params.homePort){ where.push("LOWER(home_port) LIKE ? ESCAPE \'\\\'"); args.push(escLike(params.homePort)); }
  const q=String(params.q||params.search||'').trim().toLowerCase();
  if(q){ where.push("(LOWER(json) LIKE ? ESCAPE \'\\\')"); args.push(escLike(q)); }
  const limit=cleanLimit(params.limit, 250, 2000);
  const sql=`SELECT json FROM records ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY date DESC, time DESC LIMIT ?`;
  args.push(limit);
  return rowsJson(db.prepare(sql).all(...args));
}

function serveStatic(req,res){
  const requestUrl=new URL(req.url||'/', 'http://localhost');
  const raw=decodeURIComponent(requestUrl.pathname);
  const query=requestUrl.search||'';
  const desktopRoot=path.join(root,'public');
  const desktopPages=path.join(desktopRoot,'pages');
  const mobileRoot=path.join(root,'mobile','public');
  const isDesktopShell=/LockReleaseDesktop\//i.test(String(req.headers['user-agent']||''));

  const redirects={
    '/index.html':'/',
    '/daily.html':'/new-entry',
    '/daily':'/new-entry',
    '/records.html':'/records',
    '/search.html':'/search',
    '/phone-link.html':'/phone-link',
    '/management.html':'/management',
    '/management-edit.html':'/management/edit',
    '/settings.html':'/settings',
    '/reports.html':'/records',
    '/reports':'/records',
    '/registration.html':'/management',
    '/registration':'/management',
    '/registry.html':'/management',
    '/registry':'/management',
    '/mobile/index.html':'/mobile'
  };
  const mobileNames=['pair','offline','new-entry','logs','profile','settings','recreational-boat','returning-boat','tour-boat','government-boat','commercial-boat','kayak','lock-reversal','lock-test'];
  for(const name of mobileNames) redirects[`/mobile/${name}.html`]=`/mobile/${name}`;
  if(redirects[raw]){
    res.writeHead(301,{'Location':redirects[raw]+query,'Cache-Control':'no-store'});
    return res.end();
  }

  const desktopRoutes={
    '/':'index.html',
    '/new-entry':'new-entry.html',
    '/records':'records.html',
    '/search':'search.html',
    '/phone-link':'phone-link.html',
    '/management':'management/index.html',
    '/management/edit':'management/edit.html',
    '/settings':'settings.html'
  };

  let file='';
  if(desktopRoutes[raw]){
    file=path.join(desktopPages,desktopRoutes[raw]);
  }else if(raw==='/mobile' || raw==='/mobile/'){
    if(raw==='/mobile/'){
      res.writeHead(301,{'Location':'/mobile'+query,'Cache-Control':'no-store'});
      return res.end();
    }
    file=path.join(mobileRoot,'index.html');
  }else if(raw.startsWith('/mobile/')){
    const relRaw=raw.slice('/mobile/'.length);
    if(mobileNames.includes(relRaw)){
      file=path.join(mobileRoot,relRaw+'.html');
    }else{
      const rel=path.normalize(relRaw).replace(/^([.][.][\/\\])+/, '');
      file=path.join(mobileRoot,rel);
    }
    if(!file.startsWith(mobileRoot)){ res.writeHead(403); return res.end('Forbidden'); }
  }else if(raw.startsWith('/assets/')){
    const rel=path.normalize(raw.slice(1)).replace(/^([.][.][\/\\])+/, '');
    file=path.join(desktopRoot,rel);
    if(!file.startsWith(desktopRoot)){ res.writeHead(403); return res.end('Forbidden'); }
  }else{
    res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});
    return res.end('Not found');
  }

  if(fs.existsSync(file)&&fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}); return res.end('Not found');}
    const ext=path.extname(file).toLowerCase();
    let output=data;
    if(ext==='.html' && file.startsWith(desktopPages)){
      try{
        const topbar=fs.readFileSync(path.join(desktopRoot,'partials','topbar.html'),'utf8');
        let html=data.toString('utf8').replace('{{DASHBOARD_TOPBAR}}',topbar);
        if(isDesktopShell){
          const desktopHead=`<script>document.documentElement.classList.add('lock-release-desktop')</script><style id=\"lock-release-desktop-shell\">html.lock-release-desktop{--desktop-titlebar-height:32px}html.lock-release-desktop::before{content:"";position:fixed;top:0;left:0;right:0;height:var(--desktop-titlebar-height);z-index:2147483645;background:#f3f2f1;pointer-events:none}html.app-dark.lock-release-desktop::before{background:#10161d}html.lock-release-desktop::after{content:"";position:fixed;top:0;left:0;right:138px;height:var(--desktop-titlebar-height);z-index:2147483646;-webkit-app-region:drag;user-select:none;background:transparent}html.lock-release-desktop body{padding-top:var(--desktop-titlebar-height)!important}html.lock-release-desktop .main{padding-top:0!important}html.lock-release-desktop .app-shell{min-height:calc(100vh - var(--desktop-titlebar-height))!important}html.lock-release-desktop .topbar{top:var(--desktop-titlebar-height)!important;margin-top:0!important}@media (min-width:901px){html.lock-release-desktop .topbar.topbar-single-row{top:var(--desktop-titlebar-height)!important}}@media print{html.lock-release-desktop body{padding-top:0!important}html.lock-release-desktop .topbar,html.lock-release-desktop .topbar.topbar-single-row{top:0!important}}</style>`;
          html=html.replace(/<head([^>]*)>/i, match=>match+desktopHead);
        }
        output=Buffer.from(html,'utf8');
      }catch(includeErr){
        console.error('Dashboard topbar include failed:', includeErr && includeErr.message || includeErr);
        res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});
        return res.end('Dashboard layout failed to load');
      }
    }
    res.writeHead(200,{
      'Content-Type':mime[ext]||'application/octet-stream',
      'Cache-Control':(/\.(html|js|css|json|webmanifest)$/i.test(file))?'no-cache':'public, max-age=3600'
    });
    res.end(output);
  });
}

const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS') return sendJson(res,{ok:true});
  const url=new URL(req.url, `http://${req.headers.host||'localhost'}`);
  const pathname=url.pathname;
  try{
    if(pathname==='/health' && req.method==='GET') return sendJson(res,{ok:true,service:'soo-locks-dashboard',port:DASHBOARD_PORT,time:new Date().toISOString()});
    if(pathname==='/api/phone-server/status' && req.method==='GET') return sendJson(res,status(req));
    if(pathname==='/api/phone-server/start' && (req.method==='POST'||req.method==='GET')){ const ps={running:true,startedAt:new Date().toISOString()}; setKV('phoneServer', ps); addPhoneEvent('phone-server-start','Phone system started'); return sendJson(res,status(req)); }
    if(pathname==='/api/phone-server/stop' && (req.method==='POST'||req.method==='GET')){
      setKV('phoneServer',{running:false,startedAt:null});
      setKV('pairs', []);
      const phones=getKV('phones')||[];
      const trusted=phones.filter(p=>p && p.whitelisted===true);
      const removed=phones.length-trusted.length;
      savePhones(trusted);
      addPhoneEvent('phone-server-stop',`Phone system stopped; ${removed} untrusted device${removed===1?'':'s'} unpaired`);
      return sendJson(res,{...status(req),phones:trusted,unpaired:removed});
    }
    if(pathname==='/api/data' && req.method==='GET') return sendJson(res, dataShape(bootstrapTraffic()));
    if(pathname==='/api/data' && req.method==='POST'){
      const b=await readBody(req);
      runTx(()=>{
        (b.traffic||[]).forEach(saveRecord);
        (b.registry||[]).forEach(saveRegistry);
        if(b.deletedPresets) mergeDeletedPresetMarks(b.deletedPresets);
        ['phones','pairs','phoneEvents','countries','states','phoneServer'].forEach(k=>{ if(b[k]!==undefined) setKV(k,b[k]); });
        if(b.entryPresets!==undefined) setKV('entryPresets', applyPresetDeletes(b.entryPresets));
      });
      return sendJson(res,{ok:true, ...dataShape(bootstrapTraffic())});
    }
    if(pathname==='/api/presets' && req.method==='GET') return sendJson(res,{ok:true,entryPresets:applyPresetDeletes(getKV('entryPresets')),deletedPresets:getKV('deletedPresets'),registry:allRegistry()});
    if(pathname==='/api/presets' && req.method==='POST'){
      const b=await readBody(req);
      if(b.deletedPreset) markPresetDeleted(b.deletedPreset.type, b.deletedPreset.name);
      if(b.deletedPresets) mergeDeletedPresetMarks(b.deletedPresets);
      if(b.restoredPreset) clearPresetDeleteMark(b.restoredPreset.type, b.restoredPreset.name);
      if(Array.isArray(b.restoredPresets)){
        b.restoredPresets.forEach(p=>clearPresetDeleteMark(p&&p.type, p&&(p.name||p.vessel)));
      }
      const incoming = b.entryPresets || b.presets || {};
      const replaceMode = b.replace === true || b.action === 'replace' || b.mode === 'replace';
      const base = replaceMode ? {RB:[],TB:[],Gov:[],Com:[],K:[]} : getKV('entryPresets');
      const merged=applyPresetDeletes(mergeEntryPresets(base, incoming));
      setKV('entryPresets', merged);
      addPhoneEvent('presets-sync', replaceMode ? 'Dashboard presets replaced' : 'Dashboard presets updated');
      return sendJson(res,{ok:true,entryPresets:merged,deletedPresets:getKV('deletedPresets')});
    }
    if(pathname==='/api/presets/delete' && req.method==='POST'){
      const b=await readBody(req);
      if(b.deletedPresets) mergeDeletedPresetMarks(b.deletedPresets);
      markPresetDeleted(b.type, b.name);
      const filtered=removePresetFromServerGroups(b.type, b.name);
      addPhoneEvent('preset-delete', `Dashboard deleted preset ${String(b.name||'').trim()}`);
      return sendJson(res,{ok:true,entryPresets:filtered,deletedPresets:getKV('deletedPresets')});
    }
    if(pathname==='/api/records/day' && req.method==='GET') return sendJson(res,{ok:true,traffic:getDay(url.searchParams.get('date')||todayISO(), cleanLimit(url.searchParams.get('limit'),1000,3000))});
    if(pathname==='/api/records/month' && req.method==='GET') return sendJson(res,{ok:true,traffic:getMonth(url.searchParams.get('month')||todayISO().slice(0,7), cleanLimit(url.searchParams.get('limit'),5000,10000))});
    if(pathname==='/api/records/range' && req.method==='GET') return sendJson(res,{ok:true,traffic:getRange(url.searchParams.get('start')||todayISO(), url.searchParams.get('end')||todayISO(), cleanLimit(url.searchParams.get('limit'),5000,10000))});
    if(pathname==='/api/records/search' && req.method==='GET') return sendJson(res,{ok:true,traffic:searchRecords(Object.fromEntries(url.searchParams.entries()))});
    if(pathname==='/api/export' && req.method==='GET') return sendJson(res, fullExportShape());
    if(pathname==='/api/import' && req.method==='POST'){
      const b=await readBody(req);
      const payload=(b && typeof b==='object' && b.data && typeof b.data==='object') ? b.data : b;
      const mode=(b && typeof b==='object' && b.mode) ? b.mode : 'merge';
      const result=importBackup(payload, mode);
      addPhoneEvent('data-import',`Imported ${result.savedRecords} record${result.savedRecords===1?'':'s'} (${result.mode})`);
      return sendJson(res,{ok:true,...result,traffic:bootstrapTraffic(),registry:allRegistry()});
    }
    if(pathname==='/api/dashboard/entry/update' && req.method==='POST'){
      const b=await readBody(req);
      const incoming=b.entry||b.record||{};
      const found=recordByAnyId(b.id||incoming.dashboardId||incoming.id||incoming.mobileId, incoming);
      const merged={...(found?.record||{}), ...incoming, updatedAt:new Date().toISOString()};
      if(!merged.id && !merged.oldId && !merged.mobileId) merged.id='desktop_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
      merged.completed=merged.completed===true || String(merged.status||'').toLowerCase()==='completed';
      merged.status=merged.completed?'Completed':(merged.status||'Pending');
      const pieces=expandKayakEntries(merged);
      if(pieces.length>1){
        if(found) stmt.deleteRecord.run(found.id);
        const savedEntries=pieces.map(saveRecord);
        addPhoneEvent('desktop-entry-update',`Desktop dashboard added ${savedEntries.length} individual kayak records`);
        return sendJson(res,{ok:true,entry:savedEntries[0],entries:savedEntries,added:savedEntries.length,traffic:bootstrapTraffic()});
      }
      const saved=saveRecord(merged);
      addPhoneEvent('desktop-entry-update','Desktop dashboard updated an entry');
      return sendJson(res,{ok:true,entry:saved,entries:[saved],traffic:bootstrapTraffic()});
    }
    if(pathname==='/api/dashboard/entry/delete' && req.method==='POST'){
      const b=await readBody(req); const entry=b.entry||b.record||{}; const found=recordByAnyId(b.id||entry.dashboardId||entry.id||entry.mobileId, entry); let deleted=0; if(found){ stmt.deleteRecord.run(found.id); deleted=1; } markEntryDeleted(b.id||entry.dashboardId||entry.id||entry.mobileId||found?.id, found?.record||entry, {source:'desktop', date:entry.date}); addPhoneEvent('desktop-entry-delete',`Desktop dashboard deleted ${deleted} entr${deleted===1?'y':'ies'}`); return sendJson(res,{ok:true,deleted,traffic:bootstrapTraffic()});
    }
    if(pathname==='/api/pair/cancel' && req.method==='POST'){ setKV('pairs', []); addPhoneEvent('pair-cancelled','Active pairing code cancelled'); return sendJson(res,{ok:true}); }
    if(pathname==='/api/phone/unlink' && req.method==='POST'){
      const b=await readBody(req); const wanted=String(b.token||b.id||'').trim(); let phones=getKV('phones')||[]; const before=phones.length; if(wanted==='all') phones=[]; else phones=phones.filter(p=>String(p.token||p.id||'')!==wanted && String(p.id||p.token||'')!==wanted); savePhones(phones); addPhoneEvent('phone-unlinked', before-phones.length===1?'Phone unlinked':`${before-phones.length} phones unlinked`); return sendJson(res,{ok:true,removed:before-phones.length,phones});
    }
    if(pathname==='/api/phone/rename' && req.method==='POST'){
      const b=await readBody(req); const token=String(b.token||b.id||'').trim(); const name=String(b.name||'').replace(/\s+/g,' ').trim().slice(0,60); if(!name) return sendJson(res,{ok:false,error:'Device name is required'},400); const phones=getKV('phones')||[]; const phone=phones.find(p=>String(p.token||p.id||'')===token); if(!phone) return sendJson(res,{ok:false,error:'Phone not found'},404); phone.name=phone.deviceName=name; phone.customName=true; phone.renamedAt=new Date().toISOString(); savePhones(phones); addPhoneEvent('phone-renamed',`Device renamed to ${name}`); return sendJson(res,{ok:true,phones,phone});
    }
    if(pathname==='/api/phone/whitelist' && req.method==='POST'){
      const b=await readBody(req);
      const wanted=String(b.token||b.id||'').trim();
      const enabled=b.enabled===true;
      const phones=getKV('phones')||[];
      const phone=phones.find(p=>String(p.token||p.id||'')===wanted || String(p.id||p.token||'')===wanted);
      if(!phone) return sendJson(res,{ok:false,error:'Phone not found'},404);
      phone.whitelisted=enabled;
      if(enabled){
        phone.whitelistedAt=new Date().toISOString();
      }else{
        delete phone.whitelistedAt;
        delete phone.lastRestoredAt;
      }
      savePhones(phones);
      addPhoneEvent(enabled?'phone-whitelisted':'phone-whitelist-removed',`${phone.deviceName||phone.name||'Phone'} ${enabled?'will stay paired':'will require normal pairing if its session is lost'}`);
      return sendJson(res,{ok:true,phones,phone});
    }
    if(pathname==='/api/pair/create' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const pairs=cleanPairs(); const code=String(b.code||Math.floor(100000+Math.random()*900000)); const expires=Number(b.expires||Date.now()+120000); pairs.push({code,expires,used:false,createdAt:new Date().toISOString()}); setKV('pairs', pairs); addPhoneEvent('pair-created','Pairing code created'); return sendJson(res,{ok:true,code,expires,url:phoneUrl(req)});
    }
    if(pathname==='/api/mobile/link' && req.method==='POST'){
      if(phoneSystemRequired(res)) return;
      const b=await readBody(req);
      const pairs=cleanPairs();
      const pair=pairs.find(p=>p.code===String(b.code));
      if(!pair) return sendJson(res,{ok:false,error:'Invalid or expired code'},400);
      pair.used=true;
      setKV('pairs', pairs);
      const deviceId=cleanDeviceId(b.deviceId);
      const phones=getKV('phones')||[];
      let phone=deviceId ? phones.find(p=>cleanDeviceId(p.deviceId)===deviceId) : null;
      if(phone){
        if(!phone.customName) phone.name=phone.deviceName=headerDeviceName(req);
        phone.platform=String(b.platform||phone.platform||'').slice(0,80);
        phone.userAgent=String(req.headers['user-agent']||phone.userAgent||'').slice(0,180);
        markPhoneSeen(phone,req);
        phone.lastUsed='Just now';
        phone.relinkedAt=new Date().toISOString();
      }else{
        const token='phone_'+Math.random().toString(36).slice(2)+Date.now().toString(36);
        const deviceName=headerDeviceName(req);
        phone={id:token,name:deviceName,deviceName,platform:String(b.platform||'').slice(0,80),userAgent:String(req.headers['user-agent']||'').slice(0,180),ipAddress:requestIp(req),lastIp:requestIp(req),linkedAt:new Date().toLocaleString(),lastUsed:'Just now',token,deviceId:deviceId||'',whitelisted:false};
        phones.push(phone);
      }
      bindPhoneDevice(phone,deviceId);
      markPhoneSeen(phone,req);
      savePhones(phones);
      addPhoneEvent('phone-linked',`${phone.name} linked`);
      return sendJson(res,{ok:true,token:phone.token,phone:{id:phone.token,name:phone.name,linkedAt:phone.linkedAt,whitelisted:phone.whitelisted===true}});
    }
    if(pathname==='/api/mobile/restore' && req.method==='POST'){
      if(phoneSystemRequired(res)) return;
      const b=await readBody(req);
      const phone=findWhitelistedPhone(b.deviceId);
      if(!phone) return sendJson(res,{ok:false,error:'This device is not whitelisted'},401);
      phone.lastUsed='Just now';
      markPhoneSeen(phone,req);
      phone.lastRestoredAt=new Date().toISOString();
      savePhones((getKV('phones')||[]).map(p=>p===phone || p.token===phone.token ? phone : p));
      addPhoneEvent('phone-restored',`${phone.deviceName||phone.name||'Phone'} restored its saved pairing`);
      return sendJson(res,{ok:true,restored:true,token:phone.token,phone:{id:phone.token,name:phone.name,linkedAt:phone.linkedAt,whitelisted:true}});
    }
    if(pathname==='/api/mobile/presets' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const phone=authorizedPhone(b, req); if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401); phone.lastUsed=new Date().toLocaleString(); savePhones((getKV('phones')||[]).map(p=>p.token===phone.token?phone:p)); return sendJson(res,{ok:true,running:true,linked:true,entryPresets:applyPresetDeletes(getKV('entryPresets')),registry:allRegistry(),phone:{name:phone.name,lastUsed:phone.lastUsed}});
    }
    if(pathname==='/api/mobile/bootstrap' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const phone=authorizedPhone(b, req); if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401); const date=normalizeDateKey(b.date, todayISO()); phone.lastUsed=new Date().toLocaleString(); savePhones((getKV('phones')||[]).map(p=>p.token===phone.token?phone:p)); const rows=getDay(date,750); addPhoneEvent('phone-bootstrap',`${phone.name} loaded mobile app for ${date}`); return sendJson(res,{ok:true,running:true,linked:true,date,entryPresets:applyPresetDeletes(getKV('entryPresets')),registry:allRegistry(),traffic:rows,logs:rows.map(dashboardToMobileLog),phone:{name:phone.name,lastUsed:phone.lastUsed}});
    }
    if(pathname==='/api/mobile/entries' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const phone=authorizedPhone(b, req); if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401); const date=normalizeDateKey(b.date, todayISO()); phone.lastUsed=new Date().toLocaleString(); savePhones((getKV('phones')||[]).map(p=>p.token===phone.token?phone:p)); addPhoneEvent('phone-pull',`${phone.name} pulled daily entries for ${date}`); const rows=getDay(date,750); return sendJson(res,{ok:true,date,traffic:rows,logs:rows.map(dashboardToMobileLog),phone:{name:phone.name,lastUsed:phone.lastUsed}});
    }
    if(pathname==='/api/mobile/entry/update' && req.method==='POST'){
      if(phoneSystemRequired(res)) return;
      const b=await readBody(req);
      const phone=authorizedPhone(b, req);
      if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401);
      const incoming=b.entry||b.log||b.record||{};
      clearEntryDeletedMark(b.id||incoming.dashboardId||incoming.id||incoming.mobileId, incoming);
      const originalFound=recordByAnyId(b.id||incoming.dashboardId||incoming.id||incoming.mobileId, incoming);
      const pieces=expandKayakEntries(incoming);
      let added=0, updated=0;
      if(pieces.length>1 && originalFound) stmt.deleteRecord.run(originalFound.id);
      let lastRec=null;
      for(const piece of pieces){
        const normalized=normalizeMobileEntry(piece, phone);
        const found=(pieces.length===1 && originalFound) ? originalFound : recordByAnyId(piece.dashboardId||piece.id||piece.mobileId||normalized.mobileId, piece);
        lastRec=found ? updateTrafficFromMobile(found.record, piece, phone) : normalized;
        saveRecord(lastRec);
        found ? updated++ : added++;
      }
      phone.lastUsed=new Date().toLocaleString();
      savePhones((getKV('phones')||[]).map(p=>p.token===phone.token?phone:p));
      addPhoneEvent('mobile-entry-update',pieces.length>1?`${phone.name} saved ${pieces.length} individual kayak records`:`${phone.name} ${updated?'updated':'added'} an entry`);
      const date=normalizeDateKey(b.date||lastRec?.date, todayISO());
      const rows=getDay(date,750);
      return sendJson(res,{ok:true,action:updated?'updated':'added',added,updated,date,traffic:rows,logs:rows.map(dashboardToMobileLog)});
    }
    if(pathname==='/api/mobile/entry/delete' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const phone=authorizedPhone(b, req); if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401); const entry=b.entry||b.log||b.record||{}; const found=recordByAnyId(b.id||entry.dashboardId||entry.id||entry.mobileId, entry); let deleted=0; if(found){ stmt.deleteRecord.run(found.id); deleted=1; } markEntryDeleted(b.id||entry.dashboardId||entry.id||entry.mobileId||found?.id, found?.record||entry, {source:'mobile', date:b.date||entry.date}); phone.lastUsed=new Date().toLocaleString(); savePhones((getKV('phones')||[]).map(p=>p.token===phone.token?phone:p)); addPhoneEvent('mobile-entry-delete',`${phone.name} deleted ${deleted} entr${deleted===1?'y':'ies'}`); const date=normalizeDateKey(b.date||entry.date, todayISO()); const rows=getDay(date,750); return sendJson(res,{ok:true,deleted,date,traffic:rows,logs:rows.map(dashboardToMobileLog),deletedEntryMarks:getKV('deletedEntryMarks')});
    }
    if(pathname==='/api/mobile/entries/delete' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const phone=authorizedPhone(b, req); if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401); const ids=new Set((b.ids||[]).map(String)); const entries=Array.isArray(b.entries)?b.entries:[]; entries.forEach(e=>ids.add(String(e.dashboardId||e.id||e.mobileId||''))); let deleted=0; for(const id of ids){ const entry=entries.find(e=>entryIdCandidates(id,e).includes(id))||{}; const found=recordByAnyId(id, entry); if(found){ stmt.deleteRecord.run(found.id); deleted++; } markEntryDeleted(id||found?.id, found?.record||entry, {source:'mobile-bulk', date:b.date||entry.date}); } addPhoneEvent('mobile-bulk-delete',`${phone.name} bulk deleted ${deleted} entries`); const date=normalizeDateKey(b.date, todayISO()); const rows=getDay(date,750); return sendJson(res,{ok:true,deleted,date,traffic:rows,logs:rows.map(dashboardToMobileLog)});
    }
    if(pathname==='/api/mobile/logs' && req.method==='POST'){
      if(phoneSystemRequired(res)) return;
      const b=await readBody(req);
      const phone=authorizedPhone(b, req);
      if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401);
      let added=0, updated=0, skippedDeleted=0;
      for(const log of (b.logs||[])){
        if(isEntryDeletedMarked(log.dashboardId||log.id||log.mobileId, log)){ skippedDeleted++; continue; }
        const originalFound=recordByAnyId(log.dashboardId||log.id||log.mobileId, log);
        const pieces=expandKayakEntries(log);
        if(pieces.length>1 && originalFound) stmt.deleteRecord.run(originalFound.id);
        for(const piece of pieces){
          const rec=normalizeMobileEntry(piece, phone);
          const found=(pieces.length===1 && originalFound) ? originalFound : recordByAnyId(piece.dashboardId||piece.id||piece.mobileId||rec.mobileId, piece);
          saveRecord(found ? updateTrafficFromMobile(found.record, piece, phone) : rec);
          found ? updated++ : added++;
        }
      }
      phone.lastUsed=new Date().toLocaleString();
      savePhones((getKV('phones')||[]).map(p=>p.token===phone.token?phone:p));
      addPhoneEvent('mobile-sync',`${phone.name} synced ${(b.logs||[]).length} local entries into ${added+updated} server records (${added} new, ${updated} updated${skippedDeleted?`, ${skippedDeleted} skipped deleted`:''})`);
      const date=normalizeDateKey(b.date, todayISO());
      const rows=getDay(date,750);
      return sendJson(res,{ok:true,added,updated,skippedDeleted,date,traffic:rows,logs:rows.map(dashboardToMobileLog),deletedEntryMarks:getKV('deletedEntryMarks')});
    }
  }catch(err){ console.error(err); return sendJson(res,{ok:false,error:err.message||'Server error'},500); }
  serveStatic(req,res);
});

server.listen(DASHBOARD_PORT, '0.0.0.0', ()=>{
  const count=db.prepare('SELECT COUNT(*) AS c FROM records').get().c;
  console.log(`Soo Locks Dashboard running on 0.0.0.0:${DASHBOARD_PORT}`);
  console.log(`SQLite database: ${dbFile}`);
  console.log(`Records loaded: ${count}`);
  console.log(`Timezone: ${process.env.TZ}`);
});

let shuttingDown=false;
function shutdown(signal){
  if(shuttingDown) return;
  shuttingDown=true;
  console.log(`${signal} received; closing Soo Locks Dashboard...`);
  server.close(()=>{
    try{ if(db && typeof db.close==='function') db.close(); }catch(err){ console.error('Database close error:', err); }
    process.exit(0);
  });
  setTimeout(()=>process.exit(1), 10000).unref();
}
process.on('SIGTERM', ()=>shutdown('SIGTERM'));
process.on('SIGINT', ()=>shutdown('SIGINT'));
