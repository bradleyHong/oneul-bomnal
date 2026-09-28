/* 깊이(3D) 엔진 — 장면 하나를 캔버스 하나에 그린다.
 *
 * 2D 엔진(studio-engine.js)과 약속은 같다.
 *   · renderFrame(n) 하나로만 앞으로 간다. 시계를 안 본다
 *   · 같은 씨앗은 언제나 같은 영상이다 (mulberry32)
 *   · 5초 한 바퀴 완전 루프. 끝 장이 첫 장으로 이어진다
 *
 * 다른 것은 하나다. 그림을 픽셀 셰이더가 그린다. 화소마다 광선을 쏘아
 * 거리장(SDF)을 따라 걸어 들어가 물체에 닿으면, 그 자리의 그림자·틈·
 * 반사를 계산한다. 그래서 2D 로는 안 나오던 "실제 3D 영상 같은 질감"이
 * 나온다 — 모델 파일도 텍스처 이미지도 없이 코드만으로.
 *
 *   var d = Depth.create(canvas, { scene: "moonjar", seed: 4821937,
 *                                  w: 1920, h: 1080, fps: 30, dur: 5, aa: 2, pal: 0 });
 *   d.renderFrame(0);
 */
(function (global) {
  "use strict";

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* 색은 sRGB 로 적고 빛 계산은 선형으로 한다. 섞지 않으면 어두운 쪽이
     탁해지고 밝은 쪽이 과하게 뜬다 — "싸구려 3D" 로 보이는 첫 이유다. */
  function lin(hex) {
    var n = parseInt(String(hex).replace("#", ""), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
      .map(function (c) { return Math.pow(c, 2.2); });
  }

  var VS = "#version 300 es\nin vec2 p;\nvoid main(){ gl_Position=vec4(p,0.,1.); }";

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s);
      /* 줄 번호로 찾아가기 쉽게 앞뒤 줄을 같이 보여 준다 */
      var m = /ERROR: \d+:(\d+)/.exec(log || "");
      var ctx = "";
      if (m) {
        var ln = +m[1], lines = src.split("\n");
        ctx = "\n" + lines.slice(Math.max(0, ln - 3), ln + 2).map(function (l, i) {
          return (Math.max(1, ln - 2) + i) + ": " + l;
        }).join("\n");
      }
      throw new Error("셰이더: " + log + ctx);
    }
    return s;
  }

  function create(canvas, opts) {
    var o = opts || {};
    var SC = (global.DepthScenes || {})[o.scene];
    if (!SC) throw new Error("장면이 없다: " + o.scene);
    var W = o.w || 1920, H = o.h || 1080;
    var FPS = o.fps || 30, DUR = o.dur || 5;
    var TOTAL = Math.round(FPS * DUR);
    var AA = Math.max(1, Math.min(4, o.aa || 1));
    var SEED = (o.seed >>> 0) || 4821937;

    canvas.width = W; canvas.height = H;
    var gl = canvas.getContext("webgl2", {
      /* 캡처는 그린 뒤 toDataURL 로 뜬다. 버퍼를 지우면 빈 장이 나온다. */
      preserveDrawingBuffer: true, antialias: false, alpha: false,
      premultipliedAlpha: false, powerPreference: "high-performance"
    });
    if (!gl) throw new Error("WebGL2 를 못 연다");

    var src = global.DepthGLSL.HEAD + "\n// ── 장면: " + o.scene + " ──\n" + SC.glsl + global.DepthGLSL.tail(AA);
    var pr = gl.createProgram();
    gl.attachShader(pr, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, compile(gl, gl.FRAGMENT_SHADER, src));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error("링크: " + gl.getProgramInfoLog(pr));
    gl.useProgram(pr);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, W, H);

    var U = {};
    ["R", "T", "PH", "S0", "S1", "C0", "C1", "C2", "OFF"].forEach(function (k) {
      U[k] = gl.getUniformLocation(pr, k);
    });

    /* 씨앗 → 여덟 개의 값. 장면은 이것으로만 배치를 바꾼다. */
    var r = mulberry32(SEED);
    var s = []; for (var i = 0; i < 8; i++) s.push(r());

    /* 색판. 번호나 이름으로 고르고, 없으면 첫 판. */
    var pals = SC.pals || [{ name: "기본", c: ["#05060a", "#f3efe6", "#8fb4ff"] }];
    var pal = pals[0];
    if (typeof o.pal === "number" && pals[o.pal]) pal = pals[o.pal];
    else if (typeof o.pal === "string") pals.forEach(function (p) { if (p.name === o.pal) pal = p; });
    if (o.colors && o.colors.length === 3) pal = { name: "직접", c: o.colors };
    var c0 = lin(pal.c[0]), c1 = lin(pal.c[1]), c2 = lin(pal.c[2]);

    gl.uniform2f(U.R, W, H);
    gl.uniform4f(U.S0, s[0], s[1], s[2], s[3]);
    gl.uniform4f(U.S1, s[4], s[5], s[6], s[7]);
    gl.uniform3f(U.C0, c0[0], c0[1], c0[2]);
    gl.uniform3f(U.C1, c1[0], c1[1], c1[2]);
    gl.uniform3f(U.C2, c2[0], c2[1], c2[2]);
    gl.uniform2f(U.OFF, 0, 0);

    function renderFrame(n) {
      var k = ((n % TOTAL) + TOTAL) % TOTAL;
      var t = k / FPS;
      gl.uniform1f(U.T, t);
      gl.uniform1f(U.PH, (k / TOTAL) * Math.PI * 2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.finish();
    }

    return { renderFrame: renderFrame, totalFrames: TOTAL, width: W, height: H,
             palette: pal.name, seedValues: s };
  }

  global.Depth = { create: create };
})(window);
