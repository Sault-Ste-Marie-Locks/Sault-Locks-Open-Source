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

const DASHBOARD_PORT = Number(process.env.PORT || 6117);
const PUBLIC_HOST = process.env.PUBLIC_HOST || '';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';
const root = __dirname;
const dbDir = path.join(root, 'database');
const dbFile = path.join(dbDir, 'soo-locks.db');
const dataDir = path.join(root, 'data');
const jsonDataFile = path.join(root, 'data-backup', 'dashboard-data-before-sqlite.json');
const jsonFallbackFile = path.join(dataDir, 'dashboard-data.json');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};

fs.mkdirSync(dbDir, {recursive:true});
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

function runTx(fn){
  if(typeof db.transaction === 'function') return db.transaction(fn)();
  db.exec('BEGIN IMMEDIATE');
  try { const result = fn(); db.exec('COMMIT'); return result; }
  catch(err){ try{ db.exec('ROLLBACK'); }catch(_){} throw err; }
}
function safeJsonParse(v, fallback){ try { return JSON.parse(v); } catch { return fallback; } }
function readBody(req){ return new Promise(resolve=>{ let b=''; req.on('data',c=>{ b+=c; if(b.length>5e6) req.destroy(); }); req.on('end',()=>resolve(safeJsonParse(b || '{}', {}))); }); }
function sendJson(res,obj,status=200){ res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}); res.end(JSON.stringify(obj)); }
function hash(s){ return crypto.createHash('sha1').update(String(s)).digest('hex'); }
function rowJson(row){ return row ? safeJsonParse(row.json, null) : null; }
function rowsJson(rows){ return (rows||[]).map(rowJson).filter(Boolean); }
function todayISO(){ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function escLike(v){ return '%' + String(v || '').replace(/[\\%_]/g, m => '\\' + m).toLowerCase() + '%'; }
function cleanLimit(v, fallback=750, max=5000){ const n=Number(v); return Number.isFinite(n) ? Math.max(1, Math.min(max, Math.floor(n))) : fallback; }
function kvDefault(key){ if(key==='entryPresets') return {RB:[],TB:[],Gov:[],Com:[],K:[]}; if(key==='deletedPresets') return []; if(key==='deletedEntryMarks') return []; if(key==='phoneServer') return {running:false,startedAt:null}; return []; }
function getKV(key){ const row=stmt.kvGet.get(key); return row ? safeJsonParse(row.value, kvDefault(key)) : kvDefault(key); }
function setKV(key, value){ stmt.kvSet.run(key, JSON.stringify(value)); }
function addPhoneEvent(type, detail){ const events=Array.isArray(getKV('phoneEvents')) ? getKV('phoneEvents') : []; events.unshift({type, detail, at:new Date().toLocaleString()}); setKV('phoneEvents', events.slice(0,100)); }
function recKey(r){ if(r?.mobileId) return 'mobile:'+r.mobileId; if(r?.oldId) return 'old:'+r.oldId; if(r?.id) return 'id:'+r.id; return 'key:'+hash([r?.date||'', r?.time||'', r?.canal||'', String(r?.vessel||'').toUpperCase(), r?.type||'', r?.direction||''].join('|')); }
function regKey(r){ const raw=[r?.canal||'', String(r?.vessel||'').toUpperCase(), r?.vesselReg||''].map(x=>String(x).trim()).join('|'); return hash(raw === '||' ? JSON.stringify(r) : raw); }
function recordParams(r){ const id=recKey(r); return {record_id:id,date:String(r.date||'').slice(0,10),time:String(r.time||''),canal:String(r.canal||''),vessel:String(r.vessel||'').toUpperCase(),type:String(r.type||''),direction:String(r.direction||''),destination:String(r.destination||''),home_port:String(r.homePort||''),mobile_id:String(r.mobileId||''),old_id:String(r.oldId||''),json:JSON.stringify({...r, dashboardId:id}),updated_at:String(r.updatedAt||r.createdAt||new Date().toISOString())}; }
function saveRecord(r){ const params=recordParams(r); stmt.upsertRecord.run(params); return {...r, dashboardId:params.record_id}; }
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
function deletedEntryKeys(id, entry){
  const keys=entryIdCandidates(id, entry);
  const fp=entryFingerprint(entry);
  if(fp) keys.push('fp:'+fp);
  return [...new Set(keys.filter(Boolean))];
}
function markEntryDeleted(id, entry, meta){
  const keys=deletedEntryKeys(id, entry);
  if(!keys.length) return;
  const next=readDeletedEntryMarks().filter(m=>!m.keys.some(k=>keys.includes(k)));
  next.push({keys, date:String((entry&&entry.date)||meta?.date||todayISO()).slice(0,10), deletedAt:new Date().toISOString(), source:meta?.source||'mobile'});
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
  const candidates=entryIdCandidates(id, fallback);
  for(const wanted of candidates){
    const exact=rowJson(stmt.recordById.get(wanted));
    if(exact) return {id:wanted, record:exact};
    const row=db.prepare('SELECT record_id,json FROM records WHERE mobile_id=? OR old_id=? OR record_id=? LIMIT 1').get(wanted,wanted,wanted);
    if(row) return {id:row.record_id, record:rowJson(row)};
  }
  if(fallback && typeof fallback==='object'){
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
function getDay(date, limit=1000){ return rowsJson(db.prepare('SELECT json FROM records WHERE date=? ORDER BY time, vessel LIMIT ?').all(String(date||todayISO()).slice(0,10), limit)); }
function getMonth(month, limit=5000){ return rowsJson(db.prepare('SELECT json FROM records WHERE date>=? AND date<? ORDER BY date, time LIMIT ?').all(month+'-01', nextMonth(month), limit)); }
function getRange(start,end,limit=5000){ return rowsJson(db.prepare('SELECT json FROM records WHERE date>=? AND date<=? ORDER BY date, time LIMIT ?').all(String(start||todayISO()).slice(0,10), String(end||todayISO()).slice(0,10), limit)); }
function nextMonth(ym){ const [y,m]=String(ym||todayISO().slice(0,7)).split('-').map(Number); const d=new Date(y || new Date().getFullYear(), (m || 1), 1); return d.toISOString().slice(0,10); }
function bootstrapTraffic(){ const today=getDay(todayISO(), 300); const recent=rowsJson(db.prepare('SELECT json FROM records ORDER BY date DESC, time DESC LIMIT 250').all()); const map=new Map(); [...today,...recent].forEach(r=>map.set(recKey(r), r)); return [...map.values()].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')) || String(a.time||'').localeCompare(String(b.time||''))); }
function dataShape(traffic){ return {traffic, registry:allRegistry(), phones:getKV('phones'), pairs:getKV('pairs'), phoneEvents:getKV('phoneEvents'), countries:getKV('countries'), states:getKV('states'), entryPresets:applyPresetDeletes(getKV('entryPresets')), deletedPresets:getKV('deletedPresets'), phoneServer:getKV('phoneServer')}; }
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
importJsonIfDbEmpty();

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
function phoneUrl(req){ return publicBase(req) + '/mobile/pair.html'; }
function status(req){ const ps=getKV('phoneServer'); return {ok:true,running:!!ps.running,port:DASHBOARD_PORT,url:ps.running?phoneUrl(req):'',startedAt:ps.running?ps.startedAt:null,mainUrl:publicBase(req)}; }
function phoneSystemRequired(res){ if(status({headers:{},socket:{}}).running) return false; sendJson(res,{ok:false,error:'Phone system is stopped. Start Phone Link on the dashboard first.'},423); return true; }
function cleanPairs(){ const now=Date.now(); const pairs=(getKV('pairs')||[]).filter(p=>p && p.expires>now && !p.used); setKV('pairs', pairs); return pairs; }
function findLinkedPhone(token){ return (getKV('phones')||[]).find(p=>p && p.token===token); }
function savePhones(phones){ setKV('phones', phones || []); }
function headerDeviceName(req){ const ua=String(req.headers['user-agent']||''); const platform=/iPhone/i.test(ua)?'iPhone':/iPad/i.test(ua)?'iPad':/Android/i.test(ua)?'Android':/Windows/i.test(ua)?'Windows':/Macintosh/i.test(ua)?'Mac':'Phone'; const browser=/CriOS|Chrome/i.test(ua)?'Chrome':/FxiOS|Firefox/i.test(ua)?'Firefox':/EdgiOS|EdgA|Edge/i.test(ua)?'Edge':/Safari/i.test(ua)?'Safari':'Browser'; return `${platform} ${browser}`; }
function cleanDeviceName(name, req){ const raw=String(name||'').trim(); if(!raw || /^phone\s*\d+$/i.test(raw) || /^iphone\s*\d+$/i.test(raw)) return headerDeviceName(req); return raw.slice(0,80); }
function typeCode(t){ const raw=String(t||'').trim(); const s=raw.toLowerCase(); if(s.includes('reversal')) return 'LR'; if(s.includes('test')) return 'LT'; if(s==='k'||s.includes('kayak')) return 'K'; if(s.includes('tour')) return 'TB'; if(s.includes('government')) return 'Gov'; if(s.includes('commercial')) return 'Com'; if(s.includes('recreational')) return 'RB'; return raw||'Mobile'; }
function normalizeMobileEntry(e, phone){ const code=typeCode(e.type||e.entryType||e.formType||'Mobile Entry'); const isReverse=code==='LR'; const isTest=code==='LT'; const vessel=e.vessel||e.vesselName||(isReverse?'Lock Reversal':isTest?'Lock Test':'Mobile Entry'); const n=Number(e.passengers ?? e.pass ?? 0); const mobileId=String(e.mobileId || e.id || e.createdAt || `${Date.now()}_${Math.random().toString(36).slice(2)}`); const completed=e.completed===true || String(e.status||'').toLowerCase()==='completed'; return {date:String(e.date||todayISO()).slice(0,10),canal:e.canal||e.canalReg||'Sault Canada Locks',vessel,vesselReg:e.vesselReg||e.registration||e.reg||'',type:code,direction:e.direction||e.dir||e.reverseDir||'',reverse:isReverse?'Yes':(e.reverse||''),time:e.time||e.entryTime||e.reverseTime||new Date().toTimeString().slice(0,5),passengers:Number.isFinite(n)?n:0,destination:e.destination||e.dest||'',homePort:e.homePort||'',notes:e.notes||e.reason||e.reverseReason||'',kayakCount:e.kayakCount||e.numberOfKayaks||e.kayaks||'',numberOfKayaks:e.numberOfKayaks||e.kayakCount||e.kayaks||'',mobileId,sourcePhone:phone?.name||'Mobile App',sourcePhoneToken:phone?.token||phone?.id||'',createdAt:e.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),status:completed?'Completed':(e.status||'Pending'),completed}; }
function dashboardToMobileLog(r){ const stableId=recKey(r); return {id:stableId,dashboardId:stableId,mobileId:r.mobileId||'',fromDashboard:true,entryType:r.type||'Entry',formType:r.type||'Entry',type:r.type||'Entry',vessel:r.vessel||'',vesselName:r.vessel||'',reg:r.vesselReg||r.registration||r.reg||'',registration:r.vesselReg||r.registration||r.reg||'',canal:r.canal||'Sault Canada Locks',dir:r.direction||r.dir||'',direction:r.direction||r.dir||'',pass:String(r.passengers??r.pass??0),passengers:String(r.passengers??r.pass??0),dest:r.destination||r.dest||'',destination:r.destination||r.dest||'',homePort:r.homePort||'',time:r.time||r.entryTime||r.reverseTime||'',entryTime:r.time||r.entryTime||r.reverseTime||'',reverseTime:r.reverseTime||r.time||'',date:r.date||'',reason:r.reason||r.notes||'',reverseReason:r.reverseReason||r.reason||r.notes||'',notes:r.notes||'',kayakCount:r.kayakCount||r.numberOfKayaks||'',numberOfKayaks:r.numberOfKayaks||r.kayakCount||'',status:r.status||(r.completed?'Completed':'Pending'),completed:!!r.completed,createdAt:r.createdAt||new Date().toISOString(),syncedAt:new Date().toISOString()}; }
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
  const raw=decodeURIComponent((req.url||'/').split('?')[0]);
  let file;
  const mobileRoot=path.join(root,'mobile','public');
  if(raw==='/mobile' || raw==='/mobile/'){
    file=path.join(mobileRoot,'index.html');
  }else if(raw.startsWith('/mobile/')){
    const rel=path.normalize(raw.slice('/mobile/'.length) || 'index.html').replace(/^([.][.][\/\\])+/, '');
    file=path.join(mobileRoot, rel);
    if(!path.extname(file) && !fs.existsSync(file)) file += '.html';
    if(!file.startsWith(mobileRoot)){ res.writeHead(403); return res.end('Forbidden'); }
  }else{
    const safe=path.normalize(raw).replace(/^([.][.][\/\\])+/, '');
    file=path.join(root,safe==='/'?'index.html':safe);
    if(!file.startsWith(root)){res.writeHead(403); return res.end('Forbidden');}
  }
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}); return res.end('Not found');}
    const ext=path.extname(file).toLowerCase();
    res.writeHead(200,{
      'Content-Type':mime[ext]||'application/octet-stream',
      'Cache-Control':(/\.(html|js|css|json|webmanifest)$/i.test(file))?'no-cache':'public, max-age=3600'
    });
    res.end(data);
  });
}

