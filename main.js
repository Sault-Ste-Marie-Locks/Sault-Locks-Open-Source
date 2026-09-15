const { app, BrowserWindow, dialog, shell, Tray, Menu, nativeImage, ipcMain } = require('electron');
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
let mainWindowDarkMode = true;
let serverStarted = false;
let booting = false;
let updateCheckInProgress = false;
let updatePollTimer = null;
let lastPromptedUpdateVersion = '';
let lastPromptedUpdateAt = 0;
let updateWindow = null;
let updatePromptWindow = null;
let activeUpdateRequest = null;
let updateCancelRequested = false;
let updaterDarkMode = false;
let tray = null;
let isQuitting = false;
let phoneServerRunning = false;
let lastPhoneServerUrl = '';
const PHONE_LINK_URL = `http://127.0.0.1:${APP_PORT}/phone-link.html`;
const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 1000;
const UPDATE_PROMPT_REMINDER_MS = 30 * 60 * 1000;

function appRoot() { return __dirname; }
function logDir() { const dir = path.join(app.getPath('userData'), 'logs'); fs.mkdirSync(dir, { recursive: true }); return dir; }
function logFile() { return path.join(logDir(), 'electron-app.log'); }
function appendLog(text) { try { fs.appendFileSync(logFile(), text + '\n'); } catch (_) {} }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function applyWindowsTaskbarIdentity(win) {
  if (!win || win.isDestroyed() || process.platform !== 'win32') return;
  try {
    const iconPath = path.join(appRoot(), 'assets', 'lock-release.ico');
    if (typeof win.setAppDetails === 'function') {
      win.setAppDetails({
        appId: 'com.lockrelease.desktop',
        appIconPath: iconPath,
        appIconIndex: 0,
        relaunchCommand: `"${process.execPath}"`,
        relaunchDisplayName: APP_NAME
      });
    }
    if (typeof win.setIcon === 'function' && fs.existsSync(iconPath)) win.setIcon(iconPath);
    if (typeof win.setThumbnailToolTip === 'function') win.setThumbnailToolTip(APP_NAME);
    appendLog('Windows taskbar identity applied: ' + APP_NAME);
  } catch (err) {
    appendLog('Windows taskbar identity failed: ' + (err && err.stack || err));
  }
}
function applyMainTitlebarTheme(win, dark) {
  if (win === mainWindow) mainWindowDarkMode = Boolean(dark);
  if (!win || win.isDestroyed() || process.platform !== 'win32') return;
  try {
    if (typeof win.setTitleBarOverlay === 'function') {
      win.setTitleBarOverlay({
        color: dark ? '#10161d' : '#f3f2f1',
        symbolColor: dark ? '#e5e7eb' : '#201f1e',
        height: 32
      });
    }
    win.setBackgroundColor(dark ? '#10161d' : '#f3f2f1');
  } catch (err) {
    appendLog('Title bar theme update failed: ' + (err && err.message || err));
  }
}

