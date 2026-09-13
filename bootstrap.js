const childProcess = require('child_process');
const { EventEmitter } = require('events');

function makeCompletedChild() {
  const child = new EventEmitter();
  child.stdout = null;
  child.stderr = null;
  child.pid = 0;
  child.unref = () => child;
  child.kill = () => true;
  return child;
}

function decodePowerShellSingleQuoted(value) {
  return String(value || '').replace(/''/g, "'");
}

if (process.platform === 'darwin') {
  const realExecFile = childProcess.execFile.bind(childProcess);
  const realSpawn = childProcess.spawn.bind(childProcess);

  // main.js was originally written around Windows helpers. Keep the proven
  // updater logic, but translate the ZIP extraction step to a native macOS tool.
  childProcess.execFile = function patchedExecFile(file, args, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    const executable = String(file || '').toLowerCase();
    if (executable.endsWith('powershell.exe')) {
      const command = Array.isArray(args) ? args.join(' ') : '';
      const expand = command.match(/Expand-Archive\s+-LiteralPath\s+'((?:''|[^'])*)'\s+-DestinationPath\s+'((?:''|[^'])*)'\s+-Force/i);

      if (expand) {
        const zipPath = decodePowerShellSingleQuoted(expand[1]);
        const extractDir = decodePowerShellSingleQuoted(expand[2]);
        return realExecFile('/usr/bin/ditto', ['-x', '-k', zipPath, extractDir], options || {}, callback);
      }

      // Windows-only maintenance commands (for example killing an old port)
      // are unnecessary on macOS. Complete them harmlessly instead of throwing
      // ENOENT for powershell.exe.
      const child = makeCompletedChild();
      process.nextTick(() => {
        if (typeof callback === 'function') callback(null, '', '');
        child.emit('exit', 0);
        child.emit('close', 0);
      });
      return child;
    }

    return realExecFile(file, args, options || {}, callback);
  };

  childProcess.spawn = function patchedSpawn(file, args, options) {
    const executable = String(file || '').toLowerCase();

    // main.js already schedules Electron's native app.relaunch(). The cmd.exe
    // helper is only a Windows fallback, so it must not be launched on macOS.
    if (executable.endsWith('cmd.exe') || executable.endsWith('powershell.exe')) {
      const child = makeCompletedChild();
      process.nextTick(() => {
        child.emit('spawn');
        child.emit('exit', 0);
        child.emit('close', 0);
      });
      return child;
    }

    return realSpawn(file, args, options);
  };
}

require('./main.js');
