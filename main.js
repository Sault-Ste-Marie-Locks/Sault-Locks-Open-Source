const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
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
function currentVersion() {
  try {
    const marker = path.join(appRoot(), '.lock-release-version');
    if (fs.existsSync(marker)) {
      const v = fs.readFileSync(marker, 'utf8').trim();
      if (v) return v;
    }
  } catch (_) {}
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(appRoot(), 'package.json'), 'utf8'));
    if (pkg && pkg.version) return String(pkg.version);
  } catch (_) {}
  try { return app.getVersion(); } catch (_) {}
  return '0.0.0';
}


function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function createUpdateWindow(latestVersion) {
  if (updateWindow && !updateWindow.isDestroyed()) return updateWindow;
  const icon = path.join(appRoot(), 'assets', 'lock-release.ico');
  updateWindow = new BrowserWindow({
    width: 620,
    height: 360,
    resizable: false,
    maximizable: false,
    minimizable: false,
    title: 'Lock Release Updater',
    icon,
    backgroundColor: '#08111f',
    autoHideMenuBar: true,
    alwaysOnTop: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  updateWindow.setMenuBarVisibility(false);
  const logoPath = path.join(appRoot(), 'assets', 'lock-release.png').replace(/\\/g, '/');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Lock Release Updater</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:#08111f;color:#eaf2ff;overflow:hidden}.wrap{height:100vh;padding:30px;background:radial-gradient(circle at top left,rgba(34,197,94,.20),transparent 32%),linear-gradient(135deg,#08111f,#101827 62%,#07111f)}.top{display:flex;gap:16px;align-items:center}.icon{width:66px;height:66px;border-radius:18px;box-shadow:0 18px 48px rgba(0,0,0,.45)}h1{font-size:25px;margin:0 0 5px;font-weight:800;letter-spacing:-.02em}p{margin:0;color:#9fb2cc;font-size:14px;line-height:1.45}.card{margin-top:26px;padding:20px;border:1px solid rgba(148,163,184,.20);border-radius:20px;background:rgba(15,23,42,.78);box-shadow:0 22px 60px rgba(0,0,0,.32)}.row{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:12px}.stage{font-weight:800;font-size:15px;color:#f8fafc}.pct{font-variant-numeric:tabular-nums;color:#dbeafe;font-weight:800}.bar{height:18px;border-radius:999px;background:#162033;overflow:hidden;border:1px solid rgba(148,163,184,.25)}.fill{height:100%;width:0%;background:linear-gradient(90deg,#38bdf8,#22c55e);box-shadow:0 0 24px rgba(34,197,94,.38);transition:width .22s ease}.detail{min-height:44px;margin-top:14px;color:#b6c6dc;font-size:13px;white-space:pre-wrap;line-height:1.4}.subtle{margin-top:14px;color:#77859a;font-size:12px}.foot{position:absolute;left:30px;right:30px;bottom:24px;color:#7f8ea3;font-size:12px}.err .fill{background:linear-gradient(90deg,#f97316,#ef4444)}.done .fill{background:linear-gradient(90deg,#22c55e,#84cc16)}
</style></head><body><div class="wrap"><div class="top"><img class="icon" src="file:///${logoPath}"><div><h1>Updating Lock Release</h1><p>Installing version ${escapeHtml(latestVersion)}. This should only take a minute.</p></div></div><div class="card" id="card"><div class="row"><div class="stage" id="stage">Starting update...</div><div class="pct" id="pct">0%</div></div><div class="bar"><div class="fill" id="fill"></div></div><div class="detail" id="detail">Preparing update.</div><div class="subtle" id="subtle">Do not close this window while files are being replaced.</div></div><div class="foot">Lock Release will restart automatically after the update applies.</div><script>window.setUpdateProgress=function(stage,pct,detail,state){pct=Math.max(0,Math.min(100,Number(pct)||0));document.getElementById('stage').textContent=stage||'Working...';document.getElementById('pct').textContent=Math.round(pct)+'%';document.getElementById('fill').style.width=pct+'%';document.getElementById('detail').textContent=detail||'';document.getElementById('card').className='card '+(state||'');};</script></div></body></html>`;
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
  return String(v || '0.0.0').trim().replace(/^v/i, '').replace(/[^0-9.].*$/, '');
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
  if (!config.checkOnStartup) return;
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
  appendLog(`Installed version: ${installedVersion}; latest release: ${latestVersion}`);
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
function copyFileSafe(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}
function copySourceUpdate(src, dst) {
  const skip = new Set(['node_modules', 'dist', '.git', '.github']);
  fs.mkdirSync(dst, { recursive: true });
  for (const item of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(item.name)) continue;
    const from = path.join(src, item.name);
    const to = path.join(dst, item.name);
    if (item.isDirectory()) {
      if (fs.existsSync(to)) fs.rmSync(to, { recursive: true, force: true });
      fs.cpSync(from, to, { recursive: true, force: true });
    } else if (item.isFile()) {
      copyFileSafe(from, to);
    }
  }
}
function safeVersionWrite(version) {
  try { fs.writeFileSync(path.join(appRoot(), '.lock-release-version'), normalizeVersion(version), 'utf8'); } catch (err) { appendLog('Failed writing version marker: ' + err.message); }
  try {
    const pkgPath = path.join(appRoot(), 'package.json');
    const pkg = readJsonSafe(pkgPath, null);
    if (pkg) {
      pkg.version = normalizeVersion(version);
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
    }
  } catch (err) { appendLog('Failed updating package.json version: ' + err.message); }
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
      '-SourceMode', '0',
      '-AppPid', String(process.pid)
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
  [Parameter(Mandatory=$true)][int]$SourceMode,
  [Parameter(Mandatory=$true)][int]$AppPid
)
$ErrorActionPreference = 'Stop'
$log = Join-Path $env:TEMP 'LockReleaseUpdateInstall.log'
function Log($m){ Add-Content -Path $log -Value ("$(Get-Date -Format o) $m") }
function Retry($Name, [scriptblock]$Action, [int]$Tries = 14) {
  for ($i=1; $i -le $Tries; $i++) {
    try { & $Action; return }
    catch {
      Log ("$Name try $i failed: " + $_.Exception.Message)
      if ($i -eq $Tries) { throw }
      Start-Sleep -Milliseconds 900
    }
  }
}
function Copy-AppSource($From, $To) {
  $skip = @('node_modules', 'dist', '.git', '.github')
  New-Item -ItemType Directory -Path $To -Force | Out-Null
  Get-ChildItem -LiteralPath $From -Force | ForEach-Object {
    if ($skip -contains $_.Name) { return }
    $dest = Join-Path $To $_.Name
    if ($_.PSIsContainer) {
      if (Test-Path $dest) { Remove-Item -LiteralPath $dest -Recurse -Force -ErrorAction SilentlyContinue }
      Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force
    } else {
      Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
    }
  }
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
try {
  Log "Starting Lock Release update install. SourceMode=$SourceMode InstallDir=$InstallDir AppRoot=$AppRoot"
  try { Stop-Process -Id $AppPid -Force -ErrorAction SilentlyContinue } catch {}
  try { Wait-Process -Id $AppPid -Timeout 25 -ErrorAction SilentlyContinue } catch {}
  Start-Sleep -Seconds 2

  $extract = Join-Path $env:TEMP ('LockReleaseExtract_' + [guid]::NewGuid().ToString())
  New-Item -ItemType Directory -Path $extract -Force | Out-Null
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $extract -Force

  if ($SourceMode -eq 1) {
    $srcApp = Find-SourceApp $extract
    if (-not $srcApp) { throw 'Update ZIP did not contain an Electron source app folder.' }

    $backupRoot = Join-Path $env:LOCALAPPDATA 'Lock Release BAT App Backups'
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    $backupDir = Join-Path $backupRoot ('before_update_' + (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'))
    if (Test-Path $AppRoot) { Copy-Item $AppRoot $backupDir -Recurse -Force -ErrorAction SilentlyContinue }

    Retry 'Copy source update files' { Copy-AppSource $srcApp $AppRoot }
    Log 'Source app update files copied'

    $ps = "Set-Location -LiteralPath '$($AppRoot.Replace("'","''"))'; npm install; npx electron ."
    Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-Command',$ps) -WindowStyle Hidden
    Log 'Source mode update complete and app relaunched hidden via PowerShell'
    return
  }

  $src = $null
  if (Test-Path (Join-Path $extract 'Lock Release.exe')) { $src = $extract }
  if (-not $src) {
    $src = Get-ChildItem -Path $extract -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object { Test-Path (Join-Path $_.FullName 'Lock Release.exe') } | Select-Object -First 1 -ExpandProperty FullName
  }
  if (-not $src) { throw 'Update ZIP did not contain Lock Release.exe' }

  $backupRoot = Join-Path $env:LOCALAPPDATA 'Lock Release Desktop Backups'
  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
  $backupDir = Join-Path $backupRoot ('before_update_' + (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'))
  if (Test-Path $InstallDir) { Copy-Item $InstallDir $backupDir -Recurse -Force -ErrorAction SilentlyContinue }

  Retry 'Clear old app files' {
    if (Test-Path $InstallDir) {
      Get-ChildItem $InstallDir -Force | Remove-Item -Recurse -Force -ErrorAction Stop
    }
  }
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
  Retry 'Copy new app files' { Copy-Item (Join-Path $src '*') $InstallDir -Recurse -Force -ErrorAction Stop }
  Log 'New packaged app files copied'

  $newExe = Join-Path $InstallDir 'Lock Release.exe'
  if (-not (Test-Path $newExe)) { throw "Updated Lock Release.exe was not found at $newExe" }
  Start-Sleep -Seconds 1
  Start-Process -FilePath $newExe -WorkingDirectory $InstallDir
  Log 'Packaged mode update complete and app relaunched'
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
