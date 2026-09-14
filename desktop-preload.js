const { ipcRenderer } = require('electron');

const TITLEBAR_ID = 'locks-desktop-titlebar';
const THEME_KEY = 'ssmCanalDashboard.darkMode';
const isMac = process.platform === 'darwin';
let maximizeButton = null;

function svgIcon(name) {
  if (name === 'minimize') return '<svg viewBox="0 0 12 12"><path d="M2 6h8"/></svg>';
  if (name === 'maximize') return '<svg viewBox="0 0 12 12"><rect x="2.25" y="2.25" width="7.5" height="7.5" rx=".4"/></svg>';
  if (name === 'restore') return '<svg viewBox="0 0 12 12"><path d="M4 2.25h5.25v5.25M2.25 4h5.5v5.75h-5.5z"/></svg>';
  return '<svg viewBox="0 0 12 12"><path d="M2.5 2.5l7 7m0-7l-7 7"/></svg>';
}

function darkModeEnabled() {
  try {
    return document.body?.classList.contains('dark-mode') ||
      document.documentElement.classList.contains('app-dark') ||
      localStorage.getItem(THEME_KEY) === 'true';
  } catch (_) { return false; }
}

function applyTheme() {
  document.documentElement.dataset.desktopTheme = darkModeEnabled() ? 'dark' : 'light';
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

function injectStyle() {
  if (document.getElementById('locks-desktop-titlebar-style')) return;
  document.documentElement.classList.add('locks-desktop-window');
  const style = document.createElement('style');
  style.id = 'locks-desktop-titlebar-style';  style.textContent = `
html.locks-desktop-window{--desktop-titlebar-height:32px}
html.locks-desktop-window body{margin:0!important;padding-top:var(--desktop-titlebar-height)!important}
html.locks-desktop-window .app-shell{min-height:calc(100vh - var(--desktop-titlebar-height))!important}
html.locks-desktop-window .topbar{top:calc(var(--desktop-titlebar-height) + 12px)!important}
#${TITLEBAR_ID}{position:fixed;top:0;left:0;right:0;height:var(--desktop-titlebar-height);z-index:2147483647;display:flex;align-items:stretch;justify-content:space-between;-webkit-app-region:drag;user-select:none;background:#191919;color:#e5e7eb;border-bottom:1px solid #2f2f2f}
html[data-desktop-theme="light"] #${TITLEBAR_ID}{background:#ffffff;color:#201f1e;border-bottom-color:#edebe9}
#${TITLEBAR_ID} .locks-titlebar-left{flex:1;display:flex;align-items:center;min-width:0;padding:0 12px}
#${TITLEBAR_ID} .locks-titlebar-spacer{flex:1}
#${TITLEBAR_ID} .locks-window-controls{display:flex;align-items:stretch;margin-left:auto;-webkit-app-region:no-drag}
#${TITLEBAR_ID} .locks-window-control{width:46px;height:100%;border:0;background:transparent;color:inherit;display:grid;place-items:center;padding:0;margin:0;outline:none;-webkit-app-region:no-drag}
#${TITLEBAR_ID} .locks-window-control:hover{background:rgba(255,255,255,.08)}
html[data-desktop-theme="light"] #${TITLEBAR_ID} .locks-window-control:hover{background:rgba(0,0,0,.06)}
#${TITLEBAR_ID} .locks-window-close:hover{background:#da373c;color:#fff}
#${TITLEBAR_ID} .locks-window-control:focus-visible{box-shadow:inset 0 0 0 2px #0f6cbd}
#${TITLEBAR_ID} .locks-window-control svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.15;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
@media print{#${TITLEBAR_ID}{display:none!important}html.locks-desktop-window body{padding-top:0!important}html.locks-desktop-window .topbar{top:12px!important}}
`;
  (document.head || document.documentElement).appendChild(style);
}

function mountTitlebar() {
  if (isMac || document.getElementById(TITLEBAR_ID)) return;  const bar = document.createElement('div');
  bar.id = TITLEBAR_ID;

  const left = document.createElement('div');
  left.className = 'locks-titlebar-left';
  left.innerHTML = '<div class="locks-titlebar-spacer"></div>';

  const controls = document.createElement('div');
  controls.className = 'locks-window-controls';
  const minimize = controlButton('minimize', 'Minimize', 'minimize');
  maximizeButton = controlButton('toggle-maximize', 'Maximize', 'maximize');
  const close = controlButton('close', 'Close', 'close');
  controls.append(minimize, maximizeButton, close);
  bar.append(left, controls);

  bar.addEventListener('dblclick', event => {
    if (!event.target.closest('.locks-window-controls')) {
      ipcRenderer.send('locks-window-control', 'toggle-maximize');
    }
  });

  document.body.prepend(bar);
  ipcRenderer.invoke('locks-window-is-maximized').then(setMaximized).catch(() => {});
}
function bootDesktopChrome() {
  if (isMac) return;
  applyTheme();
  injectStyle();
  mountTitlebar();

  const observer = new MutationObserver(applyTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('storage', event => {
    if (event.key === THEME_KEY) applyTheme();
  });
}

ipcRenderer.on('locks-window-maximized', (_event, maximized) => setMaximized(Boolean(maximized)));

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootDesktopChrome, { once: true });
} else {
  bootDesktopChrome();
}
