/* SAULT LOCKS TRACKER - APP + AUTO DRAFTS */

const vesselData = {
    "Nokomis": "0531",
    "Le Voyageur": "0533",
    "Holiday": "0507",
    "Hiawatha": "0510",
    "Bide-A-Wee": "0530",
    "Miss Marie": "0525",
    "Parks Canada": "0560",
    "Purvis": "0511",
    "Allure": "1076",
    "Anushka Police Service": "0650",
    "OPP": "0540",
    "RCMP": "0667",
    "City Police": "0567",
    "Canadian Coast Guard": "1198",
    "American Coast Guard": "0665",
    "US Border Patrol": "1225",
    "MNR - Northern Vigil": "0562",
    "Beauty and the Beast": "0762",
    "Chillin Out": "1214",
    "Birds Eye": "1544"
};

const STORAGE_KEY = "saultLocksLogs";

const OLD_STORAGE_KEYS = [
    "saultLocksTrackerLogs",
    "logs",
    "entries",
    "lockLogs",
    "saultLogs",
    "savedEntries"
];

const DRAFT_PREFIX = "saultLocksDraft:";


function ensureMobileUiFixStyles(){
    if(document.getElementById("ssm-mobile-pair-draft-fixes")) return;
    const style = document.createElement("style");
    style.id = "ssm-mobile-pair-draft-fixes";
    style.textContent = `
/* Mobile draft and retired time-button controls */
#syncTimeBtn,
.time-row .time-btn{
  display:none !important;
}
.time-row{
  display:block !important;
  grid-template-columns:1fr !important;
  gap:0 !important;
  width:100% !important;
  margin-bottom:14px !important;
}
.time-row input,
.time-row select{
  width:100% !important;
  min-height:54px !important;
  height:auto !important;
  margin:0 !important;
}

#draftNotice{
  display:grid !important;
  grid-template-columns:minmax(0,1fr) auto !important;
  align-items:center !important;
  gap:12px !important;
  width:100% !important;
  padding:14px !important;
  margin:0 0 16px !important;
  border-radius:18px !important;
  border:1px solid rgba(var(--accent-rgb,52,141,188), .28) !important;
  background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02)), var(--card, #172033) !important;
  box-shadow:0 12px 26px rgba(0,0,0,.10) !important;
  box-sizing:border-box !important;
}
#draftNotice .draft-text{
  min-width:0 !important;
  display:flex !important;
  flex-direction:column !important;
  gap:4px !important;
}
#draftNotice strong{
  color:var(--text) !important;
  font-size:14px !important;
  font-weight:950 !important;
  letter-spacing:-.02em !important;
}
#draftNotice span{
  color:var(--muted) !important;
  font-size:12px !important;
  line-height:1.35 !important;
}
#clearDraftBtn{
  appearance:none !important;
  -webkit-appearance:none !important;
  min-height:42px !important;
  display:inline-flex !important;
  align-items:center !important;
  justify-content:center !important;
  padding:0 14px !important;
  border-radius:14px !important;
  border:1px solid rgba(var(--accent-rgb,52,141,188), .36) !important;
  background:linear-gradient(180deg, var(--card-2, #233047), var(--card, #172033)) !important;
  color:var(--text) !important;
  font-size:12px !important;
  font-weight:950 !important;
  line-height:1 !important;
  white-space:nowrap !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06), 0 8px 18px rgba(0,0,0,.10) !important;
}
#clearDraftBtn:active{
  transform:scale(.97) !important;
}
#clearDraftBtn:focus-visible{
  outline:none !important;
  box-shadow:0 0 0 4px rgba(var(--accent-rgb,52,141,188), .20), 0 8px 18px rgba(0,0,0,.10) !important;
}
#draftStatus{
  width:100% !important;
  color:var(--muted) !important;
  font-size:11px !important;
  font-weight:800 !important;
  margin:-6px 0 12px !important;
  text-align:right !important;
}
html.theme-light #draftNotice,
body.light #draftNotice{
  background:#ffffff !important;
  border-color:rgba(var(--accent-rgb,52,141,188), .24) !important;
  box-shadow:0 10px 24px rgba(var(--accent-rgb,52,141,188), .08) !important;
}
html.theme-light #clearDraftBtn,
body.light #clearDraftBtn{
  background:linear-gradient(180deg, #ffffff, var(--blue-soft, #e8f5fc)) !important;
  color:var(--blue, #348dbc) !important;
  border-color:rgba(var(--accent-rgb,52,141,188), .34) !important;
  box-shadow:0 8px 18px rgba(var(--accent-rgb,52,141,188), .10) !important;
}
html.theme-dark #draftNotice,
html.app-dark #draftNotice{
  background:#172033 !important;
  border-color:#263449 !important;
}
html.theme-dark #clearDraftBtn,
html.app-dark #clearDraftBtn{
  background:linear-gradient(180deg, #233047, #172033) !important;
  color:#f8fafc !important;
  border-color:#334155 !important;
}
@media(max-width:390px){
  #draftNotice{
    grid-template-columns:1fr !important;
  }
  #clearDraftBtn{
    width:100% !important;
    min-height:44px !important;
  }
  #draftStatus{
    text-align:left !important;
  }
}

.mobile-link-status{
  width:calc(100% - 28px) !important;
  max-width:460px !important;
  margin:10px auto 12px !important;
  padding:14px !important;
  border-radius:22px !important;
  border:1px solid rgba(148,163,184,.22) !important;
  background:linear-gradient(180deg, rgba(23,32,51,.96), rgba(15,23,42,.94)) !important;
  color:#fff !important;
  box-shadow:0 14px 34px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.06) !important;
  font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif !important;
  box-sizing:border-box !important;
}
.mobile-link-status.has-token,
.mobile-link-status.is-linked{
  padding:10px 12px !important;
  border-radius:18px !important;
  background:linear-gradient(135deg, rgba(16,185,129,.92), rgba(14,116,144,.92)) !important;
  border-color:rgba(255,255,255,.18) !important;
}
.mobile-link-status.is-error{
  background:linear-gradient(135deg, rgba(185,28,28,.95), rgba(127,29,29,.95)) !important;
}
.mobile-link-card-head{
  display:flex !important;
  align-items:center !important;
  gap:12px !important;
}
.mobile-link-icon{
  width:42px !important;
  height:42px !important;
  min-width:42px !important;
  border-radius:16px !important;
  display:grid !important;
  place-items:center !important;
  background:rgba(255,255,255,.12) !important;
  border:1px solid rgba(255,255,255,.14) !important;
  font-size:20px !important;
}
.mobile-link-copy{
  min-width:0 !important;
  flex:1 !important;
}
.mobile-link-copy strong{
  display:block !important;
  font-size:14px !important;
  font-weight:950 !important;
  letter-spacing:-.02em !important;
  color:inherit !important;
}
.mobile-link-message{
  margin-top:3px !important;
  color:rgba(255,255,255,.78) !important;
  font-size:12px !important;
  font-weight:800 !important;
  line-height:1.3 !important;
}
.mobile-link-form{
  margin-top:14px !important;
  display:grid !important;
  gap:9px !important;
}
.mobile-link-form[hidden]{display:none !important;}
.mobile-link-form label{
  color:rgba(255,255,255,.84) !important;
  font-size:12px !important;
  font-weight:900 !important;
}
.mobile-link-code-row{
  display:grid !important;
  grid-template-columns:minmax(0,1fr) auto !important;
  gap:9px !important;
}
.mobile-link-form input{
  width:100% !important;
  min-width:0 !important;
  height:50px !important;
  border-radius:16px !important;
  border:1px solid rgba(255,255,255,.20) !important;
  padding:0 14px !important;
  background:rgba(255,255,255,.10) !important;
  color:#fff !important;
  font-size:18px !important;
  font-weight:950 !important;
  letter-spacing:.12em !important;
  outline:none !important;
  box-sizing:border-box !important;
}
.mobile-link-form input::placeholder{
  color:rgba(255,255,255,.55) !important;
  font-size:14px !important;
  letter-spacing:0 !important;
}
.mobile-link-form button{
  height:50px !important;
  border:0 !important;
  border-radius:16px !important;
  padding:0 16px !important;
  background:#fff !important;
  color:#0f172a !important;
  font-size:13px !important;
  font-weight:950 !important;
  white-space:nowrap !important;
}
.mobile-link-help{
  margin:0 !important;
  color:rgba(255,255,255,.68) !important;
  font-size:11px !important;
  font-weight:750 !important;
  line-height:1.35 !important;
}
html.theme-light .mobile-link-status,
body.light .mobile-link-status{
  background:#ffffff !important;
  color:#0f172a !important;
  border-color:rgba(var(--accent-rgb,52,141,188), .24) !important;
  box-shadow:0 10px 24px rgba(var(--accent-rgb,52,141,188), .10) !important;
}
html.theme-light .mobile-link-status.has-token,
html.theme-light .mobile-link-status.is-linked,
body.light .mobile-link-status.has-token,
body.light .mobile-link-status.is-linked{
  background:linear-gradient(135deg, var(--blue, #348dbc), var(--blue-hover, #2279a8)) !important;
  color:#fff !important;
}
html.theme-light .mobile-link-icon,
body.light .mobile-link-icon{
  background:var(--blue-soft, #e8f5fc) !important;
  border-color:rgba(var(--accent-rgb,52,141,188), .24) !important;
  color:var(--blue, #348dbc) !important;
}
html.theme-light .mobile-link-status.has-token .mobile-link-icon,
html.theme-light .mobile-link-status.is-linked .mobile-link-icon,
body.light .mobile-link-status.has-token .mobile-link-icon,
body.light .mobile-link-status.is-linked .mobile-link-icon{
  background:rgba(255,255,255,.16) !important;
  color:#fff !important;
  border-color:rgba(255,255,255,.22) !important;
}
html.theme-light .mobile-link-message,
body.light .mobile-link-message{
  color:#64748b !important;
}
html.theme-light .mobile-link-status.has-token .mobile-link-message,
html.theme-light .mobile-link-status.is-linked .mobile-link-message,
body.light .mobile-link-status.has-token .mobile-link-message,
body.light .mobile-link-status.is-linked .mobile-link-message{
  color:rgba(255,255,255,.82) !important;
}
html.theme-light .mobile-link-form label,
body.light .mobile-link-form label,
html.theme-light .mobile-link-help,
body.light .mobile-link-help{
  color:#64748b !important;
}
html.theme-light .mobile-link-form input,
body.light .mobile-link-form input{
  background:#f8fafc !important;
  color:#0f172a !important;
  border-color:rgba(var(--accent-rgb,52,141,188), .26) !important;
}
html.theme-light .mobile-link-form input::placeholder,
body.light .mobile-link-form input::placeholder{color:#94a3b8 !important;}
html.theme-light .mobile-link-form button,
body.light .mobile-link-form button{
  background:linear-gradient(135deg, var(--blue, #348dbc), var(--blue-hover, #2279a8)) !important;
  color:#fff !important;
}
html.theme-light .mobile-link-status.is-error,
body.light .mobile-link-status.is-error{
  background:linear-gradient(135deg, rgba(185,28,28,.95), rgba(127,29,29,.95)) !important;
  color:#fff !important;
}
html.theme-light .mobile-link-status.is-error .mobile-link-message,
body.light .mobile-link-status.is-error .mobile-link-message{
  color:rgba(255,255,255,.82) !important;
}
@media(max-width:360px){
  .mobile-link-code-row{grid-template-columns:1fr !important;}
  .mobile-link-form button{width:100% !important;}
}
`;
    document.head.appendChild(style);
}

ensureMobileUiFixStyles();


const PROFILE_KEY = "ssmCanalDashboard.profile.v1";
const PROFILE_LEGACY_KEYS = [
    "ssmCanalDashboard.profile",
    "saultLocksProfile",
    "operatorProfile",
    "userProfile",
    "profile"
];

const DEFAULT_PROFILE = {
    userName:"Operator",
    deviceLabel:"",
    updatedAt:""
};

function getDeviceInfo(){
    const nav = navigator || {};
    const screenObj = window.screen || {};
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection || {};
    const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;

    return {
        browser: nav.userAgent || "Unknown browser",
        platform: nav.platform || "Unknown platform",
        language: nav.language || "Unknown language",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown timezone",
        screen: `${screenObj.width || window.innerWidth} × ${screenObj.height || window.innerHeight}`,
        viewport: `${window.innerWidth} × ${window.innerHeight}`,
        online: nav.onLine === false ? "Offline" : "Online",
        standalone: standalone ? "Installed app" : "Browser tab",
        touch: (nav.maxTouchPoints || 0) > 0 ? `${nav.maxTouchPoints} touch point${nav.maxTouchPoints === 1 ? "" : "s"}` : "No touch detected",
        connection: connection.effectiveType || connection.type || "Not available"
    };
}

function getProfile(){
    let saved = safeParse(localStorage.getItem(PROFILE_KEY), null);

    if(!saved || typeof saved !== "object" || Array.isArray(saved)){
        for(const key of PROFILE_LEGACY_KEYS){
            const legacy = safeParse(localStorage.getItem(key), null);
            if(legacy && typeof legacy === "object" && !Array.isArray(legacy)){
                saved = legacy;
                break;
            }
        }
    }

    const profile = Object.assign({}, DEFAULT_PROFILE, saved || {});
    const possibleName = profile.userName || profile.name || profile.operator || profile.displayName || profile.username || profile.addedBy;
    const possibleDevice = profile.deviceLabel || profile.deviceName || profile.device || profile.addedFromDevice;

    profile.userName = String(possibleName || DEFAULT_PROFILE.userName).trim() || DEFAULT_PROFILE.userName;
    profile.deviceLabel = String(possibleDevice || "").trim();

    if(saved && localStorage.getItem(PROFILE_KEY) === null){
        try{ localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }catch(error){}
    }

    return profile;
}

