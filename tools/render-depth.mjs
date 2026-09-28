#!/usr/bin/env node
/**
 * 깊이(3D) 장면을 영상으로 뽑는다.
 *
 *   node tools/render-depth.mjs --scene moonjar --seed 4821937 --pal 0
 *   node tools/render-depth.mjs --batch depth/batch.json          목록 한꺼번에
 *   node tools/render-depth.mjs --scene ocean --preset 4k --len 30  4K · 30초
 *
 * 길잡이
 *   · 5초 완전 루프를 한 번만 그린다. 30초·60초가 필요하면 그 5초를 이어
 *     붙인다(-stream_loop). 끝 장이 첫 장으로 붙게 그렸으니 이음매가 없다.
 *     다시 그리면 같은 그림을 여섯 번 그리는 셈이다
 *   · 그린 장은 디스크에 안 남긴다. PNG 를 ffmpeg 에 바로 흘려 넣는다
 *   · 뽑기 전에 작은 화면으로 이음매부터 본다. 튀면 안 뽑는다
 *
 * 한 편마다 depth/out/<순번>.<YYMMDD>.<영문>.<한글>.<씨앗>/ 에
 *   영상 · 첫 장 사진(poster.jpg) · NOTES.md(되살리는 법) 가 남는다.
 * 영상은 저장소에 안 올린다(.gitignore). 코드와 씨앗만 있으면 언제든 다시 뽑는다.
 */
import { chromium } from "playwright-core";
import { spawn, execSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "depth", "out");

const PRESETS = {
  /* 목록용. 1080p · 대각선 두 점 초과 표본. 한 편 몇 분. */
  catalog: { w: 1920, h: 1080, aa: 2, fps: 30, crf: 16 },
  /* 납품용 4K. 네 점 초과 표본. 한 편에 한두 시간 걸린다(이 상자 기준). */
  "4k":    { w: 3840, h: 2160, aa: 3, fps: 30, crf: 14 },
  /* 띠 화면 32:9. 파사드 외벽 */
  band:    { w: 3840, h: 1080, aa: 2, fps: 30, crf: 16 },
  /* 확인용. 빨리 보고 버린다 */
  draft:   { w: 960,  h: 540,  aa: 1, fps: 30, crf: 22 }
};

function args() {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith("--")) continue;
    const k = a[i].slice(2), v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
    o[k] = v;
  }
  return o;
}

function ffmpegPath() {
  for (const c of [process.env.FFMPEG, "/root/bin/ffmpeg", "ffmpeg"]) {
    if (!c) continue;
    try { execSync(`"${c}" -hide_banner -encoders 2>/dev/null | grep -q libx264`); return c; } catch { /* 다음 */ }
  }
  try {
    return execSync(`python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"`).toString().trim();
  } catch { /* 없다 */ }
  throw new Error("libx264 가 든 ffmpeg 가 없다 — pip install imageio-ffmpeg");
}

/* 커밋 번호에 "작업본에 안 올린 수정이 있었다"는 표시를 같이 적는다.
   안 적으면 NOTES 의 번호로 되돌아가도 같은 영상이 안 나올 수 있다. */
function commitHash() {
  try {
    const h = execSync("git rev-parse --short HEAD", { cwd: root }).toString().trim();
    const dirty = execSync("git status --porcelain -- depth tools/render-depth.mjs", { cwd: root }).toString().trim();
    return dirty ? h + " + 커밋 전 수정" : h;
  } catch { return "?"; }
}

function nextNumber() {
  if (!existsSync(OUT)) return 1;
  let n = 0;
  for (const d of readdirSync(OUT)) { const m = /^(\d{3})\./.exec(d); if (m) n = Math.max(n, +m[1]); }
  return n + 1;
}

function ymd() {
  const d = new Date();
  const k = new Date(d.getTime() + 9 * 3600e3);            /* 한국 날짜로 적는다 */
  return String(k.getUTCFullYear()).slice(2) + String(k.getUTCMonth() + 1).padStart(2, "0") + String(k.getUTCDate()).padStart(2, "0");
}

