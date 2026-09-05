#!/usr/bin/env node
/**
 * 규격 검사 — 실제 납품하는 화면 크기에서 전부 그려 본다.
 *
 * 16:9 에서 멀쩡하던 것이 32:9 띠나 1:6 기둥에서 터진다. 계산해서 집는
 * 씨앗 자리가 넘어가거나, 칸 수가 0이 되거나, 화면이 통째로 빈다.
 * 실제로 여기서 둘을 잡았다 — 칠획이 3840×540 에서 씨앗 배열을 넘었고,
 * 자모가 360×2160 에서 같은 병이었다.
 *
 *   node tools/check-sizes.mjs
 *
 * 터지면 종료 코드 1. 빈 화면은 알려 주기만 한다(밀도 맨 끝값에서는
 * 성기게 나오는 것이 정상인 스타일도 있다).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  try { ({ chromium } = await import("playwright-core")); }
  catch { console.log("playwright 가 없어 건너뜁니다.  npm i -D playwright"); process.exit(0); }
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
               ".css": "text/css" };
const server = createServer((req, res) => {
  const p = join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""));
  if (!p.startsWith(root) || !existsSync(p)) { res.statusCode = 404; return res.end(); }
  res.setHeader("content-type", MIME[p.slice(p.lastIndexOf("."))] || "application/octet-stream");
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--force-color-profile=srgb", "--disable-lcd-text", "--no-sandbox"],
});
const page = await browser.newPage();
const pageErrs = [];
page.on("pageerror", (e) => pageErrs.push(String(e).slice(0, 160)));
await page.goto(`http://127.0.0.1:${port}/studio.html`, { waitUntil: "networkidle" });

const r = await page.evaluate(() => {
  /* 실제로 파는 화면들. 16:9 · 32:9 띠 · 1:6 기둥 · 정사각 · 세로. */
  const SIZES = [[1920, 1080], [3840, 540], [360, 2160], [1080, 1920], [1024, 1024]];
  /* studio-gen 이 내보내는 범위의 양 끝. */
  const COMB = [[8, 15, 25], [96, 90, 95]];
  const cv = document.createElement("canvas");
  const c = cv.getContext("2d");
  const bad = [], blank = [];
  let n = 0;
  for (const [id] of window.StudioArt.STYLES) {
    for (const [w, h] of SIZES) {
      for (const [d, sc, ct] of COMB) {
        n++;
        try {
          const inst = window.StudioArt.create(cv, { w, h, fps: 30, dur: 5, seed: 6161,
            style: id, palette: "bomnal", density: d, scale: sc, contrast: ct, glow: 38, grain: 12 });
          inst.renderFrame(0);
          inst.renderFrame(37);
          const px = c.getImageData(0, 0, w, h).data;
          const bg = [px[0], px[1], px[2]];
          let on = 0;
          for (let i = 0; i < px.length; i += 4)
            if (Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]) > 16) on++;
          if (on / (w * h) < 0.002) blank.push(`${id} ${w}×${h} 밀도${d}`);
        } catch (e) {
          bad.push(`${id} ${w}×${h} 밀도${d} — ${String(e).slice(0, 70)}`);
        }
      }
    }
  }
  return { n, bad, blank, styles: window.StudioArt.STYLES.length, sizes: SIZES.length };
});
await browser.close();
server.close();

for (const b of r.bad) console.log(`  실패  ${b}`);
for (const b of r.blank) console.log(`  성김  ${b}`);
for (const e of pageErrs) console.log(`  실패  콘솔 오류 — ${e}`);
console.log("");
if (r.bad.length || pageErrs.length) {
  console.log(`규격 검사 실패: 터진 것 ${r.bad.length}건 · 콘솔 오류 ${pageErrs.length}건`);
  process.exit(1);
}
console.log(`규격 검사 통과. ${r.styles}종 × ${r.sizes}규격 × 2밀도 = ${r.n}장 · 터진 것 없음`
          + (r.blank.length ? ` · 맨 끝값에서 성긴 것 ${r.blank.length}건` : ""));
