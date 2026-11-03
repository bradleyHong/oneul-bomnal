// 실시간으로 도는 작품 페이지를 영상으로 녹화한다 (코드를 웹에 두지 않으려고).
//   node tools/record-page.mjs "<url>" <출력.mp4> <초> [fps=30] [가로=1280] [세로=720]
// 페이지의 시계(performance.now · Date · requestAnimationFrame)를 가짜 시계로 바꿔
// 한 장씩 정확히 1/fps 초 나아가게 한 뒤 화면을 찍는다. 느린 컴퓨터에서도 끊김 없는 영상이 나온다.
// 시작 시각은 START(ISO, 기본 2026-11-02T10:10:00+09:00) — 시계 작품용.
// 로컬 서버(4737)가 떠 있어야 한다. GPU 렌더 큐와 같이 돌리지 않는다.
import { spawn } from "node:child_process";
const [url, out, secArg, fpsArg, wArg, hArg] = process.argv.slice(2);
const SEC = +secArg, FPS = +(fpsArg || 30), W = +(wArg || 1280), H = +(hArg || 720);
const N = Math.round(SEC * FPS);
const START = Date.parse(process.env.START || "2026-11-02T10:10:00+09:00");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cport = 9334 + Math.floor(Math.random() * 500);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless=new", `--remote-debugging-port=${cport}`, "--hide-scrollbars", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist",
   "--force-color-profile=srgb", `--user-data-dir=${process.env.TMPDIR || "/tmp"}/cdp-rec-${cport}`, "about:blank"], { stdio: "ignore" });
let ws;
for (let i = 0; i < 60; i++) { try { const j = await (await fetch(`http://127.0.0.1:${cport}/json`)).json(); const p = j.find((t) => t.type === "page"); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(200); }
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
  if (d.method === "Runtime.exceptionThrown") console.log("LOG", JSON.stringify(d.params).slice(0, 400)); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const d = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }); return d.result.result.value; };

await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
// 가짜 시계: rAF 콜백은 모아 두었다가 __step 때만 부른다
await send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
  let t = 0; const T0 = ${START};
  const RD = Date;
  function FD(...a){ return a.length ? new RD(...a) : new RD(T0 + t); }
  FD.now = () => T0 + t; FD.parse = RD.parse; FD.UTC = RD.UTC; FD.prototype = RD.prototype;
  window.Date = FD;
  performance.now = () => t;
  let q = [], qid = 0;
  window.requestAnimationFrame = (cb) => { q.push([++qid, cb]); return qid; };
  window.cancelAnimationFrame = (k) => { q = q.filter((e) => e[0] !== k); };
  window.__step = (dt) => { t += dt; const run = q; q = []; for (const [, cb] of run) { try { cb(t); } catch (e) { console.error(e); } } };
  window.__ready = () => document.readyState === 'complete';
})();` });
await send("Page.enable");
await send("Page.navigate", { url });
for (let i = 0; i < 100; i++) { await sleep(150); if (await ev("window.__ready && window.__ready()")) break; }
await sleep(800);
// 처음 몇 장은 버린다 (작품이 자리 잡는 시간)
for (let i = 0; i < 10; i++) await ev(`window.__step(${1000 / FPS})`);
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", process.env.CRF || "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out],
  { stdio: ["pipe", "inherit", "inherit"] });
for (let n = 0; n < N; n++) {
  await ev(`window.__step(${1000 / FPS})`);
  const s = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  const buf = Buffer.from(s.result.data, "base64");
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (n % 60 === 59) console.log(`frame ${n + 1}/${N}`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
ws.close(); chrome.kill();
console.log("done", out);
process.exit(0);