function saveProfile(nextProfile){
    const clean = Object.assign({}, getProfile(), nextProfile || {});
    clean.userName = String(clean.userName || DEFAULT_PROFILE.userName).trim() || DEFAULT_PROFILE.userName;
    clean.deviceLabel = String(clean.deviceLabel || "").trim();
    clean.updatedAt = new Date().toISOString();
    localStorage.setItem(PROFILE_KEY, JSON.stringify(clean));
    return clean;
}

function getActiveUserName(){
    return getProfile().userName || DEFAULT_PROFILE.userName;
}

function getActiveDeviceLabel(){
    const profile = getProfile();
    if(profile.deviceLabel) return profile.deviceLabel;
    const info = getDeviceInfo();
    return info.platform && info.platform !== "Unknown platform" ? info.platform : "This device";
}

function cleanStoredName(value){
    const text = String(value || "").trim();
    if(!text) return "";
    if(/^unknown( user)?$/i.test(text)) return "";
    if(/^n\/?a$/i.test(text)) return "";
    return text;
}

function getLogUserName(log){
    const savedName = log ? (
        log.createdBy ||
        log.createdByName ||
        log.addedBy ||
        log.userName ||
        log.profileName ||
        log.operatorName ||
        log.operator
    ) : "";

    return cleanStoredName(savedName) || getActiveUserName() || DEFAULT_PROFILE.userName;
}

function getLogDeviceLabel(log){
    const savedDevice = log ? (
        log.deviceLabel ||
        log.deviceName ||
        log.createdDevice ||
        log.addedFromDevice ||
        log.device
    ) : "";

    return cleanStoredName(savedDevice) || getActiveDeviceLabel() || "This device";
}

function normalizeLogProfileFields(log){
    if(!log || typeof log !== "object" || Array.isArray(log)) return log;

    const userName = getLogUserName(log);
    const deviceLabel = getLogDeviceLabel(log);

    log.createdBy = userName;
    log.createdByName = userName;
    log.addedBy = userName;
    log.userName = userName;
    log.profileName = userName;
    log.operatorName = userName;

    log.deviceLabel = deviceLabel;
    log.deviceName = deviceLabel;
    log.createdDevice = deviceLabel;
    log.addedFromDevice = deviceLabel;

    return log;
}

function stampLogWithProfile(log){
    const profile = getProfile();
    const device = getDeviceInfo();
    const userName = profile.userName || DEFAULT_PROFILE.userName;
    const deviceLabel = profile.deviceLabel || getActiveDeviceLabel();

    return Object.assign(log, {
        createdBy:userName,
        createdByName:userName,
        addedBy:userName,
        userName:userName,
        profileName:userName,
        operatorName:userName,
        deviceLabel:deviceLabel,
        deviceName:deviceLabel,
        createdDevice:deviceLabel,
        addedFromDevice:deviceLabel,
        deviceInfo:{
            platform:device.platform,
            browser:device.browser,
            timezone:device.timezone,
            screen:device.screen,
            standalone:device.standalone
        }
    });
}

window.getProfile = getProfile;
window.saveProfile = saveProfile;
window.getActiveUserName = getActiveUserName;
window.getActiveDeviceLabel = getActiveDeviceLabel;
window.getDeviceInfo = getDeviceInfo;
window.getLogUserName = getLogUserName;
window.getLogDeviceLabel = getLogDeviceLabel;
window.normalizeLogProfileFields = normalizeLogProfileFields;

function blockMobileZoom(){
    let viewport = document.querySelector('meta[name="viewport"]');
    const viewportContent = "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover";

    if(!viewport){
        viewport = document.createElement("meta");
        viewport.name = "viewport";
        document.head.appendChild(viewport);
    }

    viewport.setAttribute("content", viewportContent);
    document.documentElement.style.touchAction = "manipulation";
    if(document.body) document.body.style.touchAction = "manipulation";

    if(blockMobileZoom._listenersInstalled) return;
    blockMobileZoom._listenersInstalled = true;

    let lastTouchEnd = 0;
    document.addEventListener("touchmove", function(event){
        if(event.touches && event.touches.length > 1){
            event.preventDefault();
        }
    }, { passive:false });

    document.addEventListener("touchend", function(event){
        const now = Date.now();
        if(now - lastTouchEnd <= 300){
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive:false });

    document.addEventListener("gesturestart", function(event){
        event.preventDefault();
    }, { passive:false });
}

/* SETTINGS / THEME */

const SETTINGS_KEY = "ssmCanalDashboard.settings.v2";

const DEFAULT_APP_SETTINGS = {
    theme:"dark",
    timeFormat:"12",
    accent:"blue",
    compact:false,
    defaultCanal:"Sault Canada Locks",
    defaultDirection:"",
    confirmBeforeSave:true,
    autoCurrentTime:true,
    showEntryHints:true
};

function normalizeBool(value, fallback){
    if(value === true || value === false) return value;
    if(value === "true") return true;
    if(value === "false") return false;
    return fallback;
}

function normalizeSettings(raw){
    if(window.SSMTheme && window.SSMTheme.normalize){
        return window.SSMTheme.normalize(raw);
    }
    const merged = Object.assign({}, DEFAULT_APP_SETTINGS, raw || {});
    merged.theme = merged.theme === "light" ? "light" : "dark";
    merged.timeFormat = merged.timeFormat === "24" ? "24" : "12";
    merged.accent = ["blue", "purple", "green"].includes(merged.accent) ? merged.accent : "blue";
    merged.compact = normalizeBool(merged.compact, DEFAULT_APP_SETTINGS.compact);
    merged.confirmBeforeSave = normalizeBool(merged.confirmBeforeSave, DEFAULT_APP_SETTINGS.confirmBeforeSave);
    merged.autoCurrentTime = normalizeBool(merged.autoCurrentTime, DEFAULT_APP_SETTINGS.autoCurrentTime);
    merged.showEntryHints = normalizeBool(merged.showEntryHints, DEFAULT_APP_SETTINGS.showEntryHints);
    merged.defaultCanal = String(merged.defaultCanal || DEFAULT_APP_SETTINGS.defaultCanal);
    merged.defaultDirection = ["", "Up", "Down"].includes(merged.defaultDirection) ? merged.defaultDirection : "";
    return merged;
}

function getAppSettings(){
    if(window.SSMTheme && window.SSMTheme.get){
        return window.SSMTheme.get();
    }
    let saved = {};
    try{ saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {}; }catch(e){ saved = {}; }
    return normalizeSettings(saved);
}

function saveAppSettings(nextSettings){
    const clean = normalizeSettings(Object.assign({}, getAppSettings(), nextSettings || {}));
    if(window.SSMTheme && window.SSMTheme.save){
        window.SSMTheme.save(clean);
    }else{
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean));
        localStorage.setItem("appTheme", clean.theme);
        localStorage.setItem("theme", clean.theme);
        localStorage.setItem("timeFormat", clean.timeFormat);
        localStorage.setItem("ssmCanalDashboard.darkMode", clean.theme === "dark" ? "true" : "false");
    }
    return clean;
}

function getAppTheme(){
    return getAppSettings().theme;
}

function getTimeFormat(){
    return getAppSettings().timeFormat;
}

function getDefaultCanal(){
    return getAppSettings().defaultCanal || "Sault Canada Locks";
}

function getDefaultDirection(){
    return getAppSettings().defaultDirection || "";
}

function shouldConfirmBeforeSave(){
    return getAppSettings().confirmBeforeSave !== false;
}

function shouldAutoCurrentTime(){
    return getAppSettings().autoCurrentTime !== false;
}

function shouldShowEntryHints(){
    return getAppSettings().showEntryHints !== false;
}

window.getAppSettings = getAppSettings;
window.saveAppSettings = saveAppSettings;
window.getDefaultCanal = getDefaultCanal;
window.getDefaultDirection = getDefaultDirection;
window.shouldConfirmBeforeSave = shouldConfirmBeforeSave;
window.shouldAutoCurrentTime = shouldAutoCurrentTime;
window.shouldShowEntryHints = shouldShowEntryHints;
window.applySavedTheme = applySavedTheme;
window.formatAppTime = formatTime;

function updateThemeLogo(){
    const logo = document.getElementById("themeLogo");
    if(!logo) return;

    const theme = getAppTheme();

    logo.src = theme === "light"
        ? "assets/logo-light.png"
        : "assets/logo-dark.png";
}

function applyAccentSettings(accent){
    const palettes = {
        blue:{ blue:"#348DBC", hover:"#3F9FCE", soft:"#E8F5FC", border:"#5CADDA", rgb:"52,141,188" },
        purple:{ blue:"#6C5CE7", hover:"#7C6EF0", soft:"#EFEBFF", border:"#8B7CF6", rgb:"108,92,231" },
        green:{ blue:"#168A4A", hover:"#1FA85B", soft:"#E9F8EF", border:"#27B768", rgb:"22,138,74" }
    };

    const key = ["blue", "purple", "green"].includes(accent) ? accent : "blue";
    const p = palettes[key] || palettes.blue;
    const targets = [document.documentElement];
    if(document.body) targets.push(document.body);

    targets.forEach(target => {
        if(!target || !target.style) return;
        target.style.setProperty("--blue", p.blue);
        target.style.setProperty("--blue-hover", p.hover);
        target.style.setProperty("--blue-soft", p.soft);
        target.style.setProperty("--blue-border", p.border);
        target.style.setProperty("--accent-rgb", p.rgb);
        target.style.setProperty("--purple", p.blue);
        target.style.setProperty("--purple-light", p.hover);
        target.style.setProperty("--soft-purple", p.soft);
        target.style.setProperty("--accent", p.blue);
        target.style.setProperty("--accent-hover", p.hover);
        target.style.setProperty("--accent-soft", p.soft);
        target.style.setProperty("--accent-border", p.border);
    });
}

function ensureRuntimeThemeStyles(){
    let style = document.getElementById("settingsRuntimeThemeStyles");

    if(!style){
        style = document.createElement("style");
        style.id = "settingsRuntimeThemeStyles";
        document.head.appendChild(style);
    }

    style.textContent = `
html.theme-dark{
    --bg:#111827;
    --page:#111827;
    --card:#172033;
    --card-2:#1f2a3d;
    --card-3:#263449;
    --text:#f8fafc;
    --muted:#94a3b8;
    --soft:#cbd5e1;
    --border:#263449;
    --border-strong:#334155;
    --input:#1f2a3d;
    --input-focus:#263449;
    --shadow:0 10px 24px rgba(2,8,23,.36);
    --shadow-soft:0 8px 18px rgba(2,8,23,.28);
    --inner:inset 0 1px 0 rgba(255,255,255,.04);
}
html.theme-light{
    --bg:#f6f9fc;
    --page:#f6f9fc;
    --card:#ffffff;
    --card-2:#f8fbff;
    --card-3:#eef5fb;
    --text:#172033;
    --muted:#64748b;
    --soft:#334155;
    --border:#dce7f2;
    --border-strong:#c8d7e6;
    --input:#ffffff;
    --input-focus:#f8fbff;
    --shadow:0 10px 24px rgba(15,70,120,.12);
    --shadow-soft:0 8px 18px rgba(15,70,120,.08);
    --inner:inset 0 1px 0 rgba(255,255,255,.75);
}
html[data-accent="blue"]{
    --blue:#348DBC;
    --blue-hover:#3F9FCE;
    --blue-soft:#E8F5FC;
    --blue-border:#5CADDA;
    --purple:#348DBC;
    --purple-light:#4AA3D4;
    --soft-purple:#E8F5FC;
}
html[data-accent="purple"]{
    --blue:#6C5CE7;
    --blue-hover:#7C6EF0;
    --blue-soft:#EFEBFF;
    --blue-border:#8B7CF6;
    --purple:#6C5CE7;
    --purple-light:#8B7CF6;
    --soft-purple:#EFEBFF;
}
html[data-accent="green"]{
    --blue:#168A4A;
    --blue-hover:#1FA85B;
    --blue-soft:#E9F8EF;
    --blue-border:#27B768;
    --purple:#168A4A;
    --purple-light:#27B768;
    --soft-purple:#E9F8EF;
}
html[data-accent="blue"] body{
    --blue:#348DBC; --blue-hover:#3F9FCE; --blue-soft:#E8F5FC; --blue-border:#5CADDA;
    --purple:#348DBC; --purple-light:#4AA3D4; --soft-purple:#E8F5FC; --accent-rgb:52,141,188;
}
html[data-accent="purple"] body{
    --blue:#6C5CE7; --blue-hover:#7C6EF0; --blue-soft:#EFEBFF; --blue-border:#8B7CF6;
    --purple:#6C5CE7; --purple-light:#8B7CF6; --soft-purple:#EFEBFF; --accent-rgb:108,92,231;
}
html[data-accent="green"] body{
    --blue:#168A4A; --blue-hover:#1FA85B; --blue-soft:#E9F8EF; --blue-border:#27B768;
    --purple:#168A4A; --purple-light:#27B768; --soft-purple:#E9F8EF; --accent-rgb:22,138,74;
}
html.theme-light body, html.theme-light .page, html.theme-light .app{
    background:var(--page) !important;
    color:var(--text) !important;
}
html.theme-dark body, html.theme-dark .page, html.theme-dark .app{
    background:var(--page) !important;
    color:var(--text) !important;
}
html.theme-light .topbar, html.theme-light .app-header{
    background:#ffffff !important;
    background-color:#ffffff !important;
    border-bottom:1px solid #dce7f2 !important;
}
html.theme-dark .topbar, html.theme-dark .app-header, html.app-dark .topbar{
    background:#0f172a !important;
    background-color:#0f172a !important;
    border-bottom:1px solid #263449 !important;
    box-shadow:none !important;
    backdrop-filter:none !important;
    -webkit-backdrop-filter:none !important;
}
html.theme-dark .topbar h1, html.theme-dark .topbar h2, html.theme-dark .topbar span{
    color:#f8fafc !important;
}
html.theme-light .btn, html.theme-light .header-btn, html.theme-light .back, html.theme-light .setting-card, html.theme-light .preview-card, html.theme-light .storage-card, html.theme-light .summary-card, html.theme-light .auto-card, html.theme-light .kayak-info, html.theme-light .form-section, html.theme-light .return-panel{
    background:var(--card) !important;
    color:var(--text) !important;
    border-color:var(--border) !important;
}
html.theme-dark .btn, html.theme-dark .header-btn, html.theme-dark .back, html.theme-dark .setting-card, html.theme-dark .preview-card, html.theme-dark .storage-card, html.theme-dark .summary-card, html.theme-dark .auto-card, html.theme-dark .kayak-info, html.theme-dark .form-section, html.theme-dark .return-panel{
    background:var(--card) !important;
    color:var(--text) !important;
    border-color:var(--border) !important;
}
html.theme-light input, html.theme-light select, html.theme-light textarea, html.theme-light .setting-input, html.theme-light .setting-select{
    background:var(--input) !important;
    color:var(--text) !important;
    border-color:var(--border-strong) !important;
}
html.theme-dark input, html.theme-dark select, html.theme-dark textarea, html.theme-dark .setting-input, html.theme-dark .setting-select{
    background:var(--input) !important;
    color:var(--text) !important;
    border-color:var(--border-strong) !important;
}
html.theme-light input[readonly], html.theme-dark input[readonly]{
    background:var(--card-2) !important;
}
html.theme-light .today-card, html.theme-light .entry-hero, html.theme-light .title,
html.theme-dark .today-card, html.theme-dark .entry-hero, html.theme-dark .title{
    background:linear-gradient(135deg, var(--blue) 0%, var(--blue-hover) 100%) !important;
    color:#fff !important;
}
html.theme-light .btn.full, html.theme-light .toggle-btn.active, html.theme-light .action-btn.primary, html.theme-light .continue-btn, html.theme-light .confirm-reset-btn,
html.theme-dark .btn.full, html.theme-dark .toggle-btn.active, html.theme-dark .action-btn.primary, html.theme-dark .continue-btn, html.theme-dark .confirm-reset-btn{
    background:var(--blue) !important;
    color:#fff !important;
    border-color:var(--blue-border) !important;
}
html.theme-light .nav-link.active, html.theme-dark .nav-link.active,
html.theme-light .btn-icon, html.theme-dark .btn-icon{
    color:var(--blue) !important;
}
html.theme-light .btn.return-btn .btn-icon, html.theme-dark .btn.return-btn .btn-icon,
html.theme-light .panel-icon, html.theme-dark .panel-icon{
    background:var(--blue) !important;
    color:#fff !important;
}
body.hide-entry-hints .help-text,
body.hide-entry-hints .kayak-info,
body.hide-entry-hints .return-panel{
    display:none !important;
}
body.settings-compact .setting-card{
    padding:11px !important;
}
body.settings-compact .settings-summary{
    display:none !important;
}
`;
}

