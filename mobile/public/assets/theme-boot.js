(function(){
  var KEY = "ssmCanalDashboard.settings.v2";
  var DEFAULTS = {
    theme:"dark", timeFormat:"12", accent:"blue", compact:false,
    defaultCanal:"Sault Canada Locks", defaultDirection:"",
    confirmBeforeSave:true, autoCurrentTime:true, showEntryHints:true
  };
  function parseJSON(value){ try { return JSON.parse(value || "{}"); } catch(e){ return {}; } }
  function normalize(raw){
    var saved = raw || parseJSON(localStorage.getItem(KEY));
    var theme = saved.theme;
    if(theme !== "dark" && theme !== "light"){
      var legacyDark = localStorage.getItem("ssmCanalDashboard.darkMode");
      var legacyTheme = localStorage.getItem("appTheme") || localStorage.getItem("theme");
      if(legacyTheme === "dark" || legacyTheme === "light") theme = legacyTheme;
      else if(legacyDark === "true") theme = "dark";
      else if(legacyDark === "false") theme = "light";
      else theme = DEFAULTS.theme;
    }
    var settings = Object.assign({}, DEFAULTS, saved, { theme: theme === "light" ? "light" : "dark" });
    settings.timeFormat = settings.timeFormat === "24" ? "24" : "12";
    settings.accent = ["blue","purple","green"].indexOf(settings.accent) >= 0 ? settings.accent : "blue";
    settings.compact = settings.compact === true || settings.compact === "true";
    settings.confirmBeforeSave = !(settings.confirmBeforeSave === false || settings.confirmBeforeSave === "false");
    settings.autoCurrentTime = !(settings.autoCurrentTime === false || settings.autoCurrentTime === "false");
    settings.showEntryHints = !(settings.showEntryHints === false || settings.showEntryHints === "false");
    return settings;
  }
  function write(settings){
    try{
      localStorage.setItem(KEY, JSON.stringify(settings));
      localStorage.setItem("appTheme", settings.theme);
      localStorage.setItem("theme", settings.theme);
      localStorage.setItem("timeFormat", settings.timeFormat);
      localStorage.setItem("ssmCanalDashboard.darkMode", settings.theme === "dark" ? "true" : "false");
    }catch(e){}
  }
  function applyAccentVars(accent){
    var palettes = {
      blue:{blue:"#348DBC", hover:"#3F9FCE", soft:"#E8F5FC", border:"#5CADDA", rgb:"52,141,188"},
      purple:{blue:"#6C5CE7", hover:"#7C6EF0", soft:"#EFEBFF", border:"#8B7CF6", rgb:"108,92,231"},
      green:{blue:"#168A4A", hover:"#1FA85B", soft:"#E9F8EF", border:"#27B768", rgb:"22,138,74"}
    };
    var selected = (accent === "purple" || accent === "green") ? accent : "blue";
    var p = palettes[selected] || palettes.blue;
    var targets = [document.documentElement];
    if(document.body) targets.push(document.body);
    targets.forEach(function(el){
      if(!el || !el.style) return;
      el.style.setProperty("--blue", p.blue);
      el.style.setProperty("--blue-hover", p.hover);
      el.style.setProperty("--blue-soft", p.soft);
      el.style.setProperty("--blue-border", p.border);
      el.style.setProperty("--accent-rgb", p.rgb);
      el.style.setProperty("--purple", p.blue);
      el.style.setProperty("--purple-light", p.hover);
      el.style.setProperty("--soft-purple", p.soft);
      el.style.setProperty("--accent", p.blue);
      el.style.setProperty("--accent-hover", p.hover);
      el.style.setProperty("--accent-soft", p.soft);
      el.style.setProperty("--accent-border", p.border);
    });
  }
  function apply(settings){
    settings = normalize(settings);
    var html = document.documentElement;
    html.classList.remove("theme-light", "theme-dark", "app-dark");
    html.classList.add(settings.theme === "light" ? "theme-light" : "theme-dark");
    if(settings.theme !== "light") html.classList.add("app-dark");
    html.dataset.accent = settings.accent || "blue";
    applyAccentVars(settings.accent || "blue");
    if(document.body){
      document.body.classList.toggle("light", settings.theme === "light");
      document.body.classList.toggle("settings-compact", !!settings.compact);
      document.body.classList.toggle("hide-entry-hints", !settings.showEntryHints);
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute("content", settings.theme === "light" ? "#f6f9fc" : "#0f172a");
  }
  var settings = normalize();
  write(settings);
  apply(settings);

  function reapplyAfterBodyReady(){ try{ apply(normalize()); }catch(e){} }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", reapplyAfterBodyReady, { once:true });
  else reapplyAfterBodyReady();
  window.SSM_SETTINGS_KEY = KEY;
  window.SSM_DEFAULT_SETTINGS = DEFAULTS;
  window.SSMTheme = { normalize: normalize, write: write, apply: apply, get: function(){ return normalize(); }, save: function(next){ var s = normalize(Object.assign({}, normalize(), next || {})); write(s); apply(s); return s; } };
})();
