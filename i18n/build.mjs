#!/usr/bin/env node
/**
 * Localized marketing pages from i18n/locales/*.json.
 *
 *   node i18n/build.mjs
 *
 * Writes /en /ja /fr /de (home, offer, studio, quote). Korean remains
 * the hand-authored site; these pages are the overseas door.
 * Facts stay inside the locale files and must match canon/canon.json.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const C = JSON.parse(readFileSync(join(root, "canon/canon.json"), "utf8"));
const BASE = C.site.baseUrl;
const TODAY = C.updated;
const I = C.identity;
const REFS = C.business.proof.references;

const LANGS = C.i18n.languages.filter((l) => l.code !== "ko");
const PAGES = C.i18n.pages;

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const load = (code) =>
  JSON.parse(readFileSync(join(root, "i18n/locales", `${code}.json`), "utf8"));

function hrefFor(lang, pageId) {
  const page = PAGES.find((p) => p.id === pageId);
  if (lang.code === "ko") return BASE + page.koPath;
  return BASE + lang.prefix + (page.slug ? `/${page.slug}` : "");
}

function hreflangLinks(lang, pageId) {
  const all = C.i18n.languages;
  const links = all
    .map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${hrefFor(l, pageId)}" />`)
    .join("\n    ");
  const def = C.i18n.languages.find((l) => l.code === C.i18n.defaultLanguage);
  return `${links}
    <link rel="alternate" hreflang="x-default" href="${hrefFor(def, pageId)}" />`;
}

function ogLocales(lang) {
  const others = C.i18n.languages
    .filter((l) => l.code !== lang.code)
    .map((l) => `<meta property="og:locale:alternate" content="${l.ogLocale}" />`)
    .join("\n    ");
  return `<meta property="og:locale" content="${lang.ogLocale}" />
    ${others}`;
}

function faqJsonLd(url, items, lang) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    inLanguage: lang.hreflang,
    isPartOf: { "@id": `${url}#webpage` },
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
    author: { "@id": `${BASE}/#organization` },
    publisher: { "@id": `${BASE}/#organization` },
  };
}

function pageJsonLd({ url, name, description, lang, type, crumbs }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": type,
        "@id": `${url}#webpage`,
        url,
        name,
        description,
        inLanguage: lang.hreflang,
        dateModified: TODAY,
        isPartOf: { "@id": `${BASE}/#website` },
        about: { "@id": `${BASE}/#organization` },
        publisher: { "@id": `${BASE}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          item: c.item,
        })),
      },
    ],
  };
}

function head({ lang, pageId, copy, path, type, crumbs }) {
  const url = BASE + path;
  const title = copy.title;
  const desc = copy.description;
  return `<!doctype html>
<html lang="${lang.hreflang}" dir="${lang.dir || "ltr"}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <meta name="google-site-verification" content="${C.site.verification.google}" />
    <meta name="naver-site-verification" content="${C.site.verification.naver}" />
    <link rel="canonical" href="${url}" />
    ${hreflangLinks(lang, pageId)}
    <meta property="og:type" content="website" />
    ${ogLocales(lang)}
    <meta property="og:site_name" content="${esc(C.site.brand)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(copy.ogDescription)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${C.site.ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(copy.ogImageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(copy.ogDescription)}" />
    <meta name="twitter:image" content="${C.site.ogImage}" />
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
    <link rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css" />
    <link rel="stylesheet" href="../styles.css?v=20260913-i18n" />
    <link rel="stylesheet" href="../i18n/i18n.css?v=20260913-i18n" />
    <link rel="icon" href="../assets/favicon-32.png" type="image/png" sizes="32x32" />
    <link rel="apple-touch-icon" href="../assets/favicon-180.png" />
    <script type="application/ld+json">
${JSON.stringify(pageJsonLd({ url, name: title, description: desc, lang, type, crumbs }), null, 2)}
    </script>
    <script type="application/ld+json">
${JSON.stringify(faqJsonLd(url, copy.faqItems, lang), null, 2)}
    </script>
  </head>`;
}

function nav(L, prefix, current) {
  const c = L.common;
  const mark = (id, href, label, extra = "") =>
    `<a href="${href}"${current === id ? ' aria-current="page"' : ""}${extra}>${esc(label)}</a>`;
  return `    <a class="skip-link" href="#main-content">${esc(c.skip)}</a>
    <header class="site-nav">
      <a class="brand" href="${prefix}/"><strong>${esc(c.brand)}</strong><span>${esc(c.tagline)}</span></a>
      <nav id="main-nav" aria-label="${esc(c.navLabel)}">
        ${mark("home", `${prefix}/`, c.navHome)}
        ${mark("offer", `${prefix}/offer`, c.navOffer)}
        ${mark("studio", `${prefix}/studio`, c.navStudio)}
        ${mark("quote", `${prefix}/quote`, c.navQuote, ' class="is-cta"')}
      </nav>
      <button class="nav-toggle" aria-label="${esc(c.menuOpen)}" aria-expanded="false" aria-controls="main-nav">
        <span></span><span></span><span></span>
      </button>
    </header>`;
}

function footer(L) {
  const c = L.common;
  const prefix = `/${L.meta.code}`;
  return `    <footer class="site-footer" aria-label="${esc(c.brand)}">
      <div>
        <strong>${esc(c.brand)}</strong>
        <p>${esc(c.brandRomanized)} · ${esc(c.domain)}</p>
        <p>${esc(c.footerBlurb)}</p>
        <p>${esc(c.overseasNote)}</p>
      </div>
      <nav class="footer-links" aria-label="${esc(c.footerLinks)}">
        <a href="${prefix}/">${esc(c.navHome)}</a>
        <a href="${prefix}/offer">${esc(c.footerOffer)}</a>
        <a href="${prefix}/studio">${esc(c.footerStudio)}</a>
        <a href="${prefix}/quote">${esc(c.footerQuote)}</a>
        <a href="../#works">${esc(c.navWorks)}</a>
      </nav>
      <dl class="footer-info">
        <div><dt>${esc(c.legalName)}</dt><dd>${esc(c.brand)} · ${esc(c.brandRomanized)}</dd></div>
        <div><dt>${esc(c.representative)}</dt><dd>${esc(c.representativeValue)}</dd></div>
        <div><dt>${esc(c.bizNo)}</dt><dd>${esc(I.businessNumber)}</dd></div>
        <div><dt>${esc(c.womenOwned)}</dt><dd>${esc(I.credentials[0].number)}</dd></div>
        <div><dt>${esc(c.directProd)}</dt><dd>${esc(I.credentials[1].number)}</dd></div>
        <div><dt>${esc(c.videoLicense)}</dt><dd>${esc(I.credentials[2].number)}</dd></div>
        <div><dt>${esc(c.broadcastLicense)}</dt><dd>${esc(I.credentials[3].number)}</dd></div>
        <div><dt>${esc(c.phone)}</dt><dd><a href="tel:+821042921999">${esc(I.phoneE164)}</a></dd></div>
        <div><dt>${esc(c.email)}</dt><dd><a href="mailto:${I.email}">${I.email}</a></dd></div>
        <div><dt>${esc(c.address)}</dt><dd>${esc(c.addressValue)}</dd></div>
      </dl>
      <p class="footer-stamp">${esc(c.updated)} ${TODAY}</p>
    </footer>
    <script src="../site-pages.js"></script>
    <script src="../i18n/switch.js?v=20260913-i18n" defer></script>`;
}

function faqBlock(copy, more) {
  const items = copy.faqItems
    .map(
      (item) => `          <article class="faq-item">
            <h3>${esc(item.q)}</h3>
            <p>${esc(item.a)}</p>
          </article>`
    )
    .join("\n");
  return `      <section class="section faq-section" id="faq">
        <div class="section-head">
          <p class="section-kicker">FAQ</p>
          <h2>${esc(copy.faqTitle)}</h2>
          <p>${esc(copy.faqLead)}</p>
        </div>
        <div class="faq-list">
${items}
        </div>
        <p class="faq-more">${esc(more)}</p>
      </section>`;
}

function scripts(extra = "") {
  return `    <script>
      const siteNav = document.querySelector(".site-nav");
      const navToggle = document.querySelector(".nav-toggle");
      const mainNav = document.getElementById("main-nav");
      if (siteNav) {
        window.addEventListener("scroll", () => {
          siteNav.classList.toggle("scrolled", window.scrollY > 40);
        }, { passive: true });
      }
      if (navToggle && mainNav) {
        const openLabel = navToggle.getAttribute("aria-label");
        navToggle.addEventListener("click", () => {
          const expanded = navToggle.getAttribute("aria-expanded") === "true";
          navToggle.setAttribute("aria-expanded", String(!expanded));
          mainNav.classList.toggle("open", !expanded);
        });
        document.addEventListener("keydown", (e) => {
          if (e.key !== "Escape") return;
          navToggle.setAttribute("aria-expanded", "false");
          mainNav.classList.remove("open");
          navToggle.focus();
        });
      }
    </script>
${extra}
  </body>
</html>
`;
}

function homePage(L, lang) {
  const H = L.home;
  const c = L.common;
  const prefix = `/${lang.code}`;
  H.faqItems = L.faq.home;
  const crumbs = [
    { name: c.navHome, item: BASE + prefix },
  ];
  return `${head({
    lang,
    pageId: "home",
    copy: H,
    path: prefix,
    type: "WebPage",
    crumbs,
  })}
  <body class="site-page i18n-page" data-i18n-page="home">
${nav(L, prefix, "home")}
    <main class="subpage-main" id="main-content" tabindex="-1">
      <section class="subpage-hero">
        <div>
          <p class="section-kicker">${esc(H.kicker)}</p>
          <h1>${esc(H.h1)}</h1>
          <p class="i18n-roman">${esc(c.brandRomanized)} · ${esc(c.domain)}</p>
          <p><strong>${esc(H.line)}</strong></p>
          <p>${esc(H.sub)}</p>
          <div class="subpage-actions">
            <a class="primary-link" href="${prefix}/quote">${esc(c.ctaQuote)}</a>
            <a class="secondary-link" href="${prefix}/studio">${esc(c.ctaStudio)}</a>
          </div>
        </div>
        <aside>
          <span><b>${esc(H.proof1k)}</b>${esc(H.proof1v)}</span>
          <span><b>${esc(H.proof2k)}</b>${esc(H.proof2v)}</span>
          <span><b>${esc(H.proof3k)}</b>${esc(H.proof3v)}</span>
          <span><b>${esc(H.proof4k)}</b>${esc(H.proof4v)}</span>
        </aside>
      </section>
      <section class="section">
        <div class="answer-block">
          <h2>${esc(H.entityTitle)}</h2>
          <p>${esc(H.entity)}</p>
        </div>
      </section>
      <section class="section offer-section" id="offer">
        <div class="section-head">
          <p class="section-kicker">Offer</p>
          <h2>${esc(H.offerTitle)}</h2>
          <p>${esc(H.offerLead)}</p>
        </div>
        <div class="offer-grid">
          <article class="offer-card"><span class="offer-num">01</span><h3>${esc(H.o1t)}</h3><p>${esc(H.o1p)}</p><p class="offer-more"><a href="${prefix}/offer">${esc(c.navOffer)}</a></p></article>
          <article class="offer-card"><span class="offer-num">02</span><h3>${esc(H.o2t)}</h3><p>${esc(H.o2p)}</p><p class="offer-more"><a href="${prefix}/offer">${esc(c.navOffer)}</a></p></article>
          <article class="offer-card"><span class="offer-num">03</span><h3>${esc(H.o3t)}</h3><p>${esc(H.o3p)}</p><p class="offer-more"><a href="${prefix}/studio">${esc(c.navStudio)}</a></p></article>
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <p class="section-kicker">Method</p>
          <h2>${esc(H.methodTitle)}</h2>
          <p>${esc(H.methodLead)}</p>
        </div>
        <ol class="step-list">
          <li><b>01</b><p>${esc(H.step1)}</p></li>
          <li><b>02</b><p>${esc(H.step2)}</p></li>
          <li><b>03</b><p>${esc(H.step3)}</p></li>
          <li><b>04</b><p>${esc(H.step4)}</p></li>
        </ol>
      </section>
      <section class="section">
        <div class="section-head">
          <p class="section-kicker">Sites</p>
          <h2>${esc(H.refsTitle)}</h2>
          <p>${esc(H.refsLead)}</p>
        </div>
        <ul class="i18n-refs">
${REFS.map((r) => `          <li>${esc(r)}</li>`).join("\n")}
        </ul>
      </section>
${faqBlock(H, c.overseasNote)}
      <section class="section" id="contact">
        <div class="section-head">
          <p class="section-kicker">Contact</p>
          <h2>${esc(H.ctaTitle)}</h2>
          <p>${esc(H.ctaLead)}</p>
        </div>
        <div class="subpage-actions">
          <a class="primary-link" href="${prefix}/quote">${esc(c.ctaQuote)}</a>
          <a class="secondary-link" href="mailto:${I.email}">${esc(c.ctaEmail)}</a>
          <a class="secondary-link" href="tel:+821042921999">${esc(c.ctaCall)}</a>
        </div>
      </section>
    </main>
${footer(L)}
${scripts()}
`;
}

function offerPage(L, lang) {
  const O = L.offer;
  const c = L.common;
  const prefix = `/${lang.code}`;
  O.faqItems = L.faq.offer;
  const crumbs = [
    { name: c.navHome, item: BASE + prefix },
    { name: c.navOffer, item: BASE + prefix + "/offer" },
  ];
  return `${head({
    lang,
    pageId: "offer",
    copy: O,
    path: prefix + "/offer",
    type: "WebPage",
    crumbs,
  })}
  <body class="site-page i18n-page" data-i18n-page="offer">
${nav(L, prefix, "offer")}
    <main class="subpage-main" id="main-content" tabindex="-1">
      <section class="subpage-hero">
        <div>
          <p class="section-kicker">${esc(O.kicker)}</p>
          <h1>${esc(O.h1)}</h1>
          <p>${esc(O.lead)}</p>
          <div class="subpage-actions">
            <a class="primary-link" href="${prefix}/quote">${esc(c.ctaQuote)}</a>
            <a class="secondary-link" href="${prefix}/studio">${esc(c.ctaStudio)}</a>
          </div>
        </div>
        <aside>
          <span><b>${esc(O.aside1k)}</b>${esc(O.aside1v)}</span>
          <span><b>${esc(O.aside2k)}</b>${esc(O.aside2v)}</span>
          <span><b>${esc(O.aside3k)}</b>${esc(O.aside3v)}</span>
        </aside>
      </section>
      <section class="section">
        <div class="answer-block">
          <h2>${esc(O.artTitle)}</h2>
          <p>${esc(O.artBody)}</p>
          <ul>
            <li>${esc(O.art1)}</li>
            <li>${esc(O.art2)}</li>
            <li>${esc(O.art3)}</li>
            <li>${esc(O.art4)}</li>
          </ul>
        </div>
      </section>
      <section class="section">
        <div class="answer-block">
          <h2>${esc(O.ledTitle)}</h2>
          <p>${esc(O.ledBody)}</p>
        </div>
      </section>
      <section class="section">
        <div class="answer-block">
          <h2>${esc(O.facadeTitle)}</h2>
          <p>${esc(O.facadeBody)}</p>
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <p class="section-kicker">Pricing</p>
          <h2>${esc(O.priceTitle)}</h2>
          <p>${esc(O.priceLead)}</p>
        </div>
        <div class="offer-grid">
          <article class="offer-card"><h3>${esc(O.p1n)}</h3><p><strong>${esc(O.p1p)}</strong></p><p>${esc(O.p1s)}</p></article>
          <article class="offer-card"><h3>${esc(O.p2n)}</h3><p><strong>${esc(O.p2p)}</strong></p><p>${esc(O.p2s)}</p></article>
          <article class="offer-card"><h3>${esc(O.p3n)}</h3><p><strong>${esc(O.p3p)}</strong></p><p>${esc(O.p3s)}</p></article>
        </div>
        <p class="ref-note">${esc(O.installNote)}</p>
      </section>
${faqBlock(O, c.overseasNote)}
      <section class="section">
        <div class="subpage-actions">
          <a class="primary-link" href="${prefix}/quote">${esc(c.ctaQuote)}</a>
          <a class="secondary-link" href="mailto:${I.email}">${esc(c.ctaEmail)}</a>
        </div>
      </section>
    </main>
${footer(L)}
${scripts()}
`;
}

function studioPage(L, lang) {
  const S = L.studio;
  const c = L.common;
  const prefix = `/${lang.code}`;
  S.faqItems = L.faq.studio;
  const crumbs = [
    { name: c.navHome, item: BASE + prefix },
    { name: c.navStudio, item: BASE + prefix + "/studio" },
  ];
  return `${head({
    lang,
    pageId: "studio",
    copy: S,
    path: prefix + "/studio",
    type: "WebPage",
    crumbs,
  })}
  <body class="site-page i18n-page" data-i18n-page="studio">
${nav(L, prefix, "studio")}
    <main class="subpage-main" id="main-content" tabindex="-1">
      <section class="subpage-hero">
        <div>
          <p class="section-kicker">${esc(S.kicker)}</p>
          <h1>${esc(S.h1)}</h1>
          <p>${esc(S.lead)}</p>
          <div class="subpage-actions">
            <a class="primary-link" href="../studio">${esc(S.openStudio)}</a>
            <a class="secondary-link" href="${prefix}/quote">${esc(c.ctaQuote)}</a>
          </div>
        </div>
        <aside>
          <span><b>${esc(S.aside1k)}</b>${esc(S.aside1v)}</span>
          <span><b>${esc(S.aside2k)}</b>${esc(S.aside2v)}</span>
          <span><b>${esc(S.aside3k)}</b>${esc(S.aside3v)}</span>
        </aside>
      </section>
      <section class="section">
        <div class="section-head">
          <p class="section-kicker">Purchase</p>
          <h2>${esc(S.howTitle)}</h2>
        </div>
        <ol class="step-list">
          <li><b>${esc(S.how1t)}</b><p>${esc(S.how1p)}</p></li>
          <li><b>${esc(S.how2t)}</b><p>${esc(S.how2p)}</p></li>
          <li><b>${esc(S.how3t)}</b><p>${esc(S.how3p)}</p></li>
        </ol>
        <p class="ref-note">${esc(S.note)}</p>
      </section>
${faqBlock(S, c.overseasNote)}
      <section class="section">
        <div class="subpage-actions">
          <a class="primary-link" href="../studio">${esc(S.openStudio)}</a>
          <a class="secondary-link" href="${prefix}/quote">${esc(c.ctaQuote)}</a>
          <a class="secondary-link" href="mailto:${I.email}">${esc(c.ctaEmail)}</a>
        </div>
      </section>
    </main>
${footer(L)}
${scripts()}
`;
}

function quotePage(L, lang) {
  const Q = L.quote;
  const c = L.common;
  const prefix = `/${lang.code}`;
  Q.faqItems = L.faq.quote;
  const crumbs = [
    { name: c.navHome, item: BASE + prefix },
    { name: c.navQuote, item: BASE + prefix + "/quote" },
  ];
  const next = `${BASE}${prefix}/quote?sent=1`;
  return `${head({
    lang,
    pageId: "quote",
    copy: Q,
    path: prefix + "/quote",
    type: "ContactPage",
    crumbs,
  })}
  <body class="site-page i18n-page" data-i18n-page="quote">
${nav(L, prefix, "quote")}
    <main class="subpage-main" id="main-content" tabindex="-1">
      <section class="subpage-hero">
        <div>
          <p class="section-kicker">${esc(Q.kicker)}</p>
          <h1>${esc(Q.h1)}</h1>
          <p>${esc(Q.lead)}</p>
          <div class="subpage-actions">
            <a class="primary-link" href="mailto:${I.email}">${esc(c.ctaEmail)}</a>
            <a class="secondary-link" href="tel:+821042921999">${esc(c.ctaCall)}</a>
          </div>
        </div>
        <aside>
          <span><b>${esc(Q.aside1k)}</b>${esc(Q.aside1v)}</span>
          <span><b>${esc(Q.aside2k)}</b>${esc(Q.aside2v)}</span>
          <span><b>${esc(Q.aside3k)}</b>${esc(Q.aside3v)}</span>
        </aside>
      </section>
      <section class="section inquiry-section" id="inquiry-form">
        <div>
          <p class="section-kicker">Form</p>
          <h2>${esc(Q.formTitle)}</h2>
          <p>${esc(Q.formLead)}</p>
        </div>
        <form class="contact-form" id="contactForm" action="https://formsubmit.co/${I.email}" method="POST"
              data-sending="${esc(Q.sending)}" data-error="${esc(Q.error)}">
          <input type="hidden" name="_subject" value="${esc(Q.subject)}" />
          <input type="hidden" name="_template" value="table" />
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="_next" value="${next}" />
          <input type="hidden" name="_replyto" value="" />
          <input type="hidden" name="language" value="${lang.code}" />
          <div class="form-honey" aria-hidden="true">
            <label>${esc(Q.honey)}<input type="text" name="_honey" tabindex="-1" autocomplete="off" /></label>
          </div>
          <h3>${esc(Q.formTitle)}</h3>
          <label><span>${esc(Q.org)}</span><input name="organization" type="text" placeholder="${esc(Q.orgPh)}" required /></label>
          <div class="form-row">
            <label><span>${esc(Q.name)}</span><input name="name" type="text" placeholder="${esc(Q.namePh)}" required /></label>
            <label><span>${esc(Q.phone)}</span><input name="phone" type="tel" placeholder="${esc(Q.phonePh)}" required
                   inputmode="tel" pattern="[0-9\\-+() ]{8,24}" title="${esc(Q.phoneTitle)}" /></label>
          </div>
          <label><span>${esc(Q.email)}</span><input name="email" type="email" placeholder="${esc(Q.emailPh)}" required /></label>
          <fieldset>
            <legend>${esc(Q.interest)}</legend>
            <label><input name="service" type="checkbox" value="${esc(Q.s1)}" /> ${esc(Q.s1)}</label>
            <label><input name="service" type="checkbox" value="${esc(Q.s2)}" /> ${esc(Q.s2)}</label>
            <label><input name="service" type="checkbox" value="${esc(Q.s3)}" /> ${esc(Q.s3)}</label>
            <label><input name="service" type="checkbox" value="${esc(Q.s4)}" /> ${esc(Q.s4)}</label>
            <label><input name="service" type="checkbox" value="${esc(Q.s5)}" /> ${esc(Q.s5)}</label>
          </fieldset>
          <fieldset>
            <legend>${esc(Q.scale)}</legend>
            <label><input name="budget" type="radio" value="${esc(Q.b1)}" required /> ${esc(Q.b1)}</label>
            <label><input name="budget" type="radio" value="${esc(Q.b2)}" /> ${esc(Q.b2)}</label>
            <label><input name="budget" type="radio" value="${esc(Q.b3)}" /> ${esc(Q.b3)}</label>
            <label><input name="budget" type="radio" value="${esc(Q.b4)}" /> ${esc(Q.b4)}</label>
          </fieldset>
          <label><span>${esc(Q.message)}</span><textarea name="message" rows="4" placeholder="${esc(Q.messagePh)}"></textarea></label>
          <button class="primary-link" type="submit">${esc(Q.submit)}</button>
          <p class="form-assurance">${esc(Q.assurance)}</p>
          <p class="form-success" role="status" aria-live="polite" hidden>${esc(Q.success)}</p>
          <p class="form-error" hidden role="alert"></p>
        </form>
      </section>
${faqBlock(Q, c.overseasNote)}
    </main>
${footer(L)}
${scripts(`    <script src="../inquiry.js?v=20260913-i18n"></script>`)}
`;
}

const builders = { home: homePage, offer: offerPage, studio: studioPage, quote: quotePage };

let n = 0;
for (const lang of LANGS) {
  const L = load(lang.code);
  const loc = { ...lang, dir: L.meta.dir || "ltr" };
  const dir = join(root, loc.code);
  mkdirSync(dir, { recursive: true });
  for (const page of PAGES) {
    const html = builders[page.id](L, loc);
    const file = page.slug ? `${page.slug}.html` : "index.html";
    writeFileSync(join(dir, file), html);
    console.log(`  ${lang.code}/${file}`);
    n += 1;
  }
}
console.log(`i18n pages written: ${n}`);
