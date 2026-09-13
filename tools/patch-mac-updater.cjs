const fs = require('fs');
const path = require('path');
const target = process.argv[2] || path.join(process.cwd(), 'main.js');
let s = fs.readFileSync(target, 'utf8');

function replaceExact(oldText, newText, label) {
  if (!s.includes(oldText)) throw new Error(`Mac updater repair failed: could not find ${label}`);
  s = s.replace(oldText, () => newText);
}

replaceExact("    assetName: 'Lock_Release_Windows.zip',", "    assetName: 'Lock_Release_Update.zip',", 'default update asset');

replaceExact(`function killOldPort() {
  return new Promise(resolve => {
    const ps = \`$lines = netstat -ano | Select-String ':\${APP_PORT}'; foreach($l in $lines){$parts = ($l.ToString() -split '\\\\s+') | Where-Object { $_ }; if($parts.Length -ge 5){$pid=$parts[-1]; if($pid -match '^\\\\d+$'){try{taskkill /PID $pid /F | Out-Null}catch{}}}}\`;
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { windowsHide: true }, () => resolve());
  });
}`,
`function killOldPort() {
  return new Promise(resolve => {
    if (process.platform === 'win32') {
      const ps = \`$lines = netstat -ano | Select-String ':\${APP_PORT}'; foreach($l in $lines){$parts = ($l.ToString() -split '\\\\s+') | Where-Object { $_ }; if($parts.Length -ge 5){$pid=$parts[-1]; if($pid -match '^\\\\d+$'){try{taskkill /PID $pid /F | Out-Null}catch{}}}}\`;
      execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { windowsHide: true }, () => resolve());
      return;
    }

    execFile('lsof', ['-ti', \`tcp:\${APP_PORT}\`], (err, stdout) => {
      if (!err && stdout) {
        for (const pid of String(stdout).split(/\\s+/).filter(Boolean)) {
          try { process.kill(Number(pid), 'SIGTERM'); } catch (_) {}
        }
      }
      resolve();
    });
  });
}`,
'cross-platform port cleanup');

replaceExact(`    const assets = Array.isArray(release.assets) ? release.assets : [];
    let asset = assets.find(a => a && a.name === config.assetName);
    if (!asset) asset = assets.find(a => a && /Lock[_\\s-]*Release.*Windows.*\\.zip$/i.test(a.name || ''));
    if (!asset) asset = assets.find(a => a && /\\.zip$/i.test(a.name || ''));`,
`    const assets = Array.isArray(release.assets) ? release.assets : [];
    let asset = assets.find(a => a && a.name === config.assetName);

    if (!asset) asset = assets.find(a => a && /^Lock_Release_Update\\.zip$/i.test(a.name || ''));
    if (!asset && process.platform === 'darwin') {
      const archLabel = process.arch === 'arm64' ? 'Apple[_\\\\s-]*Silicon' : 'Intel';
      const macRe = new RegExp(\`Lock[_\\\\s-]*Release.*Mac.*\${archLabel}.*\\\\.zip$\`, 'i');
      asset = assets.find(a => a && macRe.test(a.name || ''));
    }
    if (!asset && process.platform === 'win32') {
      asset = assets.find(a => a && /Lock[_\\s-]*Release.*Windows.*\\.zip$/i.test(a.name || ''));
    }
    if (!asset && process.platform !== 'darwin') {
      asset = assets.find(a => a && /\\.zip$/i.test(a.name || ''));
    }`,
'platform-specific asset selection');

replaceExact(`async function expandZip(zipPath, extractDir) {
  fs.mkdirSync(extractDir, { recursive: true });
  const ps = \`Expand-Archive -LiteralPath '\${String(zipPath).replace(/'/g,"''")}' -DestinationPath '\${String(extractDir).replace(/'/g,"''")}' -Force\`;
  await runProcess('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps]);
}`,
`async function expandZip(zipPath, extractDir) {
  fs.mkdirSync(extractDir, { recursive: true });

  if (process.platform === 'win32') {
    const ps = \`Expand-Archive -LiteralPath '\${String(zipPath).replace(/'/g,"''")}' -DestinationPath '\${String(extractDir).replace(/'/g,"''")}' -Force\`;
    await runProcess('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps]);
    return;
  }

  if (process.platform === 'darwin') {
    await runProcess('/usr/bin/ditto', ['-x', '-k', zipPath, extractDir]);
    return;
  }

  await runProcess('unzip', ['-o', zipPath, '-d', extractDir]);
}`,
'cross-platform zip extraction');

