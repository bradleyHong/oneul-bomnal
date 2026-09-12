/*
 * 현장에 걸어보기.
 *
 * 고른 화면을 실제 사이니지 사진 위에 원근을 맞춰 얹는다. 화면 규격
 * 숫자만 보고는 "우리 벽에 걸면 어떻게 보이나"를 알 수 없다. 사람이
 * 같이 찍힌 사진에 얹으면 그 자리에서 알 수 있다.
 *
 * 늘려 붙이지 않는다. 면마다 제 비율로 작품을 '다시 그린다'. 우리가
 * 파는 것이 영상 파일이 아니라 코드라서 되는 일이고, 이 화면이 그걸
 * 말로 설명하지 않고 보여 준다.
 *
 * 자리 좌표는 assets/mockup/plates.json 에 0~1 로 적혀 있다.
 * tools/build-mockups.py 가 크로마로 비워 둔 자리를 재서 만든다.
 */
(function (global) {
  "use strict";

  var BOOK = "./assets/mockup/plates.json";

  /* 원본 직사각형을 사진 속 사각형에 얹는 3×3 변환을 푼다.
     미지수 여덟 개짜리 일차연립방정식이라 소거법이면 충분하다. */
  function homography(src, dst) {
    var A = [], b = [], i;
    for (i = 0; i < 4; i++) {
      var x = src[i][0], y = src[i][1], X = dst[i][0], Y = dst[i][1];
      A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.push(X);
      A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.push(Y);
    }
    for (i = 0; i < 8; i++) {
      var p = i;
      for (var r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      if (Math.abs(A[p][i]) < 1e-12) return null;          // 풀리지 않는 배치
      var t = A[i]; A[i] = A[p]; A[p] = t;
      var tb = b[i]; b[i] = b[p]; b[p] = tb;
      for (var r2 = 0; r2 < 8; r2++) {
        if (r2 === i) continue;
        var f = A[r2][i] / A[i][i];
        for (var c = i; c < 8; c++) A[r2][c] -= f * A[i][c];
        b[r2] -= f * b[i];
      }
    }
    var h = [];
    for (i = 0; i < 8; i++) h.push(b[i] / A[i][i]);
    return h;                                               // a b c d e f g h
  }

  /* CSS 는 열 우선으로 적는다. 2차원 변환이므로 z 줄은 그대로 둔다. */
  function toMatrix3d(h) {
    return "matrix3d(" + [
      h[0], h[3], 0, h[6],
      h[1], h[4], 0, h[7],
      0, 0, 1, 0,
      h[2], h[5], 0, 1
    ].join(",") + ")";
  }

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function Mock(root) {
    this.root = root;
    this.plates = null;
    this.active = null;
    this.gens = [];
    this.spec = null;
    this.still = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)");

    this.pick = el("div", "mock-pick");
    this.stage = el("div", "mock-stage");
    this.meta = el("p", "mock-meta");
    root.appendChild(this.stage);
    root.appendChild(this.pick);
    root.appendChild(this.meta);

    var self = this;
    addEventListener("resize", function () { self.place(); }, { passive: true });
    document.addEventListener("bn:picked", function (e) { self.setSpec(e.detail); });

    /* 이 자리는 화면을 고르기 전까지 hidden 인 상자 안에 있다. 그동안은
       폭이 0이라 자리를 잴 수 없다. 상자가 열려 크기가 생기는 순간
       다시 재야 한다 — 안 그러면 눕히지 않은 캔버스가 왼쪽 위에
       평평하게 붙어 있는다. */
    if (global.ResizeObserver) {
      new global.ResizeObserver(function () { self.place(); }).observe(this.stage);
    }

    /* 화면 밖에 있을 때까지 그릴 이유가 없다. 스튜디오 본 화면과 겹쳐
       돌면 둘이 합쳐 프레임이 떨어진다. */
    this.seen = true;
    if (global.IntersectionObserver) {
      this.seen = false;
      new global.IntersectionObserver(function (es) {
        var on = es[0] && es[0].isIntersecting;
        if (on === self.seen) return;
        self.seen = on;
        if (on) self.paint(); else self.stop();
      }, { rootMargin: "120px 0px" }).observe(this.stage);
    }
  }

  Mock.prototype.load = function () {
    var self = this;
    return fetch(BOOK).then(function (r) { return r.json(); }).then(function (list) {
      self.plates = list;
      list.forEach(function (p, i) {
        var b = el("button", "mock-chip");
        b.type = "button";
        b.appendChild(el("b", null, p.label));
        b.appendChild(el("span", null, p.place));
        b.addEventListener("click", function () { self.show(i); });
        self.pick.appendChild(b);
      });
      self.show(0);
      if (self.spec) self.paint();       // 부르기 전에 이미 골라져 있었다
    }).catch(function () {
      /* 판을 못 불러오면 이 자리는 통째로 없는 편이 낫다. 빈 상자가
         남으면 "덜 만든 자리"로 읽힌다. */
      self.root.hidden = true;
    });
  };

  Mock.prototype.setSpec = function (spec) {
    this.spec = spec;
    this.paint();
  };

  Mock.prototype.show = function (i) {
    var p = this.plates[i];
    if (!p) return;
    this.active = p;
    [].forEach.call(this.pick.children, function (b, k) {
      b.classList.toggle("is-on", k === i);
      b.setAttribute("aria-pressed", k === i ? "true" : "false");
    });

    this.stop();
    this.stage.textContent = "";
    var img = el("img", "mock-img");
    img.src = p.image;
    img.alt = p.label + " 목업";
    img.width = p.size[0];
    img.height = p.size[1];
    img.decoding = "async";
    this.stage.appendChild(img);

    var self = this;
    this.surfaces = p.surfaces.map(function (s) {
      var c = el("canvas", "mock-surface");
      c.setAttribute("aria-hidden", "true");
      self.stage.appendChild(c);
      return { def: s, canvas: c };
    });

    /* 앞가림.
       화면 자리는 사각형인데 그 앞에 사람이 서 있으면 사각형이 사람을
       덮는다. 두 면 기둥에서 아이 머리가 통째로 지워졌다 — 서 있는
       사람 앞으로 화면이 나올 수는 없다.
       사진에서 떼어 둔 "화면 앞에 있는 것"만 작품 위에 다시 얹는다.
       사진과 같은 크기·같은 자리라 눕힐 필요가 없다. */
    if (p.front) {
      var fr = el("img", "mock-front");
      fr.src = p.front;
      fr.alt = "";
      fr.setAttribute("aria-hidden", "true");
      fr.decoding = "async";
      this.stage.appendChild(fr);
    }

    if (img.complete) { this.place(); this.paint(); }
    else img.addEventListener("load", function () { self.place(); self.paint(); });

    /* 늘려 붙인 것이 아니라는 말을 여기서 한 번 한다. 이 화면이 하려는
       말이 그것이고, 그림만 보아서는 구분되지 않는다. */
    this.meta.textContent = p.wrap && p.surfaces.length > 1
      ? p.label + " · 펼친 비율 " + ratioText(p.surfaces.reduce(function (a, s) { return a + (s.ratio || 0); }, 0)) +
        " · 두 면을 한 화면으로 이어 그립니다. 모서리를 넘어 그림이 계속되므로" +
        " 화면 두 대가 아니라 기둥 하나로 보입니다. 사진 속 사람과 견주어 크기를 가늠해 보세요."
      : p.label + " · " +
        p.surfaces.map(function (s) { return "면 비율 " + ratioText(s.ratio); }).join(" · ") +
        " · 그 비율로 다시 그린 화면입니다. 늘려 붙인 것이 아닙니다." +
        " 사진 속 사람과 견주어 크기를 가늠해 보세요.";
  };

  function ratioText(r) {
    if (!r) return "—";
    if (r >= 1) return (Math.round(r * 10) / 10) + " : 1";
    return "1 : " + (Math.round((1 / r) * 10) / 10);
  }

  /* 캔버스를 사진 속 사각형 자리에 얹는다. 사진이 어떤 크기로 보이든
     좌표는 0~1 이라 다시 계산하면 그대로 맞는다. */
  Mock.prototype.place = function () {
    if (!this.active || !this.surfaces) return;
    var img = this.stage.querySelector(".mock-img");
    if (!img) return;
    var W = img.clientWidth, H = img.clientHeight;
    if (!W || !H) return;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);

    this.surfaces.forEach(function (s) {
      var q = s.def.quad.map(function (p) { return [p[0] * W, p[1] * H]; });
      /* 원본 직사각형의 크기는 화면에 보이는 크기에 맞춘다. 너무 작게
         그려 늘리면 뭉개지고, 너무 크게 그리면 그리는 값만 비싸다. */
      var wide = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
      var tall = Math.hypot(q[2][0] - q[0][0], q[2][1] - q[0][1]);
      var ratio = s.def.ratio || (wide / Math.max(1, tall));
      var base = Math.max(wide, tall);
      /* 스튜디오 본 화면이 이미 매 프레임 그리고 있다. 목업까지 크게
         그리면 둘이 합쳐 프레임이 떨어진다. 사진 위에 얹힌 화면은
         작게 보이므로 이만하면 뭉개지지 않는다. */
      base = Math.min(base, 380);
      var sw = ratio >= 1 ? base : base * ratio;
      var sh = ratio >= 1 ? base / ratio : base;
      sw = Math.max(8, Math.round(sw));
      sh = Math.max(8, Math.round(sh));

      var h = homography([[0, 0], [sw, 0], [0, sh], [sw, sh]], q);
      if (!h) return;
      var c = s.canvas;
      if (c.width !== Math.round(sw * dpr) || c.height !== Math.round(sh * dpr)) {
        c.width = Math.round(sw * dpr);
        c.height = Math.round(sh * dpr);
        s.dirty = true;
      }
      c.style.width = sw + "px";
      c.style.height = sh + "px";
      c.style.transformOrigin = "0 0";
      c.style.transform = toMatrix3d(h);
    });
  };

  Mock.prototype.stop = function () {
    this.gens.forEach(function (g) { try { g.stop(); } catch (e) {} });
    this.gens = [];
    if (this.wrapRaf) { cancelAnimationFrame(this.wrapRaf); this.wrapRaf = 0; }
  };

  /* 면마다 제 비율로 다시 그린다. 한 장을 늘려 붙이지 않는다.
   *
   * 두 면이 한 기둥에 붙어 있으면 이야기가 다르다. 면마다 따로 돌리면
   * 같은 그림이 두 번 걸린 것으로 보인다 — 기둥 하나가 아니라 화면 두 대다.
   * 모서리를 넘어 한 장으로 이어 그려야 기둥이 통으로 읽힌다. */
  Mock.prototype.paint = function () {
    var G = global.BomnalGen;
    if (!G || !this.spec || !this.surfaces || !this.seen) return;
    this.place();                       // 상자가 방금 열렸을 수 있다
    this.stop();
    var self = this;
    if (this.active && this.active.wrap && this.surfaces.length > 1) return this.paintWrap(G);
    this.surfaces.forEach(function (s) {
      var g = new G.Gen(s.canvas);
      g.set(self.spec);
      if (self.still && self.still.matches) g.draw(0);      // 한 장만
      else g.start();
      self.gens.push(g);
    });
    this.root.classList.add("is-live");
  };

  /* 모서리를 넘어 이어 그리기.
   *
   * 펼친 폭(면 둘을 나란히 놓은 것)으로 한 장을 그리고, 그 장을 왼쪽·
   * 오른쪽으로 잘라 두 면에 나눠 얹는다. 자르는 비율은 사진에 보이는
   * 폭이 아니라 실제 면의 폭으로 잰다 — 가까운 면이 사진에서 넓게 보인다고
   * 그림까지 넓게 주면 모서리에서 그림이 어긋난다.
   *
   * 얹는 자리를 사진에 맞추는 일은 place() 의 호모그래피가 이미 한다.
   * 여기서는 "무엇을 그릴지"만 정한다. */
  Mock.prototype.paintWrap = function (G) {
    var self = this;
    /* 왼쪽부터 차례로. 사진에서 가장 왼쪽에 있는 면이 펼친 그림의 왼쪽이다. */
    var order = this.surfaces.slice().sort(function (a, b) {
      var ax = Math.min.apply(null, a.def.quad.map(function (p) { return p[0]; }));
      var bx = Math.min.apply(null, b.def.quad.map(function (p) { return p[0]; }));
      return ax - bx;
    });
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var sh = 0;
    order.forEach(function (s) { sh = Math.max(sh, s.canvas.height); });
    if (!sh) return;
    var cuts = [], total = 0;
    order.forEach(function (s) {
      var w = Math.max(8, Math.round(sh * (s.def.ratio || 0.35)));
      cuts.push({ s: s, x: total, w: w });
      total += w;
    });

    if (!this.wrapCv) this.wrapCv = document.createElement("canvas");
    var cv = this.wrapCv;
    if (cv.width !== total || cv.height !== sh) { cv.width = total; cv.height = sh; }

    var g = new G.Gen(cv);
    g.set(this.spec);
    this.gens.push(g);

    var copy = function () {
      cuts.forEach(function (c) {
        var cx = c.s.canvas.getContext("2d");
        cx.drawImage(cv, c.x, 0, c.w, sh, 0, 0, c.s.canvas.width, c.s.canvas.height);
      });
    };
    if (this.still && this.still.matches) { g.draw(0); copy(); }
    else {
      g.start();
      var loop = function () { copy(); self.wrapRaf = requestAnimationFrame(loop); };
      loop();
    }
    this.root.classList.add("is-live");
  };

  function init() {
    var root = document.querySelector("[data-mock]");
    if (!root || !global.fetch) return;
    var m = new Mock(root);
    global.BomnalMock = m;

    /* 화면을 고르기 전에는 이 자리가 할 일이 없다. 판 사진을 미리
       받아 두면 아무것도 고르지 않은 손님이 그만큼을 치른다.
       처음 고른 순간에 받는다. */
    var once = function () {
      document.removeEventListener("bn:picked", once);
      m.load();
    };
    document.addEventListener("bn:picked", once);
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})(window);
