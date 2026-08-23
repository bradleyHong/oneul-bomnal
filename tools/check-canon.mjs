#!/usr/bin/env node
/**
 * 캐논 검증기.
 *
 * canon/canon.json에 적힌 것과 실제 파일이 어긋나면 잡아낸다.
 * 페이지를 고치거나 더한 뒤에는 항상 이걸 돌린다.
 *
 *   node tools/check-canon.mjs
 *
 * 종료 코드 0이면 통과, 1이면 어긋난 곳이 있다.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const C = JSON.parse(readFileSync(join(root, "canon/canon.json"), "utf8"));
const BASE = C.site.baseUrl;

const fails = [];
const warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);
const read = (f) => readFileSync(join(root, f), "utf8");
const has = (f) => existsSync(join(root, f));

const attr = (html, re) => (html.match(re) || [])[1] ?? null;
const metaName = (html, name) =>
  attr(html, new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`, "i"));
const metaProp = (html, prop) =>
  attr(html, new RegExp(`<meta\\s+property="${prop}"\\s+content="([^"]*)"`, "i"));

/* ── 1. 페이지: 메타태그가 캐논과 같은가 ─────────────────────── */
const pageHtml = new Map();
for (const p of C.pages) {
  if (!has(p.file)) { fail(`페이지 없음: ${p.file}`); continue; }
  const html = read(p.file);
  pageHtml.set(p.path, html);

  if (p.title) {
    const t = attr(html, /<title>([^<]*)<\/title>/i);
    if (t !== p.title) fail(`${p.file}: title이 캐논과 다르다\n     캐논: ${p.title}\n     파일: ${t}`);
  }
  if (p.description) {
    const d = metaName(html, "description");
    if (d !== p.description) fail(`${p.file}: description이 캐논과 다르다`);
    if (d && (d.length < 60 || d.length > 200)) warn(`${p.file}: description 길이 ${d.length}자 (60~200자 권장)`);
  }
  const canonical = attr(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i);
  const want = BASE + (p.path === "/" ? "/" : p.path);
  if (canonical !== want) fail(`${p.file}: canonical이 ${want} 여야 하는데 ${canonical}`);

  for (const [prop, label] of [["og:title", "og:title"], ["og:description", "og:description"], ["og:image", "og:image"], ["og:url", "og:url"]]) {
    if (!metaProp(html, prop)) fail(`${p.file}: ${label} 없음`);
  }

  const h1 = html.match(/<h1[^>]*>/gi) || [];
  if (h1.length !== 1) fail(`${p.file}: h1이 ${h1.length}개 (정확히 1개여야 한다)`);

  const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!lds.length) fail(`${p.file}: JSON-LD 없음`);
  for (const [, body] of lds) {
    try {
      const j = JSON.parse(body);
      const flat = JSON.stringify(j);
      // 페이지 타입 노드에만 갱신일을 요구한다. VideoObject 같은 노드는 uploadDate를 쓴다.
      if (/"@type":\s*"(\w*Page)"/.test(flat) && !flat.includes("dateModified")) {
        warn(`${p.file}: 페이지 스키마에 dateModified 없음 — AI 검색은 최신성을 가중치로 본다`);
      }
      if (!flat.includes(`${BASE}/#organization`)) warn(`${p.file}: JSON-LD가 조직 노드(@id)를 참조하지 않음`);
    } catch (e) { fail(`${p.file}: JSON-LD 파싱 실패 — ${e.message}`); }
  }

  if (!/naver-site-verification/.test(html)) warn(`${p.file}: 네이버 사이트 인증 메타 없음`);

  // 배포된 빌드를 눈으로 구분하기 위한 표시. 캐논 날짜와 어긋나면 잡는다.
  const stamp = html.match(/class="footer-stamp">사이트 최종 업데이트 ([\d-]+)</);
  if (stamp && stamp[1] !== C.updated) {
    fail(`${p.file}: 푸터 업데이트 표시가 ${stamp[1]}인데 캐논은 ${C.updated}`);
  }
}

/* ── 2. 사이트맵: 캐논 페이지와 1:1인가 ─────────────────────── */
const sitemap = read("sitemap.xml");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decodeURI(m[1]));
for (const p of C.pages) {
  const want = decodeURI(BASE + (p.path === "/" ? "/" : p.path));
  if (!locs.includes(want)) fail(`sitemap.xml에 ${want} 없음`);
}
for (const a of C.artworkPages) {
  const want = decodeURI(BASE + a.path);
  if (!locs.includes(want)) fail(`sitemap.xml에 작품 페이지 ${want} 없음`);
}
const known = new Set([
  ...C.pages.map((p) => decodeURI(BASE + (p.path === "/" ? "/" : p.path))),
  ...C.artworkPages.map((a) => decodeURI(BASE + a.path)),
]);
for (const l of locs) if (!known.has(l)) fail(`sitemap.xml에 캐논에 없는 주소: ${l}`);

