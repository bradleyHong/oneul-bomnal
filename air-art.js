(() => {
  const canvas = document.getElementById("airArtCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // 대구 중심 좌표
  const LAT = 35.8714;
  const LON = 128.6014;

  // 대기질 단계 · 한국 환경부 PM2.5 기준 (좋음 0-15 / 보통 16-35 / 나쁨 36-75 / 매우나쁨 76+)
  const GRADES = [
    {
      max: 15,
      label: "좋음",
      message: "공기가 맑습니다. 마음껏 산책하세요.",
      sky: ["#eaf7ff", "#d8f0e4", "#f6fbf3"],
      particle: "rgba(120, 200, 170, ALPHA)",
      accent: "#3d8f6f",
      density: 26,
      drift: 0.18,
      haze: 0.0,
      rise: -1,
    },
    {
      max: 35,
      label: "보통",
      message: "무난한 하루입니다. 평소처럼 활동하세요.",
      sky: ["#fdf6e6", "#f3ead2", "#fbf7ee"],
      particle: "rgba(214, 176, 108, ALPHA)",
      accent: "#b07d2c",
      density: 90,
      drift: 0.36,
      haze: 0.12,
      rise: -0.4,
    },
    {
      max: 75,
      label: "나쁨",
      message: "민감한 분은 야외활동을 줄여주세요.",
      sky: ["#f6e0cf", "#e5c1a6", "#efd4c0"],
      particle: "rgba(196, 112, 74, ALPHA)",
      accent: "#a8482a",
      density: 260,
      drift: 0.62,
      haze: 0.3,
      rise: 0.15,
    },
    {
      max: Infinity,
      label: "매우 나쁨",
      message: "외출을 자제하고 창문을 닫아주세요.",
      sky: ["#6d5a52", "#4a3a36", "#5c4842"],
      particle: "rgba(232, 150, 120, ALPHA)",
      accent: "#ff9d7a",
      density: 520,
      drift: 0.95,
      haze: 0.52,
      rise: 0.5,
    },
  ];

  const gradeFor = (pm25) => GRADES.find((g) => pm25 <= g.max);

  const state = {
    pm25: 12,
    pm10: 20,
    grade: GRADES[0],
    // 등급 전환을 부드럽게 하기 위한 보간값
    mix: { density: 26, drift: 0.18, haze: 0, rise: -1 },
  };

  let W = 0;
  let H = 0;
  let dpr = 1;
  const particles = [];

  // 손끝으로 공기를 저을 수 있게 한다. 관공서 담당자가 "인터랙티브"라는 말을
  // 설명으로 듣는 대신 화면에서 직접 확인하게 하는 것이 이 작품의 역할이다.
  const touch = { x: 0, y: 0, force: 0, active: false };

  const reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false, addEventListener: () => {} };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(rect.width, 1);
    H = Math.max(rect.height, 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(seedTop) {
    return {
      x: Math.random() * W,
      y: seedTop ? Math.random() * H : H + Math.random() * 40,
      r: 0.6 + Math.random() * 2.6,
      vy: 0.1 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      swing: 0.4 + Math.random() * 1.6,
      alpha: 0.25 + Math.random() * 0.5,
    };
  }

  function syncParticleCount(target) {
    const want = Math.round(target);
    while (particles.length < want) particles.push(spawn(true));
    if (particles.length > want) particles.length = want;
  }

  function drawSky(t) {
    const [a, b, c] = state.grade.sky;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, a);
    g.addColorStop(0.55, b);
    g.addColorStop(1, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 호흡하는 빛무리 · 공기가 맑을수록 크고 선명
    const clarity = 1 - state.mix.haze;
    const breathe = 0.5 + 0.5 * Math.sin(t * 0.0006);
    const radius = Math.min(W, H) * (0.22 + 0.14 * clarity + 0.03 * breathe);
    const glow = ctx.createRadialGradient(W * 0.5, H * 0.46, 0, W * 0.5, H * 0.46, radius);
    glow.addColorStop(0, `rgba(255,255,255,${0.16 + 0.34 * clarity})`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  function drawFlow(t) {
    // 공기의 흐름 · 맑으면 넓고 느린 곡선, 나쁘면 짧고 흐트러진 선
    const clarity = 1 - state.mix.haze;
    const lines = 5;
    ctx.lineCap = "round";
    for (let i = 0; i < lines; i += 1) {
      const p = i / (lines - 1);
      const baseY = H * (0.28 + p * 0.44);
      const amp = H * (0.04 + 0.09 * clarity);
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) {
        const n = Math.sin(x * 0.006 + t * 0.0004 + i * 1.3) * amp;
        const jitter = (1 - clarity) * Math.sin(x * 0.05 + t * 0.003 + i) * 6;
        const y = baseY + n + jitter;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = state.grade.particle.replace("ALPHA", (0.1 + 0.16 * clarity).toFixed(3));
      ctx.lineWidth = 1 + 2.4 * clarity;
      ctx.stroke();
    }
  }

  function drawParticles(t) {
    const { drift, rise } = state.mix;
    const pull = touch.active ? touch.force : 0;
    for (const p of particles) {
      p.phase += 0.01;
      p.x += Math.sin(p.phase) * p.swing * drift;
      p.y += rise * p.vy;

      // 손끝 주변의 입자를 밀어낸다. 공기를 손으로 젓는 감각.
      if (pull > 0.01) {
        const dx = p.x - touch.x;
        const dy = p.y - touch.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130 && dist > 0.001) {
          const push = (1 - dist / 130) * pull * 3.4;
          p.x += (dx / dist) * push;
          p.y += (dy / dist) * push;
        }
      }

      if (p.y < -20) p.y = H + 10;
      if (p.y > H + 20) p.y = -10;
      if (p.x < -20) p.x = W + 10;
      if (p.x > W + 20) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = state.grade.particle.replace("ALPHA", p.alpha.toFixed(3));
      ctx.fill();
    }
  }

  function drawHaze() {
    if (state.mix.haze <= 0.01) return;
    ctx.fillStyle = `rgba(90, 70, 62, ${state.mix.haze * 0.42})`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawReadout() {
    // 패널이 작게 렌더되는 화면에서는 문구가 잘리므로 캔버스 밖 상태 표시에 맡긴다.
    if (W < 320 || H < 200) return;
    const pad = Math.max(W * 0.045, 18);
    const big = Math.max(Math.min(W * 0.075, 64), 24);
    const small = Math.max(Math.min(W * 0.022, 18), 11);
    const dark = state.grade.label === "매우 나쁨";
    const ink = dark ? "#fff2e8" : "#2b1e18";

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    ctx.font = `600 ${small}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;
    ctx.fillStyle = dark ? "rgba(255,242,232,0.72)" : "rgba(43,30,24,0.6)";
    ctx.fillText("대구 지금 공기", pad, pad + small);

    ctx.font = `700 ${big}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;
    ctx.fillStyle = state.grade.accent;
    ctx.fillText(state.grade.label, pad, pad + small + big * 1.05);

    ctx.font = `500 ${small}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;
    ctx.fillStyle = ink;
    ctx.fillText(state.grade.message, pad, pad + small + big * 1.05 + small * 1.9);

    ctx.font = `500 ${small * 0.92}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;
    ctx.fillStyle = dark ? "rgba(255,242,232,0.62)" : "rgba(43,30,24,0.52)";
    ctx.fillText(
      `초미세먼지 ${state.pm25.toFixed(0)} · 미세먼지 ${state.pm10.toFixed(0)} ㎍/㎥`,
      pad,
      pad + small + big * 1.05 + small * 3.5
    );
  }

  function render(t) {
    touch.force *= 0.95;
    const target = state.grade;
    const ease = 0.02;
    state.mix.density += (target.density - state.mix.density) * ease;
    state.mix.drift += (target.drift - state.mix.drift) * ease;
    state.mix.haze += (target.haze - state.mix.haze) * ease;
    state.mix.rise += (target.rise - state.mix.rise) * ease;
    syncParticleCount(state.mix.density);

    drawSky(t);
    drawFlow(t);
    drawParticles(t);
    drawHaze();
    drawReadout();
  }

  // 브라우저가 백그라운드로 내려가면 requestAnimationFrame이 멈춘다.
  // 상시 운영 사이니지에서 화면이 정지한 채 남지 않도록 저프레임 타이머로 대체한다.
  // 탭이 숨겨져도 예약된 rAF 콜백은 취소되지 않고 대기만 한다.
  // 명시적으로 취소하고 rafId로 중복 실행을 막지 않으면
  // 화면 전환을 반복할 때마다 루프가 하나씩 늘어 CPU가 계속 올라간다.
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
    state.mix.density = g.density;
    state.mix.drift = g.drift;
    state.mix.haze = g.haze;
    state.mix.rise = g.rise;
    syncParticleCount(state.mix.density);
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

  // 포인터·터치로 공기를 젓는다.
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
  syncParticleCount(state.mix.density);
  render(0);
  startLoop();
})();
