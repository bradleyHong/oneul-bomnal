/* 봄날 스튜디오 · 생성 엔진
 *
 * 화면을 코드로 그린다. 사진을 합성하지 않는다.
 *
 * 그렇게 하는 이유가 둘이다.
 *   1. 우리가 파는 것이 "코드로 만든다"이기 때문이다. 스톡을 이어 붙여
 *      보여주면 우리는 편집자로 보인다.
 *   2. 구매한 스톡의 원본 프레임을 공개 화면에 늘어놓는 것은 라이선스의
 *      취지에서 벗어난다. 에셋은 사내 최종 렌더의 입력으로만 쓴다.
 *
 * 모든 움직임은 5초를 한 바퀴로 도는 주기 함수다. sin/cos 안의 계수를
 * 정수로만 두면 0초와 5초의 화면이 정확히 같아진다. 현장 패널에서
 * 이어 붙였을 때 끊기지 않아야 하므로 이것은 타협하지 않는다.
 */
(function (global) {
  "use strict";

  var TAU = Math.PI * 2;
  var PERIOD = 5;                      // 초

  /* ── 난수 — 씨앗을 주면 같은 화면이 다시 나온다 ─────────── */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a += 0x6D2B79F5;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ── 색 팔레트 ────────────────────────────────────────────
   * 낱말에서 고르고, 없으면 씨앗으로 고른다. */
  /* 라이브러리 2,234편에서 배운 색.
   * 사람이 고른 조합이 아니라 실제로 같이 찍힌 조합이다. 프레임마다
   * 대표색 다섯을 세고 비슷한 것끼리 묶어, 무리의 한가운데에 있는
   * 실제 화면 하나를 대표로 삼았다. n은 그 색으로 찍힌 편수다. */
  var MINED = [
    { id: "먹빛", bg: "#020203", ink: ["#161718", "#2C2D2E", "#494B4D", "#6D7073", "#9B9FA2"], n: 319 },
    { id: "하늘빛", bg: "#070A0C", ink: ["#374E5E", "#638196", "#97B1CA", "#D6E7F3", "#202A2F"], n: 248 },
    { id: "쪽빛", bg: "#080913", ink: ["#424794", "#641C5E", "#260D34", "#9B4A81", "#558EBF"], n: 196 },
    { id: "안개", bg: "#181818", ink: ["#BBBBBD", "#B0B1B2", "#A3A3A4", "#959494", "#C9CACB"], n: 181 },
    { id: "짙은 금빛", bg: "#1E1600", ink: ["#F9AA00", "#995400", "#351800", "#D07A00", "#6A3400"], n: 163 },
    { id: "밝은 하늘빛", bg: "#0C171D", ink: ["#63B5E6", "#2290D9", "#8D5DA9", "#B39BCC", "#54358C"], n: 147 },
    { id: "하늘빛 2", bg: "#05090C", ink: ["#2C4C5E", "#0C3044", "#526B73", "#7C8E8D", "#ABB3A2"], n: 145 },
    { id: "홍빛", bg: "#070202", ink: ["#3B1610", "#883D25", "#E7251C", "#E19523", "#E45C65"], n: 132 },
    { id: "밝은 주홍빛", bg: "#0E0D0B", ink: ["#716555", "#B59A7B", "#8C7D6C", "#CFB796", "#3E3E2B"], n: 125 },
    { id: "자줏빛", bg: "#060304", ink: ["#341C23", "#84393A", "#E42847", "#EA8460", "#4E2363"], n: 92 },
    { id: "금빛", bg: "#0C0B06", ink: ["#5D5632", "#393B20", "#7E6D45", "#CED5DC", "#A3985E"], n: 92 },
    { id: "먹빛 2", bg: "#120F0F", ink: ["#8B7875", "#A38F8B", "#BFAAA5", "#4A3E3E", "#221B1E"], n: 90 },
    { id: "안개 2", bg: "#0F0D0F", ink: ["#796877", "#594656", "#47112C", "#94184E", "#ECB7BE"], n: 81 },
    { id: "쪽빛 2", bg: "#030206", ink: ["#1C1330", "#322158", "#3D3C90", "#723A78", "#9069C5"], n: 78 },
    { id: "짙은 쪽빛", bg: "#010205", ink: ["#0D102A", "#1C2353", "#2B3C88", "#4460BF", "#83A3F9"], n: 75 },
    { id: "연둣빛", bg: "#0B0D08", ink: ["#566841", "#425431", "#687950", "#2D3F23", "#7F8F64"], n: 70 },
  ];

  var PALETTES = [
    { id: "봄빛",   bg: "#0d1420", ink: ["#ffd6e7", "#ffb3d1", "#c9f0d8", "#fff2b8", "#ffffff"] },
    { id: "바다",   bg: "#04121c", ink: ["#7fe3e0", "#3aa8c9", "#bff2ff", "#1f6f8b", "#ffffff"] },
    { id: "겨울밤", bg: "#070c18", ink: ["#cfe3ff", "#8fb4dc", "#ffffff", "#5a7fb5", "#e8f1ff"] },
    { id: "단청",   bg: "#120a0a", ink: ["#e8503a", "#f2b632", "#2f6fb0", "#1f8a5b", "#f4efe6"] },
    { id: "노을",   bg: "#160b12", ink: ["#ff8b5e", "#ffc06b", "#ff5f7e", "#7a4a8c", "#ffe9d6"] },
    { id: "숲",     bg: "#08130d", ink: ["#79d99a", "#3f9d6d", "#d6f2b8", "#1f6b4a", "#eafff2"] },
    { id: "도시밤", bg: "#0a0a12", ink: ["#59e0ff", "#ff5fd2", "#ffe45e", "#7b6bff", "#ffffff"] },
    { id: "먹",     bg: "#0b0b0c", ink: ["#f2f2f0", "#b8b8b4", "#6e6e6a", "#3a3a38", "#ffffff"] },
    { id: "우주",   bg: "#05060f", ink: ["#9db4ff", "#d6c8ff", "#ffffff", "#4a5bb0", "#e8ecff"] },
    { id: "흙",     bg: "#120d09", ink: ["#d9a066", "#8c5a2b", "#f0d9b8", "#5c4022", "#fff6e8"] },
    { id: "안개",   bg: "#101418", ink: ["#c9d6de", "#8ea3b0", "#e8f0f4", "#5c6f7a", "#ffffff"] },
    { id: "형광",   bg: "#06080a", ink: ["#c6ff4f", "#4fffd0", "#ff4f8b", "#4f9bff", "#ffffff"] },
    { id: "청자",   bg: "#081412", ink: ["#9fd8c8", "#5aa896", "#d6f0e6", "#2f6b60", "#f0fbf7"] },
    { id: "산호",   bg: "#18090c", ink: ["#ff7a7a", "#ffb08a", "#ffd9c0", "#c04a5a", "#fff0ea"] },
    { id: "라벤더", bg: "#0d0a16", ink: ["#c3b0ff", "#8f7ae0", "#e8dfff", "#5a4a9a", "#ffffff"] },
    { id: "심해",   bg: "#03080f", ink: ["#2f7fa8", "#1b4f70", "#7fd0e8", "#0f3550", "#cfeaf5"] }
  ];

  PALETTES = MINED.concat(PALETTES);

  /* 낱말이 고른 색과 잘 어울리는 이웃들. 같은 문장이라도 여기서 돌려 쓴다. */
  var KIN = {
    "바다": ["심해", "청자", "안개"], "심해": ["바다", "우주", "겨울밤"],
    "봄빛": ["산호", "라벤더", "노을"], "산호": ["봄빛", "노을"],
    "겨울밤": ["우주", "안개", "심해"], "우주": ["겨울밤", "라벤더", "심해"],
    "단청": ["흙", "노을", "산호"], "흙": ["단청", "먹", "노을"],
    "노을": ["산호", "봄빛", "단청"], "숲": ["청자", "흙", "안개"],
    "청자": ["숲", "바다", "안개"], "도시밤": ["형광", "라벤더", "우주"],
    "형광": ["도시밤", "라벤더"], "먹": ["안개", "흙"],
    "안개": ["먹", "청자", "겨울밤"], "라벤더": ["우주", "봄빛", "도시밤"]
  };

  /* ── 낱말 사전 — 문장에서 색과 움직임을 읽는다 ──────────── */
  /* 한 글자짜리 낱말은 쓰지 않는다. "물"은 건물에, "강"은 강렬에,
   * "산"은 부산에, "눈"은 눈의 벽에 걸린다. 실제로 그렇게 틀렸다. */
  var LEX = [
    { re: /바다|파도|물결|물빛|해변|해양|웨이브|호수|강물|서핑/, pal: "바다", style: "wave", tags: ["바다", "파도"] },
    { re: /노을|석양|저녁놀|일몰|황혼/,             pal: "노을", style: "flow", tags: ["노을"] },
    { re: /겨울|눈송이|눈발|함박눈|설경|시린|한파/, pal: "겨울밤", style: "snow", tags: ["겨울"] },
    { re: /전통|단청|오방|고분|국가유산|사찰|고궁|한옥/, pal: "단청", style: "contour", tags: ["전통"] },
    { re: /벚꽃|봄바람|봄날|봄빛|꽃잎|화사|산뜻/,  pal: "봄빛", style: "flow", tags: ["봄", "화사"] },
    { re: /숲|나무|초록|수목|이끼|정원/,           pal: "숲", style: "flow", tags: ["자연"] },
    { re: /도시|야경|네온|빌딩숲|거리/,            pal: "도시밤", style: "grid", tags: ["도시"] },
    { re: /수묵|먹빛|담백|여백|흑백|모노톤/,       pal: "먹", style: "contour", tags: ["수묵"] },
    { re: /우주|은하수|별빛|밤하늘|성운|SF/,       pal: "우주", style: "particle", tags: ["우주"] },
    { re: /흙빛|도자|토기|질감|모래/,              pal: "흙", style: "contour", tags: ["질감"] },
    { re: /안개|구름|하늘빛|바람결|대기/,          pal: "안개", style: "flow", tags: ["대기"] },
    { re: /형광|사이버|글리치|디지털|비비드/,      pal: "형광", style: "grid", tags: ["사이버"] },
    { re: /빛줄기|조명|반짝|보케|번짐|글로우/,     pal: null, style: "bloom", tags: ["빛"] },
    { re: /기둥형|세로형|줄기|흘러내리/,           pal: null, style: "column", tags: ["세로"] },
    { re: /입자|먼지|알갱이|파티클/,               pal: null, style: "particle", tags: ["입자"] }
  ];

  /* 분위기 12종 — 속도와 밀도, 선 굵기와 밝기를 함께 정한다.
   * 속도는 정수여야 5초 한 바퀴가 정확히 맞아떨어진다. */
  var MOODS = [
    { id: "고요", re: /고요|정적|멈춘/,        speed: 1, density: 0.6, weight: 0.8, glow: 0.9 },
    { id: "잔잔", re: /잔잔|평온|느리|천천/,   speed: 1, density: 0.8, weight: 1.0, glow: 1.0 },
    { id: "은은", re: /은은|살며시|옅/,        speed: 1, density: 0.9, weight: 0.8, glow: 0.8 },
    { id: "차분", re: /차분|담담|정갈/,        speed: 1, density: 1.0, weight: 1.0, glow: 0.9 },
    { id: "몽환", re: /몽환|꿈결|아련|신비/,   speed: 2, density: 1.2, weight: 0.9, glow: 1.3 },
    { id: "화사", re: /화사|밝|환하/,          speed: 2, density: 1.1, weight: 1.1, glow: 1.2 },
    { id: "산뜻", re: /산뜻|상큼|가볍/,        speed: 2, density: 1.0, weight: 1.0, glow: 1.1 },
    { id: "경쾌", re: /경쾌|활기|발랄|신나/,   speed: 3, density: 1.3, weight: 1.1, glow: 1.2 },
    { id: "역동", re: /역동|빠르|힘차|질주/,   speed: 3, density: 1.5, weight: 1.3, glow: 1.2 },
    { id: "강렬", re: /강렬|짙|선명|대담/,     speed: 3, density: 1.4, weight: 1.6, glow: 1.4 },
    { id: "웅장", re: /웅장|장엄|거대|압도/,   speed: 1, density: 1.5, weight: 1.6, glow: 1.2 },
    { id: "묵직", re: /묵직|깊|무겁|진중/,     speed: 1, density: 1.3, weight: 1.5, glow: 0.9 }
  ];

  var BASE_IDS = ["flow", "wave", "particle", "contour", "grid", "bloom", "column",
                  "snow", "ribbon", "orbit", "mesh", "bar", "spiral", "drift"];

  /* 그림 엔진(studio-engine.js)의 56종을 여기에 이어 붙인다.
   *
   * 이름이 넷 겹친다(wave · bloom · orbit · spiral). 같은 낱말이지만 다른
   * 그림이라 하나로 합칠 수 없다. 앞에 sa:를 붙여 갈라 둔다. 화면에는
   * 접두어를 보이지 않는다. 고객이 볼 이유가 없다. */
  var ART_PREFIX = "sa:";
  function artIds() {
    var A = global.StudioArt;
    if (!A || !A.STYLES) return [];
    return A.STYLES.map(function (e) { return ART_PREFIX + e[0]; });
  }
  function isArt(id) { return typeof id === "string" && id.indexOf(ART_PREFIX) === 0; }

  var STYLE_IDS = BASE_IDS.concat(artIds());

  /* 화면 비율에 따라 어울리는 것이 다르다. 1:6 기둥에 등고선을 그리면
   * 가운데만 뭉치고 위아래가 비어 버린다. 실제로 그렇게 나왔다. */
  /* 세로 기둥에 어울리는 것과 가로 띠에 어울리는 것을 갈라 적는다.
   * 가운데로 모이는 그림(만다라·궤도·리사주)을 1:6 기둥에 걸면 위아래가
   * 통째로 빈다. 실제로 그렇게 나왔다. */
  var ART_TALL = ["hanji", "smoke", "dotmatrix", "weave", "terrace", "stripe", "branch",
                  "rain", "bamboo", "flock", "bloom", "inkwash", "thread", "paper"];
  var ART_WIDE = ["moire", "oscillo", "slitscan", "dotmatrix", "weave", "terrace", "blinds",
                  "stripe", "lowpoly", "hanji", "wave", "warp", "topo", "magnet", "isocity"];
  function withPrefix(list) {
    var have = artIds();
    return list.map(function (id) { return ART_PREFIX + id; })
               .filter(function (id) { return have.indexOf(id) >= 0; });
  }

  /* 1판 — 엔진을 붙이기 전 목록. 이미 나간 BN- 번호가 이걸 쓴다.
     한 칸도 바꾸거나 끼워 넣지 않는다. */
  var FIT_V1 = {
    tall:  ["column", "bar", "flow", "wave", "drift", "snow", "particle", "mesh", "ribbon"],
    wide:  ["wave", "flow", "bar", "ribbon", "grid", "drift", "mesh", "particle", "column"],
    even:  BASE_IDS
  };

  var FIT = {
    tall:  FIT_V1.tall.concat(withPrefix(ART_TALL)),
    wide:  FIT_V1.wide.concat(withPrefix(ART_WIDE)),
    even:  STYLE_IDS
  };

  /* ── 문장 읽기 ────────────────────────────────────────────
   * 낱말은 방향만 잡는다. 고정하지 않는다.
   * 문장이 정한 것을 매번 그대로 쓰면 "다른 화면 보기"를 눌러도
   * 늘 같은 그림이 나온다. 그래서 낱말이 고른 것을 가장 자주 쓰되,
   * 어울리는 이웃으로도 돌려 가며 쓴다. */
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

  /* 판(version)을 받는다.
   *
   * 작품 번호는 느낌 번호와 씨앗만 담는다. 그림은 이 함수가 그 둘로 다시
   * 뽑아 만든다. 그래서 스타일 목록이 길어지면 pick이 다른 칸을 집어,
   * 이미 나간 번호가 다른 그림이 된다. 화면에는 "같은 번호로 렌더링해
   * 드립니다"라고 적혀 있으므로 그렇게 두면 안 된다.
   *
   *   v=1  기존 14종만. BN- 번호가 예전 그대로 나온다.
   *   v=2  엔진 56종까지 70종. BN2- 번호가 쓴다.
   *
   * 색·느낌·나머지 값은 두 판이 같다. r()을 부르는 횟수가 같기 때문이다. */
  function compose(text, seed, aspect, v) {
    var r = rng(seed);
    var v2 = v !== 1;
    var palHint = null, styleHint = null, tags = [];

    LEX.forEach(function (e) {
      if (!e.re.test(text)) return;
      if (e.pal && !palHint) palHint = e.pal;
      if (e.style && !styleHint) styleHint = e.style;
      tags = tags.concat(e.tags);
    });

    // 분위기 — 문장에 없으면 씨앗으로 고른다
    var mood = null;
    MOODS.forEach(function (m) { if (!mood && m.re.test(text)) mood = m; });
    if (!mood) mood = pick(r, MOODS);

    // 색 — 낱말이 고른 것 55%, 어울리는 이웃 30%, 나머지는 자유
    /* 색은 고객이 고른 느낌을 따른다. "수묵 여백"을 눌렀는데 금색이 나오면
     * 고른 의미가 없다. 변화는 스타일과 씨앗에서 낸다.
     * 이웃 색은 결이 같은 것들이라 25%까지만 섞는다. */
    var palId;
    var d = r();
    if (palHint) palId = (d < 0.75 || !KIN[palHint]) ? palHint : pick(r, KIN[palHint]);
    else palId = pick(r, PALETTES).id;
    var palette = PALETTES.filter(function (p) { return p.id === palId; })[0] || PALETTES[0];

    // 스타일 — 화면 비율에 맞는 것들 중에서 고른다
    var ar = aspect || 16 / 9;
    var F = v2 ? FIT : FIT_V1;
    var fit = ar >= 2.2 ? F.wide : (ar <= 0.62 ? F.tall : F.even);
    var style;
    if (styleHint && fit.indexOf(styleHint) >= 0 && r() < 0.45) style = styleHint;
    else style = pick(r, fit);

    if (!tags.length) tags = ["자유 구성"];
    tags = tags.filter(function (t, i, a2) { return a2.indexOf(t) === i; });

    return {
      seed: seed, style: style, palette: palette, mood: mood, tags: tags,
      speed: mood.speed,
      density: mood.density * (0.8 + r() * 0.5),
      weight: mood.weight * (0.85 + r() * 0.35),
      glow: mood.glow,
      layers: 3 + Math.floor(r() * 4),
      rot: r() * TAU,
      warp: 0.4 + r() * 1.4,
      dir: r() < 0.5 ? 1 : -1,
      ar: ar
    };
  }

  /* ── 그리기 ───────────────────────────────────────────── */
  function Gen(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.spec = null;
    this.raf = 0;
    this.t0 = 0;
    this.mark = "봄날퍼블릭아트";
  }

  Gen.prototype.set = function (spec) {
    this.spec = spec;
    this.pts = null;
    this.art = null;                   /* 사양이 바뀌면 엔진 인스턴스를 새로 만든다 */
    return this;
  };

  /* ── 그림 엔진 다리 ───────────────────────────────────────
   * studio-engine.js는 캔버스를 받아 제 배경·비네팅·알갱이까지 한 장을
   * 통째로 그린다. 여기서 배경을 미리 칠하고 넘기면 두 번 칠하게 되므로,
   * 엔진이 맡는 스타일은 이 함수가 프레임을 통째로 맡는다.
   *
   * 시간은 5초 한 바퀴 그대로다. 엔진에 dur=5, fps=30을 주고 150프레임 중
   * 몇 번째인지만 계산해 넘긴다. 현장 패널에서 이어 붙였을 때 끊기지
   * 않아야 한다는 규칙은 엔진 쪽도 같다. */
  var ART_FPS = 30;

  /** 이 화면의 팔레트를 엔진이 아는 모양으로 바꾼다. 낱말이 고른 색을
      그대로 쓰려는 것이다. 엔진 팔레트로 갈아타면 "바다"라고 적었는데
      단청이 나온다. */
  function artPalette(p) {
    var ink = p.ink || [];
    return {
      name: p.id,
      bg: p.bg,
      ink: ink[ink.length - 1] || ink[0] || "#ffffff",
      accent: ink[1] || ink[0] || "#ffffff",
      tones: [ink[0], ink[1] || ink[0], ink[2] || ink[0], ink[3] || ink[1] || ink[0]]
    };
  }

  var ART_MOTIONS = ["drift", "pulse", "orbit", "still"];

  Gen.prototype.artDraw = function (t) {
    var A = global.StudioArt;
    var s = this.spec;
    if (!A) return false;
    var W = this.cv.width, H = this.cv.height;
    if (!this.art || this.art.w !== W || this.art.h !== H) {
      var r = rng(s.seed ^ 0x5eed1);
      var cl = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
      this.art = {
        w: W, h: H,
        inst: A.create(this.cv, {
          w: W, h: H, fps: ART_FPS, dur: PERIOD,
          seed: s.seed,
          style: s.style.slice(ART_PREFIX.length),
          palette: artPalette(s.palette),
          /* 분위기(느낌)가 정한 값을 엔진의 0~100 눈금으로 옮긴다 */
          density:  cl(Math.round(s.density * 42), 8, 96),
          speed:    cl(Math.round(s.speed * 46), 8, 95),
          scale:    cl(Math.round(s.warp * 36), 15, 90),
          contrast: cl(Math.round(s.weight * 46), 25, 95),
          glow:     cl(Math.round(s.glow * 36), 5, 85),
          grain:    14,
          accent:   cl(Math.round(40 + r() * 45), 28, 92),
          motion:   ART_MOTIONS[Math.floor(r() * ART_MOTIONS.length)],
          symmetry: 1,
          invert:   false
        })
      };
    }
    var total = this.art.inst.totalFrames;
    this.art.inst.renderFrame(Math.round((t / PERIOD) * total) % total);
    return true;
  };

  Gen.prototype.start = function () {
    var self = this;
    cancelAnimationFrame(this.raf);
    this.t0 = performance.now();
    (function loop(now) {
      var t = ((now - self.t0) / 1000) % PERIOD;
      self.draw(t);
      self.raf = requestAnimationFrame(loop);
    })(performance.now());
  };

  Gen.prototype.stop = function () { cancelAnimationFrame(this.raf); };

  /** 한 바퀴를 0~1로 정규화한 위상. 정수 배수만 곱해 쓴다. */
  function ph(t, k) { return TAU * k * (t / PERIOD); }


  /* ── 깊이 ────────────────────────────────────────────────
   * 한 겹만 그리면 종이에 그린 그림처럼 평평하다. 촬영본이 깊어 보이는
   * 까닭은 먼 것이 흐리고 느리게, 가까운 것이 또렷하고 빠르게 움직여서다.
   * 그래서 같은 그림을 세 겹으로 그린다. 겹마다 크기·속도·흐림이 다르다.
   * 시간축은 정수 배수만 쓰므로 5초 한 바퀴는 그대로 지켜진다. */
  var LAYERS = [
    { scale: 1.22, blur: 7, alpha: 0.42, k: 1, dim: 0.75 },   // 먼 곳
    { scale: 1.00, blur: 0, alpha: 1.00, k: 1, dim: 1.00 },   // 주 화면
    { scale: 0.84, blur: 2, alpha: 0.55, k: 2, dim: 1.15 }    // 가까운 곳
  ];

  /* 면을 채우는 스타일은 겹치면 빛이 포화돼 하얗게 탄다.
   * 선으로 그리는 것만 세 겹을 준다. */
  var FILLING = ["wave", "ribbon", "bar", "drift", "grid", "bloom"];

  Gen.prototype.layer = function (ctx, W, H, t, s, draw) {
    var fills = FILLING.indexOf(s.style) >= 0;
    var stack = fills ? [{ scale: 1.06, blur: 5, alpha: 0.3, k: 1, dim: 0.8 },
                         { scale: 1.00, blur: 0, alpha: 1.0, k: 1, dim: 1.0 }]
                      : LAYERS;
    if (!this.lc) {
      this.lc = document.createElement("canvas");
      this.lx = this.lc.getContext("2d");
    }
    if (this.lc.width !== W || this.lc.height !== H) {
      this.lc.width = W; this.lc.height = H;
    }
    var lx = this.lx;
    for (var i = 0; i < stack.length; i++) {
      var L = stack[i];
      lx.setTransform(1, 0, 0, 1, 0, 0);
      lx.clearRect(0, 0, W, H);
      // 채우는 스타일은 더하면 바닥이 하얗게 탄다. 덮어써야 물의 층이 보인다.
      lx.globalCompositeOperation = fills ? "source-over" : "lighter";
      lx.globalAlpha = 1;
      // 겹마다 조금 다른 씨앗을 주어 같은 그림이 세 번 겹치지 않게 한다
      var sub = Object.create(s);
      sub.seed = (s.seed + i * 104729) >>> 0;
      sub.density = s.density * (L.scale === 1 ? 1 : (fills ? 0.75 : 0.6));
      sub.weight = s.weight * L.dim;
      // 겹의 시간은 정수 배수로만 어긋나게 한다
      var lt = ((t * L.k) % PERIOD);
      lx.save();
      lx.translate(W / 2, H / 2);
      lx.scale(L.scale, L.scale);
      lx.translate(-W / 2, -H / 2);
      draw.call(this, lx, W, H, lt, sub);
      lx.restore();

      ctx.save();
      ctx.globalCompositeOperation = fills && L.scale === 1 ? "source-over" : "lighter";
      ctx.globalAlpha = L.alpha;
      if (L.blur) ctx.filter = "blur(" + (L.blur * (Math.max(W, H) / 1200)).toFixed(1) + "px)";
      ctx.drawImage(this.lc, 0, 0);
      ctx.filter = "none";
      ctx.restore();
    }
  };

  Gen.prototype.draw = function (t) {
    var s = this.spec;
    if (!s) return;
    var ctx = this.ctx, W = this.cv.width, H = this.cv.height;

    /* 엔진이 맡는 스타일은 한 장을 통째로 그린다. 물기(워터마크)만 얹는다. */
    if (isArt(s.style) && this.artDraw(t)) { this.post(ctx, W, H, s); this.grade(ctx, W, H, t, s); this.watermark(ctx, W, H); return; }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = s.palette.bg;
    ctx.fillRect(0, 0, W, H);
    var bg = ctx.createRadialGradient(W * 0.5, H * 0.55, 0, W * 0.5, H * 0.55, Math.max(W, H) * 0.75);
    bg.addColorStop(0, hexA(s.palette.ink[1], 0.16));
    bg.addColorStop(1, hexA(s.palette.ink[1], 0));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    this.layer(ctx, W, H, t, s, STYLES[s.style] || STYLES.flow);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    this.post(ctx, W, H, s);
    this.grade(ctx, W, H, t, s);
    this.watermark(ctx, W, H);
  };


  /* ── 마감 ───────────────────────────────────────────────────
   * 선을 그린 채로 끝내면 코드 스케치처럼 보인다. 실제 미디어아트는
   * 빛이 번지고 가장자리가 가라앉아야 화면으로 읽힌다.
   * 작게 줄여 흐린 뒤 더하는 방식이라 큰 화면에서도 값이 싸다. */
  Gen.prototype.post = function (ctx, W, H, s) {
    var bw = Math.max(48, Math.round(W / 4)), bh = Math.max(27, Math.round(H / 4));
    if (!this.bc || this.bc.width !== bw || this.bc.height !== bh) {
      this.bc = document.createElement("canvas");
      this.bc.width = bw; this.bc.height = bh;
      this.bx = this.bc.getContext("2d");
    }
    var bx = this.bx, glow = s.glow || 1;
    bx.globalCompositeOperation = "copy";
    bx.filter = "blur(" + Math.max(2, Math.round(bw / 44)) + "px) brightness(1.3) saturate(1.2)";
    bx.drawImage(this.cv, 0, 0, bw, bh);
    bx.filter = "none";
    bx.globalCompositeOperation = "source-over";

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(0.7, 0.42 * glow);
    ctx.drawImage(this.bc, 0, 0, W, H);
    ctx.globalAlpha = Math.min(0.38, 0.18 * glow);      // 한 겹 더 얹어 번짐을 넓힌다
    ctx.drawImage(this.bc, -W * 0.01, -H * 0.01, W * 1.02, H * 1.02);
    ctx.restore();

    // 가장자리를 가라앉혀 눈이 가운데로 모이게 한다
    var v = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.22,
                                     W * 0.5, H * 0.5, Math.max(W, H) * 0.74);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(0.65, "rgba(0,0,0,0.18)");
    v.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };


  /* ── 그레이드 ────────────────────────────────────────────
   * 색 보정과 입자. 촬영본과 CG를 가르는 마지막 한 겹이다.
   * 그림자에 찬 색, 하이라이트에 따뜻한 색을 물리면 화면이 한 덩어리로
   * 묶이고, 아주 옅은 입자를 얹으면 매끈함이 깨져 눈이 편해진다.
   * 입자는 매 프레임 새로 그리지 않는다. 미리 만든 한 장을 위치만 바꿔
   * 얹는다. 5초 한 바퀴에 정확히 맞아떨어지는 자리로만 옮긴다. */
  Gen.prototype.grade = function (ctx, W, H, t, s) {
    var ink = s.palette.ink;
    var warm = ink[0], cool = ink[ink.length - 2] || ink[1];

    // 하이라이트에 따뜻한 색
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // 그림자에 찬 색
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = cool;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // 입자
    if (!this.gr) {
      var g = document.createElement("canvas");
      g.width = g.height = 256;
      var gx = g.getContext("2d");
      var im = gx.createImageData(256, 256);
      var r = rng(20260905);
      for (var i = 0; i < im.data.length; i += 4) {
        var v = 118 + Math.round((r() - 0.5) * 90);
        im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
        im.data[i + 3] = 255;
      }
      gx.putImageData(im, 0, 0);
      this.gr = g;
    }
    var step = Math.floor((t / PERIOD) * 5) * 53;      // 다섯 자리만 오간다
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.085;
    var pat = ctx.createPattern(this.gr, "repeat");
    ctx.translate(step % 256, (step * 2) % 256);
    ctx.fillStyle = pat;
    ctx.fillRect(-256, -256, W + 512, H + 512);
    ctx.restore();
  };

  Gen.prototype.watermark = function (ctx, W, H) {
    var fs = Math.max(9, Math.round(Math.min(W / 22, H / 22, 26)));
    ctx.font = "700 " + fs + "px Pretendard, sans-serif";
    while (fs > 8 && ctx.measureText(this.mark).width > W * 0.82) {
      fs -= 1;
      ctx.font = "700 " + fs + "px Pretendard, sans-serif";
    }
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillText(this.mark, W - 15, H - 15);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillText(this.mark, W - 16, H - 16);
    ctx.textAlign = "left";
    ctx.font = "600 " + Math.round(fs * 0.62) + "px Pretendard, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.55)";
    if (W > 260) ctx.fillText("시연본 · 5초 반복", 14, H - 14);
  };

  function hex2rgb(hex) {
    var n = parseInt(String(hex).slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* ── 스타일 여덟 가지 ─────────────────────────────────── */
  var STYLES = {

    /* 흐르는 띠 — 사인 곡선을 겹쳐 리본처럼 흐르게 한다 */
    flow: function (ctx, W, H, t, s) {
      var n = Math.round(22 * s.density), r = rng(s.seed);
      ctx.lineCap = "round";
      for (var i = 0; i < n; i++) {
        var col = s.palette.ink[i % s.palette.ink.length];
        var y0 = r() * H, amp = (0.05 + r() * 0.2) * H;
        var k = 1 + Math.floor(r() * 2);          // 정수 하모닉 → 완전 반복
        var wv = 1 + Math.floor(r() * 3);
        var off = r() * TAU;
        ctx.strokeStyle = hexA(col, 0.22 + r() * 0.4);
        ctx.lineWidth = (1.6 + r() * 5.2) * (W / 900) * (s.weight || 1);
        ctx.beginPath();
        for (var x = 0; x <= W; x += 6) {
          var u = x / W;
          var y = y0
            + Math.sin(u * TAU * wv + ph(t, k) + off) * amp
            + Math.sin(u * TAU * (wv * 2) - ph(t, k)) * amp * 0.28 * s.warp;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },

    /* 파동 — 아래에서 위로 겹치는 물결 면 */
    /* 파동 — 종이를 오려 겹친 물결. 뒤에서 앞으로 덮어 칠한다.
     * 반투명으로 겹치면 몇 겹 만에 흰색에 닿아 바닥이 타버린다. */
    wave: function (ctx, W, H, t, s) {
      var n = Math.round(6 * s.density) + 4, r = rng(s.seed);
      var ink = s.palette.ink, bgc = hex2rgb(s.palette.bg);
      for (var i = 0; i < n; i++) {
        var f = i / (n - 1 || 1);
        var c = hex2rgb(ink[i % ink.length]);
        // 뒤쪽은 배경에 가깝게, 앞쪽은 제 색으로. 그래야 깊이가 생긴다.
        var mix = 0.2 + 0.75 * f;
        var col = "rgb(" + Math.round(bgc[0] + (c[0] - bgc[0]) * mix) + ","
                         + Math.round(bgc[1] + (c[1] - bgc[1]) * mix) + ","
                         + Math.round(bgc[2] + (c[2] - bgc[2]) * mix) + ")";
        var base = H * (0.3 + 0.78 * f);
        var amp = (0.03 + r() * 0.07) * H;
        var wv = 1 + Math.floor(r() * 3);
        var k = 1 + Math.floor(r() * 2);
        var off = r() * TAU;
        ctx.globalAlpha = 1;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (var x = 0; x <= W; x += 5) {
          var u = x / W;
          ctx.lineTo(x, base + Math.sin(u * TAU * wv + ph(t, k) * s.dir + off) * amp
                          + Math.sin(u * TAU * (wv + 2) - ph(t, k)) * amp * 0.35);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      }
    },

    particle: function (ctx, W, H, t, s) {
      if (!this.pts) {
        var r0 = rng(s.seed), m = Math.round(280 * s.density), a = [];
        for (var i = 0; i < m; i++) {
          a.push({
            x: r0(), y: r0(),
            rx: (0.01 + r0() * 0.07), ry: (0.01 + r0() * 0.07),
            k: 1 + Math.floor(r0() * 3), off: r0() * TAU,
            rad: 0.9 + r0() * 3.6, a: 0.45 + r0() * 0.55,
            c: s.palette.ink[Math.floor(r0() * s.palette.ink.length)]
          });
        }
        this.pts = a;
      }
      var sc = W / 900;
      for (var j = 0; j < this.pts.length; j++) {
        var p = this.pts[j];
        var a2 = ph(t, p.k) + p.off;
        var x = (p.x + Math.cos(a2) * p.rx) * W;
        var y = (p.y + Math.sin(a2) * p.ry) * H;
        var pulse = 0.55 + 0.45 * Math.sin(ph(t, 1) + p.off);
        var rr = p.rad * sc * (0.7 + pulse * 0.6);
        var gl = ctx.createRadialGradient(x, y, 0, x, y, rr * 4);
        gl.addColorStop(0, hexA(p.c, p.a * pulse * 0.95));
        gl.addColorStop(0.35, hexA(p.c, p.a * pulse * 0.28));
        gl.addColorStop(1, hexA(p.c, 0));
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.arc(x, y, rr * 4, 0, TAU);
        ctx.fill();
      }
    },

    /* 등고선 — 중심에서 퍼지는 닫힌 곡선 */
    contour: function (ctx, W, H, t, s) {
      var n = Math.round(26 * s.density), r = rng(s.seed);
      var cx = W * (0.35 + r() * 0.3), cy = H * (0.35 + r() * 0.3);
      var maxR = Math.max(W, H) * 0.62;
      ctx.lineWidth = Math.max(1.6, 2.6 * (W / 900) * (s.weight || 1));
      for (var i = 0; i < n; i++) {
        var f = (i + 1) / n;
        var col = s.palette.ink[i % s.palette.ink.length];
        ctx.strokeStyle = hexA(col, 0.2 + 0.42 * (1 - f));
        ctx.beginPath();
        for (var a2 = 0; a2 <= TAU + 0.1; a2 += 0.09) {
          var wob = 1
            + Math.sin(a2 * (3 + (i % 3)) + ph(t, 1) + i * 0.4) * 0.09 * s.warp
            + Math.sin(a2 * 7 - ph(t, 2)) * 0.03;
          var rr = maxR * f * wob;
          var x = cx + Math.cos(a2 + s.rot) * rr;
          var y = cy + Math.sin(a2 + s.rot) * rr * 0.78;
          a2 === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    },

    /* 격자 — 점이 파도처럼 밝아졌다 어두워진다 */
    grid: function (ctx, W, H, t, s) {
      var step = Math.max(14, Math.round(34 / s.density)) * (W / 900);
      var cols = Math.ceil(W / step), rows = Math.ceil(H / step);
      var ink = s.palette.ink;
      for (var gy = 0; gy <= rows; gy++) {
        for (var gx = 0; gx <= cols; gx++) {
          var u = gx / cols, v = gy / rows;
          var w = Math.sin(u * TAU * 2 + v * TAU + ph(t, 1))
                * Math.cos(v * TAU * 1 - ph(t, 1) + s.rot);
          var a2 = 0.12 + Math.max(0, w) * 0.78;
          var rad = (1 + Math.max(0, w) * 3.4) * (W / 900);
          ctx.fillStyle = hexA(ink[(gx + gy) % ink.length], a2);
          ctx.beginPath();
          ctx.arc(gx * step, gy * step, rad, 0, TAU);
          ctx.fill();
        }
      }
    },

    /* 번짐 — 큰 빛덩이가 숨을 쉬듯 커졌다 작아진다 */
    bloom: function (ctx, W, H, t, s) {
      var n = Math.round(8 * s.density) + 3, r = rng(s.seed);
      for (var i = 0; i < n; i++) {
        var col = s.palette.ink[i % s.palette.ink.length];
        var bx = r() * W, by = r() * H;
        var k = 1 + Math.floor(r() * 2), off = r() * TAU;
        var base = (0.12 + r() * 0.3) * Math.max(W, H);
        var rr = base * (0.75 + 0.25 * Math.sin(ph(t, k) + off));
        var dx = Math.cos(ph(t, 1) + off) * W * 0.03;
        var dy = Math.sin(ph(t, 1) + off) * H * 0.03;
        var g = ctx.createRadialGradient(bx + dx, by + dy, 0, bx + dx, by + dy, rr);
        g.addColorStop(0, hexA(col, 0.52));
        g.addColorStop(0.45, hexA(col, 0.18));
        g.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
    },

    /* 기둥 — 세로로 흐르는 빛줄기. 세로 사이니지에서 좋다 */
    column: function (ctx, W, H, t, s) {
      var n = Math.round(30 * s.density), r = rng(s.seed);
      for (var i = 0; i < n; i++) {
        var col = s.palette.ink[i % s.palette.ink.length];
        var x = r() * W;
        var w = (2 + r() * 26) * (W / 900);
        var k = 1 + Math.floor(r() * 2), off = r() * TAU;
        var len = H * (0.18 + r() * 0.5);
        var y = ((r() + (ph(t, k) + off) / TAU) % 1) * (H + len) - len;
        var g = ctx.createLinearGradient(0, y, 0, y + len);
        g.addColorStop(0, hexA(col, 0));
        g.addColorStop(0.5, hexA(col, 0.28 + r() * 0.34));
        g.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, len);
      }
    },

    /* 띠 — 두꺼운 면이 겹쳐 흐른다. 넓은 화면에서 시원하다 */
    ribbon: function (ctx, W, H, t, s) {
      var n = Math.round(9 * s.density) + 3, r = rng(s.seed);
      for (var i = 0; i < n; i++) {
        var col = s.palette.ink[i % s.palette.ink.length];
        var y0 = r() * H, th = (0.04 + r() * 0.16) * H * s.weight;
        var wv = 1 + Math.floor(r() * 3), k = 1 + Math.floor(r() * 2);
        var off = r() * TAU, amp = (0.04 + r() * 0.14) * H;
        ctx.fillStyle = hexA(col, (0.2 + r() * 0.22) * s.glow);
        ctx.beginPath();
        for (var x = 0; x <= W; x += 6) {
          var u = x / W;
          ctx.lineTo(x, y0 + Math.sin(u * TAU * wv + ph(t, k) * s.dir + off) * amp);
        }
        for (var x2 = W; x2 >= 0; x2 -= 6) {
          var u2 = x2 / W;
          ctx.lineTo(x2, y0 + th + Math.sin(u2 * TAU * wv + ph(t, k) * s.dir + off) * amp);
        }
        ctx.closePath();
        ctx.fill();
      }
    },

    /* 궤도 — 동심원 호가 각기 다른 속도로 돈다 */
    orbit: function (ctx, W, H, t, s) {
      var n = Math.round(16 * s.density) + 4, r = rng(s.seed);
      var cx = W * 0.5, cy = H * 0.5, R = Math.max(W, H) * 0.55;
      ctx.lineCap = "round";
      for (var i = 0; i < n; i++) {
        var col = s.palette.ink[i % s.palette.ink.length];
        var rr = R * (0.1 + 0.9 * (i + 1) / n);
        var k = 1 + Math.floor(r() * 3), span = 0.5 + r() * 2.2;
        var a0 = r() * TAU + ph(t, k) * s.dir;
        ctx.strokeStyle = hexA(col, (0.18 + r() * 0.3) * s.glow);
        ctx.lineWidth = (1.8 + r() * 4.6) * s.weight * (Math.max(W, H) / 900);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rr, rr * (H / W < 0.5 ? 2.2 : 0.82), s.rot, a0, a0 + span);
        ctx.stroke();
      }
    },

    /* 그물 — 점을 잇는 선. 별자리처럼 보인다 */
    mesh: function (ctx, W, H, t, s) {
      if (!this.pts) {
        var r0 = rng(s.seed), m = Math.round(46 * s.density), a = [];
        for (var i = 0; i < m; i++) {
          a.push({ x: r0(), y: r0(), rx: 0.01 + r0() * 0.05, ry: 0.01 + r0() * 0.05,
                   k: 1 + Math.floor(r0() * 2), off: r0() * TAU });
        }
        this.pts = a;
      }
      var P = this.pts, pos = [];
      for (var j = 0; j < P.length; j++) {
        var p = P[j], a2 = ph(t, p.k) * s.dir + p.off;
        pos.push([(p.x + Math.cos(a2) * p.rx) * W, (p.y + Math.sin(a2) * p.ry) * H]);
      }
      var lim = Math.min(W, H) * 0.26;
      var ink = s.palette.ink;
      ctx.lineWidth = 1.6 * s.weight * (Math.max(W, H) / 900);
      for (var i2 = 0; i2 < pos.length; i2++) {
        for (var j2 = i2 + 1; j2 < pos.length; j2++) {
          var dx = pos[i2][0] - pos[j2][0], dy = pos[i2][1] - pos[j2][1];
          var d2 = Math.sqrt(dx * dx + dy * dy);
          if (d2 > lim) continue;
          ctx.strokeStyle = hexA(ink[(i2 + j2) % ink.length], (1 - d2 / lim) * 0.34 * s.glow);
          ctx.beginPath();
          ctx.moveTo(pos[i2][0], pos[i2][1]);
          ctx.lineTo(pos[j2][0], pos[j2][1]);
          ctx.stroke();
        }
        ctx.fillStyle = hexA(ink[i2 % ink.length], 0.6 * s.glow);
        ctx.beginPath();
        ctx.arc(pos[i2][0], pos[i2][1], 1.6 * s.weight * (Math.max(W, H) / 900), 0, TAU);
        ctx.fill();
      }
    },

    /* 막대 — 이퀄라이저처럼 오르내린다. 전광판에서 잘 읽힌다 */
    bar: function (ctx, W, H, t, s) {
      var tall = s.ar < 1;
      var n = Math.round((tall ? 16 : 28) * s.density);
      var r = rng(s.seed), ink = s.palette.ink;
      for (var i = 0; i < n; i++) {
        var f = i / n;
        var k = 1 + Math.floor(r() * 3), off = r() * TAU;
        var lev = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(ph(t, k) * s.dir + off + f * TAU));
        ctx.fillStyle = hexA(ink[i % ink.length], (0.2 + r() * 0.3) * s.glow);
        if (tall) {
          var bh = H / n * 0.62;
          ctx.fillRect(0, f * H + bh * 0.2, W * lev, bh);
        } else {
          var bw = W / n * 0.62;
          ctx.fillRect(f * W + bw * 0.2, H * (1 - lev), bw, H * lev);
        }
      }
    },

    /* 소용돌이 — 중심에서 풀려 나오는 나선 */
    spiral: function (ctx, W, H, t, s) {
      var arms = 2 + Math.floor(rng(s.seed)() * 4);
      var r = rng(s.seed + 1);
      var cx = W * 0.5, cy = H * 0.5, R = Math.max(W, H) * 0.62;
      ctx.lineCap = "round";
      for (var a2 = 0; a2 < arms; a2++) {
        var col = s.palette.ink[a2 % s.palette.ink.length];
        var k = 1 + Math.floor(r() * 2);
        var turns = 2 + Math.floor(r() * 3);
        ctx.strokeStyle = hexA(col, (0.2 + r() * 0.3) * s.glow);
        ctx.lineWidth = (2 + r() * 4.5) * s.weight * (Math.max(W, H) / 900);
        ctx.beginPath();
        for (var u = 0; u <= 1; u += 0.008) {
          var ang = u * TAU * turns + (a2 / arms) * TAU + ph(t, k) * s.dir + s.rot;
          var rr = R * u;
          var x = cx + Math.cos(ang) * rr;
          var y = cy + Math.sin(ang) * rr * (H / W < 0.55 ? 2.0 : 0.85);
          u === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },

    /* 표류 — 옆으로 천천히 흘러가는 넓은 띠. 어느 비율에나 붙는다 */
    drift: function (ctx, W, H, t, s) {
      var n = Math.round(14 * s.density) + 4, r = rng(s.seed);
      var tall = s.ar < 1;
      for (var i = 0; i < n; i++) {
        var col = s.palette.ink[i % s.palette.ink.length];
        var k = 1 + Math.floor(r() * 2), off = r();
        var band = (tall ? H : W) * (0.06 + r() * 0.22);
        var travel = ((off + (t / PERIOD) * k * s.dir) % 1 + 1) % 1;
        var pos = travel * ((tall ? H : W) + band) - band;
        var g = tall
          ? ctx.createLinearGradient(0, pos, 0, pos + band)
          : ctx.createLinearGradient(pos, 0, pos + band, 0);
        g.addColorStop(0, hexA(col, 0));
        g.addColorStop(0.5, hexA(col, (0.1 + r() * 0.16) * s.glow));
        g.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = g;
        tall ? ctx.fillRect(0, pos, W, band) : ctx.fillRect(pos, 0, band, H);
      }
    },

    /* 설경 — 천천히 내려오는 알갱이. 겨울 문장에 붙는다 */
    snow: function (ctx, W, H, t, s) {
      if (!this.pts) {
        var r0 = rng(s.seed), m = Math.round(300 * s.density), a = [];
        for (var i = 0; i < m; i++) {
          a.push({ x: r0(), y0: r0(), sp: 1 + Math.floor(r0() * 2),
                   sw: 0.01 + r0() * 0.05, off: r0() * TAU,
                   rad: 1.1 + r0() * 3.0, a: 0.5 + r0() * 0.5,
                   c: s.palette.ink[Math.floor(r0() * s.palette.ink.length)] });
        }
        this.pts = a;
      }
      var sc = W / 900;
      for (var j = 0; j < this.pts.length; j++) {
        var p = this.pts[j];
        var y = ((p.y0 + (t / PERIOD) * p.sp) % 1) * H;
        var x = (p.x + Math.sin(ph(t, 1) + p.off) * p.sw) * W;
        var rs = p.rad * sc;
        var gs = ctx.createRadialGradient(x, y, 0, x, y, rs * 3.2);
        gs.addColorStop(0, hexA(p.c, p.a));
        gs.addColorStop(0.4, hexA(p.c, p.a * 0.3));
        gs.addColorStop(1, hexA(p.c, 0));
        ctx.fillStyle = gs;
        ctx.beginPath();
        ctx.arc(x, y, rs * 3.2, 0, TAU);
        ctx.fill();
      }
    }
  };

  global.BomnalGen = {
    compose: compose, Gen: Gen,
    counts: { styles: STYLE_IDS.length, palettes: PALETTES.length, moods: MOODS.length }
  };
})(window);
