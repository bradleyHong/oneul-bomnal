/**
 * 대구 하늘 · 사이트 배경을 실제 태양 고도에 맞춘다
 *
 * 지금 이 순간 대구에서 해가 어디에 떠 있는지 계산해 배경의 해를 그 자리에 둡니다.
 * 아침에는 왼쪽 낮게, 정오에는 가운데 높이, 저녁에는 오른쪽으로 집니다.
 * 해가 지평선 아래로 내려가면 하늘이 어두워지고 달과 별이 올라옵니다.
 * 달은 실제 위상(삭·상현·망·하현)까지 반영합니다.
 *
 * 방문자가 어느 시간대에 있든 '대구의 지금 하늘'을 보게 됩니다.
 * 천체 위치는 협정세계시로 계산되므로 브라우저 시계의 표준시와 무관합니다.
 *
 * 계산은 표준 저정밀 천문 알고리즘입니다. 대구 기준 남중고도가
 * 이론값(90 - 위도 + 적위)과 0.1도 이내로 일치하는 것을 확인했습니다.
 *
 * 히어로 실시간 줄은 하늘 레이어·타이포월·공기질 캔버스와 따로 돈다.
 * 홈에는 그 캔버스가 없어서 예전에는 기온을 읽지 못했고, 하늘 스크립트가
 * 멈추면 "불러오는 중"이 그대로 남았다. 시각은 즉시 쓰고, 값은 여기서 직접
 * 받으며, 실패하면 직전 값 또는 다시 불러오기로 남긴다.
 */
