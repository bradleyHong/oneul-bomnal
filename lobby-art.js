(() => {
  const canvas = document.getElementById("lobbyArtCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const LAT = 35.8714;
  const LON = 128.6014;

  const SKY = {
    clear: ["#fdf3e2", "#f8e2cd", "#f6ead9"],
    cloud: ["#eef1f4", "#e3e6ea", "#f1f0ee"],
    rain: ["#dde5ec", "#c9d6e1", "#dfe6ea"],
    night: ["#3b3a4d", "#2b2a3a", "#454356"],
  };

  const state = {
    temp: null,
    wind: null,
    pm10: null,
    pm25: null,
    code: 0,
    isNight: false,
    ready: false,
  };

  let W = 0;
  let H = 0;
  const petals = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(rect.width, 1);
    H = Math.max(rect.height, 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function skyKey() {
    if (state.isNight) return "night";
    if (state.code >= 51) return "rain";
    if (state.code >= 2) return "cloud";
    return "clear";
  }

  function seedPetals() {
    // 바람이 강할수록 더 많이, 빠르게 흐른다
    const want = 26 + Math.round((state.wind ?? 2) * 6);
    while (petals.length < want) {
      petals.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 3 + Math.random() * 6,
        vy: 0.2 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.04,
        angle: Math.random() * Math.PI,
      });
    }
    if (petals.length > want) petals.length = want;
  }

  function drawSky(t) {
    const [a, b, c] = SKY[skyKey()];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, a);
    g.addColorStop(0.6, b);
    g.addColorStop(1, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const breathe = 0.5 + 0.5 * Math.sin(t * 0.0005);
    const radius = Math.min(W, H) * (0.3 + 0.05 * breathe);
    const glow = ctx.createRadialGradient(W * 0.68, H * 0.34, 0, W * 0.68, H * 0.34, radius);
    glow.addColorStop(0, state.isNight ? "rgba(255,236,200,0.22)" : "rgba(255,255,255,0.5)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  function drawPetals(t) {
    const wind = (state.wind ?? 2) * 0.25;
    ctx.fillStyle = state.isNight ? "rgba(255,214,196,0.5)" : "rgba(233,140,116,0.55)";
    for (const p of petals) {
      p.phase += 0.012;
      p.angle += p.spin;
      p.x += wind + Math.sin(p.phase) * 0.6;
      p.y += p.vy;
      if (p.y > H + 12) p.y = -12;
      if (p.x > W + 12) p.x = -12;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawStems() {
    const count = Math.max(6, Math.round(W / 90));
    const warm = (state.temp ?? 20) / 34;
    ctx.strokeStyle = state.isNight ? "rgba(150,170,150,0.5)" : "rgba(108,138,112,0.55)";
    ctx.lineWidth = Math.max(W / 700, 1);
    for (let i = 0; i < count; i += 1) {
      const x = ((i + 0.5) / count) * W;
      const h = H * (0.2 + 0.22 * warm);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.quadraticCurveTo(x + H * 0.03, H - h * 0.6, x + H * 0.01, H - h);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + H * 0.01, H - h, Math.max(W / 190, 3), 0, Math.PI * 2);
      ctx.fillStyle = state.isNight ? "rgba(255,196,176,0.72)" : "rgba(233,140,116,0.8)";
      ctx.fill();
    }
  }

  // 하단 실시간 데이터 스트립 · 관공서 담당자가 화면만 보고 수치를 읽을 수 있게.
  function drawDataStrip() {
    if (W < 260) return;
    const stripH = Math.max(H * 0.2, 52);
    const y = H - stripH;
    const dark = state.isNight;

    ctx.fillStyle = dark ? "rgba(28,26,38,0.72)" : "rgba(255,255,255,0.78)";
    ctx.fillRect(0, y, W, stripH);
    ctx.fillStyle = dark ? "rgba(255,214,196,0.35)" : "rgba(199,105,79,0.35)";
    ctx.fillRect(0, y, W, Math.max(H * 0.004, 1));

    const ink = dark ? "#fff2e8" : "#2b1e18";
    const sub = dark ? "rgba(255,242,232,0.66)" : "rgba(43,30,24,0.55)";
    const accent = dark ? "#ffbd97" : "#b3543b";

    const label = Math.max(Math.min(W * 0.019, 15), 9);
    const value = Math.max(Math.min(W * 0.038, 30), 15);

    const items = state.ready
      ? [
          ["기온", `${Math.round(state.temp)}°C`],
          ["바람", `${state.wind.toFixed(1)} m/s`],
          ["미세먼지", `${Math.round(state.pm10)}`],
          ["초미세먼지", `${Math.round(state.pm25)}`],
        ]
      : [
          ["기온", "--"],
          ["바람", "--"],
          ["미세먼지", "--"],
          ["초미세먼지", "--"],
        ];

    const cell = W / items.length;
    ctx.textBaseline = "alphabetic";
    items.forEach(([name, val], i) => {
      const cx = cell * i + cell * 0.5;
      ctx.textAlign = "center";
      ctx.font = `600 ${label}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;
      ctx.fillStyle = sub;
      ctx.fillText(name, cx, y + stripH * 0.38);
      ctx.font = `700 ${value}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;
      ctx.fillStyle = i >= 2 ? accent : ink;
      ctx.fillText(val, cx, y + stripH * 0.82);
      if (i > 0) {
        ctx.fillStyle = dark ? "rgba(255,242,232,0.16)" : "rgba(43,30,24,0.12)";
        ctx.fillRect(cell * i, y + stripH * 0.22, 1, stripH * 0.6);
      }
    });

    // 상단 좌측 기관명 + 현재 시각
    const head = Math.max(Math.min(W * 0.024, 19), 11);
    const pad = Math.max(W * 0.03, 14);
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    ctx.textAlign = "left";
    ctx.font = `700 ${head}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;
    ctx.fillStyle = dark ? "rgba(255,242,232,0.9)" : "rgba(43,30,24,0.78)";
    ctx.fillText("오늘 대구 · 지금", pad, pad + head);
    ctx.textAlign = "right";
    ctx.fillText(`${hh}:${mm}`, W - pad, pad + head);
  }

  function render(t) {
    seedPetals();
    drawSky(t);
    drawStems();
    drawPetals(t);
    drawDataStrip();
  }

  // 숨겨진 탭에서 대기 중이던 rAF 콜백이 복귀할 때 살아나므로,
  // 취소하지 않으면 화면 전환마다 루프가 중복돼 CPU가 누적 상승한다.
  let fallbackTimer = null;
  let rafId = 0;
  function loop(t) {
    rafId = 0;
    render(t);
    if (!document.hidden) rafId = requestAnimationFrame(loop);
  }
  function startLoop() {
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

  function paintCaption() {
    const el = document.querySelector("[data-lobby-readout]");
    if (!el) return;
    if (!state.ready) {
      el.textContent = "대구 실시간 데이터를 불러오는 중입니다.";
      return;
    }
    el.textContent = `대구 현재 ${Math.round(state.temp)}°C · 바람 ${state.wind.toFixed(1)}m/s · 미세먼지 ${Math.round(state.pm10)} · 초미세먼지 ${Math.round(state.pm25)} ㎍/㎥ · 지금 이 수치가 위 화면에 그대로 송출되고 있습니다.`;
  }

  const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

  /**
   * 일시적인 네트워크 실패로 화면이 '불러오는 중'에 멈추지 않도록 짧은 간격으로 재시도한다.
   * (상시 운영 사이니지에서는 10분 주기 갱신만으로는 복구가 너무 늦다.)
   */
  async function loadDataWithRetry() {
    const delays = [0, 1500, 4000, 10000];
    for (let i = 0; i < delays.length; i += 1) {
      if (delays[i]) await sleep(delays[i]);
      const ok = await loadData();
      if (ok) return true;
      const el = document.querySelector("[data-lobby-readout]");
      if (el && !state.ready) el.textContent = "대구 실시간 데이터 연결을 재시도하고 있습니다.";
    }
    return false;
  }

  async function loadData() {
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,wind_speed_10m,weather_code,is_day&timezone=Asia%2FSeoul`;
      const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}&current=pm10,pm2_5&timezone=Asia%2FSeoul`;
      const [wRes, aRes] = await Promise.all([fetch(weatherUrl), fetch(airUrl)]);
      if (!wRes.ok || !aRes.ok) throw new Error("api");
      const w = await wRes.json();
      const a = await aRes.json();

      const temp = Number(w?.current?.temperature_2m);
      const wind = Number(w?.current?.wind_speed_10m);
      const code = Number(w?.current?.weather_code);
      const isDay = Number(w?.current?.is_day);
      const pm10 = Number(a?.current?.pm10);
      const pm25 = Number(a?.current?.pm2_5);

      if ([temp, wind, pm10, pm25].every(Number.isFinite)) {
        state.temp = temp;
        state.wind = wind;
        state.code = Number.isFinite(code) ? code : 0;
        state.isNight = isDay === 0;
        state.pm10 = pm10;
        state.pm25 = pm25;
        state.ready = true;
        paintCaption();
        return true;
      }
      return false;
    } catch {
      // 실패해도 화면은 계속 재생된다 · 수치만 '--'로 표시하고 재시도에 맡긴다.
      return false;
    }
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  paintCaption();
  loadDataWithRetry();
  window.setInterval(loadDataWithRetry, 10 * 60 * 1000);
  render(0);
  startLoop();
})();
