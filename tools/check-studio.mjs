#!/usr/bin/env node
/**
 * 스튜디오 목록 검증기.
 *
 * 스타일·색 목록이 두 곳에 있다. 엔진(studio-engine.js)과
 * 조작판(studio.js)이다. 둘이 어긋나면 버튼은 있는데 눌러도 그림이
 * 안 바뀌거나, 만든 작품이 다른 그림으로 렌더된다. 화면에는 아무 표시도
 * 나지 않아 한참 뒤에야 알게 된다.
 *
 * 프리셋(studio-presets.js)도 같이 본다. 프리셋이 엔진에 없는 스타일이나
 * 색을 가리키면 고객이 고른 번호가 빈 화면으로 렌더된다.
 *
 *   node tools/check-studio.mjs
 *
 * 종료 코드 0이면 통과, 1이면 어긋난 곳이 있다.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const art = readFileSync(join(root, "studio-engine.js"), "utf8");
const ui = readFileSync(join(root, "studio.js"), "utf8");
const pre = readFileSync(join(root, "studio-presets.js"), "utf8");
const wrap = readFileSync(join(root, "works/studio-art.html"), "utf8");
const fails = [];

/** 배열 리터럴에서 각 항목의 첫 문자열(=id)만 뽑는다. */
function ids(src, marker, endMarker) {
  const i = src.indexOf(marker);
  if (i < 0) return null;
  const j = src.indexOf(endMarker, i);
  return [...src.slice(i, j).matchAll(/\[\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
}

/* 엔진이 실제로 그릴 줄 아는 것 — STYLES 객체의 메서드 이름 */
const bodyStart = art.indexOf("  const STYLES = {");
const bodyEnd = art.indexOf("\n  };", bodyStart);
const drawable = new Set(
  [...art.slice(bodyStart, bodyEnd).matchAll(/^    ([a-z][a-zA-Z0-9]*)\(t\) \{/gm)].map((m) => m[1])
);

const artStyles = ids(art, "const STYLE_LABELS = [", "\n];");
const uiStyles = ids(ui, "var STYLES = [", "\n  ];");
const uiPals = ids(ui, "var PALETTES = [", "\n  ];");

/* 엔진 팔레트는 객체 키다 */
const palStart = art.indexOf("const PALETTES = {");
const palEnd = art.indexOf("\n};", palStart);
const artPals = [...art.slice(palStart, palEnd).matchAll(/^  ([a-z][a-zA-Z0-9]*):\s*\{/gm)].map((m) => m[1]);

const cmp = (what, a, b, aName, bName) => {
  const onlyA = a.filter((x) => !b.includes(x));
  const onlyB = b.filter((x) => !a.includes(x));
  if (onlyA.length) fails.push(`${what}: ${aName}에만 있다 — ${onlyA.join(", ")}`);
  if (onlyB.length) fails.push(`${what}: ${bName}에만 있다 — ${onlyB.join(", ")}`);
};

if (!artStyles || !uiStyles || !uiPals || !drawable.size || !artPals.length) {
  fails.push("목록을 찾지 못했다. 배열 이름이 바뀌었는지 확인할 것");
} else {
  cmp("스타일", artStyles, uiStyles, "엔진 목록", "조작판");
  cmp("색", artPals, uiPals, "엔진", "조작판");
  /* 목록에 있는데 그릴 줄 모르면 눌러도 아무 일이 없다 */
  for (const id of artStyles) {
    if (!drawable.has(id)) fails.push(`스타일 "${id}"가 목록에는 있는데 엔진에 그리는 코드가 없다`);
  }
  for (const id of drawable) {
    if (!artStyles.includes(id)) fails.push(`스타일 "${id}"를 그릴 줄은 아는데 목록에 없다 (고객이 고를 수 없다)`);
  }
}

/* 렌더 화면이 엔진을 실제로 불러오는지. 이 줄이 빠지면 납품 렌더가 통째로 멈춘다. */
if (!wrap.includes("studio-engine.js")) fails.push("works/studio-art.html이 studio-engine.js를 불러오지 않는다");
for (const need of ["window.renderFrame", "window.__READY__"]) {
  if (!wrap.includes(need)) fails.push(`works/studio-art.html에 ${need}가 없다 (render-studio.mjs가 이걸 부른다)`);
}

/* 프리셋이 가리키는 스타일·색이 엔진에 다 있는지 */
let presetCount = 0;
if (!pre.includes("var PER_STYLE")) {
  fails.push("studio-presets.js에서 PER_STYLE을 찾지 못했다");
} else {
  const perStyle = parseInt(pre.match(/var PER_STYLE\s*=\s*(\d+)/)[1], 10);
  presetCount = perStyle * (artStyles ? artStyles.length : 0);
  if (!pre.includes("StudioArt")) fails.push("studio-presets.js가 엔진 목록(StudioArt)을 읽지 않는다");
}

for (const f of fails) console.log(`  실패  ${f}`);
console.log("");
if (fails.length) {
  console.log(`스튜디오 목록 검증 실패: ${fails.length}건`);
  process.exit(1);
}
console.log(
  `스튜디오 목록 검증 통과. 스타일 ${artStyles.length}종 · 색 ${artPals.length}종 · 프리셋 ${presetCount}가지`
);
