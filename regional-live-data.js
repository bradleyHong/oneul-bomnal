(() => {
  const places = {
    gyeongju: { name: "경주", latitude: 35.8562, longitude: 129.2247 },
    andong: { name: "안동", latitude: 36.5684, longitude: 128.7294 },
  };

  const skyNames = new Map([
    [0, "맑음"],
    [1, "대체로 맑음"],
    [2, "구름 조금"],
    [3, "흐림"],
    [45, "안개"],
    [48, "안개"],
    [51, "이슬비"],
    [53, "이슬비"],
    [55, "이슬비"],
    [61, "비"],
    [63, "비"],
    [65, "강한 비"],
    [71, "눈"],
    [73, "눈"],
    [75, "강한 눈"],
    [80, "소나기"],
    [81, "소나기"],
    [82, "강한 소나기"],
    [95, "뇌우"],
  ]);

  const state = {
    gyeongjuFestival: Number(localStorage.getItem("bomnalGyeongjuFestival") || 18),
    andongDance: Number(localStorage.getItem("bomnalAndongDance") || 24),
  };
  const panelState = new Map();
  let animationStarted = false;

  const formatTime = (value) => {
    const date = value ? new Date(value) : new Date();
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(date);
  };

  const setLive = (key, text) => {
    document.querySelectorAll(`[data-live="${key}"]`).forEach((node) => {
      node.textContent = text;
    });
  };

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  const ensurePanelOverlays = () => {
    document.querySelectorAll("[data-live-panel]").forEach((panel) => {
      if (panel.querySelector(".media-live-overlay")) return;
      const canvas = document.createElement("canvas");
      canvas.className = "media-flow-canvas";
      const points = document.createElement("div");
      points.className = "media-live-points";
      const overlay = document.createElement("div");
      overlay.className = "media-live-overlay";
      overlay.innerHTML = `
        <strong>LIVE DATA PANEL</strong>
        <span>실시간 데이터를 연결하는 중입니다.</span>
        <div class="media-signal-grid">
          <div class="media-signal"><small>온도</small><div class="media-meter"><i style="--meter: 35"></i></div></div>
          <div class="media-signal"><small>바람</small><div class="media-meter"><i style="--meter: 25"></i></div></div>
          <div class="media-signal"><small>반응</small><div class="media-meter"><i style="--meter: 40"></i></div></div>
        </div>
      `;
      panel.append(canvas, points, overlay);
    });
  };

  const setPanel = (key, { title, summary, metrics, vars }) => {
    const metricValues = metrics || [];
    const liveVars = vars || {};
    panelState.set(key, {
      pulse: Number(liveVars["--live-pulse"] || 0.45),
      wind: Number(liveVars["--live-wind"] || 0.25),
      rain: Number(liveVars["--live-rain"] || 0.08),
      water: Number(liveVars["--live-water"] || 0.25),
      density: Number(liveVars["--live-density"] || 0.4),
      metrics: metricValues.map((metric) => clamp(metric.value / 100, 0, 1)),
    });
    document.querySelectorAll(`[data-live-panel="${key}"]`).forEach((panel) => {
      Object.entries(liveVars).forEach(([name, value]) => {
        panel.style.setProperty(name, value);
      });
      const titleNode = panel.querySelector(".media-live-overlay strong");
      const summaryNode = panel.querySelector(".media-live-overlay span");
      const signalGrid = panel.querySelector(".media-signal-grid");
      if (titleNode) titleNode.textContent = title;
      if (summaryNode) summaryNode.textContent = summary;
      if (signalGrid && metricValues) {
        signalGrid.innerHTML = metricValues
          .map(
            (metric) => `
              <div class="media-signal">
                <small>${metric.label}</small>
                <div class="media-meter"><i style="--meter: ${Math.round(clamp(metric.value / 100, 0, 1) * 100)}"></i></div>
              </div>
            `,
          )
          .join("");
      }
    });
  };

  const seedPanels = () => {
    const now = formatTime();
    setLive("gyeongjuWeather", `경주 ${now} · 기본 실시간 패널 · 데이터 수신 대기 중`);
    setLive("gyeongjuBomun", `보문호 ${now} · 물결 기본값 42% · 데이터 수신 대기 중`);
    setLive("andongWeather", `안동 ${now} · 기본 실시간 패널 · 데이터 수신 대기 중`);
    setLive("andongRiver", `월영교 ${now} · 수위지표 기본값 36% · 데이터 수신 대기 중`);
    setPanel("gyeongjuWeather", {
      title: "GYEONGJU DATA FLOW",
      summary: `${now} · API 수신 전 기본값으로 별빛 데이터 스트림 가동`,
      metrics: [
        { label: "온도", value: 48 },
        { label: "바람", value: 42 },
        { label: "강수", value: 18 },
      ],
      vars: {
        "--live-pulse": "0.55",
        "--live-wind": "0.48",
        "--live-rain": "0.18",
        "--live-water": "0.38",
        "--live-density": "0.72",
      },
    });
    setPanel("gyeongjuBomun", {
      title: "BOMUN WAVE DATA FLOW",
      summary: `${now} · 보문호 물결 패킷 흐름 · API 수신 대기`,
      metrics: [
        { label: "물결", value: 58 },
        { label: "습도", value: 66 },
        { label: "바람", value: 38 },
      ],
      vars: {
        "--live-pulse": "0.58",
        "--live-wind": "0.42",
        "--live-rain": "0.2",
        "--live-water": "0.7",
        "--live-density": "0.68",
      },
    });
    setPanel("andongWeather", {
      title: "ANDONG WIND DATA FLOW",
      summary: `${now} · 하회마을 바람결 데이터 스트림 가동`,
      metrics: [
        { label: "온도", value: 46 },
        { label: "바람", value: 45 },
        { label: "습도", value: 62 },
      ],
      vars: {
        "--live-pulse": "0.48",
        "--live-wind": "0.62",
        "--live-rain": "0.12",
        "--live-water": "0.52",
        "--live-density": "0.7",
      },
    });
    setPanel("andongRiver", {
      title: "WOLYEONGGYO WATER FLOW",
      summary: `${now} · 월영교 수위 패킷 흐름 · API 수신 대기`,
      metrics: [
        { label: "수위", value: 36 },
        { label: "달빛", value: 64 },
        { label: "바람", value: 42 },
      ],
      vars: {
        "--live-pulse": "0.52",
        "--live-wind": "0.38",
        "--live-rain": "0.28",
        "--live-water": "0.72",
        "--live-density": "0.76",
      },
    });
  };

  const resizeCanvas = (canvas) => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { width, height, ratio };
  };

  const drawFlow = (time) => {
    document.querySelectorAll("[data-live-panel]").forEach((panel, index) => {
      const key = panel.dataset.livePanel;
      const canvas = panel.querySelector(".media-flow-canvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const { width, height, ratio } = resizeCanvas(canvas);
      const stateForPanel = panelState.get(key) || {
        pulse: 0.55,
        wind: 0.45,
        rain: 0.18,
        water: 0.45,
        density: 0.6,
        metrics: [0.48, 0.38, 0.58],
      };
      const t = time * 0.001;
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.scale(ratio, ratio);
      const w = width / ratio;
      const h = height / ratio;
      const speed = 18 + stateForPanel.wind * 76 + stateForPanel.pulse * 24;
      const lineCount = Math.round(6 + stateForPanel.density * 12);
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < lineCount; i += 1) {
        const baseY = h * (0.18 + (i / Math.max(1, lineCount - 1)) * 0.66);
        const amp = 10 + stateForPanel.water * 24 + (i % 3) * 3;
        const offset = ((t * speed + i * 52 + index * 37) % (w + 180)) - 90;
        ctx.beginPath();
        for (let x = -80; x <= w + 80; x += 18) {
          const y = baseY + Math.sin((x * 0.018) + t * (1.1 + stateForPanel.wind) + i) * amp;
          if (x === -80) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = i % 3 === 0 ? "rgba(255,232,141,0.34)" : i % 3 === 1 ? "rgba(141,235,211,0.3)" : "rgba(255,178,199,0.24)";
        ctx.lineWidth = 1 + stateForPanel.pulse * 1.4;
        ctx.setLineDash([28, 12, 4, 10]);
        ctx.lineDashOffset = -offset;
        ctx.stroke();
      }

      const packetCount = Math.round(18 + stateForPanel.density * 28);
      for (let i = 0; i < packetCount; i += 1) {
        const metric = stateForPanel.metrics[i % stateForPanel.metrics.length] || 0.5;
        const x = ((t * speed * (0.85 + metric) + i * 43 + index * 91) % (w + 80)) - 40;
        const y = h * (0.18 + ((i * 37) % 70) / 100) + Math.sin(t * 2 + i) * 8;
        const radius = 1.6 + metric * 4.2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = i % 4 === 0 ? "rgba(255,232,141,0.94)" : i % 4 === 1 ? "rgba(141,235,211,0.86)" : "rgba(255,178,199,0.78)";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12 + metric * 12;
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.font = "700 10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "rgba(255,248,222,0.72)";
      const labels = key.includes("River") ? ["WL", "RAIN", "MOON"] : key.includes("Dance") ? ["AUD", "MOVE", "FX"] : key.includes("Festival") ? ["QR", "STAMP", "FLOW"] : ["TEMP", "WIND", "PM"];
      labels.forEach((label, i) => {
        const x = ((t * (speed * 0.5) + i * 154 + index * 49) % (w + 120)) - 60;
        const y = 24 + i * 22 + Math.sin(t + i) * 5;
        ctx.fillText(`${label}:${Math.round((stateForPanel.metrics[i] || stateForPanel.pulse) * 100)}`, x, y);
      });
      ctx.restore();
    });
    requestAnimationFrame(drawFlow);
  };

  const startFlowAnimation = () => {
    if (animationStarted) return;
    animationStarted = true;
    requestAnimationFrame(drawFlow);
  };

  const safeNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };

  const weatherText = (weather, air) => {
    const current = weather.current || {};
    const sky = skyNames.get(safeNumber(current.weather_code)) || "변화하는 하늘";
    const temp = Math.round(safeNumber(current.temperature_2m));
    const wind = (safeNumber(current.wind_speed_10m) / 3.6).toFixed(1);
    const rain = safeNumber(current.precipitation).toFixed(1);
    const humidity = Math.round(safeNumber(current.relative_humidity_2m));
    const pm25 = Math.round(safeNumber(air.current?.pm2_5));
    return {
      sky,
      temp,
      wind,
      rain,
      humidity,
      pm25,
      time: formatTime(current.time || air.current?.time),
    };
  };

  const waveIndex = ({ wind, rain, humidity }) => {
    const score = Math.min(99, Math.round(Number(wind) * 8 + Number(rain) * 14 + Number(humidity) * 0.28));
    if (score >= 64) return `물결 강함 ${score}%`;
    if (score >= 38) return `물결 보통 ${score}%`;
    return `물결 잔잔 ${score}%`;
  };

  const renderParticipation = () => {
    const festivalPower = Math.min(100, state.gyeongjuFestival * 4);
    const dancePower = Math.min(100, state.andongDance * 3);
    setLive("gyeongjuFestival", `QR 참여 ${state.gyeongjuFestival}건 · 금빛 행렬 밝기 ${festivalPower}% · 즉시 반영`);
    setLive("andongDance", `관객 반응 ${state.andongDance}건 · 춤 이펙트 밀도 ${dancePower}% · 즉시 반영`);
    setPanel("gyeongjuFestival", {
      title: "QR PARTICIPATION LIVE",
      summary: `참여 ${state.gyeongjuFestival}건 · 행렬 조명 ${festivalPower}% · 문양 밀도 즉시 변화`,
      metrics: [
        { label: "QR", value: festivalPower },
        { label: "행렬", value: festivalPower * 0.86 },
        { label: "문양", value: 42 + festivalPower * 0.58 },
      ],
      vars: {
        "--live-pulse": String(clamp(festivalPower / 100, 0.35, 1)),
        "--live-density": String(clamp(festivalPower / 100, 0.35, 1)),
        "--live-wind": "0.55",
        "--live-rain": "0.14",
        "--live-water": "0.32",
      },
    });
    setPanel("andongDance", {
      title: "AUDIENCE REACTION LIVE",
      summary: `관객 반응 ${state.andongDance}건 · 춤 이펙트 ${dancePower}% · 색 파동 즉시 변화`,
      metrics: [
        { label: "관객", value: dancePower },
        { label: "춤선", value: 36 + dancePower * 0.64 },
        { label: "색파동", value: 52 + dancePower * 0.48 },
      ],
      vars: {
        "--live-pulse": String(clamp(dancePower / 100, 0.35, 1)),
        "--live-density": String(clamp(dancePower / 100, 0.35, 1)),
        "--live-wind": "0.72",
        "--live-rain": "0.18",
        "--live-water": "0.42",
      },
    });
  };

  const fetchJson = async (url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return response.json();
  };

  const loadPlace = async (key) => {
    const place = places[key];
    const common = `latitude=${place.latitude}&longitude=${place.longitude}&timezone=Asia%2FSeoul`;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?${common}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,cloud_cover`;
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${common}&current=pm10,pm2_5`;
    const [weather, air] = await Promise.all([fetchJson(weatherUrl), fetchJson(airUrl)]);
    const live = weatherText(weather, air);

    if (key === "gyeongju") {
      setLive("gyeongjuWeather", `${place.name} ${live.time} · ${live.sky} · ${live.temp}°C · 바람 ${live.wind}m/s · 강수 ${live.rain}mm · PM2.5 ${live.pm25}㎍/㎥`);
      setLive("gyeongjuBomun", `보문호 ${live.time} · ${waveIndex(live)} · 체감 습도 ${live.humidity}% · 바람 ${live.wind}m/s`);
      const tempScore = clamp((Number(live.temp) + 4) / 38, 0.1, 1) * 100;
      const windScore = clamp(Number(live.wind) / 8, 0.08, 1) * 100;
      const rainScore = clamp(Number(live.rain) / 4, 0.04, 1) * 100;
      const waterScore = clamp((Number(live.wind) * 7 + Number(live.rain) * 18 + live.humidity * 0.28) / 100, 0.18, 0.98) * 100;
      setPanel("gyeongjuWeather", {
        title: "GYEONGJU WEATHER LIVE",
        summary: `${live.time} · ${live.sky} · ${live.temp}°C · 바람 ${live.wind}m/s · 강수 ${live.rain}mm`,
        metrics: [
          { label: "온도", value: tempScore },
          { label: "바람", value: windScore },
          { label: "강수", value: rainScore },
        ],
        vars: {
          "--live-pulse": String(clamp(tempScore / 100, 0.22, 0.9)),
          "--live-wind": String(clamp(windScore / 100, 0.12, 0.95)),
          "--live-rain": String(clamp(rainScore / 100, 0.04, 0.9)),
          "--live-water": String(clamp(waterScore / 100, 0.18, 0.95)),
          "--live-density": String(clamp((100 - live.pm25) / 100, 0.25, 0.82)),
        },
      });
      setPanel("gyeongjuBomun", {
        title: "BOMUN LAKE WAVE LIVE",
        summary: `${live.time} · ${waveIndex(live)} · 습도 ${live.humidity}% · 바람 ${live.wind}m/s`,
        metrics: [
          { label: "물결", value: waterScore },
          { label: "습도", value: live.humidity },
          { label: "바람", value: windScore },
        ],
        vars: {
          "--live-pulse": String(clamp(waterScore / 100, 0.24, 0.95)),
          "--live-wind": String(clamp(windScore / 100, 0.1, 0.96)),
          "--live-rain": String(clamp(rainScore / 100, 0.04, 0.9)),
          "--live-water": String(clamp(waterScore / 100, 0.24, 0.98)),
          "--live-density": String(clamp(live.humidity / 100, 0.32, 0.92)),
        },
      });
    } else {
      const riverScore = Math.min(99, Math.round(Number(live.rain) * 18 + Number(live.humidity) * 0.35 + Number(live.wind) * 4));
      const riverState = riverScore >= 60 ? "주의 관찰" : riverScore >= 35 ? "변화 감지" : "평상";
      setLive("andongWeather", `${place.name} ${live.time} · ${live.sky} · ${live.temp}°C · 바람 ${live.wind}m/s · 습도 ${live.humidity}% · PM2.5 ${live.pm25}㎍/㎥`);
      setLive("andongRiver", `월영교 ${live.time} · 강수 기반 수위지표 ${riverScore}% · ${riverState} · 달빛배 밝기 ${100 - Math.min(70, riverScore)}%`);
      const tempScore = clamp((Number(live.temp) + 4) / 38, 0.1, 1) * 100;
      const windScore = clamp(Number(live.wind) / 8, 0.08, 1) * 100;
      const riverPulse = clamp(riverScore / 100, 0.2, 0.96) * 100;
      setPanel("andongWeather", {
        title: "ANDONG WIND LIVE",
        summary: `${live.time} · ${live.sky} · ${live.temp}°C · 풍속 ${live.wind}m/s · 습도 ${live.humidity}%`,
        metrics: [
          { label: "온도", value: tempScore },
          { label: "바람", value: windScore },
          { label: "습도", value: live.humidity },
        ],
        vars: {
          "--live-pulse": String(clamp(tempScore / 100, 0.2, 0.85)),
          "--live-wind": String(clamp(windScore / 100, 0.12, 0.96)),
          "--live-rain": "0.08",
          "--live-water": String(clamp(live.humidity / 100, 0.28, 0.92)),
          "--live-density": String(clamp((100 - live.pm25) / 100, 0.26, 0.86)),
        },
      });
      setPanel("andongRiver", {
        title: "WOLYEONGGYO WATER LEVEL LIVE",
        summary: `${live.time} · 수위지표 ${riverScore}% · ${riverState} · 달빛배 밝기 ${100 - Math.min(70, riverScore)}%`,
        metrics: [
          { label: "수위", value: riverPulse },
          { label: "달빛", value: 100 - Math.min(70, riverScore) },
          { label: "바람", value: windScore },
        ],
        vars: {
          "--live-pulse": String(clamp(riverScore / 100, 0.22, 0.96)),
          "--live-wind": String(clamp(windScore / 100, 0.12, 0.96)),
          "--live-rain": String(clamp(riverScore / 100, 0.08, 0.88)),
          "--live-water": String(clamp(riverScore / 100, 0.28, 0.98)),
          "--live-density": String(clamp(riverScore / 100, 0.32, 0.95)),
        },
      });
    }
  };

  const loadAll = async () => {
    renderParticipation();
    try {
      await Promise.all([loadPlace("gyeongju"), loadPlace("andong")]);
    } catch (error) {
      console.warn("regional live data unavailable", error);
      seedPanels();
    }
  };

  document.querySelectorAll("[data-live-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.liveAction;
      state[key] += 1;
      if (key === "gyeongjuFestival") localStorage.setItem("bomnalGyeongjuFestival", String(state[key]));
      if (key === "andongDance") localStorage.setItem("bomnalAndongDance", String(state[key]));
      renderParticipation();
    });
  });

  ensurePanelOverlays();
  seedPanels();
  renderParticipation();
  startFlowAnimation();
  loadAll();
  setInterval(loadAll, 20 * 60 * 1000);
})();
