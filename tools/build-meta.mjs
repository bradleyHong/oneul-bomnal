#!/usr/bin/env node
/**
 * 캐논에서 나오는 파일들을 다시 만든다.
 *
 *   llms.txt      AI 검색이 읽는 회사 정본
 *   rss.xml       사업영역 피드
 *   sitemap.xml   색인 대상 주소
 *   robots.txt    크롤러 규칙 (그룹마다 차단 목록을 반복해야 한다)
 *
 * 캐논을 고친 뒤 이걸 돌리고 node tools/check-canon.mjs로 확인한다.
 *
 *   node tools/build-meta.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const C = JSON.parse(readFileSync(join(root, "canon/canon.json"), "utf8"));
const B = C.business, I = C.identity, BASE = C.site.baseUrl, TODAY = C.updated;
const w = (f, s) => { writeFileSync(join(root, f), s); console.log(`  ${f}`); };

/* ── llms.txt ─────────────────────────────────────────────── */
const creds = I.credentials
  /* 번호는 적지 않는다. AI 검색이 인용해야 할 것은 "무엇을 가졌는가"이지
     그 번호가 아니다. 번호는 상호·주소와 함께 긁혀 사칭 고지서의 재료가
     된다. 사본은 문의 시 보낸다. */
  .map((c) => `- ${c.name} 보유${c.valid ? ` (유효 ${c.valid})` : ""}`).join("\n");
