#!/usr/bin/env node
/**
 * 봄날 스튜디오 연결 검증기.
 *
 * 그림 엔진(studio-engine.js)과 스튜디오(studio-gen.js)가 어긋나면 화면에는
 * 아무 표시도 나지 않는다. 버튼은 있는데 눌러도 그림이 안 바뀌거나,
 * 고객이 받은 작품 번호가 다른 그림으로 렌더된다. 한참 뒤에야 알게 된다.
 *
 *   node tools/check-studio.mjs
 *
 * 종료 코드 0이면 통과, 1이면 어긋난 곳이 있다.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
const art = read("studio-engine.js");
const gen = read("studio-gen.js");
const html = read("studio.html");
const wrap = read("works/studio-art.html");
const fails = [];

/* 엔진이 실제로 그릴 줄 아는 것 — STYLES 객체의 메서드 이름 */
const bodyStart = art.indexOf("  const STYLES = {");
const bodyEnd = art.indexOf("\n  };", bodyStart);
const drawable = new Set(
  [...art.slice(bodyStart, bodyEnd).matchAll(/^    ([a-z][a-zA-Z0-9]*)\(t\) \{/gm)].map((m) => m[1])
);

/* 엔진이 목록으로 내보내는 것 */
const li = art.indexOf("const STYLE_LABELS = [");
const listed = [...art.slice(li, art.indexOf("\n];", li)).matchAll(/\[\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);

/* 엔진 팔레트는 객체 키다 */
const ps = art.indexOf("const PALETTES = {");
const pals = [...art.slice(ps, art.indexOf("\n};", ps)).matchAll(/^  ([a-z][a-zA-Z0-9]*):\s*\{/gm)].map((m) => m[1]);

if (!listed.length || !drawable.size || !pals.length) {
  fails.push("엔진 목록을 찾지 못했다. 이름이 바뀌었는지 확인할 것");
} else {
  for (const id of listed) {
    if (!drawable.has(id)) fails.push(`스타일 "${id}"가 목록에는 있는데 그리는 코드가 없다`);
  }
  for (const id of drawable) {
    if (!listed.includes(id)) fails.push(`스타일 "${id}"를 그릴 줄은 아는데 목록에 없다 (고를 수 없다)`);
  }
}

/* 스튜디오가 엔진을 실제로 쓰는가.
   이 다리가 끊기면 56종이 목록에만 있고 화면에는 기존 14종만 나온다. */
for (const need of ["StudioArt", "ART_PREFIX", "artDraw", "artPalette"]) {
  if (!gen.includes(need)) fails.push(`studio-gen.js에 ${need}가 없다 (엔진 연결이 끊겼다)`);
}
if (!gen.includes("STYLE_IDS = BASE_IDS.concat(artIds())")) {
  fails.push("studio-gen.js가 엔진 스타일을 목록에 붙이지 않는다");
}

/* 화면 비율별 목록에 적은 이름이 엔진에 실제로 있는가.
   오타 하나면 그 스타일만 조용히 후보에서 빠진다. */
for (const key of ["ART_TALL", "ART_WIDE"]) {
  const i = gen.indexOf(`var ${key} = [`);
  if (i < 0) { fails.push(`studio-gen.js에 ${key}가 없다`); continue; }
  const ids = [...gen.slice(i, gen.indexOf("];", i)).matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
  for (const id of ids) {
    if (!listed.includes(id)) fails.push(`${key}의 "${id}"가 엔진에 없다 (오타면 조용히 빠진다)`);
  }
}

/* 페이지가 엔진을 먼저 불러오는가. 순서가 뒤집히면 목록이 비어 나온다. */
const iEngine = html.indexOf("studio-engine.js");
const iGen = html.indexOf("studio-gen.js");
if (iEngine < 0) fails.push("studio.html이 studio-engine.js를 불러오지 않는다");
else if (iGen >= 0 && iEngine > iGen) fails.push("studio.html에서 studio-engine.js가 studio-gen.js보다 뒤에 있다");

/* 납품 렌더 화면. 이 둘이 없으면 render-studio.mjs가 멈춘다. */
if (!wrap.includes("studio-engine.js")) fails.push("works/studio-art.html이 studio-engine.js를 불러오지 않는다");
for (const need of ["window.renderFrame", "window.__READY__"]) {
  if (!wrap.includes(need)) fails.push(`works/studio-art.html에 ${need}가 없다`);
}

for (const f of fails) console.log(`  실패  ${f}`);
console.log("");
if (fails.length) {
  console.log(`스튜디오 연결 검증 실패: ${fails.length}건`);
  process.exit(1);
}
console.log(`스튜디오 연결 검증 통과. 엔진 스타일 ${listed.length}종 · 엔진 색 ${pals.length}종`);
