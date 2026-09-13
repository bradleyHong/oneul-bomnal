#!/usr/bin/env node
/**
 * 목업 앞가림 층을 굽는다.
 *
 * 사진 속 화면 자리(quad)는 사각형이다. 그런데 그 앞에 사람이 서 있으면
 * 사각형이 사람을 덮는다 — 두 면 기둥 판에서 아이 머리가 통째로 지워졌다.
 * 서 있는 사람 앞으로 화면이 나올 수는 없다.
 *
 * 그래서 quad 안쪽에서 "꺼진 화면(거의 검정)이 아닌 화소"만 떼어
 * 투명 PNG 로 굽는다. 웹에서는 이 층을 작품 캔버스 위에 얹는다.
 * 사람은 화면 앞으로 돌아오고, 화면은 사람 뒤에 남는다.
 *
 * 원본 크로마 사진은 이 저장소에 없다(build-mockups.py 가 쓰던 것).
 * 그래서 이미 구워 둔 webp 에서 다시 떼어 낸다. 화면 자리는 그때
 * 꺼진 화면처럼 어둡게 칠해 두었으므로 밝기만으로 갈라진다.
 *
 *   node tools/build-mockup-front.mjs            (127.0.0.1:877 에 서버가 떠 있어야 한다)
 *   node tools/build-mockup-front.mjs --port 8080
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const PORT = argv.includes("--port") ? argv[argv.indexOf("--port") + 1] : "877";

/* 화면 색과 이만큼 떨어지면 화면이 아니다(0~255 의 RGB 거리).
   처음에는 "밝기 22 를 넘으면 사람"으로 갈랐다. 그래서 아이 머리는
   떼어졌는데 검은 청바지와 그림자는 꺼진 화면보다 밝지 않아 그대로
   남았고, 작품이 그 위를 덮어 아이 몸이 허리에서 잘렸다. 실제로
   그 화면을 받았다.

   밝기가 아니라 색으로 가른다. 꺼진 화면은 거의 한 가지 색이라
   그 색에서 얼마나 떨어졌는지로 재면 어두운 옷도 잡힌다. */
const DIST = 13;
/* 이만 못 되는 덩어리는 사람이 아니다 — 화면 테두리의 밝은 실선이나
   압축 잡티다. 덩어리로 세어 걸러 낸다. */
const MIN_AREA = 150;
/* 떼어낸 덩어리를 조금 부풀린다. 머리 둘레의 어두운 화소까지 데려와야
   작품이 머리카락 사이로 비쳐 얼룩이 되지 않는다. */
const GROW = 2;
/* 가장자리 한두 화소만 부드럽게. 더 흐리면 사람이 유령처럼 뜬다. */
const FEATHER = 1.5;

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = await import("playwright-core")); }

