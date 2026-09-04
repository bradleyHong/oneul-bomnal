/* 온 미디어아트 에디트 — 렌더 엔진
 *
 * 한 파일이 세 곳에서 쓰인다.
 *   1) works/studio-art.html  고객 미리보기(iframe)와 우리 4K 렌더
 *   2) studio.html            프리셋 갤러리의 작은 썸네일 수백 장
 *   3) tools/render-studio.mjs 납품본 프레임 추출
 *
 * 원래는 works/studio-art.html 안에 통째로 있었다. 갤러리에서 썸네일을
 * 그리려면 iframe 밖에서도 같은 코드를 불러야 해서 떼어냈다. 떼어내면서
 * 그림이 달라지지 않았는지는 40종의 렌더 해시를 전후로 비교해 확인했다.
 *
 * 결정론 규칙은 그대로다. Math.random·Date.now·performance.now를 쓰지 않는다.
 * 같은 파라미터 + 같은 시드 = 언제 어디서 돌려도 같은 그림.
 */
(function (global) {
"use strict";

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ── 시드 난수 (mulberry32). Math.random 금지 ───────────────── */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES = {
  ink:       { name: "수묵",            bg: "#050505", ink: "#f5f2ea", accent: "#8fa6c9", tones: ["#f5f2ea", "#c9c4b8", "#8a8madd".slice(0,7), "#4a4a4a"] },
  bomnal:    { name: "봄날",            bg: "#070b16", ink: "#e8eefc", accent: "#10367d", tones: ["#e8eefc", "#a9c4ff", "#2f6ad8", "#10367d"] },
  hokusai:   { name: "가나가와 파도",    bg: "#07131f", ink: "#eef2f0", accent: "#1b4c78", tones: ["#eef2f0", "#a9c6d6", "#1b4c78", "#0d2740"] },
  gogh:      { name: "별이 빛나는 밤",   bg: "#0a1430", ink: "#f2d98a", accent: "#2a5fa8", tones: ["#f2d98a", "#e8b64c", "#2a5fa8", "#12224d"] },
  klimt:     { name: "황금",            bg: "#0a0805", ink: "#e8c45a", accent: "#8a6a1f", tones: ["#f0d98a", "#c9a234", "#8a6a1f", "#3a2c10"] },
  munch:     { name: "절규의 하늘",      bg: "#1a0f14", ink: "#e8934a", accent: "#c4452c", tones: ["#f2c07a", "#e8934a", "#c4452c", "#3a4a6a"] },
  monet:     { name: "수련",            bg: "#0b1512", ink: "#dfe8d8", accent: "#5a8f7b", tones: ["#dfe8d8", "#a9c4a0", "#5a8f7b", "#7a6a9a"] },
  vermeer:   { name: "진주",            bg: "#0a0c14", ink: "#f0e6d2", accent: "#2a4a8f", tones: ["#f0e6d2", "#d8b46a", "#2a4a8f", "#14213d"] },
  hiroshige: { name: "명소백경",         bg: "#0d1020", ink: "#f2ece0", accent: "#b83c2c", tones: ["#f2ece0", "#b83c2c", "#2a4a7a", "#1a2a44"] },
  turner:    { name: "노을",            bg: "#140d0a", ink: "#f5e2c0", accent: "#d87a3c", tones: ["#f5e2c0", "#e8a95a", "#d87a3c", "#6a4a3a"] },
  mono:      { name: "흑백",            bg: "#000000", ink: "#ffffff", accent: "#9a9a9a", tones: ["#ffffff", "#c0c0c0", "#7a7a7a", "#3a3a3a"] },
  dancheong: { name: "단청",            bg: "#0d100e", ink: "#f0ede4", accent: "#1f7a6e", tones: ["#f0ede4", "#e0b23c", "#c8482f", "#1f7a6e"] },
  baekja:    { name: "백자",            bg: "#14120e", ink: "#f2ede3", accent: "#a89c88", tones: ["#f2ede3", "#d9d2c4", "#a89c88", "#6a6152"] },
  cheonghwa: { name: "청화백자",         bg: "#0b0f18", ink: "#f2ede3", accent: "#2b4a8c", tones: ["#f2ede3", "#7a9ccc", "#2b4a8c", "#16233f"] },
  seurat:    { name: "점묘",            bg: "#0e1210", ink: "#f0e4b8", accent: "#7aa8c4", tones: ["#f0e4b8", "#7aa8c4", "#c4805a", "#4a6a4a"] },
  kandinsky: { name: "구성",            bg: "#0f0e0c", ink: "#f2ece0", accent: "#c4452c", tones: ["#f2ece0", "#e8c34a", "#c4452c", "#2a5fa8"] },
  mondrian:  { name: "삼원색",           bg: "#0a0a0a", ink: "#f7f7f2", accent: "#d82c2c", tones: ["#f7f7f2", "#f2d22c", "#d82c2c", "#2c4ad8"] },
  schiele:   { name: "마른 흙",          bg: "#12100c", ink: "#e8dcc4", accent: "#b85c4a", tones: ["#e8dcc4", "#d8a05a", "#b85c4a", "#6a7a5a"] },
  neon:      { name: "네온",            bg: "#04060f", ink: "#e6faff", accent: "#00e5c0", tones: ["#e6faff", "#00e5c0", "#3d6bff", "#ff3d8a"] },
};
PALETTES.ink.tones[2] = "#8a8a8a";

/* 값잡음 격자는 시드마다 하나면 된다. 갤러리에서 썸네일 수백 장을 그릴 때
   매번 65,536칸을 새로 채우면 그것만으로 화면이 버벅인다. */
const NG = 256;
const NOISE_CACHE = new Map();
const fade = (x) => x * x * (3 - 2 * x);
function noiseTableFor(seed) {
  const hit = NOISE_CACHE.get(seed);
  if (hit) return hit;
  const r = mulberry32(seed ^ 0x9e3779b9);
  const t = new Float32Array(NG * NG);
  for (let i = 0; i < t.length; i++) t[i] = r();
  if (NOISE_CACHE.size > 48) NOISE_CACHE.delete(NOISE_CACHE.keys().next().value);
  NOISE_CACHE.set(seed, t);
  return t;
}

const DEFAULTS = {
  w: 1280, h: 720, fps: 30, seed: 4821937, dur: 20,
  style: "aurora", palette: "ink",
  density: 50, speed: 50, scale: 50, contrast: 50, glow: 35, grain: 18,
  motion: "drift", symmetry: 1, invert: false, accent: 60,
};

/** 캔버스 하나에 그림 한 벌을 만든다. 반환값의 renderFrame(n)만 부르면 된다. */
function create(canvas, opts) {
  const P = Object.assign({}, DEFAULTS, opts || {});
  const W = P.w, H = P.h, FPS = P.fps, DUR = P.dur;
  const SEED = Math.floor(P.seed);
  const TOTAL_FRAMES = Math.max(1, Math.round(FPS * DUR));

  const noiseTable = noiseTableFor(SEED);
  function noise2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const g = (a, b) => noiseTable[(((a % NG) + NG) % NG) * NG + (((b % NG) + NG) % NG)];
    const u = fade(xf), v = fade(yf);
    const a = g(xi, yi) * (1 - u) + g(xi + 1, yi) * u;
    const b = g(xi, yi + 1) * (1 - u) + g(xi + 1, yi + 1) * u;
    return a * (1 - v) + b * v;
  }
  function fbm(x, y, oct) {
    let s = 0, amp = 0.5, f = 1;
    for (let i = 0; i < (oct || 3); i++) { s += noise2(x * f, y * f) * amp; amp *= 0.5; f *= 2; }
    return s * 2 - 0.75;
  }

  /* ── 캔버스 ─────────────────────────────────────────────────── */
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false });

  const S = Math.min(W, H) / 1080;          // 4K에서도 FHD에서도 같은 비례로 그린다
  const pal = PALETTES[P.palette] || PALETTES.ink;
  const BG  = P.invert ? pal.ink : pal.bg;
  const INK = P.invert ? pal.bg : pal.ink;

  const k = {
    density:  P.density / 100,
    speed:    P.speed / 100,
    scale:    0.35 + (P.scale / 100) * 1.8,
    contrast: 0.4 + (P.contrast / 100) * 1.4,
    glow:     P.glow / 100,
    grain:    P.grain / 100,
    accent:   P.accent / 100,
  };

  const rand = mulberry32(SEED);
  /* 스타일마다 쓰는 초기 배치. 시드에서 한 번만 뽑고 이후에는 t의 함수로만 움직인다. */
  const seeds = [];
  for (let i = 0; i < 900; i++) seeds.push({ a: rand(), b: rand(), c: rand(), d: rand() });

  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* 색을 rgba로. 팔레트 tone 인덱스와 알파를 받는다. */
  function tone(i, alpha) {
    const hex = pal.tones[((i % pal.tones.length) + pal.tones.length) % pal.tones.length];
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
  }
  function inkA(alpha) {
    const n = parseInt(INK.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
  }

  /* 움직임 방식. 완전 루프를 위해 주기는 전부 DUR의 정수배로 잡는다. */
  function motionPhase(t, i) {
    const p = t / DUR;                       // 0~1 한 바퀴
    switch (P.motion) {
      case "still": return 0;
      case "pulse": return (Math.sin(p * TAU) * 0.5 + 0.5);
      case "orbit": return p * TAU;
      default:      return p * TAU;          // drift
    }
  }

  /* 대칭. 고객이 2·4·6을 고르면 같은 그림을 회전 복제한다. */
  function withSymmetry(draw) {
    const n = [1, 2, 4, 6].indexOf(P.symmetry) >= 0 ? P.symmetry : 1;
    if (n === 1) { draw(); return; }
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate((i / n) * TAU);
      ctx.translate(-W / 2, -H / 2);
      draw();
      ctx.restore();
    }
  }

  /* ── 스타일 20종 ─────────────────────────────────────────────
     전부 t(초)의 함수로 그린다. 프레임을 건너뛰어도, 되감아도 같은 그림이
     나와야 에디터에서 슬라이더를 움직일 때 그림이 어긋나지 않는다. */

  const STYLES = {

    /* 01 미니멀 — 여백이 주인공. 선 몇 개와 원 하나. */
    minimal(t) {
      const n = 3 + Math.round(k.density * 9);
      const ph = motionPhase(t);
      ctx.lineWidth = 1.4 * S * k.contrast;
      for (let i = 0; i < n; i++) {
        const s = seeds[i];
        const y = H * (0.18 + 0.64 * s.a);
        const w = W * (0.12 + 0.5 * s.b);
        const x = W * 0.5 - w / 2 + Math.sin(ph + s.c * TAU) * W * 0.03 * k.speed;
        ctx.strokeStyle = inkA(0.16 + 0.5 * s.d * k.contrast);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
      }
      const r = Math.min(W, H) * (0.06 + 0.06 * Math.sin(ph));
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.5, Math.abs(r), 0, TAU);
      ctx.strokeStyle = tone(2, 0.7 * k.accent + 0.2);
      ctx.lineWidth = 2.2 * S; ctx.stroke();
    },

    /* 02 맥시멀 — 층층이 쌓는다. 밀도가 성격이다. */
    maximal(t) {
      const layers = 4 + Math.round(k.density * 10);
      const ph = motionPhase(t);
      ctx.globalCompositeOperation = "lighter";
      for (let L = 0; L < layers; L++) {
        const s = seeds[L];
        const rr = Math.min(W, H) * (0.05 + 0.42 * s.a) * k.scale;
        const cx = W * (0.2 + 0.6 * s.b) + Math.cos(ph + s.c * TAU) * W * 0.06 * k.speed;
        const cy = H * (0.2 + 0.6 * s.c) + Math.sin(ph * 1.3 + s.b * TAU) * H * 0.06 * k.speed;
        const petals = 5 + Math.floor(s.d * 9);
        ctx.beginPath();
        for (let i = 0; i <= 220; i++) {
          const a = (i / 220) * TAU;
          const r = rr * (0.6 + 0.4 * Math.sin(a * petals + ph * 2));
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = tone(L, 0.10 + 0.22 * k.contrast);
        ctx.lineWidth = 1.2 * S; ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    },

    /* 03 퓨처리스틱 — 궤도와 계측선. 화면이 무언가를 재고 있는 느낌. */
    futuristic(t) {
      const ph = motionPhase(t);
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42 * k.scale;
      const rings = 3 + Math.round(k.density * 7);
      for (let i = 0; i < rings; i++) {
        const r = R * (0.2 + 0.8 * (i / rings));
        ctx.beginPath();
        const gap = 0.15 + 0.5 * seeds[i].a;
        ctx.arc(cx, cy, r, ph * (i % 2 ? 1 : -1) + seeds[i].b * TAU, ph * (i % 2 ? 1 : -1) + TAU - gap);
        ctx.strokeStyle = i % 3 === 0 ? tone(1, 0.55 + 0.35 * k.contrast) : inkA(0.30 + 0.35 * k.contrast);
        ctx.lineWidth = (i % 3 === 0 ? 3 : 1.4) * S; ctx.stroke();
        /* 눈금. 화면이 무언가를 재고 있다는 인상은 이 잔선이 만든다. */
        const ticks = 24 + i * 6;
        ctx.strokeStyle = inkA(0.16 + 0.2 * k.contrast);
        ctx.lineWidth = 1 * S;
        for (let j = 0; j < ticks; j++) {
          const a = (j / ticks) * TAU + ph * (i % 2 ? 0.4 : -0.4);
          const t0 = r * 0.97, t1 = r * (j % 4 === 0 ? 1.06 : 1.02);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * t0, cy + Math.sin(a) * t0);
          ctx.lineTo(cx + Math.cos(a) * t1, cy + Math.sin(a) * t1);
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.14, ph, ph + Math.PI * 1.1);
      ctx.strokeStyle = tone(1, 0.9); ctx.lineWidth = 5 * S; ctx.stroke();
      ctx.strokeStyle = inkA(0.10);
      ctx.lineWidth = 1 * S;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + ph * 0.2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * R * 0.2, cy + Math.sin(a) * R * 0.2);
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.stroke();
      }
    },

    /* 04 벡터 아트 — 면으로 자른 도형. 그라데이션 없이 평평하게. */
    vector(t) {
      const n = 5 + Math.round(k.density * 26);
      const ph = motionPhase(t);
      for (let i = 0; i < n; i++) {
        const s = seeds[i];
        const sides = 3 + Math.floor(s.a * 5);
        const r = Math.min(W, H) * (0.03 + 0.16 * s.b) * k.scale;
        const cx = W * s.c + Math.cos(ph + s.a * TAU) * W * 0.02 * k.speed;
        const cy = H * s.d + Math.sin(ph + s.b * TAU) * H * 0.02 * k.speed;
        ctx.beginPath();
        for (let j = 0; j <= sides; j++) {
          const a = (j / sides) * TAU + s.a * TAU + ph * 0.3;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = tone(i, 0.35 + 0.45 * k.contrast * s.d);
        ctx.fill();
      }
    },

    /* 05 콜라주 — 오려 붙인 종이. 결이 서로 다른 조각이 겹친다. */
    collage(t) {
      const n = 6 + Math.round(k.density * 22);
      const ph = motionPhase(t);
      for (let i = 0; i < n; i++) {
        const s = seeds[i];
        const w = W * (0.06 + 0.28 * s.a) * k.scale;
        const h = H * (0.05 + 0.3 * s.b) * k.scale;
        const x = W * s.c - w / 2, y = H * s.d - h / 2;
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((s.a - 0.5) * 0.5 + Math.sin(ph + s.b * TAU) * 0.04 * k.speed);
        ctx.fillStyle = tone(i, 0.22 + 0.5 * k.contrast * s.c);
        if (s.d > 0.62) { ctx.beginPath(); ctx.arc(0, 0, Math.min(w, h) / 2, 0, TAU); ctx.fill(); }
        else ctx.fillRect(-w / 2, -h / 2, w, h);
        if (s.b > 0.5) {                    // 찢긴 결
          ctx.strokeStyle = inkA(0.18);
          ctx.lineWidth = 1 * S;
          ctx.beginPath();
          for (let j = 0; j <= 20; j++) {
            const xx = -w / 2 + (w * j) / 20;
            const yy = -h / 2 + fbm(xx * 0.01, i * 3, 2) * 8 * S;
            j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    },

    /* 06 레트로 — 수평선과 해. 70년대 실크스크린의 층. */
    retro(t) {
      const ph = motionPhase(t);
      const hor = H * 0.62;
      const sunR = Math.min(W, H) * 0.2 * k.scale;
      const sy = hor - sunR * 0.25 + Math.sin(ph) * H * 0.02 * k.speed;
      ctx.save();
      ctx.beginPath(); ctx.arc(W / 2, sy, sunR, 0, TAU); ctx.clip();
      const bands = 6 + Math.round(k.density * 12);
      for (let i = 0; i < bands; i++) {
        ctx.fillStyle = tone(i % 3, 0.35 + 0.5 * (1 - i / bands) * k.contrast);
        const bh = (sunR * 2) / bands;
        ctx.fillRect(W / 2 - sunR, sy - sunR + i * bh, sunR * 2, bh * 0.62);
      }
      ctx.restore();
      for (let i = 0; i < 14; i++) {
        const y = hor + Math.pow(i / 14, 2) * H * 0.4;
        ctx.strokeStyle = tone(2, 0.3 * k.contrast);
        ctx.lineWidth = (1 + i * 0.25) * S;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    },

    /* 07 사이버펑크 — 원근 격자와 글리치. */
    cyber(t) {
      const ph = motionPhase(t);
      const hor = H * 0.5;
      ctx.strokeStyle = tone(1, 0.5 * k.contrast);
      ctx.lineWidth = 1.2 * S;
      const cols = 10 + Math.round(k.density * 18);
      for (let i = -cols; i <= cols; i++) {
        ctx.beginPath(); ctx.moveTo(W / 2 + (i / cols) * W * 0.1, hor);
        ctx.lineTo(W / 2 + (i / cols) * W * 2.2, H); ctx.stroke();
      }
      for (let i = 0; i < 22; i++) {
        const p = ((i / 22) + (ph / TAU) * k.speed) % 1;
        const y = hor + Math.pow(p, 2.4) * (H - hor);
        ctx.strokeStyle = tone(1, 0.18 + 0.4 * p * k.contrast);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      for (let i = 0; i < 6; i++) {         // 글리치 슬라이스
        const s = seeds[i + 40];
        if ((Math.sin(ph * 3 + s.a * TAU) + 1) / 2 < 0.72) continue;
        const y = H * s.b, h = H * 0.01 + H * 0.03 * s.c;
        ctx.fillStyle = tone(3, 0.5);
        ctx.fillRect(0, y, W, h);
        ctx.fillStyle = tone(1, 0.35);
        ctx.fillRect(W * (s.d - 0.5) * 0.2, y + h * 0.3, W, h * 0.35);
      }
    },

    /* 08 팝아트 — 하프톤 점과 굵은 면. */
    pop(t) {
      const ph = motionPhase(t);
      const step = Math.max(10, 48 * S / (0.4 + k.density * 1.6));
      ctx.fillStyle = tone(1, 0.9);
      for (let y = step / 2; y < H; y += step) {
        for (let x = step / 2; x < W; x += step) {
          const v = fbm(x / (W * 0.4) * k.scale + Math.cos(ph) * 0.3, y / (H * 0.4) * k.scale + Math.sin(ph) * 0.3, 2);
          const r = clamp(v, 0, 1) * step * 0.48 * k.contrast;
          if (r < 0.4) continue;
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        }
      }
      ctx.fillStyle = tone(3, 0.55);
      const bw = W * 0.16 * k.scale;
      ctx.fillRect(W * 0.5 - bw / 2 + Math.sin(ph) * W * 0.08 * k.speed, 0, bw, H);
    },

    /* 09 글래스모피즘 — 반투명 판이 겹치며 흐려진다. */
    glass(t) {
      const n = 3 + Math.round(k.density * 9);
      const ph = motionPhase(t);
      for (let i = 0; i < n; i++) {
        const s = seeds[i + 10];
        const w = W * (0.16 + 0.32 * s.a) * k.scale;
        const h = H * (0.14 + 0.34 * s.b) * k.scale;
        const x = W * s.c - w / 2 + Math.cos(ph + s.a * TAU) * W * 0.04 * k.speed;
        const y = H * s.d - h / 2 + Math.sin(ph + s.b * TAU) * H * 0.04 * k.speed;
        const r = Math.min(w, h) * 0.14;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.fillStyle = tone(i, 0.10 + 0.14 * k.contrast);
        ctx.fill();
        ctx.strokeStyle = inkA(0.20 + 0.2 * k.contrast);
        ctx.lineWidth = 1.4 * S; ctx.stroke();
      }
    },

    /* 10 클레이 — 말랑한 덩어리. 부드러운 그림자로 두께를 만든다. */
    clay(t) {
      const n = 3 + Math.round(k.density * 8);
      const ph = motionPhase(t);
      for (let i = 0; i < n; i++) {
        const s = seeds[i + 20];
        const R = Math.min(W, H) * (0.08 + 0.16 * s.a) * k.scale;
        const cx = W * (0.15 + 0.7 * s.b) + Math.cos(ph + s.c * TAU) * W * 0.03 * k.speed;
        const cy = H * (0.15 + 0.7 * s.c) + Math.sin(ph + s.a * TAU) * H * 0.03 * k.speed;
        const blob = (off, fill) => {
          ctx.beginPath();
          for (let j = 0; j <= 180; j++) {
            const a = (j / 180) * TAU;
            const r = R * (0.86 + 0.14 * Math.sin(a * 3 + s.d * TAU + ph));
            const x = cx + Math.cos(a) * r + off, y = cy + Math.sin(a) * r + off;
            j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
        };
        blob(R * 0.10, "rgba(0,0,0,0.35)");
        blob(0, tone(i, 0.55 + 0.35 * k.contrast));
      }
    },

    /* 11 픽셀아트 — 필드를 저해상도 격자로 계단화한다. */
    pixel(t) {
      const ph = motionPhase(t);
      const cells = Math.round(18 + k.density * 74);
      const cw = W / cells, chh = H / cells * (H / W) * (W / H);
      const rows = Math.round(cells * (H / W));
      for (let yy = 0; yy < rows; yy++) {
        for (let xx = 0; xx < cells; xx++) {
          const v = fbm(xx * 0.08 * k.scale + Math.cos(ph) * 0.6, yy * 0.08 * k.scale + Math.sin(ph) * 0.6, 3);
          const q4 = Math.floor(clamp(v * 1.35, 0, 0.999) * 5);
          if (q4 === 0) continue;
          ctx.fillStyle = tone(4 - Math.min(q4, 4), 0.30 + 0.6 * k.contrast);
          ctx.fillRect(Math.floor(xx * cw), Math.floor(yy * (H / rows)), Math.ceil(cw), Math.ceil(H / rows));
        }
      }
    },

    /* 12 에디토리얼 — 잡지 지면. 굵은 규칙선과 넓은 여백. */
    editorial(t) {
      const ph = motionPhase(t);
      const m = Math.min(W, H) * 0.1;
      ctx.strokeStyle = inkA(0.5 * k.contrast);
      ctx.lineWidth = 2.4 * S;
      ctx.strokeRect(m, m, W - m * 2, H - m * 2);
      const cols = 2 + Math.round(k.density * 5);
      ctx.lineWidth = 1 * S;
      for (let i = 1; i < cols; i++) {
        const x = m + ((W - m * 2) * i) / cols;
        ctx.strokeStyle = inkA(0.16);
        ctx.beginPath(); ctx.moveTo(x, m); ctx.lineTo(x, H - m); ctx.stroke();
      }
      const bars = 3 + Math.round(k.density * 9);
      for (let i = 0; i < bars; i++) {
        const s = seeds[i + 30];
        const y = m + (H - m * 2) * (0.08 + 0.84 * s.a);
        const w = (W - m * 2) * (0.1 + 0.5 * s.b);
        const x = m + (W - m * 2 - w) * ((s.c + ph / TAU * k.speed * 0.2) % 1);
        ctx.fillStyle = i === 0 ? tone(1, 0.85) : inkA(0.12 + 0.4 * s.d * k.contrast);
        ctx.fillRect(x, y, w, Math.min(H, W) * (i === 0 ? 0.045 : 0.012) * k.scale);
      }
    },

    /* 13 Y2K — 크롬 방울과 별 스파클. 무지개 대신 두 톤 금속. */
    y2k(t) {
      const ph = motionPhase(t);
      const n = 3 + Math.round(k.density * 8);
      for (let i = 0; i < n; i++) {
        const s = seeds[i + 50];
        const R = Math.min(W, H) * (0.06 + 0.15 * s.a) * k.scale;
        const cx = W * s.b + Math.cos(ph + s.c * TAU) * W * 0.05 * k.speed;
        const cy = H * s.c + Math.sin(ph + s.a * TAU) * H * 0.05 * k.speed;
        const g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
        g.addColorStop(0, tone(0, 0.95)); g.addColorStop(0.5, tone(2, 0.75)); g.addColorStop(1, tone(0, 0.9));
        ctx.beginPath();
        for (let j = 0; j <= 160; j++) {
          const a = (j / 160) * TAU;
          const r = R * (0.8 + 0.2 * Math.sin(a * 2 + ph * 2 + s.d * TAU));
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      }
      for (let i = 0; i < 14; i++) {          // 스파클
        const s = seeds[i + 70];
        const x = W * s.a, y = H * s.b, r = Math.min(W, H) * 0.012 * (0.4 + s.c) * k.scale;
        const tw = 0.35 + 0.65 * ((Math.sin(ph * 2 + s.d * TAU) + 1) / 2);
        ctx.strokeStyle = inkA(0.8 * tw); ctx.lineWidth = 1.6 * S;
        ctx.beginPath();
        ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
        ctx.stroke();
      }
    },

    /* 14 스위스 — 격자, 대각, 굵은 바. 장식 없음. */
    swiss(t) {
      const ph = motionPhase(t);
      const m = Math.min(W, H) * 0.08;
      const rows = 3 + Math.round(k.density * 9);
      const cellH = (H - m * 2) / rows;
      for (let i = 0; i < rows; i++) {
        const s = seeds[i + 60];
        if (s.a > 0.55) continue;
        const w = (W - m * 2) * (0.2 + 0.7 * s.b);
        const x = m + (W - m * 2 - w) * ((s.c + (ph / TAU) * k.speed * 0.15) % 1);
        ctx.fillStyle = s.d > 0.7 ? tone(1, 0.9) : inkA(0.75 * k.contrast);
        ctx.fillRect(x, m + i * cellH, w, cellH * 0.42);
      }
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = tone(1, 0.6);
      ctx.fillRect(-W * 0.7, -Math.min(W, H) * 0.02 * k.scale, W * 1.4, Math.min(W, H) * 0.04 * k.scale);
      ctx.restore();
    },

    /* 15 초현실 — 지평선 위에 떠 있는 구체와 긴 그림자. */
    surreal(t) {
      const ph = motionPhase(t);
      const hor = H * 0.72;
      ctx.fillStyle = tone(3, 0.5);
      ctx.fillRect(0, hor, W, H - hor);
      const n = 2 + Math.round(k.density * 6);
      for (let i = 0; i < n; i++) {
        const s = seeds[i + 80];
        const R = Math.min(W, H) * (0.05 + 0.12 * s.a) * k.scale;
        const cx = W * (0.1 + 0.8 * s.b);
        const cy = hor - Math.min(W, H) * (0.05 + 0.35 * s.c) - Math.sin(ph + s.d * TAU) * H * 0.03 * k.speed;
        ctx.beginPath();                       // 늘어진 그림자
        ctx.ellipse(cx, hor + R * 0.1, R * (1.4 + (hor - cy) / H * 4), R * 0.16, 0, 0, TAU);
        ctx.fillStyle = "rgba(0,0,0,0.42)"; ctx.fill();
        const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.05, cx, cy, R);
        g.addColorStop(0, tone(0, 0.95)); g.addColorStop(1, tone(i + 1, 0.5 + 0.4 * k.contrast));
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = g; ctx.fill();
      }
    },

    /* 16 보헤미안 — 아치와 점묘. 흙빛의 유기적 반복. */
    bohemian(t) {
      const ph = motionPhase(t);
      const n = 2 + Math.round(k.density * 7);
      for (let i = 0; i < n; i++) {
        const s = seeds[i + 90];
        const w = W * (0.08 + 0.16 * s.a) * k.scale;
        const cx = W * (0.1 + 0.8 * s.b), base = H * (0.55 + 0.3 * s.c);
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, base);
        ctx.lineTo(cx - w / 2, base - w * 0.9);
        ctx.arc(cx, base - w * 0.9, w / 2, Math.PI, 0);
        ctx.lineTo(cx + w / 2, base);
        ctx.closePath();
        ctx.fillStyle = tone(i, 0.3 + 0.4 * k.contrast);
        ctx.fill();
        ctx.strokeStyle = inkA(0.3); ctx.lineWidth = 1.6 * S; ctx.stroke();
      }
      const dots = Math.round(60 + k.density * 320);
      for (let i = 0; i < dots; i++) {
        const s = seeds[i % seeds.length];
        const x = W * ((s.a + i * 0.013) % 1), y = H * ((s.b + i * 0.021) % 1);
        const r = Math.min(W, H) * 0.0035 * (0.5 + s.c) * k.scale;
        ctx.beginPath(); ctx.arc(x, y + Math.sin(ph + s.d * TAU) * H * 0.008 * k.speed, r, 0, TAU);
        ctx.fillStyle = tone(1, 0.25 + 0.4 * s.d * k.contrast); ctx.fill();
      }
    },

    /* 17 빅토리안 — 좌우 대칭 아라베스크와 액자 장식. */
    victorian(t) {
      const ph = motionPhase(t);
      const cx = W / 2, cy = H / 2;
      const m = Math.min(W, H) * 0.07;
      ctx.strokeStyle = tone(1, 0.7); ctx.lineWidth = 3 * S;
      ctx.strokeRect(m, m, W - m * 2, H - m * 2);
      ctx.strokeStyle = inkA(0.3); ctx.lineWidth = 1 * S;
      ctx.strokeRect(m * 1.5, m * 1.5, W - m * 3, H - m * 3);
      const arms = 4 + Math.round(k.density * 8) * 2;
      for (let a = 0; a < arms; a++) {
        const base = (a / arms) * TAU;
        ctx.beginPath();
        for (let j = 0; j <= 140; j++) {
          const u = j / 140;
          const r = Math.min(W, H) * 0.46 * k.scale * (0.35 + 0.65 * Math.sin(u * Math.PI)) * (0.7 + 0.3 * Math.sin(u * 6 + ph));
          const ang = base + Math.sin(u * Math.PI * 2) * 0.5;
          const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = a % 2 ? tone(1, 0.35 + 0.45 * k.contrast) : inkA(0.30 + 0.5 * k.contrast);
        ctx.lineWidth = 1.8 * S; ctx.stroke();
      }
    },

    /* 18 그래피티 — 스프레이 궤적과 튀는 입자. */
    graffiti(t) {
      const ph = motionPhase(t);
      const strokes = 2 + Math.round(k.density * 6);
      for (let sN = 0; sN < strokes; sN++) {
        const s = seeds[sN + 100];
        const y0 = H * (0.2 + 0.6 * s.a);
        ctx.lineCap = "round";
        for (let pass = 0; pass < 3; pass++) {
          ctx.beginPath();
          for (let j = 0; j <= 60; j++) {
            const u = j / 60;
            const x = W * (0.08 + 0.84 * u);
            const y = y0 + Math.sin(u * 6 + s.b * TAU + ph) * H * 0.09 * k.scale + fbm(u * 6, sN * 5 + pass, 2) * H * 0.02;
            j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.strokeStyle = tone(sN + pass, (0.1 + 0.2 * k.contrast) / (pass + 1));
          ctx.lineWidth = Math.min(W, H) * (0.03 - pass * 0.008) * k.scale;
          ctx.stroke();
        }
      }
      const spray = Math.round(80 + k.density * 420);
      for (let i = 0; i < spray; i++) {
        const s = seeds[i % seeds.length];
        const x = W * ((s.c + i * 0.017) % 1), y = H * ((s.d + i * 0.029) % 1);
        ctx.fillStyle = inkA(0.05 + 0.2 * s.a);
        ctx.fillRect(x, y, 1.6 * S, 1.6 * S);
      }
    },

    /* 19 오로라 — 흐르는 빛의 커튼. 영류 연작의 기본형. */
    aurora(t) {
      const ph = motionPhase(t);
      const bands = 3 + Math.round(k.density * 9);
      ctx.globalCompositeOperation = "lighter";
      for (let b = 0; b < bands; b++) {
        const s = seeds[b + 110];
        ctx.beginPath();
        const steps = 140;
        for (let j = 0; j <= steps; j++) {
          const u = j / steps, x = u * W;
          const y = H * (0.2 + 0.6 * s.a)
            + fbm(u * 2.2 * k.scale + s.b * 10, ph * 0.5 + b, 3) * H * 0.28
            + Math.sin(u * TAU + ph + s.c * TAU) * H * 0.05;
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        for (let j = steps; j >= 0; j--) {
          const u = j / steps, x = u * W;
          const th = H * (0.02 + 0.10 * s.d) * k.scale;
          const y = H * (0.2 + 0.6 * s.a)
            + fbm(u * 2.2 * k.scale + s.b * 10, ph * 0.5 + b, 3) * H * 0.28
            + Math.sin(u * TAU + ph + s.c * TAU) * H * 0.05 + th;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, tone(b, 0.02 + 0.14 * k.contrast));
        g.addColorStop(0.5, tone(b + 1, 0.06 + 0.3 * k.contrast));
        g.addColorStop(1, tone(b, 0.02));
        ctx.fillStyle = g; ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    },

    /* 20 손글씨 — 획의 압력이 살아 있는 자유곡선. */
    hand(t) {
      const ph = motionPhase(t);
      const lines = 2 + Math.round(k.density * 6);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let L = 0; L < lines; L++) {
        const s = seeds[L + 120];
        const y0 = H * (0.2 + 0.6 * (L / Math.max(1, lines - 1)) * 0.9 + 0.05 * s.a);
        const steps = 220;
        let px = W * 0.08, py = y0;
        for (let j = 1; j <= steps; j++) {
          const u = j / steps;
          const x = W * (0.08 + 0.84 * u);
          const y = y0
            + Math.sin(u * 14 + s.b * TAU) * H * 0.035 * k.scale
            + fbm(u * 5 + L * 3, ph * 0.3, 2) * H * 0.03;
          /* 붓의 압력: 획의 시작과 끝이 가늘다 */
          const press = Math.sin(u * Math.PI) * (0.6 + 0.4 * Math.sin(u * 9 + s.c * TAU));
          ctx.strokeStyle = inkA(0.25 + 0.6 * k.contrast * Math.abs(press));
          ctx.lineWidth = Math.max(0.4, Math.min(W, H) * 0.012 * k.scale * Math.abs(press));
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
          px = x; py = y;
        }
      }
    },

    /* 21 수묵 — 먹이 종이에 번진다. 획 하나와 그 둘레의 물기. */
    inkwash(t) {
      const ph = motionPhase(t);
      const n = 2 + Math.round(k.density * 6);
      for (let i = 0; i < n; i++) {
        const s = seeds[i + 130];
        const cx = W * (0.15 + 0.7 * s.a), cy = H * (0.2 + 0.6 * s.b);
        const R = Math.min(W, H) * (0.07 + 0.17 * s.c) * k.scale;
        /* 바깥에서 안으로 겹쳐 칠하면 가장자리가 옅고 가운데가 진해진다.
           먹이 번진 자국이 그렇게 생긴다. */
        for (let L = 5; L >= 1; L--) {
          ctx.beginPath();
          for (let j = 0; j <= 120; j++) {
            const a = (j / 120) * TAU;
            const wob = fbm(Math.cos(a) * 1.6 + s.d * 9, Math.sin(a) * 1.6 + ph * 0.25, 3);
            const r = R * (L / 5) * (0.72 + 0.5 * wob);
            const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.86;
            j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = inkA(0.05 + 0.12 * k.contrast);
          ctx.fill();
        }
      }
    },

    /* 22 파동 — 두 점에서 퍼진 물결이 겹치며 간섭한다. */
    wave(t) {
      const ph = motionPhase(t);
      const src = 2 + Math.round(k.density * 4);
      const step = Math.max(3, 7 * S);
      const pts = [];
      for (let i = 0; i < src; i++) {
        const s = seeds[i + 150];
        pts.push([W * (0.2 + 0.6 * s.a), H * (0.2 + 0.6 * s.b)]);
      }
      ctx.lineWidth = 1 * S;
      for (let y = 0; y < H; y += step) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += step) {
          let v = 0;
          for (const [px, py] of pts) {
            const d = Math.hypot(x - px, y - py);
            v += Math.sin(d / (26 * S * k.scale) - ph * 2);
          }
          const yy = y + (v / pts.length) * 30 * S * k.contrast * k.scale;
          x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
        }
        ctx.strokeStyle = inkA(0.22 + 0.5 * k.contrast);
        ctx.lineWidth = 1.3 * S;
        ctx.stroke();
      }
    },

    /* 23 군집 — 새떼. 같은 방향으로 가되 조금씩 어긋난다. */
    flock(t) {
      const ph = motionPhase(t);
      const n = 30 + Math.round(k.density * 260);
      for (let i = 0; i < n; i++) {
        const s = seeds[i % seeds.length];
        const lane = s.a;
        const drift = (ph / TAU + s.b) % 1;
        const x = W * ((drift + fbm(lane * 5, ph * 0.3, 2) * 0.08) % 1);
        const y = H * (0.12 + 0.76 * lane) + Math.sin(ph * 2 + s.c * TAU) * H * 0.05 * k.scale;
        const sz = Math.min(W, H) * 0.006 * (0.5 + s.d) * k.scale;
        const a = Math.atan2(Math.cos(ph + s.c * TAU) * 0.4, 1);
        ctx.save();
        ctx.translate(x, y); ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(-sz, -sz * 0.7); ctx.lineTo(sz * 1.6, 0); ctx.lineTo(-sz, sz * 0.7);
        ctx.closePath();
        ctx.fillStyle = tone(Math.floor(s.d * 3), 0.25 + 0.55 * k.contrast);
        ctx.fill();
        ctx.restore();
      }
    },

    /* 24 결정 — 씨앗에서 가장 가까운 영역으로 화면을 나눈다. */
    crystal(t) {
      const ph = motionPhase(t);
      const n = 6 + Math.round(k.density * 30);
      const cells = [];
      for (let i = 0; i < n; i++) {
        const s = seeds[i + 170];
        cells.push([
          W * s.a + Math.cos(ph + s.c * TAU) * W * 0.03 * k.speed,
          H * s.b + Math.sin(ph + s.d * TAU) * H * 0.03 * k.speed,
          i,
        ]);
      }
      /* 정직한 보로노이는 비싸다. 성기게 찍어 칠하고 경계는 선으로 덮는다. */
      const g = Math.max(6, 14 * S / k.scale);
      for (let y = 0; y < H; y += g) {
        for (let x = 0; x < W; x += g) {
          let best = 0, bd = 1e9;
          for (const [cx, cy, i] of cells) {
            const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
            if (d < bd) { bd = d; best = i; }
          }
          ctx.fillStyle = tone(best, 0.10 + 0.30 * k.contrast * ((best % 4) / 3 + 0.25));
          ctx.fillRect(x, y, g + 1, g + 1);
        }
      }
      ctx.strokeStyle = inkA(0.22 + 0.3 * k.contrast);
      ctx.lineWidth = 1 * S;
      cells.forEach(([cx, cy]) => {
        ctx.beginPath(); ctx.arc(cx, cy, 2.4 * S, 0, TAU); ctx.stroke();
      });
    },

    /* 25 실 — 원 위의 점을 이어 만드는 스트링아트. 곡선은 선에서 나온다. */
    thread(t) {
      const ph = motionPhase(t);
      const N = 60 + Math.round(k.density * 180);
      const R = Math.min(W, H) * 0.42 * k.scale;
      const cx = W / 2, cy = H / 2;
      const jump = 2 + Math.floor((0.5 + 0.5 * Math.sin(ph)) * 7);
      ctx.lineWidth = 0.8 * S;
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < N; i++) {
        const a1 = (i / N) * TAU + ph * 0.2;
        const a2 = ((i * jump) / N) * TAU + ph * 0.2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
        ctx.lineTo(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R);
        ctx.strokeStyle = tone(i % 3, 0.05 + 0.16 * k.contrast);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    },

    /* 26 비 — 빗줄기와 바닥의 파문. */
    rain(t) {
      const ph = motionPhase(t);
      const n = 40 + Math.round(k.density * 300);
      const tilt = 0.18;
      ctx.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const s = seeds[i % seeds.length];
        const fall = ((ph / TAU) * (1 + s.a) * (0.6 + k.speed) + s.b) % 1;
        const x = W * s.c + fall * H * tilt;
        const y = fall * H;
        const len = Math.min(W, H) * (0.02 + 0.05 * s.a) * k.scale;
        ctx.strokeStyle = inkA(0.22 + 0.55 * s.d * k.contrast);
        ctx.lineWidth = (0.9 + s.d * 1.4) * S;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x - len * tilt, y - len);
        ctx.stroke();
      }
      const rip = 3 + Math.round(k.density * 7);
      for (let i = 0; i < rip; i++) {
        const s = seeds[i + 190];
        const grow = ((ph / TAU) * 1.6 + s.a) % 1;
        const r = grow * Math.min(W, H) * 0.12 * k.scale;
        ctx.beginPath();
        ctx.ellipse(W * s.b, H * (0.78 + 0.18 * s.c), r, r * 0.3, 0, 0, TAU);
        ctx.strokeStyle = tone(1, (1 - grow) * 0.45 * k.contrast);
        ctx.lineWidth = 1.4 * S; ctx.stroke();
      }
    },

    /* 27 개화 — 가운데에서 꽃잎이 열린다. 봄날의 이름값. */
    bloom(t) {
      const ph = motionPhase(t);
      const layers = 3 + Math.round(k.density * 7);
      const cx = W / 2, cy = H / 2;
      for (let L = layers; L >= 1; L--) {
        const open = clamp((Math.sin(ph - L * 0.25) + 1) / 2, 0, 1);
        const petals = 5 + L;
        const R = Math.min(W, H) * 0.06 * L * k.scale * (0.5 + 0.7 * open);
        for (let p = 0; p < petals; p++) {
          const a = (p / petals) * TAU + L * 0.3 + ph * 0.15;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.quadraticCurveTo(
            cx + Math.cos(a - 0.3) * R * 0.8, cy + Math.sin(a - 0.3) * R * 0.8,
            cx + Math.cos(a) * R, cy + Math.sin(a) * R
          );
          ctx.quadraticCurveTo(
            cx + Math.cos(a + 0.3) * R * 0.8, cy + Math.sin(a + 0.3) * R * 0.8,
            cx, cy
          );
          ctx.closePath();
          ctx.fillStyle = tone(L, 0.08 + 0.22 * k.contrast);
          ctx.fill();
          ctx.strokeStyle = inkA(0.10 + 0.18 * k.contrast);
          ctx.lineWidth = 1 * S; ctx.stroke();
        }
      }
    },

    /* 28 회로 — 직각으로만 꺾이는 배선과 접점. */
    circuit(t) {
      const ph = motionPhase(t);
      const lines = 6 + Math.round(k.density * 26);
      ctx.lineCap = "square";
      for (let i = 0; i < lines; i++) {
        const s = seeds[i + 210];
        let x = W * s.a, y = H * s.b;
        ctx.beginPath(); ctx.moveTo(x, y);
        const segs = 3 + Math.floor(s.c * 5);
        for (let j = 0; j < segs; j++) {
          const len = Math.min(W, H) * (0.04 + 0.16 * ((s.d + j * 0.21) % 1)) * k.scale;
          if ((j + Math.floor(s.a * 2)) % 2 === 0) x += len * (s.c > 0.5 ? 1 : -1);
          else y += len * (s.d > 0.5 ? 1 : -1);
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = tone(1, 0.16 + 0.4 * k.contrast);
        ctx.lineWidth = 1.6 * S; ctx.stroke();
        /* 접점. 신호가 지나가는 것처럼 밝기가 돈다. */
        const on = (Math.sin(ph * 2 + s.a * TAU) + 1) / 2;
        ctx.beginPath(); ctx.arc(x, y, 3 * S * k.scale, 0, TAU);
        ctx.fillStyle = tone(0, 0.25 + 0.7 * on * k.contrast); ctx.fill();
      }
    },

    /* 29 등고선 — 같은 높이를 잇는 선. 지형이 드러난다. */
    topo(t) {
      const ph = motionPhase(t);
      const levels = 4 + Math.round(k.density * 10);
      const g = Math.max(3, 5 * S);
      for (let L = 0; L < levels; L++) {
        const thr = L / levels;
        ctx.beginPath();
        for (let y = 0; y < H; y += g) {
          let pen = false;
          for (let x = 0; x < W; x += g) {
            const v = fbm(x / (W * 0.5) * k.scale * 2 + ph * 0.15, y / (H * 0.5) * k.scale * 2, 4);
            const near = Math.abs(clamp(v, 0, 1) - thr) < 0.030;
            if (near) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; }
            else pen = false;
          }
        }
        ctx.strokeStyle = L % 4 === 0
          ? tone(1, 0.5 + 0.45 * k.contrast)
          : inkA(0.26 + 0.45 * k.contrast);
        ctx.lineWidth = (L % 4 === 0 ? 2.2 : 1.2) * S;
        ctx.stroke();
      }
    },

    /* 30 모자이크 — 조각마다 색이 다른 타일. 줄눈이 그림을 만든다. */
    mosaic(t) {
      const ph = motionPhase(t);
      const cols = Math.round(10 + k.density * 46);
      const cw = W / cols, rows = Math.max(1, Math.round(cols * (H / W)));
      const chh = H / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = fbm(c * 0.14 * k.scale + Math.cos(ph) * 0.5, r * 0.14 * k.scale + Math.sin(ph) * 0.5, 3);
          const q = clamp(v, 0, 0.999);
          const gap = Math.max(1, cw * 0.10);
          ctx.fillStyle = tone(Math.floor(q * 4), 0.2 + 0.7 * q * k.contrast);
          ctx.fillRect(c * cw + gap / 2, r * chh + gap / 2, cw - gap, chh - gap);
        }
      }
    },

    /* 31 연기 — 위로 오르며 흩어진다. */
    smoke(t) {
      const ph = motionPhase(t);
      const n = 20 + Math.round(k.density * 130);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < n; i++) {
        const s = seeds[i % seeds.length];
        const rise = ((ph / TAU) * (0.4 + s.a) + s.b) % 1;
        const spread = rise * rise;
        const x = W * (0.5 + (s.c - 0.5) * 0.3)
          + fbm(s.d * 7, rise * 3 + ph * 0.2, 3) * W * 0.34 * spread;
        const y = H * (1.02 - rise * 1.05);
        const r = Math.min(W, H) * (0.012 + 0.09 * spread) * k.scale;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, tone(0, (1 - rise) * 0.26 * k.contrast));
        g.addColorStop(1, tone(0, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    },

    /* 32 격자 왜곡 — 반듯한 격자가 보이지 않는 힘에 눌린다. */
    warp(t) {
      const ph = motionPhase(t);
      const cols = 8 + Math.round(k.density * 30);
      const rows = Math.max(4, Math.round(cols * (H / W)));
      const amp = Math.min(W, H) * 0.09 * k.scale;
      const off = (u, v) => {
        const n1 = fbm(u * 2.2 + ph * 0.3, v * 2.2, 3) - 0.25;
        const n2 = fbm(u * 2.2 + 9, v * 2.2 + ph * 0.3, 3) - 0.25;
        return [n1 * amp, n2 * amp];
      };
      ctx.lineWidth = 1.1 * S;
      ctx.strokeStyle = inkA(0.16 + 0.4 * k.contrast);
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
          const u = c / cols, v = r / rows;
          const [dx, dy] = off(u, v);
          const x = u * W + dx, y = v * H + dy;
          c ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = tone(1, 0.14 + 0.3 * k.contrast);
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        for (let r = 0; r <= rows; r++) {
          const u = c / cols, v = r / rows;
          const [dx, dy] = off(u, v);
          const x = u * W + dx, y = v * H + dy;
          r ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    },

    /* 33 별자리 — 가까운 점끼리만 잇는다. 선이 저절로 형태를 만든다. */
    constellation(t) {
      const ph = motionPhase(t);
      const n = 22 + Math.round(k.density * 110);
      const pts = [];
      for (let i = 0; i < n; i++) {
        const s = seeds[i % seeds.length];
        pts.push([
          W * ((s.a + Math.cos(ph + s.c * TAU) * 0.02 * k.speed + 1) % 1),
          H * ((s.b + Math.sin(ph + s.d * TAU) * 0.02 * k.speed + 1) % 1),
          s.d,
        ]);
      }
      const near = Math.min(W, H) * 0.17 * k.scale;
      ctx.lineWidth = 1 * S;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
          if (d > near) continue;
          ctx.strokeStyle = inkA((1 - d / near) * 0.55 * k.contrast);
          ctx.beginPath();
          ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.stroke();
        }
      }
      pts.forEach(([x, y, w]) => {
        ctx.beginPath();
        ctx.arc(x, y, Math.min(W, H) * 0.0055 * (0.5 + w) * k.scale, 0, TAU);
        ctx.fillStyle = tone(0, 0.6 + 0.4 * w * k.contrast);
        ctx.fill();
      });
    },

    /* 34 옵아트 — 굵기가 변하는 줄무늬. 가만히 있는데 움직여 보인다. */
    stripe(t) {
      const ph = motionPhase(t);
      const bands = 10 + Math.round(k.density * 60);
      const vertical = P.symmetry % 2 === 1;
      for (let i = 0; i < bands; i++) {
        const u = i / bands;
        const w = (1 / bands) * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(u * TAU * 3 + ph * 2)));
        ctx.fillStyle = i % 2 ? tone(0, 0.10 + 0.6 * k.contrast) : tone(2, 0.10 + 0.5 * k.contrast);
        if (vertical) ctx.fillRect(u * W, 0, w * W, H);
        else ctx.fillRect(0, u * H, W, w * H);
      }
    },

    /* 35 나선 — 한 점에서 풀려 나오는 궤적. */
    spiral(t) {
      const ph = motionPhase(t);
      const arms = 1 + Math.round(k.density * 8);
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.46 * k.scale;
      ctx.lineCap = "round";
      for (let a = 0; a < arms; a++) {
        const base = (a / arms) * TAU + ph * 0.4;
        ctx.beginPath();
        const steps = 320;
        for (let j = 0; j <= steps; j++) {
          const u = j / steps;
          const ang = base + u * TAU * 2.6;
          const r = R * u * (0.75 + 0.25 * Math.sin(u * 8 + ph));
          const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = tone(a, 0.2 + 0.5 * k.contrast);
        ctx.lineWidth = (1 + 2.2 * (1 - a / arms)) * S;
        ctx.stroke();
      }
    },

    /* 36 균열 — 한 점에서 갈라져 뻗는다. 갈라질수록 가늘어진다. */
    fracture(t) {
      const ph = motionPhase(t);
      const grow = 0.4 + 0.6 * ((Math.sin(ph) + 1) / 2);
      const cx = W * 0.5, cy = H * 0.5;
      ctx.lineCap = "round";
      const branch = (x, y, ang, len, depth) => {
        if (depth <= 0 || len < 2 * S) return;
        const s = seeds[(depth * 37 + Math.round(ang * 12) + 230) % seeds.length];
        const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny);
        ctx.strokeStyle = inkA(0.12 + 0.5 * (depth / 7) * k.contrast);
        ctx.lineWidth = Math.max(0.5, depth * 0.7 * S);
        ctx.stroke();
        const spread = 0.34 + s.a * 0.5;
        branch(nx, ny, ang - spread * 0.5, len * (0.62 + s.b * 0.2), depth - 1);
        branch(nx, ny, ang + spread * 0.5, len * (0.62 + s.c * 0.2), depth - 1);
      };
      const arms = 3 + Math.round(k.density * 5);
      for (let i = 0; i < arms; i++) {
        branch(cx, cy, (i / arms) * TAU + ph * 0.2,
          Math.min(W, H) * 0.13 * k.scale * grow, 6);
      }
    },

    /* 37 네온사인 — 유리관에 갇힌 빛. 관 자체보다 둘레가 더 밝다. */
    neonsign(t) {
      const ph = motionPhase(t);
      const n = 2 + Math.round(k.density * 6);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let i = 0; i < n; i++) {
        const s = seeds[i + 250];
        const flick = 0.55 + 0.45 * ((Math.sin(ph * 3 + s.a * TAU) + 1) / 2);
        const path = () => {
          ctx.beginPath();
          for (let j = 0; j <= 90; j++) {
            const u = j / 90;
            const x = W * (0.12 + 0.76 * u);
            const y = H * (0.2 + 0.6 * s.b)
              + Math.sin(u * TAU * (1 + Math.floor(s.c * 3)) + s.d * TAU) * H * 0.12 * k.scale;
            j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
        };
        /* 굵고 옅게 → 가늘고 진하게. 세 번 겹치면 유리관처럼 보인다. */
        ctx.globalCompositeOperation = "lighter";
        [[16, 0.05], [7, 0.12], [2.4, 0.55]].forEach(([w, al]) => {
          path();
          ctx.strokeStyle = tone(i % 3 + 1, al * flick * (0.5 + k.contrast));
          ctx.lineWidth = w * S * k.scale;
          ctx.stroke();
        });
        path();
        ctx.strokeStyle = inkA(0.85 * flick);
        ctx.lineWidth = 1.1 * S; ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      }
    },

    /* 38 종이 — 접힌 면. 같은 색인데 각도가 달라 밝기가 갈린다. */
    paper(t) {
      const ph = motionPhase(t);
      const n = 5 + Math.round(k.density * 22);
      for (let i = 0; i < n; i++) {
        const s = seeds[i + 270];
        const cx = W * s.a, cy = H * s.b;
        const R = Math.min(W, H) * (0.08 + 0.22 * s.c) * k.scale;
        const a0 = s.d * TAU + ph * 0.2;
        const pts = [];
        for (let j = 0; j < 3; j++) {
          const a = a0 + (j / 3) * TAU + s.a;
          pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R * (0.7 + 0.3 * s.b)]);
        }
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.lineTo(pts[2][0], pts[2][1]);
        ctx.closePath();
        /* 면의 방향으로 밝기를 정한다. 접힌 종이는 그렇게 읽힌다. */
        const face = (Math.cos(a0 * 2) + 1) / 2;
        ctx.fillStyle = tone(Math.floor(face * 3), 0.18 + 0.55 * face * k.contrast);
        ctx.fill();
        ctx.strokeStyle = inkA(0.10 + 0.2 * k.contrast);
        ctx.lineWidth = 1 * S; ctx.stroke();
      }
    },

    /* 39 대나무 — 수직의 마디. 획과 여백이 전부다. */
    bamboo(t) {
      const ph = motionPhase(t);
      const stalks = 3 + Math.round(k.density * 14);
      for (let i = 0; i < stalks; i++) {
        const s = seeds[i + 290];
        const x = W * (0.05 + 0.9 * s.a);
        const w = Math.min(W, H) * (0.008 + 0.022 * s.b) * k.scale;
        const sway = Math.sin(ph + s.c * TAU) * W * 0.012 * k.speed;
        ctx.fillStyle = tone(Math.floor(s.d * 3), 0.16 + 0.45 * k.contrast);
        ctx.beginPath();
        ctx.moveTo(x - w / 2, H);
        ctx.lineTo(x - w / 2 + sway, 0);
        ctx.lineTo(x + w / 2 + sway, 0);
        ctx.lineTo(x + w / 2, H);
        ctx.closePath(); ctx.fill();
        /* 마디 */
        const joints = 4 + Math.floor(s.b * 6);
        ctx.strokeStyle = inkA(0.28 + 0.4 * k.contrast);
        ctx.lineWidth = 1.6 * S;
        for (let j = 1; j < joints; j++) {
          const u = j / joints, y = H * u;
          ctx.beginPath();
          ctx.moveTo(x - w * 0.7 + sway * (1 - u), y);
          ctx.lineTo(x + w * 0.7 + sway * (1 - u), y);
          ctx.stroke();
        }
      }
    },

    /* 40 궤도 — 타원 궤적 위를 도는 점과 그 자취. */
    orbit(t) {
      const ph = motionPhase(t);
      const n = 3 + Math.round(k.density * 14);
      const cx = W / 2, cy = H / 2;
      for (let i = 0; i < n; i++) {
        const s = seeds[i + 310];
        const rx = Math.min(W, H) * (0.08 + 0.38 * s.a) * k.scale;
        const ry = rx * (0.25 + 0.7 * s.b);
        const tilt = s.c * TAU;
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(tilt);
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
        ctx.strokeStyle = inkA(0.10 + 0.18 * k.contrast);
        ctx.lineWidth = 1 * S; ctx.stroke();
        /* 자취. 진행 방향 뒤쪽으로 옅어진다. */
        const a = ph * (0.6 + s.d) + s.a * TAU;
        for (let j = 0; j < 16; j++) {
          const aa = a - j * 0.055;
          ctx.beginPath();
          ctx.arc(Math.cos(aa) * rx, Math.sin(aa) * ry,
            Math.min(W, H) * 0.006 * k.scale * (1 - j / 18), 0, TAU);
          ctx.fillStyle = tone(i % 4, (1 - j / 16) * 0.5 * (0.4 + k.contrast));
          ctx.fill();
        }
        ctx.restore();
      }
    },
  };

  /* ── 마감 처리 ────────────────────────────────────────────────
     그레인은 밴딩을 덮는다. 어두운 그라데이션을 LED에 올리면 계단이
     보이는데, 아주 옅은 노이즈 한 겹이 그걸 지운다. */
  let grainTile = null;
  function makeGrain() {
    const g = document.createElement("canvas");
    g.width = g.height = 128;
    const gx = g.getContext("2d");
    const im = gx.createImageData(128, 128);
    const r = mulberry32(SEED ^ 0x5bf03635);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = Math.floor(r() * 255);
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    gx.putImageData(im, 0, 0);
    return g;
  }
  function applyGrain() {
    if (k.grain <= 0.001) return;
    if (!grainTile) grainTile = makeGrain();
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.03 + k.grain * 0.10;
    const p = ctx.createPattern(grainTile, "repeat");
    ctx.fillStyle = p; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  function applyVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0," + (0.18 + 0.28 * (1 - k.glow)) + ")");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* ── 프레임 ──────────────────────────────────────────────────
     n번째 프레임을 그린다. 같은 n은 언제나 같은 그림이다. */
  function renderFrame(n) {
    const t = (n % TOTAL_FRAMES) / FPS;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    const draw = STYLES[P.style] || STYLES.aurora;
    if (k.glow > 0.02) {
      ctx.shadowColor = tone(1, 0.6);
      ctx.shadowBlur = Math.min(W, H) * 0.012 * k.glow;
    } else {
      ctx.shadowBlur = 0;
    }
    withSymmetry(() => draw(t));
    ctx.shadowBlur = 0;

    applyVignette();
    applyGrain();
  }

  return { renderFrame: renderFrame, totalFrames: TOTAL_FRAMES, width: W, height: H };
}