(() => {
  const layer = document.getElementById("skyLayer");
  const statusEl = document.querySelector("[data-live-status]");
  if (!layer && !statusEl) return;

  // 대구 중심 좌표
  const LAT = 35.8714;
  const LON = 128.6014;
  const RAD = Math.PI / 180;
  const CACHE_KEY = "bomnal-live-v1";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const DATE_FMT = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const live = (window.bomnalLive = window.bomnalLive || {});

  const skyKey = (code) => {
    if (code == null) return null;
    if (code === 0 || code === 1) return "맑음";
    if (code === 2) return "구름";
    if (code === 3) return "흐림";
    if (code >= 45 && code <= 48) return "안개";
    if (code >= 71 && code <= 77) return "눈";
    if (code >= 85 && code <= 86) return "눈";
    if (code >= 51) return "비";
    return "구름";
  };

  const gradeLabel = (pm25) => {
    if (pm25 <= 15) return "좋음";
    if (pm25 <= 35) return "보통";
    if (pm25 <= 75) return "나쁨";
    return "매우 나쁨";
  };

  const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

  function readCache() {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || typeof d !== "object") return null;
      return d;
    } catch {
      return null;
    }
  }

  function writeCache() {
    try {
      window.localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          at: Date.now(),
          temp: live.temp,
          sky: live.sky,
          pm25: live.pm25,
          grade: live.grade,
        })
      );
    } catch {
      /* 비공개 모드 등 */
    }
  }

  function applyCache() {
    if (live.temp != null || live.sky || live.pm25 != null) return false;
    const d = readCache();
    if (!d) return false;
    if (d.temp == null && !d.sky && d.pm25 == null) return false;
    if (d.temp != null) live.temp = d.temp;
    if (d.sky) live.sky = d.sky;
    if (d.pm25 != null) live.pm25 = d.pm25;
    if (d.grade) live.grade = d.grade;
    live.fromCache = true;
    return true;
  }

  /** 히어로 맨 아랫줄: 시각은 항상. 값·직전 값·실패는 그 뒤에. */
  function paintStatus() {
    const el = document.querySelector("[data-live-status]");
    if (!el) return;
    const now = new Date();
    const parts = [`${DATE_FMT.format(now)} ${fmt.format(now)}`];
    const retry = document.querySelector("[data-live-retry]");
    const row = el.closest(".home2-now");
    const hasWeather = live.sky || live.temp != null;
    const hasAir = live.pm25 != null;
    let state = "time";

    if (hasWeather) {
      const t = live.temp != null ? `${Math.round(live.temp)}°C` : "";
      parts.push(["대구", live.sky, t].filter(Boolean).join(" "));
      state = live.fromCache ? "cache" : "live";
    } else if (live.note) {
      parts.push(`대구 (${live.note})`);
      state = live.failed ? "fail" : "time";
    } else if (live.failed) {
      parts.push("대구 실시간 정보를 불러오지 못했습니다");
      state = "fail";
    } else {
      parts.push("대구");
    }

    if (hasAir) {
      parts.push(`초미세먼지 ${Math.round(live.pm25)} ${live.grade || ""}`.trim());
      if (state === "time") state = live.fromCache ? "cache" : "live";
    }
    if (live.fromCache && (hasWeather || hasAir)) parts.push("직전 값");

    el.textContent = parts.join(" · ");
    if (live.grade) el.dataset.grade = live.grade;
    else delete el.dataset.grade;
    if (row) row.dataset.liveState = state;
    if (retry) retry.hidden = state !== "fail" && !(live.failed && live.fromCache);
  }

  window.bomnalLiveUpdate = paintStatus;

  async function pullLive() {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&timezone=Asia%2FSeoul`;
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}&current=pm10,pm2_5&timezone=Asia%2FSeoul`;
    const [wRes, aRes] = await Promise.all([fetch(weatherUrl), fetch(airUrl)]);
    if (!wRes.ok && !aRes.ok) throw new Error("api");
    const w = wRes.ok ? await wRes.json() : null;
    const a = aRes.ok ? await aRes.json() : null;
    const temp = Number(w?.current?.temperature_2m);
    const code = Number(w?.current?.weather_code);
    const pm25 = Number(a?.current?.pm2_5);
    const pm10 = Number(a?.current?.pm10);
    if (!Number.isFinite(temp) && !Number.isFinite(pm25)) throw new Error("empty");

    if (Number.isFinite(temp)) live.temp = temp;
    if (Number.isFinite(code)) live.sky = skyKey(code);
    if (Number.isFinite(pm25)) {
      live.pm25 = pm25;
      live.grade = gradeLabel(pm25);
    }
    if (Number.isFinite(pm10)) live.pm10 = pm10;
    live.fromCache = false;
    live.failed = false;
    live.note = "";
    writeCache();
    paintStatus();
    return true;
  }

  async function loadLiveWithRetry() {
    live.failed = false;
    live.note = live.fromCache ? live.note : "";
    paintStatus();
    const delays = [0, 1500, 4000, 8000];
    for (let i = 0; i < delays.length; i += 1) {
      if (delays[i]) await sleep(delays[i]);
      try {
        if (await pullLive()) return true;
      } catch {
        /* 다음 간격으로 */
      }
    }
    live.failed = true;
    if (!live.fromCache && live.temp == null && live.pm25 == null) {
      live.note = "";
    }
    paintStatus();
    return false;
  }

  applyCache();
  paintStatus();
  loadLiveWithRetry();
  window.setInterval(loadLiveWithRetry, 10 * 60 * 1000);
  window.setInterval(paintStatus, 30 * 1000);

  const retryBtn = document.querySelector("[data-live-retry]");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      retryBtn.disabled = true;
      loadLiveWithRetry().finally(() => {
        retryBtn.disabled = false;
      });
    });
  }

  if (!layer) return;

  const daysSinceJ2000 = (date) => date.getTime() / 86400000 - 10957.5;

  /** 적경·적위를 대구에서 본 고도·방위로 옮긴다. */
  function toHorizon(ra, dec, d) {
    let gmst = (18.697374558 + 24.06570982441908 * d) % 24;
    if (gmst < 0) gmst += 24;
    const ha = (gmst + LON / 15) * 15 * RAD - ra;
    const la = LAT * RAD;
    const alt = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha));
    let az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(ha));
    az = (((az / RAD) % 360) + 360) % 360;
    return { altitude: alt / RAD, azimuth: az };
  }

  function sunEquatorial(d) {
    const g = (357.529 + 0.98560028 * d) * RAD;
    const q = 280.459 + 0.98564736 * d;
    const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
    const e = (23.439 - 0.00000036 * d) * RAD;
    return {
      ra: Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)),
      dec: Math.asin(Math.sin(e) * Math.sin(L)),
      lon: L,
    };
  }

  function sunPosition(date) {
    const d = daysSinceJ2000(date);
    const { ra, dec } = sunEquatorial(d);
    return toHorizon(ra, dec, d);
  }

  function moonPosition(date) {
    const d = daysSinceJ2000(date);
    const e = (23.439 - 0.00000036 * d) * RAD;
    const L = (218.316 + 13.176396 * d) * RAD; // 평균 황경
    const M = (134.963 + 13.064993 * d) * RAD; // 평균 근점이각
    const F = (93.272 + 13.22935 * d) * RAD; // 승교점 이각
    const lam = L + 6.289 * RAD * Math.sin(M);
    const bet = 5.128 * RAD * Math.sin(F);
    const ra = Math.atan2(
      Math.sin(lam) * Math.cos(e) - Math.tan(bet) * Math.sin(e),
      Math.cos(lam)
    );
    const dec = Math.asin(Math.sin(bet) * Math.cos(e) + Math.cos(bet) * Math.sin(e) * Math.sin(lam));
    const sun = sunEquatorial(d);
    const elong = Math.acos(
      Math.min(1, Math.max(-1,
        Math.sin(sun.dec) * Math.sin(dec) + Math.cos(sun.dec) * Math.cos(dec) * Math.cos(sun.ra - ra)
      ))
    );
    // 달의 황경이 태양보다 앞서면 차오르는 중(상현)이라 오른쪽이 밝다.
    const ahead = (((lam - sun.lon) / RAD) % 360 + 360) % 360;
    return {
      ...toHorizon(ra, dec, d),
      phase: (1 - Math.cos(elong)) / 2,
      waxing: ahead < 180,
    };
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (v, a, b) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  /**
   * 방위·고도를 화면 좌표로. 남쪽을 바라보고 선 시점이라
   * 동쪽(방위 90도)이 왼쪽, 서쪽(270도)이 오른쪽이다.
   */
  function place(altitude, azimuth) {
    const x = clamp((azimuth - 55) / (305 - 55), 0, 1) * 88 + 6;
    // 세로는 히어로 영역 안으로 좁힌다. 화면 전체에 그대로 대응시키면
    // 고도가 낮은 아침·저녁에 해가 카드 뒤로 숨어 보이지 않는다.
    // 지평선이 52%, 천정이 8% 자리다.
    const y = 52 - clamp(altitude / 78, 0, 1) * 44;
    return { x, y };
  }

  // ── 화면 요소 ───────────────────────────────────────────────
  const body = document.createElement("div");
  body.className = "sky-body";
  const glow = document.createElement("div");
  glow.className = "sky-glow";
  const stars = document.createElement("div");
  stars.className = "sky-stars";
  layer.append(glow, body, stars);

  // 별은 매번 자리가 바뀌면 어지러우므로 고정 배치로 한 번만 만든다.
  const starHash = (i) => {
    let x = Math.imul(i + 1, 374761393) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177) | 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 68; i += 1) {
    const s = document.createElement("i");
    s.style.left = `${(starHash(i * 3) * 100).toFixed(2)}%`;
    s.style.top = `${(starHash(i * 3 + 1) * 72).toFixed(2)}%`;
    const r = starHash(i * 3 + 2);
    s.style.width = s.style.height = `${(1 + r * 1.8).toFixed(1)}px`;
    s.style.opacity = (0.35 + r * 0.65).toFixed(2);
    if (!reduceMotion.matches) {
      s.style.animationDuration = `${(2.6 + r * 4).toFixed(1)}s`;
      s.style.animationDelay = `${(r * 5).toFixed(1)}s`;
    }
    stars.appendChild(s);
  }

  function paint() {
    const now = new Date();
    const sun = sunPosition(now);
    const isDay = sun.altitude > -0.8;
    const target = isDay ? sun : moonPosition(now);
    const { x, y } = place(target.altitude, target.azimuth);

    // 낮 세기 · 시민박명(-6도)부터 고도 8도 사이에서 부드럽게 밝아진다
    const daylight = smooth(sun.altitude, -6, 8);
    // 해가 낮게 걸릴수록 붉어지는 정도
    const golden = isDay ? smooth(sun.altitude, 12, 0) * smooth(sun.altitude, -6, 1) : 0;

    root.style.setProperty("--daylight", daylight.toFixed(3));
    root.style.setProperty("--golden", golden.toFixed(3));
    root.style.setProperty("--sun-x", `${x.toFixed(2)}%`);
    root.style.setProperty("--sun-y", `${y.toFixed(2)}%`);
    // 사진은 밤에 어둡게. LED 화면은 캔버스라 이 필터를 받지 않아
    // 어두운 광장에서 패널만 빛나는 장면이 된다.
    root.style.setProperty("--photo-brightness", (0.5 + daylight * 0.5).toFixed(3));
    root.style.setProperty("--photo-saturate", (0.78 + daylight * 0.22).toFixed(3));

    root.dataset.sky = daylight > 0.85 ? "day" : daylight > 0.25 ? "golden" : daylight > 0.02 ? "dusk" : "night";

    body.classList.toggle("is-moon", !isDay);
    const phase = target.phase ?? 1;
    body.style.setProperty("--phase", phase.toFixed(3));
    // 명암 경계는 타원이다. 반달이면 폭 0(직선), 삭·망이면 원 지름과 같다.
    body.style.setProperty("--term-w", `${(Math.abs(1 - 2 * phase) * 100).toFixed(1)}%`);
    body.classList.toggle("is-gibbous", phase > 0.5);
    body.classList.toggle("is-waning", isDay ? false : target.waxing === false);
    // 지평선 아래에 있으면 굳이 그리지 않는다.
    // 스크롤에 따른 흐림과 곱해져야 하므로 opacity를 직접 쓰지 않는다.
    body.style.setProperty("--body-vis", target.altitude < -3 ? "0" : "1");

    const time = fmt.format(now);
    const what = isDay ? "해" : "달";
    layer.setAttribute(
      "aria-label",
      `대구 ${time} 기준 하늘. ${what}의 고도 ${target.altitude.toFixed(0)}도, 방위 ${target.azimuth.toFixed(0)}도.`
    );

    const readout = document.querySelector("[data-sky-readout]");
    if (readout) {
      readout.textContent = isDay
        ? `대구 ${time} · 해 고도 ${sun.altitude.toFixed(0)}°`
        : `대구 ${time} · 달 ${Math.round((target.phase ?? 0) * 100)}%`;
    }
  }

  // 하늘은 화면에 고정돼 있어서, 손대지 않으면 해와 달이 독자를 따라
  // 페이지 끝까지 내려온다. 밝은 원이 본문 뒤에 겹치면 글자가 읽히지 않는다.
  // 히어로를 지나면 서서히 물러나게 해 천체를 첫 화면에 붙들어 둔다.
  let depthQueued = false;
  function paintDepth() {
    depthQueued = false;
    const hero = document.querySelector(".stage-hero") || document.querySelector(".home2-hero");
    const span = Math.max(1, (hero ? hero.offsetHeight : window.innerHeight) * 0.75);
    const t = clamp(1 - window.scrollY / span, 0, 1);
    // 완전히 지우지 않는다. 옅게 남아야 하늘이 이어져 보인다.
    root.style.setProperty("--sky-depth", (0.08 + t * 0.92).toFixed(3));
  }
  window.addEventListener(
    "scroll",
    () => {
      if (depthQueued) return;
      depthQueued = true;
      window.requestAnimationFrame(paintDepth);
    },
    { passive: true }
  );

  try {
    paint();
    paintDepth();
  } catch {
    /* 하늘 그림이 깨져도 실시간 줄은 이미 돌아가고 있다 */
  }
  // 해는 4분에 1도씩 움직인다. 1분마다 다시 그리면 충분하다.
  window.setInterval(() => {
    try { paint(); } catch { /* 한 프레임 실패는 다음 분에 맡긴다 */ }
  }, 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      try { paint(); } catch { /* */ }
    }
  });
})();
