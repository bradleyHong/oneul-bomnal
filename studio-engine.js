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

/* ── 글자를 코드로 긋는다 ──────────────────────────────────────
 *
 * fillText 를 쓰지 않는다. 웹폰트도 시스템 폰트도 쓰지 않는다.
 * 고객이 미리보기를 띄운 브라우저와 우리가 납품본을 뽑는 브라우저의
 * 글꼴이 다르면, 고른 화면과 받는 파일이 어긋난다. 글자만 그런 게
 * 아니라 자간·힌팅까지 달라진다. 그래서 획을 전부 우리가 긋는다.
 *
 * 5×7 점판. 활자를 격자에서 잘라 쓰는 방식은 1876년 Plaque Découpée
 * Universelle 까지 거슬러 올라간다. 칠분할 표시기(7-segment)도 같은
 * 생각이다. 여기서는 가장 단순한 형태를 쓴다. */
const FONT57_SRC = {
  "0": "01110,10001,10011,10101,11001,10001,01110",
  "1": "00100,01100,00100,00100,00100,00100,01110",
  "2": "01110,10001,00001,00010,00100,01000,11111",
  "3": "11111,00010,00100,00010,00001,10001,01110",
  "4": "00010,00110,01010,10010,11111,00010,00010",
  "5": "11111,10000,11110,00001,00001,10001,01110",
  "6": "00110,01000,10000,11110,10001,10001,01110",
  "7": "11111,00001,00010,00100,01000,01000,01000",
  "8": "01110,10001,10001,01110,10001,10001,01110",
  "9": "01110,10001,10001,01111,00001,00010,01100",
  "A": "01110,10001,10001,11111,10001,10001,10001",
  "B": "11110,10001,10001,11110,10001,10001,11110",
  "C": "01110,10001,10000,10000,10000,10001,01110",
  "D": "11100,10010,10001,10001,10001,10010,11100",
  "E": "11111,10000,10000,11110,10000,10000,11111",
  "F": "11111,10000,10000,11110,10000,10000,10000",
  "G": "01110,10001,10000,10111,10001,10001,01111",
  "H": "10001,10001,10001,11111,10001,10001,10001",
  "I": "01110,00100,00100,00100,00100,00100,01110",
  "J": "00111,00010,00010,00010,00010,10010,01100",
  "K": "10001,10010,10100,11000,10100,10010,10001",
  "L": "10000,10000,10000,10000,10000,10000,11111",
  "M": "10001,11011,10101,10101,10001,10001,10001",
  "N": "10001,10001,11001,10101,10011,10001,10001",
  "O": "01110,10001,10001,10001,10001,10001,01110",
  "P": "11110,10001,10001,11110,10000,10000,10000",
  "Q": "01110,10001,10001,10001,10101,10010,01101",
  "R": "11110,10001,10001,11110,10100,10010,10001",
  "S": "01111,10000,10000,01110,00001,00001,11110",
  "T": "11111,00100,00100,00100,00100,00100,00100",
  "U": "10001,10001,10001,10001,10001,10001,01110",
  "V": "10001,10001,10001,10001,10001,01010,00100",
  "W": "10001,10001,10001,10101,10101,11011,10001",
  "X": "10001,10001,01010,00100,01010,10001,10001",
  "Y": "10001,10001,01010,00100,00100,00100,00100",
  "Z": "11111,00001,00010,00100,01000,10000,11111",
  /* 옅은 자리를 메울 가벼운 글자들. 문자 명암의 사다리에 쓴다. */
  " ": "00000,00000,00000,00000,00000,00000,00000",
  ".": "00000,00000,00000,00000,00000,00100,00000",
  ":": "00000,00100,00000,00000,00000,00100,00000",
  "-": "00000,00000,00000,11111,00000,00000,00000",
  "=": "00000,00000,11111,00000,11111,00000,00000",
  "/": "00001,00010,00010,00100,01000,01000,10000",
  "+": "00000,00100,00100,11111,00100,00100,00000",
};

const FONT57 = {};        /* 글자 → 일곱 줄, 줄마다 5비트 */
const FONT57_INK = {};    /* 글자 → 칠해진 칸의 비율 0~1 */
for (const ch in FONT57_SRC) {
  const rows = FONT57_SRC[ch].split(",");
  let on = 0;
  for (let i = 0; i < rows.length; i++) for (let j = 0; j < 5; j++) if (rows[i][j] === "1") on++;
  FONT57[ch] = rows.map((r) => parseInt(r, 2));
  FONT57_INK[ch] = on / 35;
}
/* 옅은 것부터 짙은 것 순. 명암을 글자로 바꿀 때 쓴다. */
const FONT57_RAMP = Object.keys(FONT57).sort((a, b) => FONT57_INK[a] - FONT57_INK[b]);
const FONT57_DIGITS = "0123456789".split("");
const FONT57_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/* ── 한글 자모 ─────────────────────────────────────────────────
 *
 * 자모는 획이다. 획은 좌표다. 그래서 코드로 그리기에 라틴 알파벳보다
 * 오히려 낫다. 0~1 상자 안의 점 목록으로 적는다(y는 아래로).
 *   ["l", x,y, x,y, ...]  이어 긋는 선
 *   ["o", cx,cy, r]       원
 *
 * 초성 14 · 중성 10 · 종성 15(없음 포함) = 실제로 쓰이는 음절 2,100자.
 * 아무 획이나 붙여 만든 가짜 글자가 아니라 전부 읽히는 글자다. */
const CHO = {
  "ㄱ": [["l", 0.06,0.08, 0.94,0.08, 0.70,0.95]],
  "ㄴ": [["l", 0.18,0.05, 0.18,0.92, 0.95,0.92]],
  "ㄷ": [["l", 0.95,0.08, 0.12,0.08, 0.12,0.92, 0.95,0.92]],
  "ㄹ": [["l", 0.10,0.08, 0.90,0.08, 0.90,0.48, 0.10,0.48, 0.10,0.92, 0.92,0.92]],
  "ㅁ": [["l", 0.12,0.08, 0.88,0.08, 0.88,0.92, 0.12,0.92, 0.12,0.08]],
  "ㅂ": [["l", 0.14,0.05, 0.14,0.92, 0.86,0.92, 0.86,0.05], ["l", 0.14,0.50, 0.86,0.50]],
  "ㅅ": [["l", 0.48,0.05, 0.06,0.95], ["l", 0.44,0.30, 0.94,0.95]],
  "ㅇ": [["o", 0.50,0.50, 0.41]],
  "ㅈ": [["l", 0.06,0.10, 0.94,0.10], ["l", 0.50,0.10, 0.08,0.95], ["l", 0.46,0.34, 0.94,0.95]],
  "ㅊ": [["l", 0.50,0.00, 0.50,0.13], ["l", 0.06,0.26, 0.94,0.26],
         ["l", 0.50,0.26, 0.10,0.96], ["l", 0.46,0.46, 0.94,0.96]],
  "ㅋ": [["l", 0.06,0.08, 0.94,0.08, 0.70,0.95], ["l", 0.26,0.52, 0.85,0.46]],
  "ㅌ": [["l", 0.95,0.08, 0.12,0.08, 0.12,0.92, 0.95,0.92], ["l", 0.12,0.50, 0.88,0.50]],
  "ㅍ": [["l", 0.04,0.16, 0.96,0.16], ["l", 0.28,0.16, 0.24,0.84],
         ["l", 0.72,0.16, 0.76,0.84], ["l", 0.04,0.84, 0.96,0.84]],
  "ㅎ": [["l", 0.50,0.00, 0.50,0.11], ["l", 0.10,0.24, 0.90,0.24], ["o", 0.50,0.66, 0.29]],
};
const JUNG = {
  /* 세로형 — 초성은 왼쪽, 중성은 오른쪽에 선다 */
  "ㅏ": { v: 1, s: [["l", 0.42,0.02, 0.42,0.98], ["l", 0.42,0.52, 0.92,0.52]] },
  "ㅑ": { v: 1, s: [["l", 0.42,0.02, 0.42,0.98], ["l", 0.42,0.34, 0.92,0.34], ["l", 0.42,0.68, 0.92,0.68]] },
  "ㅓ": { v: 1, s: [["l", 0.62,0.02, 0.62,0.98], ["l", 0.12,0.48, 0.62,0.48]] },
  "ㅕ": { v: 1, s: [["l", 0.62,0.02, 0.62,0.98], ["l", 0.12,0.32, 0.62,0.32], ["l", 0.12,0.66, 0.62,0.66]] },
  "ㅣ": { v: 1, s: [["l", 0.50,0.02, 0.50,0.98]] },
  /* 가로형 — 초성은 위, 중성은 아래에 눕는다 */
  "ㅗ": { v: 0, s: [["l", 0.02,0.80, 0.98,0.80], ["l", 0.50,0.32, 0.50,0.80]] },
  "ㅛ": { v: 0, s: [["l", 0.02,0.80, 0.98,0.80], ["l", 0.32,0.36, 0.32,0.80], ["l", 0.68,0.36, 0.68,0.80]] },
  "ㅜ": { v: 0, s: [["l", 0.02,0.26, 0.98,0.26], ["l", 0.50,0.26, 0.50,0.74]] },
  "ㅠ": { v: 0, s: [["l", 0.02,0.26, 0.98,0.26], ["l", 0.32,0.26, 0.32,0.70], ["l", 0.68,0.26, 0.68,0.70]] },
  "ㅡ": { v: 0, s: [["l", 0.02,0.52, 0.98,0.52]] },
};
const CHO_IDS = Object.keys(CHO);
const JUNG_IDS = Object.keys(JUNG);
/* 종성 — 없는 경우가 첫 칸이다. 받침 없는 글자가 더 흔하다. */
const JONG_IDS = [null].concat(CHO_IDS);

/* 한 글자를 놓는 자리. 세로형·가로형·받침 유무로 넷이다.
   실제 한글 조판 규칙 그대로다. 이걸 어기면 글자가 글자로 안 읽힌다. */
