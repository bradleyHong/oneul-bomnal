// WebGL2 작품을 PNG 없이 바로 영상으로 뽑는다.
//   node tools/render-gl-video.mjs "<url>?capture=1" <출력.mp4> [프레임수=450] [fps=30]
// 작품 HTML 은 renderFrame(n) 과 window.__READY__ 를 둔다 (capture-frames.mjs 와 같은 약속).
// 페이지가 프레임마다 readPixels 한 원시 RGBA 를 이 스크립트의 작은 HTTP 받개로 보내고,
// 받개는 그대로 ffmpeg 표준입력에 넣는다 (위아래 뒤집기 포함). 4K 도 CDP 로 나눠 받지 않아 빠르다.
// 로컬 서버(4737)가 떠 있어야 한다. 환경변수 GPU=0 이면 소프트웨어 GL.
// 크롬 156 부터 로컬 주소로 보내는 요청을 막아 첫 장에서 멈춘다 → Local Network Access 검사를 끈다.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
const [url, out, nArg, fpsArg] = process.argv.slice(2);
const N = +(nArg || 450), FPS = +(fpsArg || 30);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cport = 9334 + Math.floor(Math.random() * 500);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless=new", `--remote-debugging-port=${cport}`, "--hide-scrollbars",
   ...(process.env.GPU === "0" ? [] : ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]),
   "--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests",
   "--force-color-profile=srgb", `--user-data-dir=${process.env.TMPDIR || "/tmp"}/cdp-vid-${cport}`, "about:blank"], { stdio: "ignore" });

let ff = null, size = null, got = 0, t0 = Date.now();
const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") { res.end(); return; }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const buf = Buffer.concat(chunks);
    const ok = ff.stdin.write(buf);
    const done = () => { got++; res.end("ok"); };
    ok ? done() : ff.stdin.once("drain", done);
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const sport = server.address().port;

let ws;
for (let i = 0; i < 60; i++) { try { const j = await (await fetch(`http://127.0.0.1:${cport}/json`)).json(); const p = j.find((t) => t.type === "page"); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(200); }
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
  if (d.method === "Runtime.exceptionThrown" || d.method === "Runtime.consoleAPICalled") console.log("LOG", JSON.stringify(d.params).slice(0, 600)); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const d = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }); if (d.result.exceptionDetails) throw new Error(JSON.stringify(d.result.exceptionDetails).slice(0, 800)); return d.result.result.value; };
await send("Runtime.enable");
await send("Page.navigate", { url });
for (let i = 0; i < 200; i++) { await sleep(150); try { if (await ev("window.__READY__ === true")) break; } catch {} }
size = await ev("(()=>{const c=document.getElementById('c');return [c.width,c.height]})()");
console.log("size", size.join("x"), "frames", N, "→", out);
ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${size[0]}x${size[1]}`, "-r", String(FPS), "-i", "-",
  "-vf", "vflip", "-c:v", "libx264", "-preset", "slow", "-crf", process.env.CRF || "14", "-tune", "grain", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out],
  { stdio: ["pipe", "inherit", "inherit"] });
await ev(`window.__post = async (n) => { renderFrame(n); const c=document.getElementById('c'); const gl=c.getContext('webgl2');
  const a=new Uint8Array(c.width*c.height*4); gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,a);
  const r = await fetch('http://127.0.0.1:${sport}/f', { method:'POST', body:a }); return r.status; }`);
for (let n = 0; n < N; n++) {
  await ev(`window.__post(${n})`);
  if (n % 30 === 29 || n === N - 1) console.log(`frame ${n + 1}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
ws.close(); chrome.kill(); server.close();
console.log("done", out, got, "frames");
process.exit(0);
