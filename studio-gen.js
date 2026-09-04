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
    { id: "형광",   bg: "#06080a", ink: ["#c6ff4f", "#4fffd0", "#ff4f8b", "#4f9bff", "#ffffff"] }
  ];

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

  var MOOD = [
    { re: /고요|차분|느리|잔잔|평온|은은/, speed: 1, density: 0.7 },
    { re: /경쾌|빠르|활기|역동|신나|화려/, speed: 3, density: 1.5 },
    { re: /웅장|장엄|묵직|깊/,             speed: 1, density: 1.35 },
    { re: /화사|밝|따뜻|산뜻/,             speed: 2, density: 1.1 }
  ];

  var STYLE_IDS = ["flow", "wave", "particle", "contour", "grid", "bloom", "column", "snow"];
  var STYLE_KO = {
    flow: "흐름", wave: "파동", particle: "입자", contour: "등고",
    grid: "격자", bloom: "번짐", column: "기둥", snow: "설경"
  };

  /* ── 문장 읽기 ────────────────────────────────────────────
   * 같은 문장이라도 씨앗이 바뀌면 다른 화면이 나온다.
   * "다시 만들기"를 누를 때마다 씨앗만 바꾼다. */
  function compose(text, seed) {
    var r = rng(seed);
    var pal = null, style = null, tags = [];

    LEX.forEach(function (e) {
      if (!e.re.test(text)) return;
      if (e.pal && !pal) pal = e.pal;
      if (e.style && !style) style = e.style;
      tags = tags.concat(e.tags);
    });

    var speed = 2, density = 1;
    MOOD.forEach(function (m) {
      if (m.re.test(text)) { speed = m.speed; density = m.density; }
    });

    var palette = pal
      ? PALETTES.filter(function (p) { return p.id === pal; })[0]
      : PALETTES[Math.floor(r() * PALETTES.length)];
    if (!style) style = STYLE_IDS[Math.floor(r() * STYLE_IDS.length)];

    // 같은 낱말이라도 매번 조금씩 달라지도록 흔든다
    density *= 0.85 + r() * 0.4;
    var layers = 3 + Math.floor(r() * 3);

    if (!tags.length) tags = ["자유 구성"];
    tags = tags.filter(function (t, i, a) { return a.indexOf(t) === i; });

    return {
      seed: seed, style: style, palette: palette, tags: tags,
      speed: speed, density: density, layers: layers,
      rot: r() * TAU, warp: 0.4 + r() * 1.2, grain: r()
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
    return this;
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

  Gen.prototype.draw = function (t) {
    var s = this.spec;
    if (!s) return;
    var ctx = this.ctx, W = this.cv.width, H = this.cv.height;

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = s.palette.bg;
    ctx.fillRect(0, 0, W, H);
    var bg = ctx.createRadialGradient(W * 0.5, H * 0.55, 0, W * 0.5, H * 0.55, Math.max(W, H) * 0.75);
    bg.addColorStop(0, hexA(s.palette.ink[1], 0.16));
    bg.addColorStop(1, hexA(s.palette.ink[1], 0));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = "lighter";
    (STYLES[s.style] || STYLES.flow).call(this, ctx, W, H, t, s);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    this.watermark(ctx, W, H);
  };

  Gen.prototype.watermark = function (ctx, W, H) {
    var fs = Math.max(12, Math.round(W / 34));
    ctx.font = "700 " + fs + "px Pretendard, sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillText(this.mark, W - 15, H - 15);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillText(this.mark, W - 16, H - 16);
    ctx.textAlign = "left";
    ctx.font = "600 " + Math.round(fs * 0.6) + "px Pretendard, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.fillText("시연본 · 5초 반복", 16, H - 16);
  };

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
        ctx.lineWidth = (0.6 + r() * 3.4) * (W / 900);
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
    wave: function (ctx, W, H, t, s) {
      var n = Math.round(7 * s.density) + 3, r = rng(s.seed);
      for (var i = 0; i < n; i++) {
        var col = s.palette.ink[i % s.palette.ink.length];
        var base = H * (0.25 + 0.85 * (i / n));
        var amp = (0.03 + r() * 0.07) * H;
        var wv = 1 + Math.floor(r() * 3);
        var k = 1 + Math.floor(r() * 2);
        var off = r() * TAU;
        ctx.fillStyle = hexA(col, 0.13 + 0.2 * (1 - i / n));
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (var x = 0; x <= W; x += 5) {
          var u = x / W;
          ctx.lineTo(x, base + Math.sin(u * TAU * wv + ph(t, k) + off) * amp
                          + Math.sin(u * TAU * (wv + 2) - ph(t, k)) * amp * 0.35);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      }
    },

    /* 입자 — 제자리에서 타원을 도는 점. 한 바퀴가 곧 5초다 */
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
      ctx.lineWidth = Math.max(1, 1.2 * (W / 900));
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
    STYLE_KO: STYLE_KO,
    counts: { styles: STYLE_IDS.length, palettes: PALETTES.length }
  };
})(window);