/* 파일을 그대로 내주는 작은 서버. file:// 로 열면 스크립트가 막힌다. */
function serve() {
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
  const server = createServer((req, res) => {
    const p = join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""));
    if (!p.startsWith(root) || !existsSync(p)) { res.statusCode = 404; return res.end(); }
    res.setHeader("content-type", MIME[p.slice(p.lastIndexOf("."))] || "application/octet-stream");
    res.end(readFileSync(p));
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

async function openScene(browser, port, job, pr) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const q = new URLSearchParams({ capture: 1, scene: job.scene, seed: job.seed, pal: job.pal,
    w: pr.w, h: pr.h, aa: pr.aa, fps: pr.fps, dur: 5 });
  await page.goto(`http://127.0.0.1:${port}/depth/index.html?${q}`);
  await page.waitForFunction("window.__READY__===true || !!window.__ERROR__", null, { timeout: 120000 });
  const err = await page.evaluate(() => window.__ERROR__ || null);
  if (err) throw new Error(err);
  return page;
}

/* 이음매. 149→0 의 변화가 148→149 의 변화와 비슷한가. 훨씬 크면 튄다.
   작은 화면으로 네 장만 그려 본다 — 몇 초면 된다. */
async function seamCheck(browser, port, job) {
  const page = await openScene(browser, port, job, { w: 320, h: 180, aa: 1, fps: 30 });
  const r = await page.evaluate(() => {
    const c = document.getElementById("c");
    const g = c.getContext("webgl2");
    const px = n => { window.renderFrame(n); const a = new Uint8Array(320 * 180 * 4); g.readPixels(0, 0, 320, 180, g.RGBA, g.UNSIGNED_BYTE, a); return a; };
    const f147 = px(147), f148 = px(148), f149 = px(149), f0 = px(150);
    const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4 * 3); };
    return { seam: diff(f149, f0), normal: (diff(f147, f148) + diff(f148, f149)) / 2 };
  });
  await page.close();
  /* 필름 알갱이가 장마다 바뀌어 "보통"이 0 이 되지는 않는다. 알갱이 몫(약 1)을 빼고 견준다. */
  r.ratio = (r.seam + .5) / (r.normal + .5);
  r.ok = r.ratio < 2.2;
  return r;
}

async function renderJob(browser, port, job, pr, ff) {
  const sc = await (async () => {
    const pg = await openScene(browser, port, job, { w: 64, h: 36, aa: 1, fps: pr.fps });
    const meta = await pg.evaluate(id => { const s = window.DepthScenes[id]; return { en: s.en, ko: s.ko, desc: s.desc, pals: s.pals.map(p => p.name) }; }, job.scene);
    const d = await pg.evaluate(() => window.__DEPTH__);
    await pg.close();
    return { ...meta, palette: d.palette };
  })();

  const seam = await seamCheck(browser, port, job);
  if (!seam.ok) {
    console.log(`  건너뜀  ${job.scene} ${job.seed} — 이음매가 튄다 (${seam.ratio.toFixed(2)}배)`);
    return { skipped: true, seam };
  }

  const num = String(nextNumber()).padStart(3, "0");
  const dir = join(OUT, `${num}.${ymd()}.${sc.en}.${sc.ko}.${job.seed}`);
  mkdirSync(dir, { recursive: true });
  const tag = `${sc.en}_${pr.h >= 2160 ? "4k" : pr.w / pr.h > 2.5 ? "band" : pr.h + "p"}${pr.fps}`;
  const loopFile = join(dir, `${tag}_loop5s.mp4`);

  const total = pr.fps * 5;
  const page = await openScene(browser, port, job, pr);

  /* PNG 를 그대로 ffmpeg 에 흘린다. 색 공간을 bt709 로 박아 두어야
     재생기마다 색이 달라 보이지 않는다. */
  const enc = spawn(ff, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(pr.fps), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", String(pr.crf),
    "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-movflags", "+faststart", loopFile
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => enc.on("close", c => c === 0 ? res() : rej(new Error("ffmpeg " + c))));

  const t0 = Date.now();
  let poster = null;
  for (let n = 0; n < total; n++) {
    const url = await page.evaluate(i => { window.renderFrame(i); return document.getElementById("c").toDataURL("image/png"); }, n);
    const buf = Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
    if (n === 0) poster = buf;
    if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once("drain", r));
    if (n % 15 === 0 || n === total - 1) {
      const el = (Date.now() - t0) / 1000, per = el / (n + 1);
      process.stdout.write(`\r  ${num} ${sc.ko}·${sc.palette}  ${n + 1}/${total}  ${per.toFixed(1)}초/장  남은 ${Math.round(per * (total - n - 1))}초   `);
    }
  }
  enc.stdin.end();
  await done;
  await page.close();
  const secs = Math.round((Date.now() - t0) / 1000);
  process.stdout.write("\n");

  /* 첫 장 사진. 목록·홈페이지에 붙일 때 쓴다. */
  execSync(`"${ff}" -y -hide_banner -loglevel error -f png_pipe -i - -q:v 3 "${join(dir, "poster.jpg")}"`, { input: poster });

  /* 긴 판. 5초를 이어 붙인다 — 다시 그리지 않는다. 다시 부호화하지도 않는다. */
  const extra = [];
  for (const L of job.len || []) {
    const f = join(dir, `${tag}_${L}s.mp4`);
    execSync(`"${ff}" -y -hide_banner -loglevel error -stream_loop ${Math.ceil(L / 5) - 1} -i "${loopFile}" -c copy -t ${L} -movflags +faststart "${f}"`);
    extra.push(f.slice(dir.length + 1));
  }

  const size = (statSync(loopFile).size / 1048576).toFixed(1);
  const cmd = `node tools/render-depth.mjs --scene ${job.scene} --seed ${job.seed} --pal ${job.pal} --preset ${job.preset}` +
              (job.len && job.len.length ? ` --len ${job.len.join(",")}` : "");
  writeFileSync(join(dir, "NOTES.md"), [
    `# ${sc.ko} · ${sc.en}`,
    "",
    sc.desc,
    "",
    "| | |",
    "|---|---|",
    `| 장면 | \`${job.scene}\` |`,
    `| 씨앗 | \`${job.seed}\` |`,
    `| 색판 | ${sc.palette} (\`--pal ${job.pal}\`) |`,
    `| 규격 | ${pr.w}×${pr.h} · ${pr.fps}fps · 5초 완전 루프 |`,
    `| 초과 표본 | aa ${pr.aa} |`,
    `| 부호화 | H.264 · crf ${pr.crf} · yuv420p · bt709 |`,
    `| 이음매 | 149→0 이 보통 장 사이의 ${seam.ratio.toFixed(2)}배 (2.2 아래면 통과) |`,
    `| 렌더 | ${secs}초 · ${size}MB |`,
    `| 코드 | \`${commitHash()}\` |`,
    `| 뽑은 날 | ${new Date().toISOString()} |`,
    "",
    "## 다시 뽑기",
    "",
    "```",
    cmd,
    "```",
    "",
    "같은 코드·같은 씨앗이면 같은 영상이 나온다. 모델 파일도 텍스처 이미지도 없이",
    "전부 코드로 그렸다(depth/scenes/" + job.scene + ".js).",
    ""
  ].join("\n"));

  console.log(`  완료  ${dir.slice(root.length + 1)}  (${secs}초 · ${size}MB${extra.length ? " · " + extra.join(", ") : ""})`);
  return { dir, secs, seam };
}