function applySavedTheme(){
    const settings = getAppSettings();
    if(window.SSMTheme && window.SSMTheme.apply){ window.SSMTheme.apply(settings); }

    ensureRuntimeThemeStyles();

    document.documentElement.classList.toggle("theme-light", settings.theme === "light");
    document.documentElement.classList.toggle("theme-dark", settings.theme !== "light");
    document.body.classList.toggle("light", settings.theme === "light");
    document.body.classList.toggle("settings-compact", !!settings.compact);
    document.body.classList.toggle("hide-entry-hints", !shouldShowEntryHints());
    document.documentElement.dataset.accent = settings.accent || "blue";

    applyAccentSettings(settings.accent);
    updateThemeLogo();

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if(metaTheme){
        metaTheme.setAttribute("content", settings.theme === "light" ? "#F7FAFC" : "#111111");
    }
}


/* Expose settings helpers so settings.html and every page use the exact same theme system. */
window.getAppSettings = getAppSettings;
window.saveAppSettings = saveAppSettings;
window.applySavedTheme = applySavedTheme;
window.getAppTheme = getAppTheme;
window.getTimeFormat = getTimeFormat;

function formatTime(date = new Date(), includeSeconds = false){
    return date.toLocaleTimeString([], {
        hour:"2-digit",
        minute:"2-digit",
        second:includeSeconds ? "2-digit" : undefined,
        hour12:getTimeFormat() === "12"
    });
}

function formatDate(date = new Date()){
    return date.toLocaleDateString();
}

function applyEntryDefaults(){
    const settings = getAppSettings();
    const defaultCanal = settings.defaultCanal || "Sault Canada Locks";
    const defaultDirection = settings.defaultDirection || "";

    const canal = document.getElementById("canal");
    if(canal && (!canal.value || canal.value === "Sault Canada Locks" || canal.readOnly)){
        canal.value = defaultCanal;
        canal.dispatchEvent(new Event("input", { bubbles:true }));
        canal.dispatchEvent(new Event("change", { bubbles:true }));
    }

    const dir = document.getElementById("dir") || document.getElementById("reverseDir");
    if(dir && !dir.value && defaultDirection){
        const match = [...dir.options || []].find(option => (option.value || option.textContent) === defaultDirection);
        if(match){
            dir.value = match.value || match.textContent;
            dir.classList.remove("placeholder");
            dir.dispatchEvent(new Event("input", { bubbles:true }));
            dir.dispatchEvent(new Event("change", { bubbles:true }));
        }
    }

    ["entryTime", "reverseTime"].forEach(id => {
        const el = document.getElementById(id);
        if(el && !String(el.value || "").trim()){
            el.value = formatTime(new Date());
            el.dispatchEvent(new Event("input", { bubbles:true }));
            el.dispatchEvent(new Event("change", { bubbles:true }));
        }
    });
}

/* STORAGE HELPERS */

function safeParse(value, fallback){
    try{
        return JSON.parse(value) ?? fallback;
    }catch(e){
        return fallback;
    }
}

function isDraftPayload(value){
    return value &&
        typeof value === "object" &&
        value.data &&
        value.savedAt &&
        String(value.type || "").trim() !== "";
}

function isRealEntry(value){
    if(!value || typeof value !== "object" || Array.isArray(value)) return false;
    if(isDraftPayload(value)) return false;

    const typeText = String(value.entryType || value.formType || value.type || "").toLowerCase();

    if(typeText.includes("draft")) return false;

    return Boolean(
        value.createdAt ||
        value.id ||
        value.vessel ||
        value.vesselName ||
        value.reverseTime ||
        value.entryTime ||
        value.time ||
        value.reason ||
        value.reverseReason
    );
}

function cleanLogArray(logs){
    if(!Array.isArray(logs)) return [];
    return logs.filter(isRealEntry).map(normalizeLogProfileFields);
}

function migrateOldLogs(){
    const current = safeParse(localStorage.getItem(STORAGE_KEY), []);

    if(Array.isArray(current) && current.length > 0){
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanLogArray(current)));
        return;
    }

    for(const key of OLD_STORAGE_KEYS){
        const oldLogs = safeParse(localStorage.getItem(key), null);

        if(Array.isArray(oldLogs) && oldLogs.length > 0){
            const cleanOldLogs = cleanLogArray(oldLogs);

            if(cleanOldLogs.length > 0){
                localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanOldLogs));
                return;
            }
        }
    }
}

function getLogs(){
    migrateOldLogs();

    const logs = safeParse(localStorage.getItem(STORAGE_KEY), []);
    const cleanLogs = cleanLogArray(logs);

    if(Array.isArray(logs) && cleanLogs.length !== logs.length){
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanLogs));
    }

    return cleanLogs;
}

function setLogs(logs){
    const cleanLogs = cleanLogArray(logs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanLogs));

    try{
        if(!window.__ssmMobileSyncSuppress && window.mobileLinkSync && typeof window.mobileLinkSync.queueSyncAll === "function"){
            window.mobileLinkSync.queueSyncAll(cleanLogs);
        }
    }catch(e){}
}

function deleteAllLogs(){
    localStorage.removeItem(STORAGE_KEY);

    OLD_STORAGE_KEYS.forEach(key => {
        localStorage.removeItem(key);
    });

    renderLogs();
    updateHome();
}


/* PHONE LINK + DASHBOARD SYNC */

const MOBILE_LINK_TOKEN_KEY = "ssmCanalDashboard.mobileLink.token.v1";
const MOBILE_LINK_BASE_KEY = "ssmCanalDashboard.mobileLink.base.v1";
const MOBILE_LINK_NAME_KEY = "ssmCanalDashboard.mobileLink.name.v1";
let mobileSyncTimer = null;
let mobileLastStatus = "";

function mobileTodayKey(){
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
}

function mobileCleanBase(value){
    const text = String(value || "").trim();
    if(!text) return "";
    return text.replace(/\/+$/, "");
}

function mobileGetBase(){
    try{
        const params = new URLSearchParams(window.location.search || "");
        const supplied = mobileCleanBase(params.get("base") || params.get("server") || params.get("dashboard"));
        if(supplied){
            localStorage.setItem(MOBILE_LINK_BASE_KEY, supplied);
            return supplied;
        }
    }catch(e){}

    const saved = mobileCleanBase(localStorage.getItem(MOBILE_LINK_BASE_KEY));
    if(saved) return saved;

    if(location.protocol !== "file:" && location.origin){
        const origin = mobileCleanBase(location.origin);
        try{ localStorage.setItem(MOBILE_LINK_BASE_KEY, origin); }catch(e){}
        return origin;
    }

    return "";
}

function mobileGetToken(){
    return String(localStorage.getItem(MOBILE_LINK_TOKEN_KEY) || "").trim();
}

function mobileSetToken(token){
    if(token) localStorage.setItem(MOBILE_LINK_TOKEN_KEY, String(token));
}

function mobileClearToken(){
    localStorage.removeItem(MOBILE_LINK_TOKEN_KEY);
}


const MOBILE_DELETED_ENTRIES_KEY = "ssmCanalDashboard.mobile.deletedEntries.v1";

function mobileReadDeletedEntries(){
    try{
        const list = JSON.parse(localStorage.getItem(MOBILE_DELETED_ENTRIES_KEY) || "[]");
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return (Array.isArray(list) ? list : []).filter(item => item && item.keys && item.deletedAtMs > cutoff);
    }catch(e){
        return [];
    }
}

function mobileSaveDeletedEntries(list){
    try{
        localStorage.setItem(MOBILE_DELETED_ENTRIES_KEY, JSON.stringify((list || []).slice(-600)));
    }catch(e){}
}

function mobileDeleteKeys(entryOrId){
    const entry = (entryOrId && typeof entryOrId === "object") ? entryOrId : {};
    const values = [
        entryOrId,
        entry.dashboardId,
        entry.recordId,
        entry.id,
        entry.mobileId,
        entry.oldId
    ];
    const keys = [];
    values.forEach(value => {
        if(value && typeof value === "object") return;
        let raw = String(value || "").trim();
        if(!raw) return;
        [raw, raw.replace(/^(mobile:|old:|id:|key:)/i, "")].forEach(v => {
            v = String(v || "").trim();
            if(v && !keys.includes(v)) keys.push(v);
            if(v && !/^(mobile:|old:|id:|key:)/i.test(v)){
                ["mobile:" + v, "old:" + v, "id:" + v].forEach(prefixed => {
                    if(!keys.includes(prefixed)) keys.push(prefixed);
                });
            }
        });
    });
    const fp = [
        String(entry.date || "").slice(0, 10),
        String(entry.time || entry.entryTime || entry.reverseTime || ""),
        String(entry.vessel || entry.vesselName || "").replace(/\s+/g, " ").trim().toUpperCase(),
        String(entry.type || entry.entryType || entry.formType || ""),
        String(entry.direction || entry.dir || entry.reverseDir || "")
    ].join("|");
    if(fp.replace(/\|/g, "").trim()) keys.push("fp:" + fp);
    return [...new Set(keys.filter(Boolean))];
}

function mobileMarkDeletedLocal(entryOrId){
    const keys = mobileDeleteKeys(entryOrId);
    if(!keys.length) return;
    const list = mobileReadDeletedEntries().filter(item => !item.keys.some(k => keys.includes(k)));
    list.push({keys, deletedAt:new Date().toISOString(), deletedAtMs:Date.now()});
    mobileSaveDeletedEntries(list);
}

function mobileClearDeletedLocal(entryOrId){
    const keys = mobileDeleteKeys(entryOrId);
    if(!keys.length) return;
    mobileSaveDeletedEntries(mobileReadDeletedEntries().filter(item => !item.keys.some(k => keys.includes(k))));
}

function mobileIsDeletedLocal(entryOrId){
    const keys = mobileDeleteKeys(entryOrId);
    if(!keys.length) return false;
    return mobileReadDeletedEntries().some(item => item.keys.some(k => keys.includes(k)));
}

function mobileCancelQueuedSync(){
    try{ clearTimeout(mobileSyncTimer); }catch(e){}
    mobileSyncTimer = null;
}

function mobileApiUrl(path){
    const base = mobileGetBase();
    if(!base) throw new Error("Missing dashboard address");
    return base + path;
}

function mobileIsPairPage(){
    return /(^|\/)pair\.html$/i.test(location.pathname) || /(^|\/)pair\/?$/i.test(location.pathname);
}

function mobileIsOfflinePage(){
    return /(^|\/)offline\.html$/i.test(location.pathname) || /(^|\/)offline\/?$/i.test(location.pathname);
}

function mobilePageUrl(page, extra){
    const url = new URL(page, location.href);
    const base = mobileGetBase();
    if(base) url.searchParams.set("base", base);
    Object.entries(extra || {}).forEach(([key, value]) => {
        if(value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    });
    return url.toString();
}

function mobileCurrentReturnPath(){
    return (location.pathname.split('/').pop() || 'index.html') + location.search + location.hash;
}

function mobileRedirectToPair(extra){
    if(mobileIsPairPage()) return;
    mobileClearToken();
    location.replace(mobilePageUrl("pair.html", Object.assign({return: mobileCurrentReturnPath()}, extra || {})));
}

function mobileRedirectToOffline(reason){
    if(mobileIsOfflinePage()) return;
    location.replace(mobilePageUrl("offline.html", {reason: reason || "offline", return: mobileCurrentReturnPath()}));
}

function mobileRegisterServiceWorker(){
    if(!("serviceWorker" in navigator) || location.protocol === "file:") return;
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }, {once:true});
}

