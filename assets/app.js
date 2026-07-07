const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const todayISO = () => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const nowTime = () => new Date().toTimeString().slice(0,5);
const prettyDate = iso => iso ? new Date(iso + 'T00:00:00').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'}) : '';
const storeKey = 'ssmCanalDashboard.v1';
const themeKey = 'ssmCanalDashboard.darkMode';
const demo = {traffic:[{date:'2026-05-22',canal:'0507',vessel:'HOLIDAY',vesselReg:'',type:'TB',direction:'D',reverse:'',time:'11:20',passengers:12,destination:'LSM',homePort:'Sault Ste. Marie, MI, USA'},{date:'2026-05-22',canal:'0534',vessel:'LE VOYAGEUR',vesselReg:'',type:'TB',direction:'D',reverse:'',time:'11:20',passengers:8,destination:'LSM',homePort:'Sault Ste. Marie, MI, USA'},{date:'2026-05-22',canal:'',vessel:'',vesselReg:'',type:'LR',direction:'U',reverse:'Yes',time:'11:40',passengers:0,destination:'',homePort:''},{date:'2026-05-22',canal:'0533',vessel:'NOKOMIS',vesselReg:'',type:'TB',direction:'D',reverse:'',time:'12:10',passengers:51,destination:'LSM',homePort:'Sault Ste. Marie, MI, USA'},{date:'2026-05-22',canal:'0507',vessel:'HOLIDAY',vesselReg:'',type:'TB',direction:'U',reverse:'',time:'14:00',passengers:9,destination:'USM',homePort:'Sault Ste. Marie, MI, USA'},{date:'2026-05-22',canal:'0534',vessel:'LE VOYAGEUR',vesselReg:'',type:'TB',direction:'D',reverse:'',time:'14:20',passengers:13,destination:'LSM',homePort:'Sault Ste. Marie, MI, USA'},{date:'2026-05-22',canal:'',vessel:'',vesselReg:'',type:'LR',direction:'U',reverse:'Yes',time:'15:40',passengers:0,destination:'',homePort:''},{date:'2026-05-22',canal:'0534',vessel:'LE VOYAGEUR',vesselReg:'',type:'TB',direction:'D',reverse:'',time:'16:20',passengers:16,destination:'LSM',homePort:'Sault Ste. Marie, MI, USA'},{date:'2026-05-22',canal:'',vessel:'',vesselReg:'',type:'LR',direction:'U',reverse:'Yes',time:'17:20',passengers:0,destination:'',homePort:''}],registry:[{canal:'0010',owner:'MICHAEL PALARO',vessel:'',length:'',regType:'',vesselReg:'43E18557',type:'RB',city:'Sault Ste. Marie',country:'CAN',state:'ON',address:''},{canal:'0507',owner:'A&C LOCK TOURS',vessel:'HOLIDAY',length:'',regType:'Commercial',vesselReg:'43E19740',type:'TB',city:'Sault Ste. Marie',country:'USA',state:'MI',address:'1157 E. Portage Ave.'},{canal:'0510',owner:'A&C Lock Tours',vessel:'TAKES TWO',length:'',regType:'Commercial',vesselReg:'86E13097',type:'TB',city:'Sault Ste. Marie',country:'USA',state:'MI',address:'1157 E. Portage Ave.'},{canal:'0531',owner:'A&C Lock Tours',vessel:'BIDE-A-WEE',length:'',regType:'Commercial',vesselReg:'43E444',type:'TB',city:'Sault Ste. Marie',country:'USA',state:'MI',address:'1157 E. Portage Ave.'},{canal:'0533',owner:'A&C Lock Tours',vessel:'NOKOMIS',length:'',regType:'Commercial',vesselReg:'',type:'TB',city:'Sault Ste. Marie',country:'USA',state:'MI',address:'1157 E. Portage Ave.'},{canal:'0534',owner:'A&C Lock Tours',vessel:'LE VOYAGEUR',length:'',regType:'Commercial',vesselReg:'',type:'TB',city:'Sault Ste. Marie',country:'USA',state:'MI',address:'1157 E. Portage Ave.'},{canal:'0535',owner:'City Police',vessel:'CITY POLICE JET DRIVE',length:'',regType:'Government',vesselReg:'ON445696',type:'Gov',city:'Sault Ste. Marie',country:'CAN',state:'ON',address:''},{canal:'0540',owner:'OPP',vessel:"THOMAS B. O'GRADY",length:'',regType:'Government',vesselReg:'50E12387',type:'Gov',city:'Sault Ste. Marie',country:'CAN',state:'ON',address:''}],phones:[]};
function safeJsonParse(value, fallback){try{return JSON.parse(value) ?? fallback;}catch(e){return fallback;}}
let data = safeJsonParse(localStorage.getItem(storeKey), null) || JSON.parse(JSON.stringify(demo));
if(!Array.isArray(data.traffic)) data.traffic=[];
if(!Array.isArray(data.registry)) data.registry=[];
if(!Array.isArray(data.phones)) data.phones=[];
if(!Array.isArray(data.phoneEvents)) data.phoneEvents=[];
let activePair = JSON.parse(localStorage.getItem('ssmCanalDashboard.activePair') || 'null');
const phoneServerStateKey='ssmCanalDashboard.phoneServerState';
let phoneServerState=JSON.parse(localStorage.getItem(phoneServerStateKey)||'null')||{running:false,port:6115,url:'',startedAt:null,mode:'local',mainUrl:''};
let currentReport='dailyReport';
const entryTypes = {
  RB: {
    title: 'Recreational Boat',
    sub: 'Private or recreational vessel movement',
    type: 'RB',
    reverse: '',
    vesselRequired: true
  },
  TB: {
    title: 'Tour Boat',
    sub: 'Passenger or tour vessel movement',
    type: 'TB',
    reverse: '',
    vesselRequired: true
  },
  Gov: {
    title: 'Government Boat',
    sub: 'Police, Coast Guard, or agency vessel',
    type: 'Gov',
    reverse: '',
    vesselRequired: true
  },
  Com: {
    title: 'Commercial Boat',
    sub: 'Commercial traffic or work vessel',
    type: 'Com',
    reverse: '',
    vesselRequired: true
  },
  K: {
    title: 'Kayak',
    sub: 'Kayak or canoe vessel movement',
    type: 'K',
    reverse: '',
    vesselRequired: true
  },
  LR: {
    title: 'Lock Reversal',
    sub: 'Lock reversal event record',
    type: 'LR',
    reverse: 'Yes',
    vesselRequired: false
  },
  LT: {
    title: 'Lock Test',
    sub: 'Lock test event record',
    type: 'LT',
    reverse: '',
    vesselRequired: false
  }
};let selectedEntryType=null;
function dashboardRecKey(r){
  if(r && r.mobileId) return 'mobile:' + r.mobileId;
  if(r && r.oldId) return 'old:' + r.oldId;
  return [r?.date||'', r?.time||'', r?.canal||'', String(r?.vessel||'').toUpperCase(), r?.type||'', r?.direction||''].join('|');
}
function mergeByKey(existing=[], incoming=[], keyFn=dashboardRecKey){
  const map = new Map();
  [...existing, ...incoming].forEach(item=>{
    if(!item || typeof item !== 'object') return;
    const key = keyFn(item);
    map.set(key, {...(map.get(key)||{}), ...item});
  });
  return [...map.values()];
}
function mergePhonesLocal(existing=[], incoming=[]){
  return mergeByKey(existing, incoming, p => p.token || p.id || p.name || JSON.stringify(p));
}
const DASHBOARD_LOCAL_TRAFFIC_LIMIT = 250;
function safeLocalSet(key, value){
  try{ localStorage.setItem(key, value); return true; }
  catch(e){
    try{ localStorage.removeItem(storeKey + '.backup'); localStorage.removeItem('saultLocksLastDashboardPull'); localStorage.removeItem('saultLocksLogs'); }catch(_){}
    try{ localStorage.setItem(key, value); return true; }catch(_){}
    return false;
  }
}
function buildLocalSnapshot(){
  const today = todayISO();
  const traffic = Array.isArray(data.traffic) ? data.traffic : [];
  const recent = traffic
    .filter(r => String(r.date||'').slice(0,10) === today)
    .concat(traffic.slice(-DASHBOARD_LOCAL_TRAFFIC_LIMIT))
    .filter((item, index, arr) => arr.findIndex(x => dashboardRecKey(x) === dashboardRecKey(item)) === index)
    .slice(-DASHBOARD_LOCAL_TRAFFIC_LIMIT);
  return {
    traffic: recent,
    registry: Array.isArray(data.registry) ? data.registry.slice(-600) : [],
    phones: Array.isArray(data.phones) ? data.phones : [],
    phoneEvents: Array.isArray(data.phoneEvents) ? data.phoneEvents.slice(0,100) : [],
    entryPresets: data.entryPresets || vesselPresetGroups || {RB:[],TB:[],Gov:[],Com:[],K:[]},
    phoneServer: data.phoneServer || phoneServerState || {running:false}
  };
}
function persistLocal(){
  const snapshot = buildLocalSnapshot();
  safeLocalSet(storeKey, JSON.stringify(snapshot));
  // Do not store the full 20-year dataset in localStorage. It belongs in data/dashboard-data.json on the server.
  try{ localStorage.removeItem(storeKey + '.backup'); }catch(e){}
}
function save(){persistLocal(); pushServerData();}
async function pushServerData(){try{await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}catch(e){}}
async function pullServerData(){
  try{
    const r=await fetch('/api/data',{cache:'no-store'}); if(!r.ok) return;
    const serverData=await r.json();
    if(serverData&&Array.isArray(serverData.traffic)){
      const localRegistry = Array.isArray(data.registry) ? data.registry : [];
      data={...data,...serverData};
      // Server is authoritative for traffic so mobile/dashboard deletes do not come back from browser localStorage.
      data.traffic=(serverData.traffic||[]).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')) || String(a.time||'').localeCompare(String(b.time||'')));
      data.registry=mergeByKey(localRegistry, serverData.registry||[], r => `${String(r.canal||'').trim()}|${String(r.vessel||'').trim().toUpperCase()}`);
      data.phones=Array.isArray(serverData.phones) ? serverData.phones : []; // Server is authoritative so unlinked phones do not come back from local cache.
      data.phoneEvents=serverData.phoneEvents || data.phoneEvents || [];
      if(serverData.entryPresets && typeof serverData.entryPresets==='object' && Date.now() >= presetSyncBusyUntil){
        vesselPresetGroups=applyDeletedPresetTombstones(normalizeVesselPresets(serverData.entryPresets));
        safeLocalSet(presetKey, JSON.stringify(vesselPresetGroups));
      }
      if(serverData.phoneServer && typeof serverData.phoneServer==='object'){
        phoneServerState={...phoneServerState,...serverData.phoneServer,mode:'backend',mainUrl:phoneServerState.mainUrl||location.origin};
        if(!phoneServerState.running){ phoneServerState.url=''; phoneServerState.startedAt=null; }
        savePhoneServerState();
      }
      persistLocal(); render();
    }
  }catch(e){}
}

