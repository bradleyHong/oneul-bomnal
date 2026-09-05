#!/usr/bin/env node
/**
 * 이음매 검사 — 마지막 장에서 첫 장으로 넘어갈 때 그림이 툭 튀는가.
 *
 * 우리가 파는 것은 "5초 완전 루프"다. LED 벽에 걸면 하루 종일 이어
 * 붙여 돈다. 5초마다 화면이 한 번씩 튀면 그 자리에서 티가 난다.
 *
 * 오래 쓰던 검사는 renderFrame(150) 과 renderFrame(0) 을 견줬는데,
 * 그건 나머지 연산 때문에 언제나 참이다(t = n % TOTAL / FPS). 아무것도
 * 지키지 못하는 검사였다. 정말 봐야 할 것은 149→0 의 변화가 148→149 의
 * 변화와 비슷한가다. 훨씬 크면 이음매에서 튄다.
 *
 *   node tools/check-loop.mjs
 *
 * 알려진 것 말고 새로 튀는 것이 생기면 종료 코드 1.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* 일부러 툭툭 끊는 것들. 류지 이케다의 test pattern 이 그렇다.
   부드럽게 흐르면 오히려 그 그림이 아니다. */
const BY_DESIGN = ["barcode", "segment", "strobe", "burst"];

/* 이미 나간 번호가 쓰는 그림들. 고치면 그 번호가 다른 그림이 된다.
 *
 * 원인은 하나다. ph(0→2π 한 바퀴)를 잡음 밭의 좌표로 그냥 넣었다.
 * 잡음 밭은 되풀이되지 않으므로, 밭 위를 직선으로 걸어가다 끝에서
 * 처음으로 되돌아온다. 고치려면 밭 위를 원으로 돌아야 한다
 * (fbm(x + cos(ph)*r, y + sin(ph)*r) — 등고선·아이소 도시가 그 꼴이다).
 *
 * 고치는 것은 판을 올리는 일(BN4-)이라 사장님 결정 사항으로 남긴다.
 * 판을 올릴 때 이 목록을 비우면 된다. */
const KNOWN = ["editorial", "hand", "inkwash", "paper", "kaleido", "swiss", "topo",
               "mandala", "vector", "aurora", "bloom", "weave", "blinds", "oscillo"];

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
await page.goto(`http://127.0.0.1:${port}/studio.html`, { waitUntil: "networkidle" });

const rows = await page.evaluate(() => {
  const W = 400, H = 225, FPS = 30, DUR = 5, LAST = FPS * DUR - 1;
  const cv = document.createElement("canvas");
  const c = cv.getContext("2d");
  const out = [];
  for (const [id] of window.StudioArt.STYLES) {
    const inst = window.StudioArt.create(cv, { w: W, h: H, fps: FPS, dur: DUR, seed: 5150,
      style: id, palette: "bomnal", density: 55, glow: 38, grain: 0 });
    inst.renderFrame(0);                       /* 첫 장은 버린다 */
    const snap = (n) => { inst.renderFrame(n); return c.getImageData(0, 0, W, H).data; };
    const diff = (a, q) => {
      let s = 0;
      for (let i = 0; i < a.length; i += 4)
        s += Math.abs(a[i] - q[i]) + Math.abs(a[i + 1] - q[i + 1]) + Math.abs(a[i + 2] - q[i + 2]);
      return s / (W * H * 3);
    };
    const f2 = snap(LAST - 2), f1 = snap(LAST - 1), f0 = snap(LAST);
    const g0 = snap(0), g1 = snap(1);
    const inside = (diff(f2, f1) + diff(f1, f0) + diff(g0, g1)) / 3;
    const seam = diff(f0, g0);
    out.push({ id, seam: +seam.toFixed(3), inside: +inside.toFixed(3),
               ratio: +(seam / Math.max(0.002, inside)).toFixed(1) });
  }
  return out;
});
await browser.close();
server.close();

/* 이음매 변화가 보통 변화의 6배를 넘고, 절대값도 1/255 를 넘으면 튄다. */
const bad = rows.filter((r) => r.ratio > 6 && r.seam > 1.0).sort((a, b) => b.ratio - a.ratio);
const fresh = bad.filter((r) => !BY_DESIGN.includes(r.id) && !KNOWN.includes(r.id));
const fixed = KNOWN.filter((id) => !bad.some((r) => r.id === id));

for (const r of bad.filter((r) => BY_DESIGN.includes(r.id)))
  console.log(`  일부러  ${r.id.padEnd(12)} 이음매 ${r.seam} · 보통 ${r.inside} (끊어 치는 그림)`);
for (const r of bad.filter((r) => KNOWN.includes(r.id)))
  console.log(`  알려짐  ${r.id.padEnd(12)} 이음매 ${r.seam} · 보통 ${r.inside} · ${r.ratio}배`);
for (const r of fresh)
  console.log(`  실패    ${r.id.padEnd(12)} 이음매 ${r.seam} · 보통 ${r.inside} · ${r.ratio}배 — 새로 튄다`);
for (const id of fixed)
  console.log(`  고쳐짐  ${id} — KNOWN 목록에서 빼도 된다`);

console.log("");
if (fresh.length) {
  console.log(`이음매 검사 실패: 새로 튀는 것 ${fresh.length}종`);
  console.log("ph 를 잡음 밭 좌표로 그냥 넣지 말고 cos/sin 으로 원을 그리며 걸을 것.");
  process.exit(1);
}
console.log(`이음매 검사 통과. 본 것 ${rows.length}종 · 일부러 끊는 것 ${BY_DESIGN.length}종`
          + ` · 이미 나간 번호라 두는 것 ${KNOWN.length - fixed.length}종`);
