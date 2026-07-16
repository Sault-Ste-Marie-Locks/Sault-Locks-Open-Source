const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
const crypto = require('crypto');
const { execFile, spawn } = require('child_process');

const APP_PORT = 6117;
const APP_URL = `http://127.0.0.1:${APP_PORT}/index.html`;
const APP_NAME = 'Lock Release';
let mainWindow = null;
let serverStarted = false;
let booting = false;
let updateCheckStarted = false;
let updateWindow = null;

function appRoot() { return __dirname; }
function logDir() { const dir = path.join(app.getPath('userData'), 'logs'); fs.mkdirSync(dir, { recursive: true }); return dir; }
function logFile() { return path.join(logDir(), 'electron-app.log'); }
function appendLog(text) { try { fs.appendFileSync(logFile(), text + '\n'); } catch (_) {} }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function helperLog(text) {
  try {
    const target = path.join(os.tmpdir(), 'LockReleaseExeUpdateHelper.log');
    fs.appendFileSync(target, new Date().toISOString() + ' ' + text + '\n');
  } catch (_) {}
}
function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return '';
}
function sleepSync(ms) {
  try {
    const buf = new SharedArrayBuffer(4);
    const view = new Int32Array(buf);
    Atomics.wait(view, 0, 0, ms);
  } catch (_) {
    const end = Date.now() + ms;
    while (Date.now() < end) {}
  }
}
function waitForPidExitSync(pid, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      process.kill(pid, 0);
      sleepSync(800);
    } catch (_) {
      return true;
    }
  }
  return false;
}
function cleanVersionForHelper(v) {
  const s = String(v || '').trim().replace(/^v/i, '').replace(/[^0-9.].*$/, '');
  return s || String(v || '').trim() || '0.0.0';
}
function sha256FileSync(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}
function sameFileSync(a, b) {
  try {
    if (!fs.existsSync(b)) return false;
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    if (sa.size !== sb.size) return false;
    return sha256FileSync(a) === sha256FileSync(b);
  } catch (_) { return false; }
}
function copyDeltaSync(from, to) {
  const skipTop = new Set(['node_modules', 'dist', '.git', '.github', 'update-payload']);
  let copied = 0;
  let skipped = 0;
  const root = path.resolve(from);
  fs.mkdirSync(to, { recursive: true });
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const src = path.join(dir, entry.name);
      const rel = path.relative(root, src);
      const top = rel.split(path.sep)[0];
      if (skipTop.has(top)) continue;
      const dest = path.join(to, rel);
      if (entry.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        walk(src);
      } else if (entry.isFile()) {
        if (sameFileSync(src, dest)) {
          skipped++;
          continue;
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        try { fs.utimesSync(dest, fs.statSync(src).atime, fs.statSync(src).mtime); } catch (_) {}
        copied++;
        helperLog('updated file: ' + dest);
      }
    }
  }
  walk(root);
  helperLog(`delta copy complete copied=${copied} skipped=${skipped}`);
}
function writeVersionMarkersForHelper(appRootPath, userDataDir, latestVersion) {
  const clean = cleanVersionForHelper(latestVersion);
  const targets = [path.join(appRootPath, '.lock-release-version')];
  if (userDataDir) targets.push(path.join(userDataDir, '.lock-release-version'));
  for (const marker of targets) {
    try {
      fs.mkdirSync(path.dirname(marker), { recursive: true });
      fs.writeFileSync(marker, clean, { encoding: 'utf8' });
      helperLog('wrote marker ' + marker + ' = ' + clean);
    } catch (err) { helperLog('marker write failed ' + marker + ': ' + err.message); }
  }
  try {
    const pkgPath = path.join(appRootPath, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.version = clean;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
    helperLog('updated package.json version = ' + clean);
  } catch (err) { helperLog('package version write failed: ' + err.message); }
}
function runExeUpdateHelperSyncFromArgs() {
  const configPath = getArgValue('--lock-release-update-helper');
  if (!configPath) throw new Error('missing helper config path');
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  helperLog('V15 exe helper start config=' + configPath);
  helperLog('srcApp=' + cfg.srcApp + ' appRoot=' + cfg.appRoot + ' latest=' + cfg.latestVersion + ' parentPid=' + cfg.parentPid);
  if (cfg.parentPid) waitForPidExitSync(Number(cfg.parentPid), 45000);
  sleepSync(1200);
  if (!cfg.srcApp || !fs.existsSync(path.join(cfg.srcApp, 'package.json'))) throw new Error('helper source app is missing package.json: ' + cfg.srcApp);
  if (!cfg.appRoot) throw new Error('helper appRoot missing');
  copyDeltaSync(cfg.srcApp, cfg.appRoot);
  writeVersionMarkersForHelper(cfg.appRoot, cfg.userDataDir || '', cfg.latestVersion || '0.0.0');
  const exePath = cfg.exePath || path.join(cfg.installDir || '', 'Lock Release.exe');
  sleepSync(1000);
  if (!fs.existsSync(exePath)) throw new Error('helper cannot find exe to relaunch: ' + exePath);
  helperLog('relaunching ' + exePath);
  const child = spawn(exePath, [], { cwd: cfg.installDir || path.dirname(exePath), detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
  helperLog('V15 exe helper done');
}
if (process.argv.includes('--lock-release-update-helper')) {
  try { runExeUpdateHelperSyncFromArgs(); }
  catch (err) { helperLog('V15 exe helper FAILED: ' + (err && err.stack || err)); }
  process.exit(0);
}
function versionMarkerPaths() {
  const paths = [];
  try { paths.push(path.join(app.getPath('userData'), '.lock-release-version')); } catch (_) {}
  try { paths.push(path.join(appRoot(), '.lock-release-version')); } catch (_) {}
  return paths.filter(Boolean);
}
function currentVersion() {
  // V14 loop fix: do not trust only the first marker file.
  // Older installs could leave a stale 0.0.0 marker in userData while resources/app/package.json
  // was updated correctly. Returning that stale marker caused the app to ask for the same update again.
  // Read every possible version source and use the highest semver value.
  const candidates = [];
  for (const marker of versionMarkerPaths()) {
    try {
      if (fs.existsSync(marker)) {
        const v = fs.readFileSync(marker, 'utf8').replace(/^﻿/, '').trim();
        if (v) candidates.push(v);
      }
    } catch (_) {}
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(appRoot(), 'package.json'), 'utf8'));
    if (pkg && pkg.version) candidates.push(String(pkg.version));
  } catch (_) {}
  try {
    const av = app.getVersion();
    if (av) candidates.push(String(av));
  } catch (_) {}

  let best = '0.0.0';
  for (const v of candidates) {
    if (compareVersions(v, best) > 0) best = normalizeVersion(v);
  }
  return best;
}


function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function createUpdateWindow(latestVersion) {
  if (updateWindow && !updateWindow.isDestroyed()) return updateWindow;
  const icon = path.join(appRoot(), 'assets', 'lock-release.ico');
  updateWindow = new BrowserWindow({
    width: 680,
    height: 420,
    resizable: false,
    maximizable: false,
    minimizable: false,
    title: 'Lock Release Updater',
    icon,
    backgroundColor: '#f6f7f9',
    autoHideMenuBar: true,
    alwaysOnTop: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  updateWindow.setMenuBarVisibility(false);

  let logoSrc = '';
  try {
    const logoFile = path.join(appRoot(), 'assets', 'lock-release.png');
    logoSrc = `data:image/png;base64,${fs.readFileSync(logoFile).toString('base64')}`;
  } catch (_) {}

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Lock Release Updater</title>
<style>
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;font-family:"Segoe UI Variable","Segoe UI",system-ui,Arial,sans-serif;background:#f6f7f9;color:#1f2937;overflow:hidden;font-size:14px}
.shell{height:100%;padding:22px;background:linear-gradient(180deg,#fbfcff 0%,#f6f7f9 100%)}
.window{height:100%;border:1px solid #dde2ea;border-radius:18px;background:#fff;box-shadow:0 18px 50px rgba(15,23,42,.14);overflow:hidden;display:flex;flex-direction:column}
.header{height:112px;padding:22px 26px;display:flex;align-items:center;gap:18px;border-bottom:1px solid #e5eaf1;background:linear-gradient(180deg,#ffffff,#fbfcfe)}
.logo{width:64px;height:64px;border-radius:16px;border:1px solid #dde2ea;background:#f8fafc;display:grid;place-items:center;box-shadow:0 1px 2px rgba(15,23,42,.06)}
.logo img{width:54px;height:54px;object-fit:contain;display:block}.logoFallback{font-weight:800;color:#2563eb;font-size:20px}.titleBlock{min-width:0;flex:1}
.eyebrow{font-size:12px;font-weight:800;color:#2563eb;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}
h1{margin:0 0 6px;font-size:26px;line-height:1.12;letter-spacing:-.03em;font-weight:750;color:#111827}.subtitle{margin:0;color:#64748b;line-height:1.45}.subtitle strong{color:#1f2937}.versionTag{display:inline-flex;align-items:center;min-height:28px;padding:4px 10px;border-radius:999px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-weight:800;font-size:12px;white-space:nowrap}
.content{padding:24px 26px;display:flex;flex-direction:column;gap:18px;flex:1}.statusRow{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.stageLabel{font-size:12px;color:#64748b;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px}.stage{font-size:20px;font-weight:750;letter-spacing:-.02em;color:#1f2937}.pct{font-size:32px;font-weight:750;letter-spacing:-.04em;color:#2563eb;font-variant-numeric:tabular-nums;line-height:1}.detail{margin-top:8px;color:#64748b;line-height:1.45;min-height:38px;white-space:pre-wrap}.progressBox{border:1px solid #dde2ea;background:#fafbfc;border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(15,23,42,.04)}.bar{height:12px;border-radius:999px;background:#e5eaf1;overflow:hidden;border:1px solid #d6dde8}.fill{height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg,#2563eb,#38bdf8);transition:width .25s ease}.progressMeta{display:flex;justify-content:space-between;gap:12px;margin-top:10px;color:#64748b;font-size:12px}.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.step{border:1px solid #e5eaf1;background:#fff;border-radius:14px;padding:12px}.num{width:24px;height:24px;border-radius:999px;display:grid;place-items:center;background:#eff6ff;color:#2563eb;font-weight:800;font-size:12px;margin-bottom:9px}.step strong{display:block;color:#334155;font-size:12px;margin-bottom:3px}.step span{display:block;color:#94a3b8;font-size:11px;line-height:1.3}.footer{padding:14px 26px;border-top:1px solid #e5eaf1;background:#fbfcfe;color:#64748b;display:flex;justify-content:space-between;gap:14px;font-size:12px}.safe{display:inline-block;width:8px;height:8px;border-radius:50%;background:#15803d;margin-right:8px}.err .fill{background:linear-gradient(90deg,#b42318,#f97316)}.err .pct{color:#b42318}.err .versionTag{background:#fff7f7;color:#b42318;border-color:#fecaca}.done .fill{background:linear-gradient(90deg,#15803d,#22c55e)}.done .pct{color:#15803d}.done .versionTag{background:#f0fdf4;color:#15803d;border-color:#bbf7d0}
</style></head><body><div class="shell"><div class="window card" id="card"><div class="header"><div class="logo">${logoSrc ? `<img src="${logoSrc}" alt="Lock Release">` : `<div class="logoFallback">LR</div>`}</div><div class="titleBlock"><div class="eyebrow">Lock Release desktop</div><h1>Installing update</h1><p class="subtitle">Updating to <strong>version ${escapeHtml(latestVersion)}</strong>. Your data will be kept.</p></div><div class="versionTag" id="statusPill">Working</div></div><div class="content"><div class="statusRow"><div><div class="stageLabel">Current step</div><div class="stage" id="stage">Preparing update...</div><div class="detail" id="detail">Getting the update ready.</div></div><div class="pct" id="pct">0%</div></div><div class="progressBox"><div class="bar"><div class="fill" id="fill"></div></div><div class="progressMeta"><span id="metaLeft">Please keep Lock Release open while this finishes.</span><span>Usually under 1 minute</span></div></div><div class="steps"><div class="step"><div class="num">1</div><strong>Download</strong><span>Fetch update package</span></div><div class="step"><div class="num">2</div><strong>Extract</strong><span>Prepare new files</span></div><div class="step"><div class="num">3</div><strong>Apply</strong><span>Replace app files</span></div><div class="step"><div class="num">4</div><strong>Restart</strong><span>Open latest version</span></div></div></div><div class="footer"><div><span class="safe"></span>Lock Release will reopen after the update finishes.</div><div>Do not close this window.</div></div></div></div><script>window.setUpdateProgress=function(stage,pct,detail,state){pct=Math.max(0,Math.min(100,Number(pct)||0));var safeState=state||'';var status=safeState==='done'?'Complete':safeState==='err'?'Error':'Working';document.getElementById('stage').textContent=stage||'Working...';document.getElementById('pct').textContent=Math.round(pct)+'%';document.getElementById('fill').style.width=pct+'%';document.getElementById('detail').textContent=detail||'';document.getElementById('statusPill').textContent=status;document.getElementById('card').className='window card '+safeState;};</script></body></html>`;
  updateWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  updateWindow.on('closed', () => { updateWindow = null; });
  return updateWindow;
}

function updateProgress(stage, percent, detail, state) {
  appendLog(`UPDATE PROGRESS ${Math.round(percent || 0)}% ${stage || ''} ${detail || ''}`);
  if (!updateWindow || updateWindow.isDestroyed()) return;
  const script = `window.setUpdateProgress(${JSON.stringify(stage || 'Working...')}, ${Number(percent)||0}, ${JSON.stringify(detail || '')}, ${JSON.stringify(state || '')})`;
  updateWindow.webContents.executeJavaScript(script).catch(() => {});
}

function readJsonSafe(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}
function updateConfig() {
  return readJsonSafe(path.join(appRoot(), 'update-config.json'), {
    githubRepo: 'OfficialUnrealNetwork/Locks-Dashboard-Manager-Updates',
    checkOnStartup: true,
    allowPrerelease: false,
    assetName: 'Lock_Release_Windows.zip',
    privateRepo: false,
    tokenEnvName: 'LOCK_RELEASE_GITHUB_TOKEN',
    tokenFileName: 'github-token.txt'
  });
}
function tokenPath(config) {
  return path.join(app.getPath('userData'), config.tokenFileName || 'github-token.txt');
}
function writeTokenHelp(config) {
  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  const helpPath = path.join(dir, 'PRIVATE-GITHUB-UPDATES.txt');
  const repo = String(config.githubRepo || 'jacpelletie07/Locks-Dashboard-Manager');
  fs.writeFileSync(helpPath, `Private GitHub updates are enabled for ${repo}.\n\nTo let Lock Release check private releases, create a GitHub fine-grained personal access token with read access to this repo, then save it in one of these places:\n\n1) Environment variable:\n${config.tokenEnvName || 'LOCK_RELEASE_GITHUB_TOKEN'}\n\n2) Token file:\n${tokenPath(config)}\n\nThe file should contain only the token text. Restart Lock Release after adding it.\n`, 'utf8');
  return helpPath;
}
function getGitHubToken(config) {
  const envName = config.tokenEnvName || 'LOCK_RELEASE_GITHUB_TOKEN';
  const fromEnv = String(process.env[envName] || '').trim();
  if (fromEnv) return fromEnv;
  try {
    const file = tokenPath(config);
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  } catch (_) {}
  return '';
}
function githubHeaders(config, accept) {
  const headers = { 'Accept': accept || 'application/vnd.github+json' };
  const token = getGitHubToken(config || {});
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
function normalizeVersion(v) {
  // Handle PowerShell UTF-8 BOMs and non-semver tag text so update checks do not loop.
  const raw = String(v ?? '0.0.0').replace(/^\uFEFF/, '').trim().replace(/^v/i, '');
  const match = raw.match(/\d+(?:\.\d+)*/);
  return match ? match[0] : '0.0.0';
}
function compareVersions(a, b) {
  const aa = normalizeVersion(a).split('.').map(n => parseInt(n, 10) || 0);
  const bb = normalizeVersion(b).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(aa.length, bb.length, 3);
  for (let i = 0; i < len; i++) {
    const x = aa[i] || 0;
    const y = bb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}
function getJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': `${APP_NAME.replace(/\s+/g, '-')}/${currentVersion()}`,
        'Accept': 'application/vnd.github+json',
        ...headers
      }
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          getJson(res.headers.location, headers).then(resolve, reject); return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const e = new Error(`GitHub returned ${res.statusCode}: ${body.slice(0, 300)}`); e.statusCode = res.statusCode; reject(e); return;
        }
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('Update check timed out')); });
  });
}
function downloadFile(url, target, headers = {}, onProgress) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const run = (downloadUrl) => {
      let finalHeaders = {
        'User-Agent': `${APP_NAME.replace(/\s+/g, '-')}/${currentVersion()}`,
        ...headers
      };
      try {
        const host = new URL(downloadUrl).hostname.toLowerCase();
        if (!host.endsWith('github.com') && !host.endsWith('githubusercontent.com')) delete finalHeaders.Authorization;
      } catch (_) {}
      const req = https.get(downloadUrl, { headers: finalHeaders }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume(); run(res.headers.location); return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume(); reject(new Error(`Download failed: HTTP ${res.statusCode}`)); return;
        }
        const total = Number(res.headers['content-length'] || 0);
        let received = 0;
        const file = fs.createWriteStream(target);
        res.on('data', chunk => {
          received += chunk.length;
          if (typeof onProgress === 'function' && total > 0) onProgress(received, total);
        });
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve({ received, total })));
        file.on('error', reject);
      });
      req.on('error', reject);
      req.setTimeout(180000, () => req.destroy(new Error('Update download timed out')));
    };
    run(url);
  });
}

function copyDirRecursive(src, dst) {
  if (!src || !fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (!stat.isDirectory()) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const from = path.join(src, item);
    const to = path.join(dst, item);
    const info = fs.statSync(from);
    if (info.isDirectory()) copyDirRecursive(from, to);
    else if (!fs.existsSync(to)) fs.copyFileSync(from, to);
  }
}
function prepareWritableStorage() {
  const userRoot = app.getPath('userData');
  const dbDir = path.join(userRoot, 'database');
  const dataDir = path.join(userRoot, 'data');
  fs.mkdirSync(dbDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });
  process.env.LOCK_RELEASE_USER_DATA = userRoot;
  process.env.LOCK_RELEASE_DB_DIR = dbDir;
  process.env.LOCK_RELEASE_DATA_DIR = dataDir;
  try { copyDirRecursive(path.join(appRoot(), 'database'), dbDir); } catch (err) { appendLog('DB seed copy skipped: ' + (err && err.message || err)); }
  try { copyDirRecursive(path.join(appRoot(), 'data'), dataDir); } catch (err) { appendLog('Data seed copy skipped: ' + (err && err.message || err)); }
}

function checkUrl(url, timeoutMs = 700) {
  return new Promise(resolve => {
    const req = http.get(url, res => { res.resume(); resolve(res.statusCode >= 200 && res.statusCode < 500); });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve(false); });
  });
}
async function waitForServer(totalMs) {
  const started = Date.now();
  while (Date.now() - started < totalMs) {
    if (await checkUrl(APP_URL)) return true;
    await wait(300);
  }
  return false;
}
function killOldPort() {
  return new Promise(resolve => {
    const ps = `$lines = netstat -ano | Select-String ':${APP_PORT}'; foreach($l in $lines){$parts = ($l.ToString() -split '\\s+') | Where-Object { $_ }; if($parts.Length -ge 5){$pid=$parts[-1]; if($pid -match '^\\d+$'){try{taskkill /PID $pid /F | Out-Null}catch{}}}}`;
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { windowsHide: true }, () => resolve());
  });
}
async function startBundledServer() {
  appendLog(`\n=== ${APP_NAME} ${new Date().toISOString()} ===`);
  appendLog(`App root: ${appRoot()}`);
  appendLog(`Version: ${currentVersion()}`);

  if (serverStarted) return;
  await killOldPort();
  await wait(500);

  try {
    prepareWritableStorage();
    require(path.join(appRoot(), 'server.js'));
    serverStarted = true;
  } catch (err) {
    appendLog('SERVER REQUIRE ERROR: ' + (err && err.stack || err));
    throw new Error(`The bundled Lock Release service could not start.\n\n${err && err.message || err}\n\nLog file:\n${logFile()}`);
  }

  const ready = await waitForServer(35000);
  if (!ready) throw new Error(`The local Lock Release service did not start on port ${APP_PORT}.\n\nLog file:\n${logFile()}`);
}
function createWindow() {
  const icon = path.join(appRoot(), 'assets', 'lock-release.ico');
  mainWindow = new BrowserWindow({
    width: 1420,
    height: 920,
    minWidth: 1050,
    minHeight: 720,
    title: APP_NAME,
    icon,
    backgroundColor: '#0f172a',
    show: false,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => checkForUpdatesOnStartup().catch(err => appendLog('UPDATE CHECK ERROR: ' + (err && err.stack || err))), 1200);
  });
  mainWindow.loadURL(APP_URL);
  mainWindow.on('closed', () => { mainWindow = null; });
}
async function boot() {
  if (booting) return;
  booting = true;
  try {
    await startBundledServer();
    createWindow();
  } catch (err) {
    appendLog('BOOT ERROR: ' + (err && err.stack || err));
    dialog.showErrorBox('Lock Release could not start', String(err && err.message || err));
    app.quit();
  } finally {
    booting = false;
  }
}

async function checkForUpdatesOnStartup() {
  if (updateCheckStarted) return;
  updateCheckStarted = true;
  const config = updateConfig();
  if (!config.checkOnStartup) { appendLog('Updater disabled by update-config.json. Skipping startup update check.'); return; }
  const repo = String(config.githubRepo || '').trim();
  if (!repo || repo.includes('PUT-YOUR') || !repo.includes('/')) {
    appendLog('Updater skipped: update-config.json has no GitHub repo yet.');
    return;
  }
  if (config.privateRepo && !getGitHubToken(config)) {
    const helpPath = writeTokenHelp(config);
    appendLog('Updater skipped: private repo is enabled but no GitHub token is set. Help: ' + helpPath);
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Private GitHub updates need a token',
      message: 'Lock Release is connected to a private GitHub repo.',
      detail: `Private repo: ${repo}\n\nTo check for updates, add a GitHub token once. I created instructions here:\n${helpPath}`,
      buttons: ['Open Instructions Folder', 'Later'],
      defaultId: 0,
      cancelId: 1
    });
    if (choice === 0) shell.openPath(path.dirname(helpPath));
    return;
  }
  const api = `https://api.github.com/repos/${repo}/releases/latest`;
  appendLog('Checking for updates: ' + api);
  let release;
  try { release = await getJson(api, githubHeaders(config)); }
  catch (err) {
    appendLog('Update check failed: ' + (err && err.stack || err));
    if (config.privateRepo && (err.statusCode === 401 || err.statusCode === 403 || err.statusCode === 404)) {
      const helpPath = writeTokenHelp(config);
      dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        title: 'Could not check private GitHub updates',
        message: 'Lock Release could not access the private GitHub release.',
        detail: `GitHub returned ${err.statusCode || 'an error'}. The token may be missing, expired, or missing repo access.\n\nRepo: ${repo}\nInstructions: ${helpPath}`,
        buttons: ['OK']
      });
    }
    return;
  }
  if (!config.allowPrerelease && release.prerelease) return;
  const latestVersion = normalizeVersion(release.tag_name || release.name || '0.0.0');
  const installedVersion = normalizeVersion(currentVersion());
  appendLog(`Installed version: ${installedVersion}; latest release: ${latestVersion}; appRoot=${appRoot()}`);
  if (compareVersions(latestVersion, installedVersion) <= 0) return;

  const assets = Array.isArray(release.assets) ? release.assets : [];
  let asset = assets.find(a => a && a.name === config.assetName);
  if (!asset) asset = assets.find(a => a && /Lock[_\s-]*Release.*Windows.*\.zip$/i.test(a.name || ''));
  if (!asset) asset = assets.find(a => a && /\.zip$/i.test(a.name || ''));
  if (!asset || (!asset.browser_download_url && !asset.url)) {
    const result = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Lock Release update available',
      message: `Lock Release ${latestVersion} is available.`,
      detail: 'No automatic update zip was attached to the GitHub release. Open the release page instead?',
      buttons: ['Open GitHub', 'Later'],
      defaultId: 0,
      cancelId: 1
    });
    if (result === 0) shell.openExternal(release.html_url || `https://github.com/${repo}/releases/latest`);
    return;
  }

  const result = dialog.showMessageBoxSync(mainWindow, {
    type: 'info',
    title: 'Lock Release update available',
    message: `Lock Release ${latestVersion} is available.`,
    detail: `Installed: ${installedVersion}\nLatest: ${latestVersion}\n\nDownload and install the update now? The app will close and reopen.`,
    buttons: ['Update Now', 'Later', 'Open GitHub'],
    defaultId: 0,
    cancelId: 1
  });
  if (result === 2) { shell.openExternal(release.html_url || `https://github.com/${repo}/releases/latest`); return; }
  if (result !== 0) return;
  const downloadUrl = (config.privateRepo && asset.url) ? asset.url : asset.browser_download_url;
  await downloadAndInstallUpdate(downloadUrl, latestVersion, config);
}

function runProcess(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(file, args, { windowsHide: true, ...options }, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
        return;
      }
      resolve({ stdout, stderr });
    });
    if (child && child.stdout) child.stdout.on('data', d => appendLog(String(d).trim()));
    if (child && child.stderr) child.stderr.on('data', d => appendLog(String(d).trim()));
  });
}
async function expandZip(zipPath, extractDir) {
  fs.mkdirSync(extractDir, { recursive: true });
  const ps = `Expand-Archive -LiteralPath '${String(zipPath).replace(/'/g,"''")}' -DestinationPath '${String(extractDir).replace(/'/g,"''")}' -Force`;
  await runProcess('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps]);
}
function findSourceApp(extractRoot) {
  const direct = path.join(extractRoot, 'package.json');
  if (fs.existsSync(direct)) return extractRoot;
  const directResources = path.join(extractRoot, 'resources', 'app', 'package.json');
  if (fs.existsSync(directResources)) return path.join(extractRoot, 'resources', 'app');
  const stack = [extractRoot];
  while (stack.length) {
    const dir = stack.shift();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { continue; }
    const resApp = path.join(dir, 'resources', 'app');
    if (fs.existsSync(path.join(resApp, 'package.json'))) return resApp;
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    for (const e of entries) if (e.isDirectory()) stack.push(path.join(dir, e.name));
  }
  return null;
}
function fileHash(file) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(file));
  return h.digest('hex');
}
function sameFileContent(src, dst) {
  try {
    if (!fs.existsSync(dst)) return false;
    const a = fs.statSync(src);
    const b = fs.statSync(dst);
    if (!a.isFile() || !b.isFile()) return false;
    if (a.size !== b.size) return false;
    return fileHash(src) === fileHash(dst);
  } catch (_) {
    return false;
  }
}
function copyFileIfChanged(src, dst, stats) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (sameFileContent(src, dst)) {
    if (stats) stats.skipped++;
    return false;
  }
  fs.copyFileSync(src, dst);
  try { fs.utimesSync(dst, fs.statSync(src).atime, fs.statSync(src).mtime); } catch (_) {}
  if (stats) stats.copied++;
  appendLog('Updated changed file: ' + dst);
  return true;
}
function copySourceUpdate(src, dst) {
  // Delta copy: do not remove/rewrite whole folders. Only files with changed content are replaced.
  // This prevents updates from touching every file/timestamp when only one HTML/JS/CSS file changed.
  const skipTop = new Set(['node_modules', 'dist', '.git', '.github', 'update-payload']);
  const stats = { copied: 0, skipped: 0, dirs: 0 };
  fs.mkdirSync(dst, { recursive: true });
  const walk = (fromDir) => {
    for (const item of fs.readdirSync(fromDir, { withFileTypes: true })) {
      const from = path.join(fromDir, item.name);
      const rel = path.relative(src, from);
      const top = rel.split(path.sep)[0];
      if (skipTop.has(top)) continue;
      const to = path.join(dst, rel);
      if (item.isDirectory()) {
        if (!fs.existsSync(to)) {
          fs.mkdirSync(to, { recursive: true });
          stats.dirs++;
        }
        walk(from);
      } else if (item.isFile()) {
        copyFileIfChanged(from, to, stats);
      }
    }
  };
  walk(src);
  appendLog(`Delta update copy complete. Copied ${stats.copied} changed file(s), skipped ${stats.skipped} unchanged file(s), created ${stats.dirs} folder(s).`);
  return stats;
}
function safeVersionWrite(version) {
  const normalized = normalizeVersion(version);
  for (const marker of versionMarkerPaths()) {
    try {
      fs.mkdirSync(path.dirname(marker), { recursive: true });
      fs.writeFileSync(marker, normalized, 'utf8');
      appendLog('Wrote version marker: ' + marker + ' = ' + normalized);
    } catch (err) {
      appendLog('Failed writing version marker ' + marker + ': ' + err.message);
    }
  }
  try {
    const pkgPath = path.join(appRoot(), 'package.json');
    const pkg = readJsonSafe(pkgPath, null);
    if (pkg) {
      pkg.version = normalized;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
      appendLog('Updated package.json version to ' + normalized);
    }
  } catch (err) { appendLog('Failed updating package.json version: ' + err.message); }
}
function psSingleQuote(v) {
  return String(v || '').replace(/'/g, "''");
}
function relaunchPackagedAppAfterExit() {
  const exePath = process.execPath;
  const workDir = path.dirname(process.execPath);
  const pid = process.pid;
  const scriptPath = path.join(os.tmpdir(), `LockReleaseRelaunch_${Date.now()}.ps1`);
  const relaunchLog = path.join(os.tmpdir(), 'LockReleaseRelaunch.log');
  const ps = `$ErrorActionPreference='SilentlyContinue'
` +
    `Add-Content -Path '${psSingleQuote(relaunchLog)}' -Value "$(Get-Date -Format o) waiting for PID ${pid}"
` +
    `try { Wait-Process -Id ${pid} -Timeout 25 } catch {}
` +
    `Start-Sleep -Milliseconds 900
` +
    `Add-Content -Path '${psSingleQuote(relaunchLog)}' -Value "$(Get-Date -Format o) starting ${psSingleQuote(exePath)}"
` +
    `Start-Process -FilePath '${psSingleQuote(exePath)}' -WorkingDirectory '${psSingleQuote(workDir)}'
`;
  try {
    fs.writeFileSync(scriptPath, ps, 'utf8');
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    appendLog('Started reliable relaunch helper: ' + scriptPath);
  } catch (err) {
    appendLog('Failed starting reliable relaunch helper: ' + err.message);
  }
}
function relaunchSourceAppHidden() {
  const root = appRoot().replace(/'/g, "''");
  const ps = `Start-Sleep -Seconds 1; Set-Location -LiteralPath '${root}'; npm install | Out-File -FilePath (Join-Path '${root}' 'launcher-install.log') -Append; npx electron .`;
  const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', ps], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}
async function installSourceModeUpdate(zipPath, latestVersion, tempDir) {
  const extractDir = path.join(tempDir, 'extracted');
  updateProgress('Extracting update', 82, 'Unpacking downloaded files...');
  await expandZip(zipPath, extractDir);

  const srcApp = findSourceApp(extractDir);
  appendLog('Source update app folder found: ' + srcApp);
  if (!srcApp) throw new Error('Update ZIP did not contain a resources/app source folder.');

  const backupRoot = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Lock Release BAT App Backups');
  fs.mkdirSync(backupRoot, { recursive: true });
  const backupDir = path.join(backupRoot, 'before_update_' + new Date().toISOString().replace(/[:.]/g, '-'));
  updateProgress('Backing up current app', 87, 'Saving a backup before replacing files...');
  try { fs.cpSync(appRoot(), backupDir, { recursive: true, force: true, filter: p => !p.includes(`${path.sep}node_modules${path.sep}`) && !p.includes(`${path.sep}dist${path.sep}`) }); } catch (err) { appendLog('Backup skipped/failed: ' + err.message); }

  updateProgress('Applying update', 92, 'Replacing app files in the source/BAT install...');
  copySourceUpdate(srcApp, appRoot());
  safeVersionWrite(latestVersion);

  updateProgress('Checking dependencies', 97, 'Running npm install if needed...');
  try {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    await runProcess(npm, ['install'], { cwd: appRoot(), timeout: 120000 });
  } catch (err) {
    appendLog('npm install after update failed: ' + (err.stderr || err.message));
  }

  updateProgress('Update complete', 100, 'Lock Release was updated. Restarting now...', 'done');
  await wait(900);
  relaunchSourceAppHidden();
  setTimeout(() => app.quit(), 600);
}

async function installPackagedSourceUpdate(zipPath, latestVersion, tempDir) {
  const extractDir = path.join(tempDir, 'packaged_extracted_check');
  updateProgress('Checking update package', 82, 'Verifying the update package before restarting...');
  await expandZip(zipPath, extractDir);

  const srcApp = findSourceApp(extractDir);
  appendLog('Packaged update app folder found: ' + srcApp);
  if (!srcApp) return false;

  // V15 fix: use this same EXE as an external updater helper instead of hidden PowerShell.
  // On some PCs PowerShell starts but never applies the update, leaving version 0.0.0 and causing
  // the same update prompt again. The EXE helper survives this app closing, delta-copies only
  // changed files, writes both version markers, updates package.json, then relaunches Lock Release.
  const installDir = path.dirname(process.execPath);
  const exePath = process.execPath;
  const helperConfigPath = path.join(tempDir, 'lock-release-update-helper-config.json');
  fs.writeFileSync(helperConfigPath, JSON.stringify({
    srcApp,
    appRoot: appRoot(),
    userDataDir: app.getPath('userData'),
    installDir,
    exePath,
    parentPid: process.pid,
    latestVersion: String(latestVersion || '')
  }, null, 2), 'utf8');

  appendLog(`Starting V15 EXE updater helper. installDir=${installDir}; appRoot=${appRoot()}; helperConfig=${helperConfigPath}; latest=${latestVersion}`);
  updateProgress('Installing update', 95, 'Lock Release will close now. A separate helper will finish the update and reopen it.');
  await wait(900);
  const child = spawn(process.execPath, ['--lock-release-update-helper', helperConfigPath], { detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
  setTimeout(() => app.exit(0), 500);
  return true;
}

async function downloadAndInstallUpdate(downloadUrl, latestVersion, config) {
  const tempDir = path.join(os.tmpdir(), `LockReleaseUpdate_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  const zipPath = path.join(tempDir, 'Lock_Release_Windows.zip');

  try {
    createUpdateWindow(latestVersion);
    updateProgress('Preparing update', 4, 'Creating temporary update folder...');
    await wait(350);

    const headers = (config && config.privateRepo) ? githubHeaders(config, 'application/octet-stream') : {};
    updateProgress('Downloading update', 8, 'Connecting to GitHub release asset...');
    await downloadFile(downloadUrl, zipPath, headers, (received, total) => {
      const pct = total > 0 ? 8 + (received / total) * 68 : 40;
      const mb = (received / 1024 / 1024).toFixed(1);
      const totalMb = total > 0 ? (total / 1024 / 1024).toFixed(1) : '?';
      updateProgress('Downloading update', pct, `${mb} MB of ${totalMb} MB downloaded`);
    });

    const sourceMode = !app.isPackaged || !/resources[\\/]app$/i.test(appRoot());
    appendLog(`Update downloaded. sourceMode=${sourceMode}; appRoot=${appRoot()}; isPackaged=${app.isPackaged}`);
    if (sourceMode) {
      await installSourceModeUpdate(zipPath, latestVersion, tempDir);
      return;
    }

    const didPackagedSourceUpdate = await installPackagedSourceUpdate(zipPath, latestVersion, tempDir);
    if (didPackagedSourceUpdate) return;

    updateProgress('Preparing installer', 84, 'Update downloaded. Preparing safe installer...');
    const scriptPath = path.join(tempDir, 'install-lock-release-update.ps1');
    fs.writeFileSync(scriptPath, updatePowerShell(), 'utf8');

    const installDir = path.dirname(process.execPath);
    const exePath = process.execPath;
    const args = [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath,
      '-ZipPath', zipPath,
      '-InstallDir', installDir,
      '-ExePath', exePath,
      '-AppRoot', appRoot(),
      '-UserDataDir', app.getPath('userData'),
      '-SourceMode', '0',
      '-AppPid', String(process.pid),
      '-LatestVersion', String(latestVersion || '')
    ];
    appendLog(`Starting packaged updater script. installDir=${installDir}; script=${scriptPath}`);
    updateProgress('Installing update', 95, 'Lock Release will close now. It should reopen automatically when the update finishes.');
    await wait(1000);
    const child = spawn('powershell.exe', args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
    setTimeout(() => app.quit(), 400);
  } catch (err) {
    appendLog('UPDATE INSTALL ERROR: ' + (err && err.stack || err));
    updateProgress('Update failed', 100, `${err && err.message || err}\n\nLog file: ${logFile()}`, 'err');
    dialog.showErrorBox('Lock Release update failed', `${err && err.message || err}\n\nLog file:\n${logFile()}`);
  }
}
function updatePowerShell() {
  return String.raw`param(
  [Parameter(Mandatory=$true)][string]$ZipPath,
  [Parameter(Mandatory=$true)][string]$InstallDir,
  [Parameter(Mandatory=$true)][string]$ExePath,
  [Parameter(Mandatory=$true)][string]$AppRoot,
  [Parameter(Mandatory=$false)][string]$UserDataDir = '',
  [Parameter(Mandatory=$true)][int]$SourceMode,
  [Parameter(Mandatory=$true)][int]$AppPid,
  [Parameter(Mandatory=$false)][string]$LatestVersion = ''
)
$ErrorActionPreference = 'Stop'
$log = Join-Path $env:TEMP 'LockReleaseUpdateInstall.log'
function Log($m){ Add-Content -Path $log -Value ("$(Get-Date -Format o) $m") }
function Retry($Name, [scriptblock]$Action, [int]$Tries = 18) {
  for ($i=1; $i -le $Tries; $i++) {
    try { & $Action; return }
    catch {
      Log ("$Name try $i failed: " + $_.Exception.Message)
      if ($i -eq $Tries) { throw }
      Start-Sleep -Milliseconds 1000
    }
  }
}
function Same-FileContent($A, $B) {
  try {
    if (-not (Test-Path -LiteralPath $B)) { return $false }
    $aItem = Get-Item -LiteralPath $A -ErrorAction Stop
    $bItem = Get-Item -LiteralPath $B -ErrorAction Stop
    if ($aItem.Length -ne $bItem.Length) { return $false }
    $aHash = (Get-FileHash -LiteralPath $A -Algorithm SHA256 -ErrorAction Stop).Hash
    $bHash = (Get-FileHash -LiteralPath $B -Algorithm SHA256 -ErrorAction Stop).Hash
    return ($aHash -eq $bHash)
  } catch { return $false }
}
function Copy-AppSource($From, $To) {
  # Delta copy: only copy files that are actually different. Do not wipe whole folders.
  $skip = @('node_modules', 'dist', '.git', '.github', 'update-payload')
  $script:CopiedFiles = 0
  $script:SkippedFiles = 0
  New-Item -ItemType Directory -Path $To -Force | Out-Null
  $fromRoot = (Resolve-Path -LiteralPath $From).Path.TrimEnd('\','/')
  Get-ChildItem -LiteralPath $From -Force -Recurse | ForEach-Object {
    $full = $_.FullName
    if ($full.Length -le $fromRoot.Length) { return }
    $rel = $full.Substring($fromRoot.Length).TrimStart('\','/')
    if ($rel -eq '.') { return }
    $top = ($rel -split '[\\/]')[0]
    if ($skip -contains $top) { return }
    $dest = Join-Path $To $rel
    if ($_.PSIsContainer) {
      if (-not (Test-Path -LiteralPath $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
    } else {
      if (Same-FileContent $_.FullName $dest) {
        $script:SkippedFiles++
        return
      }
      New-Item -ItemType Directory -Path (Split-Path $dest -Parent) -Force | Out-Null
      Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
      try { (Get-Item -LiteralPath $dest).LastWriteTimeUtc = $_.LastWriteTimeUtc } catch {}
      $script:CopiedFiles++
      Log "Updated changed file: $dest"
    }
  }
  Log "Delta update copy complete. Copied $script:CopiedFiles changed file(s), skipped $script:SkippedFiles unchanged file(s)."
}
function Find-SourceApp($ExtractRoot) {
  if (Test-Path (Join-Path $ExtractRoot 'package.json')) { return $ExtractRoot }
  $rootApp = Join-Path $ExtractRoot 'resources\app'
  if (Test-Path (Join-Path $rootApp 'package.json')) { return $rootApp }
  $packaged = Get-ChildItem -Path $ExtractRoot -Directory -Recurse -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName 'resources\app\package.json') } |
    Select-Object -First 1
  if ($packaged) { return (Join-Path $packaged.FullName 'resources\app') }
  $source = Get-ChildItem -Path $ExtractRoot -Directory -Recurse -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName 'package.json') } |
    Select-Object -First 1
  if ($source) { return $source.FullName }
  return $null
}
function Set-VersionMarkers($TargetAppRoot) {
  if (-not $LatestVersion) { return }
  $clean = ($LatestVersion -replace '^v','') -replace '[^0-9.].*$',''
  if (-not $clean) { $clean = $LatestVersion }
  $markerTargets = @()
  if ($TargetAppRoot) { $markerTargets += (Join-Path $TargetAppRoot '.lock-release-version') }
  if ($UserDataDir) { $markerTargets += (Join-Path $UserDataDir '.lock-release-version') }
  foreach ($marker in $markerTargets) {
    try {
      New-Item -ItemType Directory -Path (Split-Path $marker -Parent) -Force | Out-Null
      $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
      [System.IO.File]::WriteAllText($marker, $clean, $utf8NoBom)
      Log "Wrote version marker $marker = $clean"
    } catch { Log ('Could not write marker ' + $marker + ': ' + $_.Exception.Message) }
  }
  $pkgPath = Join-Path $TargetAppRoot 'package.json'
  if (Test-Path $pkgPath) {
    try {
      $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
      $pkg.version = $clean
      $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
      [System.IO.File]::WriteAllText($pkgPath, ($pkg | ConvertTo-Json -Depth 50), $utf8NoBom)
      Log "Updated package.json version to $clean"
    } catch { Log ('Could not update package.json: ' + $_.Exception.Message) }
  }
}
try {
  Log "Starting V15 Lock Release update install. SourceMode=$SourceMode InstallDir=$InstallDir AppRoot=$AppRoot UserDataDir=$UserDataDir LatestVersion=$LatestVersion"

  try { Stop-Process -Id $AppPid -Force -ErrorAction SilentlyContinue } catch {}
  try { Wait-Process -Id $AppPid -Timeout 30 -ErrorAction SilentlyContinue } catch {}
  Start-Sleep -Seconds 2

  $extract = Join-Path $env:TEMP ('LockReleaseExtract_' + [guid]::NewGuid().ToString())
  New-Item -ItemType Directory -Path $extract -Force | Out-Null
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $extract -Force

  $srcApp = Find-SourceApp $extract
  if ($srcApp) {
    Log "Source app update detected: $srcApp"
    $backupRoot = Join-Path $env:LOCALAPPDATA 'LockReleaseDesktopBackups'
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    $backupDir = Join-Path $backupRoot ('before_update_' + (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'))
    if (Test-Path $AppRoot) { Copy-Item $AppRoot $backupDir -Recurse -Force -ErrorAction SilentlyContinue }

    Retry 'Copy source update into resources/app' { Copy-AppSource $srcApp $AppRoot }
    Set-VersionMarkers $AppRoot

    $newExe = $ExePath
    if (-not (Test-Path $newExe)) { $newExe = Join-Path $InstallDir 'Lock Release.exe' }
    if (-not (Test-Path $newExe)) { throw "Lock Release.exe was not found after source update at $newExe" }
    Start-Sleep -Seconds 2
    Start-Process -FilePath $newExe -WorkingDirectory $InstallDir
    Log 'V15 source update complete and app relaunched'
    return
  }

  # Fallback: full packaged update ZIP.
  $src = $null
  if (Test-Path (Join-Path $extract 'Lock Release.exe')) { $src = $extract }
  if (-not $src) {
    $src = Get-ChildItem -Path $extract -Directory -Recurse -ErrorAction SilentlyContinue |
      Where-Object { Test-Path (Join-Path $_.FullName 'Lock Release.exe') } |
      Select-Object -First 1 -ExpandProperty FullName
  }
  if (-not $src) { throw 'Update ZIP did not contain resources/app source files or Lock Release.exe' }

  $backupRoot = Join-Path $env:LOCALAPPDATA 'LockReleaseDesktopBackups'
  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
  $backupDir = Join-Path $backupRoot ('before_update_' + (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'))
  if (Test-Path $InstallDir) { Copy-Item $InstallDir $backupDir -Recurse -Force -ErrorAction SilentlyContinue }

  Retry 'Clear old app files' {
    if (Test-Path $InstallDir) {
      Get-ChildItem $InstallDir -Force | Remove-Item -Recurse -Force -ErrorAction Stop
    }
  }
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
  Retry 'Copy new packaged app files' { Copy-Item (Join-Path $src '*') $InstallDir -Recurse -Force -ErrorAction Stop }

  $newAppRoot = Join-Path $InstallDir 'resources\app'
  Set-VersionMarkers $newAppRoot

  $newExe = Join-Path $InstallDir 'Lock Release.exe'
  if (-not (Test-Path $newExe)) { throw "Updated Lock Release.exe was not found at $newExe" }
  Start-Sleep -Seconds 2
  Start-Process -FilePath $newExe -WorkingDirectory $InstallDir
  Log 'V15 packaged update complete and app relaunched'
} catch {
  Log ('FAILED: ' + $_.Exception.Message)
  Add-Type -AssemblyName PresentationFramework -ErrorAction SilentlyContinue
  [System.Windows.MessageBox]::Show(('Lock Release update failed: ' + $_.Exception.Message + ([Environment]::NewLine + [Environment]::NewLine + 'Log: ') + $log), 'Lock Release Update Failed', 'OK', 'Error') | Out-Null
}
`;
}

process.on('uncaughtException', err => {
  appendLog('UNCAUGHT: ' + (err && err.stack || err));
  try { dialog.showErrorBox('Lock Release crashed', String(err && err.message || err)); } catch (_) {}
  app.quit();
});
process.on('unhandledRejection', err => appendLog('UNHANDLED: ' + (err && err.stack || err)));

app.setName(APP_NAME);
app.setAppUserModelId('com.lockrelease.desktop');
try { app.setAboutPanelOptions({ applicationName: APP_NAME, applicationVersion: currentVersion(), iconPath: path.join(appRoot(), 'assets', 'lock-release.png') }); } catch (_) {}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(boot);
}
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) boot(); });
app.on('window-all-closed', () => app.quit());