// 사업영역 개수는 캐논에서 센다. 손으로 적어 두면 캐논에 하나 더할 때마다 어긋난다.
const COUNT_KO = (n) => (["영", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"][n] ?? String(n)) + " 가지";
const scopes = B.scopes.map((s, i) =>
  `### ${i + 1}. ${s.name}\n\n${s.summary}\n\n${s.includes.map((x) => `- ${x}`).join("\n")}\n\n자세히: ${BASE}${s.page}`
).join("\n\n");
const caps = B.capabilities.map((c) => `### ${c.title}\n\n${c.detail}`).join("\n\n");
const deliv = B.method.deliverables.map((d) => `- **${d.name}**: ${d.detail}`).join("\n");
const signage = C.signageTypes
  .map((s) => `- **${s.name}** (${s.spec}): ${s.content} 예시: ${s.example}`).join("\n");
const works = C.artworks.filter((a) => a.public)
  .map((a) => `- **${a.name}** (${a.ratio}): ${a.description}`).join("\n");
const refs = B.proof.references.map((r) => `- ${r}`).join("\n");
const diffs = B.differentiators.map((d) => `- ${d}`).join("\n");
/* 한국어 쪽과 영문 쪽을 갈라 적는다. 한 줄로 이어 붙이면 AI 검색이
   같은 회사의 영문판인지 다른 회사인지 알 수 없다. 영문 쪽에는 어떤
   한국어 쪽의 번역인지도 같이 적는다. */
const koPages = C.pages.filter((p) => p.h1 && p.lang !== "en")
  .map((p) => `- [${p.h1}](${BASE}${p.path})`).join("\n");
const enPages = C.pages.filter((p) => p.h1 && p.lang === "en")
  .map((p) => `- [${p.h1}](${BASE}${p.path})`
            + (p.altOf ? ` · English edition of ${BASE}${p.altOf === "/" ? "/" : p.altOf}` : "")).join("\n");
const pages = koPages;
/* 고객 유형 · 준비된 것 (캐논 business.customers / readiness, 2026-10-12).
   손으로 llms.txt 에 적으면 다음 빌드에서 지워진다 — 여기서 만든다. */
const customers = B.customers ? `## 고객 유형 (공공기관 · 기업 · 개인)

${B.customers.headline}. ${B.customers.sub}

${B.customers.items.map((it) => `### ${it.tag}: ${it.title}
${it.points.map((x) => `- ${x}`).join("\n")}
- 자세히: ${BASE}/${it.href.replace(/^\.\//, "")}`).join("\n\n")}

### 바로 시작할 수 있도록 준비된 것
${(B.readiness || []).map((r) => `- ${r.title}: ${r.detail}`).join("\n")}

` : "";
const kw = [...C.keywords.primary, ...C.keywords.secondary, ...C.keywords.brand].join(", ");

w("llms.txt", `# 오늘은 봄날 (publicbloom.art)

> ${B.identityStatement}

> ${B.elevator}

## 회사 정보

- 회사명: ${I.legalName}
- 대표: ${I.representative}
- 사업자등록번호: ${I.businessNumber}
- 소재지: ${I.address}
- 대표 연락처: ${I.phone}
- 이메일: ${I.email}
- 여성기업 여부: 예. 공공기관 우선구매 대상 여성기업입니다.
- 시공 지역: ${C.areaServed.join(", ")}. ${C.areaServedNote}

${customers}## 사업영역 (${COUNT_KO(B.scopes.length)})

${scopes}

## 발주처가 자주 확인하는 것

${caps}

## 어떻게 만드나

${B.method.why}

${B.method.steps.join("\n")}

납품 형태는 셋 중에서 고릅니다.

${deliv}

${B.method.determinism}

## 사이니지 종류별로 어떤 영상이 맞나

화면 종류마다 비율과 보는 거리가 다르므로 콘텐츠도 달라야 합니다. 16:9로 만든 영상을 32:9 화면에 올리면 좌우가 비거나 위아래가 잘립니다.

${signage}

실제로 돌아가는 화면 예시: ${BASE}/showcase

## 자체 제작 미디어아트

${works}

## 다른 업체와 다른 점

${diffs}

## 인증·자격

${creds}

## 납품 실적과 현장 레퍼런스

- 납품 실적: ${B.proof.delivered}
- 아래는 오늘은 봄날이 수행한 현장 레퍼런스입니다.

${refs}

입찰·수의계약용 실적증명서는 문의 시 별도로 발송합니다.

## 제작 기간

- ${B.proof.leadTime.draft}
- 비교 기준: ${B.proof.leadTime.outsourceBaseline}
- 원하시는 방향을 자세히 알려주실수록 시안의 디테일이 올라갑니다.

## 공개 가격

${(() => {
  const K = B.packages || {};
  const out = [];
  if (K.ledWallRental) { const L = K.ledWallRental;
    out.push(`### ${L.name} (${L.screen}, ${L.panels}장 연결) · ${BASE}${L.page}\n- ${L.dayPriceLabel} · ${L.dayPriceIncludes}\n- ${L.extraDayLabel}\n- ${L.weekLabel}\n- 콘텐츠: ${L.contentNote}\n- 대여 시작: ${L.startsOn} · 패널 구매 상담 가능`); }
  if (K.rental) { const R = K.rental;
    out.push(`### ${R.name} · ${BASE}/rental\n- ${R.basePriceLabel} · ${R.basePriceIncludes}\n- ${R.extraDayLabel}\n- 상영 ${R.screen}`); }
  if (K.aiVideo) { const A = K.aiVideo;
    out.push(`### ${A.name} (${A.vat}) · ${BASE}${A.page}\n${A.tiers.map((t) => `- ${t.length}: ${t.price} · ${t.fit}`).join("\n")}\n- ${A.proof}`); }
  return out.join("\n\n");
})()}

## 자주 묻는 질문 (요약)

- **미디어파사드란?** 건물 외벽이나 전시장 벽면 자체를 하나의 큰 화면으로 쓰는 표현 방식. 빔프로젝터로 벽에 쏘고 벽 형태에 맞춰 영상을 변형(프로젝션 매핑)합니다.
- **미디어파사드와 LED 전광판의 차이?** 미디어파사드는 빔프로젝터로 벽에 쏘는 방식, LED 전광판은 화면 자체를 설치하는 방식. 오늘은 봄날은 두 방식을 모두 시공합니다.
- **비용은?** 설치는 현장 실측 후 산정합니다(벽면 크기, 화면 대수, 기존 패널 유무, 연동할 데이터 범위). 렌탈과 AI 영상은 아래 "공개 가격"에 정가가 있습니다. 회계연도 기준 견적서를 발행합니다.
- **미디어아트 구독은?** 구독한 Google 계정으로 로그인하면 LED·모니터·빔프로젝터 화면에 매일 자정 다른 작품이 켜집니다. 빔프로젝터 1대·2대 맵핑과 화면별 색 조절을 브라우저에서 하며, 구독료는 화면 수와 종류에 따라 안내합니다. ${BASE}/subscription
- **LED 패널 사양은 어떻게 정하나?** 보는 거리와 화면 크기가 결정합니다. 실측에서 화면 크기, 최소 시야 거리, 주변 밝기, 전기 용량, 설치면 하중을 확인한 뒤 픽셀 피치와 밝기를 산정합니다.
- **기존 LED 패널 활용?** 가능합니다. 기존 화면의 해상도와 입력 규격에 맞춰 콘텐츠를 제작하므로 화면을 새로 살 필요가 없습니다.
- **공공 API를 사이니지에 띄울 수 있나?** 됩니다. 날씨·미세먼지 같은 공개 API를 정해진 주기로 받아 그 값에 따라 화면의 색·밀도·속도가 바뀌는 작품으로 만듭니다. 이 사이트의 실시간 화면이 지금 그렇게 돌고 있습니다. ${BASE}/data-media-art
- **재생 장비가 없다면?** 사이니지 재생 PC를 현장 화면 규격에 맞춰 세팅해 전달합니다.
- **조달 서류?** 여성기업 확인서, 직접생산확인증명서(동영상제작서비스), 비디오물제작업 신고증, 방송영상독립제작사 신고증 보유. 회계연도 기준 견적서 즉시 발행.

## 주요 페이지

${pages}
- [작품·작업 레퍼런스](${BASE}/#works)

## English site

같은 회사의 영문판입니다. 사실관계는 한국어 쪽이 정본이며, 아래 주소는
그것을 영어로 옮긴 것입니다. This is the English edition of the same
company. The Korean pages above are authoritative; these are translations.

${enPages}

## 대표 키워드

${kw}

---

최종 수정일: ${TODAY}
이 문서는 canon/canon.json에서 생성합니다. 사실이 바뀌면 캐논을 먼저 고칩니다.
`);

/* ── rss.xml ──────────────────────────────────────────────── */
const PUB = "Sun, 23 Aug 2026 09:00:00 +0900";
const items = B.scopes.filter((s) => s.id !== "fast").map((s) =>
`    <item>
      <title>${s.name}</title>
      <link>${BASE}${s.page}</link>
      <guid>${BASE}${s.page}</guid>
      <pubDate>${PUB}</pubDate>
      <description>${s.summary}</description>
      ${s.includes.map((k) => `<category>${k}</category>`).join("\n      ")}
    </item>`);
items.push(`    <item>
      <title>사이니지 종류별 화면 예시</title>
      <link>${BASE}/showcase</link>
      <guid>${BASE}/showcase</guid>
      <pubDate>${PUB}</pubDate>
      <description>건물 외벽 대형 LED 전광판, 로비 LED 미디어월, 세로형 사이니지, 기둥형 화면, 빔프로젝터 미디어파사드. 화면 종류마다 어떤 영상이 맞는지 실제로 돌아가는 화면으로 보여드립니다.</description>
      <category>LED 전광판 영상</category>
      <category>로비 미디어월 콘텐츠</category>
      <category>사이니지 콘텐츠 제작</category>
    </item>`);
w("rss.xml", `<?xml version="1.0" encoding="UTF-8"?>
<!-- canon/canon.json에서 생성한다. node tools/build-meta.mjs -->
<rss version="2.0">
  <channel>
    <title>오늘은 봄날 | 대구 미디어파사드 · LED 전광판 설치 여성기업</title>
    <link>${BASE}/</link>
    <description>${B.oneLiner}</description>
    <language>ko-KR</language>
    <lastBuildDate>${PUB}</lastBuildDate>
${items.join("\n")}
  </channel>
</rss>
`);

/* ── sitemap.xml ──────────────────────────────────────────── */
/* lastmod 는 페이지마다 실제로 고친 날을 적는다. 전부 같은 날짜면 검색엔진이
   그 값을 믿지 않는다(2026-10-13 점검). git 마지막 커밋일을 쓰고, 아직 커밋하지
   않은 변경이 있으면 오늘 날짜를 쓴다. git 이 없으면 캐논 수정일로 둔다. */
const lastmod = (file) => {
  try {
    const dirty = execFileSync("git", ["status", "--porcelain", "--", file], { cwd: root }).toString().trim();
    if (dirty) return TODAY;
    const d = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { cwd: root }).toString().trim();
    return d || TODAY;
  } catch { return TODAY; }
};
const rows = [
  ...C.pages.map((p) => [BASE + (p.path === "/" ? "/" : p.path), p.sitemap, lastmod(p.file)]),
  ...C.artworkPages.map((a) => [BASE + "/" + encodeURI(a.path.replace(/^\//, "")), a.sitemap, lastmod(a.file || a.path.replace(/^\//, "") + ".html")]),
];
w("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<!-- canon/canon.json에서 생성한다. node tools/build-meta.mjs
     vercel.json의 cleanUrls:true 때문에 .html 주소는 308 리다이렉트를 탄다.
     색인 대상은 확장자 없는 정규 주소로만 제출한다. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.map(([loc, sm, lm]) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lm}</lastmod>
    <changefreq>${sm.changefreq}</changefreq>
    <priority>${sm.priority}</priority>
  </url>`).join("\n")}
</urlset>
`);

/* ── robots.txt ───────────────────────────────────────────── */
const paths = [];
for (const n of C.noindex) {
  paths.push(n);
  if (!n.endsWith("/") && !n.startsWith("/api") && n !== "/works") paths.push(n + ".html");
}
paths.push("/works/", "/%EC%A0%84%ED%99%94%EC%9D%91%EB%8C%80_%ED%95%B8%EB%93%9C%EB%B6%81.html");
const DIS = [...new Set(paths)].map((p) => `Disallow: ${p}`).join("\n");
const uas = ["*", ...C.crawlers.search.filter((b) => b !== "Googlebot"), ...C.crawlers.ai];
w("robots.txt", `# canon/canon.json에서 생성한다. node tools/build-meta.mjs
#
# 주의: robots.txt는 User-agent 그룹마다 규칙이 독립이다.
# 특정 봇 그룹에 Allow만 적어 두면 그 봇에는 위쪽 Disallow가 적용되지 않는다.
# 그래서 차단 목록을 그룹마다 전부 반복해서 적는다.

${uas.map((ua) => `User-agent: ${ua}\nAllow: /\nAllow: /llms.txt\n${DIS}\n`).join("\n")}
# 국내 검색엔진: Yeti(네이버) · Daumoa(다음)
# AI 검색·답변 엔진: 회사 정보가 AI 답변에 인용되도록 명시적으로 허용한다.

Sitemap: ${BASE}/sitemap.xml
Sitemap: ${BASE}/rss.xml
`);

console.log("캐논에서 생성 완료.");