const oldDbImportKey = 'ssmCanalDashboard.oldDbCsvImport.v2';
function oldDbRecordKey(r){return r.oldId ? 'old:'+r.oldId : [r.date,r.time,r.canal,r.vessel,r.type,r.direction].join('|');}
function mergeOldDbDataOnce(){
  // Import the old database only once. After that, the server is authoritative so edited/deleted old entries do not come back.
  if(localStorage.getItem(oldDbImportKey)==='true' && Array.isArray(data.traffic) && data.traffic.length>50) return;
  const source = window.OLD_DB_DATA;
  if(!source) return;
  const backup = safeJsonParse(localStorage.getItem(storeKey + '.backup'), null);
  if(backup && Array.isArray(backup.traffic) && backup.traffic.length > data.traffic.length){
    data.traffic = mergeByKey(data.traffic || [], backup.traffic || []);
    data.registry = mergeByKey(data.registry || [], backup.registry || [], r => `${String(r.canal||'').trim()}|${String(r.vessel||'').trim().toUpperCase()}`);
  }
  data.countries = source.countries || data.countries || [];
  data.states = source.states || data.states || [];
  const currentRegistry = Array.isArray(data.registry) ? data.registry : [];
  const currentTraffic = Array.isArray(data.traffic) ? data.traffic : [];
  const sourceTraffic = source.traffic || [];
  const sourceRegistry = source.registry || [];
  // The old database is required historical data, so re-add it whenever a newer sync/cache accidentally removed it.
  data.registry = mergeByKey(sourceRegistry, currentRegistry, r => `${String(r.canal||'').trim()}|${String(r.vessel||'').trim().toUpperCase()}`)
    .sort((a,b)=>String(a.vessel||'').localeCompare(String(b.vessel||'')) || String(a.canal||'').localeCompare(String(b.canal||'')));
  data.traffic = mergeByKey(sourceTraffic, currentTraffic, dashboardRecKey)
    .sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')) || String(a.time||'').localeCompare(String(b.time||'')));
  localStorage.setItem(oldDbImportKey,'true');
  persistLocal();
  pushServerData();
}
function savePair(){localStorage.setItem('ssmCanalDashboard.activePair',JSON.stringify(activePair));}
function savePhoneServerState(){localStorage.setItem(phoneServerStateKey,JSON.stringify(phoneServerState));}
mergeOldDbDataOnce();
function toast(msg='Saved'){const t=$('#toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1700);}
function setText(sel,val){const el=$(sel); if(el) el.textContent=val;}
function setHTML(sel,val){const el=$(sel); if(el) el.innerHTML=val;}
function typeBadge(type){const cls=(type||'').toLowerCase(); return `<span class="badge ${cls}">${type||'-'}</span>`;}
function entryTypeLabel(type){return entryTypes[type]?.title || (type==='LR'?'Lock Reversal':type==='LT'?'Lock Test':'Entry');}
function trafficRecordId(r){
  if(!r || typeof r !== 'object') return '';
  if(r.mobileId) return 'mobile:' + r.mobileId;
  if(r.oldId) return 'old:' + r.oldId;
  if(r.id) return 'id:' + r.id;
  return 'key:' + dashboardRecKey(r);
}
function findTrafficIndexById(id){
  const wanted=String(id||'').trim();
  if(!wanted) return -1;
  return (data.traffic||[]).findIndex(r=>trafficRecordId(r)===wanted || String(r.mobileId||'')===wanted || String(r.oldId||'')===wanted || String(r.id||'')===wanted);
}
function trafficRows(rows, actions=false){return `<thead><tr><th>Date</th><th>Time</th><th>Canal</th><th>Vessel</th><th>Type</th><th>Dir.</th><th>Rev.</th><th>Passengers</th><th>Destination</th><th>Home Port</th>${actions?'<th>Actions</th>':''}</tr></thead><tbody>`+rows.map(r=>{const id=htmlEscape(trafficRecordId(r));return `<tr data-entry-id="${id}"><td>${prettyDate(r.date)}</td><td>${htmlEscape(r.time||'')}</td><td>${htmlEscape(r.canal||'')}</td><td><strong>${htmlEscape(r.vessel||entryTypeLabel(r.type))}</strong></td><td>${typeBadge(r.type)}</td><td>${htmlEscape(r.direction||'')}</td><td>${htmlEscape(r.reverse||'')}</td><td>${htmlEscape(r.passengers??0)}</td><td>${htmlEscape(r.destination||'')}</td><td>${htmlEscape(r.homePort||'')}</td>${actions?`<td class="entry-actions"><button class="btn" type="button" data-entry-action="edit" data-entry-id="${id}">Edit</button><button class="btn danger" type="button" data-entry-action="delete" data-entry-id="${id}">Delete</button></td>`:''}</tr>`}).join('')+'</tbody>'; }
function registryRows(rows){return `<thead><tr><th>Canal Reg #</th><th>Owner</th><th>Vessel</th><th>Vessel Reg #</th><th>Type</th><th>City</th><th>State/Prov.</th><th>Country</th></tr></thead><tbody>`+rows.map(r=>`<tr><td><strong>${r.canal}</strong></td><td>${r.owner}</td><td>${r.vessel}</td><td>${r.vesselReg||''}</td><td>${typeBadge(r.type)}</td><td>${r.city||''}</td><td>${r.state||''}</td><td>${r.country||''}</td></tr>`).join('')+'</tbody>';}
function phoneEventRows(){const events=data.phoneEvents||[]; if(!events.length) return '<div class="phone-event-empty">No phone activity logged yet.</div>'; return events.slice(0,12).map(e=>`<div class="phone-event-row"><strong>${htmlEscape(e.type||'event')}</strong><span>${htmlEscape(e.detail||'')}</span><small>${htmlEscape(e.at||'')}</small></div>`).join('');}
function phoneRows(){
  const rows=data.phones||[];
  const head=`<thead><tr><th>Device</th><th>Status</th><th>Linked</th><th>Last Used</th><th></th></tr></thead>`;
  if(!rows.length) return head+`<tbody><tr><td colspan="5">No phones linked. Unlink and Stop Server are now controlled by the server, not browser cache.</td></tr></tbody>`;
  return head+`<tbody>`+rows.map((p)=>{
    const token=htmlEscape(p.token||p.id||'');
    return `<tr data-phone-token="${token}"><td><strong>${htmlEscape(p.deviceName||p.name||'Mobile Device')}</strong><br><span style="color:var(--text-soft);font-size:12px">${htmlEscape(p.platform||'Mobile app')}</span></td><td><span class="badge rb">Linked</span></td><td>${htmlEscape(p.linkedAt||'')}</td><td>${htmlEscape(p.lastUsed||'Never')}</td><td><button class="btn danger" type="button" onclick="unlinkPhoneByToken('${token}')">Unlink</button></td></tr>`;
  }).join('')+'</tbody>';
}
function applyTheme(){const dark=localStorage.getItem(themeKey)==='true'; document.body.classList.toggle('dark-mode',dark); document.documentElement.classList.toggle('app-dark',dark); const toggle=$('#darkModeToggle'); if(toggle) toggle.checked=dark;}
async function exportData(){
  try{
    const r=await fetch('/api/export',{cache:'no-store'});
    const full=r.ok ? await r.json() : data;
    const blob=new Blob([JSON.stringify(full,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='sault-canal-data.json'; a.click(); toast('Export started');
  }catch(e){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='sault-canal-data.json'; a.click(); toast('Export started');}
}
function renderChart(){const el=$('#typeChart'); if(!el) return; const counts=data.traffic.reduce((a,r)=>{a[r.type]=(a[r.type]||0)+1;return a},{}); const max=Math.max(1,...Object.values(counts)); el.innerHTML=['TB','RB','Gov','Com','LR','LT'].map(type=>{const val=counts[type]||0; return `<div class="bar-row"><span>${type}</span><div class="bar"><i style="width:${(val/max)*100}%"></i></div><strong>${val}</strong></div>`;}).join('');}
async function runSearch(){
  if(!$('#searchTable')) return;
  const params=new URLSearchParams();
  const global=($('#globalSearch')?.value||'').trim();
  const filters={date:$('#searchDate')?.value||'',canal:$('#searchCanal')?.value||'',vessel:$('#searchVessel')?.value||'',type:$('#searchType')?.value||'',destination:$('#searchDestination')?.value||'',homePort:$('#searchHomePort')?.value||''};
  if(global) params.set('q', global);
  Object.entries(filters).forEach(([k,v])=>{ if(v) params.set(k,v); });
  params.set('limit','500');
  try{
    const r=await fetch('/api/records/search?'+params.toString(),{cache:'no-store'});
    const out=await r.json().catch(()=>({}));
    const rows=Array.isArray(out.traffic) ? out.traffic : [];
    setHTML('#searchTable',trafficRows(rows,true));
    setText('#searchCount',`${rows.length} found${rows.length>=500?' - narrow your search for more':''}`);
  }catch(e){
    const q=global.toLowerCase();
    const rows=(data.traffic||[]).filter(r=>Object.values(r).join(' ').toLowerCase().includes(q));
    setHTML('#searchTable',trafficRows(rows,true));
    setText('#searchCount',`${rows.length} found`);
  }
}
function typeCount(rows,type){return rows.filter(r=>r.type===type).length;}
function reportEmptyRow(colspan,msg='No records found for this report period.'){return `<tr><td colspan="${colspan}" class="report-empty">${msg}</td></tr>`;}
async function fetchReportRows(kind){
  const reportDate=$('#reportDate')?.value || todayISO();
  const reportMonth=$('#reportMonth')?.value || todayISO().slice(0,7);
  const start=$('#startDate')?.value || todayISO().slice(0,8)+'01';
  const end=$('#endDate')?.value || todayISO();
  try{
    let url='';
    if(kind==='dailyReport') url='/api/records/day?date='+encodeURIComponent(reportDate)+'&limit=3000';
    else if(kind==='monthlyReport') url='/api/records/month?month='+encodeURIComponent(reportMonth)+'&limit=10000';
    else url='/api/records/range?start='+encodeURIComponent(start)+'&end='+encodeURIComponent(end)+'&limit=10000';
    const r=await fetch(url,{cache:'no-store'});
    const out=await r.json().catch(()=>({}));
    if(r.ok && Array.isArray(out.traffic)) return out.traffic;
  }catch(e){}
  if(kind==='dailyReport') return (data.traffic||[]).filter(r=>r.date===reportDate);
  if(kind==='monthlyReport') return (data.traffic||[]).filter(r=>String(r.date||'').startsWith(reportMonth));
  return (data.traffic||[]).filter(r=>r.date>=start&&r.date<=end);
}
async function renderReport(){
  updateReportControls();
  const area=$('#reportArea'); if(!area) return;
  const reportDate=$('#reportDate')?.value || todayISO();
  const reportMonth=$('#reportMonth')?.value || todayISO().slice(0,7);
  area.innerHTML='<div class="report-loading">Loading report...</div>';
  if(currentReport==='dailyReport'){
    const rows=(await fetchReportRows('dailyReport')).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
    const passengers=rows.reduce((a,r)=>a+(Number(r.passengers)||0),0);
    const body=rows.length?trafficRows(rows):`<thead><tr><th>Date</th><th>Time</th><th>Canal</th><th>Vessel</th><th>Type</th><th>Dir.</th><th>Rev.</th><th>Passengers</th><th>Destination</th><th>Home Port</th></tr></thead><tbody>${reportEmptyRow(10)}</tbody>`;
area.innerHTML = `
  <div class="report-head">
    <h2>Sault Ste. Marie Canal</h2>
    <h3>Daily Traffic Report — ${prettyDate(reportDate)}</h3>
  </div>
  <div class="report-summary">
    <span><b>${rows.length}</b> Lockages</span>
    <span><b>${passengers}</b> Passengers</span>
    <span><b>${typeCount(rows, 'TB')}</b> Tour Boats</span>
    <span><b>${typeCount(rows, 'RB')}</b> Recreational</span>
    <span><b>${typeCount(rows, 'K')}</b> Kayaks</span>
    <span><b>${typeCount(rows, 'LR')}</b> Reversals</span>
  </div>
  <div class="table-wrap report-table-wrap">
    <table>${body}</table>
  </div>
  <div class="report-footer">Printed ${new Date().toLocaleString()}</div>
`;  } else if(currentReport==='monthlyReport'){
    const rows=(await fetchReportRows('monthlyReport')).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')) || String(a.time||'').localeCompare(String(b.time||'')));
    const byDate={};
    rows.forEach(r=>{byDate[r.date]=byDate[r.date]||{tb:0,rb:0,gov:0,com:0,lr:0,lt:0,total:0,pass:0,first:r.time||'',last:r.time||''}; const d=byDate[r.date]; d.total++; d.pass+=Number(r.passengers)||0; if(r.type==='TB')d.tb++; if(r.type==='RB')d.rb++; if(r.type==='Gov')d.gov++; if(r.type==='Com')d.com++; if(r.type==='LR')d.lr++; if(r.type==='LT')d.lt++; if((r.time||'') && (!d.first || r.time<d.first))d.first=r.time; if((r.time||'') && (!d.last || r.time>d.last))d.last=r.time;});
    const body=Object.entries(byDate).map(([date,v])=>`<tr><td>${prettyDate(date)}</td><td>${v.first}</td><td>${v.last}</td><td>${v.tb}</td><td>${v.rb}</td><td>${v.gov}</td><td>${v.com}</td><td>${v.lr}</td><td>${v.lt}</td><td>${v.total}</td><td>${v.pass}</td></tr>`).join('') || reportEmptyRow(11);
    const passengers=rows.reduce((a,r)=>a+(Number(r.passengers)||0),0);
area.innerHTML = `
  <div class="report-head">
    <h2>Sault Ste. Marie Canal</h2>
    <h3>Monthly Traffic Report — ${new Date(reportMonth + '-01T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
  </div>
  <div class="report-summary">
    <span><b>${rows.length}</b> Total Records</span>
    <span><b>${passengers}</b> Passengers</span>
    <span><b>${typeCount(rows, 'TB')}</b> Tour Boats</span>
    <span><b>${typeCount(rows, 'RB')}</b> Recreational</span>
    <span><b>${typeCount(rows, 'K')}</b> Kayaks</span>
    <span><b>${typeCount(rows, 'Gov')}</b> Government</span>
    <span><b>${typeCount(rows, 'Com')}</b> Commercial</span>
  </div>
  <div class="table-wrap report-table-wrap">
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>First Lockage</th>
          <th>Last Lockage</th>
          <th>TB</th>
          <th>RB</th>
          <th>K</th>
          <th>Gov</th>
          <th>Com</th>
          <th>LR</th>
          <th>LT</th>
          <th>Total</th>
          <th>Passengers</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>
  <div class="report-footer">Printed ${new Date().toLocaleString()}</div>
`;  } else {
    const start=$('#startDate')?.value || todayISO().slice(0,8)+'01'; const end=$('#endDate')?.value || todayISO();
    const rows=(await fetchReportRows('betweenReport')).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')) || String(a.time||'').localeCompare(String(b.time||'')));
    const body=rows.length?trafficRows(rows):`<thead><tr><th>Date</th><th>Time</th><th>Canal</th><th>Vessel</th><th>Type</th><th>Dir.</th><th>Rev.</th><th>Passengers</th><th>Destination</th><th>Home Port</th></tr></thead><tbody>${reportEmptyRow(10)}</tbody>`;
    area.innerHTML=`<div class="report-head"><h2>Sault Ste. Marie Canal</h2><h3>Between Records — ${prettyDate(start)} to ${prettyDate(end)}</h3></div><div class="table-wrap report-table-wrap"><table>${body}</table></div><div class="report-footer">Printed ${new Date().toLocaleString()}</div>`;
  }
}
function updateReportControls(){
  document.body.dataset.reportKind=currentReport;
  $$('.report-field').forEach(x=>x.classList.toggle('is-active',x.dataset.forReport===currentReport));
  const hint=$('#recordsPreviewHint');
  if(hint){
    hint.textContent=currentReport==='dailyReport'?'Daily report preview':currentReport==='monthlyReport'?'Monthly report preview':'Date range report preview';
  }
}
function switchReport(report){currentReport=report; $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.report===report)); updateReportControls(); renderReport();}
async function printReport(report){
  if(report){
    currentReport=report;
    $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.report===report));
    updateReportControls();
  }
  await renderReport();
  document.body.classList.add('printing-report');
  setTimeout(()=>window.print(),120);
}
window.addEventListener('afterprint',()=>document.body.classList.remove('printing-report'));

function setupEntryTypeChooser(){
  const chooser=$('#entryTypeChooser'), formPanel=$('#entryFormPanel'), recordsPanel=$('#entryRecordsPanel');
  if(!chooser||!formPanel) return;
  const params=new URLSearchParams(window.location.search);
  const raw=params.get('type');
  const config=entryTypes[raw];
  selectedEntryType=config?raw:null;
  chooser.hidden=!!config;
  formPanel.hidden=!config;
  if(recordsPanel) recordsPanel.hidden=!config;
  if(!config) return;
  setText('#entryPageTitle',config.title);
  setText('#entryPageText',config.sub+'.');
  setText('#selectedEntryTitle',config.title+' Entry');
  setText('#selectedEntrySubtext',config.sub);
  if($('#trafficType')) $('#trafficType').value=config.type;
  if($('#trafficReverse')) $('#trafficReverse').value=config.reverse||'';
  if($('#trafficVessel')) $('#trafficVessel').required=!!config.vesselRequired;
  document.body.classList.toggle('system-entry-type', raw==='LR'||raw==='LT');
}
function reapplySelectedEntryType(){
  if(!selectedEntryType||!entryTypes[selectedEntryType]) return;
  const config=entryTypes[selectedEntryType];
  if($('#trafficType')) $('#trafficType').value=config.type;
  if($('#trafficReverse')) $('#trafficReverse').value=config.reverse||'';
  if($('#trafficVessel')) $('#trafficVessel').required=!!config.vesselRequired;
}
function fillFromRegistry(){const vessel=$('#trafficVessel'), canal=$('#trafficCanalReg'); if(!vessel||!canal) return; const key=vessel.value.trim().toLowerCase()||canal.value.trim().toLowerCase(); const found=data.registry.find(r=>(r.vessel||'').toLowerCase()===key||r.canal===key); if(found){canal.value=found.canal||''; vessel.value=found.vessel||''; if($('#trafficVesselReg')) $('#trafficVesselReg').value=found.vesselReg||''; if($('#trafficType')) $('#trafficType').value=found.type||'TB'; if($('#trafficHomePort')) $('#trafficHomePort').value=[found.city,found.state,found.country].filter(Boolean).join(', ');}}

function buildEntryFromEditor(){
  return {
    date:$('#editTrafficDate')?.value || todayISO(),
    canal:$('#editTrafficCanal')?.value || '',
    vessel:($('#editTrafficVessel')?.value || '').toUpperCase(),
    vesselReg:$('#editTrafficReg')?.value || '',
    type:$('#editTrafficType')?.value || 'RB',
    direction:$('#editTrafficDirection')?.value || '',
    reverse:$('#editTrafficReverse')?.value || '',
    time:$('#editTrafficTime')?.value || nowTime(),
    passengers:Number($('#editTrafficPassengers')?.value || 0) || 0,
    destination:($('#editTrafficDestination')?.value || '').toUpperCase(),
    homePort:$('#editTrafficHomePort')?.value || '',
    notes:$('#editTrafficNotes')?.value || '',
    status:$('#editTrafficStatus')?.value || 'Pending',
    completed:($('#editTrafficStatus')?.value || '').toLowerCase()==='completed'
  };
}
function ensureEntryEditorStyles(){
  if($('#entryEditModalStyles')) return;
  const style=document.createElement('style');
  style.id='entryEditModalStyles';
  style.textContent=`
    body.entry-editor-open{
      overflow:hidden;
    }

    .entry-edit-modal[hidden]{
      display:none!important;
    }

    .entry-edit-modal{
      position:fixed;
      inset:0;
      z-index:1000000;
      display:grid;
      place-items:center;
      padding:20px;
      background:rgba(15,23,42,.42);
      backdrop-filter:blur(8px);
    }

    .entry-edit-backdrop{
      position:absolute;
      inset:0;
    }

    .entry-edit-card{
      position:relative;
      z-index:1;
      width:min(940px,100%);
      max-height:min(86vh,780px);
      display:flex;
      flex-direction:column;
      border:1px solid var(--line);
      border-radius:14px;
      background:var(--surface);
      box-shadow:0 24px 70px rgba(15,23,42,.28);
      overflow:hidden;
    }

    .entry-edit-header{
      flex:0 0 auto;
      min-height:64px;
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:14px;
      padding:18px 20px;
      border-bottom:1px solid var(--line);
      background:linear-gradient(180deg,var(--surface),var(--surface-alt));
    }

    .entry-edit-header h3{
      margin:0 0 4px;
      color:var(--text);
      font-size:20px;
      line-height:1.15;
      font-weight:700;
      letter-spacing:-.025em;
    }

    .entry-edit-header small{
      display:block;
      color:var(--text-soft);
      font-size:13px;
      line-height:1.35;
    }

    .entry-edit-close{
      flex:0 0 auto;
      width:36px;
      height:36px;
      min-height:36px;
      padding:0!important;
      border-radius:8px!important;
      font-size:18px;
      line-height:1;
    }

    .entry-edit-scroll{
      flex:1 1 auto;
      overflow:auto;
      padding:18px 20px 20px;
    }

    .entry-edit-section{
      border:1px solid var(--line);
      border-radius:12px;
      background:var(--surface);
      overflow:hidden;
    }

    .entry-edit-section + .entry-edit-section{
      margin-top:14px;
    }

    .entry-edit-section-title{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding:12px 14px;
      border-bottom:1px solid var(--line);
      background:var(--surface-alt);
    }

    .entry-edit-section-title strong{
      color:var(--text);
      font-size:14px;
      font-weight:700;
    }

    .entry-edit-section-title span{
      color:var(--text-soft);
      font-size:12px;
      font-weight:600;
    }

    .entry-edit-grid{
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:14px;
      padding:14px;
    }

    .entry-edit-grid.entry-main-grid{
      grid-template-columns:repeat(4,minmax(0,1fr));
    }

    .entry-edit-grid.entry-location-grid{
      grid-template-columns:repeat(2,minmax(0,1fr));
    }

    .entry-edit-field{
      display:grid;
      gap:6px;
      min-width:0;
    }

    .entry-edit-field.full{
      grid-column:1/-1;
    }

    .entry-edit-field span{
      color:var(--text-soft);
      font-size:11px;
      font-weight:800;
      letter-spacing:.045em;
      text-transform:uppercase;
    }

    .entry-edit-field input,
    .entry-edit-field select,
    .entry-edit-field textarea{
      width:100%;
      min-height:40px;
      border:1px solid var(--line-strong);
      border-radius:8px;
      background:var(--surface);
      color:var(--text);
      outline:0;
      padding:8px 10px;
      font-size:14px;
      font-weight:500;
      box-shadow:none;
    }

    .entry-edit-field textarea{
      min-height:78px;
      resize:vertical;
      line-height:1.4;
    }

    .entry-edit-field input:focus,
    .entry-edit-field select:focus,
    .entry-edit-field textarea:focus{
      border-color:var(--accent);
      box-shadow:0 0 0 3px rgba(37,99,235,.13);
    }

    .entry-edit-actions{
      flex:0 0 auto;
      display:grid;
      grid-template-columns:auto 1fr auto auto;
      gap:10px;
      align-items:center;
      padding:14px 20px;
      border-top:1px solid var(--line);
      background:rgba(255,255,255,.88);
      backdrop-filter:blur(14px);
    }

    .entry-edit-actions .btn{
      min-height:38px;
      border-radius:8px;
      font-size:13px;
      font-weight:700;
    }

    .entry-edit-actions .primary{
      min-width:130px;
    }

    .entry-edit-delete-wrap{
      justify-self:start;
    }

    .entry-edit-save-wrap{
      display:flex;
      justify-content:flex-end;
      gap:10px;
      grid-column:3/5;
    }

    .entry-edit-meta{
      color:var(--text-soft);
      font-size:12px;
      font-weight:600;
    }

    body.dark-mode .entry-edit-modal,
    html.app-dark .entry-edit-modal{
      background:rgba(0,0,0,.54);
    }

    body.dark-mode .entry-edit-card,
    html.app-dark .entry-edit-card,
    body.dark-mode .entry-edit-section,
    html.app-dark .entry-edit-section{
      background:var(--surface)!important;
      border-color:var(--line)!important;
      color:var(--text)!important;
    }

    body.dark-mode .entry-edit-header,
    html.app-dark .entry-edit-header{
      background:linear-gradient(180deg,var(--surface-alt),var(--surface))!important;
      border-color:var(--line)!important;
    }

    body.dark-mode .entry-edit-section-title,
    html.app-dark .entry-edit-section-title{
      background:var(--surface-alt)!important;
      border-color:var(--line)!important;
    }

    body.dark-mode .entry-edit-field input,
    body.dark-mode .entry-edit-field select,
    body.dark-mode .entry-edit-field textarea,
    html.app-dark .entry-edit-field input,
    html.app-dark .entry-edit-field select,
    html.app-dark .entry-edit-field textarea{
      background:#11151c!important;
      border-color:var(--line-strong)!important;
      color:var(--text)!important;
    }

    body.dark-mode .entry-edit-actions,
    html.app-dark .entry-edit-actions{
      background:rgba(23,26,33,.88)!important;
      border-color:var(--line)!important;
    }

    @media(max-width:900px){
      .entry-edit-card{
        max-height:92vh;
      }

      .entry-edit-grid,
      .entry-edit-grid.entry-main-grid,
      .entry-edit-grid.entry-location-grid{
        grid-template-columns:repeat(2,minmax(0,1fr));
      }
    }

    @media(max-width:620px){
      .entry-edit-modal{
        padding:10px;
        place-items:end center;
      }

      .entry-edit-card{
        width:100%;
        max-height:94vh;
        border-radius:16px 16px 0 0;
      }

      .entry-edit-header{
        padding:16px;
      }

      .entry-edit-header h3{
        font-size:18px;
      }

      .entry-edit-scroll{
        padding:14px;
      }

      .entry-edit-grid,
      .entry-edit-grid.entry-main-grid,
      .entry-edit-grid.entry-location-grid{
        grid-template-columns:1fr;
        gap:12px;
        padding:12px;
      }

      .entry-edit-actions{
        grid-template-columns:1fr;
        padding:12px 14px 14px;
      }

      .entry-edit-delete-wrap,
      .entry-edit-save-wrap{
        width:100%;
        display:grid;
        grid-template-columns:1fr;
        gap:8px;
        grid-column:auto;
      }

      .entry-edit-actions .btn{
        width:100%;
        min-height:42px;
      }

      .entry-edit-meta{
        text-align:center;
      }
    }
  `;
  document.head.appendChild(style);
}

function ensureEntryEditor(){
  ensureEntryEditorStyles();
  if($('#entryEditModal')) return;

  const modal=document.createElement('div');
  modal.id='entryEditModal';
  modal.className='entry-edit-modal';
  modal.hidden=true;
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','entryEditTitle');

  modal.innerHTML=`
    <div class="entry-edit-backdrop" data-entry-action="close-edit"></div>
    <form id="entryEditForm" class="entry-edit-card" autocomplete="off">
      <div class="entry-edit-header">
        <div>
          <h3 id="entryEditTitle">Edit Daily Entry</h3>
          <small>Update the record details, then save it to the dashboard and mobile app.</small>
        </div>
        <button class="btn entry-edit-close" type="button" data-entry-action="close-edit" aria-label="Close edit window">×</button>
      </div>

      <input type="hidden" id="editTrafficOriginalId">

      <div class="entry-edit-scroll">
        <section class="entry-edit-section">
          <div class="entry-edit-section-title">
            <strong>Traffic Details</strong>
            <span>Date, vessel, lockage and type</span>
          </div>

          <div class="entry-edit-grid entry-main-grid">
            <label class="entry-edit-field">
              <span>Date</span>
              <input id="editTrafficDate" type="date" required>
            </label>

            <label class="entry-edit-field">
              <span>Time</span>
              <input id="editTrafficTime" type="time" required>
            </label>

            <label class="entry-edit-field">
              <span>Canal Reg #</span>
              <input id="editTrafficCanal" list="vesselList">
            </label>

            <label class="entry-edit-field">
              <span>Vessel</span>
              <input id="editTrafficVessel" list="vesselList">
            </label>

            <label class="entry-edit-field">
              <span>Vessel Reg</span>
              <input id="editTrafficReg">
            </label>

            <label class="entry-edit-field">
              <span>Type</span>
              <select id="editTrafficType">
                <option value="RB">Recreational Boat</option>
                <option value="TB">Tour Boat</option>
                <option value="K">Kayak</option>
                <option value="Gov">Government Boat</option>
                <option value="Com">Commercial Boat</option>
                <option value="LR">Lock Reversal</option>
                <option value="LT">Lock Test</option>
              </select>
            </label>

            <label class="entry-edit-field">
              <span>Direction</span>
              <select id="editTrafficDirection">
                <option value="">Select</option>
                <option value="U">Up</option>
                <option value="D">Down</option>
                <option value="Drain">Drain</option>
              </select>
            </label>

            <label class="entry-edit-field">
              <span>Reversal</span>
              <select id="editTrafficReverse">
                <option value="">No</option>
                <option value="Yes">Yes</option>
              </select>
            </label>

            <label class="entry-edit-field">
              <span>Passengers</span>
              <input id="editTrafficPassengers" type="number" min="0" step="1">
            </label>

            <label class="entry-edit-field">
              <span>Status</span>
              <select id="editTrafficStatus">
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </label>
          </div>
        </section>

        <section class="entry-edit-section">
          <div class="entry-edit-section-title">
            <strong>Route & Notes</strong>
            <span>Destination, home port and reason</span>
          </div>

          <div class="entry-edit-grid entry-location-grid">
            <label class="entry-edit-field">
              <span>Destination</span>
              <input id="editTrafficDestination">
            </label>

            <label class="entry-edit-field">
              <span>Home Port</span>
              <input id="editTrafficHomePort">
            </label>

            <label class="entry-edit-field full">
              <span>Notes / Reason</span>
              <textarea id="editTrafficNotes" rows="3"></textarea>
            </label>
          </div>
        </section>
      </div>

      <div class="entry-edit-actions">
        <div class="entry-edit-delete-wrap">
          <button class="btn danger" type="button" id="entryEditDelete">Delete Entry</button>
        </div>

        <div class="entry-edit-meta" id="entryEditMeta">Ready to edit</div>

        <div class="entry-edit-save-wrap">
          <button class="btn ghost" type="button" data-entry-action="close-edit">Cancel</button>
          <button class="btn primary" type="submit">Save Changes</button>
        </div>
      </div>
    </form>`;

  document.body.appendChild(modal);

  $('#entryEditForm')?.addEventListener('submit',saveEntryEdit);
  $('#entryEditDelete')?.addEventListener('click',()=>{
    const id=$('#editTrafficOriginalId')?.value;
    if(id) deleteTrafficById(id,true);
  });

  document.addEventListener('keydown', e=>{
    if(e.key==='Escape' && !$('#entryEditModal')?.hidden) closeEntryEditor();
  });
}

function closeEntryEditor(){
  const modal=$('#entryEditModal');
  if(modal) modal.hidden=true;
  document.body.classList.remove('entry-editor-open');
}

function openEntryEditor(id){
  ensureEntryEditor();
  const idx=findTrafficIndexById(id);
  if(idx<0){toast('Entry not found'); return;}

  const r=data.traffic[idx]||{};
  $('#editTrafficOriginalId').value=trafficRecordId(r);
  $('#editTrafficDate').value=String(r.date||todayISO()).slice(0,10);
  $('#editTrafficTime').value=r.time||nowTime();
  $('#editTrafficCanal').value=r.canal||'';
  $('#editTrafficVessel').value=r.vessel||'';
  $('#editTrafficReg').value=r.vesselReg||r.registration||r.reg||'';
  $('#editTrafficType').value=r.type||'RB';
  $('#editTrafficDirection').value=r.direction||'';
  $('#editTrafficReverse').value=r.reverse||'';
  $('#editTrafficPassengers').value=Number(r.passengers)||0;
  $('#editTrafficDestination').value=r.destination||'';
  $('#editTrafficHomePort').value=r.homePort||'';
  $('#editTrafficNotes').value=r.notes||r.reason||'';
  $('#editTrafficStatus').value=r.completed||String(r.status||'').toLowerCase()==='completed'?'Completed':'Pending';

  const titleText = r.vessel || entryTypeLabel(r.type) || 'Entry';
  const meta=$('#entryEditMeta');
  if(meta) meta.textContent = `${prettyDate(r.date)}${r.time ? ' · ' + r.time : ''} · ${titleText}`;

  const modal=$('#entryEditModal');
  modal.hidden=false;
  document.body.classList.add('entry-editor-open');
  setTimeout(()=>$('#editTrafficDate')?.focus(),60);
}

async function saveEntryEdit(e){
  e.preventDefault();
  const id=$('#editTrafficOriginalId')?.value || '';
  const idx=findTrafficIndexById(id);
  if(idx<0){toast('Entry not found'); return;}
  const entry={...(data.traffic[idx]||{}),...buildEntryFromEditor(),updatedAt:new Date().toISOString()};
  try{
    const r=await fetch('/api/dashboard/entry/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,entry})});
    const out=await r.json().catch(()=>({}));
    if(!r.ok||!out.ok) throw new Error(out.error||'Save failed');
    if(Array.isArray(out.traffic)) data.traffic=out.traffic; else data.traffic[idx]=out.entry||entry;
    persistLocal(); closeEntryEditor(); render(); toast('Entry updated');
  }catch(err){
    data.traffic[idx]=entry;
    save(); closeEntryEditor(); render(); toast('Entry updated locally');
  }
}
async function deleteTrafficById(id, fromEditor=false){
  const idx=findTrafficIndexById(id);
  if(idx<0){toast('Entry not found'); return;}
  if(!confirm('Delete this entry? This will also remove it from the phone app.')) return;
  const backup=data.traffic[idx];
  try{
    const r=await fetch('/api/dashboard/entry/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    const out=await r.json().catch(()=>({}));
    if(!r.ok||!out.ok) throw new Error(out.error||'Delete failed');
    if(Array.isArray(out.traffic)) data.traffic=out.traffic; else data.traffic.splice(idx,1);
    persistLocal(); if(fromEditor) closeEntryEditor(); render(); toast('Entry deleted');
  }catch(err){
    data.traffic.splice(idx,1);
    save(); if(fromEditor) closeEntryEditor(); render(); toast('Entry deleted locally');
  }
}
function editTrafficById(id){openEntryEditor(id);}
function deleteTraffic(i){const r=data.traffic[i]; if(r) deleteTrafficById(trafficRecordId(r));}

async function unlinkPhoneByToken(token){
  token=String(token||'').trim();
  if(!token){ toast('Missing phone token'); return; }
  const phone=(data.phones||[]).find(p=>String(p.token||p.id||'')===token || String(p.id||p.token||'')===token);
  const label=phone?.deviceName||phone?.name||'this phone';
  if(!confirm(`Unlink ${label}? It will lose access to the mobile app until it is paired again.`)) return;
  try{
    const res=await fetch('/api/phone/unlink',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,id:token})});
    const out=await res.json().catch(()=>({}));
    if(!res.ok || !out.ok) throw new Error(out.error||'Unlink failed');
    data.phones=Array.isArray(out.phones)?out.phones:[];
    persistLocal();
    activePair=null; savePair();
    render();
    toast(out.removed ? 'Phone unlinked' : 'Phone was already unlinked');
    setTimeout(pullServerData, 250);
  }catch(e){
    console.error(e);
    toast('Unlink failed — check server console');
    await pullServerData();
  }
}
async function unlinkPhone(i){
  const phone=(data.phones||[])[i];
  return unlinkPhoneByToken(phone?.token||phone?.id||'');
}
async function phoneServerApi(action){
  try{
    const res=await fetch('/api/phone-server/'+action,{method: action==='status'?'GET':'POST',cache:'no-store'});
    const out=await res.json().catch(()=>({ok:false,error:'Bad server response'}));
    if(!res.ok || out.ok===false) throw new Error(out.error || 'Phone server API unavailable');
    return out;
  }catch(e){
    console.error('Phone server API failed:', e);
    return null;
  }
}
function publicDashboardBase(){
  if(phoneServerState.mainUrl) return String(phoneServerState.mainUrl).replace(/\/$/,'');
  if(location.protocol && location.host && location.protocol !== 'file:') return location.origin;
  return '';
}
function localPhoneServerUrl(){
  return publicDashboardBase()+'/mobile/pair.html';
}
async function refreshPhoneServerStatus(){
  const status=await phoneServerApi('status');
  if(status){phoneServerState={...phoneServerState,...status,mode:'backend'}; if(!phoneServerState.running){phoneServerState.url=''; phoneServerState.startedAt=null;} savePhoneServerState();}
  renderPhoneServer();
}
function renderPhoneServer(){
  const status=$('#phoneServerStatus'), info=$('#phoneServerInfo'), dot=$('#phoneServerDot'), urlBox=$('#phoneServerUrl'), start=$('#startPhoneServer'), stop=$('#stopPhoneServer');
  if(!status||!info) return;
  const running=!!phoneServerState.running;
  const url=phoneServerState.url || (running ? localPhoneServerUrl() : '');
  status.textContent=running?'Phone link server running':'Phone link server offline';
  info.textContent=running?'Phone system is running. Linked phones can now open, update, and delete dashboard entries.':'Phone system is stopped. Phones cannot pair, update, or delete entries until you press Start Server.';
  if(dot) dot.classList.toggle('online',running);
  if(urlBox){urlBox.hidden=!running; urlBox.textContent=url;}
  if(start) start.disabled=running;
  if(stop) stop.disabled=!running;
}
async function startPhoneServer(){
  const startBtn=$('#startPhoneServer');
  if(startBtn) startBtn.disabled=true;
  const res=await phoneServerApi('start');
  if(!res){
    phoneServerState={...phoneServerState,running:false,url:'',startedAt:null,mode:'backend'};
    savePhoneServerState(); renderPhoneServer(); toast('Phone server failed to start — check server console');
    return;
  }
  phoneServerState={...phoneServerState,...res,mode:'backend'};
  savePhoneServerState(); renderPhoneServer(); toast('Phone server started');
}
async function stopPhoneServer(){
  const res=await phoneServerApi('stop');
  phoneServerState={...phoneServerState,...(res||{}),running:false,url:'',startedAt:null,mode:'backend'};
  activePair=null; savePair(); savePhoneServerState(); await pullServerData(); renderPhoneServer(); renderPairCode(); toast('Phone server stopped');
}
function getPhonePairLink(code){
  const base = publicDashboardBase();
  try{
    const url = new URL(base + '/mobile/pair.html');
    url.searchParams.set('base', base);
    return url.toString();
  }catch(e){
    return base + '/mobile/pair.html';
  }
}
async function copyTextToClipboard(text){
  try{
    if(navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(text);
      return true;
    }
  }catch(e){}
  try{
    const ta=document.createElement('textarea');
    ta.value=text;
    ta.setAttribute('readonly','');
    ta.style.position='fixed';
    ta.style.left='-9999px';
    ta.style.top='0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok=document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }catch(e){return false;}
}
function renderPairCode(){
  const codeBox=$('#pairCode'), meta=$('#pairMeta'), qrBox=$('#pairQrBox'), qrImg=$('#pairQr');
  if(!codeBox||!meta) return;
  if(!phoneServerState.running){
    activePair=null; savePair(); codeBox.textContent='------'; meta.textContent='Start the phone server before generating a code';
    if(qrBox) qrBox.hidden=true; if(qrImg) qrImg.removeAttribute('src'); return;
  }
  if(!activePair||Date.now()>activePair.expires){
    activePair=null; savePair(); codeBox.textContent='------'; meta.textContent='No active code';
    if(qrBox) qrBox.hidden=true; if(qrImg) qrImg.removeAttribute('src'); return;
  }
  const seconds=Math.max(0,Math.floor((activePair.expires-Date.now())/1000));
  const pairLink=getPhonePairLink(activePair.code);
  codeBox.textContent=activePair.code;
  meta.innerHTML=`Expires in ${seconds}s · scan QR, then enter this code · <button class="text-link" type="button" id="copyPairLink">Copy pairing page</button>`;
  if(qrBox&&qrImg){
    qrBox.hidden=false;
    qrImg.src='https://api.qrserver.com/v1/create-qr-code/?size=190x190&margin=12&data='+encodeURIComponent(pairLink);
    qrBox.title=pairLink;
  }
  const copyBtn=$('#copyPairLink');
  if(copyBtn) copyBtn.onclick=async()=>{ const ok=await copyTextToClipboard(pairLink); toast(ok?'Pairing page copied':'Copy failed — long press the QR/link'); };
}

async function generatePhoneCode(){if(!phoneServerState.running){toast('Start the phone server first'); return;} activePair={code:String(Math.floor(100000+Math.random()*900000)),expires:Date.now()+120000}; savePair(); try{const r=await fetch('/api/pair/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(activePair)}); const out=await r.json().catch(()=>({})); if(!r.ok||!out.ok){activePair=null; savePair(); if(r.status===423){phoneServerState={...phoneServerState,running:false,url:'',startedAt:null}; savePhoneServerState();} renderPhoneServer(); renderPairCode(); toast(out.error||'Start the phone server first'); return;} if(out&&out.code){activePair.code=out.code; activePair.expires=out.expires||activePair.expires; savePair();}}catch(e){activePair=null; savePair(); renderPairCode(); toast('Could not create phone code'); return;} renderPairCode(); toast('Pairing code generated');}
function render(){applyTheme(); const today=todayISO(); const todayTraffic=data.traffic.filter(r=>r.date===today); const totalPassengers=todayTraffic.reduce((a,r)=>a+(Number(r.passengers)||0),0); const dailyVessels=new Set(todayTraffic.map(r=>(r.vessel||r.canal||'').trim()).filter(Boolean)).size; setText('#statRecords',todayTraffic.length); setText('#statPassengers',totalPassengers.toLocaleString()); setText('#statLockages',todayTraffic.length); setText('#statRegistered',dailyVessels); setText('#todayLabel',new Date().toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})); setHTML('#recentTable',trafficRows([...data.traffic].slice(-6).reverse(),true)); setHTML('#trafficTable',trafficRows(data.traffic,true)); setHTML('#registryTable',registryRows(data.registry)); setHTML('#phoneTable',phoneRows()); setHTML('#phoneEventLog', phoneEventRows()); setHTML('#vesselList',data.registry.map(r=>`<option value="${r.vessel}"></option>`).join('')); setHTML('#countryOptions',(data.countries||[]).map(c=>`<option value="${htmlEscape(c.country||c)}"></option>`).join('')); setHTML('#stateOptions',(data.states||[]).map(st=>`<option value="${htmlEscape(st.stateProv||st)}"></option>`).join('')); renderPairCode(); renderPhoneServer(); renderChart(); renderReport(); runSearch(); renderEntryPresets();}
function bindEvents(){applyTheme(); document.addEventListener('click',e=>{const btn=e.target.closest('[data-entry-action]'); if(!btn) return; const action=btn.dataset.entryAction; if(action==='edit') openEntryEditor(btn.dataset.entryId); if(action==='delete') deleteTrafficById(btn.dataset.entryId); if(action==='close-edit') closeEntryEditor();}); if($('#trafficDate')) $('#trafficDate').value=todayISO(); if($('#trafficTime')) $('#trafficTime').value=nowTime(); if($('#reportDate')) $('#reportDate').value=todayISO(); if($('#reportMonth')) $('#reportMonth').value=todayISO().slice(0,7); if($('#startDate')) $('#startDate').value=todayISO().slice(0,8)+'01'; if($('#endDate')) $('#endDate').value=todayISO(); setupEntryTypeChooser(); const q=new URLSearchParams(window.location.search).get('q'); if(q&&$('#globalSearch')) $('#globalSearch').value=q; $('#globalSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'){const v=e.target.value.trim(); if(!$('#searchTable') && v) location.href='search.html?q='+encodeURIComponent(v);}}); $('#syncTime')?.addEventListener('click',()=>{if($('#trafficDate')) $('#trafficDate').value=todayISO(); if($('#trafficTime')) $('#trafficTime').value=nowTime(); toast('Time updated');}); $('#trafficVessel')?.addEventListener('change',fillFromRegistry); $('#trafficCanalReg')?.addEventListener('change',fillFromRegistry); $('#trafficForm')?.addEventListener('submit',async e=>{e.preventDefault(); const row={id:'desktop_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),date:$('#trafficDate').value,canal:$('#trafficCanalReg').value,vessel:$('#trafficVessel').value.toUpperCase(),vesselReg:$('#trafficVesselReg').value,type:$('#trafficType').value,direction:$('#trafficDirection').value,reverse:$('#trafficReverse').value,time:$('#trafficTime').value,passengers:Number($('#trafficPassengers').value)||0,destination:$('#trafficDestination').value.toUpperCase(),homePort:$('#trafficHomePort').value,status:'Pending',completed:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),source:'Desktop Dashboard'}; try{const res=await fetch('/api/dashboard/entry/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:row.id,entry:row})}); const out=await res.json().catch(()=>({})); if(!res.ok||!out.ok) throw new Error(out.error||'Save failed'); if(Array.isArray(out.traffic)) data.traffic=out.traffic; else data.traffic.push(out.entry||row); persistLocal(); e.target.reset(); $('#trafficDate').value=todayISO(); $('#trafficTime').value=nowTime(); $('#trafficPassengers').value=0; reapplySelectedEntryType(); render(); toast('Traffic record added'); setTimeout(()=>{window.location.href='daily.html';},450);}catch(err){console.error(err); toast('Save failed — check server console');}}); $('#registrationForm')?.addEventListener('submit',e=>{e.preventDefault(); data.registry.push({canal:$('#regCanal').value,owner:$('#regOwner').value,vessel:$('#regVessel').value.toUpperCase(),length:$('#regLength').value,regType:$('#regType').value,vesselReg:$('#regNumber').value,type:$('#regVesselType').value,city:$('#regCity').value,country:$('#regCountry').value,state:$('#regState').value,address:$('#regAddress').value}); save(); e.target.reset(); render(); toast('Registration saved');}); ['searchDate','searchCanal','searchVessel','searchType','searchDestination','searchHomePort','globalSearch'].forEach(id=>$('#'+id)?.addEventListener('input',runSearch)); $('#runSearch')?.addEventListener('click',runSearch); $('#clearSearch')?.addEventListener('click',()=>{$$('#search input').forEach(i=>i.value=''); runSearch();}); $$('.tab').forEach(t=>t.addEventListener('click',()=>switchReport(t.dataset.report))); ['reportDate','reportMonth','startDate','endDate'].forEach(id=>$('#'+id)?.addEventListener('input',renderReport)); $('#printCurrentReport')?.addEventListener('click',()=>printReport()); $('#printDailyReport')?.addEventListener('click',()=>printReport('dailyReport')); $('#printMonthlyReport')?.addEventListener('click',()=>printReport('monthlyReport')); $('#exportData')?.addEventListener('click',exportData); $('#easyExport')?.addEventListener('click',exportData); $('#resetData')?.addEventListener('click',()=>{if(confirm('Reset all demo data?')){data=JSON.parse(JSON.stringify(demo)); data.phones=[]; activePair=null; savePair(); save(); render(); toast('Demo data reset');}}); $('#generatePairCode')?.addEventListener('click',generatePhoneCode); $('#cancelPairCode')?.addEventListener('click',async()=>{activePair=null; savePair(); try{await fetch('/api/pair/cancel',{method:'POST'});}catch(e){} renderPairCode(); toast('Pairing link cancelled');}); $('#startPhoneServer')?.addEventListener('click',startPhoneServer); $('#stopPhoneServer')?.addEventListener('click',stopPhoneServer); refreshPhoneServerStatus(); pullSharedPresets(); pullServerData(); setInterval(()=>{pullSharedPresets(); pullServerData();},5000); $('#darkModeToggle')?.addEventListener('change',e=>{localStorage.setItem(themeKey,String(e.target.checked)); applyTheme(); toast(e.target.checked?'Dark Mode enabled':'Light Mode enabled');}); $('#presetForm')?.addEventListener('submit',e=>{e.preventDefault(); const preset=readPresetForm(); const originalType=$('#presetOriginalType')?.value; const originalName=$('#presetOriginalName')?.value; if(!preset.name){toast('Add a vessel name'); return;} saveEntryPreset(preset.type,preset.name,preset.canalReg,originalType,originalName,preset); e.target.reset(); clearPresetEditState(); renderEntryPresets(); toast(originalName?'Preset updated successfully':'Preset added successfully'); setTimeout(()=>{location.href='management.html';},350);}); $('#resetPresets')?.addEventListener('click',()=>{vesselPresetGroups=cloneDefaultVesselPresets(); saveEntryPresets(); clearPresetEditState(); renderEntryPresets(); toast('Vessel presets reset');}); $('#presetCancelEdit')?.addEventListener('click',()=>{clearPresetEditState(); $('#presetForm')?.reset(); toast('Edit cancelled');}); ['presetSearch','presetFilter'].forEach(id=>$('#'+id)?.addEventListener('input',renderEntryPresets)); $('#presetFilter')?.addEventListener('change',renderEntryPresets); setInterval(()=>{setText('#clock',new Date().toLocaleTimeString()); renderPairCode();},1000);}
/* Mobile app form options + save logic ported into the dashboard New Entry page */
const defaultEntryPresets = {
  "Nokomis":"0531","Le Voyageur":"0533","Holiday":"0507","Hiawatha":"0510","Bide-A-Wee":"0530","Miss Marie":"0525","Parks Canada":"0560","Purvis":"0511","Allure":"1076","Anushka Police Service":"0650","OPP":"0540","RCMP":"0667","City Police":"0567","Canadian Coast Guard":"1198","American Coast Guard":"0665","US Border Patrol":"1225","MNR - Northern Vigil":"0562","Beauty and the Beast":"0762","Chillin Out":"1214"
};
const defaultPresetDetails = {
  "Holiday":{owner:"A&C Lock Tours",regType:"Commercial",vesselReg:"43E19740",vesselType:"TB",city:"Sault Ste. Marie",country:"USA",state:"MI",address:"1157 E. Portage Ave."},
  "Takes Two":{owner:"A&C Lock Tours",regType:"Commercial",vesselReg:"86E13097",vesselType:"TB",city:"Sault Ste. Marie",country:"USA",state:"MI",address:"1157 E. Portage Ave."},
  "Bide-A-Wee":{owner:"A&C Lock Tours",regType:"Commercial",vesselReg:"43E444",vesselType:"TB",city:"Sault Ste. Marie",country:"USA",state:"MI",address:"1157 E. Portage Ave."},
  "Nokomis":{owner:"A&C Lock Tours",regType:"Commercial",vesselType:"TB",city:"Sault Ste. Marie",country:"USA",state:"MI",address:"1157 E. Portage Ave."},
  "Le Voyageur":{owner:"A&C Lock Tours",regType:"Commercial",vesselType:"TB",city:"Sault Ste. Marie",country:"USA",state:"MI",address:"1157 E. Portage Ave."},
  "Hiawatha":{owner:"A&C Lock Tours",regType:"Commercial",vesselType:"TB",city:"Sault Ste. Marie",country:"USA",state:"MI",address:"1157 E. Portage Ave."},
  "Miss Marie":{owner:"Sheila Purvis",regType:"Commercial",vesselType:"TB",city:"Sault Ste. Marie",country:"CAN",state:"ON"},
  "Purvis":{owner:"Purvis",regType:"Commercial",vesselReg:"43E22316",vesselType:"C",city:"Sault Ste. Marie",country:"CAN",state:"ON",address:"1 Pim Street",postalCode:"P6A 3G3"},
  "City Police":{owner:"City Police",regType:"Government",vesselReg:"ON445696",vesselType:"Gov",city:"Sault Ste. Marie",country:"CAN",state:"ON"},
  "OPP":{owner:"OPP",regType:"Government",vesselReg:"50E12387",vesselType:"Gov",city:"Sault Ste. Marie",country:"CAN",state:"ON"},
  "RCMP":{owner:"RCMP",regType:"Government",vesselType:"Gov",city:"Sault Ste. Marie",country:"CAN",state:"ON"},
  "Canadian Coast Guard":{owner:"Canadian Coast Guard",regType:"Government",vesselType:"Gov",city:"Sault Ste. Marie",country:"CAN",state:"ON"},
  "American Coast Guard":{owner:"U.S. Coast Guard",regType:"Government",vesselType:"Gov",city:"Sault Ste. Marie",country:"USA",state:"MI"},
  "US Border Patrol":{owner:"U.S. Border Patrol",regType:"Government",vesselType:"Gov",country:"USA"},
  "Parks Canada":{owner:"Parks Canada",regType:"Government",vesselType:"Gov",country:"CAN"}
};
const presetKey = 'ssmCanalDashboard.entryPresets.byType';
const oldPresetKey = 'ssmCanalDashboard.entryPresets';
const presetDeletedKey = 'ssmCanalDashboard.entryPresets.deleted';
let presetSyncBusyUntil = 0;
function presetTextKey(value){return String(value||'').replace(/&amp;/g,'&').replace(/&quot;/g,'\"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim().toUpperCase();}
function normalizePresetTypeKey(type){const raw=String(type||'').replace(/\s+/g,' ').trim(); const lower=raw.toLowerCase(); if(raw==='G'||lower==='gov'||lower==='government'||lower==='government boat') return 'Gov'; if(raw==='C'||lower==='com'||lower==='commercial'||lower==='commercial boat') return 'Com'; if(raw==='K'||lower==='k'||lower==='kayak'||lower==='kayak entry') return 'K'; if(raw==='RB'||lower==='rb'||lower==='recreational'||lower==='recreational boat') return 'RB'; if(raw==='TB'||lower==='tb'||lower==='tour'||lower==='tour boat') return 'TB'; return ['RB','TB','Gov','Com','K'].includes(raw)?raw:'';}
function readDeletedPresetMarks(){const list=dashSafeParse(localStorage.getItem(presetDeletedKey), []); return Array.isArray(list)?list.filter(x=>x&&x.nameKey):[];}
function writeDeletedPresetMarks(list){try{localStorage.setItem(presetDeletedKey, JSON.stringify((list||[]).filter(x=>x&&x.nameKey).slice(-1000)));}catch(e){}}
function markPresetDeleted(type,name){const clean=String(name||'').replace(/\s+/g,' ').trim(); const typeKey=normalizePresetTypeKey(type); const nameKey=presetTextKey(clean); if(!nameKey) return; const list=readDeletedPresetMarks().filter(x=>!(x.nameKey===nameKey && (!typeKey || !x.type || x.type===typeKey))); list.push({type:typeKey,name:clean,nameKey,deletedAt:Date.now()}); writeDeletedPresetMarks(list);}
function clearPresetDeletedMark(type,name){const typeKey=normalizePresetTypeKey(type); const nameKey=presetTextKey(name); if(!nameKey) return; writeDeletedPresetMarks(readDeletedPresetMarks().filter(x=>!(x.nameKey===nameKey && (!typeKey || !x.type || x.type===typeKey))));}
function presetIsDeleted(type,name){const typeKey=normalizePresetTypeKey(type); const nameKey=presetTextKey(name); if(!nameKey) return false; return readDeletedPresetMarks().some(x=>x.nameKey===nameKey && (!x.type || !typeKey || x.type===typeKey));}
function applyDeletedPresetTombstones(groups){const out={RB:[...((groups&&groups.RB)||[])],TB:[...((groups&&groups.TB)||[])],Gov:[...((groups&&groups.Gov)||[])],Com:[...((groups&&groups.Com)||[])],K:[...((groups&&groups.K)||[])]}; const marks=readDeletedPresetMarks(); if(!marks.length) return out; Object.keys(out).forEach(type=>{out[type]=out[type].filter(p=>!marks.some(m=>m.nameKey===presetTextKey(p&& (p.name||p.vessel)) && (!m.type || m.type===type)));}); return out;}
function removePresetFromGroups(type,name){const typeKey=normalizePresetTypeKey(type); const nameKey=presetTextKey(name); if(!nameKey) return; ['RB','TB','Gov','Com','K'].forEach(t=>{if(!typeKey || t===typeKey){vesselPresetGroups[t]=getVesselPresets(t).filter(p=>presetTextKey(p&& (p.name||p.vessel))!==nameKey);}});}
const presetTypeLabels = {RB:'Recreational Boat',TB:'Tour Boat',Gov:'Government Boat',Com:'Commercial Boat',K:'Kayak'};
function presetObj(name, reg='', extra={}){
  const details = defaultPresetDetails[name] || {};
  return {
    name,
    reg: reg || extra.reg || extra.canalReg || '',
    canalReg: extra.canalReg || reg || '',
    owner: extra.owner || details.owner || '',
    length: extra.length || '',
    regType: extra.regType || details.regType || '',
    vesselReg: extra.vesselReg || details.vesselReg || '',
    vesselType: extra.vesselType || details.vesselType || '',
    address: extra.address || details.address || '',
    city: extra.city || details.city || '',
    country: extra.country || details.country || '',
    state: extra.state || details.state || '',
    postalCode: extra.postalCode || extra.postal || ''
  };
}
function presetsFromNames(names){return names.map(name=>presetObj(name, defaultEntryPresets[name]||''));}
function cloneDefaultVesselPresets(){
  return {
    RB: [],
    TB: presetsFromNames(["Nokomis","Le Voyageur","Holiday","Hiawatha","Bide-A-Wee","Miss Marie","Parks Canada"]),
    Gov: presetsFromNames(["Anushka Police Service","OPP","RCMP","City Police","Canadian Coast Guard","American Coast Guard","US Border Patrol","MNR - Northern Vigil"]),
    Com: presetsFromNames(["Purvis","Allure","Beauty and the Beast","Chillin Out"]),
    K: [presetObj("Birds Eye Tours", "K", {canalReg:"K", regType:"Kayak", vesselType:"K", owner:"Birds Eye Tours"})]
  };
}
function normalizePresetItem(item){
  if(typeof item === 'string') return presetObj(item, defaultEntryPresets[item]||'');
  const name = item.name || item.vessel || '';
  return presetObj(name, item.reg || item.canalReg || item.canal || item.registration || '', {
    canalReg:item.canalReg || item.canal || item.reg || '',
    owner:item.owner || '', length:item.length || '', regType:item.regType || '', vesselReg:item.vesselReg || item.registration || '',
    vesselType:item.vesselType || item.type || '', address:item.address || '', city:item.city || '', country:item.country || '', state:item.state || '', postalCode:item.postalCode || item.postal || ''
  });
}
function normalizeVesselPresets(raw){
  const fallback = cloneDefaultVesselPresets();
  if(!raw || typeof raw !== 'object') return fallback;
  const looksGrouped = ['RB','TB','Gov','Com','K'].some(k=>Array.isArray(raw[k]));
  if(!looksGrouped){
    const names = Object.keys(raw);
    if(!names.length) return fallback;
    const migrated = names.map(name=>presetObj(name, raw[name]||defaultEntryPresets[name]||''));
    return {RB:[],TB:[...migrated],Gov:[...migrated],Com:[...migrated],K:[]};
  }
  const out = {RB:[],TB:[],Gov:[],Com:[],K:[]};
  Object.keys(out).forEach(type=>{ out[type] = (raw[type]||[]).map(normalizePresetItem).filter(item=>item.name); });
  if(!out.K.length && !presetIsDeleted('K','Birds Eye Tours')) out.K.push(presetObj("Birds Eye Tours", "K", {canalReg:"K", regType:"Kayak", vesselType:"K", owner:"Birds Eye Tours"}));
  return out;
}
let vesselPresetGroups = applyDeletedPresetTombstones(normalizeVesselPresets(dashSafeParse(localStorage.getItem(presetKey), null) || dashSafeParse(localStorage.getItem(oldPresetKey), null)));
async function pullSharedPresets(){
  if(Date.now() < presetSyncBusyUntil) return;
  try{const res=await fetch('/api/presets',{cache:'no-store'}); if(!res.ok) return; const out=await res.json(); if(out&&out.entryPresets){vesselPresetGroups=applyDeletedPresetTombstones(normalizeVesselPresets(out.entryPresets)); safeLocalSet(presetKey,JSON.stringify(vesselPresetGroups)); data.entryPresets=vesselPresetGroups; renderEntryPresets(); refreshDashboardPresetDropdowns();}}catch(e){}
}
function saveEntryPresets(options={}){
  vesselPresetGroups=applyDeletedPresetTombstones(normalizeVesselPresets(vesselPresetGroups));
  safeLocalSet(presetKey, JSON.stringify(vesselPresetGroups));
  data.entryPresets=vesselPresetGroups;
  const payload={entryPresets:vesselPresetGroups,replace:true,action:'replace',deletedPresets:readDeletedPresetMarks()};
  try{fetch('/api/presets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json()).then(out=>{if(out&&out.entryPresets){vesselPresetGroups=applyDeletedPresetTombstones(normalizeVesselPresets(out.entryPresets));safeLocalSet(presetKey,JSON.stringify(vesselPresetGroups));data.entryPresets=vesselPresetGroups;if(!options.quiet) render();refreshDashboardPresetDropdowns();}}).catch(()=>{});}catch(e){}
}
function getVesselPresets(type){return vesselPresetGroups[type] || [];}
function findEntryPreset(type,name){
  const exact = getVesselPresets(type).find(p=>p.name===name);
  if(exact) return exact;
  return Object.values(vesselPresetGroups).flat().find(p=>p.name===name) || null;
}
function refreshDashboardPresetDropdowns(){
  const kind = selectedEntryType || ($('#trafficType')?.value || '');
  const vessel = dashField('vessel') || $('#trafficVessel');
  if(!vessel || !kind) return;
  const presets = getVesselPresets(kind);
  if(!presets.length) return;
  const current = vessel.value;
  if(vessel.tagName === 'SELECT'){
    vessel.innerHTML = '<option value="">Select Vessel</option>' + presets.map(p=>`<option value="${htmlEscape(p.name)}" data-reg="${htmlEscape(p.canalReg||p.reg||p.canal||p.vesselReg||'')}">${htmlEscape(p.name)}</option>`).join('') + '<option data-manual="true" value="Other">Other</option>';
    if(current && [...vessel.options].some(o=>o.value===current)) vessel.value=current;
  }else{
    // Do not use native datalist here. Chrome renders it as an unstyled black popup.
    // The custom dropdown below reads directly from vesselPresetGroups instead.
    vessel.removeAttribute('list');
    vessel.setAttribute('autocomplete','off');
  }
}
function readPresetForm(){
  return {
    type: $('#presetType')?.value || 'TB',
    name: $('#presetVessel')?.value.trim() || '',
    reg: $('#presetCanalReg')?.value.trim() || $('#presetReg')?.value.trim() || '',
    canalReg: $('#presetCanalReg')?.value.trim() || $('#presetReg')?.value.trim() || '',
    owner: $('#presetOwner')?.value.trim() || '',
    homePort: $('#presetHomePort')?.value.trim() || '',
    length: $('#presetLength')?.value.trim() || '',
    regType: $('#presetRegType')?.value.trim() || '',
    vesselReg: $('#presetVesselReg')?.value.trim() || '',
    vesselType: $('#presetVesselType')?.value.trim() || '',
    address: $('#presetAddress')?.value.trim() || '',
    city: $('#presetCity')?.value.trim() || '',
    country: $('#presetCountry')?.value.trim() || '',
    state: $('#presetState')?.value.trim() || '',
    postalCode: $('#presetPostalCode')?.value.trim() || ''
  };
}
function saveEntryPreset(type,name,reg,originalType,originalName,extra={}){
  type=normalizePresetTypeKey(type) || type;
  clearPresetDeletedMark(type,name);
  if(originalName){
    clearPresetDeletedMark(originalType||type, originalName);
    const oldType = originalType || type;
    vesselPresetGroups[oldType] = getVesselPresets(oldType).filter(p=>p.name !== originalName);
  }
  vesselPresetGroups[type] = getVesselPresets(type).filter(p=>p.name !== name);
  vesselPresetGroups[type].push(presetObj(name, reg||extra.canalReg||'', extra));
  vesselPresetGroups[type].sort((a,b)=>a.name.localeCompare(b.name));
  saveEntryPresets();
}
function htmlEscape(value){return String(value ?? '').replace(/[&<>'"]/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
function filteredPresetEntries(){
  const filter=$('#presetFilter')?.value || 'all';
  const search=($('#presetSearch')?.value || '').trim().toLowerCase();
  const entries=[];
  ['RB','TB','Gov','Com','K'].forEach(type=>{
    if(filter !== 'all' && filter !== type) return;
    getVesselPresets(type).forEach(p=>{
      const haystack = `${presetTypeLabels[type]} ${p.name} ${p.reg||''} ${p.canalReg||''} ${p.owner||''} ${p.vesselReg||''} ${p.city||''} ${p.state||''} ${p.country||''}`.toLowerCase();
      if(search && !haystack.includes(search)) return;
      entries.push({type,p});
    });
  });
  return entries;
}
function presetRows(){
  const rows=filteredPresetEntries().map(({type,p})=>{
    const loc = [p.city,p.state,p.country].filter(Boolean).join(', ') || '-';
    const len = p.length || '-';
    return `<tr>
      <td><span class="badge type-badge">${presetTypeLabels[type]}</span></td>
      <td>${htmlEscape(p.canalReg||p.reg||'-')}</td>
      <td class="vessel-cell"><strong>${htmlEscape(p.name)}</strong><small>${htmlEscape(p.vesselType||type)}</small></td>
      <td>${htmlEscape(p.owner||'-')}</td>
      <td>${htmlEscape(p.vesselReg||'-')}</td>
      <td>${htmlEscape(p.regType||'-')}</td>
      <td>${htmlEscape(len)}</td>
      <td>${htmlEscape(loc)}</td>
      <td class="preset-row-actions"><button class="btn preset-edit-btn" type="button" data-type="${type}" data-name="${htmlEscape(p.name)}">Edit</button><button class="btn danger preset-delete-btn" type="button" data-type="${type}" data-name="${htmlEscape(p.name)}">Delete</button></td>
    </tr>`;
  });
  return '<thead><tr><th>Type</th><th>Canal Reg #</th><th>Vessel</th><th>Owner</th><th>Vessel Reg #</th><th>Reg Type</th><th>Length</th><th>Location</th><th>Actions</th></tr></thead><tbody>'+(rows.join('')||'<tr><td colspan="9" class="empty-row">No vessel presets found.</td></tr>')+'</tbody>';
}
function presetGroupCards(){
  const filter=$('#presetFilter')?.value || 'all';
  const search=($('#presetSearch')?.value || '').trim().toLowerCase();
  const groups=['RB','TB','Gov','Com','K'].filter(type=>filter==='all'||filter===type).map(type=>{
    const cards=getVesselPresets(type).filter(p=>{
      const haystack=`${presetTypeLabels[type]} ${p.name} ${p.reg||''} ${p.canalReg||''} ${p.owner||''} ${p.vesselReg||''} ${p.city||''} ${p.state||''} ${p.country||''}`.toLowerCase();
      return !search || haystack.includes(search);
    }).map(p=>`<article class="preset-vessel-card">
      <div class="preset-card-top"><span class="badge">${presetTypeLabels[type]}</span><strong>${htmlEscape(p.name)}</strong></div>
      <div class="preset-card-details">
        <span><b>Canal Reg</b>${htmlEscape(p.canalReg||p.reg||'-')}</span>
        <span><b>Owner</b>${htmlEscape(p.owner||'-')}</span>
        <span><b>Vessel Reg</b>${htmlEscape(p.vesselReg||'-')}</span>
        <span><b>Location</b>${htmlEscape([p.city,p.state,p.country].filter(Boolean).join(', ')||'-')}</span>
      </div>
      <div class="preset-card-actions">
        <button class="btn preset-edit-btn" type="button" data-type="${type}" data-name="${htmlEscape(p.name)}">Edit</button>
        <button class="btn danger preset-delete-btn" type="button" data-type="${type}" data-name="${htmlEscape(p.name)}">Remove</button>
      </div>
    </article>`).join('');
    return `<section class="preset-group-card"><div class="preset-group-head"><div><h2>${presetTypeLabels[type]}</h2><p>${getVesselPresets(type).length} saved presets</p></div><a class="btn" href="management-edit.html?type=${encodeURIComponent(type)}">Add ${presetTypeLabels[type]}</a></div><div class="preset-card-grid">${cards||'<div class="empty-presets">No presets in this group yet.</div>'}</div></section>`;
  });
  return groups.join('') || '<div class="empty-presets large">No vessel presets found.</div>';
}
function renderEntryPresets(){
  if($('#presetGroups')) setHTML('#presetGroups', presetGroupCards());
  if($('#presetTable')) setHTML('#presetTable', presetRows());
  $$('.preset-edit-btn').forEach(btn=>btn.addEventListener('click',()=>editEntryPreset(btn.dataset.type, btn.dataset.name)));
  $$('.preset-delete-btn').forEach(btn=>btn.addEventListener('click',()=>deleteEntryPreset(btn.dataset.type, btn.dataset.name)));
}
function clearPresetEditState(){
  if($('#presetOriginalType')) $('#presetOriginalType').value='';
  if($('#presetOriginalName')) $('#presetOriginalName').value='';
  const btn=$('#presetSubmitBtn'); if(btn) btn.textContent='Add Vessel Preset';
  const cancel=$('#presetCancelEdit'); if(cancel) cancel.hidden=true;
}
function setFieldValue(id,value){const el=$('#'+id); if(el) el.value=value||'';}
function populatePresetForm(type,preset){
  setFieldValue('presetType',type); setFieldValue('presetVessel',preset?.name || ''); setFieldValue('presetCanalReg',preset?.canalReg||preset?.reg||''); setFieldValue('presetReg',preset?.canalReg||preset?.reg||'');
  setFieldValue('presetOwner',preset?.owner); setFieldValue('presetHomePort',preset?.homePort || preset?.homeport || preset?.port || ''); setFieldValue('presetLength',preset?.length); setFieldValue('presetRegType',preset?.regType); setFieldValue('presetVesselReg',preset?.vesselReg); setFieldValue('presetVesselType',preset?.vesselType || type);
  setFieldValue('presetAddress',preset?.address); setFieldValue('presetCity',preset?.city); setFieldValue('presetCountry',preset?.country); setFieldValue('presetState',preset?.state); setFieldValue('presetPostalCode',preset?.postalCode);
}
function editEntryPreset(type,name){
  location.href = `management-edit.html?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`;
}
function initPresetEditPage(){
  if(!$('#presetForm')) return;
  const params=new URLSearchParams(location.search);
  const type=params.get('type') || 'TB';
  const name=params.get('name') || '';
  setFieldValue('presetType', type);
  if(!name){
    setFieldValue('presetVesselType', type);
    const title=$('#presetEditTitle'); if(title) title.textContent='Add Vessel Preset';
    const btn=$('#presetSubmitBtn'); if(btn) btn.textContent='Add Vessel Preset';
    return;
  }
  const preset=findEntryPreset(type,name);
  if(!preset) return;
  populatePresetForm(type,preset);
  if($('#presetOriginalType')) $('#presetOriginalType').value=type;
  if($('#presetOriginalName')) $('#presetOriginalName').value=preset.name;
  const title=$('#presetEditTitle'); if(title) title.textContent=`Edit ${preset.name}`;
  const sub=$('#presetEditSubtitle'); if(sub) sub.textContent='Update this vessel preset. Changes will appear in New Entry after saving.';
  const btn=$('#presetSubmitBtn'); if(btn) btn.textContent='Save Changes';
}
async function deleteEntryPreset(type,name){
  type=normalizePresetTypeKey(type);
  name=String(name||'').replace(/\s+/g,' ').trim();
  if(!type || !name){toast('Could not find that preset'); return;}
  if(!confirm(`Remove ${name} from ${presetTypeLabels[type]||type} presets?`)) return;

  presetSyncBusyUntil = Date.now() + 12000;
  markPresetDeleted(type,name);
  removePresetFromGroups(type,name);
  saveEntryPresets({quiet:true});
  clearPresetEditState();
  $('#presetForm')?.reset();
  renderEntryPresets();
  toast('Preset deleted');

  try{
    const res=await fetch('/api/presets/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,name,deletedPresets:readDeletedPresetMarks()})});
    const out=await res.json().catch(()=>({}));
    if(!res.ok || !out.ok) throw new Error(out.error||'Delete failed');
    if(out.entryPresets){
      vesselPresetGroups=applyDeletedPresetTombstones(normalizeVesselPresets(out.entryPresets));
      safeLocalSet(presetKey, JSON.stringify(vesselPresetGroups));
      data.entryPresets=vesselPresetGroups;
      renderEntryPresets();
      refreshDashboardPresetDropdowns();
    }
  }catch(e){
    saveEntryPresets({quiet:true});
  }finally{
    presetSyncBusyUntil = Date.now() + 2500;
  }
}
function syncPresetsFromRegistry(){
  data.registry.forEach(r=>{
    if(!(r.vessel||'').trim()) return;
    const type = presetTypeLabels[r.type] ? r.type : (r.type==='Gov'?'Gov':(r.type==='Com'?'Com':(r.type==='RB'?'RB':'TB')));
    saveEntryPreset(type, r.vessel.trim(), r.canal || '', '', '', {canalReg:r.canal||'', owner:r.owner||'', length:r.length||'', regType:r.regType||'', vesselReg:r.vesselReg||'', vesselType:r.type||type, address:r.address||'', city:r.city||'', country:r.country||'', state:r.state||'', homePort:r.homePort||[r.city,r.state,r.country].filter(Boolean).join(', ')});
  });
  renderEntryPresets(); toast('Vessel presets updated from registry');
}

const oldDbPresetImportKey = 'ssmCanalDashboard.oldDbPresetImport.v2';
function importOldDbPresetsOnce(){
  const source = window.OLD_DB_DATA;
  if(!source || localStorage.getItem(oldDbPresetImportKey)==='true') return;

  const imported=applyDeletedPresetTombstones(normalizeVesselPresets(vesselPresetGroups));
  (source.registry||[]).forEach(r=>{
    if(!r.vessel) return;
    const rawType = r.type || r.vesselType || '';
    const type = rawType === 'G' ? 'Gov' : rawType === 'C' ? 'Com' : rawType;
    if(!['RB','TB','Gov','Com','K'].includes(type)) return;
    if(presetIsDeleted(type,r.vessel)) return;
    const nameKey=presetTextKey(r.vessel);
    imported[type]=imported[type].filter(p=>presetTextKey(p&&p.name)!==nameKey);
    imported[type].push(presetObj(r.vessel, r.canal || '', {
      canalReg:r.canal||'', owner:r.owner||'', length:r.length||'', regType:r.regType||'', vesselReg:r.vesselReg||'', vesselType:r.vesselType||type,
      address:r.address||'', city:r.city||'', country:r.country||'', state:r.state||'', postalCode:r.postalCode||'', homePort:r.homePort||[r.city,r.state,r.country].filter(Boolean).join(', ')
    }));
  });
  ['RB','TB','Gov','Com','K'].forEach(type=>imported[type].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))));
  vesselPresetGroups=applyDeletedPresetTombstones(imported);
  safeLocalSet(presetKey, JSON.stringify(vesselPresetGroups));
  data.entryPresets=vesselPresetGroups;
  saveEntryPresets({quiet:true});
  localStorage.setItem(oldDbPresetImportKey,'true');
}
const mobileLogsKey = 'saultLocksLogs';
const entryTypeNameMap = {RB:'Recreational Boat',TB:'Tour Boat',Gov:'Government Boat',Com:'Commercial Boat',K:'Kayak',LR:'Lock Reversal',LT:'Lock Test'};
function dashSafeParse(value,fallback){try{return JSON.parse(value) ?? fallback;}catch(e){return fallback;}}
function dashPad(v){return String(v).padStart(2,'0');}
function dashCurrentDate(){return new Date().toISOString().slice(0,10);}
function dashCurrentTime(){const n=new Date();return `${dashPad(n.getHours())}:${dashPad(n.getMinutes())}`;}
function dashDisplayTime(){return new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false});}
function dashField(id){return document.getElementById(id);}
function dashValue(id){return dashField(id)?.value?.trim() || '';}
function dashOptions(items, withOther=true){return items.map(x=>`<option>${x}</option>`).join('')+(withOther?'<option data-manual="true" value="Other">Other</option>':'');}
function dashboardNormalFormHTML(kind){
  const isRec = kind === 'RB';
  const isKayak = kind === 'K';
  const textStyleFields = isRec || isKayak;
  const vesselLabel = isKayak ? 'Name / Company' : 'Vessel Name';
  const vesselInput = `<div class="custom-preset-combo" id="customPresetCombo"><input id="vessel" type="text" placeholder="Search or select ${entryTypeNameMap[kind] || 'vessel'}..." autocomplete="off"><button class="custom-preset-toggle" id="customPresetToggle" type="button" aria-label="Open vessel presets">▾</button><div class="custom-preset-menu" id="customPresetMenu"></div></div>`;
  const dir = textStyleFields ? `<select id="dir" class="placeholder"><option value="">Select Direction</option>${dashOptions(['Up','Down'],false)}</select>` : `<select id="dir" class="placeholder"><option value="">Select Direction</option>${dashOptions(['Up','Down'],true)}</select><input id="dirManual" class="manual-input" type="text" placeholder="Type direction">`;
  const dest = textStyleFields ? `<input id="dest" type="text" placeholder="Destination">` : `<select id="dest" class="placeholder"><option value="">Select Destination</option>${dashOptions(['USM','LSM','Soo','Mid Canal'],true)}</select><input id="destManual" class="manual-input" type="text" placeholder="Type destination">`;
  const home = textStyleFields ? `<input id="homePort" type="text" placeholder="Home port">` : `<select id="homePort" class="placeholder"><option value="">Select Home Port</option>${dashOptions(['Sault Michigan','Sault Canada'],true)}</select><input id="homePortManual" class="manual-input" type="text" placeholder="Type home port">`;
  const kayakCount = isKayak ? `<div class="field"><label>Number of Kayaks</label><input id="kayakCount" type="text" inputmode="numeric" placeholder="Number of Kayaks"></div>` : '';
  return `<div class="form-grid mobile-options-grid ${isKayak ? 'kayak-options-grid' : ''}">
    <div class="field full"><label>${vesselLabel}</label>${vesselInput}</div>
    <div class="field"><label>Registration</label><input id="reg" value="${isKayak ? 'K' : ''}" placeholder="Enter Registration"></div>
    <div class="field"><label>Canal</label><input id="canal" value="Sault Canada Locks" readonly></div>
    <div class="field"><label>Direction</label>${dir}</div>
    <div class="field"><label>Passenger Count</label><input id="pass" type="text" placeholder="Passenger Count"></div>
    ${kayakCount}
    <div class="field"><label>Destination</label>${dest}</div>
    <div class="field"><label>Home Port</label>${home}</div>
    <div class="field"><label>Time</label><input id="entryTime" type="time" value="${dashCurrentTime()}"></div>
    <div class="field full"><label>Additional Notes</label><textarea id="notes" placeholder="Additional Notes"></textarea></div>
  </div>`;
}
function dashboardSystemFormHTML(kind){
  const label = kind === 'LT' ? 'Lock Test' : 'Lock Reversal';
  const dirOptions = kind === 'LT' ? '<option>Up</option><option>Down</option><option>Drain</option>' : '<option>Up</option><option>Down</option>';
  return `<div class="form-grid mobile-options-grid system-options-grid">
    <div class="field"><label>Canal</label><input id="canal" value="Sault Canada Locks" readonly></div>
    <div class="field"><label>Direction</label><select id="reverseDir" class="placeholder"><option value="">Select Direction</option>${dirOptions}</select></div>
    <div class="field"><label>${label} Time</label><input id="reverseTime" type="time" value="${dashCurrentTime()}"></div>
    <div class="field full"><label>Reason</label><textarea id="reverseReason" placeholder="Reason"></textarea></div>
    <div class="field full"><label>Notes</label><textarea id="notes" placeholder="Notes"></textarea></div>
  </div>`;
}
function setupDashboardManualDropdown(selectId,inputId){
  const select=dashField(selectId), input=dashField(inputId); if(!select||!input) return;
  function update(){const opt=select.options[select.selectedIndex]; select.classList.toggle('placeholder',!select.value); if(opt&&opt.dataset.manual==='true'){input.style.display='block'; if(document.activeElement!==input) input.focus(); opt.value=input.value.trim()||'Other';}else{input.style.display='none'; input.value=''; const manual=[...select.options].find(o=>o.dataset.manual==='true'); if(manual) manual.value='Other';}}
  select.addEventListener('change',update); input.addEventListener('input',()=>{const opt=select.options[select.selectedIndex]; if(opt&&opt.dataset.manual==='true') opt.value=input.value.trim()||'Other'}); update();
}
function getDashboardRealValue(selectId,manualId){const field=dashField(selectId), manual=dashField(manualId); if(!field) return ''; if(field.tagName!=='SELECT') return field.value.trim(); const opt=field.options[field.selectedIndex]; return opt&&opt.dataset.manual==='true'&&manual ? (manual.value.trim()||'Other') : field.value.trim();}
function dashboardMissingFields(kind){
  if(kind==='LR'||kind==='LT') return [{name:'Direction',value:dashValue('reverseDir')},{name:'Time',value:dashValue('reverseTime')},{name:'Reason',value:dashValue('reverseReason')}].filter(x=>!x.value);
  const fields = [{name:kind==='K'?'Name / Company':'Vessel Name',value:getDashboardRealValue('vessel','vesselManual')},{name:'Registration',value:dashValue('reg')},{name:'Direction',value:getDashboardRealValue('dir','dirManual')},{name:'Passenger Count',value:dashValue('pass')}];
  if(kind==='K') fields.push({name:'Number of Kayaks',value:dashValue('kayakCount')});
  fields.push({name:'Destination',value:getDashboardRealValue('dest','destManual')},{name:'Home Port',value:getDashboardRealValue('homePort','homePortManual')},{name:'Time',value:dashValue('entryTime')});
  return fields.filter(x=>!x.value);
}
function showDashboardMissing(missing){const popup=dashField('missingPopup'), list=dashField('missingList'); if(!popup||!list) return; list.innerHTML=missing.map(x=>`<div>• ${x.name}</div>`).join(''); popup.classList.add('active');}
function hideDashboardMissing(){dashField('missingPopup')?.classList.remove('active');}
function mirrorToMobileLogs(entry){const logs=dashSafeParse(localStorage.getItem(mobileLogsKey),[]); if(Array.isArray(logs)){logs.unshift(entry); const today=todayISO(); const small=logs.filter(log=>String(log.date||log.createdAt||'').slice(0,10)===today).slice(0,200); safeLocalSet(mobileLogsKey,JSON.stringify(small));}}
async function saveDashboardMobileEntry(kind, options={}){
  const shouldRedirect = options.redirect !== false;
  const name=entryTypeNameMap[kind]||kind;
  const nowIso=new Date().toISOString();
  const desktopId='desktop_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
  let row, mobile;
  if(kind==='LR'||kind==='LT'){
    const time=dashValue('reverseTime')||dashCurrentTime();
    row={id:desktopId,date:dashCurrentDate(),canal:dashValue('canal')||'Sault Canada Locks',vessel:name,vesselReg:'N/A',type:kind,direction:dashValue('reverseDir'),reverse:kind==='LR'?'Yes':'',time,passengers:0,destination:'N/A',homePort:'N/A',notes:dashValue('notes')||dashValue('reverseReason')||'-',reason:dashValue('reverseReason'),status:'Pending',completed:false,createdAt:nowIso,updatedAt:nowIso,source:'Desktop Dashboard'};
    mobile={...row,entryType:name,formType:name,vesselName:name,reg:'N/A',registration:'N/A',dir:row.direction,pass:'N/A',dest:'N/A',entryTime:time,reverseTime:time,reverseReason:row.reason};
  } else {
    const vessel=getDashboardRealValue('vessel','vesselManual')||'Unknown'; const preset=findEntryPreset(kind,vessel); const reg=dashValue('reg')||preset?.canalReg||preset?.reg||(kind==='K'?'K':'N/A'); const time=dashValue('entryTime')||dashCurrentTime(); const kayakCount=kind==='K'?dashValue('kayakCount'):''; const notesValue=dashValue('notes') || (kind==='K'&&kayakCount ? `Number of Kayaks: ${kayakCount}` : '-');
    row={id:desktopId,date:dashCurrentDate(),canal:reg,vessel:vessel.toUpperCase(),vesselReg:preset?.vesselReg||reg,type:kind,direction:getDashboardRealValue('dir','dirManual'),reverse:'',time,passengers:Number(dashValue('pass'))||0,destination:getDashboardRealValue('dest','destManual')||'N/A',homePort:getDashboardRealValue('homePort','homePortManual')||'N/A',notes:notesValue,kayakCount,numberOfKayaks:kayakCount,owner:preset?.owner||'',regType:preset?.regType||'',vesselType:preset?.vesselType||kind,address:preset?.address||'',city:preset?.city||'',country:preset?.country||'',state:preset?.state||'',postalCode:preset?.postalCode||'',status:'Pending',completed:false,createdAt:nowIso,updatedAt:nowIso,source:'Desktop Dashboard'};
    mobile={...row,entryType:name,formType:name,vesselName:vessel,reg,registration:reg,dir:row.direction,pass:String(row.passengers),dest:row.destination,entryTime:time,kayakCount,numberOfKayaks:kayakCount};
  }
  try{
    const res=await fetch('/api/dashboard/entry/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:desktopId,entry:row})});
    const out=await res.json().catch(()=>({}));
    if(!res.ok || !out.ok) throw new Error(out.error||'Save failed');
    if(Array.isArray(out.traffic)) data.traffic=out.traffic; else data.traffic.push(out.entry||row);
    persistLocal();
    mirrorToMobileLogs(mobile);
    render();
    toast('Entry saved successfully');
    if(shouldRedirect) setTimeout(()=>{ window.location.href='daily.html'; }, 450);
    return true;
  }catch(err){
    console.error(err);
    toast('Save failed — check server console');
    return false;
  }
}
function initDashboardMobileEntryForm(){
  const form=dashField('mobileEntryForm'), mount=dashField('mobileFormMount'); if(!form||!mount||!selectedEntryType) return;
  const kind=selectedEntryType; mount.innerHTML=(kind==='LR'||kind==='LT')?dashboardSystemFormHTML(kind):dashboardNormalFormHTML(kind);
  refreshDashboardPresetDropdowns();
  if(!['RB','K','LR','LT'].includes(kind)) ['dir','dest','homePort'].forEach(id=>setupDashboardManualDropdown(id,id+'Manual'));
  if(kind==='RB') setupDashboardManualDropdown('dir','dirManual');
  setupCustomEntryPresetDropdown(kind);
  const v=dashField('vessel'), r=dashField('reg'); if(v&&r){v.addEventListener('change',()=>{const preset=findEntryPreset(kind,v.value); if(preset){r.value=preset.canalReg||preset.reg||preset.vesselReg||''; r.dispatchEvent(new Event('input',{bubbles:true})); const hp=dashField('homePort'); const hpm=dashField('homePortManual'); const hpVal=preset.homePort||preset.homeport||preset.port||[preset.city,preset.state,preset.country].filter(Boolean).join(', '); if(hp&&hpVal){ if(hp.tagName==='SELECT'){ const opt=[...hp.options].find(o=>String(o.value||o.textContent||'').toLowerCase()===String(hpVal).toLowerCase()); if(opt){hp.value=opt.value;} else {const man=[...hp.options].find(o=>o.dataset&&o.dataset.manual==='true'); if(man){hp.value=man.value; if(hpm){hpm.value=hpVal; hpm.classList.add('show');}}} } else hp.value=hpVal; hp.dispatchEvent(new Event('change',{bubbles:true})); }}});}
  dashField('clearMobileForm')?.addEventListener('click',()=>{form.reset(); const t=dashField('entryTime')||dashField('reverseTime'); if(t) t.value=dashCurrentTime(); toast('Form cleared');});
  dashField('cancelSubmit')?.addEventListener('click',hideDashboardMissing); dashField('missingPopup')?.addEventListener('click',e=>{if(e.target.id==='missingPopup') hideDashboardMissing();});
  let allow=false;
  let saving=false;
  async function submitDashboardEntry(){
    if(saving) return;
    saving=true;
    const submitBtn=form.querySelector('button[type="submit"]');
    if(submitBtn){submitBtn.disabled=true; submitBtn.textContent='Saving...';}
    const ok=await saveDashboardMobileEntry(kind,{redirect:true});
    if(!ok){
      saving=false;
      if(submitBtn){submitBtn.disabled=false; submitBtn.textContent='Save Entry';}
    }
  }
  dashField('continueSubmit')?.addEventListener('click',async()=>{allow=true; hideDashboardMissing(); await submitDashboardEntry(); allow=false;});
  form.addEventListener('submit',async e=>{e.preventDefault(); const missing=dashboardMissingFields(kind); if(missing.length&&!allow){showDashboardMissing(missing); return;} await submitDashboardEntry();});
}

function setupCustomEntryPresetDropdown(kind){
  if(!['RB','TB','Gov','Com','K'].includes(kind)) return;
  const input=dashField('vessel');
  if(!input) return;
  input.removeAttribute('list');
  input.setAttribute('autocomplete','off');

  let combo=input.closest('.custom-preset-combo');
  if(!combo){
    combo=document.createElement('div');
    combo.className='custom-preset-combo';
    input.parentNode.insertBefore(combo,input);
    combo.appendChild(input);
  }
  let toggle=dashField('customPresetToggle') || combo.querySelector('.custom-preset-toggle');
  if(!toggle){
    toggle=document.createElement('button');
    toggle.type='button';
    toggle.id='customPresetToggle';
    toggle.className='custom-preset-toggle';
    toggle.setAttribute('aria-label','Open vessel presets');
    toggle.textContent='▾';
    combo.appendChild(toggle);
  }
  let menu=dashField('customPresetMenu') || combo.querySelector('.custom-preset-menu');
  if(!menu){
    menu=document.createElement('div');
    menu.id='customPresetMenu';
    menu.className='custom-preset-menu';
    combo.appendChild(menu);
  }
  if(combo.dataset.customPresetReady==='true') return;
  combo.dataset.customPresetReady='true';

  let activeIndex=-1;
  const getPresetHomePort=p=>p.homePort||p.homeport||p.port||[p.city,p.state,p.country].filter(Boolean).join(', ');
  const clean=v=>String(v||'').trim();
  function presets(){
    return getVesselPresets(kind).map(p=>({
      ...p,
      name: clean(p.name||p.vessel),
      displayReg: clean(p.canalReg||p.reg||p.canal||p.vesselReg||p.registration),
      homePortValue: clean(getPresetHomePort(p))
    })).filter(p=>p.name);
  }
  function filtered(){
    const q=input.value.trim().toLowerCase();
    const list=presets();
    if(!q) return list.slice(0,100);
    return list.filter(p=>`${p.name} ${p.displayReg} ${p.owner||''} ${p.homePortValue||''}`.toLowerCase().includes(q)).slice(0,100);
  }
  function openMenu(){renderMenu(); menu.classList.add('open');}
  function closeMenu(){menu.classList.remove('open'); activeIndex=-1;}
  function renderMenu(){
    const list=filtered();
    menu.innerHTML='';
    activeIndex=-1;
    if(!list.length){menu.innerHTML='<div class="custom-preset-empty">No presets found</div>'; return;}
    list.forEach((preset,index)=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='custom-preset-option';
      btn.dataset.index=String(index);
      btn.innerHTML=`<strong>${htmlEscape(preset.name)}</strong><span>${htmlEscape(preset.displayReg||preset.owner||'No registration')}</span>`;
      btn.addEventListener('mousedown',e=>{e.preventDefault(); selectPreset(preset);});
      menu.appendChild(btn);
    });
  }
  function setValue(id,value){
    const el=dashField(id);
    if(!el || value===undefined || value===null || value==='') return;
    if(el.tagName==='SELECT'){
      const exact=[...el.options].find(o=>String(o.value||o.textContent||'').toLowerCase()===String(value).toLowerCase());
      if(exact){ el.value=exact.value; }
      else{
        const manual=[...el.options].find(o=>o.dataset&&o.dataset.manual==='true');
        if(manual){ el.value=manual.value||'Other'; const manualInput=dashField(id+'Manual'); if(manualInput){ manualInput.value=value; manualInput.style.display='block'; }}
      }
    }else{
      el.value=value;
    }
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function selectPreset(preset){
    input.value=preset.name;
    setValue('reg', preset.canalReg||preset.reg||preset.canal||preset.vesselReg||preset.registration);
    if(preset.homePortValue) setValue('homePort', preset.homePortValue);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    closeMenu();
    setTimeout(()=>{input.focus(); try{input.setSelectionRange(input.value.length,input.value.length);}catch(e){}},0);
  }
  function updateActive(){
    const buttons=[...menu.querySelectorAll('.custom-preset-option')];
    buttons.forEach(b=>b.classList.remove('active'));
    if(buttons[activeIndex]){buttons[activeIndex].classList.add('active'); buttons[activeIndex].scrollIntoView({block:'nearest'});}
  }
  input.addEventListener('focus',openMenu);
  input.addEventListener('input',openMenu);
  toggle.addEventListener('click',()=>{input.removeAttribute('list'); menu.classList.contains('open')?closeMenu():(input.focus(),openMenu());});
  input.addEventListener('keydown',e=>{
    const buttons=[...menu.querySelectorAll('.custom-preset-option')];
    if(!menu.classList.contains('open')) return;
    if(e.key==='ArrowDown'){e.preventDefault(); activeIndex=Math.min(activeIndex+1,buttons.length-1); updateActive();}
    if(e.key==='ArrowUp'){e.preventDefault(); activeIndex=Math.max(activeIndex-1,0); updateActive();}
    if(e.key==='Enter'&&activeIndex>=0){e.preventDefault(); const list=filtered(); if(list[activeIndex]) selectPreset(list[activeIndex]);}
    if(e.key==='Escape') closeMenu();
  });
  document.addEventListener('mousedown',e=>{if(!combo.contains(e.target)) closeMenu();});
}

// Defensive guard: server/preset refreshes should never restore native datalist on New Entry vessel input.
setInterval(()=>{const input=dashField('vessel'); if(input&&input.closest('#mobileEntryForm')) input.removeAttribute('list');},750);

importOldDbPresetsOnce();
bindEvents();
initPresetEditPage();
initDashboardMobileEntryForm();
render();
