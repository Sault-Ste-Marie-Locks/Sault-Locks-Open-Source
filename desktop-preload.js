const { ipcRenderer } = require('electron');

const THEME_KEY = 'ssmCanalDashboard.darkMode';
const TITLEBAR_HEIGHT = 38;
let lastTheme = null;

document.documentElement.classList.add('locks-desktop-window');
const style = document.createElement('style');
style.id = 'locks-desktop-window-style';
style.textContent = `
html.locks-desktop-window{--locks-titlebar-height:${TITLEBAR_HEIGHT}px}
html.locks-desktop-window body{padding-top:var(--locks-titlebar-height)!important}
html.locks-desktop-window .app-shell{min-height:calc(100vh - var(--locks-titlebar-height))!important}
#locks-titlebar-drag-region{position:fixed;z-index:2147483646;top:0;left:0;right:${process.platform === 'darwin' ? 0 : 138}px;height:var(--locks-titlebar-height);-webkit-app-region:drag;user-select:none;background:transparent;pointer-events:auto}
@media print{#locks-titlebar-drag-region{display:none!important}html.locks-desktop-window body{padding-top:0!important}}
`;
(document.head || document.documentElement).appendChild(style);

function darkModeEnabled() {
  try {
    return document.body?.classList.contains('dark-mode') ||
      document.documentElement.classList.contains('app-dark') ||
      localStorage.getItem(THEME_KEY) === 'true';
  } catch (_) { return false; }
}

function syncTheme() {
  const dark = Boolean(darkModeEnabled());
  if (dark === lastTheme) return;
  lastTheme = dark;
  ipcRenderer.send('locks-app-theme', dark);
}

function initializeDesktopChrome() {
  if (!document.getElementById('locks-titlebar-drag-region')) {
    const drag = document.createElement('div');
    drag.id = 'locks-titlebar-drag-region';
    drag.setAttribute('aria-hidden', 'true');
    document.body.prepend(drag);
  }
  syncTheme();
  const observer = new MutationObserver(syncTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('storage', event => { if (event.key === THEME_KEY) syncTheme(); });
}

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', initializeDesktopChrome, { once: true });
else initializeDesktopChrome();
