#!/usr/bin/env node
/**
 * CC0 3D 모델을 받아 우리 엔진이 쓸 뼈대만 남긴다.
 *
 * 남의 원본 파일을 화면에 그대로 늘어놓지 않는다. 꼭짓점과 모서리만
 * 남기고 재질·텍스처·색은 버린다. 화면에 나가는 것은 우리 코드가 그 좌표로
 * 다시 그린 선과 점이다. 그래야 "코드로 그린다"는 말이 그대로 유지된다.
 *
 * CC0 만 받는다. 파는 물건에 들어가므로 표시 의무가 붙는 CC-BY 는
 * 쓰지 않는다. 받은 것의 출처와 라이선스는 assets/mesh/LICENSE.md 에
 * 남긴다.
 *
 *   node tools/fetch-mesh.mjs DragonAttenuation 용
 *   node tools/fetch-mesh.mjs --list
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "assets/mesh");
const BASE = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models";

/* 뼈대는 스튜디오 페이지에 통째로 실린다. 촘촘하게 담으면 파일이
   커져서, 그림 하나 보기 전에 내려받기부터 오래 걸린다. 미리보기
   크기에서는 이 정도면 형태가 다 읽힌다. 4K 에서는 성기게 보이는데
   그쪽이 오히려 우리 결에 맞는다(여백을 남긴다). */
const MAX_VERTS = 560;
const MAX_TRIS = 820;

/* 좌표는 0~2047 정수로 담는다. -0.123 같은 소수보다 글자가 짧고
   압축도 잘 먹는다. 엔진이 QUANT 로 나눠 다시 -0.5~0.5 로 편다.
   2048칸이면 4K 에서 한 칸이 1픽셀 아래다. */
const QUANT = 2048;

/** GLB 를 뜯는다. 헤더 12바이트 뒤에 덩어리가 이어진다. */
function parseGLB(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("glTF 파일이 아닙니다");
  let off = 12, json = null, bin = null;
  while (off < buf.byteLength) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(data));
    else if (type === 0x004e4942) bin = data;
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  return { json, bin };
}

const COMP = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2],
               5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function readAccessor(g, bin, i) {
  const a = g.accessors[i];
  const bv = g.bufferViews[a.bufferView];
  const [Arr, sz] = COMP[a.componentType];
  const n = NUM[a.type];
  const start = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const stride = bv.byteStride || 0;
  const out = new Arr(a.count * n);
  if (!stride || stride === sz * n) {
    const src = new Arr(bin.buffer, bin.byteOffset + start, a.count * n);
    out.set(src);
  } else {
    /* 사이가 벌어진 배열. 한 칸씩 건너뛰며 읽는다. */
    for (let e = 0; e < a.count; e++) {
      const src = new Arr(bin.buffer, bin.byteOffset + start + e * stride, n);
      out.set(src, e * n);
    }
  }
  return out;
}