/* 스타일 목록. 조작판이 이 순서로 버튼을 만든다. */
const STYLE_LABELS = [
  ["minimal", "미니멀"], ["maximal", "맥시멀"], ["futuristic", "퓨처리스틱"], ["vector", "벡터 아트"],
  ["collage", "콜라주"], ["retro", "레트로"], ["cyber", "사이버펑크"], ["pop", "팝아트"],
  ["glass", "글래스"], ["clay", "클레이"], ["pixel", "픽셀아트"], ["editorial", "에디토리얼"],
  ["y2k", "Y2K"], ["swiss", "스위스"], ["surreal", "초현실"], ["bohemian", "보헤미안"],
  ["victorian", "빅토리안"], ["graffiti", "그래피티"], ["aurora", "오로라"], ["hand", "손글씨"],
  ["inkwash", "수묵"], ["wave", "파동"], ["flock", "군집"], ["crystal", "결정"],
  ["thread", "실"], ["rain", "비"], ["bloom", "개화"], ["circuit", "회로"],
  ["topo", "등고선"], ["mosaic", "모자이크"], ["smoke", "연기"], ["warp", "격자 왜곡"],
  ["constellation", "별자리"], ["stripe", "옵아트"], ["spiral", "나선"], ["fracture", "균열"],
  ["neonsign", "네온사인"], ["paper", "종이"], ["bamboo", "대나무"], ["orbit", "궤도"],
];

global.StudioArt = {
  create: create,
  PALETTES: PALETTES,
  STYLES: STYLE_LABELS,
  PALETTE_IDS: Object.keys(PALETTES),
};
})(typeof window !== "undefined" ? window : globalThis);
