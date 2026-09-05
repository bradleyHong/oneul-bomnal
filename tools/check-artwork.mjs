#!/usr/bin/env node
/**
 * 이미 나간 작품 번호가 여전히 같은 그림을 그리는지 본다.
 *
 * 스타일 목록에 하나 끼워 넣으면 고르는 자리가 밀린다 — 그건
 * check-studio.mjs 가 막는다. 그런데 그것만으로는 모자란다. 목록은
 * 그대로 두고 어떤 스타일의 "그리는 코드"만 손봐도 이미 팔린 번호가
 * 다른 그림이 된다. 화면에는 "결제하시면 같은 번호로 렌더링해
 * 드립니다"라고 적혀 있다.
 *
 * 실제로 한 번 그럴 뻔했다. 회로(circuit)가 거의 안 움직이길래 신호가
 * 흐르도록 고쳤는데, 그건 BN2- 번호가 쓰는 그림이었다. 되돌렸다.
 * 그때 손으로 견줘 본 걸 여기 붙박이로 남긴다.
 *
 *   node tools/check-artwork.mjs           견주기 (다르면 종료 코드 1)
 *   node tools/check-artwork.mjs --write   기준 다시 적기
 *
 * --write 는 판을 올릴 때만 쓴다. 그림을 바꾸고 기준만 새로 적으면
 * 이 검사는 아무것도 지키지 못한다.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const REF = join(root, "canon/artwork-hashes.json");
const WRITE = process.argv.includes("--write");

/* 기준을 잡을 때 쓰는 조건. 한 칸도 바꾸지 말 것.
   바꾸면 예전 해시와 견줄 수 없어져 검사가 통째로 무의미해진다. */
const W = 480, H = 270;
const SEEDS = [4242, 90210];
const FRAMES = [3, 29, 88];
const OPTS = { fps: 30, dur: 5, palette: "bomnal", density: 55, scale: 50,
               contrast: 60, glow: 38, grain: 14 };

let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  try { ({ chromium } = await import("playwright-core")); }
  catch {
    console.log("playwright 가 없어 건너뜁니다.  npm i -D playwright");
    process.exit(0);
  }
}

/* 파일을 그대로 내주는 아주 작은 서버. file:// 로 열면 스크립트가 막힌다. */
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
               ".css": "text/css" };
const server = createServer((req, res) => {
  const p = join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""));
  if (!p.startsWith(root) || !existsSync(p)) { res.statusCode = 404; return res.end(); }
  const ext = p.slice(p.lastIndexOf("."));
  res.setHeader("content-type", MIME[ext] || "application/octet-stream");
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--force-color-profile=srgb", "--disable-lcd-text", "--no-sandbox"],
});
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/studio.html`, { waitUntil: "networkidle" });

const got = await page.evaluate(([W, H, SEEDS, FRAMES, OPTS]) => {
  const cv = document.createElement("canvas");
  const c = cv.getContext("2d");
  const out = {};
  for (const [id] of window.StudioArt.STYLES) {
    const h = [];
    for (const seed of SEEDS) {
      const inst = window.StudioArt.create(cv, Object.assign({ w: W, h: H, seed, style: id }, OPTS));
      inst.renderFrame(0);            /* 첫 장은 버린다 — 크로미움이 래스터라이저를 데운다 */
      for (const n of FRAMES) {
        inst.renderFrame(n);
        const d = c.getImageData(0, 0, W, H).data;
        let x = 2166136261;
        for (let i = 0; i < d.length; i += 4) {
          x = Math.imul(x ^ d[i], 16777619);
          x = Math.imul(x ^ d[i + 1], 16777619);
          x = Math.imul(x ^ d[i + 2], 16777619);
        }
        h.push((x >>> 0).toString(16));
      }
    }
    out[id] = h.join(",");
  }
  return out;
}, [W, H, SEEDS, FRAMES, OPTS]);

await browser.close();
server.close();

if (WRITE) {
  writeFileSync(REF, JSON.stringify(got, null, 0) + "\n");
  console.log(`기준을 다시 적었습니다: 스타일 ${Object.keys(got).length}종 → canon/artwork-hashes.json`);
  process.exit(0);
}

if (!existsSync(REF)) {
  console.log("기준 파일이 없습니다.  node tools/check-artwork.mjs --write 로 한 번 만드십시오.");
  process.exit(1);
}
const ref = JSON.parse(readFileSync(REF, "utf8"));
const changed = [], gone = [];
for (const id in ref) {
  if (!(id in got)) gone.push(id);
  else if (ref[id] !== got[id]) changed.push(id);
}
const added = Object.keys(got).filter((id) => !(id in ref));

for (const id of gone) console.log(`  실패  "${id}" 가 사라졌다 — 이미 나간 번호가 이 그림을 쓴다`);
for (const id of changed) console.log(`  실패  "${id}" 의 그림이 달라졌다 — 이미 나간 번호가 다른 그림이 된다`);
console.log("");
if (gone.length || changed.length) {
  console.log(`작품 그림 검증 실패: ${gone.length + changed.length}종`);
  console.log("고칠 뜻이 있었다면 판을 올리고(BN4-) 기준을 --write 로 다시 적으십시오.");
  process.exit(1);
}
console.log(`작품 그림 검증 통과. 지켜본 스타일 ${Object.keys(ref).length}종`
          + (added.length ? ` · 새로 생긴 것 ${added.length}종(기준에 넣으려면 --write)` : ""));
