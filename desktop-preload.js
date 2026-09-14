const { ipcRenderer } = require('electron');

const TITLEBAR_ID = 'locks-desktop-titlebar';
const THEME_KEY = 'ssmCanalDashboard.darkMode';
const isMac = process.platform === 'darwin';
let maximizeButton = null;

function svgIcon(name) {
  if (name === 'minimize') return '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8"/></svg>';
  if (name === 'maximize') return '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.25" y="2.25" width="7.5" height="7.5" rx=".4"/></svg>';
  if (name === 'restore') return '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.25h5.25v5.25M2.25 4h5.5v5.75h-5.5z"/></svg>';
  return '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7m0-7l-7 7"/></svg>';
}

function darkModeEnabled() {
  try {
    return document.body?.classList.contains('dark-mode') ||
      document.documentElement.classList.contains('app-dark') ||
      localStorage.getItem(THEME_KEY) === 'true';
  } catch (_) {
    return false;
  }
}
function setMaximized(maximized) {
  if (!maximizeButton) return;
  maximizeButton.innerHTML = svgIcon(maximized ? 'restore' : 'maximize');
  maximizeButton.title = maximized ? 'Restore' : 'Maximize';
  maximizeButton.setAttribute('aria-label', maximizeButton.title);
}

function controlButton(action, title, icon) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `locks-window-control locks-window-${action}`;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.innerHTML = svgIcon(icon);
  button.addEventListener('click', () => ipcRenderer.send('locks-window-control', action));
  return button;
}

function installEarlyLayout() {
  document.documentElement.classList.add('locks-desktop-window');
  document.documentElement.dataset.locksDesktopTheme = darkModeEnabled() ? 'dark' : 'light';
  const style = document.createElement('style');
  style.id = 'locks-desktop-titlebar-style';
  style.textContent = `
html.locks-desktop-window{--locks-titlebar-height:38px}
html.locks-desktop-window::before{content:"";position:fixed;inset:0 0 auto 0;height:var(--locks-titlebar-height);z-index:2147483646;background:#fff;border-bottom:1px solid #edebe9;pointer-events:none}
html[data-locks-desktop-theme="dark"]::before{background:#111827;border-bottom-color:#273449}
html.locks-desktop-window body{padding-top:var(--locks-titlebar-height)!important}
html.locks-desktop-window .app-shell{min-height:calc(100vh - var(--locks-titlebar-height))!important}
html.locks-desktop-window .topbar{top:calc(var(--locks-titlebar-height) + 12px)!important}
#${TITLEBAR_ID}{position:fixed;inset:0 0 auto 0;height:var(--locks-titlebar-height);z-index:2147483647;display:flex;align-items:stretch;justify-content:flex-end;-webkit-app-region:drag;user-select:none;background:transparent;color:#201f1e}
html[data-locks-desktop-theme="dark"] #${TITLEBAR_ID}{color:#e5e7eb}
#${TITLEBAR_ID} .locks-window-controls{height:100%;display:flex;align-items:stretch;margin-left:auto;-webkit-app-region:no-drag}
#${TITLEBAR_ID} .locks-window-control{width:46px;height:100%;display:grid;place-items:center;border:0;border-radius:0;padding:0;margin:0;background:transparent;color:inherit;outline:none;-webkit-app-region:no-drag}
#${TITLEBAR_ID} .locks-window-control:hover{background:#f3f2f1}
html[data-locks-desktop-theme="dark"] #${TITLEBAR_ID} .locks-window-control:hover{background:#1f2937}
#${TITLEBAR_ID} .locks-window-close:hover,html[data-locks-desktop-theme="dark"] #${TITLEBAR_ID} .locks-window-close:hover{background:#c42b1c;color:#fff}
#${TITLEBAR_ID} .locks-window-control:focus-visible{box-shadow:inset 0 0 0 2px #0f6cbd}
#${TITLEBAR_ID} .locks-window-control svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.15;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
@media print{#${TITLEBAR_ID}{display:none!important}html.locks-desktop-window::before{display:none!important}html.locks-desktop-window body{padding-top:0!important}html.locks-desktop-window .topbar{top:12px!important}}
`;
  (document.head || document.documentElement).appendChild(style);
}

function syncTheme() {
  document.documentElement.dataset.locksDesktopTheme = darkModeEnabled() ? 'dark' : 'light';
}

function mountTitlebar() {
  if (document.getElementById(TITLEBAR_ID)) return;
  const bar = document.createElement('div');
  bar.id = TITLEBAR_ID;
  bar.className = isMac ? 'mac' : 'windows';
  bar.setAttribute('aria-label', 'Window controls');
  if (!isMac) {
    const controls = document.createElement('div');
    controls.className = 'locks-window-controls';
    controls.append(
      controlButton('minimize', 'Minimize', 'minimize'),
      maximizeButton = controlButton('toggle-maximize', 'Maximize', 'maximize'),
      controlButton('close', 'Close', 'close')
    );
    bar.appendChild(controls);
    bar.addEventListener('dblclick', event => {
      if (!event.target.closest('.locks-window-controls')) {
        ipcRenderer.send('locks-window-control', 'toggle-maximize');
      }
    });
    ipcRenderer.invoke('locks-window-is-maximized').then(setMaximized).catch(() => {});
  }

  document.body.prepend(bar);
  syncTheme();
  const observer = new MutationObserver(syncTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('storage', event => {
    if (event.key === THEME_KEY) syncTheme();
  });
}
installEarlyLayout();
ipcRenderer.on('locks-window-maximized', (_event, maximized) => {
  setMaximized(Boolean(maximized));
});

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', mountTitlebar, { once: true });
} else {
  mountTitlebar();
}