const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS') return sendJson(res,{ok:true});
  const url=new URL(req.url, `http://${req.headers.host||'localhost'}`);
  const pathname=url.pathname;
  try{
    if(pathname==='/api/phone-server/status' && req.method==='GET') return sendJson(res,status(req));
    if(pathname==='/api/phone-server/start' && (req.method==='POST'||req.method==='GET')){ const ps={running:true,startedAt:new Date().toISOString()}; setKV('phoneServer', ps); addPhoneEvent('phone-server-start','Phone system started'); return sendJson(res,status(req)); }
    if(pathname==='/api/phone-server/stop' && (req.method==='POST'||req.method==='GET')){ setKV('phoneServer',{running:false,startedAt:null}); setKV('pairs', []); addPhoneEvent('phone-server-stop','Phone system stopped'); return sendJson(res,status(req)); }
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
    if(pathname==='/api/export' && req.method==='GET') return sendJson(res, dataShape(rowsJson(db.prepare('SELECT json FROM records ORDER BY date, time').all())));
    if(pathname==='/api/dashboard/entry/update' && req.method==='POST'){
      const b=await readBody(req); const incoming=b.entry||b.record||{}; const found=recordByAnyId(b.id||incoming.dashboardId||incoming.id||incoming.mobileId, incoming); const merged={...(found?.record||{}), ...incoming, updatedAt:new Date().toISOString()}; if(!merged.id && !merged.oldId && !merged.mobileId) merged.id='desktop_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8); merged.completed=merged.completed===true || String(merged.status||'').toLowerCase()==='completed'; merged.status=merged.completed?'Completed':(merged.status||'Pending'); const saved=saveRecord(merged); addPhoneEvent('desktop-entry-update','Desktop dashboard updated an entry'); return sendJson(res,{ok:true,entry:saved,traffic:bootstrapTraffic()});
    }
    if(pathname==='/api/dashboard/entry/delete' && req.method==='POST'){
      const b=await readBody(req); const entry=b.entry||b.record||{}; const found=recordByAnyId(b.id||entry.dashboardId||entry.id||entry.mobileId, entry); let deleted=0; if(found){ stmt.deleteRecord.run(found.id); deleted=1; } markEntryDeleted(b.id||entry.dashboardId||entry.id||entry.mobileId||found?.id, found?.record||entry, {source:'desktop', date:entry.date}); addPhoneEvent('desktop-entry-delete',`Desktop dashboard deleted ${deleted} entr${deleted===1?'y':'ies'}`); return sendJson(res,{ok:true,deleted,traffic:bootstrapTraffic()});
    }
    if(pathname==='/api/pair/cancel' && req.method==='POST'){ setKV('pairs', []); addPhoneEvent('pair-cancelled','Active pairing code cancelled'); return sendJson(res,{ok:true}); }
    if(pathname==='/api/phone/unlink' && req.method==='POST'){
      const b=await readBody(req); const wanted=String(b.token||b.id||'').trim(); let phones=getKV('phones')||[]; const before=phones.length; if(wanted==='all') phones=[]; else phones=phones.filter(p=>String(p.token||p.id||'')!==wanted && String(p.id||p.token||'')!==wanted); savePhones(phones); addPhoneEvent('phone-unlinked', before-phones.length===1?'Phone unlinked':`${before-phones.length} phones unlinked`); return sendJson(res,{ok:true,removed:before-phones.length,phones});
    }
    if(pathname==='/api/pair/create' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const pairs=cleanPairs(); const code=String(b.code||Math.floor(100000+Math.random()*900000)); const expires=Number(b.expires||Date.now()+120000); pairs.push({code,expires,used:false,createdAt:new Date().toISOString()}); setKV('pairs', pairs); addPhoneEvent('pair-created','Pairing code created'); return sendJson(res,{ok:true,code,expires,url:phoneUrl(req)});
    }
    if(pathname==='/api/mobile/link' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const pairs=cleanPairs(); const pair=pairs.find(p=>p.code===String(b.code)); if(!pair) return sendJson(res,{ok:false,error:'Invalid or expired code'},400); pair.used=true; setKV('pairs', pairs); const token='phone_'+Math.random().toString(36).slice(2)+Date.now().toString(36); const deviceName=cleanDeviceName(b.name, req); const phone={id:token,name:deviceName,deviceName,platform:String(b.platform||'').slice(0,80),userAgent:String(req.headers['user-agent']||'').slice(0,180),linkedAt:new Date().toLocaleString(),lastUsed:'Just now',token}; const phones=getKV('phones')||[]; phones.push(phone); savePhones(phones); addPhoneEvent('phone-linked',`${phone.name} linked`); return sendJson(res,{ok:true,token,phone:{id:token,name:phone.name,linkedAt:phone.linkedAt}});
    }
    if(pathname==='/api/mobile/presets' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const phone=findLinkedPhone(b.token); if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401); phone.lastUsed=new Date().toLocaleString(); savePhones((getKV('phones')||[]).map(p=>p.token===phone.token?phone:p)); return sendJson(res,{ok:true,running:true,linked:true,entryPresets:applyPresetDeletes(getKV('entryPresets')),registry:allRegistry(),phone:{name:phone.name,lastUsed:phone.lastUsed}});
    }
    if(pathname==='/api/mobile/bootstrap' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const phone=findLinkedPhone(b.token); if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401); const date=String(b.date||todayISO()).slice(0,10); phone.lastUsed=new Date().toLocaleString(); savePhones((getKV('phones')||[]).map(p=>p.token===phone.token?phone:p)); const rows=getDay(date,750); addPhoneEvent('phone-bootstrap',`${phone.name} loaded mobile app for ${date}`); return sendJson(res,{ok:true,running:true,linked:true,date,entryPresets:applyPresetDeletes(getKV('entryPresets')),registry:allRegistry(),traffic:rows,logs:rows.map(dashboardToMobileLog),phone:{name:phone.name,lastUsed:phone.lastUsed}});
    }
    if(pathname==='/api/mobile/entries' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const phone=findLinkedPhone(b.token); if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401); const date=String(b.date||todayISO()).slice(0,10); phone.lastUsed=new Date().toLocaleString(); savePhones((getKV('phones')||[]).map(p=>p.token===phone.token?phone:p)); addPhoneEvent('phone-pull',`${phone.name} pulled daily entries for ${date}`); const rows=getDay(date,750); return sendJson(res,{ok:true,date,traffic:rows,logs:rows.map(dashboardToMobileLog),phone:{name:phone.name,lastUsed:phone.lastUsed}});
    }
    if(pathname==='/api/mobile/entry/update' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const phone=findLinkedPhone(b.token); if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401); const incoming=b.entry||b.log||b.record||{}; clearEntryDeletedMark(b.id||incoming.dashboardId||incoming.id||incoming.mobileId, incoming); const found=recordByAnyId(b.id||incoming.dashboardId||incoming.id||incoming.mobileId, incoming); const rec=found ? updateTrafficFromMobile(found.record, incoming, phone) : normalizeMobileEntry(incoming, phone); saveRecord(rec); phone.lastUsed=new Date().toLocaleString(); savePhones((getKV('phones')||[]).map(p=>p.token===phone.token?phone:p)); addPhoneEvent('mobile-entry-update',`${phone.name} ${found?'updated':'added'} an entry`); const date=String(b.date||rec.date||todayISO()).slice(0,10); const rows=getDay(date,750); return sendJson(res,{ok:true,action:found?'updated':'added',date,traffic:rows,logs:rows.map(dashboardToMobileLog)});
    }
    if(pathname==='/api/mobile/entry/delete' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const phone=findLinkedPhone(b.token); if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401); const entry=b.entry||b.log||b.record||{}; const found=recordByAnyId(b.id||entry.dashboardId||entry.id||entry.mobileId, entry); let deleted=0; if(found){ stmt.deleteRecord.run(found.id); deleted=1; } markEntryDeleted(b.id||entry.dashboardId||entry.id||entry.mobileId||found?.id, found?.record||entry, {source:'mobile', date:b.date||entry.date}); phone.lastUsed=new Date().toLocaleString(); savePhones((getKV('phones')||[]).map(p=>p.token===phone.token?phone:p)); addPhoneEvent('mobile-entry-delete',`${phone.name} deleted ${deleted} entr${deleted===1?'y':'ies'}`); const date=String(b.date||entry.date||todayISO()).slice(0,10); const rows=getDay(date,750); return sendJson(res,{ok:true,deleted,date,traffic:rows,logs:rows.map(dashboardToMobileLog),deletedEntryMarks:getKV('deletedEntryMarks')});
    }
    if(pathname==='/api/mobile/entries/delete' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const phone=findLinkedPhone(b.token); if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401); const ids=new Set((b.ids||[]).map(String)); const entries=Array.isArray(b.entries)?b.entries:[]; entries.forEach(e=>ids.add(String(e.dashboardId||e.id||e.mobileId||''))); let deleted=0; for(const id of ids){ const entry=entries.find(e=>entryIdCandidates(id,e).includes(id))||{}; const found=recordByAnyId(id, entry); if(found){ stmt.deleteRecord.run(found.id); deleted++; } markEntryDeleted(id||found?.id, found?.record||entry, {source:'mobile-bulk', date:b.date||entry.date}); } addPhoneEvent('mobile-bulk-delete',`${phone.name} bulk deleted ${deleted} entries`); const date=String(b.date||todayISO()).slice(0,10); const rows=getDay(date,750); return sendJson(res,{ok:true,deleted,date,traffic:rows,logs:rows.map(dashboardToMobileLog)});
    }
    if(pathname==='/api/mobile/logs' && req.method==='POST'){
      if(phoneSystemRequired(res)) return; const b=await readBody(req); const phone=findLinkedPhone(b.token); if(!phone) return sendJson(res,{ok:false,error:'Phone not linked'},401); let added=0, updated=0, skippedDeleted=0; for(const log of (b.logs||[])){ if(isEntryDeletedMarked(log.dashboardId||log.id||log.mobileId, log)){ skippedDeleted++; continue; } const rec=normalizeMobileEntry(log, phone); const found=recordByAnyId(rec.mobileId || rec.id, rec); saveRecord(found ? updateTrafficFromMobile(found.record, log, phone) : rec); found ? updated++ : added++; } phone.lastUsed=new Date().toLocaleString(); savePhones((getKV('phones')||[]).map(p=>p.token===phone.token?phone:p)); addPhoneEvent('mobile-sync',`${phone.name} synced ${(b.logs||[]).length} entries (${added} new, ${updated} updated${skippedDeleted?`, ${skippedDeleted} skipped deleted`:''})`); const date=String(b.date||todayISO()).slice(0,10); const rows=getDay(date,750); return sendJson(res,{ok:true,added,updated,skippedDeleted,date,traffic:rows,logs:rows.map(dashboardToMobileLog),deletedEntryMarks:getKV('deletedEntryMarks')});
    }
  }catch(err){ console.error(err); return sendJson(res,{ok:false,error:err.message||'Server error'},500); }
  serveStatic(req,res);
});

server.listen(DASHBOARD_PORT, '0.0.0.0', ()=>{
  const count=db.prepare('SELECT COUNT(*) AS c FROM records').get().c;
  console.log(`Soo Locks Dashboard running: http://localhost:${DASHBOARD_PORT}`);
  console.log(`SQLite database: ${dbFile}`);
  console.log(`Records loaded: ${count}`);
});
