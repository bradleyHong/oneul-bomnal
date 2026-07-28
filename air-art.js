/**
 * 대구 공기질 반응형 미디어아트 · 광장 대형 LED 패널용
 *
 * 원색 색면과 큰 기하 도형을 세로 슬랫으로 갈라 어긋내는 구성입니다.
 * 화면 전체를 한 번 그린 뒤 세로 띠 단위로 잘라 위아래로 밀어내기 때문에,
 * 멀리서 보면 색면이 접힌 것처럼 읽히고 가까이서는 어긋난 이음매가 보입니다.
 *
 * 대구 초미세먼지(PM2.5)·미세먼지(PM10) 실측값이 색 팔레트, 띠 개수,
 * 도형 밀도, 흐름 속도를 결정합니다. 수치를 읽지 않아도 화면이 차가운지
 * 뜨거운지, 조용한지 어지러운지로 오늘 공기를 알 수 있습니다.
 */
(() => {
  const canvas = document.getElementById("airArtCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: false });

  // 대구 중심 좌표
  const LAT = 35.8714;
  const LON = 128.6014;

  // 대기질 단계 · 한국 환경부 PM2.5 기준 (좋음 0-15 / 보통 16-35 / 나쁨 36-75 / 매우나쁨 76+)
  const GRADES = [
    {
      max: 15,
      label: "좋음",
      message: "공기가 맑습니다. 마음껏 산책하세요.",
      accent: "#0b7a4f",
      ground: "#f2f6f4",
      // 맑을수록 차갑고 선명한 원색
      palette: ["#1a3ff0", "#00a86b", "#19c2ff", "#f4f1e8", "#ffd400"],
      bands: 9,
      shapes: 5,
      drift: 0.22,
      skew: 0.34,
      grain: 0.05,
    },
    {
      max: 35,
      label: "보통",
      message: "무난한 하루입니다. 평소처럼 활동하세요.",
      accent: "#a8730f",
      ground: "#f6f0e2",
      palette: ["#1a3ff0", "#ffd400", "#00a86b", "#ff8a1f", "#f4f1e8"],
      bands: 12,
      shapes: 6,
      drift: 0.42,
      skew: 0.52,
      grain: 0.09,
    },
    {
      max: 75,
      label: "나쁨",
      message: "민감한 분은 야외활동을 줄여주세요.",
      accent: "#b8321c",
      ground: "#efdcd2",
      // 나빠지면 붉은 계열이 화면을 장악한다
      palette: ["#ff2d1a", "#ff3d94", "#ffd400", "#1a3ff0", "#7a1020"],
      bands: 17,
      shapes: 8,
      drift: 0.72,
      skew: 0.78,
      grain: 0.16,
    },
    {
      max: Infinity,
      label: "매우 나쁨",
      message: "외출을 자제하고 창문을 닫아주세요.",
      accent: "#ff8f6a",
      ground: "#2a1a16",
      palette: ["#ff2d1a", "#7a1020", "#ff5a2b", "#2a1a16", "#ff3d94"],
      bands: 24,
      shapes: 10,
      drift: 1.05,
      skew: 1.0,
      grain: 0.24,
    },
  ];

  const gradeFor = (pm25) => GRADES.find((g) => pm25 <= g.max);

  const state = {
    pm25: 12,
    pm10: 20,
    grade: GRADES[0],
    // 등급이 바뀔 때 화면이 튀지 않도록 보간한다
    mix: { bands: 9, shapes: 5, drift: 0.22, skew: 0.34, grain: 0.05 },
    palette: GRADES[0].palette.slice(),
    ground: GRADES[0].ground,
  };

  let W = 0;
  let H = 0;
  let dpr = 1;

  // 구성은 오프스크린에 한 번 그리고, 본 화면에는 세로 띠로 잘라 옮긴다.
  const scene = document.createElement("canvas");
  const sctx = scene.getContext("2d", { alpha: false });

  // 손끝으로 색면을 밀 수 있게 한다. 관공서 담당자가 "인터랙티브"라는 말을
  // 설명으로 듣는 대신 화면에서 직접 확인하게 하는 것이 이 작품의 역할이다.
  const touch = { x: 0, y: 0, force: 0, active: false };

  const reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false, addEventListener: () => {} };

  /** 결정론적 난수 · 같은 씨앗이면 항상 같은 배치가 나온다. */
  const rand = (a, b) => {
    let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177) | 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(rect.width, 1);
    H = Math.max(rect.height, 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scene.width = canvas.width;
    scene.height = canvas.height;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const lerpHex = (a, b, k) => {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (sh) => {
      const va = (pa >> sh) & 255;
      const vb = (pb >> sh) & 255;
      return Math.round(va + (vb - va) * k);
    };
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  };

  /** 큰 원 안쪽의 동심 격자 · 가까이서 보면 무아레가 생긴다. */
  function drawMoire(x, y, r, t, hue, seed) {
    sctx.save();
    sctx.beginPath();
    sctx.arc(x, y, r, 0, Math.PI * 2);
    sctx.clip();
    sctx.strokeStyle = hue;
    sctx.globalAlpha = 0.5;
    const step = Math.max(3, r * 0.055);
    const shift = (t * 0.012 * (0.4 + rand(seed, 7))) % step;
    for (let rr = step * 0.5 + shift; rr < r * 1.45; rr += step) {
      sctx.lineWidth = 1.1;
      sctx.beginPath();
      sctx.arc(x, y, rr, 0, Math.PI * 2);
      sctx.stroke();
    }
    sctx.restore();
  }

  /** 세로로 긴 실린더 형태 · 좌우 명암으로 원통처럼 읽히게 한다. */
  function drawCylinder(x, y, w, h, color, angle) {
    sctx.save();
    sctx.translate(x, y);
    sctx.rotate(angle);
    const g = sctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, "rgba(0,0,0,0.28)");
    g.addColorStop(0.42, "rgba(255,255,255,0.16)");
    g.addColorStop(1, "rgba(0,0,0,0.24)");
    sctx.fillStyle = color;
    sctx.beginPath();
    if (sctx.roundRect) sctx.roundRect(-w / 2, -h / 2, w, h, w / 2);
    else sctx.rect(-w / 2, -h / 2, w, h);
    sctx.fill();
    sctx.fillStyle = g;
    sctx.fill();
    sctx.restore();
  }

  /** 색면과 도형이 놓인 원본 구성을 그린다. 띠로 자르기 전 단계. */
  function drawScene(t) {
    const { shapes, drift, grain } = state.mix;
    const pal = state.palette;
    const D = Math.max(W, H);

    sctx.fillStyle = state.ground;
    sctx.fillRect(0, 0, W, H);

    // 바탕을 가르는 큰 사선 색면 두 장
    for (let i = 0; i < 2; i += 1) {
      const p = rand(i + 11, 3);
      const ang = (-0.5 + p) * 0.9 + Math.sin(t * 0.00008 * (1 + i) + i) * 0.12;
      sctx.save();
      sctx.translate(W * (0.3 + 0.4 * i), H * 0.5);
      sctx.rotate(ang);
      sctx.fillStyle = pal[(i * 2) % pal.length];
      sctx.globalAlpha = 0.9;
      sctx.fillRect(-D, -D * (0.5 - i * 0.22), D * 2, D * (0.62 - i * 0.2));
      sctx.restore();
    }
    sctx.globalAlpha = 1;

    // 큰 기하 도형 · 원, 반원, 실린더가 느리게 떠다닌다
    const count = Math.round(shapes);
    for (let i = 0; i < count; i += 1) {
      const s0 = rand(i * 3 + 1, 21);
      const s1 = rand(i * 3 + 2, 34);
      const s2 = rand(i * 3 + 3, 57);
      const speed = 0.00004 + s2 * 0.00009;
      const px = W * (0.08 + s0 * 0.86) + Math.sin(t * speed + i * 1.7) * W * 0.1 * drift;
      const py = H * (0.1 + s1 * 0.8) + Math.cos(t * speed * 1.3 + i) * H * 0.12 * drift;
      const color = pal[i % pal.length];
      const kind = Math.floor(s2 * 3);

      if (kind === 0) {
        const r = D * (0.07 + s0 * 0.17);
        sctx.fillStyle = color;
        sctx.beginPath();
        sctx.arc(px, py, r, 0, Math.PI * 2);
        sctx.fill();
        if (s1 > 0.45) drawMoire(px, py, r, t, pal[(i + 2) % pal.length], i);
      } else if (kind === 1) {
        const r = D * (0.09 + s1 * 0.16);
        const a0 = t * speed * 6 + i;
        sctx.fillStyle = color;
        sctx.beginPath();
        sctx.moveTo(px, py);
        sctx.arc(px, py, r, a0, a0 + Math.PI);
        sctx.closePath();
        sctx.fill();
      } else {
        drawCylinder(
          px,
          py,
          D * (0.05 + s0 * 0.07),
          D * (0.2 + s1 * 0.3),
          color,
          (s2 - 0.5) * 0.7 + Math.sin(t * speed * 3) * 0.15
        );
      }
    }

    // 입자 · 공기가 나빠질수록 화면 위에 알갱이가 쌓인다
    if (grain > 0.01) {
      sctx.fillStyle = "rgba(20,14,12,0.5)";
      const n = Math.round(grain * 900);
      for (let i = 0; i < n; i += 1) {
        const gx = (rand(i, 71) * W + t * 0.02 * drift) % W;
        const gy = (rand(i, 97) * H + t * 0.013 * drift) % H;
        const gr = 0.6 + rand(i, 131) * 1.9;
        sctx.beginPath();
        sctx.arc(gx, gy, gr, 0, Math.PI * 2);
        sctx.fill();
      }
    }
  }

  /** 구성을 세로 띠로 잘라 위아래로 어긋내 옮긴다. 이 단계가 이 작품의 인상을 만든다. */
  function sliceBands(t) {
    const { bands, skew, drift } = state.mix;
    const n = Math.max(3, Math.round(bands));
    const bw = W / n;
    const pull = touch.active ? touch.force : 0;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < n; i += 1) {
      const x = i * bw;
      const phase = rand(i, 13) * Math.PI * 2;
      let dy = Math.sin(t * 0.00035 * (0.6 + rand(i, 29)) + phase) * H * 0.09 * skew;

      // 손끝 근처의 띠가 더 크게 밀린다
      if (pull > 0.01) {
        const d = Math.abs(x + bw / 2 - touch.x);
        if (d < W * 0.34) {
          const push = (1 - d / (W * 0.34)) * pull;
          dy += (touch.y - H / 2) * push * 0.55;
        }
      }

      const sx = Math.round(x * dpr);
      const sw = Math.max(1, Math.round(bw * dpr) + 1);
      ctx.drawImage(scene, sx, 0, sw, scene.height, x, dy, bw + 0.6, H);
      // 띠를 이어 붙인 자리를 위아래로 메운다
      if (dy > 0) ctx.drawImage(scene, sx, scene.height - Math.ceil(dy * dpr) - 1, sw, Math.ceil(dy * dpr) + 1, x, 0, bw + 0.6, dy + 1);
      else if (dy < 0) ctx.drawImage(scene, sx, 0, sw, Math.ceil(-dy * dpr) + 1, x, H + dy, bw + 0.6, -dy + 1);

      // 접힌 면에 빛이 다르게 닿는 느낌
      const shade = Math.sin(t * 0.0002 + phase) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(0,0,0,${(0.04 + shade * 0.16 * skew).toFixed(3)})`;
      ctx.fillRect(x, 0, bw + 0.6, H);
      ctx.fillStyle = "rgba(0,0,0,0.34)";
      ctx.fillRect(x - 0.5, 0, 1, H);
    }

    // 패널 표면 반사
    const gloss = ctx.createLinearGradient(0, 0, W * 0.7, H);
    gloss.addColorStop(0, "rgba(255,255,255,0.1)");
    gloss.addColorStop(0.4, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.fillRect(0, 0, W, H);
    void drift;
  }

  /** 화면 위에 오늘 대구의 실측값을 얹는다. 멀리서도 읽히도록 굵게. */
  function drawReadout() {
    if (W < 260 || H < 150) return;
    const pad = Math.max(W * 0.038, 14);
    const label = Math.max(Math.min(W * 0.024, 17), 10);
    const big = Math.max(Math.min(W * 0.085, 62), 22);
    const small = Math.max(Math.min(W * 0.023, 16), 10);

    // 글자가 색면 위에서도 읽히게 어두운 띠를 깐다
    const boxH = pad * 1.1 + label * 1.2 + big * 1.15 + small * 1.6;
    const strip = ctx.createLinearGradient(0, 0, 0, boxH);
    strip.addColorStop(0, "rgba(10,8,7,0.72)");
    strip.addColorStop(1, "rgba(10,8,7,0)");
    ctx.fillStyle = strip;
    ctx.fillRect(0, 0, W, boxH);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const face = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

    ctx.font = `700 ${label}px ${face}`;
    ctx.fillStyle = "rgba(255,252,248,0.74)";
    ctx.fillText("대구 지금 공기 · 실시간", pad, pad + label);

    ctx.font = `800 ${big}px ${face}`;
    ctx.fillStyle = "#fffdf9";
    ctx.fillText(state.grade.label, pad, pad + label + big * 1.02);

    ctx.font = `600 ${small}px ${face}`;
    ctx.fillStyle = "rgba(255,252,248,0.9)";
    ctx.fillText(
      `초미세먼지 ${state.pm25.toFixed(0)} · 미세먼지 ${state.pm10.toFixed(0)} ㎍/㎥`,
      pad,
      pad + label + big * 1.02 + small * 1.8
    );
  }

  function render(t) {
    touch.force *= 0.95;
    const g = state.grade;
    const ease = 0.02;
    state.mix.bands += (g.bands - state.mix.bands) * ease;
    state.mix.shapes += (g.shapes - state.mix.shapes) * ease;
    state.mix.drift += (g.drift - state.mix.drift) * ease;
    state.mix.skew += (g.skew - state.mix.skew) * ease;
    state.mix.grain += (g.grain - state.mix.grain) * ease;
    state.ground = lerpHex(state.ground.startsWith("#") ? state.ground : g.ground, g.ground, ease * 3);
    for (let i = 0; i < g.palette.length; i += 1) {
      const cur = state.palette[i];
      state.palette[i] = cur && cur.startsWith("#") ? lerpHex(cur, g.palette[i], ease * 3) : g.palette[i];
    }

    drawScene(t);
    sliceBands(t);
    drawReadout();
  }

  //
  // 스크롤 밖으로 나간 작품은 그리지 않는다. 사이니지에서는 항상 전체 화면이지만
  // 사이트에서는 긴 페이지의 일부라, 안 보이는 동안 계산할 이유가 없다.
  let onScreen = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
      },
      { rootMargin: "160px 0px" }
    ).observe(canvas);
  }

  // 브라우저가 백그라운드로 내려가면 requestAnimationFrame이 멈춘다.
  // 상시 운영 사이니지에서 화면이 정지한 채 남지 않도록 저프레임 타이머로 대체한다.
  // 탭이 숨겨져도 예약된 rAF 콜백은 취소되지 않고 대기만 한다.
  // 명시적으로 취소하고 rafId로 중복 실행을 막지 않으면
  // 화면 전환을 반복할 때마다 루프가 하나씩 늘어 CPU가 계속 올라간다.
  let fallbackTimer = null;
  let rafId = 0;
  function loop(t) {
    rafId = 0;
    if (onScreen) render(t);
    if (!document.hidden) rafId = requestAnimationFrame(loop);
  }

  /** 보간을 건너뛰고 지금 등급의 완성된 화면을 한 장 그린다. */
  function settleAndRender() {
    const g = state.grade;
    state.mix.bands = g.bands;
    state.mix.shapes = g.shapes;
    state.mix.drift = g.drift;
    state.mix.skew = g.skew;
    state.mix.grain = g.grain;
    state.palette = g.palette.slice();
    state.ground = g.ground;
    render(performance.now());
  }

  function startLoop() {
    // 운영체제에서 '움직임 줄이기'를 켠 이용자에게는 흐름을 멈추고
    // 지금 공기 상태를 한 장의 정지 화면으로 보여준다.
    // 공공기관 사이트라 웹 접근성 기준을 따른다.
    if (reduceMotion.matches) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (fallbackTimer) {
        window.clearInterval(fallbackTimer);
        fallbackTimer = null;
      }
      settleAndRender();
      return;
    }
    if (document.hidden) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (!fallbackTimer) {
        fallbackTimer = window.setInterval(() => render(performance.now()), 1000 / 12);
      }
      return;
    }
    if (fallbackTimer) {
      window.clearInterval(fallbackTimer);
      fallbackTimer = null;
    }
    if (rafId) return;
    rafId = requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", startLoop);
  reduceMotion.addEventListener?.("change", startLoop);

  function applyReadings(pm25, pm10) {
    state.pm25 = pm25;
    state.pm10 = pm10;
    state.grade = gradeFor(pm25);

    const badge = document.querySelector("[data-air-grade]");
    if (badge) {
      badge.textContent = state.grade.label;
      badge.style.color = state.grade.accent;
    }
    const detail = document.querySelector("[data-air-detail]");
    if (detail) {
      detail.textContent = `초미세먼지(PM2.5) ${pm25.toFixed(0)} ㎍/㎥ · 미세먼지(PM10) ${pm10.toFixed(0)} ㎍/㎥ · ${state.grade.message}`;
    }
    // 화면 위 실시간 박스 · 같은 값을 숫자와 글자로도 보여준다
    const n25 = document.querySelector("[data-live-pm25]");
    if (n25) n25.textContent = pm25.toFixed(0);
    const n10 = document.querySelector("[data-live-pm10]");
    if (n10) n10.textContent = pm10.toFixed(0);
    // 정지 모드에서는 루프가 돌지 않으므로 값이 바뀔 때 직접 다시 그린다.
    if (reduceMotion.matches) settleAndRender();
  }

  const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

  async function loadAir() {
    try {
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}&current=pm10,pm2_5&timezone=Asia%2FSeoul`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("air api");
      const data = await res.json();
      const pm25 = Number(data?.current?.pm2_5);
      const pm10 = Number(data?.current?.pm10);
      if (Number.isFinite(pm25) && Number.isFinite(pm10)) {
        applyReadings(pm25, pm10);
        return true;
      }
      return false;
    } catch {
      // 네트워크 실패 시 초기값 유지 · 화면은 계속 재생되고 재시도에 맡긴다.
      return false;
    }
  }

  /** 일시적 실패로 표시가 10분간 멈추지 않도록 짧은 간격으로 재시도한다. */
  async function loadAirWithRetry() {
    const delays = [0, 1500, 4000, 10000];
    for (let i = 0; i < delays.length; i += 1) {
      if (delays[i]) await sleep(delays[i]);
      if (await loadAir()) return true;
    }
    return false;
  }

  // 데모 버튼: 관공서 시연용 등급 미리보기
  document.querySelectorAll("[data-air-demo]").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-air-demo]")
        .forEach((b) => b.classList.toggle("active", b === button));
      const key = button.dataset.airDemo;
      if (key === "live") {
        loadAirWithRetry();
        return;
      }
      const preset = { good: [8, 14], normal: [28, 44], bad: [58, 92], worst: [110, 165] }[key];
      if (preset) applyReadings(preset[0], preset[1]);
    });
  });

  resize();
  window.addEventListener("resize", resize, { passive: true });

  // 포인터·터치로 색면을 민다.
  function setTouch(event) {
    const rect = canvas.getBoundingClientRect();
    const point = event.touches?.[0] ?? event;
    touch.x = point.clientX - rect.left;
    touch.y = point.clientY - rect.top;
    touch.active = true;
    touch.force = Math.min(1, touch.force + 0.22);
  }
  canvas.addEventListener("pointermove", setTouch, { passive: true });
  canvas.addEventListener("pointerdown", setTouch, { passive: true });
  canvas.addEventListener("touchmove", setTouch, { passive: true });
  canvas.addEventListener("pointerleave", () => { touch.active = false; }, { passive: true });
  canvas.addEventListener("touchend", () => { touch.active = false; }, { passive: true });

  // 패널 사진이 늦게 로드되면 캔버스가 0px 상태에서 크기를 잡아 화면이 단색으로 늘어난다.
  // 레이아웃 크기가 바뀌면 다시 재고 즉시 한 프레임 그린다.
  function ensureSize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    if (Math.abs(rect.width - W) < 1 && Math.abs(rect.height - H) < 1) return;
    resize();
    render(performance.now());
  }
  // 같은 무대의 배경 사진이 뒤늦게 로드될 때가 실제 원인이므로 load를 직접 듣는다.
  const stagePhoto = canvas.closest(".led-stage")?.querySelector("img");
  if (stagePhoto && !stagePhoto.complete) stagePhoto.addEventListener("load", ensureSize, { once: true });
  window.setInterval(ensureSize, 1000);
  if ("ResizeObserver" in window) {
    try { new ResizeObserver(ensureSize).observe(canvas); } catch { /* 미지원 환경은 위 타이머로 대응 */ }
  }
  loadAirWithRetry();
  window.setInterval(loadAirWithRetry, 10 * 60 * 1000);
  // 첫 프레임은 즉시 그린다 · 사이니지 전원 인가 직후 검은 화면이 남지 않도록.
  settleAndRender();
  startLoop();
})();
