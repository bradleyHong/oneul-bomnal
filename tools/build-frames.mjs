/*
 * 스크롤로 움직이는 작품의 프레임을 뽑는다.
 *
 * 우리 작품은 전부 renderFrame(n) 하나로 그려진다. 같은 n 이면 언제
 * 그려도 같은 그림이 나온다. 그래서 미리 뽑아 둘 수 있고, 스크롤
 * 위치를 n 으로 바꾸기만 하면 손가락이 그림을 민다.
 *
 * 왜 미리 뽑는가. 그림 엔진(studio-engine.js)이 219KB 다. 첫 화면에
 * 통째로 올리면 스크롤 장식 하나 때문에 페이지가 그만큼 늦어진다.
 * 프레임은 한 장에 4KB 안팎이라 훨씬 싸다.
 *
 * 낱장으로 내보내면 조각 하나에 수십 번을 주고받아야 한다. 그래서
 * 한 장에 격자로 붙여 스프라이트로 내보낸다. 요청은 한 번이다.
 *
 *   node tools/build-frames.mjs
 */
import { chromium } from "playwright-core";
import { readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const ROOT = resolve(".");
const OUT = join(ROOT, "assets", "scroll");
const PORT = 8399;

/* 뽑을 것. cols 는 스프라이트 격자의 가로 칸 수다. */
const PIECES = [
  {
    id: "bamboo-grove",
    kind: "engine",
    label: "대숲",
    opts: { style: "bamboo", palette: "monet", seed: 20260911, dur: 8, fps: 24 },
    w: 960, h: 540, frames: 48, cols: 8, quality: 0.72,
  },
  {
    id: "leafvein",
    kind: "engine",
    label: "잎맥",
    /* 잎맥과 갈대는 가는 선이 빽빽해 webp 가 잘 줄이지 못한다. 420px에
       30장이면 한 장에 15~17KB, 조각 하나가 500KB 가까이 된다. 화면에서
       360px 안쪽으로 보이는 것이라 그만큼 키울 이유가 없다. */
    opts: { style: "leafvein", palette: "monet", seed: 5120744, dur: 8, fps: 24 },
    w: 360, h: 360, frames: 24, cols: 6, quality: 0.58,
  },
  {
    id: "reed",
    kind: "engine",
    label: "갈대",
    opts: { style: "reed", palette: "hiroshige", seed: 8814402, dur: 8, fps: 24 },
    w: 360, h: 360, frames: 24, cols: 6, quality: 0.58,
  },
  {
    id: "petalfall",
    kind: "engine",
    label: "꽃눈",
    opts: { style: "petalfall", palette: "bomnal", seed: 3390215, dur: 8, fps: 24 },
    w: 360, h: 360, frames: 24, cols: 6, quality: 0.62,
  },
];

/* 엔진을 띄워 스프라이트 한 장을 만드는 페이지. 파일로 남기지 않는다 —
   저장소에 굴러다니면 누군가 사이트의 일부로 착각한다. */
const HARNESS = `<!doctype html><meta charset="utf-8"><body style="margin:0">
<canvas id="cell"></canvas><canvas id="sheet"></canvas>
<script src="/studio-engine.js"></script>
<script>
window.__sheet = function (o) {
  var cell = document.getElementById("cell");
  cell.width = o.w; cell.height = o.h;
  var art = StudioArt.create(cell, Object.assign({ w: o.w, h: o.h }, o.opts));
  var total = art.totalFrames;
  var rows = Math.ceil(o.frames / o.cols);
  var sheet = document.getElementById("sheet");
  sheet.width = o.cols * o.w; sheet.height = rows * o.h;
  var g = sheet.getContext("2d");
  for (var i = 0; i < o.frames; i++) {
    /* 한 바퀴를 frames 칸으로 고르게 나눈다. 0..frames-1 을 그대로 쓰면
       전체 주기의 앞부분만 담겨 움직임이 거의 없어 보인다. */
    art.renderFrame(Math.round(i * total / o.frames) % total);
    g.drawImage(cell, (i % o.cols) * o.w, Math.floor(i / o.cols) * o.h);
  }
  /* 스프라이트가 끝내 안 오는 경우(느린 망, 차단)를 위해 첫 장을 따로
     낸다. 검은 판만 남으면 '아직 안 뜬 자리'로 읽힌다. */
  art.renderFrame(0);
  return {
    url: sheet.toDataURL("image/webp", o.quality),
    poster: cell.toDataURL("image/webp", 0.68),
    total: total, rows: rows,
  };
};
</script>`;

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
               ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg",
               ".json": "application/json", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split("?")[0]);
  if (path === "/__harness") {
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(HARNESS);
  }
  try {
    const buf = await readFile(join(ROOT, path.replace(/^\//, "")));
    res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream" });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end("no");
  }
});
await new Promise((r) => server.listen(PORT, r));

const dir = "/opt/pw-browsers";
const exe = `${dir}/${readdirSync(dir).find((d) => d.startsWith("chromium-"))}/chrome-linux/chrome`;
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("  브라우저 오류:", String(e).slice(0, 160)));

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
const manifest = {};

for (const p of PIECES) {
  await page.goto(`http://localhost:${PORT}/__harness`, { waitUntil: "load" });
  const r = await page.evaluate((o) => window.__sheet(o), p);
  const bytes = Buffer.from(r.url.split(",")[1], "base64");
  const poster = Buffer.from(r.poster.split(",")[1], "base64");
  writeFileSync(join(OUT, `${p.id}.webp`), bytes);
  writeFileSync(join(OUT, `${p.id}-poster.webp`), poster);
  manifest[p.id] = {
    label: p.label, w: p.w, h: p.h,
    frames: p.frames, cols: p.cols, rows: r.rows,
    sheet: `./assets/scroll/${p.id}.webp`,
    poster: `./assets/scroll/${p.id}-poster.webp`,
  };
  console.log(`  ${p.id.padEnd(14)} ${p.frames}장 · ${p.cols}×${r.rows} · ` +
              `${(bytes.length / 1024).toFixed(0)}KB (한 장 ${(bytes.length / p.frames / 1024).toFixed(1)}KB)` +
              ` · 포스터 ${(poster.length / 1024).toFixed(0)}KB`);
}

writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("\n프레임 생성 완료 · assets/scroll/");
await browser.close();
server.close();
