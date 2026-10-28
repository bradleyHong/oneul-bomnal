/* ArtWork Studio 손님 화면용 목록(works/studio-gl/catalog.js)을 만든다.
 *
 *   node tools/build-studio-catalog.mjs
 *
 * 작품 코드(works/studio-gl/works/*.js)는 웹에 올리지 않는다(.vercelignore). 손님 화면에는
 * 제목·설명·색 이름·분위기와, 색마다 미리 렌더해 비메오에 올린 영상 주소만 나간다.
 * 순서는 works/studio-gl/order.txt, 비메오 주소는 works/studio-gl/vimeo.json ({ id: [색0, 색1, 색2, 색3] }).
 */
import fs from "node:fs";
import vm from "node:vm";

const D = "works/studio-gl/";
const order = fs.readFileSync(D + "order.txt", "utf8").split("\n").map((l) => l.replace(/#.*/, "").trim()).filter(Boolean);
const vimeo = JSON.parse(fs.readFileSync(D + "vimeo.json", "utf8"));
const got = {};
const ctx = { SGL: { add: (w) => { got[w.id] = w; } } };
vm.createContext(ctx);
for (const id of order) vm.runInContext(fs.readFileSync(`${D}works/${id}.js`, "utf8"), ctx, { filename: id });

const list = order.map((id) => {
  const w = got[id];
  if (!w) throw new Error("작품 없음: " + id);
  const v = vimeo[id] || [];
  return { id, title: w.title, en: w.en, mood: w.mood, desc: w.desc,
    palettes: w.palettes.map((p, i) => ({ name: p.name, colors: p.colors, vimeo: v[i] || null })) };
});
const missing = list.flatMap((w) => w.palettes.filter((p) => !p.vimeo).map((p) => `${w.id}/${p.name}`));
fs.writeFileSync(D + "catalog.js",
  "/* 자동 생성 — 고치지 말고 node tools/build-studio-catalog.mjs 를 다시 돌린다.\n" +
  " * 작품 코드는 웹에 없다. 색마다 미리 렌더한 비메오 영상만 보여 준다. */\n" +
  "window.SX_CATALOG = " + JSON.stringify(list, null, 1) + ";\n");
console.log(`catalog.js: ${list.length}편` + (missing.length ? ` · 비메오 없는 색 ${missing.length}개 (첫 화면 영상으로 대신)` : ""));