ipcMain.on('locks-app-theme', (event, dark) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && win === mainWindow) applyMainTitlebarTheme(win, Boolean(dark));
});

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
  const skipTop = new Set(['node_modules', 'dist', '.git', '.github', 'update-payload', 'database', 'data', 'data-backup']);
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
function updaterLogoSrc() {
  try {
    const logoFile = path.join(appRoot(), 'assets', 'lock-release.png');
    return `data:image/png;base64,${fs.readFileSync(logoFile).toString('base64')}`;
  } catch (_) {
    return '';
  }
}
async function readAppDarkMode() {
  try {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      const dark = await mainWindow.webContents.executeJavaScript("localStorage.getItem('ssmCanalDashboard.darkMode') === 'true'", true);
      updaterDarkMode = !!dark;
    }
  } catch (err) {
    appendLog('Could not read app dark mode for updater: ' + (err && err.stack || err));
  }
  return updaterDarkMode;
}
function updaterBrowserWindowOptions(width, height, darkMode = updaterDarkMode) {
  const isMac = process.platform === 'darwin';
  const icon = path.join(appRoot(), 'assets', isMac ? 'lock-release.png' : 'lock-release.ico');
  const dark = !!darkMode;
  const common = {
    width,
    height,
    useContentSize: true,
    resizable: false,
    maximizable: false,
    minimizable: true,
    closable: true,
    title: 'Lock Release Update',
    icon,
    backgroundColor: dark ? '#17181a' : '#f4f4f4',
    autoHideMenuBar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  };
  if (isMac) {
    common.titleBarStyle = 'default';
    common.fullscreenable = false;
  } else {
    common.frame = false;
    common.fullscreenable = false;
  }
  return common;
}
function createUpdateWindow(latestVersion, darkMode = updaterDarkMode) {
  if (updateWindow && !updateWindow.isDestroyed()) return updateWindow;
  updateCancelRequested = false;
  const isMac = process.platform === 'darwin';
  const logoSrc = updaterLogoSrc();
  updateWindow = new BrowserWindow(updaterBrowserWindowOptions(isMac ? 500 : 610, isMac ? 154 : 212, darkMode));
  if (process.platform === 'win32') applyWindowsTaskbarIdentity(updateWindow);
  updateWindow.setMenuBarVisibility(false);

  const platformClass = (isMac ? 'mac' : 'windows') + (darkMode ? ' updater-dark' : '');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Locks Tracker</title>
<style>
* {box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}
body{font-family:${isMac ? '-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif' : '"Segoe UI Variable","Segoe UI",Arial,sans-serif'};background:#f4f4f4;color:#1d1d1f}
.mac .titlebar{display:none}.titlebar{-webkit-app-region:drag;user-select:none;height:30px;display:flex;align-items:center;justify-content:space-between;padding-left:10px;background:#e8edf2;color:#26313d;font-size:12px;font-weight:600;border-bottom:1px solid #d2d9e0}.titlebar-controls{height:30px;display:flex;-webkit-app-region:no-drag}.titlebar-btn{width:38px;height:30px!important;min-width:38px!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:inherit!important;font:18px/30px 'Segoe UI Symbol','Segoe UI',sans-serif!important}.titlebar-btn:hover{background:rgba(0,0,0,.08)!important}.titlebar-btn.close:hover{background:#c42b1c!important;color:#fff!important}.actions button{-webkit-app-region:no-drag}
.logo{object-fit:cover;display:block;background:#252525}
.mac .body{height:154px;background:#f7f7f7;padding:18px 18px 12px;display:grid;grid-template-columns:72px 1fr;grid-template-rows:auto 1fr auto;column-gap:16px}
.mac .logo{width:72px;height:72px;border-radius:14px;grid-row:1/3}
.mac h1{font-size:14px;line-height:18px;margin:4px 0 9px;font-weight:700}
.mac .status{font-size:13px;line-height:18px;color:#505050;margin:0 0 8px}
.mac .bar{height:12px;border-radius:999px;background:#d0d0d0;overflow:hidden;margin-top:2px}
.mac .fill{height:100%;width:0%;border-radius:999px;background:#5b9cf6;transition:width .18s linear}
.mac .detail{font-size:13px;line-height:18px;color:#5a5a5a;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mac .actions{grid-column:2;display:flex;justify-content:flex-end;align-items:end}
.mac button{min-width:86px;height:28px;padding:0 14px;border:1px solid #a9a9a9;border-radius:6px;background:linear-gradient(#fff,#f3f3f3);font-size:13px;color:#202020}
.mac button:disabled{opacity:.45}
.windows .body{height:132px;background:#fff;padding:14px 18px;display:grid;grid-template-columns:90px 1fr;column-gap:22px}
.windows .logo{width:82px;height:82px;border-radius:14px;align-self:start}
.windows .content{padding-top:7px}
.windows h1{font-size:17px;line-height:22px;font-weight:400;margin:0 0 12px}
.windows .status{font-size:14px;line-height:18px;margin:0 0 6px}
.windows .bar{height:22px;border:1px solid #c9c9c9;background:#f1f1f1;overflow:hidden}
.windows .fill{height:100%;width:0%;background:#3f7fd3;transition:width .18s linear}
.windows .detail{font-size:13px;line-height:18px;margin-top:5px;color:#222}
.windows .footer{height:44px;border-top:1px solid #d4d4d4;background:#f2f2f2;display:flex;justify-content:flex-end;align-items:center;padding:0 14px;gap:10px}
.windows button{width:auto;min-width:96px;height:32px;padding:0 18px;border:1px solid #c7c7c7;border-radius:6px;background:#fff;font-size:13px;font-weight:600;color:#202020}
.windows button:disabled{color:#8a8a8a;background:#f7f7f7}
.err .fill{background:#c83b32}.done .fill{background:#4a9b58}
body.updater-dark{background:#17181a!important;color:#f5f5f5!important}
.updater-dark.mac .body,.updater-dark.windows .body{background:#202124!important;color:#f5f5f5!important}
.updater-dark .titlebar{background:#111820!important;color:#f5f7fa!important;border-bottom-color:#202b36!important}.updater-dark .titlebar-btn:hover{background:#202b36!important}.updater-dark .titlebar-btn.close:hover{background:#c42b1c!important;color:#fff!important}
.updater-dark.windows .footer{background:#1b1d22!important;border-top-color:#353941!important}
.updater-dark.mac p,.updater-dark.mac .status,.updater-dark.mac .detail,.updater-dark.windows p,.updater-dark.windows .status,.updater-dark.windows .detail{color:#c9cdd2!important}
.updater-dark.mac button,.updater-dark.windows button{background:#25282e!important;border-color:#46505b!important;color:#eef2f6!important}
.updater-dark.mac button:hover,.updater-dark.windows button:hover{background:#30343b!important;border-color:#5a6572!important}
.updater-dark.mac button:disabled,.updater-dark.windows button:disabled{background:#242629!important;color:#7f838a!important}
.updater-dark.mac .primary{background:linear-gradient(#4d8fe9,#2f70c9)!important;border-color:#5d99ea!important;color:#fff!important}
.updater-dark.mac .bar,.updater-dark.windows .bar{background:#303236!important;border-color:#4b4e53!important}
.updater-dark .logo{background:#111214!important}
.updater-dark .titlebar{background:#151d26!important;border-bottom-color:#2b3947!important}
.updater-dark.windows .titlebar-btn{width:46px!important;min-width:46px!important;height:30px!important;padding:0!important;border:0!important;border-radius:0!important;background:#151d26!important;color:#f5f7fa!important}
.updater-dark.windows .titlebar-btn:hover{background:#202b37!important}
.updater-dark.windows .titlebar-btn.close:hover{background:#c42b1c!important;color:#fff!important}</style></head><body class="${platformClass}">
<div class="titlebar"><span>Lock Release Update</span><div class="titlebar-controls"><button class="titlebar-btn" aria-label="Minimize" onclick="location.href='lockrelease-update://minimize'">&#8722;</button><button class="titlebar-btn close" aria-label="Close" onclick="location.href='lockrelease-update://close'">&#215;</button></div></div>
${isMac ? `
<div class="body" id="card">
  ${logoSrc ? `<img class="logo" src="${logoSrc}" alt="">` : '<div class="logo"></div>'}
  <div>
    <h1 id="headline">Updating Locks Tracker...</h1>
    <div class="bar"><div class="fill" id="fill"></div></div>
    <div class="detail" id="detail">Preparing update...</div>
  </div>
  <div class="actions"><button id="cancel" onclick="location.href='lockrelease-update://cancel'">Cancel</button></div>
</div>` : `
<div class="body" id="card">
  ${logoSrc ? `<img class="logo" src="${logoSrc}" alt="">` : '<div class="logo"></div>'}
  <div class="content">
    <h1 id="headline">Updating “Locks Tracker”...</h1>
    <div class="status" id="status">Preparing update...</div>
    <div class="bar"><div class="fill" id="fill"></div></div>
    <div class="detail" id="detail">0% Complete</div>
  </div>
</div>
<div class="footer"><button id="cancel" onclick="location.href='lockrelease-update://cancel'">Cancel</button></div>`}
<script>
window.setUpdateProgress=function(stage,pct,detail,state){
  pct=Math.max(0,Math.min(100,Number(pct)||0));
  var card=document.getElementById('card');
  var fill=document.getElementById('fill');
  var cancel=document.getElementById('cancel');
  fill.style.width=pct+'%';
  card.className=(card.className||'')+' '+(state||'');
  if(document.body.classList.contains('mac')){
    document.getElementById('headline').textContent=state==='done'?'Update complete':state==='err'?'Update failed':'Updating Locks Tracker...';
    document.getElementById('detail').textContent=detail||stage||'Working...';
  }else{
    var label=stage||'Working';
    if(label==='Downloading update') label='Downloading latest version';
    if(!/[.!…]$/.test(label)) label+='...';
    document.getElementById('status').textContent=label;
    document.getElementById('detail').textContent=Math.round(pct)+'% Complete';
  }
  var canCancel=!state && pct<80;
  cancel.disabled=!canCancel;
};
</script></body></html>`;

  updateWindow.webContents.on('will-navigate', (event, url) => {
    if (!String(url).startsWith('lockrelease-update://')) return;
    event.preventDefault();
    let action = '';
    try { action = new URL(url).hostname; } catch (_) {}
    if (action === 'minimize') { try { updateWindow.minimize(); } catch (_) {} return; }
    if (action === 'cancel' || action === 'close') {
      updateCancelRequested = true;
      const err = new Error('Update cancelled by user.');
      err.code = 'LOCK_RELEASE_UPDATE_CANCELLED';
      try { if (activeUpdateRequest) activeUpdateRequest.destroy(err); } catch (_) {}
      try { if (updateWindow && !updateWindow.isDestroyed()) updateWindow.close(); } catch (_) {}
    }
  });
  updateWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  updateWindow.once('ready-to-show', () => {
    try { updateWindow.show(); updateWindow.focus(); } catch (_) {}
  });
  updateWindow.on('close', () => {
    if (!updateCancelRequested && activeUpdateRequest) {
      updateCancelRequested = true;
      const err = new Error('Update cancelled by user.');
      err.code = 'LOCK_RELEASE_UPDATE_CANCELLED';
      try { activeUpdateRequest.destroy(err); } catch (_) {}
    }
  });
  updateWindow.on('closed', () => { updateWindow = null; });
  return updateWindow;
}

function updateProgress(stage, percent, detail, state) {
  appendLog(`UPDATE PROGRESS ${Math.round(percent || 0)}% ${stage || ''} ${detail || ''}`);
  if (!updateWindow || updateWindow.isDestroyed()) return;
  const pct = Number(percent) || 0;
  try { updateWindow.setClosable(true); updateWindow.setMinimizable(true); } catch (_) {}
  const script = `window.setUpdateProgress(${JSON.stringify(stage || 'Working...')}, ${pct}, ${JSON.stringify(detail || '')}, ${JSON.stringify(state || '')})`;
  updateWindow.webContents.executeJavaScript(script).catch(() => {});
}

function showUpdaterPromptWindow(latestVersion, hasAsset, darkMode = updaterDarkMode) {
  return new Promise(resolve => {
    if (updatePromptWindow && !updatePromptWindow.isDestroyed()) {
      try { updatePromptWindow.focus(); } catch (_) {}
      resolve(1);
      return;
    }
    const isMac = process.platform === 'darwin';
    const logoSrc = updaterLogoSrc();
    const width = isMac ? 520 : 610;
    const height = isMac ? 164 : 190;
    updatePromptWindow = new BrowserWindow(updaterBrowserWindowOptions(width, height, darkMode));
    if (process.platform === 'win32') applyWindowsTaskbarIdentity(updatePromptWindow);
    updatePromptWindow.setMenuBarVisibility(false);
    let settled = false;
    const finish = (choice) => {
      if (settled) return;
      settled = true;
      resolve(choice);
      try { if (updatePromptWindow && !updatePromptWindow.isDestroyed()) updatePromptWindow.close(); } catch (_) {}
    };
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Locks Tracker</title>
<style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}
body{font-family:${isMac ? '-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif' : '"Segoe UI Variable","Segoe UI",Arial,sans-serif'};background:#f5f5f5;color:#111}
.mac .titlebar{display:none}.titlebar{-webkit-app-region:drag;user-select:none;height:30px;display:flex;align-items:center;justify-content:space-between;padding-left:10px;background:#e8edf2;color:#26313d;font-size:12px;font-weight:600;border-bottom:1px solid #d2d9e0}.titlebar-controls{height:30px;display:flex;-webkit-app-region:no-drag}.titlebar-btn{width:38px!important;height:30px!important;min-width:38px!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:inherit!important;font:18px/30px 'Segoe UI Symbol','Segoe UI',sans-serif!important}.titlebar-btn:hover{background:rgba(0,0,0,.08)!important}.titlebar-btn.close:hover{background:#c42b1c!important;color:#fff!important}
.logo{object-fit:cover;display:block;background:#252525}
.mac .body{height:164px;background:#f7f7f7;padding:18px 20px 14px;display:grid;grid-template-columns:78px 1fr;grid-template-rows:1fr 34px;column-gap:16px}
.mac .logo{width:74px;height:74px;border-radius:14px;align-self:start}
.mac .text{padding-top:2px}.mac h1{font-size:16px;line-height:21px;margin:0 0 7px;font-weight:700}.mac p{font-size:13px;line-height:18px;margin:0;color:#171717}
.mac .actions{grid-column:2;display:flex;justify-content:flex-end;align-items:end;gap:12px}
.mac button{height:28px;min-width:86px;padding:0 14px;border:1px solid #b8b8b8;border-radius:6px;background:linear-gradient(#fff,#f2f2f2);font-size:13px}
.mac .primary{border-color:#4387e8;background:linear-gradient(#6fa8ff,#347be2);color:#fff;box-shadow:inset 0 1px rgba(255,255,255,.35)}
.windows .body{height:110px;background:#fff;padding:14px 18px;display:grid;grid-template-columns:90px 1fr;column-gap:22px}
.windows .logo{width:82px;height:82px;border-radius:14px}
.windows .text{padding-top:3px}.windows h1{font-size:17px;line-height:22px;font-weight:400;margin:0 0 12px}
.windows p{font-size:14px;line-height:19px;margin:0}
.windows .footer{height:44px;border-top:1px solid #d4d4d4;background:#f2f2f2;display:flex;justify-content:flex-end;align-items:center;padding:0 14px;gap:10px}
.windows button{width:auto;min-width:96px;height:32px;padding:0 18px;border:1px solid #c7c7c7;border-radius:6px;background:#fff;font-size:13px;font-weight:600}
body.updater-dark{background:#17181a!important;color:#f5f5f5!important}
.updater-dark.mac .body,.updater-dark.windows .body{background:#202124!important;color:#f5f5f5!important}
.updater-dark .titlebar{background:#111820!important;color:#f5f7fa!important;border-bottom-color:#202b36!important}.updater-dark .titlebar-btn:hover{background:#202b36!important}.updater-dark .titlebar-btn.close:hover{background:#c42b1c!important;color:#fff!important}
.updater-dark.windows .footer{background:#1b1d22!important;border-top-color:#353941!important}
.updater-dark.mac p,.updater-dark.mac .status,.updater-dark.mac .detail,.updater-dark.windows p,.updater-dark.windows .status,.updater-dark.windows .detail{color:#c9cdd2!important}
.updater-dark.mac button,.updater-dark.windows button{background:#25282e!important;border-color:#46505b!important;color:#eef2f6!important}
.updater-dark.mac button:hover,.updater-dark.windows button:hover{background:#30343b!important;border-color:#5a6572!important}
.updater-dark.mac button:disabled,.updater-dark.windows button:disabled{background:#242629!important;color:#7f838a!important}
.updater-dark.mac .primary{background:linear-gradient(#4d8fe9,#2f70c9)!important;border-color:#5d99ea!important;color:#fff!important}
.updater-dark.mac .bar,.updater-dark.windows .bar{background:#303236!important;border-color:#4b4e53!important}
.updater-dark .logo{background:#111214!important}
.updater-dark .titlebar{background:#151d26!important;border-bottom-color:#2b3947!important}
.updater-dark.windows .titlebar-btn{width:46px!important;min-width:46px!important;height:30px!important;padding:0!important;border:0!important;border-radius:0!important;background:#151d26!important;color:#f5f7fa!important}
.updater-dark.windows .titlebar-btn:hover{background:#202b37!important}
.updater-dark.windows .titlebar-btn.close:hover{background:#c42b1c!important;color:#fff!important}</style></head><body class="${(isMac ? 'mac' : 'windows') + (darkMode ? ' updater-dark' : '')}">
<div class="titlebar"><span>Lock Release Update</span><div class="titlebar-controls"><button class="titlebar-btn" aria-label="Minimize" onclick="location.href='lockrelease-update://minimize'">&#8722;</button><button class="titlebar-btn close" aria-label="Close" onclick="location.href='lockrelease-update://close'">&#215;</button></div></div>
<div class="body">
  ${logoSrc ? `<img class="logo" src="${logoSrc}" alt="">` : '<div class="logo"></div>'}
  <div class="text"><h1>An Update is available on the web</h1><p>Do you want to update “Locks Tracker” to the latest version?</p></div>
  ${isMac ? `<div class="actions"><button onclick="location.href='lockrelease-update://later'">Cancel</button><button class="primary" onclick="location.href='lockrelease-update://${hasAsset ? 'update' : 'github'}'">${hasAsset ? 'Update' : 'Open GitHub'}</button></div>` : ''}
</div>
${isMac ? '' : `<div class="footer"><button onclick="location.href='lockrelease-update://${hasAsset ? 'update' : 'github'}'">${hasAsset ? 'Update' : 'Open GitHub'}</button><button onclick="location.href='lockrelease-update://later'">Cancel</button></div>`}
</body></html>`;
    updatePromptWindow.webContents.on('will-navigate', (event, url) => {
      if (!String(url).startsWith('lockrelease-update://')) return;
      event.preventDefault();
      let action = '';
      try { action = new URL(url).hostname; } catch (_) {}
      if (action === 'minimize') { try { updatePromptWindow.minimize(); } catch (_) {} return; }
      if (action === 'close') { finish(1); return; }
      if (action === 'update') finish(0);
      else if (action === 'github') finish(2);
      else finish(1);
    });
    const revealUpdatePrompt = () => {
      try {
        if (!updatePromptWindow || updatePromptWindow.isDestroyed()) return;
        if (process.platform === 'darwin' && app.dock) app.dock.show();
        updatePromptWindow.setAlwaysOnTop(true);
        updatePromptWindow.setSkipTaskbar(false);
        if (updatePromptWindow.isMinimized()) updatePromptWindow.restore();
        updatePromptWindow.show();
        updatePromptWindow.moveTop();
        updatePromptWindow.focus();
        try { updatePromptWindow.flashFrame(true); } catch (_) {}
        setTimeout(() => {
          try { if (updatePromptWindow && !updatePromptWindow.isDestroyed()) updatePromptWindow.flashFrame(false); } catch (_) {}
        }, 1500);
        appendLog(`Update prompt shown for ${latestVersion}.`);
      } catch (err) {
        appendLog('Could not show update prompt: ' + (err && err.stack || err));
      }
    };
    updatePromptWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    updatePromptWindow.once('ready-to-show', revealUpdatePrompt);
    updatePromptWindow.webContents.once('did-finish-load', revealUpdatePrompt);
    setTimeout(revealUpdatePrompt, 900);
    updatePromptWindow.on('closed', () => {
      updatePromptWindow = null;
      if (!settled) { settled = true; resolve(1); }
    });
  });
}

function readJsonSafe(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}
function updateConfig() {
  return readJsonSafe(path.join(appRoot(), 'update-config.json'), {
    githubRepo: 'Sault-Ste-Marie-Locks/Sault-Locks-Tracker-Updates',
    checkOnStartup: true,
    allowPrerelease: false,
    assetName: 'Lock_Release_Update.zip',
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
  const repo = String(config.githubRepo || 'Sault-Ste-Marie-Locks/Sault-Locks-Open-Source');
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
        'Cache-Control': 'no-cache, no-store, max-age=0',
        'Pragma': 'no-cache',
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
    let settled = false;
    const finishReject = (err) => {
      if (settled) return;
      settled = true;
      activeUpdateRequest = null;
      reject(err);
    };
    const finishResolve = (value) => {
      if (settled) return;
      settled = true;
      activeUpdateRequest = null;
      resolve(value);
    };
    const run = (downloadUrl) => {
      if (updateCancelRequested) {
        const err = new Error('Update cancelled by user.');
        err.code = 'LOCK_RELEASE_UPDATE_CANCELLED';
        finishReject(err);
        return;
      }
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
          activeUpdateRequest = null;
          res.resume();
          run(res.headers.location);
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          finishReject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        const total = Number(res.headers['content-length'] || 0);
        let received = 0;
        const file = fs.createWriteStream(target);
        res.on('data', chunk => {
          received += chunk.length;
          if (typeof onProgress === 'function' && total > 0) onProgress(received, total);
        });
        res.pipe(file);
        file.on('finish', () => file.close(() => finishResolve({ received, total })));
        file.on('error', finishReject);
      });
      activeUpdateRequest = req;
      req.on('error', finishReject);
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
  const dataBackupDir = path.join(userRoot, 'data-backup');
  fs.mkdirSync(dbDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(dataBackupDir, { recursive: true });
  process.env.LOCK_RELEASE_USER_DATA = userRoot;
  process.env.LOCK_RELEASE_DB_DIR = dbDir;
  process.env.LOCK_RELEASE_DATA_DIR = dataDir;
  process.env.LOCK_RELEASE_DATA_BACKUP_DIR = dataBackupDir;
  try { copyDirRecursive(path.join(appRoot(), 'database'), dbDir); } catch (err) { appendLog('DB seed copy skipped: ' + (err && err.message || err)); }
  try { copyDirRecursive(path.join(appRoot(), 'data'), dataDir); } catch (err) { appendLog('Data seed copy skipped: ' + (err && err.message || err)); }
  try { copyDirRecursive(path.join(appRoot(), 'data-backup'), dataBackupDir); } catch (err) { appendLog('Data backup seed copy skipped: ' + (err && err.message || err)); }
  appendLog('Writable data root: ' + userRoot);
  appendLog('Writable SQLite DB: ' + path.join(dbDir, 'soo-locks.db'));
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
    if (process.platform === 'win32') {
      const ps = `$lines = netstat -ano | Select-String ':${APP_PORT}'; foreach($l in $lines){$parts = ($l.ToString() -split '\\s+') | Where-Object { $_ }; if($parts.Length -ge 5){$pid=$parts[-1]; if($pid -match '^\\d+$'){try{taskkill /PID $pid /F | Out-Null}catch{}}}}`;
      execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', ps], { windowsHide: true }, () => resolve());
      return;
    }

    execFile('lsof', ['-ti', `tcp:${APP_PORT}`], (err, stdout) => {
      if (!err && stdout) {
        for (const pid of String(stdout).split(/\s+/).filter(Boolean)) {
          try { process.kill(Number(pid), 'SIGTERM'); } catch (_) {}
        }
      }
      resolve();
    });
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

function localApiJson(pathname, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: APP_PORT,
      path: pathname,
      method,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let parsed = {};
        try { parsed = body ? JSON.parse(body) : {}; } catch (_) { parsed = { raw: body }; }
        if (res.statusCode >= 200 && res.statusCode < 400) return resolve(parsed);
        const err = new Error(`Local API ${method} ${pathname} failed with HTTP ${res.statusCode}`);
        err.response = parsed;
        reject(err);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`Local API ${method} ${pathname} timed out`)));
    req.end();
  });
}
async function refreshPhoneServerState() {
  try {
    const state = await localApiJson('/api/phone-server/status', 'GET');
    phoneServerRunning = !!state.running;
    lastPhoneServerUrl = state.url || '';
    updateTrayMenu();
    return state;
  } catch (err) {
    appendLog('TRAY phone status failed: ' + (err && err.stack || err));
    updateTrayMenu();
    return null;
  }
}
async function setPhoneServerFromTray(running) {
  try {
    const state = await localApiJson('/api/phone-server/' + (running ? 'start' : 'stop'), 'POST');
    phoneServerRunning = !!state.running;
    lastPhoneServerUrl = state.url || '';
    appendLog(`TRAY phone server ${running ? 'started' : 'stopped'}`);
    updateTrayMenu();
    if (mainWindow && !mainWindow.isDestroyed()) {
      try { mainWindow.webContents.send?.('phone-server-state-changed', state); } catch (_) {}
    }
  } catch (err) {
    appendLog('TRAY phone server action failed: ' + (err && err.stack || err));
    try { dialog.showErrorBox('Phone Server', `Could not ${running ? 'start' : 'stop'} the phone server.\n\n${err && err.message || err}`); } catch (_) {}
  }
}
async function showApp(url = APP_URL) {
  try {
    if (!serverStarted) await startBundledServer();
    if (!mainWindow || mainWindow.isDestroyed()) createWindow();
    if (url && mainWindow && !mainWindow.isDestroyed()) {
      try {
        const current = mainWindow.webContents.getURL();
        if (current !== url) mainWindow.loadURL(url);
      } catch (_) { mainWindow.loadURL(url); }
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    updateTrayMenu();
  } catch (err) {
    appendLog('TRAY show app failed: ' + (err && err.stack || err));
  }
}
function hideAppWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
  try { if (process.platform === 'darwin' && app.dock) app.dock.hide(); } catch (_) {}
  updateTrayMenu();
}
function quitFromTray() {
  isQuitting = true;

  // Clear the shared tray reference before destroying it so any late async
  // refresh cannot touch an Electron Tray object that has already been destroyed.
  const trayToDestroy = tray;
  tray = null;
  try {
    if (trayToDestroy && (!trayToDestroy.isDestroyed || !trayToDestroy.isDestroyed())) {
      trayToDestroy.destroy();
    }
  } catch (_) {}

  app.quit();
}
function updateTrayMenu() {
  if (isQuitting || !tray) return;
  try {
    if (tray.isDestroyed && tray.isDestroyed()) {
      tray = null;
      return;
    }
  } catch (_) {
    tray = null;
    return;
  }
  const visible = !!(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible());
  const phoneLabel = phoneServerRunning ? 'Phone Server: Running' : 'Phone Server: Stopped';
  const menu = Menu.buildFromTemplate([
    { label: phoneLabel, enabled: false },
    { type: 'separator' },
    { label: visible ? 'Hide Lock Release' : 'Show Lock Release', click: () => visible ? hideAppWindow() : showApp(APP_URL) },
    { label: 'Open Phone Link', click: () => showApp(PHONE_LINK_URL) },
    { type: 'separator' },
    { label: 'Start Phone Server', enabled: !phoneServerRunning, click: () => setPhoneServerFromTray(true) },
    { label: 'Stop Phone Server', enabled: phoneServerRunning, click: () => setPhoneServerFromTray(false) },
    { label: 'Refresh Phone Server Status', click: () => refreshPhoneServerState() },
    { type: 'separator' },
    { label: 'Check for Updates Now', click: () => checkForUpdatesOnStartup({ force: true, source: 'tray' }).catch(err => appendLog('Tray update check failed: ' + (err && err.stack || err))) },
    { type: 'separator' },
    { label: 'Quit Lock Release', click: () => quitFromTray() }
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip(`${APP_NAME} - ${phoneLabel}${lastPhoneServerUrl ? ' - ' + lastPhoneServerUrl : ''}`);
}
function createTray() {
  if (tray) return tray;
  try {
    const ico = path.join(appRoot(), 'assets', 'lock-release.ico');
    const png = path.join(appRoot(), 'assets', 'lock-release.png');
    // Electron's Tray cannot reliably load .ico on macOS; prefer .png there.
    const iconPath = (process.platform !== 'darwin' && fs.existsSync(ico)) ? ico : png;
    let icon = nativeImage.createFromPath(iconPath);
    if (process.platform === 'darwin' && !icon.isEmpty()) {
      // Menu bar icons must be small (~22pt); the source art is a full-size app icon.
      icon = icon.resize({ width: 22, height: 22 });
    }
    tray = new Tray(icon);
    tray.setToolTip(`${APP_NAME} - Running in background`);
    tray.on('click', () => {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) hideAppWindow();
      else showApp(APP_URL);
    });
    updateTrayMenu();
  } catch (err) {
    appendLog('createTray failed (non-fatal): ' + (err && err.stack || err));
    tray = null;
  }
  return tray;
}

function createWindow() {
  const icon = path.join(appRoot(), 'assets', process.platform === 'darwin' ? 'lock-release.png' : 'lock-release.ico');
  const windowOptions = {
    width: 1420,
    height: 920,
    minWidth: 1050,
    minHeight: 720,
    title: APP_NAME,
    icon,
    backgroundColor: '#f6f7f9',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'desktop-preload.js')
    }
  };
  if (process.platform === 'win32') {
    windowOptions.titleBarStyle = 'hidden';
    windowOptions.titleBarOverlay = { color: '#10161d', symbolColor: '#e5e7eb', height: 32 };
  } else if (process.platform === 'darwin') {
    windowOptions.titleBarStyle = 'hiddenInset';
    windowOptions.trafficLightPosition = { x: 14, y: 9 };
  }
  mainWindow = new BrowserWindow(windowOptions);
  if (process.platform === 'win32') applyWindowsTaskbarIdentity(mainWindow);
  mainWindow.setMenuBarVisibility(false);
  if (process.platform === 'win32') applyMainTitlebarTheme(mainWindow, mainWindowDarkMode);
  if (process.platform === 'win32' || process.platform === 'darwin') {
    const ua = mainWindow.webContents.getUserAgent();
    if (!/LockReleaseDesktop\//i.test(ua)) mainWindow.webContents.setUserAgent(ua + ' LockReleaseDesktop/1.0');
  }
  if (process.platform === 'win32') {
    mainWindow.webContents.on('did-start-navigation', () => applyMainTitlebarTheme(mainWindow, mainWindowDarkMode));
    mainWindow.webContents.on('did-navigate', () => applyMainTitlebarTheme(mainWindow, mainWindowDarkMode));
  }
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => checkForUpdatesOnStartup({ source: 'startup' }).catch(err => appendLog('UPDATE CHECK ERROR: ' + (err && err.stack || err))), 1200);
  });
  mainWindow.loadURL(APP_URL);
  mainWindow.on('close', event => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      try { if (process.platform === 'darwin' && app.dock) app.dock.hide(); } catch (_) {}
      appendLog('Main window hidden to tray/background.');
      updateTrayMenu();
    }
  });
  mainWindow.on('show', () => {
    updateTrayMenu();
    try { if (process.platform === 'darwin' && app.dock) app.dock.show(); } catch (_) {}
  });
  mainWindow.on('hide', () => updateTrayMenu());
  mainWindow.on('minimize', () => {
    try { if (process.platform === 'darwin' && app.dock) app.dock.show(); } catch (_) {}
    updateTrayMenu();
  });
  mainWindow.on('restore', () => {
    try { if (process.platform === 'darwin' && app.dock) app.dock.show(); } catch (_) {}
    updateTrayMenu();
  });
  if (process.platform === 'darwin') {
    const setMacFullscreenLayout = () => {
      try { if (app.dock) app.dock.show(); } catch (_) {}
      const refreshLayout = () => {
        if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return;
        mainWindow.webContents.executeJavaScript(`(() => {
          document.documentElement.classList.remove('mac-native-fullscreen');
          void document.documentElement.offsetHeight;
          window.dispatchEvent(new Event('resize'));
          requestAnimationFrame(() => requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))));
        })();`).catch(() => {});
      };
      refreshLayout();
      setTimeout(refreshLayout, 120);
      setTimeout(refreshLayout, 350);
      updateTrayMenu();
    };
    mainWindow.on('enter-full-screen', setMacFullscreenLayout);
    mainWindow.on('leave-full-screen', setMacFullscreenLayout);
  }
  mainWindow.on('closed', () => { mainWindow = null; updateTrayMenu(); });
}
async function boot() {
  if (booting) return;
  booting = true;
  try {
    await startBundledServer();
    createTray();
    refreshPhoneServerState().catch(err => appendLog('Initial tray phone status failed: ' + (err && err.stack || err)));
    createWindow();
    startBackgroundUpdatePolling();
  } catch (err) {
    appendLog('BOOT ERROR: ' + (err && err.stack || err));
    dialog.showErrorBox('Lock Release could not start', String(err && err.message || err));
    app.quit();
  } finally {
    booting = false;
  }
}


function startBackgroundUpdatePolling() {
  if (updatePollTimer) return;
  appendLog(`Background update polling enabled. Interval=${Math.round(UPDATE_CHECK_INTERVAL_MS / 1000)}s`);
  // Run an independent startup check too, so updates are detected even if the main window stays hidden.
  setTimeout(() => {
    checkForUpdatesOnStartup({ source: 'background-startup' }).catch(err => appendLog('Background startup update check failed: ' + (err && err.stack || err)));
  }, 2500);
  updatePollTimer = setInterval(() => {
    checkForUpdatesOnStartup({ source: 'background' }).catch(err => appendLog('Background update check failed: ' + (err && err.stack || err)));
  }, UPDATE_CHECK_INTERVAL_MS);
  try { if (updatePollTimer.unref) updatePollTimer.unref(); } catch (_) {}
}
function shouldShowUpdatePrompt(latestVersion, force) {
  if (force) return true;
  const now = Date.now();
  if (lastPromptedUpdateVersion === latestVersion && (now - lastPromptedUpdateAt) < UPDATE_PROMPT_REMINDER_MS) {
    appendLog(`Update ${latestVersion} already prompted recently. Skipping duplicate prompt.`);
    return false;
  }
  lastPromptedUpdateVersion = latestVersion;
  lastPromptedUpdateAt = now;
  return true;
}
function bringAppForwardForUpdatePrompt() {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) createWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  } catch (err) {
    appendLog('Could not bring app forward for update prompt: ' + (err && err.stack || err));
  }
  try { updateTrayMenu(); } catch (_) {}
}
async function showUpdateAvailablePrompt(latestVersion, installedVersion, release, repo, asset, config, force) {
  if (!shouldShowUpdatePrompt(latestVersion, force)) return 1;
  const wasHidden = mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible();
  if (wasHidden && tray && tray.displayBalloon) {
    try {
      tray.displayBalloon({
        title: 'Locks Tracker update available',
        content: `Version ${latestVersion} is ready to install.`,
        iconType: 'info'
      });
    } catch (_) {}
  }
  bringAppForwardForUpdatePrompt();
  const hasAsset = !!(asset && (asset.browser_download_url || asset.url));
  const darkMode = await readAppDarkMode();
  appendLog(`Updater theme from app setting: ${darkMode ? 'dark' : 'light'}`);
  return await showUpdaterPromptWindow(latestVersion, hasAsset, darkMode);
}

async function checkForUpdatesOnStartup(options = {}) {
  const force = !!options.force;
  const source = options.source || 'startup';
  if (updateCheckInProgress) {
    appendLog(`Update check skipped because another check is already running. source=${source}`);
    return;
  }
  updateCheckInProgress = true;
  try {
    const config = updateConfig();
    if (!force && !config.checkOnStartup) { appendLog('Updater disabled by update-config.json. Skipping update check.'); return; }
    const repo = String(config.githubRepo || '').trim();
    if (!repo || repo.includes('PUT-YOUR') || !repo.includes('/')) {
      appendLog('Updater skipped: update-config.json has no GitHub repo yet.');
      return;
    }
    if (config.privateRepo && !getGitHubToken(config)) {
      const helpPath = writeTokenHelp(config);
      appendLog('Updater skipped: private repo is enabled but no GitHub token is set. Help: ' + helpPath);
      if (force) {
        const choice = dialog.showMessageBoxSync(mainWindow || undefined, {
          type: 'info',
          title: 'Private GitHub updates need a token',
          message: 'Lock Release is connected to a private GitHub repo.',
          detail: `Private repo: ${repo}\n\nTo check for updates, add a GitHub token once. I created instructions here:\n${helpPath}`,
          buttons: ['Open Instructions Folder', 'Later'],
          defaultId: 0,
          cancelId: 1
        });
        if (choice === 0) shell.openPath(path.dirname(helpPath));
      }
      return;
    }
    const api = `https://api.github.com/repos/${repo}/releases/latest?cacheBust=${Date.now()}`;
    appendLog(`Checking for updates: ${api}; source=${source}; force=${force}`);
    let release;
    try { release = await getJson(api, githubHeaders(config)); }
    catch (err) {
      appendLog('Update check failed: ' + (err && err.stack || err));
      if (force && config.privateRepo && (err.statusCode === 401 || err.statusCode === 403 || err.statusCode === 404)) {
        const helpPath = writeTokenHelp(config);
        dialog.showMessageBoxSync(mainWindow || undefined, {
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
    appendLog(`Installed version: ${installedVersion}; latest release: ${latestVersion}; appRoot=${appRoot()}; source=${source}`);
    if (compareVersions(latestVersion, installedVersion) <= 0) {
      if (force) {
        dialog.showMessageBoxSync(mainWindow || undefined, {
          type: 'info',
          title: 'Lock Release is up to date',
          message: `Lock Release is already on version ${installedVersion}.`,
          buttons: ['OK']
        });
      }
      return;
    }

    const assets = Array.isArray(release.assets) ? release.assets : [];
    let asset = assets.find(a => a && a.name === config.assetName);

    if (!asset) asset = assets.find(a => a && /^Lock_Release_Update\.zip$/i.test(a.name || ''));
    if (!asset && process.platform === 'darwin') {
      const archLabel = process.arch === 'arm64' ? 'Apple[_\\s-]*Silicon' : 'Intel';
      const macRe = new RegExp(`Lock[_\\s-]*Release.*Mac.*${archLabel}.*\\.zip$`, 'i');
      asset = assets.find(a => a && macRe.test(a.name || ''));
    }
    if (!asset && process.platform === 'win32') {
      asset = assets.find(a => a && /Lock[_\s-]*Release.*Windows.*\.zip$/i.test(a.name || ''));
    }
    if (!asset && process.platform !== 'darwin') {
      asset = assets.find(a => a && /\.zip$/i.test(a.name || ''));
    }

    const result = await showUpdateAvailablePrompt(latestVersion, installedVersion, release, repo, asset, config, force);
    if (result === 2) { shell.openExternal(release.html_url || `https://github.com/${repo}/releases/latest`); return; }
    if (result !== 0) return;
    if (!asset || (!asset.browser_download_url && !asset.url)) return;

    const downloadUrl = (config.privateRepo && asset.url) ? asset.url : asset.browser_download_url;
    await downloadAndInstallUpdate(downloadUrl, latestVersion, config);
  } finally {
    updateCheckInProgress = false;
  }
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

  if (process.platform === 'win32') {
    const ps = `Expand-Archive -LiteralPath '${String(zipPath).replace(/'/g,"''")}' -DestinationPath '${String(extractDir).replace(/'/g,"''")}' -Force`;
    await runProcess('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', ps]);
    return;
  }

  if (process.platform === 'darwin') {
    await runProcess('/usr/bin/ditto', ['-x', '-k', zipPath, extractDir]);
    return;
  }

  await runProcess('unzip', ['-o', zipPath, '-d', extractDir]);
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
  const skipTop = new Set(['node_modules', 'dist', '.git', '.github', 'update-payload', 'database', 'data', 'data-backup']);
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
function winCommandArg(v) {
  return '"' + String(v ?? '').replace(/"/g, '\"') + '"';
}
function vbsString(v) {
  return '"' + String(v ?? '').replace(/"/g, '""') + '"';
}
function spawnHiddenWindowsCommand(command, dir, label) {
  const root = dir || os.tmpdir();
  fs.mkdirSync(root, { recursive: true });
  const launcher = path.join(root, 'lock-release-' + (label || 'hidden') + '-' + process.pid + '-' + Date.now() + '.vbs');
  const body = [
    'On Error Resume Next',
    'Set sh = CreateObject("WScript.Shell")',
    'sh.Run ' + vbsString(command) + ', 0, False',
    'WScript.Sleep 750',
    'Set fso = CreateObject("Scripting.FileSystemObject")',
    'fso.DeleteFile WScript.ScriptFullName, True'
  ].join('\r\n');
  fs.writeFileSync(launcher, body, 'utf8');
  const child = spawn('wscript.exe', ['//B', '//Nologo', launcher], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  return launcher;
}
function relaunchPackagedAppAutoOpen() {
  const exePath = process.execPath;
  const workDir = path.dirname(process.execPath);
  appendLog('Auto-open relaunch requested. platform=' + process.platform + '; exe=' + exePath + '; cwd=' + workDir);

  try {
    app.relaunch({ execPath: exePath, args: [] });
    appendLog('Electron app.relaunch scheduled.');
  } catch (err) {
    appendLog('app.relaunch failed: ' + (err && err.message || err));
  }

  if (process.platform === 'win32') {
    try {
      const processName = path.basename(exePath, path.extname(exePath)).replace(/'/g, "''");
      const ps = `Start-Sleep -Seconds 6; if (-not (Get-Process -Name '${processName}' -ErrorAction SilentlyContinue)) { Start-Process -FilePath '${psSingleQuote(exePath)}' -WorkingDirectory '${psSingleQuote(workDir)}' }`;
      const command = ['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', ps].map(winCommandArg).join(' ');
      spawnHiddenWindowsCommand(command, os.tmpdir(), 'relaunch');
      appendLog('Hidden Windows fallback relaunch scheduled.');
    } catch (err) {
      appendLog('Hidden Windows fallback relaunch failed: ' + (err && err.message || err));
    }
  }

  setTimeout(() => {
    appendLog('Exiting current process for relaunch.');
    app.exit(0);
  }, 900);
}
function relaunchSourceAppHidden() {
  if (process.platform === 'win32') {
    const root = appRoot().replace(/'/g, "''");
    const ps = `Start-Sleep -Seconds 1; Set-Location -LiteralPath '${root}'; npm install | Out-File -FilePath (Join-Path '${root}' 'launcher-install.log') -Append; npx electron .`;
    const command = ['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', ps].map(winCommandArg).join(' ');
    spawnHiddenWindowsCommand(command, os.tmpdir(), 'source-relaunch');
    return;
  }

  const child = spawn('/bin/sh', ['-lc', 'sleep 1; npm install >> launcher-install.log 2>&1; npx electron . >> launcher-install.log 2>&1'], {
    cwd: appRoot(),
    detached: true,
    stdio: 'ignore'
  });
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
  updateProgress('Checking update package', 82, 'Verifying the update package...');
  await expandZip(zipPath, extractDir);

  const srcApp = findSourceApp(extractDir);
  appendLog('Packaged update app folder found: ' + srcApp);
  if (!srcApp) return false;

  // V17 fix: apply the update directly before quitting and use native auto-open relaunch.
  // The external helper was not reliably running on some PCs, so the files/markers stayed at 0.0.0.
  // Since this app uses an unpacked resources/app folder, HTML/CSS/JS/package files can be copied
  // while Electron is still running. We delta-copy only changed files, write both version markers,
  // then use a tiny relaunch helper only for reopening the EXE after quit.
  updateProgress('Applying update', 90, 'Copying only changed app files...');
  const stats = copySourceUpdate(srcApp, appRoot());

  updateProgress('Writing version', 96, 'Saving installed version so this update is not offered again...');
  safeVersionWrite(latestVersion);
  appendLog(`V17 direct update applied. latest=${latestVersion}; copied=${stats && stats.copied}; skipped=${stats && stats.skipped}; appRoot=${appRoot()}`);

  updateProgress('Update complete', 100, 'Lock Release was updated. Restarting now...', 'done');
  await wait(900);
  relaunchPackagedAppAutoOpen();
  return true;
}


async function downloadAndInstallUpdate(downloadUrl, latestVersion, config) {
  const tempDir = path.join(os.tmpdir(), `LockReleaseUpdate_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  const zipPath = path.join(tempDir, 'Lock_Release_Update.zip');
  updateCancelRequested = false;
  activeUpdateRequest = null;

  try {
    createUpdateWindow(latestVersion, updaterDarkMode);
    updateProgress('Preparing update', 4, 'Creating temporary update folder...');
    await wait(350);

    const headers = (config && config.privateRepo) ? githubHeaders(config, 'application/octet-stream') : {};
    updateProgress('Downloading update', 8, 'Connecting to the latest version...');
    const downloadStartedAt = Date.now();
    await downloadFile(downloadUrl, zipPath, headers, (received, total) => {
      const pct = total > 0 ? 8 + (received / total) * 68 : 40;
      const mb = (received / 1024 / 1024).toFixed(1);
      const totalMb = total > 0 ? (total / 1024 / 1024).toFixed(1) : '?';
      const elapsedSeconds = Math.max(1, (Date.now() - downloadStartedAt) / 1000);
      const bytesPerSecond = received / elapsedSeconds;
      const remainingSeconds = (total > received && bytesPerSecond > 0) ? (total - received) / bytesPerSecond : 0;
      let eta = '';
      if (remainingSeconds > 0 && Number.isFinite(remainingSeconds)) {
        if (remainingSeconds < 60) eta = ` — About ${Math.max(1, Math.ceil(remainingSeconds))} seconds remaining`;
        else eta = ` — About ${Math.max(1, Math.ceil(remainingSeconds / 60))} minutes remaining`;
      }
      updateProgress('Downloading update', pct, `${mb} MB of ${totalMb} MB${eta}`);
    });

    const sourceMode = !app.isPackaged || !/resources[\\/]app$/i.test(appRoot());
    appendLog(`Update downloaded. sourceMode=${sourceMode}; appRoot=${appRoot()}; isPackaged=${app.isPackaged}`);
    if (sourceMode) {
      await installSourceModeUpdate(zipPath, latestVersion, tempDir);
      return;
    }

    const didPackagedSourceUpdate = await installPackagedSourceUpdate(zipPath, latestVersion, tempDir);
    if (didPackagedSourceUpdate) return;

    if (process.platform !== 'win32') {
      throw new Error('The downloaded macOS update did not contain a source-update payload. Please install the latest Mac build manually.');
    }

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
    const command = ['powershell.exe', ...args].map(winCommandArg).join(' ');
    spawnHiddenWindowsCommand(command, tempDir, 'installer');
    setTimeout(() => app.quit(), 400);
  } catch (err) {
    if (updateCancelRequested || (err && err.code === 'LOCK_RELEASE_UPDATE_CANCELLED')) {
      appendLog('Update cancelled by user.');
      try { if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true }); } catch (_) {}
      return;
    }
    appendLog('UPDATE INSTALL ERROR: ' + (err && err.stack || err));
    updateProgress('Update failed', 100, `${err && err.message || err}\n\nLog file: ${logFile()}`, 'err');
    dialog.showErrorBox('Lock Release update failed', `${err && err.message || err}\n\nLog file:\n${logFile()}`);
  } finally {
    activeUpdateRequest = null;
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
  $skip = @('node_modules', 'dist', '.git', '.github', 'update-payload', 'database', 'data', 'data-backup')
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

  // Do not show a crash popup for harmless cleanup races while the user is quitting.
  if (isQuitting) return;

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
    showApp(APP_URL);
  });
  app.whenReady().then(() => {
    try { createTray(); } catch (err) { appendLog('createTray threw (non-fatal): ' + (err && err.stack || err)); }
    return boot();
  });
}
app.on('before-quit', () => { isQuitting = true; });
app.on('will-quit', () => {
  isQuitting = true;
  const trayToDestroy = tray;
  tray = null;
  try { if (trayToDestroy && (!trayToDestroy.isDestroyed || !trayToDestroy.isDestroyed())) trayToDestroy.destroy(); } catch (_) {}
  appendLog('Application quitting fully; tray/menu-bar icon destroyed.');
});
app.on('activate', () => { showApp(APP_URL); });
app.on('window-all-closed', () => {
  // Keep Lock Release running in the background/tray. Use the tray Quit item to exit.
  appendLog('All windows closed; staying alive in tray/background.');
});