replaceExact(`function relaunchPackagedAppAutoOpen() {
  const exePath = process.execPath;
  const workDir = path.dirname(process.execPath);
  appendLog('V17 auto-open relaunch requested. exe=' + exePath + '; cwd=' + workDir);

  // First use Electron's native relaunch. This is the cleanest way to reopen the app after update.
  try {
    app.relaunch({ execPath: exePath, args: [] });
    appendLog('V17 Electron app.relaunch scheduled.');
  } catch (err) {
    appendLog('V17 app.relaunch failed: ' + (err && err.message || err));
  }

  // Safety fallback: after the old process exits, start the app only if it is not already running.
  // This avoids the update completing but leaving the user with no app window.
  try {
    const cmd = 'timeout /t 6 /nobreak >nul & tasklist /FI "IMAGENAME eq Lock Release.exe" | find /I "Lock Release.exe" >nul || start "" /D ' + cmdQuote(workDir) + ' ' + cmdQuote(exePath);
    const child = spawn('cmd.exe', ['/d', '/s', '/c', cmd], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    appendLog('V17 fallback relaunch helper scheduled through cmd.exe.');
  } catch (err) {
    appendLog('V17 fallback relaunch helper failed: ' + (err && err.message || err));
  }

  // Force exit instead of app.quit(); quit can be cancelled by windows or before-quit handlers.
  setTimeout(() => {
    appendLog('V17 exiting current process for relaunch.');
    app.exit(0);
  }, 900);
}
function relaunchSourceAppHidden() {
  const root = appRoot().replace(/'/g, "''");
  const ps = \`Start-Sleep -Seconds 1; Set-Location -LiteralPath '\${root}'; npm install | Out-File -FilePath (Join-Path '\${root}' 'launcher-install.log') -Append; npx electron .\`;
  const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', ps], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}`,
`function relaunchPackagedAppAutoOpen() {
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
      const cmd = 'timeout /t 6 /nobreak >nul & tasklist /FI "IMAGENAME eq Lock Release.exe" | find /I "Lock Release.exe" >nul || start "" /D ' + cmdQuote(workDir) + ' ' + cmdQuote(exePath);
      const child = spawn('cmd.exe', ['/d', '/s', '/c', cmd], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.unref();
      appendLog('Windows fallback relaunch helper scheduled through cmd.exe.');
    } catch (err) {
      appendLog('Windows fallback relaunch helper failed: ' + (err && err.message || err));
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
    const ps = \`Start-Sleep -Seconds 1; Set-Location -LiteralPath '\${root}'; npm install | Out-File -FilePath (Join-Path '\${root}' 'launcher-install.log') -Append; npx electron .\`;
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', ps], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
    return;
  }

  const child = spawn('/bin/sh', ['-lc', 'sleep 1; npm install >> launcher-install.log 2>&1; npx electron . >> launcher-install.log 2>&1'], {
    cwd: appRoot(),
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
}`,
'cross-platform relaunch');

replaceExact("  const zipPath = path.join(tempDir, 'Lock_Release_Windows.zip');", "  const zipPath = path.join(tempDir, 'Lock_Release_Update.zip');", 'download filename');

replaceExact(`    const didPackagedSourceUpdate = await installPackagedSourceUpdate(zipPath, latestVersion, tempDir);
    if (didPackagedSourceUpdate) return;

    updateProgress('Preparing installer', 84, 'Update downloaded. Preparing safe installer...');`,
`    const didPackagedSourceUpdate = await installPackagedSourceUpdate(zipPath, latestVersion, tempDir);
    if (didPackagedSourceUpdate) return;

    if (process.platform !== 'win32') {
      throw new Error('The downloaded macOS update did not contain a source-update payload. Please install the latest Mac build manually.');
    }

    updateProgress('Preparing installer', 84, 'Update downloaded. Preparing safe installer...');`,
'non-Windows PowerShell installer guard');

fs.writeFileSync(target, s, 'utf8');
console.log(`Patched macOS updater in ${target}`);