const plates = JSON.parse(readFileSync(join(root, "assets/mockup/plates.json"), "utf8"));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--force-color-profile=srgb", "--no-sandbox"],
});
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${PORT}/`);

const made = [];
for (const pl of plates) {
  const out = await page.evaluate(async ({ pl, DIST, MIN_AREA, GROW, FEATHER }) => {
    const img = new Image();
    img.src = pl.image.replace("./", "/");
    await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const cx = cv.getContext("2d");
    cx.drawImage(img, 0, 0);
    const src = cx.getImageData(0, 0, W, H);
    const d = src.data;

    /* 화면 자리. 안으로 물리지 않는다 — 물리면 화면 아래에서 올라온
       사람(아이 머리)이 그 틈만큼 잘려 실금이 남는다. 테두리의 밝은
       실선은 아래에서 덩어리 크기로 걸러 낸다. */
    const polys = pl.surfaces.map((s) => {
      const q = s.quad.map(([x, y]) => [x * W, y * H]);
      return [q[0], q[1], q[3], q[2]];
    });
    const inside = (poly, x, y) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };

    /* ① 화면 자리와 화면 색.
       꺼진 화면은 거의 한 색이다. 자리 안쪽(가장자리에서 물러난 곳)의
       중앙값을 그 색으로 삼는다. 평균이 아니라 중앙값이다 — 사람이
       걸쳐 있으면 평균은 그쪽으로 끌려간다. */
    const inQuad = new Uint8Array(W * H);
    const bb = polys.map((p) => {
      const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
      return [Math.max(0, Math.floor(Math.min(...xs))), Math.min(W, Math.ceil(Math.max(...xs))),
              Math.max(0, Math.floor(Math.min(...ys))), Math.min(H, Math.ceil(Math.max(...ys)))];
    });
    for (let k = 0; k < polys.length; k++) {
      const [x0, x1, y0, y1] = bb[k];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        if (inside(polys[k], x + 0.5, y + 0.5)) inQuad[y * W + x] = 1;
      }
    }
    const sr = [], sg = [], sb = [];
    for (let n = 0; n < W * H; n++) {
      if (!inQuad[n]) continue;
      const i = n * 4;
      sr.push(d[i]); sg.push(d[i + 1]); sb.push(d[i + 2]);
    }
    const mid = (a) => { a.sort((x, y) => x - y); return a[a.length >> 1]; };
    const SC = [mid(sr), mid(sg), mid(sb)];

    /* ② 바깥에서 물을 붓는다.
       화면 자리 밖은 전부 "화면이 아닌 것"이다. 거기서 시작해, 화면
       색과 충분히 떨어진 화소만 밟으며 자리 안으로 흘러 들어간다.
       바닥에 서서 화면을 가린 사람은 발끝이 자리 밖에 있으므로 물이
       닿고, 몸 전체가 한 덩어리라 머리끝까지 젖는다. 화면 색에 가까운
       화소는 물을 막으므로 꺼진 화면은 마른 채로 남는다.

       밝기로 가르던 때와 다른 점이 이것이다 — 어두운 옷도 색이 다르면
       젖는다. 옷이 어둡다고 잘리지 않는다. */
    const notScreen = new Uint8Array(W * H);
    for (let n = 0; n < W * H; n++) {
      const i = n * 4;
      const dr = d[i] - SC[0], dg = d[i + 1] - SC[1], db = d[i + 2] - SC[2];
      if (Math.sqrt(dr * dr + dg * dg + db * db) > DIST) notScreen[n] = 1;
    }
    const wet = new Uint8Array(W * H);
    const stack = [];
    for (let n = 0; n < W * H; n++) {
      if (inQuad[n] || !notScreen[n] || wet[n]) continue;
      wet[n] = 1; stack.push(n);
    }
    while (stack.length) {
      const c = stack.pop();
      const cx0 = c % W, cy0 = (c / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx0 + dx, ny = cy0 + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const m = ny * W + nx;
        if (wet[m] || !notScreen[m]) continue;
        wet[m] = 1; stack.push(m);
      }
    }

    /* ③ 자리 안에서 젖은 것만 남긴다. 자잘한 것은 사람이 아니다. */
    const seed = new Uint8Array(W * H);
    for (let n = 0; n < W * H; n++) if (inQuad[n] && wet[n]) seed[n] = 1;

    const lab = new Int32Array(W * H).fill(-1);
    const keep = new Uint8Array(W * H);
    for (let n = 0; n < W * H; n++) {
      if (!seed[n] || lab[n] >= 0) continue;
      const cells = [];
      stack.length = 0; stack.push(n); lab[n] = n;
      while (stack.length) {
        const c = stack.pop();
        cells.push(c);
        const cx0 = c % W, cy0 = (c / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx0 + dx, ny = cy0 + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const m = ny * W + nx;
          if (seed[m] && lab[m] < 0) { lab[m] = n; stack.push(m); }
        }
      }
      if (cells.length >= MIN_AREA) for (const c of cells) keep[c] = 1;
    }

    /* ③ 구멍을 메우고 조금 부풀린다. 화면 자리 밖으로는 안 나간다 —
       거기는 원래 사진이 이미 보이고 있다. */
    let mask = keep;
    for (let g = 0; g < GROW + 2; g++) {
      const out = new Uint8Array(W * H);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const n = y * W + x;
        if (mask[n] || mask[n - 1] || mask[n + 1] || mask[n - W] || mask[n + W]) out[n] = 1;
      }
      mask = out;
    }
    /* 부풀릴 때 화면 자리 안으로 가둬 두었더니, 자리의 아래 모서리가
       사람을 가로지르는 곳에서 실오라기만 한 띠가 남았다 — 아이 어깨에
       분홍 줄이 그어졌다. 자리 밖으로 삐져나온 화소는 원래 사진을 그
       자리에 다시 얹는 것이라 보이지 않는다. 가두지 않는다. */
    for (let e = 0; e < 2; e++) {                 /* 부풀린 만큼 다시 깎아 모양을 지킨다 */
      const out = new Uint8Array(W * H);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const n = y * W + x;
        if (mask[n] && mask[n - 1] && mask[n + 1] && mask[n - W] && mask[n + W]) out[n] = 1;
      }
      mask = out;
    }

    /* ④ 가장자리만 부드럽게. 안쪽은 통째로 불투명하다 —
       반투명하게 두면 뒤 작품이 비쳐 사람이 얼룩이 된다. */
    const dst = cx.createImageData(W, H);
    const o = dst.data;
    let kept = 0;
    const R = Math.ceil(FEATHER);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = y * W + x;
      if (!mask[n]) continue;
      let edge = 0;
      for (let dy = -R; dy <= R && !edge; dy++) for (let dx = -R; dx <= R; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || !mask[ny * W + nx]) { edge = 1; break; }
      }
      const i = n * 4;
      o[i] = d[i]; o[i + 1] = d[i + 1]; o[i + 2] = d[i + 2];
      o[i + 3] = edge ? 170 : 255;
      kept++;
    }
    cx.putImageData(dst, 0, 0);
    return { url: cv.toDataURL("image/png"), W, H, kept };
  }, { pl, DIST, MIN_AREA, GROW, FEATHER });

  const name = `assets/mockup/${pl.id}-front.png`;
  const buf = Buffer.from(out.url.split(",")[1], "base64");
  writeFileSync(join(root, name), buf);
  made.push({ 판: pl.id, 크기: out.W + "×" + out.H, 떼어낸화소: out.kept,
              파일: Math.round(buf.length / 1024) + "KB" });
}
await browser.close();
console.table(made);
console.log("plates.json 의 front 는 손으로 적는다. 없는 판은 앞가림이 없다는 뜻이다.");
