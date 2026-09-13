/* Language switcher for 오늘은 봄날.
 * Injects a compact KO/EN/JA/FR/DE control into .site-nav.
 * Does not redirect automatically — Korean stays the default. */
(function () {
  "use strict";

  var LANGS = [
    { code: "ko", hreflang: "ko", label: "한국어", short: "KO" },
    { code: "en", hreflang: "en", label: "English", short: "EN" },
    { code: "ja", hreflang: "ja", label: "日本語", short: "JA" },
    { code: "fr", hreflang: "fr", label: "Français", short: "FR" },
    { code: "de", hreflang: "de", label: "Deutsch", short: "DE" },
  ];

  var MAP = {
    home: { ko: "/", en: "/en", ja: "/ja", fr: "/fr", de: "/de" },
    offer: {
      ko: "/media-facade-content",
      en: "/en/offer",
      ja: "/ja/offer",
      fr: "/fr/offer",
      de: "/de/offer",
    },
    studio: { ko: "/studio", en: "/en/studio", ja: "/ja/studio", fr: "/fr/studio", de: "/de/studio" },
    quote: { ko: "/quote", en: "/en/quote", ja: "/ja/quote", fr: "/fr/quote", de: "/de/quote" },
  };

  function cleanPath() {
    var p = location.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
    if (p.length > 1 && p.charAt(p.length - 1) === "/") p = p.slice(0, -1);
    return p || "/";
  }

  function detect() {
    var marked = document.body && document.body.getAttribute("data-i18n-page");
    var p = cleanPath();
    var lang = "ko";
    var page = "home";

    var m = p.match(/^\/(en|ja|fr|de)(?:\/(.*))?$/);
    if (m) {
      lang = m[1];
      page = m[2] || "home";
    } else if (p === "/quote") page = "quote";
    else if (p === "/studio") page = "studio";
    else if (
      p === "/media-facade-content" ||
      p === "/media-facade" ||
      p === "/led-install" ||
      p === "/company"
    ) {
      page = "offer";
    } else if (p === "/" || p === "") page = "home";
    else page = marked || "home";

    if (marked) page = marked;
    if (!MAP[page]) page = "home";
    return { lang: lang, page: page };
  }

  function ensureCss() {
    if (document.querySelector('link[data-i18n-css]')) return;
    var src = document.currentScript && document.currentScript.src;
    var href = src ? src.replace(/switch\.js.*$/, "i18n.css?v=20260913-i18n") : "/i18n/i18n.css";
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-i18n-css", "1");
    document.head.appendChild(link);
  }

  function render() {
    var here = detect();
    var nav = document.querySelector(".site-nav") || document.querySelector(".st-nav");
    if (!nav || nav.querySelector(".i18n-switch")) return;

    var wrap = document.createElement("nav");
    wrap.className = "i18n-switch";
    wrap.setAttribute("aria-label", "Language / 언어");

    LANGS.forEach(function (l) {
      var a = document.createElement("a");
      a.lang = l.hreflang;
      a.href = MAP[here.page][l.code];
      a.textContent = l.short;
      a.title = l.label;
      a.setAttribute("hreflang", l.hreflang);
      if (l.code === here.lang) a.setAttribute("aria-current", "true");
      wrap.appendChild(a);
    });

    var tools = nav.querySelector(".st-nav-tools");
    var toggle = nav.querySelector(".nav-toggle");
    if (tools) tools.appendChild(wrap);
    else if (toggle) nav.insertBefore(wrap, toggle);
    else nav.appendChild(wrap);
  }

  ensureCss();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
