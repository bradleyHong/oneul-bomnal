#!/usr/bin/env node
/**
 * 영문 사이트를 굽는다.  node tools/build-en.mjs
 *
 * 글은 canon/en.json, 사실관계(값·자격번호·주소)는 canon/canon.json 이
 * 정본이다. en/ 안의 파일은 손으로 고치지 말 것 — 다시 구우면 지워진다.
 *
 * 왜 한 벌 더 만들지 않고 구워 내는가.
 * 영문 페이지 여섯을 손으로 쓰면 머리(메타·hreflang·스키마)와 꼬리(주소·
 * 사업자번호)가 여섯 곳에 흩어진다. 하나 고칠 때 다섯을 빠뜨린다. 실제로
 * 한국어 쪽에서 그런 어긋남을 여러 번 잡았다. 영문은 처음부터 한 자리에서
 * 굽는다.
 *
 * 화면 모양은 한국어 페이지와 같은 styles.css 를 쓴다. 영문만 다른
 * 디자인으로 두면 두 사이트가 되고, 고칠 때마다 두 번 고쳐야 한다.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const C = JSON.parse(readFileSync(join(root, "canon/canon.json"), "utf8"));
const E = JSON.parse(readFileSync(join(root, "canon/en.json"), "utf8"));
const BASE = C.site.baseUrl;
const TODAY = C.updated;

const esc = (s) => String(s).replace(/&(?!(?:[a-z]+|#\d+);)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/* note 와 cta 는 링크를 품는다. 거기만 태그를 살려 둔다. */
const raw = (s) => String(s);

/** 페이지 한 장의 머리. hreflang 은 세 줄이 늘 함께 나가야 한다 —
 *  x-default 를 빠뜨리면 구글이 어느 쪽을 기본으로 볼지 스스로 고른다. */
/* 자원은 뿌리에서 절대 경로로 건다.
   상대 경로로 걸었더니 /en 은 뿌리 기준(./styles.css → /styles.css)인데
   /en/services 는 /en/ 기준이라 한 벌로 맞출 수가 없었다. cleanUrls 때문에
   같은 파일이 슬래시가 있는 주소로도 열릴 수 있어 더 어긋난다.
   절대 경로는 주소가 어떤 모양이든 한 곳을 가리킨다. */
const A = "/";

function head(p) {
  const url = BASE + p.path;
  const koUrl = BASE + (p.koPath === "/" ? "/" : p.koPath);
  const ld = schema(p, url, koUrl);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(p.title)}</title>
    <meta name="description" content="${esc(p.description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="en" href="${url}" />
    <link rel="alternate" hreflang="ko" href="${koUrl}" />
    <link rel="alternate" hreflang="x-default" href="${koUrl}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="google-site-verification" content="${C.site.verification.google}" />
    <meta name="naver-site-verification" content="${C.site.verification.naver}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(E.brand)}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:locale:alternate" content="ko_KR" />
    <meta property="og:title" content="${esc(p.title)}" />
    <meta property="og:description" content="${esc(p.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${C.site.ogImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(p.title)}" />
    <meta name="twitter:description" content="${esc(p.description)}" />
    <meta name="twitter:image" content="${C.site.ogImage}" />

    <script type="application/ld+json">
${JSON.stringify(ld, null, 6)}
    </script>

    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
    <link rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&amp;family=Noto+Serif+KR:wght@400;500;600;700&amp;display=swap" />
    <link rel="stylesheet" href="${A}styles.css?v=20260914-serif" />
    <link rel="stylesheet" href="${A}en.css?v=20260914-rolex" />
    <link rel="icon" href="${A}assets/favicon-32.png" type="image/png" sizes="32x32" />
    <link rel="apple-touch-icon" href="${A}assets/favicon-180.png" />
  </head>
  <body class="en-page">
    <a class="skip-link" href="#main">Skip to content</a>
${nav(p)}
    <main id="main">
