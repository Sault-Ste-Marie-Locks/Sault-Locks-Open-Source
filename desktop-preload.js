const { ipcRenderer } = require('electron');

const THEME_KEY = 'ssmCanalDashboard.darkMode';
let lastTheme = null;

function darkModeEnabled() {
  try {
    return document.body?.classList.contains('dark-mode') ||
      document.documentElement.classList.contains('app-dark') ||
      localStorage.getItem(THEME_KEY) === 'true';
  } catch (_) { return false; }
}

function syncTheme() {
  if (process.platform !== 'win32') return;
  const dark = Boolean(darkModeEnabled());
  if (dark === lastTheme) return;
  lastTheme = dark;
  ipcRenderer.send('locks-app-theme', dark);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }, { once: true });
} else {
  syncTheme();
  const observer = new MutationObserver(syncTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

window.addEventListener('storage', event => {
  if (event.key === THEME_KEY) syncTheme();
});