async function mobilePost(path, payload, options){
    options = options || {};
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 7000));

    try{
        const res = await fetch(mobileApiUrl(path), {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify(payload || {}),
            cache:"no-store",
            signal:controller.signal,
            keepalive:!!options.keepalive
        });

        const out = await res.json().catch(() => ({}));
        if(!res.ok || out.ok === false){
            const err = new Error(out.error || `Request failed (${res.status})`);
            err.status = res.status;
            err.payload = out;
            throw err;
        }
        return out;
    }finally{
        clearTimeout(timeout);
    }
}

async function mobileGetPhoneStatus(){
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5500);
    try{
        const res = await fetch(mobileApiUrl("/api/phone-server/status"), {cache:"no-store", signal:controller.signal});
        const out = await res.json().catch(() => ({}));
        if(!res.ok || out.ok === false) throw new Error(out.error || "Status failed");
        return out;
    }finally{
        clearTimeout(timeout);
    }
}

function mobileEntryKey(log){
    if(!log || typeof log !== "object") return "";
    const mobileId = String(log.mobileId || log.mobile_id || "").trim();
    if(mobileId) return "mobile:" + mobileId.replace(/^mobile:/i, "");

    const id = String(log.dashboardId || log.id || "").trim();
    if(id){
        if(/^mobile:/i.test(id)) return id;
        if(/^old:/i.test(id)) return id;
        if(/^id:/i.test(id)) return id;
        return "mobile:" + id;
    }

    return [
        log.date || "",
        log.time || log.entryTime || log.reverseTime || "",
        String(log.vessel || log.vesselName || "").toUpperCase(),
        log.type || log.entryType || log.formType || "",
        log.direction || log.dir || log.reverseDir || ""
    ].join("|");
}

function mobileNormalizeForServer(log){
    const copy = Object.assign({}, log || {});
    let id = String(copy.mobileId || copy.id || "").trim();
    if(/^mobile:/i.test(id)) id = id.replace(/^mobile:/i, "");
    if(!id) id = "mobile_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

    copy.id = copy.id || id;
    copy.mobileId = copy.mobileId || id;
    copy.date = String(copy.date || mobileTodayKey()).slice(0, 10);
    copy.time = copy.time || copy.entryTime || copy.reverseTime || formatTime(new Date());
    copy.entryTime = copy.entryTime || copy.time;
    copy.type = copy.type || copy.entryType || copy.formType || "Mobile Entry";
    copy.entryType = copy.entryType || copy.type;
    copy.formType = copy.formType || copy.type;
    copy.vessel = copy.vessel || copy.vesselName || copy.boatName || copy.type || "Mobile Entry";
    copy.vesselName = copy.vesselName || copy.vessel;
    copy.registration = copy.registration || copy.reg || copy.vesselReg || "";
    copy.reg = copy.reg || copy.registration;
    copy.direction = copy.direction || copy.dir || copy.reverseDir || "";
    copy.dir = copy.dir || copy.direction;
    copy.destination = copy.destination || copy.dest || "";
    copy.dest = copy.dest || copy.destination;
    copy.homePort = copy.homePort || "";
    copy.kayakCount = copy.kayakCount || copy.numberOfKayaks || copy.kayaks || "";
    copy.numberOfKayaks = copy.numberOfKayaks || copy.kayakCount || "";
    copy.updatedAt = new Date().toISOString();
    return copy;
}