async function grab(name, korean) {
  process.stdout.write(`  ${name} 내려받는 중… `);
  /* .glb 한 장으로 나온 것이 대부분이지만, 그렇게 안 낸 모델도 있다
     (원숭이 두상·헬멧). 그때는 .gltf 와 옆에 붙은 .bin 을 따로 받는다. */
  let g = null, bin = null;
  const glb = await fetch(`${BASE}/${name}/glTF-Binary/${name}.glb`);
  if (glb.ok) {
    ({ json: g, bin } = parseGLB(Buffer.from(await glb.arrayBuffer())));
  } else {
    const dir = `${BASE}/${name}/glTF`;
    const res = await fetch(`${dir}/${name}.gltf`);
    if (!res.ok) throw new Error(`받지 못했습니다 (glb ${glb.status} · gltf ${res.status})`);
    g = await res.json();
    const uri = (g.buffers || [])[0] && g.buffers[0].uri;
    if (!uri) throw new Error("좌표 파일 주소가 없습니다");
    if (uri.startsWith("data:")) {
      bin = Buffer.from(uri.slice(uri.indexOf(",") + 1), "base64");
    } else {
      const br = await fetch(`${dir}/${encodeURIComponent(uri)}`);
      if (!br.ok) throw new Error(`좌표 파일을 받지 못했습니다 (${br.status})`);
      bin = Buffer.from(await br.arrayBuffer());
    }
  }
  if (!bin) throw new Error("이 파일에는 좌표 덩어리가 없습니다");

  /* 조각(primitive)마다 따로 모은다. 배경 판때기를 골라내야 하기 때문이다.
     용(DragonAttenuation)에는 뒤에 커다란 유리판이 하나 붙어 있는데,
     그걸 같이 넣고 상자에 맞추면 용이 콩알만 해진다. 실제로 그렇게
     나왔다. 꼭짓점은 몇 개 안 되면서 화면만 넓게 차지하는 조각은 뺀다. */
  const parts = [];
  for (const m of g.meshes || []) {
    for (const p of m.primitives || []) {
      if (p.mode !== undefined && p.mode !== 4) continue;   /* 삼각형만 */
      if (p.attributes.POSITION === undefined) continue;
      const P = readAccessor(g, bin, p.attributes.POSITION);
      const idx = p.indices !== undefined ? readAccessor(g, bin, p.indices) : null;
      let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (let i = 0; i < P.length; i += 3)
        for (let a = 0; a < 3; a++) { const v = P[i + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; }
      const diag = Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
      parts.push({ P, idx, n: P.length / 3, diag });
    }
  }
  if (!parts.length) throw new Error("삼각형을 찾지 못했습니다");
  const bigDiag = Math.max(...parts.map((p) => p.diag));
  const keep = parts.filter((p) => !(p.n <= 64 && p.diag >= bigDiag * 0.7));
  const use = keep.length ? keep : parts;
  if (use.length !== parts.length) {
    process.stdout.write(`배경 ${parts.length - use.length}조각 뺌 · `);
  }

  let pos = [], tri = [];
  for (const p of use) {
    const base = pos.length / 3;
    for (let i = 0; i < p.P.length; i++) pos.push(p.P[i]);
    if (p.idx) {
      for (let i = 0; i + 2 < p.idx.length; i += 3) tri.push(base + p.idx[i], base + p.idx[i + 1], base + p.idx[i + 2]);
    } else {
      for (let i = 0; i + 2 < p.n; i += 3) tri.push(base + i, base + i + 1, base + i + 2);
    }
  }

  /* 단위 상자에 맞춰 가운데로 옮긴다. 그래야 어떤 모델이든 같은 크기로 돈다. */
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < pos.length; i += 3)
    for (let a = 0; a < 3; a++) { const v = pos[i + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; }
  const c = [0, 1, 2].map((a) => (mn[a] + mx[a]) / 2);
  const scale = 1 / Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2], 1e-6);

  const nv = pos.length / 3;
  const nrm = new Float64Array(nv * 3);
  for (let i = 0; i < nv; i++)
    for (let a = 0; a < 3; a++) nrm[i * 3 + a] = (pos[i * 3 + a] - c[a]) * scale;   /* -0.5 ~ 0.5 */

  /* 꼭짓점 솎기 — 격자로 뭉친다.
     번호 순으로 건너뛰며 솎았더니 형태가 무너졌다. glTF 는 꼭짓점을
     부품 순서로 담기 때문에, 앞에서부터 900개만 남기면 한 부품만
     남는다(장난감차가 판때기로 나왔던 이유다). 가까운 것끼리 한 점으로
     모으면 어디를 지워도 형태가 남는다. */
  function cluster(G) {
    const cell = new Map();
    const of = new Int32Array(nv);
    for (let i = 0; i < nv; i++) {
      const kx = Math.min(G - 1, Math.floor((nrm[i * 3] + 0.5) * G));
      const ky = Math.min(G - 1, Math.floor((nrm[i * 3 + 1] + 0.5) * G));
      const kz = Math.min(G - 1, Math.floor((nrm[i * 3 + 2] + 0.5) * G));
      const key = (kx * G + ky) * G + kz;
      let id = cell.get(key);
      if (id === undefined) { id = cell.size; cell.set(key, id); }
      of[i] = id;
    }
    return { of, count: cell.size };
  }
  let lo = 4, hi = 220, best = cluster(lo);
  while (lo < hi) {                       /* 꼭짓점 상한에 가장 가까운 격자를 찾는다 */
    const mid = (lo + hi + 1) >> 1;
    const r = cluster(mid);
    if (r.count <= MAX_VERTS) { best = r; lo = mid; } else hi = mid - 1;
  }
  const map = best.of, nc = best.count;
  /* 뭉친 점의 자리는 속한 것들의 평균. 격자 한가운데로 몰면 각져 보인다. */
  const acc = new Float64Array(nc * 3), cnt = new Int32Array(nc);
  for (let i = 0; i < nv; i++) {
    const j = map[i]; cnt[j]++;
    for (let a = 0; a < 3; a++) acc[j * 3 + a] += nrm[i * 3 + a];
  }
  const V = [];
  for (let j = 0; j < nc; j++)
    for (let a = 0; a < 3; a++) {
      const v = acc[j * 3 + a] / Math.max(1, cnt[j]);            /* -0.5 ~ 0.5 */
      V.push(Math.max(0, Math.min(QUANT - 1, Math.round((v + 0.5) * QUANT))));
    }

  /* 삼각형을 그대로 담는다.
     모서리만 담았더니 빛을 칠 수가 없었다. 면이 없으면 법선이 없고,
     법선이 없으면 어느 쪽이 빛을 받는지 알 수 없다. 점을 아무리
     촘촘히 찍어도 점 구름으로만 보였다.
     모서리는 브라우저에서 삼각형으로부터 뽑아 쓴다. 둘 다 담으면
     파일만 커진다. */
  const seenT = new Set(), all = [];
  for (let i = 0; i + 2 < tri.length; i += 3) {
    const a = map[tri[i]], b = map[tri[i + 1]], c = map[tri[i + 2]];
    if (a === b || b === c || a === c) continue;          /* 뭉치면서 납작해진 것 */
    const k2 = [a, b, c].slice().sort((x, y) => x - y).join(",");
    if (seenT.has(k2)) continue;
    seenT.add(k2);
    all.push(a, b, c);
  }
  /* 상한을 넘으면 앞에서 자르지 않고 고르게 솎는다.
     앞에서 자르면 첫 부품만 남는다. */
  const nt = all.length / 3;
  const est = Math.max(1, Math.ceil(nt / MAX_TRIS));
  const T = [];
  for (let i = 0; i < nt; i += est) T.push(all[i * 3], all[i * 3 + 1], all[i * 3 + 2]);

  mkdirSync(OUT, { recursive: true });
  const out = { name: korean || name, source: name, quant: QUANT, verts: V, tris: T };
  writeFileSync(join(OUT, name + ".json"), JSON.stringify(out));
  console.log(`꼭짓점 ${V.length / 3} · 삼각형 ${T.length / 3}`);
  return { name, korean: korean || name, verts: V.length / 3, tris: T.length / 3 };
}

const args = process.argv.slice(2);
if (!args.length || args[0] === "--list") {
  console.log(`받아 둔 것: ${existsSync(OUT) ? readFileSync(join(OUT, "LICENSE.md"), "utf8").split("\n").filter((l) => l.startsWith("| ")).length - 1 : 0}개`);
  console.log(`\n쓰는 법:  node tools/fetch-mesh.mjs <모델이름> <한글이름>`);
  console.log(`CC0 인 것만 받는다. 목록은 glTF-Sample-Assets 의 Models.md 에서 확인할 것.`);
  process.exit(0);
}
const r = await grab(args[0], args[1]);
console.log(`\n${r.name} → assets/mesh/${r.name}.json`);
console.log(`assets/mesh/LICENSE.md 에 출처와 라이선스를 반드시 적을 것.`);
