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
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const C = JSON.parse(readFileSync(join(root, "canon/canon.json"), "utf8"));
const B = C.business, I = C.identity, BASE = C.site.baseUrl, TODAY = C.updated;
const w = (f, s) => { writeFileSync(join(root, f), s); console.log(`  ${f}`); };

/* ── llms.txt ─────────────────────────────────────────────── */
const creds = I.credentials
  .map((c) => `- ${c.name} ${c.number}${c.valid ? ` (유효 ${c.valid})` : ""}`).join("\n");
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
const pages = C.pages.filter((p) => p.h1).map((p) => `- [${p.h1}](${BASE}${p.path})`).join("\n");
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

## 사업영역 (네 가지)

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

## 자주 묻는 질문 (요약)

- **미디어파사드란?** 건물 외벽이나 전시장 벽면 자체를 하나의 큰 화면으로 쓰는 표현 방식. 빔프로젝터로 벽에 쏘고 벽 형태에 맞춰 영상을 변형(프로젝션 매핑)합니다.
- **미디어파사드와 LED 전광판의 차이?** 미디어파사드는 빔프로젝터로 벽에 쏘는 방식, LED 전광판은 화면 자체를 설치하는 방식. 오늘은 봄날은 두 방식을 모두 시공합니다.
- **비용은?** 현장 실측 후 산정합니다. 벽면 크기, 화면 대수, 기존 패널 유무, 연동할 데이터 범위에 따라 달라집니다. 회계연도 기준 견적서를 발행합니다.
- **LED 패널 사양은 어떻게 정하나?** 보는 거리와 화면 크기가 결정합니다. 실측에서 화면 크기, 최소 시야 거리, 주변 밝기, 전기 용량, 설치면 하중을 확인한 뒤 픽셀 피치와 밝기를 산정합니다.
- **기존 LED 패널 활용?** 가능합니다. 기존 화면의 해상도와 입력 규격에 맞춰 콘텐츠를 제작하므로 화면을 새로 살 필요가 없습니다.
- **공공 API를 사이니지에 띄울 수 있나?** 기존 사이니지 재생 프로그램은 정해진 영상을 순서대로 트는 구조라 공공 API를 화면에 반영하지 못합니다. 오늘은 봄날은 자체 개발한 방식으로 공공 API를 실시간으로 읽어 대형 사이니지에서도 반영합니다.
- **재생 장비가 없다면?** 사이니지 재생 PC를 현장 화면 규격에 맞춰 세팅해 전달합니다.
- **조달 서류?** 여성기업 확인서, 직접생산확인증명서(동영상제작서비스), 비디오물제작업 신고증, 방송영상독립제작사 신고증 보유. 회계연도 기준 견적서 즉시 발행.

## 주요 페이지

${pages}
- [작품·작업 레퍼런스](${BASE}/#works)

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
const rows = [
  ...C.pages.map((p) => [BASE + (p.path === "/" ? "/" : p.path), p.sitemap]),
  ...C.artworkPages.map((a) => [BASE + "/" + encodeURI(a.path.replace(/^\//, "")), a.sitemap]),
];
w("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<!-- canon/canon.json에서 생성한다. node tools/build-meta.mjs
     vercel.json의 cleanUrls:true 때문에 .html 주소는 308 리다이렉트를 탄다.
     색인 대상은 확장자 없는 정규 주소로만 제출한다. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.map(([loc, sm]) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${TODAY}</lastmod>
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