function syllableBoxes(vertical, hasJong) {
  if (vertical) {
    return hasJong
      ? [[0.00,0.00,0.56,0.72], [0.54,0.00,0.46,0.72], [0.06,0.70,0.88,0.30]]
      : [[0.00,0.00,0.56,1.00], [0.54,0.00,0.46,1.00], null];
  }
  return hasJong
    ? [[0.18,0.00,0.64,0.40], [0.02,0.36,0.96,0.30], [0.16,0.66,0.68,0.34]]
    : [[0.14,0.00,0.72,0.56], [0.00,0.50,1.00,0.50], null];
}

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
  motion: "drift", symmetry: 1, invert: false, accent: 60, bare: false,
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
  /* bare 모드는 투명한 그림을 내놓아야 하므로 알파가 있는 컨텍스트를 쓴다.
     alpha:false 는 지워도 검게 남는다. */
  const ctx = canvas.getContext("2d", { alpha: !!P.bare });

  const S = Math.min(W, H) / 1080;          // 4K에서도 FHD에서도 같은 비례로 그린다
  /* 팔레트는 이름으로도, 색을 직접 담은 객체로도 받는다.
     봄날 스튜디오는 고객이 적은 문장에서 색을 고른다. "바다"라고 적었는데
     엔진이 제 목록의 단청으로 갈아치우면 문장을 읽은 뜻이 없어진다. */
  const pal = (P.palette && typeof P.palette === "object" && P.palette.tones)
    ? P.palette
    : (PALETTES[P.palette] || PALETTES.ink);
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

  /* 밝은 바탕으로 뒤집을 때 쓸 색.
     배경만 밝게 바꾸고 그림 색은 그대로 두었더니, 밝은 바탕에 밝은 그림이
     되어 아무것도 안 보였다(네온사인 07, 실 10은 통째로 백지였다).
     색상과 선명도는 그대로 두고 명도만 뒤집는다. 뒤집기 전과 같은 정도의
     대비가 남으면서 팔레트의 성격은 유지된다. */
  function flipLightness(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let l = (mx + mn) / 2;
    const d = mx - mn;
    let h = 0, sat = 0;
    if (d > 1e-6) {
      sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (mx === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    l = 1 - l;
    const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
    const pp = 2 * l - q;
    const hue = (t) => {
      if (t < 0) t += 1; else if (t > 1) t -= 1;
      if (t < 1 / 6) return pp + (q - pp) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6;
      return pp;
    };
    const to = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255);
    return "#" + ((1 << 24) + (to(hue(h + 1 / 3)) << 16) + (to(hue(h)) << 8) + to(hue(h - 1 / 3)))
      .toString(16).slice(1);
  }

  const TONES = P.invert ? pal.tones.map(flipLightness) : pal.tones;

  /* 덧셈 합성으로 빛을 쌓는 스타일들이 있다(네온사인·결정·오로라 등).
     흰 바탕에서는 이미 255라 아무리 더해도 변하지 않아 그림이 통째로
     사라진다. 뒤집었을 때는 같은 뜻의 반대 연산인 곱셈으로 바꾼다.
     어두운 바탕에 빛을 더하는 것 = 밝은 바탕에서 그늘을 더하는 것. */
  const ADD = P.invert ? "multiply" : "lighter";

  /* 색을 rgba로. 팔레트 tone 인덱스와 알파를 받는다. */
  function tone(i, alpha) {
    const hex = TONES[((i % TONES.length) + TONES.length) % TONES.length];
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
  }
  /* 바탕색에서 색 i 쪽으로 amt 만큼 간 불투명한 색.
     반투명으로 칠하면 뒤 면이 비쳐 앞뒤가 뒤엉킨다. 먼 것부터 덮어
     그리는 화가 방식을 쓰려면 색이 불투명해야 한다. amt 가 0이면
     바탕색 그대로라, 빛이 안 닿은 면은 저절로 어둠에 묻힌다. */
  const BGRGB = (function () {
    const n = parseInt((P.invert ? pal.ink : pal.bg).slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  })();
  function shade(i, amt) {
    const hex = TONES[((i % TONES.length) + TONES.length) % TONES.length];
    const n = parseInt(hex.slice(1), 16);
    const a = clamp(amt, 0, 1);
    return "rgb(" + Math.round(BGRGB[0] + (((n >> 16) & 255) - BGRGB[0]) * a) + ","
                  + Math.round(BGRGB[1] + (((n >> 8) & 255) - BGRGB[1]) * a) + ","
                  + Math.round(BGRGB[2] + ((n & 255) - BGRGB[2]) * a) + ")";
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

  /* 획을 수백 개 긋는 스타일들.
   *
   * 번짐(glow)은 ctx.shadowBlur 로 낸다. 그런데 이건 획 하나하나마다
   * 그림자를 다시 그린다. 선 200개짜리 스타일에서는 그 값이 감당이 안 된다.
   * 실측: 실 6.9ms → 344ms(50배), 파문 8 → 355(44배), 연기 5.5 → 195(35배).
   * 초당 세 장이다. 미리보기가 정지 화면처럼 보인다.
   *
   * 이 스타일들은 획마다 그림자를 달지 않고, 다 그린 뒤 번짐을 한 번만
   * 얹는다. 4분의 1 크기로 흐리게 떠서 더하는 방식이라 값이 거의 안 든다.
   * 그림은 거의 같고 속도는 수십 배 빨라진다. */
  const HEAVY_GLOW = { ripple: 1, thread: 1, smoke: 1, magnet: 1, neonsign: 1,
                       constellation: 1, flock: 1, rain: 1, oscillo: 1, moire: 1,
                       /* VJ 풍도 같은 병에 걸렸다. 만화경 353→4.4ms(80배),
                          폭발 118→3.3(36배), 터널 69→4.3(16배),
                          지형 비행 47→4.4(11배). */
                       kaleido: 1, burst: 1, tunnel: 1, flythrough: 1,
                       /* 점군은 꼭짓점 900개를 하나씩 찍는다. 찍을 때마다
                          그림자가 따라붙어 379→3.6ms 였다. 같은 병이다. */
                       pointcloud: 1,
                       /* 명암은 삼각형 수백 개를 하나씩 채운다. 같은 병이다.
                          번짐을 한 번에 얹는 편이 촛불빛에도 맞는다. */
                       chiaroscuro: 1 };

  let bloomBuf = null;
  function applyBloom(strength) {
    const bw = Math.max(32, Math.round(W / 4)), bh = Math.max(18, Math.round(H / 4));
    if (!bloomBuf || bloomBuf.width !== bw || bloomBuf.height !== bh) {
      bloomBuf = document.createElement("canvas");
      bloomBuf.width = bw; bloomBuf.height = bh;
    }
    const bx = bloomBuf.getContext("2d");
    bx.globalCompositeOperation = "copy";
    bx.filter = "blur(" + Math.max(1, Math.round(bw / 52)) + "px)";
    bx.drawImage(canvas, 0, 0, bw, bh);
    bx.filter = "none";
    bx.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.globalCompositeOperation = P.invert ? "multiply" : "lighter";
    ctx.globalAlpha = Math.min(0.55, strength);
    ctx.drawImage(bloomBuf, 0, 0, W, H);
    ctx.restore();
  }

  /* 끌개는 점을 캔버스에 바로 찍지 않고 밀도를 쌓아 정규화한다.
     버퍼는 크기가 같으면 다시 쓴다. 프레임마다 새로 잡으면 4K에서
     메모리가 출렁인다. */
  let attBuf = null;

  /* ── 3D 뼈대 ──────────────────────────────────────────────────
     studio-meshes.js 가 실어 온 좌표를 쓴다. 남의 원본 파일도, 원본이
     렌더된 그림도 화면에 나가지 않는다. 남은 것은 꼭짓점과 모서리 번호
     뿐이고, 선과 점은 아래 코드가 매 프레임 다시 긋는다. 그래야
     "전부 코드로 그린다"는 말이 그대로 남는다.
     출처와 라이선스는 assets/mesh/LICENSE.md 에 있다(전부 CC0).

     한 바퀴가 정확히 DUR 이다. 그래야 마지막 프레임이 첫 프레임으로
     이어진다. */
  const MESH_TABLE = global.StudioMeshes || null;
  /* 삼각형이 없는 것은 안 쓴다. 브라우저에 옛 studio-meshes.js 가
     캐시로 남아 있으면 꼭짓점만 들어 있어, 그대로 쓰면 그리다 멈춘다.
     주소에 판 번호를 달아 두었지만 그것만 믿지 않는다. */
  const MESH_IDS = (global.StudioMeshIds || [])
    .filter((id) => MESH_TABLE && MESH_TABLE[id] && MESH_TABLE[id].t && MESH_TABLE[id].t.length);
  let meshPos = null;
  /* 꼭짓점마다 "빛이 얼마나 닿았나". 0이면 그늘, 1이면 정면으로 받는다.
     면과 법선이 없으므로 가운데에서 꼭짓점으로 뻗는 방향을 법선으로 친다.
     덩어리진 물건에는 이 어림이 잘 맞는다. 두상·해골·주전자처럼
     우리가 받아 둔 것들이 다 그렇다. */
  let meshLit = null;
  /* 돌아간 뒤의 3D 좌표. 삼각형의 법선을 재려면 화면 좌표만으로는 안 된다. */
  let meshXYZ = null;
  /* 돌아간 뒤의 꼭짓점 법선. */
  let meshNrm = null;

  /** 시드마다 다른 모델을 고른다. 뼈대가 안 실렸으면 null. */
  function meshOf() {
    if (!MESH_IDS.length) return null;
    return MESH_TABLE[MESH_IDS[Math.floor(seeds[880].a * MESH_IDS.length) % MESH_IDS.length]];
  }

  /** 모서리 목록. 삼각형에서 뽑아 모델에 붙여 둔다.
      삼각형과 모서리를 둘 다 담으면 파일만 커진다. 한 번만 뽑으면 되는
      일이라 브라우저에서 만든다. */
  function meshEdges(m) {
    if (m._e) return m._e;
    const T = m.t, seen = new Set(), E = [];
    for (let i = 0; i + 2 < T.length; i += 3) {
      const v = [T[i], T[i + 1], T[i + 2]];
      for (let j = 0; j < 3; j++) {
        const a = v[j], b = v[(j + 1) % 3];
        const key = a < b ? a * 65536 + b : b * 65536 + a;
        if (seen.has(key)) continue;
        seen.add(key);
        E.push(a, b);
      }
    }
    m._e = E;
    return E;
  }

  /** 꼭짓점 법선. 삼각형마다 잰 법선을 꼭짓점에서 평균 낸다.
      삼각형 하나하나의 법선만 쓰면, 솎으면서 뒤집힌 몇 개가 그대로
      드러나 흑백 바둑판처럼 보인다(라디오 모델이 그랬다). 꼭짓점에
      붙은 여러 면을 함께 재면 뒤집힌 몇 개는 나머지에 밀려난다.
      한 번만 재면 되는 일이라 모델에 붙여 둔다. */
  function meshNormals(m) {
    if (m._n) return m._n;
    const v = m.v, T = m.t, n = (v.length / 3) | 0;
    const N = new Float32Array(n * 3);
    for (let i = 0; i + 2 < T.length; i += 3) {
      const a = T[i], b = T[i + 1], c = T[i + 2];
      const ax = v[a * 3], ay = v[a * 3 + 1], az = v[a * 3 + 2];
      const ux = v[b * 3] - ax, uy = v[b * 3 + 1] - ay, uz = v[b * 3 + 2] - az;
      const vx = v[c * 3] - ax, vy = v[c * 3 + 1] - ay, vz = v[c * 3 + 2] - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const j of [a, b, c]) { N[j * 3] += nx; N[j * 3 + 1] += ny; N[j * 3 + 2] += nz; }
    }
    for (let i = 0; i < n; i++) {
      const L = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1;
      N[i * 3] /= L; N[i * 3 + 1] /= L; N[i * 3 + 2] /= L;
    }
    m._n = N;
    return N;
  }

  /** 회전·기울임·원근을 한 번에.
      결과는 꼭짓점마다 [화면x, 화면y, 앞뒤(0 멀다 ~ 1 가깝다)] 세 값. */
  function meshProject(m, t, wobble) {
    const v = m.v, n = (v.length / 3) | 0;
    /* 좌표는 0~2047 정수로 담겨 있다. -0.5~0.5 로 편다. */
    const Q = m.q || 2048, QH = Q * 0.5;
    if (!meshPos || meshPos.length < n * 3) meshPos = new Float32Array(n * 3);
    if (!meshLit || meshLit.length < n) meshLit = new Float32Array(n);
    if (!meshXYZ || meshXYZ.length < n * 3) meshXYZ = new Float32Array(n * 3);
    if (!meshNrm || meshNrm.length < n * 3) meshNrm = new Float32Array(n * 3);
    const N0 = meshNormals(m);
    const p = meshPos;
    const ph = (t / DUR) * TAU;
    const spin = P.motion === "still" ? 0 : ph;
    const cy = Math.cos(spin), sy = Math.sin(spin);
    /* 기울기는 시드에서 한 번 정해지고 그대로 간다. 매 프레임 흔들면
       같은 작품 번호가 늘 같은 구도로 안 나온다. */
    const tilt = (seeds[881].b - 0.5) * 0.9 + 0.18;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    /* 크기와 자리는 시드마다 조금씩 다르다. 전부 한가운데 같은 크기로
       세우면 열여섯 모델이 다 제품 사진처럼 보인다. 화면 밖으로 나가지
       않는 선에서만 흔든다(반지름 0.43 + 치우침 0.07 < 0.5). */
    const R = Math.min(W, H) * (0.72 + (seeds[882].c - 0.5) * 0.26) * clamp(k.scale, 0.5, 1.4);
    const OX = W * (seeds[883].d - 0.5) * 0.26;
    const OY = H * (seeds[884].a - 0.5) * 0.13;
    const DIST = 2.6;
    const bob = Math.sin(ph) * 0.03;         /* 주기가 DUR 이라 루프가 맞는다 */
    for (let i = 0; i < n; i++) {
      let x = (v[i * 3] - QH) / Q, y = (v[i * 3 + 1] - QH) / Q + bob, z = (v[i * 3 + 2] - QH) / Q;
      if (wobble) {
        const s = seeds[i % seeds.length];
        const a = ph + s.a * TAU;            /* 주기 DUR, 배수도 정수라 루프 유지 */
        x += Math.sin(a) * wobble * (0.4 + s.b * 0.6);
        y += Math.cos(a * 2) * wobble * (0.4 + s.c * 0.6);
        z += Math.sin(a * 2) * wobble * (0.4 + s.d * 0.6);
      }
      const X = x * cy + z * sy;
      let Z = z * cy - x * sy;
      const Y = y * ct - Z * st;
      Z = y * st + Z * ct;
      const w = DIST / (DIST - Z);
      p[i * 3]     = W / 2 + OX + X * R * w;
      p[i * 3 + 1] = H / 2 + OY - Y * R * w;
      p[i * 3 + 2] = clamp(Z * 1.6 + 0.5, 0, 1);
      /* 빛은 왼쪽 위 앞에서 든다. 안토넬로도 뒤러도 그 자리에 두었다.
         돌아간 뒤의 좌표로 재야 물건이 돌 때 빛이 따라 돌지 않는다. */
      const len = Math.hypot(X, Y, Z) || 1;
      meshLit[i] = clamp((X * -0.55 + Y * 0.62 + Z * 0.56) / len, 0, 1);
      meshXYZ[i * 3] = X; meshXYZ[i * 3 + 1] = Y; meshXYZ[i * 3 + 2] = Z;
      /* 법선은 자리 이동 없이 방향만 같은 각도로 돈다 */
      const mx0 = N0[i * 3], my0 = N0[i * 3 + 1], mz0 = N0[i * 3 + 2];
      const NX = mx0 * cy + mz0 * sy;
      let NZ = mz0 * cy - mx0 * sy;
      const NY = my0 * ct - NZ * st;
      NZ = my0 * st + NZ * ct;
      meshNrm[i * 3] = NX; meshNrm[i * 3 + 1] = NY; meshNrm[i * 3 + 2] = NZ;
    }
    return p;
  }

  /* ── 글자를 긋는 손 ────────────────────────────────────────
     상자 [bx,by,bw,bh] 안에 자모 획을 긋는다. reveal 0~1 은 "여기까지만
     그었다"는 뜻이다. 글자가 한 획씩 쓰이는 것처럼 보인다. */
  function jamoDraw(strokes, bx, by, bw, bh, reveal) {
    const n = strokes.length;
    const per = 1 / n;
    for (let i = 0; i < n; i++) {
      const r = clamp((reveal - i * per) / per, 0, 1);
      if (r <= 0) break;
      const st = strokes[i];
      ctx.beginPath();
      if (st[0] === "o") {
        /* ㅇ·ㅎ의 동그라미. 상자가 납작하면 같이 납작해진다.
           한글에서 ㅇ은 원이 아니라 자리에 맞춰 눌리는 획이다. */
        ctx.ellipse(bx + st[1] * bw, by + st[2] * bh, st[3] * bw, st[3] * bh,
                    0, -Math.PI / 2, -Math.PI / 2 + TAU * r);
      } else {
        /* 마디 길이를 재서 r 만큼만 긋는다 */
        let tot = 0;
        const pt = [];
        for (let j = 1; j < st.length; j += 2) pt.push([bx + st[j] * bw, by + st[j + 1] * bh]);
        for (let j = 1; j < pt.length; j++) tot += Math.hypot(pt[j][0] - pt[j - 1][0], pt[j][1] - pt[j - 1][1]);
        let want = tot * r;
        ctx.moveTo(pt[0][0], pt[0][1]);
        for (let j = 1; j < pt.length && want > 0; j++) {
          const L = Math.hypot(pt[j][0] - pt[j - 1][0], pt[j][1] - pt[j - 1][1]);
          const f = Math.min(1, want / Math.max(1e-6, L));
          ctx.lineTo(pt[j - 1][0] + (pt[j][0] - pt[j - 1][0]) * f,
                     pt[j - 1][1] + (pt[j][1] - pt[j - 1][1]) * f);
          want -= L;
        }
      }
      ctx.stroke();
    }
  }

  /** 음절 하나. 초성·중성·종성을 실제 조판 자리에 놓는다. */
  function syllable(ci, ji, ki, bx, by, bw, bh, reveal) {
    const cho = CHO_IDS[ci % CHO_IDS.length];
    const jid = JUNG_IDS[ji % JUNG_IDS.length];
    const jong = JONG_IDS[ki % JONG_IDS.length];
    const B = syllableBoxes(JUNG[jid].v === 1, !!jong);
    const put = (strokes, box, r) => {
      if (!box || r <= 0) return;
      jamoDraw(strokes, bx + box[0] * bw, by + box[1] * bh, box[2] * bw, box[3] * bh, r);
    };
    /* 쓰는 차례대로 드러난다. 초성 → 중성 → 종성. */
    put(CHO[cho],    B[0], clamp(reveal * 3,       0, 1));
    put(JUNG[jid].s, B[1], clamp(reveal * 3 - 1,   0, 1));
    if (jong) put(CHO[jong], B[2], clamp(reveal * 3 - 2, 0, 1));
  }

  /** 5×7 점판 글자. 켜진 칸마다 cb(열, 행)을 부른다. */
  function glyph57(ch, cb) {
    const g = FONT57[ch];
    if (!g) return;
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let c = 0; c < 5; c++) if (row & (1 << (4 - c))) cb(c, r);
    }
  }

  /* 켜졌다 꺼지는 한 바퀴. 0에서 시작해 1에서 다시 0으로 돌아온다.
     그래야 마지막 프레임이 첫 프레임과 이어진다. */
  function breathe(ph) {
    if (ph < 0.32) return ph / 0.32;
    if (ph < 0.80) return 1;
    return 1 - (ph - 0.80) / 0.20;
  }

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
      ctx.globalCompositeOperation = ADD;
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
      ctx.globalCompositeOperation = ADD;
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
      /* 0.8 * S 그대로 두면 미리보기(640px)에서 0.27픽셀이 되어 화면의
         한 점보다 가늘어진다. 4K에서는 멀쩡한데 고객 화면에서는 백지로
         보였다. 어느 크기에서도 한 점은 넘게 잡는다. */
      ctx.lineWidth = Math.max(0.9, 0.8 * S);
      /* 선이 적을수록 한 가닥이 진해야 한다. 알파를 고정해 두었더니
         성긴 변주일수록 옅어져, 성기게 만들라고 한 것이 안 보이게
         만들라는 뜻이 되어 있었다. */
      const alpha = (0.05 + 0.16 * k.contrast) * (1 + (1 - k.density) * 1.6);
      ctx.globalCompositeOperation = ADD;
      for (let i = 0; i < N; i++) {
        const a1 = (i / N) * TAU + ph * 0.2;
        const a2 = ((i * jump) / N) * TAU + ph * 0.2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
        ctx.lineTo(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R);
        ctx.strokeStyle = tone(i % 3, alpha);
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
        /* 접점. 신호가 지나가는 것처럼 밝기가 돈다.

           이 스타일은 프레임 사이 변화가 채널당 0.01/255 다. 320×180에서
           재 봤다. 눈에는 정지 화면이다. 고칠까 하다가 두었다. 이유는
           둘이다. 첫째, 이미 나간 BN2- 번호가 이 그림을 쓴다. 그리는
           방식을 바꾸면 그 번호가 다른 그림이 된다. 둘째, 멈춰 있는 것이
           흠이 아니다. 벽에 오래 걸어 두는 화면은 오히려 이쪽이 낫다.
           움직임이 필요하면 신호(barcode)나 칠획(segment)이 있다. */
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
      ctx.globalCompositeOperation = ADD;
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
        ctx.globalCompositeOperation = ADD;
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

    /* 41 파문 — 물에 떨어뜨린 자리마다 동심원. 겹치는 곳이 밝아진다. */
    ripple(t) {
      const ph = motionPhase(t);
      const src = 2 + Math.round(k.density * 6);
      const maxR = Math.max(W, H) * 0.75 * k.scale;
      ctx.globalCompositeOperation = ADD;
      ctx.lineWidth = Math.max(0.9, 1.6 * S);
      for (let i = 0; i < src; i++) {
        const s = seeds[i + 330];
        const cx = W * (0.15 + 0.7 * s.a), cy = H * (0.15 + 0.7 * s.b);
        const rings = 8 + Math.round(k.density * 20);
        for (let j = 0; j < rings; j++) {
          /* 고리는 계속 밖으로 나가고, 끝에 닿으면 다시 안에서 태어난다. */
          const u = ((j / rings) + (ph / TAU) * (0.3 + s.c * 0.7) * k.speed) % 1;
          const r = u * maxR;
          if (r < 1) continue;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
          ctx.strokeStyle = tone(i % 4, (1 - u) * 0.4 * (0.3 + k.contrast));
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    },

    /* 42 간섭무늬 — 결이 다른 두 격자를 겹치면 없던 무늬가 생긴다. */
    moire(t) {
      const ph = motionPhase(t);
      const gap = Math.max(3 * S, Math.min(W, H) * 0.012 * k.scale);
      const layers = 2 + Math.round(k.density * 2);
      const diag = Math.hypot(W, H);
      ctx.lineWidth = Math.max(0.9, gap * 0.34);
      for (let L = 0; L < layers; L++) {
        const s = seeds[L + 346];
        ctx.save();
        ctx.translate(W / 2, H / 2);
        /* 각도 차이가 아주 작아야 무늬가 크게 나온다. */
        ctx.rotate(s.a * TAU + Math.sin(ph + L) * 0.06 * (0.3 + k.speed));
        ctx.strokeStyle = tone(L % 4, 0.12 + 0.30 * k.contrast);
        ctx.beginPath();
        for (let y = -diag / 2; y < diag / 2; y += gap * (1 + L * 0.07)) {
          ctx.moveTo(-diag / 2, y); ctx.lineTo(diag / 2, y);
        }
        ctx.stroke();
        ctx.restore();
      }
    },

    /* 43 리사주 — 가로세로 진동수의 비가 곧 모양이 된다. */
    lissajous(t) {
      const ph = motionPhase(t);
      const n = 1 + Math.round(k.density * 7);
      const R = Math.min(W, H) * 0.38 * k.scale;
      ctx.globalCompositeOperation = ADD;
      ctx.lineWidth = Math.max(0.9, 1.5 * S);
      for (let i = 0; i < n; i++) {
        const s = seeds[i + 352];
        const a = 1 + Math.floor(s.a * 5), b = 1 + Math.floor(s.b * 5);
        const d = s.c * TAU + ph * (0.2 + s.d) * k.speed;
        ctx.beginPath();
        for (let j = 0; j <= 400; j++) {
          const u = (j / 400) * TAU;
          const x = W / 2 + Math.sin(a * u + d) * R * (0.6 + 0.4 * s.d);
          const y = H / 2 + Math.sin(b * u) * R * 0.7;
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = tone(i % 4, 0.18 + 0.42 * k.contrast);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    },

    /* 44 끌개 — 같은 식을 수만 번 되풀이하면 점이 모이는 자리가 생긴다.
       드 용(De Jong) 끌개. 계수 넷이 바뀌면 전혀 다른 형태가 나온다. */
    attractor(t) {
      const ph = motionPhase(t);
      const s = seeds[360];
      /* 계수를 아무 데서나 뽑으면 열에 예닐곱은 한 점으로 수렴해 백지가
         된다. 형태가 남는 것으로 알려진 조합에서 고르고, 씨앗으로 조금만
         흔든다. 흔드는 폭이 크면 다시 무너진다. */
      const SETS = [
        [1.40, -2.30, 2.40, -2.10], [-2.70, -0.09, -0.86, -2.20],
        [1.641, 1.902, 0.316, 1.525], [-2.00, -2.00, -1.20, 2.00],
        [2.01, -2.53, 1.61, -0.33], [-2.24, 0.43, -0.65, -2.43],
        [1.70, 1.70, 0.60, 1.20], [-1.38, 1.50, 1.44, -1.24],
      ];
      const base = SETS[Math.floor(s.a * SETS.length) % SETS.length];
      const wob = Math.sin(ph) * 0.05 * k.speed;
      let a = base[0] + (s.b - 0.5) * 0.12 + wob;
      let b = base[1] + (s.c - 0.5) * 0.12;
      let c = base[2] + (s.d - 0.5) * 0.12;
      let d = base[3] + (s.a - 0.5) * 0.12 - wob;
      /* 흔든 계수가 하필 나쁜 자리에 떨어질 때가 있다. 알려진 조합
         자체가 이 작은 흔들림에서 무너지기도 한다. 짧게 돌려 보고
         쓸 만한지 재고, 아니면 다음 후보로 넘어간다.

         두 번 잘못 쟀다. 넓이로 재면 점 몇 개가 멀리 떨어져 있기만 해도
         통과한다. 처음부터 세면 한참 떠돌다 결국 짧은 궤도로 빨려드는
         계수를 놓친다(문제의 계수는 9만 점을 찍는데 화소 1,376개만
         밟았다). 충분히 태운 뒤, 정상 상태에서, 촘촘한 격자로 센다. */
      const rich = (aa, bb, cc, dd) => {
        let px = 0.1, py = 0.1;
        for (let i = 0; i < 6000; i++) {
          const nx = Math.sin(aa * py) - Math.cos(bb * px);
          py = Math.sin(cc * px) - Math.cos(dd * py); px = nx;
        }
        const seen = new Uint8Array(16384);
        let cells = 0;
        for (let i = 0; i < 4000; i++) {
          const nx = Math.sin(aa * py) - Math.cos(bb * px);
          py = Math.sin(cc * px) - Math.cos(dd * py); px = nx;
          const gx = Math.min(127, Math.max(0, ((px + 2) / 4 * 128) | 0));
          const gy = Math.min(127, Math.max(0, ((py + 2) / 4 * 128) | 0));
          const idx = gy * 128 + gx;
          if (!seen[idx]) { seen[idx] = 1; cells++; }
        }
        return cells > 300;      /* 정상은 960 이상, 무너진 것은 20 남짓 */
      };
      if (!rich(a, b, c, d)) {
        /* 시작한 자리에서 한 바퀴 돈다. 어느 씨앗이든 반드시 하나는 찾는다. */
        const start = Math.floor(s.a * SETS.length) % SETS.length;
        for (let i = 0; i < SETS.length; i++) {
          const g = SETS[(start + i) % SETS.length];
          if (rich(g[0], g[1], g[2], g[3])) { a = g[0]; b = g[1]; c = g[2]; d = g[3]; break; }
        }
      }
      /* 점을 옅은 알파로 그냥 찍으면, 자취가 얇게 퍼지는 계수에서는
         화면이 비어 보인다. 알파를 올리면 이번엔 뭉치는 계수가 하얗게
         타버린다. 그래서 밀도를 먼저 세고, 가장 진한 곳을 기준으로
         정규화해 칠한다. 어떤 계수를 만나도 한 장의 그림이 된다. */
      const BW = Math.min(W, 1600), BH = Math.max(1, Math.round(BW * H / W));
      if (!attBuf || attBuf.w !== BW || attBuf.h !== BH) {
        const bc = document.createElement("canvas");
        bc.width = BW; bc.height = BH;
        const bx = bc.getContext("2d");
        attBuf = { w: BW, h: BH, dens: new Float32Array(BW * BH), cv: bc, ctx: bx, img: bx.createImageData(BW, BH) };
      }
      const dens = attBuf.dens;
      dens.fill(0);

      const N = Math.round(26000 + k.density * 120000);
      const R = Math.min(BW, BH) * 0.23 * k.scale;
      let x = 0.1, y = 0.1, peak = 0;
      for (let i = 0; i < N; i++) {
        const nx = Math.sin(a * y) - Math.cos(b * x);
        y = Math.sin(c * x) - Math.cos(d * y);
        x = nx;
        if (i < 60) continue;                 /* 자리를 잡을 때까지는 버린다 */
        const ix = (BW / 2 + x * R) | 0, iy = (BH / 2 + y * R) | 0;
        if (ix < 0 || ix >= BW || iy < 0 || iy >= BH) continue;
        const v = ++dens[iy * BW + ix];
        if (v > peak) peak = v;
      }
      if (peak > 0) {
        const hexRGB = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
        const lo = hexRGB(TONES[2 % TONES.length]);
        const hi = hexRGB(TONES[0]);
        const px8 = attBuf.img.data;
        /* 감마를 눕혀야 옅은 자취가 보인다. 선형으로 매기면 가장 진한
           몇 점만 남고 나머지는 검게 죽는다. */
        const gain = 0.6 + 0.8 * k.contrast;
        for (let i = 0, p = 0; i < dens.length; i++, p += 4) {
          const dv = dens[i];
          if (dv <= 0) { px8[p + 3] = 0; continue; }
          let v = Math.pow(dv / peak, 0.36) * gain;
          if (v > 1) v = 1;
          px8[p]     = lo[0] + (hi[0] - lo[0]) * v;
          px8[p + 1] = lo[1] + (hi[1] - lo[1]) * v;
          px8[p + 2] = lo[2] + (hi[2] - lo[2]) * v;
          px8[p + 3] = v * 255;
        }
        attBuf.ctx.putImageData(attBuf.img, 0, 0);
        ctx.save();
        ctx.shadowBlur = 0;                   /* 4만 점에 그림자를 달면 멈춘다 */
        ctx.globalCompositeOperation = ADD;
        ctx.drawImage(attBuf.cv, 0, 0, W, H);
        ctx.restore();
      }
    },

    /* 45 슬릿스캔 — 세로 띠마다 시간을 어긋나게 읽는다. 한 장에 여러 순간. */
    slitscan(t) {
      const ph = motionPhase(t);
      const cols = 24 + Math.round(k.density * 90);
      const cw = W / cols;
      const sk = 1.6 * k.scale;
      for (let i = 0; i < cols; i++) {
        const u = i / cols;
        /* 띠마다 시간이 다르다. 왼쪽은 과거, 오른쪽은 현재. */
        const tt = ph + u * TAU * (0.4 + 0.9 * k.speed);
        const v = fbm(u * 3 * sk + Math.cos(tt) * 0.5, Math.sin(tt) * 0.5 + u * sk, 3);
        const hgt = H * (0.12 + 0.76 * (0.5 + v * 0.6));
        const y = (H - hgt) / 2 + Math.sin(tt + u * 6) * H * 0.06;
        ctx.fillStyle = tone(Math.floor((v + 1) * 2) % 4, 0.16 + 0.5 * k.contrast);
        ctx.fillRect(i * cw, y, cw + 1, hgt);
      }
    },

    /* 46 도트매트릭스 — LED 패널 그 자체. 점 하나가 화소 하나다. */
    dotmatrix(t) {
      const ph = motionPhase(t);
      const pitch = Math.max(5 * S, Math.min(W, H) * 0.028 / Math.max(0.4, k.scale));
      const r = pitch * 0.34;
      const sp = 0.4 + k.speed * 1.6;
      /* 점 하나마다 경로를 열고 닫으면 3천 개에서 이미 느려진다.
         밝기를 여덟 단계로 묶어, 같은 단계끼리 한 경로에 모아 한 번에
         칠한다. LED 패널도 실제로 계단 단위로 밝기를 낸다. */
      const STEPS = 8;
      const paths = [];
      for (let i = 0; i < STEPS; i++) paths.push(null);
      const ox = Math.cos(ph) * sp, oy = Math.sin(ph) * sp;
      for (let y = pitch / 2; y < H; y += pitch) {
        for (let x = pitch / 2; x < W; x += pitch) {
          const v = fbm(x / W * 4 + ox, y / H * 4 + oy, 3);
          const b = Math.max(0, Math.min(1, 0.5 + v * 0.9));
          if (b < 0.16) continue;             /* 꺼진 화소는 그리지 않는다 */
          const st = Math.min(STEPS - 1, Math.floor(b * STEPS));
          let pth = paths[st];
          if (!pth) { pth = paths[st] = new Path2D(); }
          const rr = r * (0.45 + 0.55 * b);
          /* moveTo 없이 arc를 이으면 앞 점에서 선이 딸려 온다.
             점이 아니라 그물이 그려지고, 채우기도 훨씬 무거워진다. */
          pth.moveTo(x + rr, y);
          pth.arc(x, y, rr, 0, TAU);
        }
      }
      for (let st = 0; st < STEPS; st++) {
        const pth = paths[st];
        if (!pth) continue;
        const b = (st + 0.5) / STEPS;
        ctx.fillStyle = b > 0.72 ? tone(3, (b - 0.5) * 1.6 * k.contrast)
                                 : tone(b > 0.45 ? 1 : 2, b * 0.7 * (0.4 + k.contrast));
        ctx.fill(pth);
      }
    },

    /* 47 파형 — 오실로스코프. 신호가 겹쳐 흐르는 화면. */
    oscillo(t) {
      const ph = motionPhase(t);
      const lines = 2 + Math.round(k.density * 10);
      ctx.globalCompositeOperation = ADD;
      ctx.lineWidth = Math.max(1, 1.8 * S);
      ctx.lineJoin = "round";
      for (let i = 0; i < lines; i++) {
        const s = seeds[i + 366];
        const y0 = H * (0.12 + 0.76 * (i + 0.5) / lines);
        const amp = H * (0.03 + 0.10 * s.a) * k.scale;
        const f1 = 1 + Math.floor(s.b * 6), f2 = 1 + Math.floor(s.c * 11);
        ctx.beginPath();
        for (let j = 0; j <= 260; j++) {
          const u = j / 260;
          const y = y0
            + Math.sin(u * TAU * f1 + ph * (0.5 + s.d) * k.speed) * amp
            + Math.sin(u * TAU * f2 - ph * k.speed) * amp * 0.4;
          j ? ctx.lineTo(u * W, y) : ctx.moveTo(u * W, y);
        }
        ctx.strokeStyle = tone(i % 4, 0.16 + 0.44 * k.contrast);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    },

    /* 48 로우폴리 — 삼각형 면으로만 이루어진 지형. 면마다 빛이 다르다. */
    lowpoly(t) {
      const ph = motionPhase(t);
      const cell = Math.max(18 * S, Math.min(W, H) * 0.11 / Math.max(0.4, k.scale));
      const cx = Math.ceil(W / cell) + 1, cy = Math.ceil(H / cell) + 1;
      const px = (i, j) => {
        const n = fbm(i * 0.6, j * 0.6, 2);
        return [i * cell + n * cell * 0.42, j * cell + fbm(j * 0.6, i * 0.6, 2) * cell * 0.42];
      };
      for (let j = 0; j < cy; j++) {
        for (let i = 0; i < cx; i++) {
          const a = px(i, j), b = px(i + 1, j), c = px(i, j + 1), d = px(i + 1, j + 1);
          [[a, b, c], [b, d, c]].forEach((tri, ti) => {
            const v = fbm(i * 0.5 + ti * 0.31 + Math.cos(ph) * 0.6, j * 0.5 + Math.sin(ph) * 0.6, 3);
            const l = Math.max(0, Math.min(1, 0.5 + v * 0.8));
            ctx.beginPath();
            ctx.moveTo(tri[0][0], tri[0][1]);
            ctx.lineTo(tri[1][0], tri[1][1]);
            ctx.lineTo(tri[2][0], tri[2][1]);
            ctx.closePath();
            ctx.fillStyle = tone(Math.floor(l * 3.99), 0.14 + 0.62 * l * k.contrast);
            ctx.fill();
          });
        }
      }
    },

    /* 49 아이소 도시 — 비스듬히 내려다본 블록. 높이는 지형에서 온다. */
    isocity(t) {
      const ph = motionPhase(t);
      const n = 5 + Math.round(k.density * 12);
      const u = Math.min(W, H) * 0.09 * k.scale;          /* 블록 반폭 */
      const ox = W / 2, oy = H * 0.34;
      for (let gy = -n; gy <= n; gy++) {
        for (let gx = -n; gx <= n; gx++) {
          const x = ox + (gx - gy) * u;
          const y = oy + (gx + gy) * u * 0.5;
          if (x < -u * 2 || x > W + u * 2 || y < -u * 4 || y > H + u * 2) continue;
          const hv = fbm(gx * 0.32 + Math.cos(ph) * 0.4, gy * 0.32 + Math.sin(ph) * 0.4, 3);
          const hgt = Math.max(0, hv + 0.35) * u * 4.2;
          if (hgt < u * 0.15) continue;
          /* 윗면 · 왼면 · 오른면. 밝기를 달리해 입체가 선다. */
          const top = [[x, y - hgt], [x + u, y - hgt + u * 0.5], [x, y - hgt + u], [x - u, y - hgt + u * 0.5]];
          const face = (pts, tn, al) => {
            ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
            ctx.closePath(); ctx.fillStyle = tone(tn, al); ctx.fill();
          };
          face([[x - u, y - hgt + u * 0.5], [x, y - hgt + u], [x, y + u], [x - u, y + u * 0.5]], 3, 0.16 + 0.34 * k.contrast);
          face([[x, y - hgt + u], [x + u, y - hgt + u * 0.5], [x + u, y + u * 0.5], [x, y + u]], 2, 0.12 + 0.24 * k.contrast);
          face(top, 0, 0.22 + 0.55 * k.contrast);
        }
      }
    },

    /* 50 가지 — 하나의 획이 둘로 갈라지기를 되풀이한다. */
    branch(t) {
      const ph = motionPhase(t);
      const depth = 6 + Math.round(k.density * 5);
      const len0 = Math.min(W, H) * 0.24 * k.scale;
      ctx.lineCap = "round";
      const grow = (x, y, ang, len, d) => {
        if (d <= 0 || len < 1.2) return;
        const s = seeds[(d * 7 + Math.floor(x) % 23 + 372) % 900];
        const sway = Math.sin(ph + d * 0.7 + s.a * TAU) * 0.16 * k.speed;
        const x2 = x + Math.cos(ang + sway) * len;
        const y2 = y + Math.sin(ang + sway) * len;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2);
        ctx.strokeStyle = d > depth * 0.55 ? inkA(0.18 + 0.4 * k.contrast)
                                           : tone(d % 4, 0.16 + 0.44 * k.contrast);
        ctx.lineWidth = Math.max(0.9, d * 0.9 * S);
        ctx.stroke();
        const spread = 0.32 + s.b * 0.42;
        grow(x2, y2, ang - spread, len * (0.62 + s.c * 0.16), d - 1);
        grow(x2, y2, ang + spread, len * (0.62 + s.d * 0.16), d - 1);
      };
      const trunks = 1 + Math.round(k.density * 3);
      for (let i = 0; i < trunks; i++) {
        const s = seeds[i + 376];
        grow(W * (0.5 + (i - (trunks - 1) / 2) * 0.26 + (s.a - 0.5) * 0.06), H * 1.02,
          -Math.PI / 2 + (s.b - 0.5) * 0.3, len0 * (0.8 + s.c * 0.4), depth);
      }
    },

    /* 51 만다라 — 하나의 결을 원 둘레로 되풀이한다. 중심이 전부다. */
    mandala(t) {
      const ph = motionPhase(t);
      const arms = 6 + Math.round(k.density * 18);
      const rings = 3 + Math.round(k.density * 7);
      const R = Math.min(W, H) * 0.42 * k.scale;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(ph * 0.15 * k.speed);
      for (let r = 1; r <= rings; r++) {
        const s = seeds[r + 380];
        const rr = R * (r / rings);
        const wob = Math.sin(ph * (0.5 + s.a) + r) * 0.5 + 0.5;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU);
        ctx.strokeStyle = inkA(0.08 + 0.16 * k.contrast);
        ctx.lineWidth = Math.max(0.9, 1 * S); ctx.stroke();
        for (let a = 0; a < arms; a++) {
          const th = (a / arms) * TAU + (r % 2 ? Math.PI / arms : 0);
          const x = Math.cos(th) * rr, y = Math.sin(th) * rr;
          const sz = R * 0.055 * (0.5 + wob) * (1.2 - r / rings * 0.5);
          ctx.beginPath();
          if (r % 3 === 0) ctx.arc(x, y, sz, 0, TAU);
          else {
            /* 꽃잎 하나. 중심을 향해 뾰족하게. */
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(Math.cos(th + 0.16) * (rr - sz * 2), Math.sin(th + 0.16) * (rr - sz * 2),
              Math.cos(th) * (rr - sz * 3), Math.sin(th) * (rr - sz * 3));
            ctx.quadraticCurveTo(Math.cos(th - 0.16) * (rr - sz * 2), Math.sin(th - 0.16) * (rr - sz * 2), x, y);
          }
          ctx.fillStyle = tone((r + a) % 4, 0.14 + 0.5 * k.contrast * (0.4 + wob * 0.6));
          ctx.fill();
        }
      }
      ctx.restore();
    },

    /* 52 한지 — 젖은 종이에 먹이 번진다. 경계가 없는 것이 경계다. */
    hanji(t) {
      const ph = motionPhase(t);
      const blots = 5 + Math.round(k.density * 22);
      for (let i = 0; i < blots; i++) {
        const s = seeds[i + 388];
        const cx = W * (0.1 + 0.8 * s.a) + Math.cos(ph + s.c * TAU) * W * 0.02 * k.speed;
        const cy = H * (0.1 + 0.8 * s.b) + Math.sin(ph + s.d * TAU) * H * 0.02 * k.speed;
        const R = Math.min(W, H) * (0.05 + 0.22 * s.c) * k.scale;
        /* 번짐은 가장자리가 우툴두툴하다. 매끈한 원은 먹이 아니다. */
        ctx.beginPath();
        for (let j = 0; j <= 72; j++) {
          const a = (j / 72) * TAU;
          const rr = R * (0.72 + 0.5 * (fbm(Math.cos(a) * 1.6 + i, Math.sin(a) * 1.6 + i, 3) + 0.4));
          const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        const g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.15);
        g.addColorStop(0, tone(i % 4, 0.34 * (0.4 + k.contrast)));
        g.addColorStop(1, tone(i % 4, 0));
        ctx.fillStyle = g; ctx.fill();
      }
      /* 종이 결. 아주 옅은 세로 섬유. */
      ctx.lineWidth = Math.max(0.9, 0.8 * S);
      for (let i = 0; i < 90; i++) {
        const s = seeds[i + 410];
        ctx.strokeStyle = inkA(0.03 + 0.05 * k.contrast);
        ctx.beginPath();
        ctx.moveTo(W * s.a, 0); ctx.lineTo(W * s.a + (s.b - 0.5) * W * 0.06, H);
        ctx.stroke();
      }
    },

    /* 53 블라인드 — 날개가 물결처럼 돌아간다. 움직이는 패널의 결. */
    blinds(t) {
      const ph = motionPhase(t);
      const n = 6 + Math.round(k.density * 26);
      const h = H / n;
      for (let i = 0; i < n; i++) {
        const u = i / n;
        /* 날개마다 조금씩 늦게 돌아간다. 그래서 파도처럼 보인다. */
        const a = Math.sin(ph * (0.6 + k.speed) - u * 5.2) * 0.5 + 0.5;
        const open = 0.12 + 0.88 * a;
        const y = i * h + h / 2;
        ctx.save();
        ctx.translate(0, y);
        ctx.scale(1, Math.max(0.04, open));
        ctx.fillStyle = tone(i % 4, 0.16 + 0.5 * k.contrast * (0.35 + a * 0.65));
        ctx.fillRect(0, -h / 2, W, h * 0.92);
        ctx.restore();
        /* 날개 아래 그림자. 두께가 느껴진다. */
        ctx.fillStyle = inkA(0.05 + 0.08 * (1 - a));
        ctx.fillRect(0, y + h * open * 0.46, W, Math.max(1, h * 0.06));
      }
    },

    /* 54 자기장 — 두 극 사이를 흐르는 선. 눈에 안 보이는 것의 모양. */
    magnet(t) {
      const ph = motionPhase(t);
      const poles = [];
      const np = 2 + Math.round(k.density * 3);
      for (let i = 0; i < np; i++) {
        const s = seeds[i + 420];
        poles.push({
          x: W * (0.2 + 0.6 * s.a) + Math.cos(ph + s.c * TAU) * W * 0.05 * k.speed,
          y: H * (0.2 + 0.6 * s.b) + Math.sin(ph + s.d * TAU) * H * 0.05 * k.speed,
          q: i % 2 ? 1 : -1,
        });
      }
      const lines = 20 + Math.round(k.density * 60);
      const step = Math.max(2, 3.4 * S);
      ctx.lineWidth = Math.max(0.9, 1.1 * S);
      ctx.globalCompositeOperation = ADD;
      for (let i = 0; i < lines; i++) {
        const s = seeds[i + 430];
        const p0 = poles[i % poles.length];
        const a0 = (i / lines) * TAU + s.a * 0.4;
        let x = p0.x + Math.cos(a0) * step * 3, y = p0.y + Math.sin(a0) * step * 3;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let j = 0; j < 160; j++) {
          let fx = 0, fy = 0;
          for (const p of poles) {
            const dx = x - p.x, dy = y - p.y;
            const d2 = dx * dx + dy * dy + 40;
            const f = (p.q * p0.q > 0 ? 1 : -1) * p.q / d2;
            fx += dx * f; fy += dy * f;
          }
          const m = Math.hypot(fx, fy) || 1;
          x += (fx / m) * step; y += (fy / m) * step;
          if (x < -W || x > W * 2 || y < -H || y > H * 2) break;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = tone(i % 4, 0.10 + 0.30 * k.contrast);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    },

    /* 55 계단 지형 — 등고선 사이를 칠한다. 높이가 층으로 보인다. */
    terrace(t) {
      const ph = motionPhase(t);
      const levels = 4 + Math.round(k.density * 14);
      const g = Math.max(4, 7 * S / Math.max(0.5, k.scale));
      const sk = 2.2 / Math.max(0.4, k.scale);
      const cols = Math.ceil(W / g), rows = Math.ceil(H / g);
      /* 높이는 한 번만 잰다. 층마다 다시 재면 같은 계산을 열여덟 번
         되풀이하게 되고, 한 장 그리는 데 255밀리초가 걸렸다. */
      const field = new Float32Array(cols * rows);
      const ox = Math.cos(ph) * 0.3, oy = Math.sin(ph) * 0.3;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          field[j * cols + i] = fbm((i * g) / W * sk + ox, (j * g) / H * sk + oy, 4);
        }
      }
      /* 층을 겹겹이 덮어 그리면 칸 하나를 열여덟 번 칠하게 된다.
         칸마다 제 층을 정해 한 번만 칠하고, 옆 칸이 같은 층이면 이어서
         한 번에 칠한다. 그림은 같고 속도만 달라진다. */
      const lv = new Uint8Array(cols * rows);
      for (let i = 0; i < lv.length; i++) {
        let L = Math.floor(((field[i] + 0.35) / 0.95) * levels);
        lv[i] = L < 0 ? 0 : L >= levels ? levels - 1 : L;
      }
      const fills = [];
      for (let L = 0; L < levels; L++) {
        fills.push(tone(Math.floor((L / levels) * 3.99), 0.10 + 0.42 * (L / levels) * (0.4 + k.contrast)));
      }
      for (let j = 0; j < rows; j++) {
        let i = 0;
        while (i < cols) {
          const L = lv[j * cols + i];
          let e = i + 1;
          while (e < cols && lv[j * cols + e] === L) e++;
          ctx.fillStyle = fills[L];
          ctx.fillRect(i * g, j * g, (e - i) * g + 1, g + 1);
          i = e;
        }
      }
    },

    /* 56 직조 — 씨줄과 날줄. 위아래가 번갈아 지나간다. */
    weave(t) {
      const ph = motionPhase(t);
      const n = 4 + Math.round(k.density * 18);
      const cw = W / n, ch = H / Math.max(1, Math.round(n * H / W));
      const rows = Math.max(1, Math.round(n * H / W));
      const bw = cw * 0.62, bh = ch * 0.62;
      const wob = (i) => Math.sin(ph * (0.4 + k.speed) + i * 0.6) * Math.min(cw, ch) * 0.12;
      /* 아래로 지나가는 줄을 먼저, 위로 지나가는 줄을 나중에 그린다. */
      for (let pass = 0; pass < 2; pass++) {
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < n; i++) {
            const over = (i + j) % 2 === pass;
            if (!over) continue;
            const x = i * cw + cw / 2, y = j * ch + ch / 2;
            ctx.fillStyle = tone((i + j * 2) % 4, 0.16 + 0.5 * k.contrast);
            if (pass === 0) ctx.fillRect(x - bw / 2 + wob(j), y - ch / 2 - 1, bw, ch + 2);
            else ctx.fillRect(x - cw / 2 - 1, y - bh / 2 + wob(i), cw + 2, bh);
          }
        }
      }
    },
    /* ── VJ 풍 여덟 종 ─────────────────────────────────────────
       현장에서 음악에 맞춰 트는 화면의 결이다. 박자에 맞춰 끊어지고,
       가운데로 빨려들고, 훑고 지나간다.

       무지개는 쓰지 않는다. 집 규칙이기도 하고, 무지개를 넣는 순간
       어느 회사가 만들었는지 알 수 없는 화면이 된다. 박자만 VJ의 것을
       빌리고 색은 팔레트 그대로 쓴다.

       박자는 DUR 을 정수 개로 쪼개 만든다. 정수라야 이어 붙였을 때
       끊기지 않는다. */

    /* 57 스트로브 — 격자가 박자에 맞춰 번쩍인다. */
    strobe(t) {
      const B = 16;                          /* 한 바퀴에 열여섯 박 */
      const u = (t / DUR) * B;
      const bi = Math.floor(u), bf = u - bi;
      const cols = 3 + Math.round(k.density * 9);
      const rows = Math.max(2, Math.round(cols * H / W));
      const cw = W / cols, ch = H / rows;
      /* 박마다 켜지는 칸이 달라진다. 씨앗에서 뽑으니 언제 봐도 같은 순서다. */
      const on = 1 + Math.round(k.density * cols * rows * 0.5);
      /* 꺼진 순간에도 바탕 격자는 남긴다.
         벽에는 정지 화면 한 장만 보인다. 박과 박 사이에 걸리면 검은 판이
         되고, 고객은 그 칸을 영영 고르지 않는다. */
      ctx.strokeStyle = inkA(0.05 + 0.10 * k.contrast);
      ctx.lineWidth = Math.max(0.9, 1 * S);
      for (let gx = 1; gx < cols; gx++) {
        ctx.beginPath(); ctx.moveTo(gx * cw, 0); ctx.lineTo(gx * cw, H); ctx.stroke();
      }
      for (let gy = 1; gy < rows; gy++) {
        ctx.beginPath(); ctx.moveTo(0, gy * ch); ctx.lineTo(W, gy * ch); ctx.stroke();
      }
      /* 박 안에서 사그라들되 바닥을 둔다. 완전히 꺼지면 화면이 사라진다. */
      const fade = 0.34 + 0.66 * Math.pow(1 - bf, 1.6);
      for (let i = 0; i < on; i++) {
        const s = seeds[(bi * 37 + i * 11 + 440) % 900];
        const cx = Math.floor(s.a * cols), cy = Math.floor(s.b * rows);
        ctx.fillStyle = tone(i % 4, (0.12 + 0.62 * k.contrast) * fade);
        ctx.fillRect(cx * cw, cy * ch, cw * 0.94, ch * 0.94);
      }
      /* 박이 바뀌는 순간 화면 전체가 한 번 밝아진다 */
      if (bf < 0.12) {
        ctx.fillStyle = inkA(0.05 * (1 - bf / 0.12) * k.contrast);
        ctx.fillRect(0, 0, W, H);
      }
    },

    /* 58 터널 — 앞으로 끝없이 빨려 들어간다. */
    tunnel(t) {
      const ph = t / DUR;
      const rings = 10 + Math.round(k.density * 26);
      const cx = W / 2, cy = H / 2;
      const R = Math.max(W, H) * 0.8 * k.scale;
      const sides = 3 + Math.floor(seeds[441].a * 5);   /* 삼각~칠각 */
      ctx.lineWidth = Math.max(0.9, 1.6 * S);
      ctx.globalCompositeOperation = ADD;
      for (let i = 0; i < rings; i++) {
        /* 0~1 을 한 바퀴 도는 깊이. 정수 주기라 완전 루프다. */
        const z = ((i / rings) + ph * (0.5 + k.speed)) % 1;
        const r = R * z * z;                  /* 멀수록 촘촘하게 */
        if (r < 2) continue;
        const rot = z * Math.PI * (sides % 2 ? 0.6 : 0.4) + ph * TAU * 0.1;
        ctx.beginPath();
        for (let j = 0; j <= sides; j++) {
          const a = (j / sides) * TAU + rot;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * (H / W) * 1.4;
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = tone(i % 4, (1 - z) * 0.55 * (0.4 + k.contrast));
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    },

    /* 59 스펙트럼 — 소리를 보는 그 막대. 소리는 없고 결만 빌린다. */
    bars(t) {
      const n = 8 + Math.round(k.density * 40);
      const ph = t / DUR;
      const gap = W / n;
      const bw = gap * 0.62;
      for (let i = 0; i < n; i++) {
        const s = seeds[i + 450];
        /* 정수 주파수 셋을 겹쳐 높낮이를 만든다. 소리 대신 규칙이다. */
        const v = (Math.sin((ph * TAU) * (1 + Math.floor(s.a * 4)) + i * 0.7) * 0.5 + 0.5) *
                  (Math.sin((ph * TAU) * (2 + Math.floor(s.b * 3)) + s.c * TAU) * 0.3 + 0.7);
        const hgt = H * (0.06 + 0.82 * v * k.scale * 0.8);
        const x = i * gap + (gap - bw) / 2;
        ctx.fillStyle = tone(i % 4, 0.18 + 0.55 * k.contrast);
        ctx.fillRect(x, H - hgt, bw, hgt);
        /* 꼭대기 표시. VJ 화면에서 눈이 따라가는 선이다. */
        const cap = H - hgt - Math.max(2, 4 * S);
        ctx.fillStyle = inkA(0.5 + 0.4 * k.contrast);
        ctx.fillRect(x, cap, bw, Math.max(1.5, 2.5 * S));
      }
    },

    /* 60 만화경 — 한 조각을 거울로 되풀이한다. */
    kaleido(t) {
      const ph = motionPhase(t);
      const wedges = 6 + 2 * Math.floor(seeds[460].a * 4);   /* 6·8·10·12 */
      const n = 6 + Math.round(k.density * 22);
      const R = Math.min(W, H) * 0.52 * k.scale;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.globalCompositeOperation = ADD;
      for (let w = 0; w < wedges; w++) {
        ctx.save();
        ctx.rotate((w / wedges) * TAU + ph * 0.12 * k.speed);
        if (w % 2) ctx.scale(1, -1);          /* 거울 */
        for (let i = 0; i < n; i++) {
          const s = seeds[i + 462];
          const rr = R * (0.12 + 0.86 * s.a);
          const aa = (s.b - 0.5) * (TAU / wedges) * 0.9;
          const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr;
          const sz = R * (0.012 + 0.055 * s.c) * (0.6 + 0.5 * Math.sin(ph + s.d * TAU));
          ctx.beginPath();
          if (s.d < 0.5) ctx.arc(x, y, Math.abs(sz), 0, TAU);
          else { ctx.moveTo(x, y - sz); ctx.lineTo(x + sz, y + sz); ctx.lineTo(x - sz, y + sz); ctx.closePath(); }
          ctx.fillStyle = tone((i + w) % 4, 0.10 + 0.34 * k.contrast);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    },

    /* 61 지형 비행 — 격자 지형 위를 낮게 난다. */
    flythrough(t) {
      const ph = t / DUR;
      const rows = 10 + Math.round(k.density * 22);
      const cols = 12 + Math.round(k.density * 20);
      const hor = H * 0.42;                   /* 지평선 */
      ctx.lineWidth = Math.max(0.9, 1.2 * S);
      ctx.globalCompositeOperation = ADD;
      for (let r = 0; r < rows; r++) {
        /* 줄이 앞으로 다가온다. 한 바퀴에 정수 번 돌아 완전 루프. */
        const z = ((r / rows) + ph * (0.6 + k.speed)) % 1;
        const p = z * z;                      /* 원근 */
        const y = hor + (H - hor) * p;
        const sp = W * (0.06 + 1.9 * p);      /* 그 줄의 폭 */
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
          const u = c / cols - 0.5;
          const hh = fbm(u * 3 * k.scale + r * 0.21, r * 0.21 + ph * 2, 3);
          const x = W / 2 + u * sp;
          const yy = y - hh * (H * 0.10) * p * k.scale;
          c ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
        }
        ctx.strokeStyle = tone(r % 4, (0.06 + 0.5 * p) * (0.4 + k.contrast));
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    },

    /* 62 비트 폭발 — 박마다 가운데서 터져 나간다. */
    burst(t) {
      const B = 8;
      const u = (t / DUR) * B;
      const bi = Math.floor(u), bf = u - bi;
      const cx = W / 2, cy = H / 2;
      const rays = 8 + Math.round(k.density * 46);
      const R = Math.max(W, H) * 0.62 * k.scale;
      ctx.lineCap = "round";
      ctx.globalCompositeOperation = ADD;
      /* 앞 박의 잔상까지 네 겹을 겹친다. 두 겹이면 박과 박 사이에 화면이
         비어, 정지 화면으로 봤을 때 아무것도 없는 칸이 된다.
         수명을 길게 잡아 늘 무언가 날아가는 중이게 한다. */
      const LIFE = 3.2;
      for (let b = 0; b < 4; b++) {
        const f = bf + b;
        if (f > LIFE) continue;
        const grow = 1 - Math.pow(1 - Math.min(1, f / LIFE), 3);
        const fade = Math.pow(1 - Math.min(1, f / LIFE), 1.2);
        for (let i = 0; i < rays; i++) {
          const s = seeds[((bi - b) * 53 + i * 7 + 470 + 900) % 900];
          const a = (i / rays) * TAU + s.a * 0.6;
          const r0 = R * grow * (0.35 + 0.65 * s.b);
          const r1 = r0 + R * 0.10 * (0.4 + s.c);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
          ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.strokeStyle = tone(i % 4, 0.5 * fade * (0.4 + k.contrast));
          ctx.lineWidth = Math.max(0.9, (1 + 2.4 * s.d) * S * fade);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    },

    /* 63 플라스마 — 데모신에서 온 결. 사인 몇 개가 겹쳐 무늬가 된다. */
    plasma(t) {
      const ph = t / DUR;
      /* 화소마다 계산하면 한 장에 수백 밀리초가 든다. 칸으로 나눠 칠한다. */
      const g = Math.max(4, Math.round(Math.min(W, H) / (18 + k.density * 60)));
      const cols = Math.ceil(W / g), rows = Math.ceil(H / g);
      const sc = 0.045 / Math.max(0.35, k.scale);
      const steps = 5;                        /* 색을 다섯 단으로 끊는다 */
      const fills = [];
      for (let i = 0; i < steps; i++) {
        fills.push(tone(Math.floor((i / steps) * 3.99), 0.10 + 0.5 * (i / (steps - 1)) * (0.4 + k.contrast)));
      }
      for (let j = 0; j < rows; j++) {
        const y = j * g;
        let i = 0;
        while (i < cols) {
          const x = i * g;
          const v = Math.sin(x * sc + ph * TAU) +
                    Math.sin(y * sc * 1.3 + ph * TAU * 2) +
                    Math.sin((x + y) * sc * 0.7 + ph * TAU) +
                    Math.sin(Math.sqrt((x - W / 2) * (x - W / 2) + (y - H / 2) * (y - H / 2)) * sc * 1.1 - ph * TAU * 2);
          let L = Math.floor(((v + 4) / 8) * steps);
          L = L < 0 ? 0 : L >= steps ? steps - 1 : L;
          /* 옆 칸이 같은 단이면 이어서 한 번에 칠한다 */
          let e = i + 1;
          while (e < cols) {
            const x2 = e * g;
            const v2 = Math.sin(x2 * sc + ph * TAU) +
                       Math.sin(y * sc * 1.3 + ph * TAU * 2) +
                       Math.sin((x2 + y) * sc * 0.7 + ph * TAU) +
                       Math.sin(Math.sqrt((x2 - W / 2) * (x2 - W / 2) + (y - H / 2) * (y - H / 2)) * sc * 1.1 - ph * TAU * 2);
            let L2 = Math.floor(((v2 + 4) / 8) * steps);
            L2 = L2 < 0 ? 0 : L2 >= steps ? steps - 1 : L2;
            if (L2 !== L) break;
            e++;
          }
          ctx.fillStyle = fills[L];
          ctx.fillRect(x, y, (e - i) * g + 1, g + 1);
          i = e;
        }
      }
    },

    /* 64 셰브론 — 화살 줄이 끝없이 흘러간다. VJ 루프의 상투다. */
    chevron(t) {
      const ph = t / DUR;
      const rows = 3 + Math.round(k.density * 12);
      const rh = H / rows;
      const w = Math.max(W, H) * 0.06 * k.scale;
      ctx.lineWidth = Math.max(1.2, rh * 0.16);
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      for (let r = 0; r < rows; r++) {
        const s = seeds[r + 480];
        const dir = r % 2 ? 1 : -1;           /* 줄마다 반대로 흐른다 */
        const y = r * rh + rh / 2;
        const span = w * 2.2;
        const off = ((ph * (0.5 + k.speed) * dir) % 1) * span;
        ctx.strokeStyle = tone(r % 4, 0.14 + 0.5 * k.contrast * (0.5 + 0.5 * s.a));
        ctx.beginPath();
        for (let x = -span * 2; x < W + span; x += span) {
          const px = x + off;
          ctx.moveTo(px, y + rh * 0.30);
          ctx.lineTo(px + w * dir, y);
          ctx.lineTo(px, y - rh * 0.30);
        }
        ctx.stroke();
      }
    },

    /* 65 와이어프레임 — CC0 3D 뼈대를 선으로만 다시 긋는다.
       모서리 1,400개를 하나씩 stroke() 하면 값이 감당이 안 된다.
       앞뒤 다섯 칸으로 묶어 다섯 번만 긋는다. */
    wire(t) {
      const m = meshOf();
      if (!m) { STYLES.lowpoly(t); return; }
      const p = meshProject(m, t, 0);
      const e = meshEdges(m), ne = (e.length / 2) | 0;
      /* 밀도가 낮으면 모서리를 솎는다. 규칙적으로 건너뛰어야 프레임이
         바뀌어도 같은 모서리가 빠져 그림이 깜빡이지 않는다. */
      const keep = Math.max(1, Math.round(1 / clamp(0.28 + k.density * 0.9, 0.14, 1)));
      const BUCK = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let b = 0; b < BUCK; b++) {
        const d = (b + 0.5) / BUCK;
        ctx.lineWidth = Math.max(0.7, S * (0.9 + d * 2.4));
        ctx.strokeStyle = tone(3 - Math.min(3, b), (0.10 + 0.58 * d) * k.contrast);
        ctx.beginPath();
        for (let i = 0; i < ne; i += keep) {
          const a = e[i * 2], c = e[i * 2 + 1];
          const dm = (p[a * 3 + 2] + p[c * 3 + 2]) * 0.5;
          if (Math.min(BUCK - 1, Math.floor(dm * BUCK)) !== b) continue;
          ctx.moveTo(p[a * 3], p[a * 3 + 1]);
          ctx.lineTo(p[c * 3], p[c * 3 + 1]);
        }
        ctx.stroke();
      }
    },

    /* 66 점군 — 같은 뼈대에서 꼭짓점만 남겨 흩뿌린다.
       arc() 는 느리고 moveTo 를 빠뜨리면 점끼리 선으로 이어진다.
       도트매트릭스에서 한 번 당한 자리라 여기는 fillRect 로 찍는다. */
    pointcloud(t) {
      const m = meshOf();
      if (!m) { STYLES.constellation(t); return; }
      const p = meshProject(m, t, 0.008 + 0.026 * k.speed);
      const n = (m.v.length / 3) | 0;
      const e = meshEdges(m), ne = (e.length / 2) | 0;
      /* 꼭짓점 500여 개만 찍으면 형태가 안 읽힌다. 뼈만 남은 별자리처럼
         보인다. 모서리 위에도 점을 앉혀 윤곽을 메운다. 자리는 시드에서
         한 번 정해지므로 프레임이 넘어가도 점이 떨리지 않는다. */
      const PER = 2 + Math.round(k.density * 5);
      const BUCK = 6;
      ctx.globalCompositeOperation = ADD;
      for (let b = 0; b < BUCK; b++) {
        const d = (b + 0.5) / BUCK;
        const rv = Math.max(1, S * (1.6 + d * 3.6));
        const re = Math.max(1, S * (1.0 + d * 2.0));
        ctx.fillStyle = tone(3 - Math.min(3, b), (0.20 + 0.62 * d) * k.contrast);
        for (let i = 0; i < n; i++) {
          if (Math.min(BUCK - 1, Math.floor(p[i * 3 + 2] * BUCK)) !== b) continue;
          ctx.fillRect(p[i * 3] - rv * 0.5, p[i * 3 + 1] - rv * 0.5, rv, rv);
        }
        for (let i = 0; i < ne; i++) {
          const a = e[i * 2], c = e[i * 2 + 1];
          const da = p[a * 3 + 2], dc = p[c * 3 + 2];
          if (Math.min(BUCK - 1, Math.floor((da + dc) * 0.5 * BUCK)) !== b) continue;
          const ax = p[a * 3], ay = p[a * 3 + 1], bx = p[c * 3], by = p[c * 3 + 1];
          const s = seeds[i % seeds.length];
          for (let j = 0; j < PER; j++) {
            const u = (j + 0.2 + s.b * 0.6) / PER;
            ctx.fillRect(ax + (bx - ax) * u - re * 0.5, ay + (by - ay) * u - re * 0.5, re, re);
          }
        }
      }
      ctx.globalCompositeOperation = "source-over";
    },

    /* 67 홀로그램 — 뼈대를 빛으로 쌓고 주사선과 훑는 띠를 얹는다. */
    hologram(t) {
      const m = meshOf();
      if (!m) { STYLES.neonsign(t); return; }
      const p = meshProject(m, t, 0);
      const e = meshEdges(m), ne = (e.length / 2) | 0;
      const ph = t / DUR;
      ctx.globalCompositeOperation = ADD;
      ctx.lineCap = "round";
      const BUCK = 4;
      for (let b = 0; b < BUCK; b++) {
        const d = (b + 0.5) / BUCK;
        ctx.lineWidth = Math.max(0.8, S * (0.8 + d * 1.8));
        ctx.strokeStyle = tone(b === BUCK - 1 ? 1 : 2, (0.08 + 0.36 * d) * k.contrast);
        ctx.beginPath();
        for (let i = 0; i < ne; i++) {
          const a = e[i * 2], c = e[i * 2 + 1];
          const dm = (p[a * 3 + 2] + p[c * 3 + 2]) * 0.5;
          if (Math.min(BUCK - 1, Math.floor(dm * BUCK)) !== b) continue;
          ctx.moveTo(p[a * 3], p[a * 3 + 1]);
          ctx.lineTo(p[c * 3], p[c * 3 + 1]);
        }
        ctx.stroke();
      }
      /* 가로 주사선 한 벌. 한 번에 긋는다. */
      const gap = Math.max(3, Math.round(6 * S * 1.4));
      ctx.lineWidth = 1;
      ctx.strokeStyle = tone(0, 0.05 + 0.06 * k.contrast);
      ctx.beginPath();
      for (let y = 0.5; y < H; y += gap) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      /* 위로 훑고 지나가는 띠. 한 바퀴에 두 번이라 루프가 맞는다. */
      const bandH = H * 0.16;
      const by = (1 - ((ph * 2) % 1)) * (H + bandH) - bandH;
      const g = ctx.createLinearGradient(0, by, 0, by + bandH);
      g.addColorStop(0, tone(1, 0));
      g.addColorStop(0.5, tone(1, 0.09 + 0.11 * k.glow));
      g.addColorStop(1, tone(1, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, by, W, bandH);
      ctx.globalCompositeOperation = "source-over";
    },

    /* 68 자모 — 한글 한 글자가 획 순서대로 쓰인다.
       뒤에는 활자 견본판처럼 작은 글자들이 움직이지 않고 깔린다.
       자모는 획이라서 좌표로 적을 수 있다. 라틴 알파벳보다 오히려
       코드로 긋기 좋다. 우리가 대구에서 만드는 물건에 이만한 재료가
       따로 없다. */
    jamo(t) {
      const ph = t / DUR;
      const pick = (i, n) => Math.floor(seeds[700 + i].a * n);

      /* 뒤판 — 견본지. 정지해 있다. */
      const gx = 3 + Math.round(k.density * 5);
      const gy = Math.max(2, Math.round(gx * H / W));
      const bw = W / gx, bh = H / gy;
      const pad = Math.min(bw, bh) * 0.22;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(0.8, Math.min(bw, bh) * 0.035);
      ctx.strokeStyle = tone(2, 0.05 + 0.10 * k.contrast);
      for (let j = 0; j < gy; j++) {
        for (let i = 0; i < gx; i++) {
          const s = seeds[((j * gx + i) * 3 + 40) % seeds.length];
          const side = Math.min(bw, bh) - pad * 2;
          syllable(Math.floor(s.a * 14), Math.floor(s.b * 10), Math.floor(s.c * 15),
                   i * bw + (bw - side) / 2, j * bh + (bh - side) / 2, side, side, 1);
        }
      }

      /* 앞 글자 — 한 획씩 쓰인다.
         번짐을 먼저 깔고 획을 그 위에 올린다. 순서를 바꾸면 옅은 번짐이
         본 획을 덮어 흐려진다. 붓도 먹이 번진 자리 위에 획이 남는다. */
      const side = Math.min(W, H) * 0.52 * clamp(k.scale, 0.6, 1.4);
      const cx = (W - side) / 2, cy = (H - side) / 2;
      const ci = pick(0, 14), ji = pick(1, 10), ki = pick(2, 15);
      const rev = breathe(ph);
      ctx.lineWidth = Math.max(2.4, side * 0.10 * k.contrast);
      ctx.strokeStyle = tone(2, 0.10 * k.accent + 0.05);
      syllable(ci, ji, ki, cx, cy, side, side, rev);
      ctx.lineWidth = Math.max(1.6, side * 0.055 * k.contrast);
      ctx.strokeStyle = tone(0, Math.min(0.95, 0.45 + 0.40 * k.contrast));
      syllable(ci, ji, ki, cx, cy, side, side, rev);
    },

    /* 69 활자판 — 1876년 Plaque Découpée Universelle.
       글자를 통째로 새기지 않고, 격자에서 잘라낸 조각을 이어 붙여 만든다.
       처음에는 켜진 칸마다 아무 조각이나 놓았는데 글자가 하나도 안 읽혔다.
       조각은 이웃을 보고 골라야 한다. 좌우가 이어지면 가로 막대, 꺾이면
       사분원, 끝이면 짧은 획에 둥근 마무리. 그래야 획이 이어진다.
       판을 가로지르는 빛줄기가 지나간 자리만 밝아진다. */
    pdu(t) {
      const ph = t / DUR;
      const n = 3 + Math.floor(seeds[720].a * 3);
      const cols = n * 6 - 1, rows = 7;
      const cw = Math.min(W * 0.76 / cols, H * 0.52 / rows) * clamp(k.scale, 0.7, 1.2);
      const ox = (W - cols * cw) / 2, oy = (H - rows * cw) / 2;
      const band = ph * (cols + rows + 8) - 4;
      const R = cw / 2, LW = Math.max(1.2, cw * 0.30);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = LW;
      for (let li = 0; li < n; li++) {
        const g = FONT57[FONT57_LETTERS[Math.floor(seeds[721 + li].b * 26)]];
        const on = (c, r) => (r >= 0 && r < 7 && c >= 0 && c < 5) ? !!(g[r] & (1 << (4 - c))) : false;
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 5; c++) {
            if (!on(c, r)) continue;
            const cx = li * 6 + c;
            const x = ox + cx * cw, y = oy + r * cw;
            const mx = x + R, my = y + R;
            const lit = Math.abs(cx + r - band) < 2.2;
            ctx.strokeStyle = ctx.fillStyle = lit
              ? tone(0, 0.55 + 0.45 * k.accent)
              : tone(2, 0.20 + 0.42 * k.contrast);
            const L = on(c - 1, r), Rt = on(c + 1, r), U = on(c, r - 1), D = on(c, r + 1);
            const cnt = (L ? 1 : 0) + (Rt ? 1 : 0) + (U ? 1 : 0) + (D ? 1 : 0);
            ctx.beginPath();
            if (cnt === 0) {                       /* 외딴 칸 — 점 */
              ctx.arc(mx, my, LW * 0.42, 0, TAU); ctx.fill(); continue;
            }
            if (cnt === 2 && ((L && Rt) || (U && D))) {          /* 곧은 획 */
              if (L && Rt) { ctx.moveTo(x, my); ctx.lineTo(x + cw, my); }
              else { ctx.moveTo(mx, y); ctx.lineTo(mx, y + cw); }
            } else if (cnt === 2) {                              /* 꺾임 — 사분원 */
              const px = Rt ? x + cw : x, py = D ? y + cw : y;
              const a0 = Rt ? (D ? Math.PI : Math.PI * 0.5) : (D ? Math.PI * 1.5 : 0);
              ctx.arc(px, py, R, a0, a0 + Math.PI * 0.5);
            } else {                                             /* 갈래·끝 — 가운데서 뻗는다 */
              if (L)  { ctx.moveTo(mx, my); ctx.lineTo(x, my); }
              if (Rt) { ctx.moveTo(mx, my); ctx.lineTo(x + cw, my); }
              if (U)  { ctx.moveTo(mx, my); ctx.lineTo(mx, y); }
              if (D)  { ctx.moveTo(mx, my); ctx.lineTo(mx, y + cw); }
            }
            ctx.stroke();
          }
        }
      }
    },

    /* 70 신호 — 데이터를 막대로 바꾼 판.
       류지 이케다의 test pattern 이 하는 일이 이것이다. 무엇이든 0과 1로
       바꾸고, 그 줄무늬 자체를 화면에 세운다. 부드럽게 흐르지 않는다.
       한 바퀴에 여섯 번 딱딱 끊어 바뀐다. */
    barcode(t) {
      const ph = t / DUR;
      const STEPS = 6;
      const step = Math.floor(ph * STEPS) % STEPS;
      /* 띠는 얇게. 처음에 화면 높이의 40%를 흰 막대로 채웠더니 여백이
         하나도 안 남아 그림이 아니라 무늬가 됐다. 아래위를 비운다. */
      const y0 = H * 0.37, bh = H * 0.26;
      let x = 0, i = 0;
      const unit = Math.max(1.2, W / (60 + k.density * 260));
      ctx.beginPath();
      ctx.fillStyle = tone(0, 0.58 + 0.36 * k.contrast);
      while (x < W && i < 900) {
        const s = seeds[(step * 149 + i * 7) % seeds.length];
        const w = unit * (1 + Math.floor(s.a * 4));
        /* 셋에 하나쯤만 세운다. 막대가 빽빽하면 줄무늬가 아니라 판이 된다. */
        if (s.b > 0.66) {
          /* 키가 다른 막대가 섞여야 신호처럼 읽힌다 */
          const hh = s.c > 0.72 ? bh : bh * (0.28 + 0.34 * s.d);
          ctx.rect(x, s.d > 0.5 ? y0 : y0 + bh - hh, w, hh);
        }
        x += w; i++;
      }
      ctx.fill();
      /* 아래에 0과 1 한 줄. 막대와 같은 값에서 나온다. */
      const dh = Math.max(4, H * 0.030), dw = dh * 5 / 7;
      const gap = dw * 1.5;
      const cnt = Math.min(160, Math.floor(W * 0.86 / gap));
      const sx = (W - cnt * gap) / 2, sy = y0 + bh + H * 0.07;
      ctx.fillStyle = tone(1, 0.34 + 0.34 * k.contrast);
      ctx.beginPath();
      for (let c = 0; c < cnt; c++) {
        const s = seeds[(step * 149 + c * 7) % seeds.length];
        glyph57(s.b > 0.66 ? "1" : "0", (gc, gr) => {
          ctx.rect(sx + c * gap + gc * dw / 5, sy + gr * dh / 7, dw / 5 * 0.85, dh / 7 * 0.85);
        });
      }
      ctx.fill();
      /* 위아래 기준선. 시험 신호에는 늘 자가 붙어 있다. */
      ctx.strokeStyle = tone(2, 0.30);
      ctx.lineWidth = Math.max(1, S);
      ctx.beginPath();
      for (const yy of [y0 - H * 0.045, y0 + bh + H * 0.045]) {
        ctx.moveTo(W * 0.06, yy); ctx.lineTo(W * 0.94, yy);
      }
      ctx.stroke();
    },

    /* 71 칠획 — 일곱 획으로 숫자를 만드는 표시기.
       꺼진 획도 옅게 남긴다. 꺼진 자리가 보여야 표시기로 읽힌다. */
    segment(t) {
      const ph = t / DUR;
      const STEPS = 10;
      const step = Math.floor(ph * STEPS) % STEPS;
      /* 줄 수를 먼저 정하고 거기서 글자 크기를 뽑는다.
         칸 너비부터 정했더니 16:9 에서 늘 한 줄만 나왔다. 표시기는
         여러 줄이 늘어서야 계기판으로 읽힌다. */
      const rows = 2 + Math.round(k.density * 4);
      const chh = H * 0.74 / (rows * 1.34);
      const cw = chh / 1.62;
      const cols = Math.max(3, Math.floor(W * 0.84 / cw));
      const ox = (W - cols * cw) / 2, oy = (H - rows * chh * 1.34) / 2 + chh * 0.17;
      const SEG = [[0.12,0.05,0.88,0.05],[0.92,0.09,0.92,0.46],[0.92,0.54,0.92,0.91],
                   [0.12,0.95,0.88,0.95],[0.08,0.54,0.08,0.91],[0.08,0.09,0.08,0.46],
                   [0.12,0.50,0.88,0.50]];
      const ON = [0b0111111,0b0000110,0b1011011,0b1001111,0b1100110,
                  0b1101101,0b1111101,0b0000111,0b1111111,0b1101111];
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(1.1, cw * 0.11);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const s = seeds[((r * cols + c) * 5 + 300) % seeds.length];
          const d = (Math.floor(s.a * 10) + step * (1 + Math.floor(s.b * 3))) % 10;
          const bright = s.c < 0.18 + 0.3 * k.accent;
          const x = ox + c * cw, y = oy + r * chh * 1.34;
          const gw = cw * 0.70, gh = chh;
          for (let g = 0; g < 7; g++) {
            const on = (ON[d] >> g) & 1;
            ctx.strokeStyle = on
              ? tone(bright ? 0 : 1, (bright ? 0.55 : 0.24) + 0.4 * k.contrast * (bright ? 1 : 0.5))
              : tone(3, 0.10 + 0.10 * k.contrast);
            ctx.beginPath();
            ctx.moveTo(x + SEG[g][0] * gw, y + SEG[g][1] * gh);
            ctx.lineTo(x + SEG[g][2] * gw, y + SEG[g][3] * gh);
            ctx.stroke();
          }
        }
      }
    },

    /* 72 문자 명암 — 밝기를 글자로 바꾼다.
       옅은 자리에는 획이 적은 글자, 짙은 자리에는 획이 많은 글자.
       그림이 글자로 되어 있다는 것이 가까이 가야 보인다. */
    asciiart(t) {
      const ph = motionPhase(t);
      /* 칸을 키우고 빈칸을 늘린다.
         처음엔 화면을 글자로 가득 채웠더니 그림이 아니라 잡음이 됐다.
         멀리서 형태가 보이고 가까이 가야 글자인 걸 알아채야 한다.
         그러려면 칠하지 않은 자리가 넉넉해야 한다. */
      const cols = 10 + Math.round(k.density * 14);
      const cw = W / cols;
      const rows = Math.max(4, Math.round(H / (cw * 1.42)));
      const rh = H / rows;
      const dw = cw / 5 * 0.90, dh = rh / 7 * 0.90;
      const zoom = 1.1 / clamp(k.scale, 0.5, 2);
      const R = FONT57_RAMP, RN = R.length;
      /* 덩어리를 먼저 세우고 잡음은 그 위에 얹는다.
         잡음만으로 명암을 내면 글자가 부스러기처럼 흩어져 형태가 안
         생긴다. 한 번 그렇게 나왔다. 멀리서 형태가 보이고, 가까이 가야
         글자인 걸 알아채는 순서여야 한다. */
      const ex = 0.30 + seeds[760].a * 0.40, ey = 0.32 + seeds[760].b * 0.36;
      const mass = (c, r) => {
        const u = (c + 0.5) / cols - ex, v = (r + 0.5) / rows - ey;
        return clamp(1.22 - Math.hypot(u * 1.7, v * 2.0) * 1.65, 0, 1);
      };
      /* 톤을 넷으로 나눠, 색이 같은 것끼리 한 번에 칠한다.
         글자마다 fillStyle 을 바꾸면 그것만으로 값이 든다. */
      for (let b = 0; b < 4; b++) {
        ctx.fillStyle = tone(3 - b, (0.18 + 0.60 * ((b + 0.5) / 4)) * k.contrast);
        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const v = fbm(c * zoom * 0.12 + Math.cos(ph) * 0.5,
                          r * zoom * 0.18 + Math.sin(ph) * 0.5, 3);
            const l = clamp(mass(c, r) * (0.74 + 0.62 * v), 0, 0.999);
            if (l < 0.14) continue;                    /* 빈칸으로 둔다 */
            if (Math.floor(l * 4) !== b) continue;
            const ch = R[Math.min(RN - 1, Math.floor(l * RN))];
            const x = c * cw, y = r * rh;
            glyph57(ch, (gc, gr) => ctx.rect(x + gc * cw / 5, y + gr * rh / 7, dw, dh));
          }
        }
        ctx.fill();
      }
    },

    /* 73 무질서 — 같은 네모를 줄지어 놓고, 조금씩 흐트러뜨린다.
       베라 몰나르가 1968년부터 하던 일이다. 규칙을 세우고 그 규칙을
       아주 조금씩 어긴다. 어긋남이 왼쪽 위에서 오른쪽 아래로 커진다. */
    desordre(t) {
      const ph = t / DUR;
      const gx = 4 + Math.round(k.density * 12);
      /* 가로세로 여백을 따로 잡는다. min(W,H) 하나로 잡았더니 16:9 에서
         좌우가 6% 밖에 안 남아 격자가 화면에 꽉 찼다. */
      const mx = W * 0.11, my = H * 0.13;
      const cw = (W - mx * 2) / gx;
      const gy = Math.max(2, Math.floor((H - my * 2) / cw));
      const oy = (H - gy * cw) / 2;
      const side = cw * 0.72 * clamp(k.scale, 0.6, 1.3);
      /* 흐트러짐이 한 바퀴 동안 커졌다 돌아온다 */
      const amp = 0.30 + 0.70 * (0.5 - 0.5 * Math.cos(ph * TAU));
      ctx.lineJoin = "miter";
      ctx.lineCap = "butt";
      ctx.lineWidth = Math.max(0.9, cw * 0.055 * k.contrast);
      for (let b = 0; b < 3; b++) {
        ctx.strokeStyle = tone(b, 0.24 + 0.5 * k.contrast * (1 - b * 0.22));
        ctx.beginPath();
        for (let r = 0; r < gy; r++) {
          for (let c = 0; c < gx; c++) {
            if ((r * gx + c) % 3 !== b) continue;
            /* 어긋남은 왼쪽 위에서 오른쪽 아래로 커진다.
               제곱을 걸어야 앞쪽이 충분히 반듯하게 남는다. */
            const grow = ((c + 1) / gx + (r + 1) / gy) * 0.5;
            const d = grow * grow * amp * side * 0.42;
            const x = mx + c * cw + (cw - side) / 2, y = oy + r * cw + (cw - side) / 2;
            const P = [[x, y], [x + side, y], [x + side, y + side], [x, y + side]];
            for (let i = 0; i < 4; i++) {
              /* 모서리마다 다른 씨앗. 네 귀가 따로 놀아야 손으로 그은 것처럼 보인다. */
              const q = seeds[(r * gx + c + i * 200 + 11) % seeds.length];
              const px = P[i][0] + (q.a - 0.5) * 2 * d, py = P[i][1] + (q.b - 0.5) * 2 * d;
              if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
          }
        }
        ctx.stroke();
      }
    },

    /* 74 명암 — 어둠에서 형태가 떠오른다.
       안토넬로 다 메시나의 초상도, 뒤러의 자화상도, 수르바란의 정물도
       같은 자리에서 시작한다. 검은 바탕, 왼쪽 위에서 드는 빛 하나,
       그리고 빛이 닿은 만큼만 보이는 형태. 나머지는 어둠에 둔다.

       처음에는 모서리 위에 점을 촘촘히 찍어 면을 흉내 냈는데 끝내
       점 구름으로만 보였다. 면이 없으면 법선이 없고, 법선이 없으면
       어느 쪽이 빛을 받는지 알 수가 없다. 그래서 뼈대에 삼각형을
       담기로 하고, 여기서는 그 삼각형을 먼 것부터 덮어 칠한다. */
    chiaroscuro(t) {
      const m = meshOf();
      if (!m) { STYLES.inkwash(t); return; }
      const p = meshProject(m, t, 0);
      const nrm = meshNrm;
      const T = m.t, nt = (T.length / 3) | 0;
      const ph = t / DUR;

      /* 방 — 물건 뒤로 아주 옅은 빛 웅덩이. 이게 없으면 물건이 허공에 뜬다. */
      const gl = ctx.createRadialGradient(W * 0.40, H * 0.40, 0, W * 0.40, H * 0.40,
                                          Math.max(W, H) * 0.62);
      gl.addColorStop(0, tone(3, 0.16 + 0.10 * k.glow));
      gl.addColorStop(1, tone(3, 0));
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, W, H);

      /* 먼 삼각형부터 그린다. 면이 서로를 가려야 덩어리로 보인다. */
      const key = new Float32Array(nt), ord = new Array(nt);
      for (let i = 0; i < nt; i++) {
        key[i] = (p[T[i * 3] * 3 + 2] + p[T[i * 3 + 1] * 3 + 2] + p[T[i * 3 + 2] * 3 + 2]) / 3;
        ord[i] = i;
      }
      ord.sort((x, y) => key[x] - key[y]);

      /* 빛이 숨을 쉰다. 촛불 앞에 둔 것처럼. 한 바퀴가 DUR 이라 루프가 맞는다. */
      const breath = 0.90 + 0.10 * Math.sin(ph * TAU);
      const LX = -0.55, LY = 0.62, LZ = 0.56;
      const gain = 0.42 + 0.52 * k.contrast;
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(0.5, S * 0.7);      /* 삼각형 사이 실틈을 메운다 */
      for (let z = 0; z < nt; z++) {
        const i = ord[z];
        const a = T[i * 3], b = T[i * 3 + 1], c = T[i * 3 + 2];
        let nx = (nrm[a * 3] + nrm[b * 3] + nrm[c * 3]) / 3;
        let ny = (nrm[a * 3 + 1] + nrm[b * 3 + 1] + nrm[c * 3 + 1]) / 3;
        let nz = (nrm[a * 3 + 2] + nrm[b * 3 + 2] + nrm[c * 3 + 2]) / 3;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        /* 삼각형을 적어 둔 차례가 모델마다 달라 법선이 앞을 보기도 뒤를
           보기도 한다. 보는 쪽으로 돌려 세운 뒤에 빛을 잰다. 그러면
           적어 둔 차례와 상관없이 같은 결로 밝아진다. */
        if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const lam = Math.max(0, nx * LX + ny * LY + nz * LZ);
        const amt = clamp(0.03 + Math.pow(lam, 1.4) * gain * breath, 0, 1);
        ctx.fillStyle = ctx.strokeStyle =
          shade(amt > 0.58 ? 0 : amt > 0.32 ? 1 : amt > 0.14 ? 2 : 3, amt);
        ctx.beginPath();
        ctx.moveTo(p[a * 3], p[a * 3 + 1]);
        ctx.lineTo(p[b * 3], p[b * 3 + 1]);
        ctx.lineTo(p[c * 3], p[c * 3 + 1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    },

    /* 75 액자 — 어두운 전시실 벽에 걸린 백라이트 액자 한 장.
       사진전에 가면 검은 방에 액자만 빛나고, 오른쪽에 세로로 돌린 작은
       글씨가 붙어 있고, 조금 떨어진 곳에 벽 라벨이 하나 더 있다. 그
       구도 자체가 그림이다. 빛나는 사각 하나와 넓은 어둠.

       처음에는 판을 크게 잡고 안을 환하게 채웠더니 전시실이 아니라
       밝은 포스터가 됐다. 방은 거의 검어야 하고, 판은 화면의 한 귀퉁이만
       차지해야 하고, 빛은 판 안에서만 나야 한다. */
    frame(t) {
      const ph = t / DUR;
      const s0 = seeds[770];
      const cx = W * (0.42 + s0.a * 0.16), cy = H * (0.42 + s0.b * 0.14);

      /* 판 — 검은 마운트에 얹은 인화지. 방보다 아주 조금만 밝다. */
      const pw = Math.min(W * 0.44, H * 0.80) * clamp(k.scale, 0.85, 1.2);
      const pheight = pw * 0.72;
      const px = cx - pw * 0.5, py = cy - pheight * 0.5;
      const capW = pw * 0.24;
      const imW = pw - capW - pw * 0.09;
      const imX = px + pw * 0.05, imY = py + pheight * 0.09, imH = pheight * 0.82;

      /* 벽에 새는 빛. 판 둘레만 아주 옅게 물든다. */
      const room = ctx.createRadialGradient(cx, cy, pw * 0.42, cx, cy, pw * 1.15);
      room.addColorStop(0, tone(2, 0.07 + 0.06 * k.glow));
      room.addColorStop(0.55, tone(2, 0.025 + 0.02 * k.glow));
      room.addColorStop(1, tone(2, 0));
      ctx.fillStyle = room;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = shade(3, 0.10);
      ctx.fillRect(px, py, pw, pheight);

      /* 사진 자리 — 거의 검고, 빛은 세로 결로만 든다.
         우리 결이 그렇다. 어둠 위에 빛을 얹지, 밝은 바탕을 깔지 않는다. */
      ctx.save();
      ctx.beginPath(); ctx.rect(imX, imY, imW, imH); ctx.clip();
      ctx.fillStyle = shade(3, 0.22);
      ctx.fillRect(imX, imY, imW, imH);
      ctx.globalCompositeOperation = ADD;
      const bands = 5 + Math.round(k.density * 16);
      for (let i = 0; i < bands; i++) {
        const s = seeds[(i * 13 + 780) % seeds.length];
        /* 한 바퀴에 정수 번 돌아야 한다.
           0.34배로 두었더니 ph 가 1에 닿을 때 자리가 s.a + 0.02 로 끝나
           이음매에서 띠가 톡 튀었다. renderFrame(150)==renderFrame(0)만
           봐서는 안 잡힌다. 그건 나머지 연산 때문에 언제나 참이다. */
        const u = (s.a + ph * (1 + Math.floor(s.b * 3))) % 1;
        const bw = imW * (0.004 + s.c * 0.030);
        const g = ctx.createLinearGradient(0, imY, 0, imY + imH);
        const a = (0.10 + 0.55 * s.c) * k.contrast;
        g.addColorStop(0, tone(s.d > 0.7 ? 0 : 1, 0));
        g.addColorStop(0.35 + s.d * 0.3, tone(s.d > 0.7 ? 0 : 1, Math.min(0.9, a)));
        g.addColorStop(1, tone(1, 0));
        ctx.fillStyle = g;
        ctx.fillRect(imX + u * imW - bw * 0.5, imY, bw, imH);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
      ctx.strokeStyle = tone(1, 0.10 + 0.14 * k.contrast);
      ctx.lineWidth = Math.max(1, S);
      ctx.strokeRect(imX + 0.5, imY + 0.5, imW, imH);

      /* 오른쪽 세로 글씨. 제목 한 줄 + 잔글씨 몇 줄.
         멀리서는 결로 보이고 가까이 가야 글자가 읽힌다. 전시장 캡션이
         늘 그렇다. */
      const drawRow = (str, x, y, h, alpha, tn) => {
        const w5 = h * 5 / 7;
        ctx.fillStyle = tone(tn, alpha);
        ctx.beginPath();
        for (let i = 0; i < str.length; i++) {
          glyph57(str[i], (gc, gr) => {
            ctx.rect(x + i * w5 * 1.32 + gc * w5 / 5, y + gr * h / 7, w5 / 5 * 0.86, h / 7 * 0.86);
          });
        }
        ctx.fill();
      };
      const code = (Math.floor(s0.c * 0xffffff) >>> 0).toString(16).toUpperCase().padStart(6, "0");
      const th = Math.max(5, pheight * 0.048);
      ctx.save();
      ctx.translate(px + pw - capW * 0.66, py + pheight * 0.91);
      ctx.rotate(-Math.PI / 2);
      drawRow("BN " + code, 0, 0, th, 0.50 + 0.35 * k.contrast, 0);
      const small = th * 0.50;
      for (let r = 0; r < 4; r++) {
        let line = "";
        const n = 12 + Math.floor(seeds[(790 + r) % seeds.length].a * 14);
        for (let i = 0; i < n; i++) {
          const q = seeds[(r * 37 + i * 11 + 800) % seeds.length];
          line += q.a < 0.16 ? " " : (q.b < 0.5 ? FONT57_LETTERS[Math.floor(q.c * 26)]
                                                : FONT57_DIGITS[Math.floor(q.c * 10)]);
        }
        drawRow(line, 0, th * 1.8 + r * small * 1.6, small, 0.13 + 0.09 * k.contrast, 2);
      }
      ctx.restore();

      /* 벽 라벨 — 판과 떨어진 자리에 작게 하나. 이게 있어야 벽이 된다.
         화면 밖으로 나가면 그리지 않는다. */
      const lw = pw * 0.22, lh = lw * 0.60;
      /* 화면 안으로 밀어 넣는다. 넣을 자리가 없으면 아예 안 그린다.
         잘린 라벨은 벽이 아니라 실수로 보인다. */
      const lx = Math.min(px + pw * (0.66 + s0.d * 0.28), W - lw - W * 0.06);
      const ly = Math.min(py + pheight * 1.12, H - lh - H * 0.06);
      if (lx > W * 0.03 && ly > py + pheight * 1.02) {
        ctx.fillStyle = tone(0, 0.07 + 0.07 * k.accent);
        ctx.fillRect(lx, ly, lw, lh);
        const sh = Math.max(3, lh * 0.14);
        for (let r = 0; r < 3; r++) {
          let line = "";
          for (let i = 0; i < 9; i++) {
            const q = seeds[(r * 23 + i * 7 + 830) % seeds.length];
            line += q.a < 0.2 ? " " : FONT57_LETTERS[Math.floor(q.c * 26)];
          }
          drawRow(line, lx + lw * 0.10, ly + lh * 0.20 + r * sh * 1.8, sh, 0.26, 3);
        }
      }
    },

    /* 76 띠그림 — 대각 줄무늬 위로 형상이 옆으로 끝없이 흐른다.
       미술관 천장에 걸린 가로 띠 화면이 하는 일이 이것이다. 색은 두 가지,
       형상은 흑백, 그라데이션 없이 전부 납작하다. 우리가 파는 32:9 패널에
       그대로 맞는 구도라 오래 걸어 두기 좋다.

       한 폭짜리 판을 두 벌 이어 흘린다. 한 바퀴에 정확히 한 폭을 지나가서
       마지막 장이 첫 장으로 그대로 이어진다. */
    frieze(t) {
      const ph = t / DUR;
      const bandH = H * 0.62;
      const y0 = (H - bandH) / 2;
      const WHITE = tone(0, 1), BLACK = shade(3, 0.06);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, y0, W, bandH); ctx.clip();

      /* 대각 줄무늬. 형상보다 느리게 흘러 앞뒤가 갈린다. */
      const sw = Math.max(6, Math.min(W, H) * 0.055 * clamp(k.scale, 0.6, 1.6));
      const soff = (ph * sw * 4) % (sw * 2);
      ctx.fillStyle = tone(1, 0.92);
      ctx.fillRect(0, y0, W, bandH);
      ctx.fillStyle = tone(2, 0.95);
      for (let x = -bandH - sw * 2; x < W + bandH; x += sw * 2) {
        ctx.beginPath();
        ctx.moveTo(x + soff, y0);
        ctx.lineTo(x + soff + sw, y0);
        ctx.lineTo(x + soff + sw + bandH, y0 + bandH);
        ctx.lineTo(x + soff + bandH, y0 + bandH);
        ctx.closePath();
        ctx.fill();
      }

      /* 형상 — 검은 것과 흰 것만. 오려 붙인 것처럼 테두리가 딱 떨어진다. */
      const n = 18 + Math.round(k.density * 64);
      const off = -(ph % 1) * W;
      for (let rep = 0; rep < 2; rep++) {
        const base = off + rep * W;
        for (let i = 0; i < n; i++) {
          const s = seeds[(i * 7 + 850) % seeds.length];
          const s2 = seeds[(i * 7 + 851) % seeds.length];
          const x = base + s.a * W;
          if (x < -W * 0.2 || x > W * 1.2) continue;
          const y = y0 + bandH * (0.10 + s.b * 0.80);
          const r = bandH * (0.045 + s.c * 0.20) * clamp(k.scale, 0.6, 1.5);
          ctx.fillStyle = s.d > 0.42 ? BLACK : WHITE;
          ctx.strokeStyle = s.d > 0.42 ? WHITE : BLACK;
          ctx.lineWidth = Math.max(1, r * 0.09);
          const kind = Math.floor(s2.a * 7);
          ctx.beginPath();
          if (kind === 0) {                       /* 겹둥근 고리 — 소용돌이 */
            for (let g = 0; g < 4; g++) {
              ctx.moveTo(x + r * (1 - g * 0.24), y);
              ctx.arc(x, y, r * (1 - g * 0.24), 0, TAU);
            }
            ctx.fill("evenodd");
          } else if (kind === 1) {                /* 구멍 뚫린 원 — 바퀴 */
            ctx.arc(x, y, r, 0, TAU);
            ctx.moveTo(x + r * 0.34, y);
            ctx.arc(x, y, r * 0.34, 0, TAU);
            ctx.fill("evenodd");
          } else if (kind === 2) {                /* 뭉친 덩어리 */
            for (let g = 0; g < 4; g++) {
              const q = seeds[(i * 7 + g + 860) % seeds.length];
              ctx.moveTo(x + (q.a - 0.5) * r * 1.5 + r * 0.6, y + (q.b - 0.5) * r * 1.2);
              ctx.arc(x + (q.a - 0.5) * r * 1.5, y + (q.b - 0.5) * r * 1.2, r * (0.35 + q.c * 0.4), 0, TAU);
            }
            ctx.fill();
          } else if (kind === 3) {                /* 세로 기둥 */
            ctx.rect(x - r * 0.28, y - r * 1.3, r * 0.56, r * 2.6);
            ctx.fill();
          } else if (kind === 4) {                /* 쐐기 */
            ctx.moveTo(x, y - r);
            ctx.lineTo(x + r * 0.9, y + r * 0.8);
            ctx.lineTo(x - r * 0.9, y + r * 0.8);
            ctx.closePath();
            ctx.fill();
          } else if (kind === 5) {                /* 바둑판 조각 */
            const c4 = 4, u = r * 2 / c4;
            for (let a = 0; a < c4; a++) for (let b2 = 0; b2 < c4; b2++) {
              if ((a + b2) % 2) continue;
              ctx.rect(x - r + a * u, y - r + b2 * u, u, u);
            }
            ctx.fill();
          } else {                                /* 반달 */
            ctx.arc(x, y, r, -Math.PI / 2 + s2.b * TAU, Math.PI / 2 + s2.b * TAU);
            ctx.closePath();
            ctx.fill();
          }
          if (kind !== 0 && kind !== 1) ctx.stroke();
        }
      }
      ctx.restore();
    },

    /* 77 색면 — 납작한 색 덩어리를 딱 떨어지는 테두리로 놓는다.
       그라데이션도, 번짐도, 그림자도 없다. 값이 다른 면이 서로 맞닿는
       것만으로 그림이 선다. 엘즈워스 켈리가 평생 한 일이 그것이다.

       처음에는 원색을 겹쳐 새 색을 내는 초창기 컴퓨터 그래픽 쪽으로
       갔는데, 우리 팔레트는 한 색조를 네 단계로 쓰는 구성이라 겹쳐도
       색이 안 생기고 screen 합성으로 전부 흰색으로 날아갔다. 겹치지
       않고 덮는다. 색조 대비가 없어도 명도 대비만으로 충분히 선다. */
    hardedge(t) {
      const ph = t / DUR;
      const n = 3 + Math.round(k.density * 6);
      /* 화면을 다 채우지 않는다. 비운 자리가 면을 면으로 보이게 한다. */
      for (let i = 0; i < n; i++) {
        const s = seeds[(i * 11 + 899) % seeds.length];
        const s2 = seeds[(i * 11 + 900) % seeds.length];
        /* 한 바퀴에 정수 번 지나간다. 그래야 이음매가 맞는다. */
        const steps = 1 + Math.floor(s.d * 2);
        const u = (s.a + ph * steps) % 1;
        const R = Math.min(W, H) * (0.13 + s.b * 0.26) * clamp(k.scale, 0.7, 1.3);
        const cx = u * (W + R * 2.4) - R * 1.2;
        const cy = H * (0.16 + s.c * 0.68);
        const kind = Math.floor(s2.a * 5);
        /* 가장 어두운 색조는 바탕과 붙어 버려 면으로 안 보인다. 셋만 쓴다. */
        ctx.fillStyle = shade(i % 3, 0.72 + 0.26 * k.contrast);
        ctx.beginPath();
        if (kind === 0) ctx.arc(cx, cy, R, 0, TAU);
        else if (kind === 1) { ctx.arc(cx, cy, R, s2.b * TAU, s2.b * TAU + Math.PI); ctx.closePath(); }
        else if (kind === 2) ctx.rect(cx - R * 0.38, cy - R * 1.5, R * 0.76, R * 3);
        else if (kind === 3) ctx.rect(cx - R * 1.6, cy - R * 0.34, R * 3.2, R * 0.68);
        else {                                   /* 부채꼴 — 한 귀퉁이가 잘린 원 */
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, R, s2.b * TAU, s2.b * TAU + Math.PI * (0.5 + s2.c * 0.7));
          ctx.closePath();
        }
        ctx.fill();
        /* 몇 개에는 굵은 점을 얹는다. 인쇄 망점처럼 보여야 하므로
           선이 아니라 눈에 보이는 점으로 찍는다. */
        if (s2.d > 0.72) {
          ctx.save();
          ctx.clip();
          ctx.fillStyle = shade(3, 0.35);
          const g = Math.max(6, Math.round(Math.min(W, H) * 0.028));
          const d = g * 0.46;
          for (let y = 0; y < H; y += g) {
            for (let x = ((y / g) & 1) * g * 0.5; x < W; x += g) {
              ctx.beginPath(); ctx.arc(x, y, d, 0, TAU); ctx.fill();
            }
          }
          ctx.restore();
        }
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
    /* 선 설정까지 전부 되돌린다. 여기까지 하지 않으면 앞 프레임이 남긴
       lineCap·lineWidth를 물려받아, 페이지를 열고 처음 그린 프레임만
       다른 그림이 된다. 미리보기와 납품본이 어긋나는 원인이었다. */
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.lineWidth = 1;
    ctx.miterLimit = 10;
    ctx.setLineDash([]);
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.shadowBlur = 0;
    /* bare 모드에서는 바탕을 칠하지 않는다.
       같은 그림을 여러 겹 겹쳐 깊이를 내려면 겹마다 배경이 딸려 오면
       안 된다. 뒤 겹이 앞 겹의 배경에 가려 하나도 안 보인다.
       바탕·비네팅·알갱이는 겹을 다 합친 뒤 한 번만 얹는다. */
    if (P.bare) {
      ctx.clearRect(0, 0, W, H);
    } else {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);
    }

    const draw = STYLES[P.style] || STYLES.aurora;
    const heavy = HEAVY_GLOW[P.style] === 1;
    if (k.glow > 0.02 && !heavy) {
      ctx.shadowColor = tone(1, 0.6);
      ctx.shadowBlur = Math.min(W, H) * 0.012 * k.glow;
    } else {
      ctx.shadowBlur = 0;
    }
    withSymmetry(() => draw(t));
    ctx.shadowBlur = 0;
    /* 획이 많은 스타일은 여기서 한 번만 번지게 한다 */
    if (k.glow > 0.02 && heavy) applyBloom(0.22 + k.glow * 0.5);

    if (!P.bare) {
      applyVignette();
      applyGrain();
    }
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

  ["ripple", "파문"], ["moire", "간섭무늬"], ["lissajous", "리사주"], ["attractor", "끌개"],
  ["slitscan", "슬릿스캔"], ["dotmatrix", "도트매트릭스"], ["oscillo", "파형"], ["lowpoly", "로우폴리"],
  ["isocity", "아이소 도시"], ["branch", "가지"], ["mandala", "만다라"], ["hanji", "한지"],
  ["blinds", "블라인드"], ["magnet", "자기장"], ["terrace", "계단 지형"], ["weave", "직조"],
  ["strobe", "스트로브"], ["tunnel", "터널"], ["bars", "스펙트럼"], ["kaleido", "만화경"],
  ["flythrough", "지형 비행"], ["burst", "비트 폭발"], ["plasma", "플라스마"], ["chevron", "셰브론"],

  ["wire", "와이어프레임"], ["pointcloud", "점군"], ["hologram", "홀로그램"],

  ["jamo", "자모"], ["pdu", "활자판"], ["barcode", "신호"],
  ["segment", "칠획"], ["asciiart", "문자 명암"], ["desordre", "무질서"],

  ["chiaroscuro", "명암"], ["frame", "액자"],

  ["frieze", "띠그림"], ["hardedge", "색면"],
];

global.StudioArt = {
  create: create,
  PALETTES: PALETTES,
  STYLES: STYLE_LABELS,
  PALETTE_IDS: Object.keys(PALETTES),
};
})(typeof window !== "undefined" ? window : globalThis);
