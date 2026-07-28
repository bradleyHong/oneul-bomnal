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
 */
(() => {
  const layer = document.getElementById("skyLayer");
  if (!layer) return;

  // 대구 중심 좌표
  const LAT = 35.8714;
  const LON = 128.6014;
  const RAD = Math.PI / 180;

  const root = document.documentElement;
  const reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

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
      Math.sin(sun.dec) * Math.sin(dec) + Math.cos(sun.dec) * Math.cos(dec) * Math.cos(sun.ra - ra)
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

  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

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
    // 지평선 아래에 있으면 굳이 그리지 않는다
    body.style.opacity = target.altitude < -3 ? "0" : "1";

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

  paint();
  // 해는 4분에 1도씩 움직인다. 1분마다 다시 그리면 충분하다.
  window.setInterval(paint, 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) paint();
  });
})();