function mobileLogDateKey(log){
    if(!log || typeof log !== "object") return "";

    const raw = String(
        log.date ||
        log.entryDate ||
        log.createdAt ||
        log.updatedAt ||
        log.syncedAt ||
        ""
    ).trim();

    if(/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

    const parsed = new Date(raw);
    if(Number.isNaN(parsed.getTime())) return "";
    parsed.setMinutes(parsed.getMinutes() - parsed.getTimezoneOffset());
    return parsed.toISOString().slice(0, 10);
}

function mobileIsPendingLocalLog(log){
    if(!log || typeof log !== "object") return false;
    if(log.__pendingSync === true) return true;

    /*
       Logs that were pulled from the dashboard always get dashboardId/fromDashboard/syncedAt.
       If a log does not have any of those markers, keep it during an authoritative pull so
       offline entries are not erased before they get pushed to the dashboard.
    */
    return !log.fromDashboard && !log.dashboardId && !log.syncedAt;
}

function mobileMergeServerLogs(serverLogs, options){
    if(!Array.isArray(serverLogs)) return;

    options = options || {};
    const replaceDates = new Set();
    const suppliedDate = String(options.replaceDate || options.date || "").slice(0, 10);
    if(/^\d{4}-\d{2}-\d{2}$/.test(suppliedDate)) replaceDates.add(suppliedDate);

    serverLogs.forEach(log => {
        const key = mobileLogDateKey(log);
        if(key) replaceDates.add(key);
    });

    /*
       The dashboard is authoritative for the current day. This is the important part:
       if an entry is deleted on the dashboard, the phone must remove its old cached copy
       instead of merging it back in forever.
    */
    if(!replaceDates.size && options.authoritative !== false) replaceDates.add(mobileTodayKey());

    const map = new Map();

    getLogs().forEach(log => {
        const key = mobileEntryKey(log);
        if(!key) return;

        const dateKey = mobileLogDateKey(log) || mobileTodayKey();

        if(replaceDates.has(dateKey)){
            if(mobileIsPendingLocalLog(log)) map.set(key, log);
            return;
        }

        map.set(key, log);
    });

    serverLogs.forEach(log => {
        if(!log || typeof log !== "object") return;
        const normalized = normalizeLogProfileFields(Object.assign({}, log, {
            __pendingSync:false,
            fromDashboard:true,
            syncedAt:new Date().toISOString()
        }));
        const key = mobileEntryKey(normalized);
        if(!key) return;
        map.set(key, Object.assign({}, map.get(key) || {}, normalized));
    });

    const merged = Array.from(map.values()).sort((a, b) => {
        const ad = String(a.date || "");
        const bd = String(b.date || "");
        if(ad !== bd) return bd.localeCompare(ad);
        return String(b.time || b.entryTime || b.reverseTime || "").localeCompare(String(a.time || a.entryTime || a.reverseTime || ""));
    });

    window.__ssmMobileSyncSuppress = true;
    try{ setLogs(merged); }
    finally{ window.__ssmMobileSyncSuppress = false; }

    try{ renderLogs(); }catch(e){}
    try{ updateHome(); }catch(e){}

    try{
        window.dispatchEvent(new CustomEvent("ssm-mobile-logs-synced", {
            detail:{replaceDates:Array.from(replaceDates)}
        }));
    }catch(e){}
}

function mobileSetStatus(message, state){
    mobileLastStatus = message || "";
    window.__ssmMobileLastStatus = mobileLastStatus;

    const oldBanner = document.getElementById("mobileLinkStatus");
    if(oldBanner) oldBanner.remove();

    const status = document.getElementById("pairStatus") || document.getElementById("offlineStatus");
    if(status){
        status.textContent = mobileLastStatus;
        status.dataset.state = state || "idle";
    }
}

function mobileEnsureLinkBanner(){
    ensureMobileUiFixStyles();
    const oldBanner = document.getElementById("mobileLinkStatus");
    if(oldBanner) oldBanner.remove();
}

function mobileRefreshBannerForm(){
    const oldBanner = document.getElementById("mobileLinkStatus");
    if(oldBanner) oldBanner.remove();
}

async function mobileLinkWithCode(code){
    mobileSetStatus("Linking phone…", "idle");

    try{
        const out = await mobilePost("/api/mobile/link", {
            code:String(code || "").trim(),
            name:getActiveDeviceLabel(),
            platform:getDeviceInfo().platform
        }, {timeoutMs:8000});

        mobileSetToken(out.token);
        if(out.phone && out.phone.name) localStorage.setItem(MOBILE_LINK_NAME_KEY, out.phone.name);
        mobileSetStatus("Phone linked.", "linked");
        await mobileBootstrap(false);
        return out;
    }catch(error){
        if(error.status === 423) mobileSetStatus("Phone Link is stopped. Start it on the dashboard first.", "error");
        else mobileSetStatus(error.message || "Could not link phone.", "error");
        throw error;
    }
}

async function mobileBootstrap(showStatus){
    const token = mobileGetToken();
    mobileEnsureLinkBanner();

    if(!token){
        if(!mobileIsPairPage() && !mobileIsOfflinePage()) mobileRedirectToPair();
        return null;
    }

    if(showStatus) mobileSetStatus("Loading dashboard entries…", "idle");

    try{
        const out = await mobilePost("/api/mobile/bootstrap", {token, date:mobileTodayKey()}, {timeoutMs:9000});
        if(Array.isArray(out.logs)) mobileMergeServerLogs(out.logs, {replaceDate:out.date || mobileTodayKey()});
        if(out.entryPresets || out.registry) mobileStoreDashboardPresets(out.entryPresets, out.registry);
        const name = out.phone && out.phone.name ? out.phone.name : localStorage.getItem(MOBILE_LINK_NAME_KEY);
        if(name) localStorage.setItem(MOBILE_LINK_NAME_KEY, name);
        mobileSetStatus("Ready", "linked");
        return out;
    }catch(error){
        if(error.status === 401){
            mobileClearToken();
            if(!mobileIsPairPage()) mobileRedirectToPair({reason:"unlinked"});
        }else if(error.status === 423){
            mobileRedirectToOffline("stopped");
        }else{
            mobileRedirectToOffline(navigator.onLine === false ? "network" : "offline");
        }
        return null;
    }
}

async function mobilePushEntry(entry, options){
    const token = mobileGetToken();
    if(!token) return null;

    const payloadEntry = mobileNormalizeForServer(entry);
    mobileClearDeletedLocal(payloadEntry);
    try{
        const out = await mobilePost("/api/mobile/entry/update", {
            token,
            id:payloadEntry.dashboardId || payloadEntry.mobileId || payloadEntry.id,
            date:payloadEntry.date || mobileTodayKey(),
            entry:payloadEntry
        }, {timeoutMs:(options && options.timeoutMs) || 7000, keepalive:true});
        if(Array.isArray(out.logs)) mobileMergeServerLogs(out.logs, {replaceDate:out.date || mobileTodayKey()});
        mobileSetStatus("Saved", "linked");
        return out;
    }catch(error){
        if(error.status === 401) mobileRedirectToPair({reason:"unlinked"});
        else if(error.status === 423) mobileRedirectToOffline("stopped");
        else if(!options || !options.silent) mobileRedirectToOffline("offline");
        return null;
    }
}

async function mobileDeleteEntry(entryOrId, options){
    const token = mobileGetToken();
    if(!token) return null;

    options = options || {};
    const entry = (entryOrId && typeof entryOrId === "object") ? entryOrId : {};
    const id = String(
        entry.dashboardId ||
        entry.id ||
        entry.mobileId ||
        entryOrId ||
        ""
    ).trim();
    const deleteKeys = mobileDeleteKeys(entryOrId);
    mobileCancelQueuedSync();
    mobileMarkDeletedLocal(entryOrId);

    try{
        const out = await mobilePost("/api/mobile/entry/delete", {
            token,
            id,
            ids:deleteKeys,
            deletedKeys:deleteKeys,
            date:entry.date || options.date || mobileTodayKey(),
            entry
        }, {timeoutMs:options.timeoutMs || 7000, keepalive:true});

        if(Array.isArray(out.logs)) mobileMergeServerLogs(out.logs, {replaceDate:out.date || entry.date || mobileTodayKey()});
        mobileSetStatus("Deleted", "linked");
        return out;
    }catch(error){
        if(error.status === 401) mobileRedirectToPair({reason:"unlinked"});
        else if(error.status === 423) mobileRedirectToOffline("stopped");
        else if(!options.silent) mobileRedirectToOffline("offline");
        return null;
    }
}

async function mobileSyncAll(logs){
    const token = mobileGetToken();
    if(!token) return null;

    const list = (Array.isArray(logs) ? logs : getLogs())
        .filter(log => String(log.date || log.createdAt || "").includes(mobileTodayKey()))
        .filter(log => !mobileIsDeletedLocal(log))
        .map(mobileNormalizeForServer)
        .slice(0, 250);

    try{
        const out = await mobilePost("/api/mobile/logs", {token, date:mobileTodayKey(), logs:list}, {timeoutMs:9000});
        if(Array.isArray(out.logs)) mobileMergeServerLogs(out.logs, {replaceDate:out.date || mobileTodayKey()});
        return out;
    }catch(error){
        if(error.status === 401) mobileRedirectToPair({reason:"unlinked"});
        else if(error.status === 423) mobileRedirectToOffline("stopped");
        return null;
    }
}

function mobileQueueSyncAll(logs){
    mobileCancelQueuedSync();
    mobileSyncTimer = setTimeout(() => mobileSyncAll(Array.isArray(logs) ? getLogs() : undefined), 900);
}

function finishSavedEntry(entry){
    clearCurrentDraft();
    const go = () => { window.location.href = "logs.html"; };
    if(window.mobileLinkSync && window.mobileLinkSync.isLinked()){
        window.mobileLinkSync.pushEntry(entry, {silent:true, timeoutMs:2500}).finally(go);
    }else{
        go();
    }
}

async function mobileInitLinking(){
    mobileRegisterServiceWorker();
    mobileEnsureLinkBanner();

    if(mobileIsPairPage() || mobileIsOfflinePage()) return;

    let oldPair = "";
    try{ oldPair = String(new URLSearchParams(window.location.search || "").get("pair") || "").trim(); }catch(e){}
    if(oldPair){
        mobileRedirectToPair({code:oldPair, return: location.pathname.split('/').pop() || 'index.html'});
        return;
    }

    if(!mobileGetToken()){
        mobileRedirectToPair();
        return;
    }

    try{
        const status = await mobileGetPhoneStatus();
        if(!status || !status.running){
            mobileRedirectToOffline("stopped");
            return;
        }
    }catch(error){
        mobileRedirectToOffline(navigator.onLine === false ? "network" : "offline");
        return;
    }

    mobileBootstrap(true);
}

window.mobileLinkSync = {
    isLinked:() => !!mobileGetToken(),
    bootstrap:mobileBootstrap,
    pushEntry:mobilePushEntry,
    deleteEntry:mobileDeleteEntry,
    syncAll:mobileSyncAll,
    queueSyncAll:mobileQueueSyncAll,
    cancelQueuedSync:mobileCancelQueuedSync,
    markDeletedLocal:mobileMarkDeletedLocal,
    unlink:() => { mobileClearToken(); mobileRedirectToPair({reason:"unlinked"}); }
};

window.addEventListener("DOMContentLoaded", function(){
    mobileInitLinking();
    setInterval(function(){
        if(mobileGetToken() && !mobileIsPairPage() && !mobileIsOfflinePage()) mobileBootstrap(false);
    }, 10000);
});

/* BASIC HELPERS */

function pad(value){
    return String(value).padStart(2, "0");
}

function currentTime(){
    const now = new Date();
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function currentDate(){
    return new Date().toISOString().split("T")[0];
}

function escapeHtml(value){
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* HOME */

function updateHome(){
    const total = document.getElementById("total");
    const date = document.getElementById("date");
    const time = document.getElementById("time");

    if(total) total.innerText = getLogs().length;
    if(date) date.innerText = formatDate();
    if(time) time.innerText = formatTime(new Date(), true);
}

/* DRAFT SYSTEM */

function getDraftKey(type){
    const page = location.pathname.split("/").pop() || "form";
    return `${DRAFT_PREFIX}${page}:${type}`;
}

function fieldExists(id){
    return !!document.getElementById(id);
}

function getFieldValue(id){
    const el = document.getElementById(id);
    return el ? el.value : "";
}

function setFieldValue(id, value){
    const el = document.getElementById(id);

    if(!el || value === undefined || value === null) return;

    if(el.tagName === "SELECT"){
        const values = [...el.options].map(option => option.value || option.textContent);

        if(values.includes(value)){
            el.value = value;
        }else{
            const otherOption = [...el.options].find(option =>
                option.dataset.manual === "true" ||
                option.value === "Other" ||
                option.textContent === "Other"
            );

            if(otherOption){
                el.value = otherOption.value || otherOption.textContent;
            }
        }
    }else{
        el.value = value;
    }

    el.dispatchEvent(new Event("change", { bubbles:true }));
    el.dispatchEvent(new Event("input", { bubbles:true }));
}

function collectDraft(fieldIds){
    const data = {};

    fieldIds.forEach(id => {
        if(fieldExists(id)){
            data[id] = getFieldValue(id);
        }
    });

    return data;
}

function draftHasContent(data){
    return Object.entries(data).some(([key, value]) => {
        if(["entryTime", "reverseTime", "canal"].includes(key)) return false;
        return String(value || "").trim() !== "";
    });
}

function makeDraftNotice(form, draftKey){
    if(document.getElementById("draftNotice")) return;

    const notice = document.createElement("div");
    notice.id = "draftNotice";
    notice.innerHTML = `
        <div class="draft-text">
            <strong>Draft Restored</strong>
            <span>Your unsaved entry was backed up on this device.</span>
        </div>
        <button type="button" id="clearDraftBtn">Clear Draft</button>
    `;

    form.prepend(notice);

    const clearBtn = document.getElementById("clearDraftBtn");

    if(clearBtn){
        clearBtn.addEventListener("click", function(){
            const form = document.getElementById("entryForm");

            if(form && typeof form.clearDraftAndResetForm === "function"){
                form.clearDraftAndResetForm();
            }else{
                localStorage.removeItem(draftKey);
                notice.remove();
            }
        });
    }
}

function makeDraftStatus(form){
    if(document.getElementById("draftStatus")) return;

    const status = document.createElement("div");
    status.id = "draftStatus";
    status.textContent = "Draft autosave ready";

    const saveButton = form.querySelector('button[type="submit"]');

    if(saveButton){
        form.insertBefore(status, saveButton);
    }else{
        form.appendChild(status);
    }
}

function setDraftStatus(message){
    const status = document.getElementById("draftStatus");
    if(status) status.textContent = message;
}

function setupDraftSystem(type, fieldIds){
    const form = document.getElementById("entryForm");
    if(!form) return;

    const draftKey = getDraftKey(type);
    const savedDraft = safeParse(localStorage.getItem(draftKey), null);

    let timer = null;
    let isClearingDraft = false;
    let draftPausedUntilUserInput = false;
    let draftDisabled = false;

    function removeDraftNotice(){
        const notice = document.getElementById("draftNotice");
        if(notice) notice.remove();
    }

    function resetDraftForm(){
        isClearingDraft = true;
        clearTimeout(timer);

        form.reset();

        fieldIds.forEach(id => {
            const el = document.getElementById(id);
            if(!el) return;

            if(id.toLowerCase().includes("manual")){
                el.value = "";
                el.style.display = "none";
            }
        });

        const canal = document.getElementById("canal");
        if(canal) canal.value = getDefaultCanal();

        const entryTime = document.getElementById("entryTime");
        if(entryTime) entryTime.value = formatTime(new Date());

        const reverseTime = document.getElementById("reverseTime");
        if(reverseTime) reverseTime.value = formatTime(new Date());

        fieldIds.forEach(id => {
            const el = document.getElementById(id);
            if(!el) return;
            el.dispatchEvent(new Event("change", { bubbles:true }));
        });

        setTimeout(function(){
            isClearingDraft = false;
            draftPausedUntilUserInput = true;
        }, 0);
    }

    function clearDraftAndResetForm(){
        localStorage.removeItem(draftKey);
        removeDraftNotice();
        resetDraftForm();
        setDraftStatus("Draft cleared");
    }

    makeDraftStatus(form);

    if(savedDraft && savedDraft.data){
        Object.entries(savedDraft.data).forEach(([id, value]) => {
            setFieldValue(id, value);
        });

        if(draftHasContent(savedDraft.data)){
            makeDraftNotice(form, draftKey);
            setDraftStatus(`Draft restored from ${savedDraft.savedAtReadable || "last session"}`);
        }else{
            localStorage.removeItem(draftKey);
        }
    }

    ["entryTime", "reverseTime"].forEach(id => {
        const timeField = document.getElementById(id);
        if(timeField && !String(timeField.value || "").trim()){
            timeField.value = formatTime(new Date());
            timeField.dispatchEvent(new Event("input", { bubbles:true }));
            timeField.dispatchEvent(new Event("change", { bubbles:true }));
        }
    });

    function saveDraftNow(){
        if(draftDisabled || isClearingDraft || draftPausedUntilUserInput) return;

        const data = collectDraft(fieldIds);

        if(!draftHasContent(data)){
            localStorage.removeItem(draftKey);
            setDraftStatus("Draft autosave ready");
            return;
        }

        const payload = {
            type:type,
            page:location.pathname.split("/").pop() || "form",
            savedAt:new Date().toISOString(),
            savedAtReadable:new Date().toLocaleString(),
            data:data
        };

        localStorage.setItem(draftKey, JSON.stringify(payload));
        setDraftStatus(`Draft saved ${formatTime(new Date(), true)}`);
    }

    function queueDraftSave(){
        if(draftDisabled || isClearingDraft) return;

        draftPausedUntilUserInput = false;
        clearTimeout(timer);
        timer = setTimeout(saveDraftNow, 250);
    }

    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;

        el.addEventListener("input", queueDraftSave);
        el.addEventListener("change", queueDraftSave);
    });

    window.addEventListener("beforeunload", saveDraftNow);

    form.dataset.draftKey = draftKey;

    form.clearDraft = function(){
        draftDisabled = true;
        draftPausedUntilUserInput = true;
        clearTimeout(timer);
        localStorage.removeItem(draftKey);
    };

    form.clearDraftAndResetForm = clearDraftAndResetForm;
}

function clearCurrentDraft(){
    const form = document.getElementById("entryForm");

    if(form && typeof form.clearDraft === "function"){
        form.clearDraft();
        return;
    }

    if(form && form.dataset.draftKey){
        localStorage.removeItem(form.dataset.draftKey);
    }
}

function getRealSelectValue(selectId, manualId){
    const field = document.getElementById(selectId);
    const manual = document.getElementById(manualId);

    if(!field) return "";

    // Fix for normal text inputs like Recreational Boat vessel/destination/home port
    if(field.tagName !== "SELECT"){
        return field.value.trim();
    }

    const selectedOption = field.options[field.selectedIndex];

    if(selectedOption && selectedOption.dataset.manual === "true" && manual){
        return manual.value.trim() || "Other";
    }

    return field.value.trim();
}



/* DASHBOARD PRESET SYNC */
const MOBILE_DASHBOARD_PRESETS_KEY = "ssmCanalDashboard.mobileEntryPresets";
const MOBILE_DASHBOARD_PRESETS_EVENT = "mobileDashboardPresetsUpdated";
const MOBILE_PRESET_GROUPS = ["RB", "TB", "Gov", "Com", "K"];

function mobilePresetSafeParse(value, fallback){
    try{
        const parsed = JSON.parse(value);
        return parsed == null ? fallback : parsed;
    }catch(error){
        return fallback;
    }
}

function mobileCleanPresetText(value){
    return String(value ?? "").trim();
}

function mobilePresetGroupFromText(type){
    const page = String(location.pathname || "").toLowerCase();
    const title = String(document.title || "").toLowerCase();
    const bodyClass = document.body ? String(document.body.className || "").toLowerCase() : "";
    const text = `${type || ""} ${page} ${title} ${bodyClass}`.toLowerCase();

    if(text.includes("tour")) return "TB";
    if(text.includes("government") || text.includes("police") || text.includes("coast guard")) return "Gov";
    if(text.includes("commercial")) return "Com";
    if(text.includes("kayak")) return "K";
    if(text.includes("returning") || text.includes("recreational")) return "RB";
    return "";
}

function mobileRegistryTypeToPresetGroup(value){
    const raw = String(value || "").trim();
    const text = raw.toLowerCase();
    if(raw === "TB" || text.includes("tour")) return "TB";
    if(raw === "RB" || text.includes("recreational")) return "RB";
    if(raw === "Gov" || raw === "G" || text.includes("government") || text.includes("police") || text.includes("coast guard") || text.includes("border")) return "Gov";
    if(raw === "Com" || raw === "C" || text.includes("commercial")) return "Com";
    if(raw === "K" || text.includes("kayak")) return "K";
    return "TB";
}

function mobileNormalizePreset(raw, forcedType){
    if(!raw || typeof raw !== "object") return null;
    const name = mobileCleanPresetText(raw.name || raw.vessel || raw.vesselName || raw.boat || raw.boatName);
    if(!name) return null;

    const canalReg = mobileCleanPresetText(raw.canalReg || raw.reg || raw.canal || raw.registration || raw.vesselReg);
    const homePort = mobileCleanPresetText(raw.homePort || raw.homeport || raw.home_port || raw.port || [raw.city, raw.state, raw.country].filter(Boolean).join(", "));
    const type = forcedType || mobileRegistryTypeToPresetGroup(raw.type || raw.vesselType || raw.entryType || raw.formType);

    return {
        ...raw,
        type,
        name,
        vessel:name,
        canalReg,
        reg:canalReg,
        registration:mobileCleanPresetText(raw.registration || raw.vesselReg || canalReg),
        vesselReg:mobileCleanPresetText(raw.vesselReg || raw.registration || ""),
        owner:mobileCleanPresetText(raw.owner || raw.company || ""),
        homePort,
        homeport:homePort
    };
}

function mobileNormalizePresetGroups(input, registry){
    const out = {RB:[], TB:[], Gov:[], Com:[], K:[]};
    const add = (type, item) => {
        const group = out[type] ? type : mobileRegistryTypeToPresetGroup(type);
        const preset = mobileNormalizePreset(item, group);
        if(!preset || !out[group]) return;
        const key = preset.name.toLowerCase();
        const existingIndex = out[group].findIndex(p => String(p.name || "").toLowerCase() === key);
        if(existingIndex >= 0){
            out[group][existingIndex] = {...out[group][existingIndex], ...preset};
        }else{
            out[group].push(preset);
        }
    };

    if(input && typeof input === "object"){
        if(Array.isArray(input)){
            input.forEach(item => add(mobileRegistryTypeToPresetGroup(item && (item.type || item.vesselType)), item));
        }else{
            Object.entries(input).forEach(([type, list]) => {
                if(Array.isArray(list)) list.forEach(item => add(type, item));
            });
        }
    }

    if(Array.isArray(registry)){
        registry.forEach(item => add(mobileRegistryTypeToPresetGroup(item && (item.type || item.vesselType)), item));
    }

    MOBILE_PRESET_GROUPS.forEach(type => {
        out[type].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    });

    return out;
}

function mobileStoreDashboardPresets(entryPresets, registry){
    const normalized = mobileNormalizePresetGroups(entryPresets, registry);
    try{
        localStorage.setItem(MOBILE_DASHBOARD_PRESETS_KEY, JSON.stringify(normalized));
    }catch(error){}
    window.dispatchEvent(new CustomEvent(MOBILE_DASHBOARD_PRESETS_EVENT, {detail:{presets:normalized}}));
    mobileApplyDashboardPresets();
    return normalized;
}

function mobileReadDashboardPresets(){
    const saved = mobilePresetSafeParse(localStorage.getItem(MOBILE_DASHBOARD_PRESETS_KEY), null);
    const dashboardSaved = mobilePresetSafeParse(localStorage.getItem("ssmCanalDashboard.entryPresets.byType"), null);
    return mobileNormalizePresetGroups(saved || dashboardSaved || {});
}

function mobilePresetRegistration(preset){
    return mobileCleanPresetText(preset && (preset.canalReg || preset.reg || preset.canal || preset.registration || preset.vesselReg));
}

function mobilePresetHomePort(preset){
    return mobileCleanPresetText(preset && (preset.homePort || preset.homeport || preset.home_port || preset.port || [preset.city, preset.state, preset.country].filter(Boolean).join(", ")));
}

function mobilePresetListForType(type){
    const group = mobilePresetGroupFromText(type);
    const presets = mobileReadDashboardPresets();
    if(group && Array.isArray(presets[group])) return presets[group];
    return [];
}

function mobilePresetLookupForType(type, vesselName){
    const name = mobileCleanPresetText(vesselName).toLowerCase();
    if(!name) return null;
    const list = mobilePresetListForType(type);
    return list.find(preset => String(preset.name || preset.vessel || "").trim().toLowerCase() === name) || null;
}

function mobileSetSyncedField(id, value){
    const field = document.getElementById(id);
    if(!field || value === undefined || value === null || value === "") return;

    if(field.tagName === "SELECT"){
        const text = String(value).trim();
        const exact = [...field.options].find(option => String(option.value || option.textContent || "").trim().toLowerCase() === text.toLowerCase());
        if(exact){
            field.value = exact.value;
        }else{
            const manual = [...field.options].find(option => option.dataset && option.dataset.manual === "true");
            const manualInput = document.getElementById(id + "Manual");
            if(manual){
                manual.value = text || "Other";
                field.value = manual.value;
                if(manualInput){
                    manualInput.value = text;
                    manualInput.style.display = "block";
                }
            }
        }
    }else{
        field.value = String(value);
    }

    field.dispatchEvent(new Event("input", {bubbles:true}));
    field.dispatchEvent(new Event("change", {bubbles:true}));
}

function mobileApplySelectedPreset(type){
    const vessel = document.getElementById("vessel");
    if(!vessel) return;

    const selectedOption = vessel.tagName === "SELECT" ? vessel.options[vessel.selectedIndex] : null;
    if(selectedOption && selectedOption.dataset && selectedOption.dataset.manual === "true") return;

    const vesselName = vessel.tagName === "SELECT" ? vessel.value : vessel.value;
    const preset = mobilePresetLookupForType(type, vesselName);
    if(!preset) return;

    const registration = mobilePresetRegistration(preset);
    const homePort = mobilePresetHomePort(preset);

    if(registration) mobileSetSyncedField("reg", registration);
    if(homePort) mobileSetSyncedField("homePort", homePort);
}

function mobileBuildPresetOption(preset){
    const option = document.createElement("option");
    option.value = preset.name;
    option.textContent = preset.name;
    const reg = mobilePresetRegistration(preset);
    const homePort = mobilePresetHomePort(preset);
    if(reg) option.dataset.reg = reg;
    if(homePort) option.dataset.homePort = homePort;
    return option;
}

function mobileRebuildVesselPresetInput(type){
    const vessel = document.getElementById("vessel");
    if(!vessel) return;

    const list = mobilePresetListForType(type);
    if(!list.length) return;

    const current = mobileCleanPresetText(vessel.value);
    const manualInput = document.getElementById("vesselManual");
    const manualText = mobileCleanPresetText(manualInput && manualInput.value);

    if(vessel.tagName === "SELECT"){
        const label = vessel.options[0] ? vessel.options[0].textContent : "Select Vessel";
        vessel.innerHTML = "";
        const first = document.createElement("option");
        first.value = "";
        first.textContent = label || "Select Vessel";
        vessel.appendChild(first);

        list.forEach(preset => vessel.appendChild(mobileBuildPresetOption(preset)));

        const other = document.createElement("option");
        other.dataset.manual = "true";
        other.value = "Other";
        other.textContent = "Other";
        vessel.appendChild(other);

        if(current && list.some(p => String(p.name || "") === current)){
            vessel.value = current;
        }else if(current && current !== "Other"){
            vessel.value = "Other";
            if(manualInput){
                manualInput.value = manualText || current;
                manualInput.style.display = "block";
            }
        }else if(current === "Other"){
            vessel.value = "Other";
        }else{
            vessel.value = "";
        }
    }else{
        const datalistId = "mobileDashboardPresetList";
        let datalist = document.getElementById(datalistId);
        if(!datalist){
            datalist = document.createElement("datalist");
            datalist.id = datalistId;
            document.body.appendChild(datalist);
        }
        datalist.innerHTML = "";
        list.forEach(preset => datalist.appendChild(mobileBuildPresetOption(preset)));
        vessel.setAttribute("list", datalistId);
        vessel.setAttribute("autocomplete", "off");
    }
}

function mobileApplyDashboardPresets(type){
    const inferredType = type || (document.body && document.body.dataset && document.body.dataset.entryType) || document.title || location.pathname;
    const vessel = document.getElementById("vessel");
    if(!vessel) return;

    mobileRebuildVesselPresetInput(inferredType);

    if(vessel.dataset.dashboardPresetSyncReady !== "true"){
        vessel.dataset.dashboardPresetSyncReady = "true";
        vessel.addEventListener("change", () => mobileApplySelectedPreset(inferredType));
        vessel.addEventListener("input", () => mobileApplySelectedPreset(inferredType));
    }

    mobileApplySelectedPreset(inferredType);
}

async function mobileRefreshDashboardPresets(showStatus){
    const token = mobileGetToken && mobileGetToken();
    if(!token) return null;

    try{
        const out = await mobilePost("/api/mobile/presets", {token}, {timeoutMs:8000});
        if(out.entryPresets || out.registry) mobileStoreDashboardPresets(out.entryPresets, out.registry);
        if(showStatus) mobileSetStatus("Dashboard presets loaded.", "linked");
        return out;
    }catch(error){
        if(showStatus) mobileSetStatus("Could not load dashboard presets.", "error");
        return null;
    }
}

window.mobilePresetLookupForType = mobilePresetLookupForType;
window.mobilePresetListForType = mobilePresetListForType;
window.mobileApplyDashboardPresets = mobileApplyDashboardPresets;
window.mobileRefreshDashboardPresets = mobileRefreshDashboardPresets;
window.addEventListener(MOBILE_DASHBOARD_PRESETS_EVENT, () => mobileApplyDashboardPresets());
window.addEventListener("DOMContentLoaded", () => {
    mobileApplyDashboardPresets();
    if(mobileGetToken && mobileGetToken()) mobileRefreshDashboardPresets(false);
});

/* RECREATIONAL RETURN BOAT SYSTEM */
function isSameEntryDay(entry){
    const today = currentDate();
    const values = [entry.date, entry.createdAt, entry.timestamp, entry.dateTime, entry.entryDate];
    return values.some(value => String(value || "").includes(today));
}

function isRecreationalEntry(entry){
    const type = String(entry.entryType || entry.formType || entry.type || "").toLowerCase();
    return type.includes("recreational") || type.includes("returning");
}

function getReturnBoatLabel(entry){
    const name = entry.vesselName || entry.vessel || entry.boatName || "Unnamed Boat";
    const reg = entry.registration || entry.reg || "No reg";
    const time = entry.time || entry.entryTime || "--";
    return `${name} • ${reg} • ${time}`;
}

function getTodaysRecreationalReturns(){
    const seen = new Set();
    return getLogs()
        .filter(entry => isRecreationalEntry(entry) && isSameEntryDay(entry))
        .filter(entry => {
            const name = String(entry.vesselName || entry.vessel || "").trim().toLowerCase();
            const reg = String(entry.registration || entry.reg || "").trim().toLowerCase();
            const key = `${name}|${reg}`;
            if(!name || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function fillRecreationalReturn(entry){
    if(!entry) return;

    const values = {
        vessel:entry.vesselName || entry.vessel || entry.boatName || "",
        reg:entry.registration || entry.reg || "",
        dir:entry.direction || entry.dir || "",
        pass:entry.passengers || entry.pass || "",
        dest:entry.destination || entry.dest || "",
        homePort:entry.homePort || entry.homeport || entry.home_port || ""
    };

    Object.entries(values).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if(!el || value === undefined || value === null || value === "N/A") return;
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles:true }));
        el.dispatchEvent(new Event("change", { bubbles:true }));
    });
}