/* ── 3. robots.txt: 그룹마다 차단이 반복돼 있는가 ─────────────── */
const robots = read("robots.txt");
const groups = robots.split(/^User-agent:\s*/m).slice(1).map((g) => {
  const [head, ...rest] = g.split("\n");
  return { ua: head.trim(), body: rest.join("\n") };
});
if (!groups.length) fail("robots.txt에 User-agent 그룹이 없다");
for (const g of groups) {
  for (const n of C.noindex) {
    if (n === "/works") continue;
    if (!g.body.includes(`Disallow: ${n}`)) fail(`robots.txt: [${g.ua}] 그룹에 ${n} 차단이 빠졌다 (그룹마다 규칙이 독립이므로 전부 반복해야 한다)`);
  }
  if (!/Disallow:\s*\/works\//.test(g.body)) fail(`robots.txt: [${g.ua}] 그룹에 /works/ 차단이 빠졌다`);
}
for (const bot of [...C.crawlers.ai, ...C.crawlers.search]) {
  if (bot === "Googlebot") continue;
  const g = groups.find((x) => x.ua === bot);
  if (!g) fail(`robots.txt: ${bot} 그룹이 없다 (AI 검색 인용을 위해 명시적으로 허용해야 한다)`);
  else if (!/^Allow:\s*\/$/m.test(g.body)) fail(`robots.txt: ${bot} 그룹에 Allow: / 가 없다`);
}
if (!robots.includes(`Sitemap: ${BASE}/sitemap.xml`)) fail("robots.txt에 Sitemap 지시자 없음");

/* ── 4. llms.txt: AI 검색이 읽는 정본과 맞는가 ─────────────── */
const llms = read("llms.txt");
for (const p of C.pages) {
  if (!p.h1) continue;
  if (!llms.includes(BASE + p.path)) fail(`llms.txt에 ${BASE}${p.path} 링크 없음`);
}
for (const k of C.keywords.primary) {
  if (!llms.includes(k)) fail(`llms.txt에 핵심 키워드 "${k}" 없음`);
}
if (!llms.includes(C.identity.businessNumber)) fail("llms.txt에 사업자등록번호 없음");
if (!llms.includes(C.updated)) warn(`llms.txt 최종 수정일이 캐논(${C.updated})과 다르다`);

/* ── 5. 핵심 키워드가 실제 페이지 본문에 있는가 ───────────────── */
const allHtml = [...pageHtml.values()].join("\n");
for (const k of C.keywords.primary) {
  if (!allHtml.includes(k)) fail(`핵심 키워드 "${k}"가 어느 페이지에도 없다`);
}

/* ── 6. 표기 규칙과 금지 표현 ──────────────────────────────── */
for (const [bad, good] of Object.entries(C.terminology.preferred)) {
  if (bad === good) continue;
  for (const [path, html] of pageHtml) {
    const text = html.replace(/<script[\s\S]*?<\/script>/g, "");
    if (text.includes(bad)) warn(`${path}: "${bad}" 대신 "${good}"으로 통일할 것`);
  }
}
for (const bad of C.terminology.forbidden) {
  if (bad.length > 20) continue;
  for (const [path, html] of pageHtml) {
    if (html.includes(bad)) fail(`${path}: 금지 표현 "${bad}" 사용됨`);
  }
}

/* ── 7. 작품 공개본이 보호 규칙을 지키는가 ───────────────────── */
for (const art of C.artworks) {
  if (!art.public) continue;
  if (!has(art.file)) { fail(`작품 공개본 없음: ${art.file} (node tools/build-works.mjs 실행)`); continue; }
  const html = read(art.file);
  if (!/noindex/.test(html)) fail(`${art.file}: noindex 메타 없음`);
  if (!/protect\.js/.test(html)) fail(`${art.file}: protect.js 삽입 안 됨`);
  if (/\/\*[\s\S]*?\*\//.test(html.replace(/<style[\s\S]*?<\/style>/g, ""))) {
    fail(`${art.file}: 스크립트 주석이 남아 있다 (node tools/build-works.mjs 다시 실행)`);
  }
  if (!has(art.source)) fail(`작품 원본 없음: ${art.source}`);
}
const vercelignore = has(".vercelignore") ? read(".vercelignore") : "";
if (!vercelignore.includes("works/_source")) fail(".vercelignore에 works/_source/ 가 없다 — 작품 원본이 웹에 올라간다");
const vercel = JSON.parse(read("vercel.json"));
if (!JSON.stringify(vercel).includes("/works/")) fail("vercel.json에 /works/ 헤더 규칙이 없다");

/* ── 결과 ────────────────────────────────────────────────── */
for (const w of warns) console.log(`  경고  ${w}`);
for (const f of fails) console.log(`  실패  ${f}`);
console.log("");
if (fails.length) {
  console.log(`캐논 검증 실패: ${fails.length}건 (경고 ${warns.length}건)`);
  process.exit(1);
}
console.log(`캐논 검증 통과. 페이지 ${C.pages.length}개 · 작품 ${C.artworks.filter((a) => a.public).length}개 (경고 ${warns.length}건)`);
