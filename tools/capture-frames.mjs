// 작품 HTML 의 renderFrame(n) 을 프레임 번호대로 불러 캔버스 #c 를 파일로 뽑는다.
//   node tools/capture-frames.mjs "<url>?capture=1&qual=1920" <출력접두> 0,1,2,...
//   2D 캔버스 → PNG, WebGL2 캔버스 → .WxH.rgba (python3 tools/rgba2png.py 로 PNG)
// Playwright 없이 크롬 원격 디버깅(CDP)만 쓴다. 로컬 서버(4737)가 떠 있어야 한다.
// 큰 그림은 CDP 한 메시지에 안 실려 멈춘다 → 50만 글자씩 나눠 받는다.
// 환경변수: TO=제한시간(ms), GPU=1 이면 Metal 가속 시도.
setTimeout(() => { console.log("TIMEOUT"); process.exit(2); }, +(process.env.TO || 240000));
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const [url, out, list] = process.argv.slice(2);
const port = 9334 + Math.floor(Math.random() * 500);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless=new", `--remote-debugging-port=${port}`, "--hide-scrollbars", ...(process.env.GPU ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] : []),
   "--force-color-profile=srgb", `--user-data-dir=${process.env.TMPDIR || "/tmp"}/cdp-fr-${port}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 60; i++) { try { const j = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = j.find((t) => t.type === "page"); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(200); }
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const d = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }); if (d.result.exceptionDetails) throw new Error(JSON.stringify(d.result.exceptionDetails).slice(0, 800)); return d.result.result.value; };
await send("Runtime.enable");
const logs = [];
ws.addEventListener("message", (m) => { const d = JSON.parse(m.data); if (d.method === "Runtime.exceptionThrown") logs.push(JSON.stringify(d.params.exceptionDetails).slice(0, 600)); if (d.method === "Runtime.consoleAPICalled") logs.push(d.params.args.map(a => a.value).join(" ")); });
await send("Page.navigate", { url });
for (let i = 0; i < 100; i++) { await sleep(150); try { if (await ev("window.__READY__ === true")) break; } catch {} }
if (logs.length) console.log("LOG", logs.join("\n"));
console.log("gl:", await ev("(()=>{const c=document.getElementById('c');return c.width+'x'+c.height})()"));
for (const f of list.split(",").map(Number)) {
  const t0 = Date.now();
  const ms = await ev(`(()=>{ const t=performance.now(); renderFrame(${f}); return performance.now()-t; })()`);
  console.log("render ms", Math.round(ms));
  const isGL = await ev(`!!document.getElementById('c').getContext('webgl2')`);
  if (isGL) {
    const b64 = await ev(`(()=>{const c=document.getElementById('c');const gl=c.getContext('webgl2');const w=c.width,h=c.height;const a=new Uint8Array(w*h*4);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,a);let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));window.__buf=w+'x'+h+':'+btoa(s);return window.__buf.length;})()`).then(async (len) => { let r=''; for (let o=0;o<len;o+=500000) r += await ev(`window.__buf.slice(${o},${o+500000})`); return r; });
    const [dim, raw] = [b64.slice(0, b64.indexOf(":")), b64.slice(b64.indexOf(":") + 1)];
    writeFileSync(`${out}-${String(f).padStart(5, "0")}.${dim}.rgba`, Buffer.from(raw, "base64"));
  } else {
    const len = await ev(`new Promise(r=>document.getElementById('c').toBlob(b=>{const fr=new FileReader();fr.onload=()=>{window.__buf=fr.result;r(fr.result.length)};fr.readAsDataURL(b)},'image/png'))`);
    let data=''; for (let o=0;o<len;o+=500000) data += await ev(`window.__buf.slice(${o},${o+500000})`);
    writeFileSync(`${out}-${String(f).padStart(5, "0")}.png`, Buffer.from(data.split(",")[1], "base64"));
  }
  console.log("frame", f, Date.now() - t0, "ms");
}
ws.close(); chrome.kill();
process.exit(0);