function shouldShowRecreationalReturnSystem(type){
    try {
        const params = new URLSearchParams(window.location.search);
        const page = String(window.location.pathname || "").toLowerCase();
        const typeText = String(type || "").toLowerCase();

        return params.has("return") ||
               params.has("returning") ||
               page.includes("returning-boat") ||
               typeText.includes("returning");
    } catch(e) {
        return false;
    }
}

function setupRecreationalReturnSystem(type){
    if(!shouldShowRecreationalReturnSystem(type)) return;

    document.body.classList.add("return-mode");

    const form = document.getElementById("entryForm");
    const vessel = document.getElementById("vessel");
    const reg = document.getElementById("reg");
    if(!form || !vessel || !reg || document.getElementById("returnBoatCard")) return;

    const card = document.createElement("div");
    card.className = "return-card";
    card.id = "returnBoatCard";
    card.innerHTML = `
        <div class="return-head">
            <div>
                <strong>Returning Boat</strong>
                <span>Choose a boat already logged today, then save it as a new returning entry.</span>
            </div>
            <div class="return-pill">Today</div>
        </div>
        <div class="return-select-row">
            <select id="returnBoatSelect">
                <option value="">Select returning boat</option>
            </select>
            <button class="return-clear" id="clearReturnBoat" type="button">Clear</button>
        </div>
        <div class="return-empty" id="returnBoatEmpty"></div>
    `;

    form.prepend(card);

    const select = document.getElementById("returnBoatSelect");
    const clear = document.getElementById("clearReturnBoat");
    const empty = document.getElementById("returnBoatEmpty");

    function loadOptions(){
        const returns = getTodaysRecreationalReturns();
        select.innerHTML = `<option value="">Select returning boat</option>`;

        returns.forEach((entry, index) => {
            const option = document.createElement("option");
            option.value = String(index);
            option.textContent = getReturnBoatLabel(entry);
            select.appendChild(option);
        });

        select._returnEntries = returns;
        empty.textContent = returns.length ? `${returns.length} saved boat${returns.length === 1 ? "" : "s"} from today.` : "No boats saved today yet.";
    }

    select.addEventListener("change", function(){
        if(this.value === "") return;
        const entry = this._returnEntries && this._returnEntries[Number(this.value)];
        fillRecreationalReturn(entry);
    });

    clear.addEventListener("click", function(){
        ["vessel", "reg", "dir", "pass", "dest", "homePort", "notes"].forEach(id => {
            const el = document.getElementById(id);
            if(!el) return;
            el.value = "";
            el.dispatchEvent(new Event("input", { bubbles:true }));
            el.dispatchEvent(new Event("change", { bubbles:true }));
        });
        const canal = document.getElementById("canal");
        if(canal) canal.value = getDefaultCanal();
        select.value = "";
    });

    loadOptions();

    setTimeout(() => {
        if(select && select.options.length > 1) select.focus();
    }, 100);
}

/* FORMS */

function setupNormalForm(type){
    applySavedTheme();
    applyEntryDefaults();

    const normalType = String(type || "").toLowerCase();

    if(normalType.includes("recreational") || normalType.includes("returning")){
        setupRecreationalReturnSystem(type);
    }

    const entryTime = document.getElementById("entryTime");
    if(entryTime && !String(entryTime.value || "").trim()) entryTime.value = formatTime(new Date());

    const vessel = document.getElementById("vessel");
    const reg = document.getElementById("reg");

    if(vessel && reg){
        vessel.addEventListener("change", function(){
            if(vesselData[vessel.value]){
                reg.value = vesselData[vessel.value];
                reg.dispatchEvent(new Event("input", { bubbles:true }));
            }
        });
    }

    setupDraftSystem(type, [
        "vessel",
        "vesselManual",
        "reg",
        "canal",
        "dir",
        "dirManual",
        "pass",
        "kayakCount",
        "dest",
        "destManual",
        "homePort",
        "homePortManual",
        "entryTime",
        "notes"
    ]);

    const form = document.getElementById("entryForm");

    if(form){
        form.addEventListener("submit", function(e){
            e.preventDefault();

            const logs = getLogs();
            const vesselValue = getRealSelectValue("vessel", "vesselManual") || "Unknown";
            const dirValue = getRealSelectValue("dir", "dirManual");
            const destValue = getRealSelectValue("dest", "destManual") || "N/A";
            const homePortValue = getRealSelectValue("homePort", "homePortManual") || "N/A";

            const entryId = "mobile_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
            const entry = stampLogWithProfile({
                id:entryId,
                mobileId:entryId,
                entryType:type,
                formType:type,
                type:type,
                vessel:vesselValue,
                vesselName:vesselValue,
                reg:getFieldValue("reg") || "N/A",
                registration:getFieldValue("reg") || "N/A",
                canal:getFieldValue("canal") || getDefaultCanal(),
                dir:dirValue,
                direction:dirValue,
                pass:getFieldValue("pass") || "0",
                passengers:getFieldValue("pass") || "0",
                kayakCount:getFieldValue("kayakCount") || "",
                numberOfKayaks:getFieldValue("kayakCount") || "",
                dest:destValue,
                destination:destValue,
                homePort:homePortValue,
                time:getFieldValue("entryTime") || formatTime(new Date()),
                entryTime:getFieldValue("entryTime") || formatTime(new Date()),
                date:currentDate(),
                notes:getFieldValue("notes") || "-",
                status:"Pending",
                completed:false,
                createdAt:new Date().toISOString()
            });

            logs.unshift(entry);
            setLogs(logs);
            finishSavedEntry(entry);
        });
    }
}

