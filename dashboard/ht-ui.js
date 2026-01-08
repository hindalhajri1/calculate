(function () {
    const THEME_KEY = "ht_theme";
    const LANG_KEY  = "ht_lang";
  
    function applyTheme(theme){
      const t = theme === "light" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", t);
      localStorage.setItem(THEME_KEY, t);
    }
  
    function applyLang(lang){
      const l = lang === "en" ? "en" : "ar";
      document.documentElement.lang = l;
      document.documentElement.dir  = (l === "ar") ? "rtl" : "ltr";
      localStorage.setItem(LANG_KEY, l);
      // لو عندك i18n لاحقًا نستدعيه هنا
      if (window.HT_I18N && typeof window.HT_I18N.render === "function") {
        window.HT_I18N.render(l);
      }
    }
    (function(){
        const html = document.documentElement;
      
        function setTheme(next){
          html.setAttribute("data-theme", next);
          localStorage.setItem("theme", next);
        }
      
        // load on start
        const saved = localStorage.getItem("theme");
        if(saved) setTheme(saved);
      
        document.querySelectorAll("[data-toggle-theme]").forEach(btn=>{
          btn.addEventListener("click", ()=>{
            const current = html.getAttribute("data-theme") === "dark" ? "dark" : "light";
            setTheme(current === "dark" ? "light" : "dark");
          });
        });
      })();
      
  
    document.addEventListener("DOMContentLoaded", boot);
  })();
  document.querySelectorAll("[data-toggle-theme]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const html = document.documentElement;
      const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
      html.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });
  });
  
  // load saved theme
  const savedTheme = localStorage.getItem("theme");
  if(savedTheme){
    document.documentElement.setAttribute("data-theme", savedTheme);
  }
  
  (function(){
    const root = document.documentElement;
    const key = "ht_theme";
  
    function applyTheme(t){
      if(t === "dark") root.setAttribute("data-theme","dark");
      else root.removeAttribute("data-theme");
    }
  
    // init from storage
    const saved = localStorage.getItem(key);
    applyTheme(saved);
  
    // sync checkbox (لو موجود)
    const themeInput = document.querySelector('[data-toggle-theme]');
    if(themeInput && themeInput.type === "checkbox"){
      themeInput.checked = (saved === "dark");
      themeInput.addEventListener("change", () => {
        const next = themeInput.checked ? "dark" : "light";
        localStorage.setItem(key, next);
        applyTheme(next);
      });
    } else if(themeInput){
      // fallback لو زر قديم
      themeInput.addEventListener("click", () => {
        const isDark = root.getAttribute("data-theme") === "dark";
        const next = isDark ? "light" : "dark";
        localStorage.setItem(key, next);
        applyTheme(next);
      });
    }
  })();
  