const A = args();
const ff = ffmpegPath();
let jobs = [];
if (A.batch) {
  const b = JSON.parse(readFileSync(join(root, A.batch), "utf8"));
  jobs = b.jobs.map(j => ({ preset: b.preset || "catalog", len: b.len || [], ...j }));
} else {
  jobs = [{ scene: A.scene || "chrome", seed: +A.seed || 4821937, pal: A.pal != null ? +A.pal : 0,
            preset: A.preset || "catalog", len: A.len ? String(A.len).split(",").map(Number) : [] }];
}
if (A.only) jobs = jobs.filter(j => String(A.only).split(",").includes(j.scene));

const server = await serve();
const port = server.address().port;
/* 이 상자처럼 playwright 가 제 브라우저를 못 받은 곳에서는 깔려 있는 크로미움을 쓴다. */
const CHROME = process.env.CHROMIUM_PATH ||
  (existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome") ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : null);
const browser = await chromium.launch({
  ...(CHROME ? { executablePath: CHROME } : {}),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"]
});

console.log(`깊이 렌더 · ${jobs.length}편 · ffmpeg ${ff}`);
const results = [];
for (const job of jobs) {
  const pr = PRESETS[job.preset];
  if (!pr) { console.log("  모르는 규격:", job.preset); continue; }
  try { results.push(await renderJob(browser, port, job, pr, ff)); }
  catch (e) { console.log(`\n  실패  ${job.scene} ${job.seed}: ${String(e.message || e).slice(0, 300)}`); results.push({ failed: true }); }
}
await browser.close();
server.close();
const ok = results.filter(r => r.dir).length;
console.log(`끝 · ${ok}/${jobs.length}편${results.some(r => r.skipped) ? " · 이음매로 건너뛴 것 있음" : ""}`);
process.exit(ok === jobs.length ? 0 : 1);