function setupReversalForm(type = "Lock Reversal"){
    applySavedTheme();
    applyEntryDefaults();

    const reverseTime = document.getElementById("reverseTime");
    const entryTime = document.getElementById("entryTime");

    if(reverseTime && !String(reverseTime.value || "").trim()) reverseTime.value = formatTime(new Date());
    if(entryTime && !String(entryTime.value || "").trim()) entryTime.value = formatTime(new Date());

    setupDraftSystem(type, [
        "canal",
        "reverseDir",
        "reverseTime",
        "entryTime",
        "reverseReason",
        "notes"
    ]);

    const form = document.getElementById("entryForm");

    if(form){
        form.addEventListener("submit", function(e){
            e.preventDefault();

            const reverseReason = getFieldValue("reverseReason");
            const notes = getFieldValue("notes");
            const time = getFieldValue("reverseTime") || getFieldValue("entryTime") || formatTime(new Date());
            const logs = getLogs();

            const entryId = "mobile_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
            const entry = stampLogWithProfile({
                id:entryId,
                mobileId:entryId,
                entryType:type,
                formType:type,
                type:type,
                vessel:type,
                vesselName:type,
                reg:"N/A",
                registration:"N/A",
                canal:getFieldValue("canal") || getDefaultCanal(),
                dir:getFieldValue("reverseDir"),
                direction:getFieldValue("reverseDir"),
                reverseDir:getFieldValue("reverseDir"),
                pass:"N/A",
                passengers:"N/A",
                dest:"N/A",
                destination:"N/A",
                homePort:"N/A",
                time:time,
                entryTime:time,
                reverseTime:time,
                date:currentDate(),
                reason:reverseReason,
                reverseReason:reverseReason,
                notes:notes || reverseReason || "-",
                status:"Pending",
                completed:false,
                createdAt:new Date().toISOString()
            });

            logs.unshift(entry);
            setLogs(logs);
            finishSavedEntry(entry);
        });
    }
}

/* LOGS */

function renderLogs(){
    const logList = document.getElementById("logList");
    if(!logList || document.getElementById("searchInput")) return;

    const logs = getLogs();
    logList.innerHTML = "";

    if(logs.length === 0){
        logList.innerHTML = `<div class="empty">No Entries</div>`;
        return;
    }

    logs.forEach(log => {
        const completed = log.completed || log.status === "Completed";

        logList.innerHTML += `
            <div class="log">
                <b>${escapeHtml(log.type || log.entryType || "Entry")}</b>
                <div class="small">Vessel: ${escapeHtml(log.vessel || "N/A")}</div>
                <div class="small">Registration: ${escapeHtml(log.reg || log.registration || "N/A")}</div>
                <div class="small">Direction: ${escapeHtml(log.dir || log.direction || "N/A")}</div>
                <div class="small">Passengers: ${escapeHtml(log.pass || log.passengers || "N/A")}</div>
                ${log.kayakCount || log.numberOfKayaks ? `<div class="small">Kayaks: ${escapeHtml(log.kayakCount || log.numberOfKayaks)}</div>` : ""}
                <div class="small">Destination: ${escapeHtml(log.dest || log.destination || "N/A")}</div>
                <div class="small">Home Port: ${escapeHtml(log.homePort || "N/A")}</div>
                <div class="small">Date: ${escapeHtml(log.date || "N/A")}</div>
                <div class="small">Time: ${escapeHtml(log.time || log.entryTime || log.reverseTime || "N/A")}</div>
                <div class="small">Added By: ${escapeHtml(getLogUserName(log))}</div>
                <div class="small">Device: ${escapeHtml(getLogDeviceLabel(log))}</div>
                <div class="small">Notes: ${escapeHtml(log.notes || "-")}</div>

                <div class="status ${completed ? "done" : "pending"}">
                    ${completed ? "Completed" : "Pending"}
                </div>

                ${!completed ? `<button class="btn full" onclick="completeLog(${log.id})">Mark Complete</button>` : ""}
            </div>
        `;
    });
}

function completeLog(id){
    const logs = getLogs().map(log => {
        if(Number(log.id) === Number(id)){
            log.status = "Completed";
            log.completed = true;
        }

        return log;
    });

    setLogs(logs);
    renderLogs();
    updateHome();
}

function clearLogs(){
    if(confirm("Delete all entries?")){
        deleteAllLogs();
    }
}

/* SETTINGS PAGE SUPPORT */

function setupSettingsPage(){
    /* settings.html has its own full settings controller.
       Do not attach this older mini controller there, because two click
       handlers/refresh loops can fight each other and flip the theme back. */
    if(document.body && document.body.classList.contains("settings-page")){
        return;
    }
    if(document.getElementById("resetSettingsBtn") || document.getElementById("defaultCanal")){
        return;
    }

    const darkBtn = document.getElementById("darkBtn");
    const lightBtn = document.getElementById("lightBtn");
    const time12Btn = document.getElementById("time12Btn");
    const time24Btn = document.getElementById("time24Btn");
    const previewTime = document.getElementById("previewTime");
    const clearLogsBtn = document.getElementById("clearLogsBtn");

    if(!darkBtn && !lightBtn && !time12Btn && !time24Btn) return;

    function refreshSettingsUI(){
        applySavedTheme();

        const theme = getAppTheme();
        const timeFormat = getTimeFormat();

        if(darkBtn) darkBtn.classList.toggle("active", theme === "dark");
        if(lightBtn) lightBtn.classList.toggle("active", theme === "light");

        if(time12Btn) time12Btn.classList.toggle("active", timeFormat === "12");
        if(time24Btn) time24Btn.classList.toggle("active", timeFormat === "24");

        if(previewTime){
            previewTime.textContent = formatTime(new Date(), true);
        }

        updateHome();
    }

    if(darkBtn){
        darkBtn.addEventListener("click", function(){
            const next = getAppSettings();
            next.theme = "dark";
            saveAppSettings(next);
            refreshSettingsUI();
        });
    }

    if(lightBtn){
        lightBtn.addEventListener("click", function(){
            const next = getAppSettings();
            next.theme = "light";
            saveAppSettings(next);
            refreshSettingsUI();
        });
    }

    if(time12Btn){
        time12Btn.addEventListener("click", function(){
            const next = getAppSettings();
            next.timeFormat = "12";
            saveAppSettings(next);
            refreshSettingsUI();
        });
    }

    if(time24Btn){
        time24Btn.addEventListener("click", function(){
            const next = getAppSettings();
            next.timeFormat = "24";
            saveAppSettings(next);
            refreshSettingsUI();
        });
    }

    if(clearLogsBtn){
        clearLogsBtn.addEventListener("click", function(){
            if(confirm("Delete all entries?")){
                deleteAllLogs();
            }
        });
    }

    refreshSettingsUI();
    setInterval(refreshSettingsUI, 1000);
}


/* PROFILE PAGE + SHARED BOTTOM BAR */

function ensureSharedBottomBar(){
    if(!document.body) return;

    let nav = document.querySelector(".bottom-nav");
    if(!nav){
        nav = document.createElement("nav");
        nav.className = "bottom-nav ssm-bottom-nav";
        document.body.appendChild(nav);
    }else{
        nav.classList.add("ssm-bottom-nav");
    }

    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const entryPages = [
        "new-entry.html",
        "recreational-boat.html",
        "returning-boat.html",
        "tour-boat.html",
        "government-boat.html",
        "commercial-boat.html",
        "kayak.html",
        "lock-reversal.html",
        "lock-test.html"
    ];

    function active(name){
        if(name === "home") return page === "" || page === "index.html";
        if(name === "add") return entryPages.includes(page);
        if(name === "logs") return page === "logs.html";
        if(name === "profile") return page === "profile.html";
        if(name === "settings") return page === "settings.html";
        return false;
    }

    nav.innerHTML = `
        <a class="nav-link ${active("home") ? "active" : ""}" href="index.html" aria-label="Home">
            <svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path></svg>
            <span>Home</span>
        </a>
        <a class="nav-link ${active("add") ? "active" : ""}" href="new-entry.html" aria-label="New Entry">
            <svg viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
            <span>Add</span>
        </a>
        <a class="nav-link ${active("logs") ? "active" : ""}" href="logs.html" aria-label="Logs">
            <svg viewBox="0 0 24 24"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></svg>
            <span>Logs</span>
        </a>
        <a class="nav-link ${active("profile") ? "active" : ""}" href="profile.html" aria-label="Profile">
            <svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"></path><path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"></path></svg>
            <span>Profile</span>
        </a>
        <a class="nav-link ${active("settings") ? "active" : ""}" href="settings.html" aria-label="Settings">
            <svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"></path><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.1 2.1 0 0 1-2.97 2.97l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21a2.1 2.1 0 0 1-4.2 0v-.08a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-1.98.36l-.05.05a2.1 2.1 0 0 1-2.97-2.97l.05-.05a1.8 1.8 0 0 0 .36-1.98 1.8 1.8 0 0 0-1.65-1.1H3a2.1 2.1 0 0 1 0-4.2h.08a1.8 1.8 0 0 0 1.65-1.1 1.8 1.8 0 0 0-.36-1.98l-.05-.05a2.1 2.1 0 0 1 2.97-2.97l.05.05a1.8 1.8 0 0 0 1.98.36 1.8 1.8 0 0 0 1.1-1.65V3a2.1 2.1 0 0 1 4.2 0v.08a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.1 2.1 0 0 1 2.97 2.97l-.05.05a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.1H21a2.1 2.1 0 0 1 0 4.2h-.08A1.8 1.8 0 0 0 19.4 15Z"></path></svg>
            <span>Settings</span>
        </a>
    `;
}

function ensureSharedBottomBarStyles(){
    let style = document.getElementById("ssmSharedBottomBarStyles");
    if(!style){
        style = document.createElement("style");
        style.id = "ssmSharedBottomBarStyles";
        document.head.appendChild(style);
    }

    style.textContent = `
html{ -webkit-text-size-adjust:100%; touch-action:manipulation; overscroll-behavior:none; }
body{ touch-action:manipulation; overscroll-behavior:none; }
input, select, textarea{ font-size:16px !important; }
html, body{ padding-bottom:0; }
body{ --safe-bottom:env(safe-area-inset-bottom, 0px); }
.app, .page{ padding-bottom:calc(96px + var(--safe-bottom, 0px)) !important; }
.bottom-nav.ssm-bottom-nav{
    position:fixed !important;
    left:0 !important;
    right:0 !important;
    bottom:0 !important;
    width:100% !important;
    max-width:430px !important;
    margin:0 auto !important;
    height:calc(68px + var(--safe-bottom, 0px)) !important;
    padding:7px 12px calc(7px + var(--safe-bottom, 0px)) !important;
    display:grid !important;
    grid-template-columns:repeat(5, 1fr) !important;
    gap:4px !important;
    background:rgba(17,24,39,.94) !important;
    border-top:1px solid rgba(148,163,184,.18) !important;
    box-shadow:0 -14px 30px rgba(0,0,0,.26) !important;
    backdrop-filter:blur(18px) !important;
    -webkit-backdrop-filter:blur(18px) !important;
    z-index:9999 !important;
}
.bottom-nav.ssm-bottom-nav .nav-link{
    min-width:0 !important;
    height:52px !important;
    border-radius:16px !important;
    display:flex !important;
    flex-direction:column !important;
    align-items:center !important;
    justify-content:center !important;
    gap:3px !important;
    color:var(--muted, #94a3b8) !important;
    text-decoration:none !important;
    font-size:10px !important;
    line-height:1 !important;
    font-weight:800 !important;
    letter-spacing:-.01em !important;
    background:transparent !important;
    border:1px solid transparent !important;
}
.bottom-nav.ssm-bottom-nav .nav-link svg{
    width:20px !important;
    height:20px !important;
    stroke:currentColor !important;
    stroke-width:2.2 !important;
    fill:none !important;
    stroke-linecap:round !important;
    stroke-linejoin:round !important;
}
.bottom-nav.ssm-bottom-nav .nav-link.active{
    color:#fff !important;
    background:linear-gradient(135deg, var(--blue, #348DBC), var(--blue-hover, #3F9FCE)) !important;
    border-color:rgba(255,255,255,.12) !important;
    box-shadow:0 8px 18px rgba(var(--accent-rgb,52,141,188), .22) !important;
}
.bottom-nav.ssm-bottom-nav .nav-link:active{ transform:scale(.96); }
html.theme-light .bottom-nav.ssm-bottom-nav,
body.light .bottom-nav.ssm-bottom-nav{
    background:rgba(255,255,255,.96) !important;
    border-top:1px solid rgba(var(--accent-rgb,52,141,188), .22) !important;
    box-shadow:0 -12px 28px rgba(var(--accent-rgb,52,141,188), .10) !important;
}
html.theme-light .bottom-nav.ssm-bottom-nav .nav-link,
body.light .bottom-nav.ssm-bottom-nav .nav-link{
    color:#64748b !important;
}
html.theme-light .bottom-nav.ssm-bottom-nav .nav-link.active,
body.light .bottom-nav.ssm-bottom-nav .nav-link.active{
    color:#fff !important;
    background:linear-gradient(135deg, var(--blue, #348DBC), var(--blue-hover, #3F9FCE)) !important;
}
.profile-card, .device-card{
    background:var(--card, rgba(255,255,255,.9));
    border:1px solid var(--border, rgba(148,163,184,.18));
    border-radius:22px;
    box-shadow:var(--shadow, 0 10px 24px rgba(0,0,0,.12));
    padding:15px;
    margin-bottom:14px;
}
.profile-label{
    display:block;
    font-size:12px;
    font-weight:850;
    color:var(--muted, #94a3b8);
    margin-bottom:7px;
}
.profile-input{
    width:100%;
    min-height:52px;
    border-radius:16px;
    border:1px solid var(--border-strong, var(--border, #dce7f2));
    background:var(--input, #fff);
    color:var(--text, #111827);
    padding:0 13px;
    font-size:16px;
    font-weight:750;
    outline:0;
}
.profile-input:focus{
    border-color:var(--blue-border, var(--blue, #348DBC));
    box-shadow:0 0 0 4px rgba(var(--accent-rgb,52,141,188), .16);
}
.profile-save-btn{
    width:100%;
    min-height:54px;
    border:0;
    border-radius:18px;
    color:#fff;
    background:linear-gradient(135deg, var(--blue, #348DBC), var(--blue-hover, #3F9FCE));
    font-size:15px;
    font-weight:900;
    margin-top:12px;
    box-shadow:0 12px 26px rgba(var(--accent-rgb,52,141,188), .22);
}
.profile-hint{
    margin:9px 0 0;
    color:var(--muted, #94a3b8);
    font-size:12px;
    line-height:1.35;
    font-weight:650;
}
.device-list{ display:grid; gap:9px; }
.device-row{
    display:flex;
    justify-content:space-between;
    gap:12px;
    padding:10px 0;
    border-bottom:1px solid var(--border, rgba(148,163,184,.16));
}
.device-row:last-child{ border-bottom:0; }
.device-row strong{ font-size:12px; color:var(--muted, #94a3b8); }
.device-row span{ font-size:12px; color:var(--text, #111827); text-align:right; overflow-wrap:anywhere; font-weight:750; }
.profile-toast{
    position:fixed;
    left:50%;
    bottom:calc(86px + var(--safe-bottom, 0px));
    transform:translateX(-50%) translateY(18px);
    opacity:0;
    pointer-events:none;
    background:var(--text, #111827);
    color:var(--page, #fff);
    border-radius:999px;
    padding:10px 14px;
    font-size:12px;
    font-weight:850;
    transition:.2s ease;
    z-index:10000;
}
.profile-toast.show{ opacity:1; transform:translateX(-50%) translateY(0); }

html.theme-dark body.logs-page,
html.theme-dark body.logs-page .page{
    background:linear-gradient(180deg,#0f172a 0%,#111827 100%) !important;
    color:#f8fafc !important;
}
html.theme-dark body.logs-page .entries-wrap{ background:transparent !important; }
html.theme-dark body.logs-page .controls-card,
html.theme-dark body.logs-page .stat-card,
html.theme-dark body.logs-page .entry-card,
html.theme-dark body.logs-page .empty-box{
    background:linear-gradient(180deg,rgba(23,32,51,.96),rgba(17,24,39,.96)) !important;
    border:1px solid rgba(148,163,184,.18) !important;
    box-shadow:0 12px 28px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.04) !important;
    color:#f8fafc !important;
}
html.theme-dark body.logs-page .entry-title,
html.theme-dark body.logs-page .entry-line strong,
html.theme-dark body.logs-page .stat-card span{ color:#f8fafc !important; }
html.theme-dark body.logs-page .entry-type,
html.theme-dark body.logs-page .entry-line,
html.theme-dark body.logs-page .result-bar,
html.theme-dark body.logs-page .control-label,
html.theme-dark body.logs-page .stat-card small,
html.theme-dark body.logs-page .group-title{ color:#a9b8cb !important; }
html.theme-dark body.logs-page .meta-pill,
html.theme-dark body.logs-page .view-tab,
html.theme-dark body.logs-page .undo-btn,
html.theme-dark body.logs-page .cancel-edit-btn,
html.theme-dark body.logs-page .export{
    background:rgba(31,42,61,.92) !important;
    color:#dbeafe !important;
    border:1px solid rgba(148,163,184,.22) !important;
}
html.theme-dark body.logs-page .search-box,
html.theme-dark body.logs-page .filter-grid select,
html.theme-dark body.logs-page .edit-form input,
html.theme-dark body.logs-page .edit-form textarea,
html.theme-dark body.logs-page .edit-form select{
    background:#0f172a !important;
    color:#f8fafc !important;
    border:1px solid rgba(148,163,184,.22) !important;
}
html.theme-dark body.logs-page .search-box::placeholder,
html.theme-dark body.logs-page .edit-form input::placeholder,
html.theme-dark body.logs-page .edit-form textarea::placeholder{ color:#94a3b8 !important; }
html.theme-dark body.logs-page .view-tab.active,
html.theme-dark body.logs-page .edit-btn,
html.theme-dark body.logs-page .save-edit-btn{
    background:linear-gradient(135deg,var(--blue,#348DBC),var(--blue-hover,#3F9FCE)) !important;
    color:#fff !important;
    border-color:var(--blue-border,#5CADDA) !important;
}
`;
}

