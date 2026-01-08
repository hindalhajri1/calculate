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
  