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
for (const key of ["ART_TALL_V2", "ART_WIDE_V2", "ART_TALL_V3", "ART_WIDE_V3"]) {
  /* 2판은 배열 그대로, 3판은 2판에 concat 한 꼴이다. 둘 다 "]" 전까지 읽는다. */
  const i = gen.indexOf(`var ${key} = `);
  if (i < 0) { fails.push(`studio-gen.js에 ${key}가 없다`); continue; }
  const ids = [...gen.slice(i, gen.indexOf("]", i)).matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
  for (const id of ids) {
    if (!listed.includes(id)) fails.push(`${key}의 "${id}"가 엔진에 없다 (오타면 조용히 빠진다)`);
  }
}
/* 3판에서 더한 것들 — ART_TALL = ART_TALL_V2.concat([ ... ]) 안쪽 */
for (const key of ["ART_TALL", "ART_WIDE"]) {
  const i = gen.indexOf(`var ${key} = ${key}_V3.concat([`);
  if (i < 0) { fails.push(`studio-gen.js의 ${key}가 ${key}_V3에서 이어지지 않는다`); continue; }
  const ids = [...gen.slice(i, gen.indexOf("]);", i)).matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
  for (const id of ids) {
    if (!listed.includes(id)) fails.push(`${key}의 "${id}"가 엔진에 없다 (오타면 조용히 빠진다)`);
  }
}

/* 씨앗 배열을 넘어서 집는 곳.
   seeds 는 900칸이다. seeds[980] 처럼 넘겨 집으면 undefined 가 나와
   그 스타일이 통째로 터진다. 숫자로 박힌 자리는 여기서 막는다.
   계산해서 집는 자리(seeds[i * 7 + 200] 같은 것)는 밀도와 화면 규격에
   따라 넘어가므로 여기서는 알 수 없다. 그건 tools/check-sizes.mjs 가
   실제로 그려 보며 잡는다 — 칠획 32:9, 자모 1:6 을 거기서 잡았다. */
{
  const SEEDS = 900;
  for (const m of art.matchAll(/seeds\[\s*(\d+)\s*\]/g)) {
    if (+m[1] >= SEEDS) fails.push(`seeds[${m[1]}] — 씨앗은 ${SEEDS}칸뿐이다 (그 스타일이 터진다)`);
  }
}

/* 이미 나간 작품 번호를 지키는 표지.
   판마다 엔진 목록의 앞 N종만 본다(studio-gen.js의 ART_V2_COUNT·ART_V3_COUNT).
   중간에 하나 끼워 넣으면 그 뒤가 통째로 밀려 팔린 번호가 다른 그림이
   된다. 목록은 뒤에만 붙일 수 있다. 판마다 표지 하나로 그걸 확인한다.
   한 번 뚫렸다 — #25 가 판을 안 올리고 8종을 넣어 담아 둔 화면이 바뀌었다.
   그래서 이제는 "지금 나가 있는 판의 수"도 같이 본다: 배포된 판에
   스타일을 더하려면 판을 올려야 한다. */
const ERAS = [[56, "weave"], [78, "nakhwa"]];
for (const [count, last] of ERAS) {
  if (listed.length < count) {
    fails.push(`엔진 스타일이 ${listed.length}종이다. ${count}종 판보다 적다 (지운 것이 있다)`);
  } else if (listed[count - 1] !== last) {
    fails.push(`엔진 목록 ${count}번째가 "${listed[count - 1]}"다. "${last}"여야 한다`
             + " — 중간에 끼워 넣었다면 이미 팔린 번호가 다른 그림이 된다");
  }
}
if (!gen.includes("ART_V2_COUNT = 56, ART_V3_COUNT = 78")) fails.push("studio-gen.js의 판별 수(56·78)가 다르다");
for (const need of ["FIT_V1", "FIT_V2", "FIT_V3", "FITS"]) {
  if (!gen.includes(need)) fails.push(`studio-gen.js에 ${need}가 없다 (판별 목록이 끊겼다)`);
}
/* 지금 나가는 판(CODE_V)이 마지막으로 얼린 판보다 커야 한다.
   같으면 얼린 목록 위에 스타일을 얹고 있다는 뜻이다 — #25 가 그랬다. */
{
  const js = read("studio.js");
  const cv = +(js.match(/var CODE_V = (\d+)/) || [0, 0])[1];
  const lastEra = ERAS[ERAS.length - 1][0];
  if (listed.length > lastEra && cv <= ERAS.length + 1) {
    fails.push(`엔진이 ${listed.length}종인데 CODE_V 가 ${cv}다. 얼린 판(${lastEra}종) 위에 더 얹었으면 판을 올려야 한다`);
  }
}

/* 3D 뼈대. studio-meshes.js는 tools/build-meshes.mjs가 만든다.
   이게 없으면 와이어프레임·점군·홀로그램이 다른 스타일로 조용히
   대체된다. 화면은 멀쩡해 보이는데 고른 것과 다른 그림이 나온다. */
const MESH_STYLES = ["wire", "pointcloud", "hologram"];
let meshes = null;
try { meshes = read("studio-meshes.js"); } catch { /* 아래에서 잡는다 */ }
if (!meshes) {
  fails.push("studio-meshes.js가 없다 — node tools/build-meshes.mjs 를 돌릴 것");
} else {
  for (const need of ["window.StudioMeshes", "window.StudioMeshIds"]) {
    if (!meshes.includes(need)) fails.push(`studio-meshes.js에 ${need}가 없다`);
  }
  const ids = JSON.parse(meshes.slice(meshes.indexOf("window.StudioMeshIds = ") + 23,
                                      meshes.lastIndexOf("]") + 1));
  if (!ids.length) fails.push("studio-meshes.js에 모델이 하나도 없다");
  /* 받은 것은 전부 라이선스 표에 적혀 있어야 한다. 적히지 않은 것은
     배포하지 않는다는 규칙이 assets/mesh/LICENSE.md 에 있다. */
  let lic = "";
  try { lic = read("assets/mesh/LICENSE.md"); } catch { /* 아래에서 잡는다 */ }
  if (!lic) fails.push("assets/mesh/LICENSE.md가 없다 (출처를 적지 않은 것은 배포하지 않는다)");
  else for (const id of ids) {
    if (!lic.includes(`\`${id}.json\``)) fails.push(`${id} 가 assets/mesh/LICENSE.md 표에 없다`);
    if (!lic.includes("CC0")) fails.push("assets/mesh/LICENSE.md에 CC0 표기가 없다");
  }
  for (const id of MESH_STYLES) {
    if (!listed.includes(id)) fails.push(`3D 스타일 "${id}"가 엔진 목록에 없다`);
  }
}

/* 페이지가 엔진을 먼저 불러오는가. 순서가 뒤집히면 목록이 비어 나온다. */
const iEngine = html.indexOf("studio-engine.js");
const iGen = html.indexOf("studio-gen.js");
const iMesh = html.indexOf("studio-meshes.js");
if (iEngine < 0) fails.push("studio.html이 studio-engine.js를 불러오지 않는다");
else if (iGen >= 0 && iEngine > iGen) fails.push("studio.html에서 studio-engine.js가 studio-gen.js보다 뒤에 있다");
if (iMesh < 0) fails.push("studio.html이 studio-meshes.js를 불러오지 않는다 (3D 스타일이 빈다)");
else if (iEngine >= 0 && iMesh > iEngine) fails.push("studio.html에서 studio-meshes.js가 studio-engine.js보다 뒤에 있다");

/* 납품 렌더 화면. 이 둘이 없으면 render-studio.mjs가 멈춘다. */
if (!wrap.includes("studio-engine.js")) fails.push("works/studio-art.html이 studio-engine.js를 불러오지 않는다");
if (!wrap.includes("studio-meshes.js")) fails.push("works/studio-art.html이 studio-meshes.js를 불러오지 않는다 (납품본에서 3D가 빈다)");
else if (wrap.indexOf("studio-meshes.js") > wrap.indexOf("studio-engine.js")) {
  fails.push("works/studio-art.html에서 studio-meshes.js가 studio-engine.js보다 뒤에 있다");
}
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