function setupProfilePage(){
    const form = document.getElementById("profileForm");
    const nameInput = document.getElementById("profileName");
    const deviceInput = document.getElementById("deviceLabel");
    const list = document.getElementById("deviceInfoList");
    const preview = document.getElementById("profilePreview");
    const toast = document.getElementById("profileToast");

    if(!form || !nameInput) return;

    function showToast(message){
        if(!toast) return;
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => toast.classList.remove("show"), 1500);
    }

    function refresh(){
        const profile = getProfile();
        const info = getDeviceInfo();
        nameInput.value = profile.userName;
        if(deviceInput) deviceInput.value = profile.deviceLabel;
        if(preview) preview.textContent = `New logs will show: Added by ${profile.userName}`;

        if(list){
            const rows = [
                ["Device label", profile.deviceLabel || getActiveDeviceLabel()],
                ["Platform", info.platform],
                ["Screen", info.screen],
                ["Viewport", info.viewport],
                ["Timezone", info.timezone],
                ["Language", info.language],
                ["Connection", info.connection],
                ["App mode", info.standalone],
                ["Status", info.online],
                ["Touch", info.touch],
                ["Browser", info.browser]
            ];

            list.innerHTML = rows.map(([label, value]) => `
                <div class="device-row">
                    <strong>${escapeHtml(label)}</strong>
                    <span>${escapeHtml(value || "N/A")}</span>
                </div>
            `).join("");
        }
    }

    form.addEventListener("submit", function(e){
        e.preventDefault();
        saveProfile({
            userName:nameInput.value,
            deviceLabel:deviceInput ? deviceInput.value : ""
        });
        refresh();
        showToast("Profile saved");
    });

    refresh();
    window.addEventListener("resize", refresh);
}

/* START */

blockMobileZoom();
document.addEventListener("DOMContentLoaded", function(){
    blockMobileZoom();
    applySavedTheme();
    applyEntryDefaults();
    migrateOldLogs();
    ensureSharedBottomBarStyles();
    ensureSharedBottomBar();

    updateHome();
    setInterval(updateHome, 1000);

    renderLogs();
    setupSettingsPage();
    setupProfilePage();
});

/* Light accent visibility runtime patch. Required for index.html because the home page uses inline CSS. */
(function(){
  const css = '\n\n/* LIGHT MODE ACCENT VISIBILITY FIX 2026-07-06\n   Accent colour is now visible in light mode without turning the logo into a coloured block. */\nhtml.theme-light,\nhtml.theme-light body,\nbody.light{\n  --accent-shadow:rgba(var(--accent-rgb,52,141,188), .18);\n  --accent-soft-shadow:rgba(var(--accent-rgb,52,141,188), .10);\n}\n\n/* Keep the text logo clean. The accent must not paint behind the title. */\nhtml.theme-light .app-header .app-logo-title,\nhtml.theme-light .app-header .app-logo-title span,\nhtml.theme-light .app-header .app-logo-title small,\nbody.light .app-header .app-logo-title,\nbody.light .app-header .app-logo-title span,\nbody.light .app-header .app-logo-title small{\n  background:transparent !important;\n  background-image:none !important;\n  box-shadow:none !important;\n  outline:0 !important;\n}\n\nhtml.theme-light .app-header,\nbody.light .app-header{\n  border-bottom:2px solid rgba(var(--accent-rgb,52,141,188), .22) !important;\n}\n\nhtml.theme-light .header-btn,\nhtml.theme-light .back,\nbody.light .header-btn,\nbody.light .back{\n  background:linear-gradient(180deg, #ffffff, var(--blue-soft)) !important;\n  color:var(--blue) !important;\n  border:1px solid rgba(var(--accent-rgb,52,141,188), .34) !important;\n  box-shadow:0 8px 18px rgba(var(--accent-rgb,52,141,188), .10) !important;\n}\n\nhtml.theme-light .today-card,\nbody.light .today-card,\nhtml.theme-light .entry-hero,\nbody.light .entry-hero,\nhtml.theme-light .home-hero,\nbody.light .home-hero{\n  background:radial-gradient(circle at 92% 8%, rgba(255,255,255,.35), transparent 27%), linear-gradient(135deg, var(--blue), var(--blue-hover)) !important;\n  border:1px solid rgba(var(--accent-rgb,52,141,188), .32) !important;\n  box-shadow:0 18px 36px rgba(var(--accent-rgb,52,141,188), .24) !important;\n  color:#fff !important;\n}\n\nhtml.theme-light .mini-icon,\nbody.light .mini-icon{\n  background:rgba(255,255,255,.24) !important;\n  color:#fff !important;\n}\n\nhtml.theme-light .section-title small,\nbody.light .section-title small,\nhtml.theme-light .settings-status,\nbody.light .settings-status{\n  color:var(--blue) !important;\n}\n\nhtml.theme-light .settings-status,\nbody.light .settings-status{\n  background:var(--blue-soft) !important;\n  border-color:rgba(var(--accent-rgb,52,141,188), .34) !important;\n}\n\nhtml.theme-light .btn,\nbody.light .btn,\nhtml.theme-light .setting-card,\nbody.light .setting-card,\nhtml.theme-light .summary-card,\nbody.light .summary-card,\nhtml.theme-light .preview-card,\nbody.light .preview-card,\nhtml.theme-light .storage-card,\nbody.light .storage-card,\nhtml.theme-light .auto-card,\nbody.light .auto-card,\nhtml.theme-light .form-section,\nbody.light .form-section,\nhtml.theme-light .return-card,\nbody.light .return-card,\nhtml.theme-light .return-panel,\nbody.light .return-panel,\nhtml.theme-light .kayak-info,\nbody.light .kayak-info,\nhtml.theme-light .entry-card,\nbody.light .entry-card,\nhtml.theme-light .log,\nbody.light .log,\nhtml.theme-light .box,\nbody.light .box{\n  border-color:rgba(var(--accent-rgb,52,141,188), .26) !important;\n  box-shadow:0 10px 24px rgba(var(--accent-rgb,52,141,188), .08) !important;\n}\n\nhtml.theme-light .btn-icon,\nbody.light .btn-icon,\nhtml.theme-light .btn:nth-child(1) .btn-icon,\nhtml.theme-light .btn:nth-child(2) .btn-icon,\nhtml.theme-light .btn:nth-child(3) .btn-icon,\nhtml.theme-light .btn:nth-child(4) .btn-icon,\nhtml.theme-light .btn:nth-child(5) .btn-icon,\nhtml.theme-light .btn:nth-child(6) .btn-icon,\nhtml.theme-light .btn:nth-child(7) .btn-icon,\nhtml.theme-light .btn:nth-child(8) .btn-icon,\nbody.light .btn:nth-child(1) .btn-icon,\nbody.light .btn:nth-child(2) .btn-icon,\nbody.light .btn:nth-child(3) .btn-icon,\nbody.light .btn:nth-child(4) .btn-icon,\nbody.light .btn:nth-child(5) .btn-icon,\nbody.light .btn:nth-child(6) .btn-icon,\nbody.light .btn:nth-child(7) .btn-icon,\nbody.light .btn:nth-child(8) .btn-icon{\n  background:linear-gradient(180deg, #ffffff, var(--blue-soft)) !important;\n  color:var(--blue) !important;\n  border:1px solid rgba(var(--accent-rgb,52,141,188), .30) !important;\n  box-shadow:0 8px 18px rgba(var(--accent-rgb,52,141,188), .10) !important;\n}\n\nhtml.theme-light .btn.return-btn .btn-icon,\nbody.light .btn.return-btn .btn-icon,\nhtml.theme-light .panel-icon,\nbody.light .panel-icon,\nhtml.theme-light .toggle-btn.active,\nbody.light .toggle-btn.active,\nhtml.theme-light .switch.active,\nbody.light .switch.active,\nhtml.theme-light .action-btn.primary,\nbody.light .action-btn.primary,\nhtml.theme-light .continue-btn,\nbody.light .continue-btn,\nhtml.theme-light .confirm-reset-btn,\nbody.light .confirm-reset-btn,\nhtml.theme-light .btn.full,\nbody.light .btn.full,\nhtml.theme-light button.btn.full,\nbody.light button.btn.full{\n  background:linear-gradient(135deg, var(--blue), var(--blue-hover)) !important;\n  color:#fff !important;\n  border-color:var(--blue-border) !important;\n  box-shadow:0 12px 26px rgba(var(--accent-rgb,52,141,188), .20) !important;\n}\n\nhtml.theme-light .bottom-nav,\nbody.light .bottom-nav{\n  background:rgba(255,255,255,.94) !important;\n  border-top:2px solid rgba(var(--accent-rgb,52,141,188), .24) !important;\n  box-shadow:0 -12px 28px rgba(var(--accent-rgb,52,141,188), .08) !important;\n}\n\nhtml.theme-light .nav-link.active,\nbody.light .nav-link.active{\n  color:var(--blue) !important;\n  background:var(--blue-soft) !important;\n  border-radius:14px !important;\n}\n\nhtml.theme-light input:focus,\nbody.light input:focus,\nhtml.theme-light select:focus,\nbody.light select:focus,\nhtml.theme-light textarea:focus,\nbody.light textarea:focus,\nhtml.theme-light .setting-input:focus,\nbody.light .setting-input:focus,\nhtml.theme-light .setting-select:focus,\nbody.light .setting-select:focus{\n  border-color:var(--blue-border) !important;\n  box-shadow:0 0 0 4px rgba(var(--accent-rgb,52,141,188), .16) !important;\n}\n\nhtml.theme-light .return-pill,\nbody.light .return-pill,\nhtml.theme-light .return-clear,\nbody.light .return-clear{\n  background:var(--blue-soft) !important;\n  color:var(--blue) !important;\n  border-color:rgba(var(--accent-rgb,52,141,188), .34) !important;\n}\n';
  function installLightAccentVisibility(){
    let style = document.getElementById('ssmLightAccentVisibility');
    if(!style){
      style = document.createElement('style');
      style.id = 'ssmLightAccentVisibility';
      document.head.appendChild(style);
    }
    style.textContent = css;
  }
  installLightAccentVisibility();
  document.addEventListener('DOMContentLoaded', installLightAccentVisibility);
  window.addEventListener('storage', installLightAccentVisibility);
})();