`;
}

/** 조직 노드는 한 곳에서만 정의하고 나머지는 @id 로 가리킨다.
 *  같은 회사를 페이지마다 새로 선언하면 검색엔진이 여러 회사로 셀 수 있다. */
function schema(p, url, koUrl) {
  const graph = [
    {
      "@type": "Organization",
      "@id": `${BASE}/#organization`,
      name: C.identity.legalName,
      alternateName: [E.brand, C.site.domain],
      url: BASE,
      logo: C.site.logo,
      email: C.identity.email,
      telephone: C.identity.phoneE164,
      address: {
        "@type": "PostalAddress",
        streetAddress: "1F, Bldg 102, 250 Dongdaegu-ro",
        addressLocality: "Suseong-gu",
        addressRegion: "Daegu",
        addressCountry: "KR",
      },
      taxID: C.identity.businessNumber,
      areaServed: C.areaServed.map((a) => ({ "@type": "AdministrativeArea", name: a })),
      knowsLanguage: ["ko", "en"],
    },
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: p.title,
      description: p.description,
      inLanguage: "en",
      isPartOf: { "@id": `${BASE}/#website` },
      about: { "@id": `${BASE}/#organization` },
      dateModified: TODAY,
      translationOfWork: { "@type": "WebPage", "@id": `${koUrl}#webpage`, url: koUrl, inLanguage: "ko" },
    },
    {
      "@type": "WebSite",
      "@id": `${BASE}/#website`,
      url: BASE,
      name: C.identity.legalName,
      alternateName: E.brand,
      publisher: { "@id": `${BASE}/#organization` },
      inLanguage: ["ko", "en"],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/en` },
        ...(p.path === "/en" ? [] : [{ "@type": "ListItem", position: 2, name: p.kicker, item: url }]),
      ],
    },
  ];
  /* FAQ 가 있는 페이지는 그 문답을 그대로 스키마로도 낸다. 화면에 없는
     문답을 스키마에만 적으면 구글이 구조화 데이터 위반으로 본다. */
  const faq = (p.sections || []).find((s) => s.type === "faq");
  if (faq) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: faq.items.map((q) => ({
        "@type": "Question",
        name: q.q,
        acceptedAnswer: { "@type": "Answer", text: q.a },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

function nav(p) {
  const links = E.nav.map((n) =>
    `        <a href="${n.path}"${n.path === p.path ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`
  ).join("\n");
  return `    <header class="site-nav">
      <a class="brand" href="/en">
        <strong>${esc(E.brand)}</strong>
        <span>Media art · Daegu, Korea</span>
      </a>
      <nav id="main-nav" aria-label="Main">
${links}
        <a class="lang-switch" href="${BASE + (p.koPath === "/" ? "/" : p.koPath)}" hreflang="ko" lang="ko">한국어</a>
      </nav>
    </header>`;
}

/* ── 구역 ─────────────────────────────────────────────────── */
const headBlock = (s) =>
  `        <div class="section-head">\n` +
  (s.kicker ? `          <p class="section-kicker">${esc(s.kicker)}</p>\n` : "") +
  (s.h2 ? `          <h2>${esc(s.h2)}</h2>\n` : "") +
  (s.p ? `          <p>${esc(s.p)}</p>\n` : "") +
  `        </div>\n`;

const BLOCK = {
  cards: (s) => `      <section class="section">
${headBlock(s)}        <div class="offer-grid">
${s.items.map((i) => `          <article class="offer-card">
            <span class="offer-num">${esc(i.n)}</span>
            <h3>${esc(i.h3)}</h3>
            <p>${esc(i.p)}</p>
${i.ul ? `            <ul>\n${i.ul.map((x) => `              <li>${esc(x)}</li>`).join("\n")}\n            </ul>\n` : ""}          </article>`).join("\n")}
        </div>
      </section>`,

  steps: (s) => `      <section class="section">
${headBlock(s)}        <ol class="step-list">
${s.items.map((i) => `          <li><b>${esc(i.b)}</b>${esc(i.p)}</li>`).join("\n")}
        </ol>
      </section>`,

  table: (s) => `      <section class="section">
${headBlock(s)}        <table class="spec-table">
          <caption>${esc(s.caption)}</caption>
          <tbody>
${s.rows.map(([a, b]) => `            <tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join("\n")}
          </tbody>
        </table>
      </section>`,

  faq: (s) => `      <section class="section faq-section" id="faq">
${headBlock(s)}        <div class="faq-list">
${s.items.map((i) => `          <article class="faq-item">
            <h3>${esc(i.q)}</h3>
            <p>${esc(i.a)}</p>
          </article>`).join("\n")}
        </div>
      </section>`,

  gallery: (s) => `      <section class="section">
${headBlock(s)}        <div class="en-grid">
${s.items.map((i) => `          <figure>
            <img src="${i.src}" alt="${esc(i.alt)}" width="${i.w}" height="${i.h}" loading="lazy" decoding="async" />
            <figcaption><b>${esc(i.b)}</b><span>${esc(i.span)}</span></figcaption>
          </figure>`).join("\n")}
        </div>
      </section>`,

  /* 작품 카드. 한국어 쪽과 같은 마크업이라 hero-video.js 가 그대로 집는다. */
  films: (s) => `      <section class="section">
${headBlock(s)}        <div class="ref-films is-lead" data-films-auto>
          <ul class="film-grid">
${s.items.map((i) => `            <li class="film">
              <button class="film-card" type="button" data-film="${i.id}" data-film-hash="${i.hash}">
                <span class="film-ico" aria-hidden="true"></span>
                <span class="film-txt">
                  <b class="film-name">${esc(i.name)}</b>
                  <small>Media art</small>
                </span>
              </button>
              <a class="film-out" href="https://vimeo.com/${i.id}/${i.hash}" target="_blank" rel="noopener"
                 aria-label="Watch ${esc(i.name)} on Vimeo">Watch on Vimeo</a>
            </li>`).join("\n")}
          </ul>
        </div>
      </section>`,

  note: (s) => `      <section class="section">
        <p class="answer-block">${raw(s.html)}</p>
      </section>`,

  cta: (s) => `      <section class="section en-cta">
        <h2>${esc(s.h2)}</h2>
        <p>${esc(s.p)}</p>
        <div class="subpage-actions">
${s.links.map((l) => `          <a class="${l.solid ? "primary-link" : "secondary-link"}" href="${l.href}">${esc(l.label)}</a>`).join("\n")}
        </div>
      </section>`,
};

function hero(p) {
  const acts = p.actions
    ? `          <div class="subpage-actions">${p.actions
        .map((a) => `<a class="${a.solid ? "primary-link" : "secondary-link"}" href="${a.href}">${esc(a.label)}</a>`)
        .join("")}</div>\n`
    : "";
  const aside = p.aside
    ? `        <aside>\n${p.aside.map((a) => `          <span><b>${esc(a.b)}</b>${esc(a.t)}</span>`).join("\n")}\n        </aside>\n`
    : "";
  return `      <section class="subpage-hero">
        <div>
          <p class="section-kicker">${esc(p.kicker)}</p>
          <h1>${esc(p.h1)}</h1>
          <p>${esc(p.lead)}</p>
${acts}        </div>
${aside}      </section>`;
}

function foot() {
  /* 자격증 번호는 꼬리에 적지 않는다. 손님이 확인할 길은 발급기관의 조회
     시스템이고, 실제로 필요한 자리는 입찰 서류다. 공개해서 얻는 것은 없고
     상호·주소와 함께 긁어 가는 사칭 고지서의 재료가 된다. */
  const cred = C.identity.credentials
    .map((c) => (c.name === "여성기업 확인서" ? "Women-Owned Business" : c.name === "직접생산확인증명서" ? "Direct Production Certificate" : c.name === "비디오물제작업 신고증" ? "Video Production Business" : "Independent Broadcast Producer"))
    .join(" · ") + " — certificates issued on request";
  return `    </main>

    <footer class="site-footer" aria-label="Contact">
      <div>
        <strong>${esc(E.brand)} <span lang="ko">오늘은 봄날</span></strong>
        <p>${esc(E.footerNote)}</p>
      </div>
      <div>
        <a href="mailto:${C.identity.email}">${C.identity.email}</a>
        <a href="tel:${C.identity.phoneE164}">${C.identity.phoneE164.replace(/-/g, " ")}</a>
      </div>
      <nav aria-label="Pages">
${E.nav.map((n) => `        <a href="${n.path}">${esc(n.label)}</a>`).join("\n")}
        <a href="${BASE}/" hreflang="ko" lang="ko">한국어 사이트</a>
      </nav>
      <p class="footer-legal">
        ${esc(C.identity.legalName)} (${esc(E.brand)}) · Representative ${esc(C.identity.representative)} ·
        Business Registration ${C.identity.businessNumber} ·
        1F, Bldg 102, 250 Dongdaegu-ro, Suseong-gu, Daegu, Republic of Korea<br />
        ${esc(cred)}
      </p>
      <p class="footer-stamp">사이트 최종 업데이트 ${TODAY}</p>
    </footer>
    <script src="${A}hero-video.js?v=20260913-auto" defer></script>
  </body>
</html>
`;
}

/* ── 굽기 ─────────────────────────────────────────────────── */
mkdirSync(join(root, "en"), { recursive: true });
const made = [];
for (const p of E.pages) {
  const body = (p.sections || [])
    .map((s) => {
      const fn = BLOCK[s.type];
      if (!fn) throw new Error(`${p.path}: 모르는 구역 종류 "${s.type}"`);
      return fn(s);
    })
    .join("\n\n");
  const html = head(p) + hero(p) + "\n\n" + body + "\n" + foot();
  const file = join("en", p.slug + ".html");
  writeFileSync(join(root, file), html);
  made.push(`${file}  →  ${p.path}`);
}
console.log("영문 페이지를 구웠습니다:");
for (const m of made) console.log("  " + m);
console.log("\ncanon.json 의 pages 에도 같은 주소가 있어야 사이트맵과 llms.txt 에 실립니다.");
