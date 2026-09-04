/* 온 미디어아트 에디트 — 조작판
 *
 * 고객이 만지는 값은 전부 URL 쿼리 하나로 모인다. 그 쿼리를 iframe에 넘기면
 * 미리보기가 되고, 같은 쿼리를 tools/render-studio.mjs에 넘기면 4K 납품본이 된다.
 * 고객이 화면에서 본 그림과 우리가 뽑는 그림이 어긋날 자리를 아예 없앤 것이다.
 *
 * 미리보기는 작게 돌린다. 고객 노트북에서 팬이 도는 순간 "무거운 서비스"라는
 * 인상이 남고, 그건 렌더 품질로 만회되지 않는다.
 */
(function () {
  "use strict";

  var ART = "./works/studio-art.html";
  var STORE = "bomnal.studio.v1";

  /* ── 목록 ─────────────────────────────────────────────────
     스타일·색 이름은 엔진(works/studio-art.html)과 같은 순서를 쓴다.
     엔진이 window.STUDIO_STYLES로 내보내지만 iframe 안이라 여기서 한 번 더 적는다.
     둘이 어긋나면 버튼은 있는데 그림이 안 바뀌므로, 아래 배열이 정본이다. */
  var STYLES = [
    ["minimal", "미니멀", "여백이 주인공. 선 몇 개와 원 하나"],
    ["maximal", "맥시멀", "층층이 쌓는다. 밀도가 성격"],
    ["futuristic", "퓨처리스틱", "궤도와 계측선. 재고 있는 화면"],
    ["vector", "벡터 아트", "면으로 자른 도형. 평평하게"],
    ["collage", "콜라주", "오려 붙인 종이. 결이 겹친다"],
    ["retro", "레트로", "수평선과 해. 실크스크린의 층"],
    ["cyber", "사이버펑크", "원근 격자와 글리치"],
    ["pop", "팝아트", "하프톤 점과 굵은 면"],
    ["glass", "글래스", "반투명 판이 겹치며 흐려진다"],
    ["clay", "클레이", "말랑한 덩어리와 부드러운 그림자"],
    ["pixel", "픽셀아트", "저해상도 격자로 계단화"],
    ["editorial", "에디토리얼", "잡지 지면. 규칙선과 여백"],
    ["y2k", "Y2K", "크롬 방울과 별 스파클"],
    ["swiss", "스위스", "격자·대각·굵은 바. 장식 없음"],
    ["surreal", "초현실", "떠 있는 구체와 긴 그림자"],
    ["bohemian", "보헤미안", "아치와 점묘. 흙빛의 반복"],
    ["victorian", "빅토리안", "대칭 아라베스크와 액자"],
    ["graffiti", "그래피티", "스프레이 궤적과 튀는 입자"],
    ["aurora", "오로라", "흐르는 빛의 커튼"],
    ["hand", "손글씨", "압력이 살아 있는 자유곡선"],
    ["inkwash", "수묵", "먹이 종이에 번진 자국"],
    ["wave", "파동", "두 물결이 겹치며 간섭한다"],
    ["flock", "군집", "새떼. 같이 가되 조금씩 어긋난다"],
    ["crystal", "결정", "가장 가까운 씨앗으로 갈린 면"],
    ["thread", "실", "선을 이어 만든 곡선. 스트링아트"],
    ["rain", "비", "빗줄기와 바닥의 파문"],
    ["bloom", "개화", "가운데에서 꽃잎이 열린다"],
    ["circuit", "회로", "직각으로 꺾이는 배선과 접점"],
    ["topo", "등고선", "같은 높이를 잇는 선. 지형이 뜬다"],
    ["mosaic", "모자이크", "조각 타일. 줄눈이 그림을 만든다"],
    ["smoke", "연기", "위로 오르며 흩어진다"],
    ["warp", "격자 왜곡", "반듯한 격자가 힘에 눌린다"],
    ["constellation", "별자리", "가까운 점끼리만 잇는다"],
    ["stripe", "옵아트", "굵기가 변하는 줄무늬"],
    ["spiral", "나선", "한 점에서 풀려 나오는 궤적"],
    ["fracture", "균열", "갈라질수록 가늘어진다"],
    ["neonsign", "네온사인", "유리관에 갇힌 빛"],
    ["paper", "종이", "접힌 면. 각도가 밝기를 가른다"],
    ["bamboo", "대나무", "수직의 마디. 획과 여백"],
    ["orbit", "궤도", "타원을 도는 점과 그 자취"],
  ];

  /* 색. 명화에서 온 것은 출처를 적는다. 전부 저작권이 만료된 작품이고,
     색만 참고했다는 것을 고객에게도 분명히 보여준다. */
  var PALETTES = [
    ["ink", "수묵", "", ["#f5f2ea", "#c9c4b8", "#8a8a8a", "#050505"]],
    ["bomnal", "봄날", "오늘은 봄날 기본색", ["#e8eefc", "#a9c4ff", "#2f6ad8", "#10367d"]],
    ["hokusai", "가나가와 파도", "호쿠사이 · 1831 · 퍼블릭 도메인", ["#eef2f0", "#a9c6d6", "#1b4c78", "#0d2740"]],
    ["gogh", "별이 빛나는 밤", "반 고흐 · 1889 · 퍼블릭 도메인", ["#f2d98a", "#e8b64c", "#2a5fa8", "#12224d"]],
    ["klimt", "황금", "클림트 · 1908 · 퍼블릭 도메인", ["#f0d98a", "#c9a234", "#8a6a1f", "#3a2c10"]],
    ["munch", "절규의 하늘", "뭉크 · 1893 · 퍼블릭 도메인", ["#f2c07a", "#e8934a", "#c4452c", "#3a4a6a"]],
    ["monet", "수련", "모네 · 1906 · 퍼블릭 도메인", ["#dfe8d8", "#a9c4a0", "#5a8f7b", "#7a6a9a"]],
    ["vermeer", "진주", "베르메르 · 1665 · 퍼블릭 도메인", ["#f0e6d2", "#d8b46a", "#2a4a8f", "#14213d"]],
    ["hiroshige", "명소백경", "히로시게 · 1857 · 퍼블릭 도메인", ["#f2ece0", "#b83c2c", "#2a4a7a", "#1a2a44"]],
    ["turner", "노을", "터너 · 1839 · 퍼블릭 도메인", ["#f5e2c0", "#e8a95a", "#d87a3c", "#6a4a3a"]],
    ["dancheong", "단청", "한국 전통 채색", ["#f0ede4", "#e0b23c", "#c8482f", "#1f7a6e"]],
    ["baekja", "백자", "조선 백자의 따뜻한 흰빛", ["#f2ede3", "#d9d2c4", "#a89c88", "#6a6152"]],
    ["cheonghwa", "청화백자", "백자에 코발트 청", ["#f2ede3", "#7a9ccc", "#2b4a8c", "#16233f"]],
    ["seurat", "점묘", "쇠라 · 1886 · 퍼블릭 도메인", ["#f0e4b8", "#7aa8c4", "#c4805a", "#4a6a4a"]],
    ["kandinsky", "구성", "칸딘스키 · 1923 · 퍼블릭 도메인", ["#f2ece0", "#e8c34a", "#c4452c", "#2a5fa8"]],
    ["mondrian", "삼원색", "몬드리안 · 1930 · 퍼블릭 도메인", ["#f7f7f2", "#f2d22c", "#d82c2c", "#2c4ad8"]],
    ["schiele", "마른 흙", "실레 · 1912 · 퍼블릭 도메인", ["#e8dcc4", "#d8a05a", "#b85c4a", "#6a7a5a"]],
    ["mono", "흑백", "", ["#ffffff", "#c0c0c0", "#7a7a7a", "#000000"]],
    ["neon", "네온", "", ["#e6faff", "#00e5c0", "#3d6bff", "#ff3d8a"]],
  ];

  var SLIDERS = [
    ["density", "밀도", "화면을 얼마나 채울지", 0, 100],
    ["scale", "크기", "요소 하나의 크기", 0, 100],
    ["speed", "속도", "얼마나 빨리 움직일지", 0, 100],
    ["contrast", "대비", "밝고 어두움의 차이", 0, 100],
    ["glow", "번짐", "빛이 퍼지는 정도", 0, 100],
    ["grain", "그레인", "필름 같은 입자. LED 밴딩을 덮는다", 0, 100],
    ["accent", "포인트 색", "강조색을 얼마나 쓸지", 0, 100],
  ];

  var MOTIONS = [["drift", "흐름"], ["pulse", "맥박"], ["orbit", "회전"], ["still", "정지"]];
  var SYMS = [["1", "없음"], ["2", "2겹"], ["4", "4겹"], ["6", "6겹"]];

  /* 화면 규격. 실제 현장에서 나오는 비율만 넣는다. */
  var RATIOS = [
    ["16:9", 16 / 9, "로비 미디어월 · 일반 사이니지"],
    ["32:9", 32 / 9, "건물 외벽 와이드 전광판"],
    ["21:9", 21 / 9, "가로형 벽면"],
    ["9:16", 9 / 16, "세로형 사이니지"],
    ["1:6", 1 / 6, "기둥형 세로 화면"],
    ["1:1", 1, "정사각 화면"],
  ];

  /* 미리보기 장면. 사진 원판 위의 화면 영역은 실제 픽셀을 재서 넣었다.
     원판이 없는 장면은 CSS로 그린다. 목업 사진이 생기면 plate만 갈아 끼우면 된다. */
  var SCENES = [
    { id: "lobby", label: "실내 로비", plate: "./assets/lobby-blank.webp",
      screen: { left: 30.25, top: 29.45, width: 39.5, height: 36.51 },
      caption: "실내 로비 LED 미디어월" },
    { id: "plaza", label: "야외 전광판", plate: "./assets/led-panel-plaza.webp",
      screen: { left: 22.88, top: 17.25, width: 54.56, height: 63.72 },
      caption: "광장 대형 LED 전광판" },
    { id: "facade", label: "건물 외벽", plate: "", drawn: "facade",
      screen: { left: 21, top: 26, width: 58, height: 44 },
      caption: "건물 외벽 미디어파사드 (야간)" },
    { id: "frame", label: "디지털 액자", plate: "", drawn: "frame",
      screen: { left: 26, top: 18, width: 48, height: 56 },
      caption: "실내 디지털 액자" },
    { id: "raw", label: "화면만", plate: "", drawn: "raw",
      screen: { left: 4, top: 4, width: 92, height: 92 },
      caption: "목업 없이 화면만" },
  ];

  /* ── 상태 ─────────────────────────────────────────────────── */
  var DEFAULTS = {
    style: "aurora", palette: "ink",
    density: 50, scale: 50, speed: 50, contrast: 55, glow: 35, grain: 18, accent: 60,
    motion: "drift", symmetry: "1", invert: false,
    ratio: "16:9", scene: "lobby", seed: 4821937,
  };
  var st = Object.assign({}, DEFAULTS);

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };

  /* 시드 난수 — 랜덤 버튼용. 여기서는 Math.random을 써도 된다.
     뽑힌 시드가 정해지는 순간부터 그림은 완전히 결정론적이기 때문이다. */
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function newSeed() { return 1000000 + Math.floor(Math.random() * 8999999); }

  /* ── 저장 ─────────────────────────────────────────────────── */
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) { /* 무시 */ }
  }
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(STORE) || "null");
      if (v && typeof v === "object") Object.assign(st, DEFAULTS, v);
    } catch (e) { /* 무시 */ }
  }

  /* ── 미리보기 크기 ────────────────────────────────────────────
     실제 렌더 해상도가 아니라 "화면에 보이는 크기"만 정한다.
     4K로 미리보기를 돌리면 브라우저가 버티지 못한다. */
  function previewSize() {
    var ar = ratioValue();
    var base = 620;                      // 긴 변 기준 픽셀
    if (ar >= 1) return { w: Math.round(base), h: Math.round(base / ar) };
    return { w: Math.round(base * ar), h: Math.round(base) };
  }
  function ratioValue() {
    for (var i = 0; i < RATIOS.length; i++) if (RATIOS[i][0] === st.ratio) return RATIOS[i][1];
    return 16 / 9;
  }

  /* ── 아트 주소 만들기 ─────────────────────────────────────────
     이 문자열이 곧 작품의 정의다. 의뢰서에도 그대로 실린다. */
  function artQuery(size) {
    var s = size || previewSize();
    return "w=" + s.w + "&h=" + s.h +
      "&style=" + encodeURIComponent(st.style) +
      "&palette=" + encodeURIComponent(st.palette) +
      "&density=" + st.density + "&scale=" + st.scale + "&speed=" + st.speed +
      "&contrast=" + st.contrast + "&glow=" + st.glow + "&grain=" + st.grain +
      "&accent=" + st.accent +
      "&motion=" + encodeURIComponent(st.motion) +
      "&symmetry=" + st.symmetry +
      (st.invert ? "&invert=1" : "") +
      "&seed=" + st.seed;
  }
  /* 납품 규격. 우리가 실제로 뽑을 때 쓰는 값이다. */
  function deliverSize() {
    var ar = ratioValue();
    if (ar >= 1) return { w: 3840, h: Math.round(3840 / ar / 2) * 2 };
    return { w: Math.round(2160 * ar / 2) * 2, h: 3840 };
  }

  /* ── 그리기 ────────────────────────────────────────────────── */
  var frame = $("[data-art-frame]");
  var lastQuery = "";
  var applyTimer = null;
  var userPaused = false;

  /* 미리보기를 재생·정지한다. iframe을 지우지 않고 루프만 세운다.
     지우면 다시 켤 때 처음부터 시작해 고객이 보던 장면이 사라진다. */
  function setPlaying(on) {
    try {
      var w = frame.contentWindow;
      if (w) w.postMessage(on ? "bomnal:play" : "bomnal:pause", "*");
    } catch (e) { /* 무시 */ }
  }

  function applyArt(immediate) {
    var q = artQuery();
    if (q === lastQuery) return;
    clearTimeout(applyTimer);
    /* 슬라이더를 끌면 초당 수십 번 바뀐다. iframe을 그때마다 다시 만들면
       고객 화면이 깜빡이고 느려진다. 손을 멈춘 뒤에 한 번만 바꾼다. */
    applyTimer = setTimeout(function () {
      lastQuery = q;
      frame.src = ART + "?" + q;
    }, immediate ? 0 : 90);
  }

  /* ── 장면 ─────────────────────────────────────────────────── */
  function applyScene() {
    var sc = null;
    for (var i = 0; i < SCENES.length; i++) if (SCENES[i].id === st.scene) sc = SCENES[i];
    if (!sc) sc = SCENES[0];

    var scene = $("[data-scene]");
    var plate = $("[data-plate]");
    var screen = $("[data-screen]");

    scene.dataset.drawn = sc.drawn || "";
    if (sc.plate) {
      plate.src = sc.plate;
      plate.alt = sc.caption + " 목업";
      plate.hidden = false;
    } else {
      plate.removeAttribute("src");
      plate.hidden = true;
    }
    screen.style.left = sc.screen.left + "%";
    screen.style.top = sc.screen.top + "%";
    screen.style.width = sc.screen.width + "%";
    screen.style.height = sc.screen.height + "%";
    $("[data-scene-caption]").textContent = sc.caption;

    /* 화면 영역 안에서 작품의 비율을 지킨다. 늘려 붙이면 현장에서 본
       것과 다른 그림이 되고, 그건 고객을 속이는 미리보기다. */
    var ar = ratioValue();
    screen.style.setProperty("--art-ar", String(ar));
  }

  /* ── 조작판 만들기 ────────────────────────────────────────── */
  function buildStyles() {
    var wrap = $("[data-styles]");
    wrap.textContent = "";
    STYLES.forEach(function (s, i) {
      var b = el("button", "style-card");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.dataset.style = s[0];
      b.innerHTML =
        '<span class="style-num">' + String(i + 1).padStart(2, "0") + "</span>" +
        '<span class="style-name"></span><span class="style-desc"></span>';
      b.querySelector(".style-name").textContent = s[1];
      b.querySelector(".style-desc").textContent = s[2];
      b.addEventListener("click", function () { st.style = s[0]; sync(); });
      wrap.appendChild(b);
    });
  }

  function buildPalettes() {
    var wrap = $("[data-palettes]");
    wrap.textContent = "";
    PALETTES.forEach(function (p) {
      var b = el("button", "pal-card");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.dataset.palette = p[0];
      var sw = el("span", "pal-swatch");
      p[3].forEach(function (c) {
        var d = el("span");
        d.style.background = c;
        sw.appendChild(d);
      });
      b.appendChild(sw);
      b.appendChild(el("span", "pal-name", p[1]));
      if (p[2]) b.appendChild(el("span", "pal-src", p[2]));
      b.title = p[2] || p[1];
      b.addEventListener("click", function () { st.palette = p[0]; sync(); });
      wrap.appendChild(b);
    });
  }

  function buildSliders() {
    var wrap = $("[data-sliders]");
    wrap.textContent = "";
    SLIDERS.forEach(function (s) {
      var row = el("div", "slider-row");
      var lab = el("label", "slider-label");
      lab.setAttribute("for", "sl-" + s[0]);
      lab.appendChild(el("b", null, s[1]));
      lab.appendChild(el("small", null, s[2]));
      var val = el("output", "slider-val");
      val.dataset.for = s[0];
      var inp = document.createElement("input");
      inp.type = "range"; inp.min = s[3]; inp.max = s[4]; inp.step = 1;
      inp.id = "sl-" + s[0];
      inp.dataset.slider = s[0];
      inp.addEventListener("input", function () {
        st[s[0]] = +inp.value;
        val.textContent = inp.value;
        applyArt(); renderSpec(); save();
      });
      row.appendChild(lab); row.appendChild(val); row.appendChild(inp);
      wrap.appendChild(row);
    });
  }

  function buildSeg(name, items, onPick) {
    var wrap = document.querySelector('[data-seg="' + name + '"]');
    wrap.textContent = "";
    items.forEach(function (it) {
      var b = el("button", "seg-btn");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.dataset.val = it[0];
      b.appendChild(el("b", null, it[1]));
      if (it[2]) b.appendChild(el("small", null, it[2]));
      b.addEventListener("click", function () { onPick(it[0]); });
      wrap.appendChild(b);
    });
  }

  /* ── 요약 ─────────────────────────────────────────────────── */
  function labelOf(list, id, idx) {
    for (var i = 0; i < list.length; i++) if (String(list[i][0]) === String(id)) return list[i][idx || 1];
    return id;
  }

  function renderSpec() {
    var d = deliverSize();
    var rows = [
      ["스타일", labelOf(STYLES, st.style)],
      ["색", labelOf(PALETTES, st.palette) + (labelOf(PALETTES, st.palette, 2) ? " (" + labelOf(PALETTES, st.palette, 2) + ")" : "")],
      ["화면 규격", st.ratio + " · 납품 " + d.w + "×" + d.h],
      ["움직임", labelOf(MOTIONS, st.motion) + " · 대칭 " + labelOf(SYMS, st.symmetry)],
      ["조절", "밀도 " + st.density + " · 크기 " + st.scale + " · 속도 " + st.speed + " · 대비 " + st.contrast + " · 번짐 " + st.glow + " · 그레인 " + st.grain + " · 포인트 " + st.accent],
      ["시드", String(st.seed) + (st.invert ? " · 밝은 바탕" : "")],
    ];
    var dl = $("[data-spec]");
    dl.textContent = "";
    rows.forEach(function (r) {
      var wrapEl = el("div");
      wrapEl.appendChild(el("dt", null, r[0]));
      wrapEl.appendChild(el("dd", null, r[1]));
      dl.appendChild(wrapEl);
    });

    /* 조합 수는 지어내지 않고 실제 조작 범위에서 센다. */
    var combos = STYLES.length * PALETTES.length * MOTIONS.length * SYMS.length *
      RATIOS.length * 2 * Math.pow(101, SLIDERS.length);
    $("[data-combo]").textContent =
      "지금 조작판으로 만들 수 있는 조합은 " + fmtBig(combos) + "가지입니다. 시드까지 세면 그보다 900만 배 많습니다.";
  }

  function fmtBig(n) {
    var units = [[1e16, "경"], [1e12, "조"], [1e8, "억"], [1e4, "만"]];
    for (var i = 0; i < units.length; i++) {
      if (n >= units[i][0]) return (n / units[i][0]).toFixed(1).replace(/\.0$/, "") + units[i][1];
    }
    return Math.round(n).toLocaleString("ko-KR");
  }

  /* ── 전체 반영 ────────────────────────────────────────────── */
  function sync(immediate) {
    document.querySelectorAll("[data-style]").forEach(function (b) {
      var on = b.dataset.style === st.style;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-checked", String(on));
    });
    document.querySelectorAll("[data-palette]").forEach(function (b) {
      var on = b.dataset.palette === st.palette;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-checked", String(on));
    });
    SLIDERS.forEach(function (s) {
      var inp = document.querySelector('[data-slider="' + s[0] + '"]');
      var out = document.querySelector('[data-for="' + s[0] + '"]');
      if (inp) inp.value = st[s[0]];
      if (out) out.textContent = st[s[0]];
    });
    [["motion", st.motion], ["symmetry", st.symmetry], ["ratio", st.ratio], ["scene", st.scene]]
      .forEach(function (pair) {
        document.querySelectorAll('[data-seg="' + pair[0] + '"] .seg-btn').forEach(function (b) {
          var on = String(b.dataset.val) === String(pair[1]);
          b.classList.toggle("is-on", on);
          b.setAttribute("aria-checked", String(on));
        });
      });
    var inv = $("[data-toggle='invert']");
    if (inv) inv.checked = !!st.invert;
    var seed = $("[data-seed]");
    if (seed && seed.value !== String(st.seed)) seed.value = st.seed;

    applyScene();
    applyArt(immediate);
    renderSpec();
    save();
  }

  /* ── 랜덤 ─────────────────────────────────────────────────── */
  function shuffleStyle() { st.style = pick(STYLES)[0]; }
  function shufflePalette() { st.palette = pick(PALETTES)[0]; }
  function shuffleTune() {
    SLIDERS.forEach(function (s) {
      /* 양 끝값은 대체로 볼 게 없다. 가운데 쪽에서 뽑는다. */
      st[s[0]] = 12 + Math.floor(Math.random() * 76);
    });
    st.motion = pick(MOTIONS)[0];
    st.symmetry = pick(SYMS)[0];
  }
  function shuffleAll() {
    shuffleStyle(); shufflePalette(); shuffleTune();
    st.seed = newSeed();
    st.invert = Math.random() < 0.22;
  }

  /* ── 의뢰 ─────────────────────────────────────────────────── */
  var dialog = $("[data-order-dialog]");

  function specText() {
    var d = deliverSize();
    return [
      "[온 미디어아트 에디트 · 고객이 만든 설정]",
      "",
      "· 스타일: " + labelOf(STYLES, st.style) + " (" + st.style + ")",
      "· 색: " + labelOf(PALETTES, st.palette) + " (" + st.palette + ")"
        + (labelOf(PALETTES, st.palette, 2) ? " — " + labelOf(PALETTES, st.palette, 2) : ""),
      "· 화면 규격: " + st.ratio + " · 납품 " + d.w + "×" + d.h,
      "· 움직임: " + labelOf(MOTIONS, st.motion) + " · 대칭 " + labelOf(SYMS, st.symmetry)
        + (st.invert ? " · 밝은 바탕" : ""),
      "· 조절: 밀도 " + st.density + " / 크기 " + st.scale + " / 속도 " + st.speed
        + " / 대비 " + st.contrast + " / 번짐 " + st.glow + " / 그레인 " + st.grain
        + " / 포인트 " + st.accent,
      "· 시드: " + st.seed,
      "",
      "재현용 파라미터 (그대로 렌더에 넣으면 같은 그림이 나옵니다)",
      artQuery(d),
    ].join("\n");
  }

  function openOrder(wantRandom) {
    $("[data-order-lede]").textContent = wantRandom
      ? "고르신 방향을 바탕으로 저희가 변주 3종을 만들어 보내드립니다. 설정은 아래 그대로 함께 접수됩니다."
      : "아래 설정 그대로 접수됩니다. 같은 시드로 렌더하므로 지금 보고 계신 그림이 그대로 납품본이 됩니다.";
    $("[data-want-random]").checked = !!wantRandom;
    $("[data-order-status]").textContent = "";
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeOrder() {
    if (dialog.close) dialog.close();
    else dialog.removeAttribute("open");
  }

  async function sendOrder() {
    var form = $("[data-order-form]");
    var get = function (n) { return (form.elements[n] && form.elements[n].value || "").trim(); };
    var status = $("[data-order-status]");
    if (!get("organization") || !get("name") || !get("phone")) {
      status.textContent = "기관명 · 담당자 · 연락처를 적어 주세요. 어디로 보낼지 알아야 합니다.";
      status.dataset.kind = "warn";
      return;
    }
    var wantRandom = $("[data-want-random]").checked;
    var btn = document.querySelector('[data-act="order-send"]');
    btn.disabled = true; btn.textContent = "보내는 중…";
    status.dataset.kind = ""; status.textContent = "보내는 중입니다.";

    var payload = {
      organization: get("organization"),
      name: get("name"),
      phone: get("phone"),
      email: get("email"),
      service: ["온 미디어아트 에디트 제작 의뢰"].concat(wantRandom ? ["변주 3종 랜덤 제작"] : []),
      message: specText() + "\n\n■ 현장 정보 · 하고 싶은 말\n" + (get("note") || "—")
        + (wantRandom ? "\n\n■ 요청: 이 방향으로 변주 3종을 저희가 랜덤으로 만들어 주기를 원함" : ""),
      page: "/studio",
    };

    try {
      var res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("status " + res.status);
      status.dataset.kind = "ok";
      status.textContent = "접수됐습니다. 확인 후 24시간 이내에 연락드립니다.";
      btn.textContent = "접수 완료";
    } catch (err) {
      /* 접수 창구가 막혀도 고객이 만든 설정을 잃게 두지 않는다. */
      status.dataset.kind = "warn";
      status.textContent = "접수 창구에 연결하지 못했습니다. 메일 앱을 엽니다.";
      btn.disabled = false; btn.textContent = "보내기";
      location.href = "mailto:studio@publicbloom.art?subject=" +
        encodeURIComponent("[온 미디어아트 에디트] " + get("organization")) +
        "&body=" + encodeURIComponent(payload.message + "\n\n담당자: " + get("name") + " / " + get("phone"));
    }
  }

  /* ── 버튼 배선 ────────────────────────────────────────────── */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]");
    if (!t) return;
    var act = t.dataset.act;
    if (act === "shuffle-all") { shuffleAll(); sync(true); }
    else if (act === "shuffle-style") { shuffleStyle(); sync(true); }
    else if (act === "shuffle-palette") { shufflePalette(); sync(true); }
    else if (act === "shuffle-tune") { shuffleTune(); sync(true); }
    else if (act === "shuffle-seed") { st.seed = newSeed(); sync(true); }
    else if (act === "order") openOrder(false);
    else if (act === "ask-random") openOrder(true);
    else if (act === "order-send") sendOrder();
    else if (act === "order-close") closeOrder();
    else if (act === "copy-spec") {
      var txt = specText();
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () {
        t.textContent = "복사했습니다";
        setTimeout(function () { t.textContent = "설정 복사"; }, 1600);
      });
    } else if (act === "pause") {
      var on = t.getAttribute("aria-pressed") === "true";
      t.setAttribute("aria-pressed", String(!on));
      userPaused = !on;
      $("[data-pause-label]").textContent = on ? "멈춤" : "재생";
      setPlaying(on);
    }
  });

  /* ── 시작 ─────────────────────────────────────────────────── */
  function init() {
    load();
    buildStyles();
    buildPalettes();
    buildSliders();
    buildSeg("motion", MOTIONS, function (v) { st.motion = v; sync(true); });
    buildSeg("symmetry", SYMS, function (v) { st.symmetry = v; sync(true); });
    buildSeg("ratio", RATIOS.map(function (r) { return [r[0], r[0], r[2]]; }), function (v) { st.ratio = v; sync(true); });
    buildSeg("scene", SCENES.map(function (s) { return [s.id, s.label]; }), function (v) { st.scene = v; sync(); });

    var seed = $("[data-seed]");
    seed.addEventListener("change", function () {
      var v = parseInt(seed.value.replace(/[^0-9]/g, ""), 10);
      st.seed = Number.isFinite(v) && v > 0 ? v : newSeed();
      sync(true);
    });
    $("[data-toggle='invert']").addEventListener("change", function (e2) {
      st.invert = e2.target.checked; sync(true);
    });

    document.querySelector('[data-count="style"]').textContent = STYLES.length;
    document.querySelector('[data-count="palette"]').textContent = PALETTES.length;

    sync(true);

    /* 화면 밖으로 나가면 루프를 멈춘다. 보이지도 않는 그림 때문에
       고객 노트북이 더워질 이유가 없다. 사람이 직접 멈춰둔 상태는 존중한다. */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (userPaused) return;
          setPlaying(en.isIntersecting);
        });
      }, { rootMargin: "80px" }).observe($("[data-scene-wrap]"));
    }

    /* 탭을 다른 데로 옮겨도 멈춘다. */
    document.addEventListener("visibilitychange", function () {
      if (userPaused) return;
      setPlaying(!document.hidden);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
