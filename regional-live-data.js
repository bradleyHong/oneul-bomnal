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
  };

  const fetchJson = async (url) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
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
    } else {
      const riverScore = Math.min(99, Math.round(Number(live.rain) * 18 + Number(live.humidity) * 0.35 + Number(live.wind) * 4));
      const riverState = riverScore >= 60 ? "주의 관찰" : riverScore >= 35 ? "변화 감지" : "평상";
      setLive("andongWeather", `${place.name} ${live.time} · ${live.sky} · ${live.temp}°C · 바람 ${live.wind}m/s · 습도 ${live.humidity}% · PM2.5 ${live.pm25}㎍/㎥`);
      setLive("andongRiver", `월영교 ${live.time} · 강수 기반 수위지표 ${riverScore}% · ${riverState} · 달빛배 밝기 ${100 - Math.min(70, riverScore)}%`);
    }
  };

  const loadAll = async () => {
    renderParticipation();
    try {
      await Promise.all([loadPlace("gyeongju"), loadPlace("andong")]);
    } catch (error) {
      console.warn("regional live data unavailable", error);
      setLive("gyeongjuWeather", "실시간 API 연결이 지연되어 기본 제안값으로 표시 중입니다.");
      setLive("gyeongjuBomun", "실시간 API 연결이 지연되어 보문호 물결 기본값으로 표시 중입니다.");
      setLive("andongWeather", "실시간 API 연결이 지연되어 기본 제안값으로 표시 중입니다.");
      setLive("andongRiver", "실시간 API 연결이 지연되어 월영교 수위 기본값으로 표시 중입니다.");
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

  loadAll();
  setInterval(loadAll, 20 * 60 * 1000);
})();
