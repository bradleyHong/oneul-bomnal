const canvas = document.querySelector("#springCanvas");
const ctx = canvas?.getContext("2d");
const miniCanvas = document.querySelector("#miniSpringCanvas");
const miniCtx = miniCanvas?.getContext("2d");
const dustWalkCanvas = document.querySelector("#dustWalkCanvas");
const dustWalkCtx = dustWalkCanvas?.getContext("2d");
const temperatureGardenCanvas = document.querySelector("#temperatureGardenCanvas");
const temperatureGardenCtx = temperatureGardenCanvas?.getContext("2d");
const rainFlowerCanvas = document.querySelector("#rainFlowerCanvas");
const rainFlowerCtx = rainFlowerCanvas?.getContext("2d");
let refArtCanvas = document.querySelector("#refArtCanvas");
let refArtCtx = refArtCanvas?.getContext("2d");
const propWeatherCanvas = document.querySelector("#propWeatherCanvas");
const propWeatherCtx = propWeatherCanvas?.getContext("2d");
const propAirCanvas = document.querySelector("#propAirCanvas");
const propAirCtx = propAirCanvas?.getContext("2d");
const propWaterCanvas = document.querySelector("#propWaterCanvas");
const propWaterCtx = propWaterCanvas?.getContext("2d");
const propMobilityCanvas = document.querySelector("#propMobilityCanvas");
const propMobilityCtx = propMobilityCanvas?.getContext("2d");
const propEnergyCanvas = document.querySelector("#propEnergyCanvas");
const propEnergyCtx = propEnergyCanvas?.getContext("2d");
const propFestivalCanvas = document.querySelector("#propFestivalCanvas");
const propFestivalCtx = propFestivalCanvas?.getContext("2d");
const placeLabel = document.querySelector("#placeLabel");
const weatherLine = document.querySelector("#weatherLine");
const tempValue = document.querySelector("#tempValue");
const skyValue = document.querySelector("#skyValue");
const windValue = document.querySelector("#windValue");
const refreshButton = document.querySelector("#refreshButton");
const springStatus = document.querySelector("#springStatus");
const dustStatus = document.querySelector("#dustStatus");
const temperatureStatus = document.querySelector("#temperatureStatus");
const rainStatus = document.querySelector("#rainStatus");
const springCardStatus = document.querySelector("#springCardStatus");
const dustCardStatus = document.querySelector("#dustCardStatus");
const temperatureCardStatus = document.querySelector("#temperatureCardStatus");
const rainCardStatus = document.querySelector("#rainCardStatus");

const DAEGU = { latitude: 35.8714, longitude: 128.6014, label: "대구의 하늘" };
const pointer = { x: 0, y: 0, active: false, force: 0 };
const weather = {
  label: "봄빛",
  temp: 18,
  wind: 2.5,
  code: 1,
  cloud: 30,
  rain: 0,
};
const airQuality = {
  pm10: null,
  pm25: null,
};
const TAU = Math.PI * 2;

let width = 0;
let height = 0;
let dpr = 1;
let time = 0;
let petals = [];
let stems = [];
let clockMarks = [];

const skyNames = new Map([
  [0, "맑음"],
  [1, "옅은 구름"],
  [2, "구름"],
  [3, "흐림"],
  [45, "안개"],
  [48, "서리 안개"],
  [51, "이슬비"],
  [53, "이슬비"],
  [55, "이슬비"],
  [61, "비"],
  [63, "비"],
  [65, "큰비"],
  [71, "눈"],
  [73, "눈"],
  [75, "큰눈"],
  [80, "소나기"],
  [81, "소나기"],
  [82, "강한 소나기"],
  [95, "천둥"],
]);

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.floor(window.innerWidth);
  height = Math.floor(window.innerHeight);
  if (canvas && ctx) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  buildGarden();
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function buildGarden() {
  const petalCount = Math.max(90, Math.floor((width * height) / 9200));
  const stemCount = Math.max(22, Math.floor(width / 38));

  petals = Array.from({ length: petalCount }, () => ({
    x: random(-width * 0.1, width * 1.1),
    y: random(-height * 0.2, height * 0.95),
    r: random(3, 9),
    speed: random(0.35, 1.35),
    drift: random(-0.45, 0.45),
    phase: random(0, Math.PI * 2),
    hue: random(338, 28),
    alpha: random(0.52, 0.92),
  }));

  stems = Array.from({ length: stemCount }, (_, index) => ({
    x: (index / Math.max(1, stemCount - 1)) * width + random(-12, 12),
    h: random(height * 0.16, height * 0.38),
    lean: random(-16, 16),
    phase: random(0, Math.PI * 2),
    bloom: random(0.35, 1),
  }));

  clockMarks = Array.from({ length: 60 }, (_, index) => ({
    index,
    length: index % 5 === 0 ? random(18, 34) : random(7, 16),
    width: index % 5 === 0 ? random(1.7, 3.4) : random(0.7, 1.6),
    wobble: random(-0.018, 0.018),
    phase: random(0, TAU),
    hue: random(18, 196),
  }));
}

function hueWrap(value) {
  return ((value % 360) + 360) % 360;
}

function weatherMood() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const dayLight = 0.5 + 0.5 * Math.cos((Math.PI * (hour - 12)) / 12);
  const nightFactor = 1 - dayLight;

  const tempWarmth = Math.max(0, Math.min(1, (weather.temp + 2) / 32));
  const windPower = Math.max(0.2, Math.min(2.8, weather.wind / 4));
  const wetness = Math.max(0, Math.min(1, weather.rain / 2.5));
  const cloud = Math.max(0, Math.min(1, weather.cloud / 100));
  const isSnow = weather.code >= 71 && weather.code <= 77;
  const isStorm = weather.code >= 95;

  return {
    tempWarmth,
    windPower: isStorm ? windPower * 1.5 : windPower,
    wetness: isSnow ? 0.15 : wetness,
    cloud,
    isSnow,
    isStorm,
    light: (1 - cloud * 0.36 - wetness * 0.18) * dayLight,
    nightFactor,
    dayLight,
  };
}

function drawBackground(mood) {
  const n = mood.nightFactor;
  const dim = n * 40;

  const topHue = n > 0.5 ? 218 + (n - 0.5) * 24 : 190 - mood.cloud * 30;
  const midHue = n > 0.5 ? 220 : 48 + mood.tempWarmth * 16;
  const botHue = n > 0.5 ? 212 : 126 - mood.wetness * 28;
  const midSat = n > 0.5 ? 30 - (n - 0.5) * 14 : 78;
  const botSat = n > 0.5 ? 26 : 44 - mood.cloud * 10;

  const top = `hsl(${topHue}, ${48 - mood.cloud * 16}%, ${Math.max(5, 82 - mood.cloud * 14 - dim)}%)`;
  const middle = `hsl(${midHue}, ${midSat}%, ${Math.max(5, 88 - mood.wetness * 9 - dim)}%)`;
  const bottom = `hsl(${botHue}, ${botSat}%, ${Math.max(5, 76 - mood.cloud * 8 - dim)}%)`;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(0.52, middle);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const celestialR = Math.min(width, height);
  if (n > 0.55) {
    // 달
    const moonR = celestialR * 0.07;
    ctx.save();
    ctx.globalAlpha = 0.5 + n * 0.36;
    ctx.shadowColor = "rgba(240, 235, 180, 0.55)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = `hsl(52, 16%, 93%)`;
    ctx.beginPath();
    ctx.arc(width * 0.18, height * 0.14, moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (n < 0.45) {
    // 해
    ctx.globalAlpha = (0.36 + mood.light * 0.26) * Math.max(0, 1 - n * 2.2);
    ctx.fillStyle = `hsl(${42 + mood.tempWarmth * 18}, 92%, 76%)`;
    ctx.beginPath();
    ctx.arc(width * 0.18, height * 0.18, celestialR * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const cloudAlpha = (0.05 + mood.cloud * 0.075) * (1 - n * 0.72);
  const cloudColor = n > 0.5 ? "rgba(150, 168, 218, 0.45)" : "#ffffff";
  for (let i = 0; i < 8; i += 1) {
    const y = height * (0.16 + i * 0.075) + Math.sin(time * 0.0003 + i) * 12;
    ctx.globalAlpha = cloudAlpha;
    ctx.fillStyle = cloudColor;
    ctx.beginPath();
    ctx.ellipse(width * (0.2 + (i % 4) * 0.22), y, width * 0.17, 28 + mood.cloud * 36, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawNightSky(mood) {
  if (mood.nightFactor < 0.12) return;
  const n = mood.nightFactor;

  ctx.globalAlpha = n * 0.5;
  const ng = ctx.createLinearGradient(0, 0, 0, height * 0.65);
  ng.addColorStop(0, "hsl(222, 46%, 8%)");
  ng.addColorStop(1, "rgba(18, 30, 52, 0)");
  ctx.fillStyle = ng;
  ctx.fillRect(0, 0, width, height * 0.65);
  ctx.globalAlpha = 1;

  if (n < 0.28) return;
  const sv = (n - 0.28) / 0.72;
  for (let i = 0; i < 160; i++) {
    const sx = (((i * 7919 + 31337) % 99991) / 99991) * width;
    const sy = (((i * 6271 + 12289) % 99991) / 99991) * height * 0.52;
    const sr = 0.32 + (i % 6) * 0.22;
    const twinkle = 0.35 + 0.65 * Math.sin(time * 0.0016 + i * 2.31);
    ctx.globalAlpha = sv * 0.7 * twinkle;
    ctx.fillStyle =
      i % 11 === 0 ? "hsl(44, 100%, 90%)" : i % 7 === 0 ? "hsl(196, 82%, 88%)" : "#ffffff";
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function applyNightDim(context, w, h, nightFactor) {
  if (nightFactor < 0.08) return;
  const n = nightFactor;
  context.globalAlpha = n * 0.58;
  const ng = context.createLinearGradient(0, 0, 0, h);
  ng.addColorStop(0, "hsl(222, 44%, 8%)");
  ng.addColorStop(1, "hsl(215, 32%, 13%)");
  context.fillStyle = ng;
  context.fillRect(0, 0, w, h);
  if (n > 0.28) {
    const sv = (n - 0.28) / 0.72;
    for (let i = 0; i < 32; i++) {
      const sx = (((i * 7919 + 31337) % 99991) / 99991) * w;
      const sy = (((i * 6271 + 12289) % 99991) / 99991) * h * 0.42;
      const r = 0.28 + (i % 4) * 0.2;
      const twinkle = 0.35 + 0.65 * Math.sin(time * 0.0016 + i * 2.31);
      context.globalAlpha = sv * 0.65 * twinkle;
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(sx, sy, r, 0, TAU);
      context.fill();
    }
  }
  context.globalAlpha = 1;
}

function drawRainOrSnow(mood) {
  if (mood.wetness <= 0.03 && !mood.isSnow) return;

  const drops = Math.floor((mood.isSnow ? 80 : 120) * (mood.isSnow ? 1 : mood.wetness));
  ctx.lineCap = "round";
  for (let i = 0; i < drops; i += 1) {
    const x = (i * 97 + time * (mood.isSnow ? 0.018 : 0.09) * weather.wind) % (width + 100) - 50;
    const y = (i * 53 + time * (mood.isSnow ? 0.035 : 0.22)) % (height + 80) - 40;
    if (mood.isSnow) {
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(x + Math.sin(time * 0.002 + i) * 14, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = 0.18 + mood.wetness * 0.18;
      ctx.strokeStyle = "#5f8797";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 10 - weather.wind * 0.8, y + 24);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawGarden(mood) {
  const ground = height * 0.9;
  stems.forEach((stem) => {
    const sway = Math.sin(time * 0.0014 + stem.phase) * (8 + mood.windPower * 4);
    const tipX = stem.x + stem.lean + sway;
    const tipY = ground - stem.h;

    ctx.strokeStyle = `hsla(${128 - mood.cloud * 22}, 34%, 34%, 0.5)`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(stem.x, ground + 18);
    ctx.quadraticCurveTo(stem.x + sway * 0.25, ground - stem.h * 0.5, tipX, tipY);
    ctx.stroke();

    const bloomSize = 8 + stem.bloom * 18 + mood.tempWarmth * 8;
    ctx.fillStyle = `hsla(${hueWrap(342 + mood.tempWarmth * 36)}, 78%, ${70 - mood.cloud * 8}%, 0.68)`;
    for (let i = 0; i < 5; i += 1) {
      const angle = (Math.PI * 2 * i) / 5 + time * 0.00035;
      ctx.beginPath();
      ctx.ellipse(
        tipX + Math.cos(angle) * bloomSize * 0.34,
        tipY + Math.sin(angle) * bloomSize * 0.24,
        bloomSize * 0.34,
        bloomSize * 0.18,
        angle,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  });
}

function drawPetals(mood) {
  const windPush = weather.wind * 0.08 + mood.windPower * 0.28;
  const pointerPull = pointer.active ? 1 : 0;

  petals.forEach((petal) => {
    const dx = petal.x - pointer.x;
    const dy = petal.y - pointer.y;
    const distance = Math.hypot(dx, dy) || 1;
    const influence = Math.max(0, 1 - distance / 190) * pointer.force * pointerPull;

    petal.x += petal.drift + windPush + Math.cos(petal.phase + time * 0.001) * 0.32 + (dx / distance) * influence * 3.2;
    petal.y += petal.speed * (0.64 + mood.tempWarmth * 0.7) + mood.wetness * 0.55 + (dy / distance) * influence * 2.5;
    petal.phase += 0.012 + mood.windPower * 0.006;

    if (petal.y > height + 32 || petal.x > width + 60) {
      petal.x = random(-80, width * 0.9);
      petal.y = random(-120, -20);
    }

    const hue = hueWrap(petal.hue + mood.tempWarmth * 18 - mood.wetness * 20);
    ctx.save();
    ctx.translate(petal.x, petal.y);
    ctx.rotate(Math.sin(petal.phase) * 1.8);
    ctx.globalAlpha = petal.alpha * (0.74 + mood.light * 0.26);
    ctx.fillStyle = `hsl(${hue}, 82%, ${78 - mood.cloud * 9}%)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, petal.r * 1.45, petal.r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

function drawBreath(mood) {
  const pulse = 0.5 + Math.sin(time * 0.0012) * 0.5;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.22 + mood.light * 0.18;
  ctx.fillStyle = `hsl(${58 + mood.tempWarmth * 24}, 86%, ${72 + pulse * 10}%)`;
  ctx.beginPath();
  ctx.ellipse(width * 0.5, height * 0.62, width * 0.36 + pulse * 24, height * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

function clockGeometry() {
  const compact = width < 760;
  const radius = Math.min(width, height) * (compact ? 0.285 : 0.215);
  return {
    x: compact ? width * 0.5 : width * 0.69,
    y: compact ? height * 0.56 : height * 0.5,
    r: Math.max(118, Math.min(radius, compact ? 210 : 260)),
  };
}

function drawHand(cx, cy, angle, length, tail, lineWidth, color, glow, cap = "round") {
  const startX = cx - Math.cos(angle) * tail;
  const startY = cy - Math.sin(angle) * tail;
  const endX = cx + Math.cos(angle) * length;
  const endY = cy + Math.sin(angle) * length;

  ctx.save();
  ctx.lineCap = cap;
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.shadowColor = glow;
  ctx.shadowBlur = lineWidth * 3.4;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.restore();
}

function drawClockPetal(cx, cy, radius, angle, size, hue, alpha) {
  const x = cx + Math.cos(angle) * radius;
  const y = cy + Math.sin(angle) * radius;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `hsl(${hueWrap(hue)}, 84%, 72%)`;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 1.7, size * 0.58, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawClockArt(mood) {
  const { x: cx, y: cy, r } = clockGeometry();
  const now = new Date();
  const milliseconds = now.getMilliseconds();
  const seconds = now.getSeconds() + milliseconds / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  const secondAngle = (seconds / 60) * TAU - Math.PI / 2;
  const minuteAngle = (minutes / 60) * TAU - Math.PI / 2;
  const hourAngle = (hours / 12) * TAU - Math.PI / 2;
  const pulse = 0.5 + Math.sin(time * 0.002 + seconds * 0.2) * 0.5;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const aura = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r * 1.55);
  aura.addColorStop(0, `hsla(${46 + mood.tempWarmth * 34}, 94%, 78%, ${0.3 + mood.light * 0.16})`);
  aura.addColorStop(0.5, `hsla(${176 - mood.cloud * 38}, 78%, 76%, ${0.16 + pulse * 0.07})`);
  aura.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.55, 0, TAU);
  ctx.fill();

  for (let i = 0; i < 4; i += 1) {
    const ringPulse = Math.sin(time * 0.0008 + i * 1.7) * 0.5 + 0.5;
    ctx.globalAlpha = 0.16 - i * 0.022 + mood.light * 0.05;
    ctx.strokeStyle = `hsl(${hueWrap(34 + i * 42 + mood.tempWarmth * 22)}, 92%, ${68 + ringPulse * 14}%)`;
    ctx.lineWidth = 1.2 + i * 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.78 + i * 0.16 + ringPulse * 0.018), 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "rgba(36, 48, 41, 0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.02, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = "#fffaf0";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.96, 0, TAU);
  ctx.fill();
  ctx.restore();

  clockMarks.forEach((mark) => {
    const angle = (mark.index / 60) * TAU - Math.PI / 2 + mark.wobble + Math.sin(time * 0.001 + mark.phase) * 0.004;
    const inner = r - mark.length;
    const outer = r + (mark.index % 5 === 0 ? 9 : 4) + Math.sin(time * 0.0014 + mark.phase) * 2;
    ctx.save();
    ctx.globalAlpha = mark.index % 5 === 0 ? 0.68 : 0.38;
    ctx.strokeStyle = `hsl(${hueWrap(mark.hue + mood.tempWarmth * 18 - mood.cloud * 24)}, 58%, ${38 + mood.light * 20}%)`;
    ctx.lineWidth = mark.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
    ctx.restore();
  });

  for (let i = 0; i < 18; i += 1) {
    const trail = secondAngle - i * 0.028 * (0.75 + mood.windPower * 0.18);
    drawClockPetal(
      cx,
      cy,
      r * (0.62 + (i % 4) * 0.028),
      trail,
      3.4 + (18 - i) * 0.12,
      334 + i * 8 + mood.tempWarmth * 24,
      Math.max(0.04, 0.36 - i * 0.017),
    );
  }

  for (let i = 0; i < 12; i += 1) {
    const orbit = (i / 12) * TAU + time * 0.00014 * (1 + mood.windPower) + Math.sin(time * 0.0007 + i) * 0.08;
    drawClockPetal(cx, cy, r * (1.1 + (i % 3) * 0.045), orbit, 4.5 + (i % 4), 22 + i * 18, 0.28);
  }

  drawHand(cx, cy, hourAngle, r * 0.46, r * 0.08, Math.max(8, r * 0.055), "rgba(35, 76, 60, 0.76)", "rgba(255, 232, 138, 0.58)");
  drawHand(cx, cy, minuteAngle, r * 0.66, r * 0.12, Math.max(4, r * 0.024), "rgba(25, 58, 50, 0.58)", "rgba(148, 217, 202, 0.42)");
  drawHand(cx, cy, secondAngle, r * 0.82, r * 0.2, Math.max(1.5, r * 0.009), "rgba(232, 74, 92, 0.82)", "rgba(255, 110, 132, 0.8)", "butt");

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = `hsl(${48 + pulse * 24}, 92%, 72%)`;
  ctx.shadowColor = "rgba(255, 232, 138, 0.8)";
  ctx.shadowBlur = 26;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(8, r * 0.042), 0, TAU);
  ctx.fill();
  ctx.restore();
}

function animate(now) {
  time = now;
  pointer.force *= 0.94;
  const mood = weatherMood();
  document.documentElement.classList.toggle("is-night", mood.nightFactor > 0.38);
  if (ctx) {
    drawBackground(mood);
    drawBreath(mood);
    drawNightSky(mood);
    drawClockArt(mood);
    drawGarden(mood);
    drawPetals(mood);
    drawRainOrSnow(mood);
  }
  drawMiniWork(mood, now);
  drawDustWalk(mood, now);
  drawTemperatureGarden(mood, now);
  drawRainFlowerCity(mood, now);
  drawRefArt(mood, now);
  drawPropWeather(mood, now);
  drawPropAir(mood, now);
  drawPropWater(mood, now);
  drawPropMobility(mood, now);
  drawPropEnergy(mood, now);
  drawPropFestival(mood, now);
  requestAnimationFrame(animate);
}

function preparePreview(canvasElement, context) {
  if (!canvasElement || !context) return null;

  const rect = canvasElement.getBoundingClientRect();
  const previewDpr = Math.min(window.devicePixelRatio || 1, 2);
  const previewWidth = Math.max(1, Math.floor(rect.width));
  const previewHeight = Math.max(1, Math.floor(rect.height));

  if (
    canvasElement.width !== Math.floor(previewWidth * previewDpr) ||
    canvasElement.height !== Math.floor(previewHeight * previewDpr)
  ) {
    canvasElement.width = Math.floor(previewWidth * previewDpr);
    canvasElement.height = Math.floor(previewHeight * previewDpr);
  }

  context.setTransform(previewDpr, 0, 0, previewDpr, 0, 0);
  return { previewWidth, previewHeight };
}

/* ── 메인 work-card용: 하단 HUD 스트립 ─────────────────────────── */
function drawArtDataStrip(context, w, h, title, dataRows, accentHue, now) {
  // dataRows: 날짜/시간 제외한 핵심 3개만 (label + value)
  const keyRows = dataRows.filter(r => r.label !== "날짜" && r.label !== "시간");

  const stripH = Math.min(h * 0.28, 76);
  const y0 = h - stripH;

  context.save();

  // 그라디언트 배경 (위가 투명 → 아래가 불투명)
  const bg = context.createLinearGradient(0, y0, 0, h);
  bg.addColorStop(0, "rgba(10, 18, 14, 0)");
  bg.addColorStop(0.35, "rgba(10, 18, 14, 0.80)");
  bg.addColorStop(1, "rgba(10, 18, 14, 0.93)");
  context.fillStyle = bg;
  context.fillRect(0, y0, w, stripH);

  // 왼쪽 액센트 세로 바
  context.fillStyle = `hsl(${accentHue}, 72%, 58%)`;
  context.fillRect(0, y0 + stripH * 0.18, 3, stripH * 0.64);

  // 제목
  const fs = Math.max(9, Math.min(11, w * 0.036));
  context.fillStyle = `hsla(${accentHue}, 60%, 76%, 0.88)`;
  context.font = `700 ${fs}px system-ui, -apple-system, sans-serif`;
  context.fillText(title, 10, y0 + 16);

  // 데이터 열 (균등 분할)
  const colW = (w - 16) / Math.max(1, keyRows.length);
  keyRows.forEach((row, i) => {
    const rx = 8 + i * colW;
    const labelFs = Math.max(8, Math.min(9, w * 0.028));
    const valueFs = Math.max(10, Math.min(13, w * 0.044));

    context.fillStyle = "rgba(255,255,255,0.44)";
    context.font = `600 ${labelFs}px system-ui, -apple-system, sans-serif`;
    context.fillText(row.label, rx, y0 + 36);

    context.fillStyle = "rgba(255,255,255,0.92)";
    context.font = `800 ${valueFs}px system-ui, -apple-system, sans-serif`;
    // 긴 값은 말줄임
    const maxW = colW - 6;
    const val = row.value;
    if (context.measureText(val).width <= maxW) {
      context.fillText(val, rx, y0 + 52);
    } else {
      let t = val;
      while (t.length > 3 && context.measureText(t + "…").width > maxW) t = t.slice(0, -1);
      context.fillText(t + "…", rx, y0 + 52);
    }
  });

  // LIVE 펄스 점
  if (now !== undefined) {
    const blink = 0.45 + 0.55 * Math.sin(now * 0.0032);
    context.globalAlpha = blink;
    context.fillStyle = `hsl(${accentHue}, 88%, 64%)`;
    context.beginPath();
    context.arc(w - 9, y0 + 9, 3.5, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

/* ── 레퍼런스 케이스 뷰용: 중앙 오버레이 패널 ───────────────────── */
function drawArtDataPanel(context, previewWidth, previewHeight, title, rows, accentHue, now) {
  const panelWidth = Math.min(previewWidth * 0.78, 330);
  const rowHeight = 22;
  const panelHeight = 42 + rows.length * rowHeight;
  const x = (previewWidth - panelWidth) / 2;
  const y = previewHeight * 0.48 - panelHeight / 2;

  context.save();
  context.globalAlpha = 0.86;
  context.fillStyle = "rgba(255, 252, 239, 0.86)";
  context.strokeStyle = "rgba(36, 48, 41, 0.16)";
  context.lineWidth = 1;
  roundRect(context, x, y, panelWidth, panelHeight, 8);
  context.fill();
  context.stroke();

  context.globalAlpha = 0.94;
  context.fillStyle = `hsla(${accentHue}, 72%, 44%, 0.14)`;
  roundRect(context, x + 8, y + 8, panelWidth - 16, 24, 5);
  context.fill();

  context.fillStyle = "rgba(36, 48, 41, 0.78)";
  context.font = "800 12px system-ui, -apple-system, sans-serif";
  context.fillText(title, x + 18, y + 25);

  rows.forEach((row, index) => {
    const rowY = y + 43 + index * rowHeight;
    context.strokeStyle = "rgba(36, 48, 41, 0.1)";
    context.beginPath();
    context.moveTo(x + 14, rowY - 9);
    context.lineTo(x + panelWidth - 14, rowY - 9);
    context.stroke();

    context.fillStyle = "rgba(36, 48, 41, 0.5)";
    context.font = "800 10px system-ui, -apple-system, sans-serif";
    context.fillText(row.label, x + 18, rowY + 6);
    context.fillStyle = "rgba(36, 48, 41, 0.82)";
    context.font = "700 11px system-ui, -apple-system, sans-serif";
    fitText(context, row.value, x + 76, rowY + 6, panelWidth - 94);
  });
  context.restore();
}

function currentDateRows() {
  const now = new Date();
  return [
    {
      label: "날짜",
      value: now.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "long",
      }),
    },
    {
      label: "시간",
      value: now.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ];
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fitText(context, text, x, y, maxWidth) {
  if (context.measureText(text).width <= maxWidth) {
    context.fillText(text, x, y);
    return;
  }

  let trimmed = text;
  while (trimmed.length > 4 && context.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  context.fillText(`${trimmed}...`, x, y);
}

function drawPropDataLabel(c, w, h, rows, accentHsl) {
  const lineH = 19;
  const pad = 10;
  const overlayW = Math.min(w - 20, 190);
  const overlayH = 10 + rows.length * lineH + 8;
  const ox = w - overlayW - pad;
  const oy = h - overlayH - pad;
  c.save();
  c.globalAlpha = 0.82;
  c.fillStyle = "rgba(255,252,239,0.84)";
  roundRect(c, ox, oy, overlayW, overlayH, 7);
  c.fill();
  c.globalAlpha = 0.18;
  c.fillStyle = accentHsl;
  roundRect(c, ox, oy, overlayW, 3, 3);
  c.fill();
  c.globalAlpha = 1;
  rows.forEach((row, i) => {
    const ry = oy + 16 + i * lineH;
    c.fillStyle = "rgba(36,48,41,0.48)";
    c.font = "700 9px system-ui,-apple-system,sans-serif";
    c.fillText(row.label, ox + 9, ry);
    c.fillStyle = "rgba(36,48,41,0.88)";
    c.font = "800 10px system-ui,-apple-system,sans-serif";
    const valX = ox + 9 + c.measureText(row.label).width + 8;
    c.fillText(row.value, valX, ry);
  });
  c.restore();
}

function drawMiniWork(mood, now) {
  const preview = preparePreview(miniCanvas, miniCtx);
  if (!preview) return;

  const { previewWidth: miniWidth, previewHeight: miniHeight } = preview;
  const gradient = miniCtx.createLinearGradient(0, 0, miniWidth, miniHeight);
  gradient.addColorStop(0, `hsl(${184 - mood.cloud * 20}, 48%, 78%)`);
  gradient.addColorStop(0.55, `hsl(${52 + mood.tempWarmth * 16}, 82%, 84%)`);
  gradient.addColorStop(1, `hsl(${124 - mood.wetness * 24}, 42%, 70%)`);
  miniCtx.fillStyle = gradient;
  miniCtx.fillRect(0, 0, miniWidth, miniHeight);

  miniCtx.globalAlpha = 0.48;
  miniCtx.fillStyle = "#fff59a";
  miniCtx.beginPath();
  miniCtx.arc(miniWidth * 0.25, miniHeight * 0.24, Math.min(miniWidth, miniHeight) * 0.26, 0, Math.PI * 2);
  miniCtx.fill();

  for (let i = 0; i < 30; i += 1) {
    const x = (i * 47 + now * 0.1 * (0.8 + mood.windPower)) % (miniWidth + 40) - 20;
    const y = (i * 31 + Math.sin(now * 0.0025 + i) * 16) % (miniHeight + 20);
    const r = 3 + (i % 4);
    miniCtx.save();
    miniCtx.translate(x, y);
    miniCtx.rotate(Math.sin(now * 0.005 + i) * 1.6);
    miniCtx.globalAlpha = 0.58;
    miniCtx.fillStyle = `hsl(${hueWrap(338 + i * 17 + mood.tempWarmth * 20)}, 78%, 72%)`;
    miniCtx.beginPath();
    miniCtx.ellipse(0, 0, r * 1.8, r * 0.75, 0, 0, Math.PI * 2);
    miniCtx.fill();
    miniCtx.restore();
  }

  miniCtx.globalAlpha = 0.68;
  miniCtx.strokeStyle = "rgba(69, 119, 87, 0.62)";
  miniCtx.lineWidth = 1.2;
  for (let i = 0; i < 13; i += 1) {
    const x = (i / 12) * miniWidth;
    const sway = Math.sin(now * 0.004 + i) * 14;
    const top = miniHeight * (0.52 + (i % 4) * 0.06);
    miniCtx.beginPath();
    miniCtx.moveTo(x, miniHeight + 4);
    miniCtx.quadraticCurveTo(x + sway * 0.4, miniHeight * 0.74, x + sway, top);
    miniCtx.stroke();
    miniCtx.fillStyle = "rgba(244, 126, 116, 0.76)";
    miniCtx.beginPath();
    miniCtx.arc(x + sway, top, 5 + (i % 3), 0, Math.PI * 2);
    miniCtx.fill();
  }
  miniCtx.globalAlpha = 1;
  applyNightDim(miniCtx, miniWidth, miniHeight, mood.nightFactor);
  drawArtDataStrip(
    miniCtx, miniWidth, miniHeight, "오늘 날씨",
    [
      { label: "하늘", value: skyNames.get(weather.code) || weather.label },
      { label: "기온", value: `${Math.round(weather.temp)}°C` },
      { label: "바람", value: `${Math.round(weather.wind)} m/s` },
    ],
    132, now,
  );
}

function drawDustWalk(mood, now) {
  const preview = preparePreview(dustWalkCanvas, dustWalkCtx);
  if (!preview) return;

  const { previewWidth, previewHeight } = preview;
  const pm10 = airQuality.pm10 ?? 42;
  const pm25 = airQuality.pm25 ?? 18;
  const cleanScore = Math.max(0, Math.min(1, 1 - Math.max(pm10 / 100, pm25 / 45)));
  const signalHue = cleanScore > 0.68 ? 142 : cleanScore > 0.42 ? 52 : 8;

  const gradient = dustWalkCtx.createLinearGradient(0, 0, previewWidth, previewHeight);
  gradient.addColorStop(0, `hsl(${174 - cleanScore * 18}, 45%, 72%)`);
  gradient.addColorStop(0.58, `hsl(${60 + cleanScore * 28}, 76%, 84%)`);
  gradient.addColorStop(1, `hsl(${132 + cleanScore * 18}, 36%, 66%)`);
  dustWalkCtx.fillStyle = gradient;
  dustWalkCtx.fillRect(0, 0, previewWidth, previewHeight);

  dustWalkCtx.globalAlpha = 0.2 + cleanScore * 0.2;
  dustWalkCtx.fillStyle = "#ffffff";
  dustWalkCtx.beginPath();
  dustWalkCtx.ellipse(previewWidth * 0.64, previewHeight * 0.46, previewWidth * 0.28, previewHeight * 0.2, 0, 0, Math.PI * 2);
  dustWalkCtx.fill();

  dustWalkCtx.lineWidth = Math.max(10, previewWidth * 0.045);
  dustWalkCtx.lineCap = "round";
  for (let i = 0; i < 5; i += 1) {
    const offset = (i - 2) * previewWidth * 0.08;
    dustWalkCtx.globalAlpha = 0.18 + cleanScore * 0.32;
    dustWalkCtx.strokeStyle = `hsl(${signalHue}, 82%, ${62 + cleanScore * 14}%)`;
    dustWalkCtx.beginPath();
    dustWalkCtx.moveTo(previewWidth * 0.08 + offset, previewHeight * 0.9);
    dustWalkCtx.bezierCurveTo(
      previewWidth * 0.28 + offset,
      previewHeight * 0.64 + Math.sin(now * 0.003 + i) * 16,
      previewWidth * 0.42 + offset,
      previewHeight * 0.36,
      previewWidth * 0.78 + offset,
      previewHeight * 0.08,
    );
    dustWalkCtx.stroke();
  }

  for (let i = 0; i < 18; i += 1) {
    const x = (i * 59 + now * (0.07 + cleanScore * 0.1)) % (previewWidth + 40) - 20;
    const y = previewHeight * (0.28 + ((i * 13) % 42) / 100) + Math.sin(now * 0.003 + i) * 12;
    dustWalkCtx.globalAlpha = 0.18 + (1 - cleanScore) * 0.34;
    dustWalkCtx.fillStyle = `hsl(${34 - cleanScore * 24}, 44%, ${66 - (1 - cleanScore) * 18}%)`;
    dustWalkCtx.beginPath();
    dustWalkCtx.arc(x, y, 2 + (1 - cleanScore) * 5, 0, Math.PI * 2);
    dustWalkCtx.fill();
  }

  dustWalkCtx.globalAlpha = 0.9;
  dustWalkCtx.fillStyle = `hsl(${signalHue}, 80%, 44%)`;
  dustWalkCtx.beginPath();
  dustWalkCtx.arc(previewWidth * 0.13, previewHeight * 0.18, 16 + cleanScore * 8, 0, Math.PI * 2);
  dustWalkCtx.fill();
  dustWalkCtx.globalAlpha = 1;
  applyNightDim(dustWalkCtx, previewWidth, previewHeight, mood.nightFactor);
  const fineLevel =
    pm10 <= 30 && pm25 <= 15 ? "좋음" : pm10 <= 80 && pm25 <= 35 ? "보통" : "주의";
  const activity = fineLevel === "좋음" ? "야외활동 가능" : fineLevel === "보통" ? "짧은 활동" : "실내 권장";
  drawArtDataStrip(
    dustWalkCtx, previewWidth, previewHeight, "미세먼지 공기질",
    [
      { label: "PM10", value: airQuality.pm10 !== null ? `${pm10.toFixed(1)} µg` : "연결 중…" },
      { label: "PM2.5", value: airQuality.pm25 !== null ? `${pm25.toFixed(1)} µg` : "연결 중…" },
      { label: "판단", value: `${fineLevel} · ${activity}` },
    ],
    signalHue, now,
  );
}

function drawTemperatureGarden(mood, now) {
  const preview = preparePreview(temperatureGardenCanvas, temperatureGardenCtx);
  if (!preview) return;

  const { previewWidth, previewHeight } = preview;
  const warmth = Math.max(0, Math.min(1, (weather.temp + 4) / 36));
  const pulse = 0.5 + Math.sin(now * (0.0025 + warmth * 0.002)) * 0.5;
  const gradient = temperatureGardenCtx.createLinearGradient(0, 0, previewWidth, previewHeight);
  gradient.addColorStop(0, `hsl(${178 - warmth * 42}, 42%, 84%)`);
  gradient.addColorStop(0.55, `hsl(${58 + warmth * 20}, 74%, ${88 - warmth * 10}%)`);
  gradient.addColorStop(1, `hsl(${126 - warmth * 12}, 34%, ${70 - warmth * 8}%)`);
  temperatureGardenCtx.fillStyle = gradient;
  temperatureGardenCtx.fillRect(0, 0, previewWidth, previewHeight);

  temperatureGardenCtx.globalAlpha = 0.28 + pulse * 0.22;
  temperatureGardenCtx.fillStyle = `hsl(${44 + warmth * 24}, 88%, 76%)`;
  temperatureGardenCtx.beginPath();
  temperatureGardenCtx.arc(previewWidth * 0.5, previewHeight * 0.4, previewWidth * (0.22 + pulse * 0.05), 0, Math.PI * 2);
  temperatureGardenCtx.fill();

  for (let i = 0; i < 16; i += 1) {
    const x = (i / 15) * previewWidth;
    const stemTop = previewHeight * (0.42 + ((i * 7) % 36) / 100);
    const sway = Math.sin(now * 0.004 + i) * (10 + warmth * 14);
    const bloom = 5 + warmth * 13 + Math.sin(now * 0.005 + i) * 4;
    temperatureGardenCtx.globalAlpha = 0.62;
    temperatureGardenCtx.strokeStyle = `hsl(${130 - warmth * 20}, 32%, 42%)`;
    temperatureGardenCtx.lineWidth = 1.2;
    temperatureGardenCtx.beginPath();
    temperatureGardenCtx.moveTo(x, previewHeight + 6);
    temperatureGardenCtx.quadraticCurveTo(x + sway * 0.2, previewHeight * 0.72, x + sway, stemTop);
    temperatureGardenCtx.stroke();

    temperatureGardenCtx.globalAlpha = 0.72;
    temperatureGardenCtx.fillStyle = `hsl(${hueWrap(338 + warmth * 46 + i * 3)}, 78%, ${76 - warmth * 8}%)`;
    temperatureGardenCtx.beginPath();
    temperatureGardenCtx.arc(x + sway, stemTop, bloom, 0, Math.PI * 2);
    temperatureGardenCtx.fill();
  }
  temperatureGardenCtx.globalAlpha = 1;
  applyNightDim(temperatureGardenCtx, previewWidth, previewHeight, mood.nightFactor);
  const tempMode = weather.temp >= 28 ? "더움" : weather.temp >= 18 ? "쾌적" : "서늘";
  drawArtDataStrip(
    temperatureGardenCtx, previewWidth, previewHeight, "오늘 온도",
    [
      { label: "현재", value: `${Math.round(weather.temp)}°C` },
      { label: "감각", value: tempMode },
      { label: "꽃 크기", value: `${(warmth * 100).toFixed(0)}%` },
    ],
    24 + warmth * 36, now,
  );
}

function drawRainFlowerCity(mood, now) {
  const preview = preparePreview(rainFlowerCanvas, rainFlowerCtx);
  if (!preview) return;

  const { previewWidth, previewHeight } = preview;
  const rainy = weather.rain > 0.1 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(weather.code);
  const rainPower = rainy ? Math.max(0.38, Math.min(1, weather.rain / 4 + mood.cloud * 0.45)) : Math.max(0.06, mood.cloud * 0.16);
  const gradient = rainFlowerCtx.createLinearGradient(0, 0, previewWidth, previewHeight);
  gradient.addColorStop(0, `hsl(${194 - rainPower * 28}, ${40 - rainPower * 10}%, ${82 - rainPower * 18}%)`);
  gradient.addColorStop(0.6, `hsl(${52 - rainPower * 14}, 74%, ${86 - rainPower * 18}%)`);
  gradient.addColorStop(1, `hsl(${112 - rainPower * 12}, 35%, ${70 - rainPower * 12}%)`);
  rainFlowerCtx.fillStyle = gradient;
  rainFlowerCtx.fillRect(0, 0, previewWidth, previewHeight);

  rainFlowerCtx.globalAlpha = 0.36;
  rainFlowerCtx.fillStyle = "#fff7b4";
  rainFlowerCtx.beginPath();
  rainFlowerCtx.arc(previewWidth * 0.52, previewHeight * 0.28, previewWidth * 0.18, 0, Math.PI * 2);
  rainFlowerCtx.fill();

  rainFlowerCtx.lineCap = "round";
  for (let i = 0; i < 7; i += 1) {
    const x = previewWidth * (0.18 + i * 0.11);
    rainFlowerCtx.globalAlpha = 0.22 + rainPower * 0.24;
    rainFlowerCtx.strokeStyle = `rgba(53, 70, 61, ${0.32 + rainPower * 0.26})`;
    rainFlowerCtx.lineWidth = 3;
    rainFlowerCtx.beginPath();
    rainFlowerCtx.moveTo(x, previewHeight * 0.3);
    rainFlowerCtx.lineTo(x, previewHeight);
    rainFlowerCtx.stroke();
  }

  const flowerCount = Math.floor(18 + rainPower * 42);
  for (let i = 0; i < flowerCount; i += 1) {
    const x = (i * 43 + now * (rainy ? 0.14 : 0.06)) % (previewWidth + 30) - 15;
    const y = (i * 67 + now * (rainy ? 0.22 : 0.1)) % (previewHeight + 30) - 15;
    const r = 2.5 + rainPower * 3 + (i % 3);
    rainFlowerCtx.save();
    rainFlowerCtx.translate(x, y);
    rainFlowerCtx.rotate(Math.sin(now * 0.005 + i));
    rainFlowerCtx.globalAlpha = 0.44 + rainPower * 0.32;
    rainFlowerCtx.fillStyle = rainy ? "hsl(202, 78%, 72%)" : `hsl(${hueWrap(336 + i * 12)}, 78%, 73%)`;
    for (let p = 0; p < 5; p += 1) {
      const angle = (Math.PI * 2 * p) / 5;
      rainFlowerCtx.beginPath();
      rainFlowerCtx.ellipse(Math.cos(angle) * r, Math.sin(angle) * r, r, r * 0.45, angle, 0, Math.PI * 2);
      rainFlowerCtx.fill();
    }
    rainFlowerCtx.restore();
  }
  rainFlowerCtx.globalAlpha = 1;
  applyNightDim(rainFlowerCtx, previewWidth, previewHeight, mood.nightFactor);
  drawArtDataStrip(
    rainFlowerCtx, previewWidth, previewHeight, "비 예보",
    [
      { label: "강수", value: `${weather.rain.toFixed(1)} mm` },
      { label: "하늘", value: skyNames.get(weather.code) || weather.label },
      { label: "판단", value: rainy ? "꽃비 짙음" : "꽃비 옅음" },
    ],
    rainy ? 204 : 52, now,
  );
}

function drawPropWeather(mood, now) {
  const preview = preparePreview(propWeatherCanvas, propWeatherCtx);
  if (!preview) return;
  const { previewWidth: w, previewHeight: h } = preview;
  const c = propWeatherCtx;
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(${190 - mood.cloud * 30}, 52%, ${82 - mood.cloud * 14}%)`);
  bg.addColorStop(0.55, `hsl(${48 + mood.tempWarmth * 16}, 74%, ${88 - mood.wetness * 9}%)`);
  bg.addColorStop(1, `hsl(${126 - mood.wetness * 28}, 44%, ${76 - mood.cloud * 8}%)`);
  c.fillStyle = bg; c.fillRect(0, 0, w, h);

  c.globalAlpha = (0.3 + mood.light * 0.22) * (1 - mood.nightFactor * 0.7);
  c.fillStyle = `hsl(${42 + mood.tempWarmth * 18}, 92%, 76%)`;
  c.beginPath(); c.arc(w * 0.2, h * 0.22, w * 0.14, 0, TAU); c.fill();
  c.globalAlpha = 1;

  const petalCount = 24;
  for (let i = 0; i < petalCount; i++) {
    const px = ((i * 43 + now * (0.015 + mood.windPower * 0.006)) % (w + 40)) - 20;
    const py = ((i * 67 + now * (0.02 + mood.wetness * 0.02)) % (h + 40)) - 20;
    const pr = 2.5 + mood.tempWarmth * 3 + (i % 3);
    c.save(); c.translate(px, py); c.rotate(Math.sin(now * 0.002 + i));
    c.globalAlpha = 0.52 + mood.light * 0.28;
    c.fillStyle = `hsl(${hueWrap(336 + i * 14 + mood.tempWarmth * 22)}, 82%, 74%)`;
    c.beginPath(); c.ellipse(0, 0, pr * 1.4, pr * 0.6, 0, 0, TAU); c.fill();
    c.restore();
  }
  c.globalAlpha = 1;
  drawPropDataLabel(c, w, h, [
    { label: "기온", value: `${Math.round(weather.temp)}°C` },
    { label: "날씨", value: skyNames.get(weather.code) || weather.label },
    { label: "바람", value: `${Math.round(weather.wind)} m/s` },
  ], `hsl(190,72%,60%)`);
  applyNightDim(c, w, h, mood.nightFactor);
}

function drawPropAir(mood, now) {
  const preview = preparePreview(propAirCanvas, propAirCtx);
  if (!preview) return;
  const { previewWidth: w, previewHeight: h } = preview;
  const c = propAirCtx;
  const pm10 = airQuality.pm10 ?? 42;
  const pm25 = airQuality.pm25 ?? 18;
  const dustLevel = Math.min(1, (pm10 / 150 + pm25 / 75) / 2);
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(${152 - dustLevel * 40}, ${64 - dustLevel * 30}%, ${88 - dustLevel * 20}%)`);
  bg.addColorStop(1, `hsl(${112 - dustLevel * 16}, ${38 - dustLevel * 18}%, ${72 - dustLevel * 16}%)`);
  c.fillStyle = bg; c.fillRect(0, 0, w, h);

  for (let i = 0; i < 48; i++) {
    const x = ((i * 97 + now * 0.02 * (1 + dustLevel)) % (w + 60)) - 30;
    const y = ((i * 53 + now * 0.012) % (h + 40)) - 20;
    const r = 1 + dustLevel * 4 + (i % 4) * 0.6;
    c.globalAlpha = 0.1 + dustLevel * 0.24;
    c.fillStyle = `hsl(${hueWrap(38 + i * 6)}, 68%, 62%)`;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }

  const fineLevel = pm10 <= 30 && pm25 <= 15 ? 0 : pm10 <= 80 && pm25 <= 35 ? 0.5 : 1;
  const signalColors = ["hsl(152, 72%, 54%)", "hsl(52, 92%, 58%)", "hsl(0, 82%, 64%)"];
  const signalColor = signalColors[Math.round(fineLevel * 2)];
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.002);
  c.globalAlpha = 0.28 + pulse * 0.18;
  c.fillStyle = signalColor;
  c.beginPath(); c.arc(w * 0.5, h * 0.5, w * (0.14 + pulse * 0.04), 0, TAU); c.fill();
  c.globalAlpha = 0.7;
  c.fillStyle = signalColor;
  c.beginPath(); c.arc(w * 0.5, h * 0.5, w * 0.07, 0, TAU); c.fill();
  c.globalAlpha = 1;
  const pm10Label = airQuality.pm10 != null ? `${Math.round(airQuality.pm10)} μg/m³` : "대기 중";
  const pm25Label = airQuality.pm25 != null ? `${Math.round(airQuality.pm25)} μg/m³` : "대기 중";
  const fineLabel = ["좋음","보통","나쁨"][Math.round(fineLevel * 2)];
  drawPropDataLabel(c, w, h, [
    { label: "PM10", value: pm10Label },
    { label: "PM2.5", value: pm25Label },
    { label: "상태", value: fineLabel },
  ], signalColor);
  applyNightDim(c, w, h, mood.nightFactor);
}

function drawPropWater(mood, now) {
  const preview = preparePreview(propWaterCanvas, propWaterCtx);
  if (!preview) return;
  const { previewWidth: w, previewHeight: h } = preview;
  const c = propWaterCtx;
  const waterLevel = Math.min(1, weather.rain / 3 + mood.wetness * 0.5);
  const bg = c.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, `hsl(${196 - waterLevel * 22}, ${48 - waterLevel * 10}%, ${84 - waterLevel * 14}%)`);
  bg.addColorStop(1, `hsl(${206 + waterLevel * 18}, ${62 + waterLevel * 16}%, ${52 - waterLevel * 12}%)`);
  c.fillStyle = bg; c.fillRect(0, 0, w, h);

  const waveY = h * (0.45 + waterLevel * 0.28);
  for (let wave = 0; wave < 3; wave++) {
    const speed = 0.0008 + wave * 0.0003;
    const amp = (8 + wave * 4) * (0.4 + waterLevel * 0.6);
    c.globalAlpha = 0.18 + wave * 0.08 + waterLevel * 0.12;
    c.fillStyle = `hsl(${206 + wave * 8}, 72%, ${62 - wave * 8}%)`;
    c.beginPath(); c.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) {
      const y = waveY + Math.sin(x * 0.012 + now * speed + wave * 1.8) * amp;
      wave === 0 && x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
  }
  c.globalAlpha = 1;
  const wlLabel = waterLevel > 0.7 ? "경보" : waterLevel > 0.4 ? "주의" : "안전";
  drawPropDataLabel(c, w, h, [
    { label: "강수량", value: `${weather.rain.toFixed(1)} mm` },
    { label: "수위", value: wlLabel },
    { label: "파동", value: `${Math.round(waterLevel * 100)}%` },
  ], `hsl(206,62%,60%)`);
  applyNightDim(c, w, h, mood.nightFactor);
}

function drawPropMobility(mood, now) {
  const preview = preparePreview(propMobilityCanvas, propMobilityCtx);
  if (!preview) return;
  const { previewWidth: w, previewHeight: h } = preview;
  const c = propMobilityCtx;
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(210, 22%, ${88 - mood.cloud * 10}%)`);
  bg.addColorStop(1, `hsl(${126 - mood.cloud * 14}, 32%, ${78 - mood.cloud * 8}%)`);
  c.fillStyle = bg; c.fillRect(0, 0, w, h);

  const lineCount = 6;
  for (let i = 0; i < lineCount; i++) {
    const y = h * (0.2 + i * 0.12);
    const speed = (0.8 + i * 0.3) * (1 + mood.windPower * 0.2);
    c.strokeStyle = `hsl(${hueWrap(196 + i * 22)}, 62%, 62%)`;
    c.lineWidth = 1.5 + (i % 2);
    c.globalAlpha = 0.32 + mood.light * 0.18;
    c.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const dy = Math.sin(x * 0.018 + now * 0.001 * speed + i * 0.8) * (8 + i * 3);
      x === 0 ? c.moveTo(x, y + dy) : c.lineTo(x, y + dy);
    }
    c.stroke();
  }

  for (let i = 0; i < 14; i++) {
    const dotX = ((i * 113 + now * 0.06 * (1 + (i % 3) * 0.4)) % (w + 20)) - 10;
    const dotY = h * (0.2 + (i % lineCount) * 0.12);
    c.globalAlpha = 0.62;
    c.fillStyle = `hsl(${hueWrap(340 + i * 18)}, 78%, 68%)`;
    c.beginPath(); c.arc(dotX, dotY, 4 + (i % 3), 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
  const busMin = Math.floor(((now / 1000 / 60) % 7) + 1);
  const congLabel = mood.windPower > 0.6 ? "혼잡" : mood.windPower > 0.3 ? "보통" : "원활";
  drawPropDataLabel(c, w, h, [
    { label: "버스도착", value: `${busMin}분 후` },
    { label: "혼잡도", value: congLabel },
    { label: "이동선", value: `${lineCount}개` },
  ], `hsl(196,62%,60%)`);
  applyNightDim(c, w, h, mood.nightFactor);
}

function drawPropEnergy(mood, now) {
  const preview = preparePreview(propEnergyCanvas, propEnergyCtx);
  if (!preview) return;
  const { previewWidth: w, previewHeight: h } = preview;
  const c = propEnergyCtx;
  const solarPower = mood.light;
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(${48 + solarPower * 12}, ${82 + solarPower * 10}%, ${88 - mood.nightFactor * 20}%)`);
  bg.addColorStop(1, `hsl(152, 52%, ${80 - mood.nightFactor * 18}%)`);
  c.fillStyle = bg; c.fillRect(0, 0, w, h);

  c.globalAlpha = (0.4 + solarPower * 0.4) * (1 - mood.nightFactor * 0.7);
  c.fillStyle = `hsl(${42 + solarPower * 18}, 92%, 72%)`;
  c.beginPath(); c.arc(w * 0.78, h * 0.2, w * 0.12, 0, TAU); c.fill();
  c.globalAlpha = 1;

  const bloomCount = Math.floor(6 + solarPower * 14);
  for (let i = 0; i < bloomCount; i++) {
    const stemX = (w / (bloomCount + 1)) * (i + 1);
    const stemH = h * (0.18 + solarPower * 0.24) * (0.6 + (i % 3) * 0.2);
    const tipX = stemX + Math.sin(now * 0.001 + i) * 7;
    const tipY = h * 0.72 - stemH;
    c.strokeStyle = `hsla(128, 36%, 36%, 0.5)`;
    c.lineWidth = 1.4; c.globalAlpha = 0.7;
    c.beginPath(); c.moveTo(stemX, h * 0.75); c.quadraticCurveTo(stemX, h * 0.75 - stemH * 0.5, tipX, tipY); c.stroke();
    const bs = 5 + solarPower * 12;
    c.fillStyle = `hsl(${hueWrap(46 + solarPower * 28 + i * 9)}, 88%, ${66 + solarPower * 8}%)`;
    for (let p = 0; p < 5; p++) {
      const a = (TAU * p / 5) + now * 0.0004;
      c.globalAlpha = 0.65 + solarPower * 0.2;
      c.beginPath();
      c.ellipse(tipX + Math.cos(a) * bs * 0.35, tipY + Math.sin(a) * bs * 0.25, bs * 0.35, bs * 0.18, a, 0, TAU);
      c.fill();
    }
  }
  c.globalAlpha = 1;
  const kw = Math.round(solarPower * 48 * 10) / 10;
  const co2 = Math.round(kw * 0.46 * 10) / 10;
  drawPropDataLabel(c, w, h, [
    { label: "발전량", value: `${kw} kWh` },
    { label: "탄소절감", value: `${co2} kg` },
    { label: "개화", value: `${bloomCount}송이` },
  ], `hsl(46,88%,62%)`);
  applyNightDim(c, w, h, mood.nightFactor);
}

function drawPropFestival(mood, now) {
  const preview = preparePreview(propFestivalCanvas, propFestivalCtx);
  if (!preview) return;
  const { previewWidth: w, previewHeight: h } = preview;
  const c = propFestivalCtx;
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(340, 62%, ${88 - mood.nightFactor * 18}%)`);
  bg.addColorStop(0.5, `hsl(${48 + mood.tempWarmth * 12}, 78%, ${90 - mood.nightFactor * 16}%)`);
  bg.addColorStop(1, `hsl(${268 + mood.tempWarmth * 8}, 52%, ${86 - mood.nightFactor * 16}%)`);
  c.fillStyle = bg; c.fillRect(0, 0, w, h);

  const starCount = 32;
  for (let i = 0; i < starCount; i++) {
    const sx = (((i * 7919 + 31337) % 99991) / 99991) * w;
    const sy = (((i * 6271 + 12289) % 99991) / 99991) * h * 0.7;
    const sr = 1.2 + (i % 4) * 0.8;
    const twinkle = 0.4 + 0.6 * Math.sin(now * 0.002 + i * 2.31);
    c.globalAlpha = 0.4 + twinkle * 0.4;
    c.fillStyle = i % 5 === 0 ? `hsl(${hueWrap(338 + i * 22)}, 88%, 72%)` : i % 3 === 0 ? "hsl(44, 100%, 78%)" : `hsl(${hueWrap(268 + i * 18)}, 72%, 76%)`;
    c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
  }

  const flowerCount = Math.floor(18 + mood.tempWarmth * 22);
  for (let i = 0; i < flowerCount; i++) {
    const fx = ((i * 53 + now * 0.018) % (w + 30)) - 15;
    const fy = ((i * 79 + now * 0.026) % (h + 30)) - 15;
    const fr = 2.5 + mood.tempWarmth * 3.5 + (i % 3);
    c.save(); c.translate(fx, fy); c.rotate(Math.sin(now * 0.002 + i));
    c.globalAlpha = 0.56;
    c.fillStyle = `hsl(${hueWrap(338 + i * 19)}, 84%, 72%)`;
    for (let p = 0; p < 5; p++) {
      const a = (TAU * p / 5);
      c.beginPath(); c.ellipse(Math.cos(a) * fr, Math.sin(a) * fr, fr, fr * 0.45, a, 0, TAU); c.fill();
    }
    c.restore();
  }
  c.globalAlpha = 1;
  const qrCount = Math.floor(((now / 1000 / 30) % 40) + 12);
  const flowerLabel = `${flowerCount}송이`;
  drawPropDataLabel(c, w, h, [
    { label: "QR참여", value: `${qrCount}명` },
    { label: "꽃개화", value: flowerLabel },
    { label: "별빛", value: `${starCount}개` },
  ], `hsl(338,84%,66%)`);
  applyNightDim(c, w, h, mood.nightFactor);
}

function drawRefArt(mood, now) {
  if (!refArtCanvas || !refArtCanvas.isConnected) {
    refArtCanvas = document.querySelector("#refArtCanvas");
    refArtCtx = refArtCanvas?.getContext("2d") ?? null;
  }
  if (!refArtCanvas || !refArtCtx) return;
  const id = refArtCanvas.dataset.artwork || "";
  const preview = preparePreview(refArtCanvas, refArtCtx);
  if (!preview) return;
  const { previewWidth: pw, previewHeight: ph } = preview;

  if (id === "spring-day-clock" || id === "오늘은봄날") {
    drawRefSpringClock(refArtCtx, pw, ph, mood, now);
  } else if (id === "light-walk-air" || id === "빛의산책로") {
    drawRefDustWalkArt(refArtCtx, pw, ph, mood, now);
  } else if (id === "breathing-temperature-garden" || id === "숨쉬는정원") {
    drawRefTemperatureArt(refArtCtx, pw, ph, mood, now);
  } else if (id === "city-flower-rain" || id === "도시의꽃비" || id.includes("rain") || id.includes("flower") || id.includes("facade")) {
    drawRefRainFlowerArt(refArtCtx, pw, ph, mood, now);
  } else if (id === "air-garden-led" || id.includes("air") || id.includes("dust") || id.includes("공기")) {
    drawRefAirGardenArt(refArtCtx, pw, ph, mood, now);
  } else if (id === "bus-flow-screen" || id.includes("bus") || id.includes("traffic") || id.includes("walk") || id.includes("mobility") || id.includes("safe-walk")) {
    drawRefMobilityArt(refArtCtx, pw, ph, mood, now);
  } else if (id === "library-reading-light" || id.includes("library") || id.includes("reading") || id.includes("culture")) {
    drawRefLibraryArt(refArtCtx, pw, ph, mood, now);
  } else if (id === "noise-calm-wall" || id === "river-level-wall" || id.includes("noise") || id.includes("calm") || id.includes("river") || id.includes("water") || id.includes("heatwave") || id.includes("shade")) {
    drawRefCalmWallArt(refArtCtx, pw, ph, mood, now);
  } else if (id === "solar-energy-bloom" || id.includes("solar") || id.includes("energy") || id.includes("esg")) {
    drawRefEnergyArt(refArtCtx, pw, ph, mood, now);
  } else if (id.includes("festival") || id.includes("crowd") || id.includes("bloom") || id.includes("eternal")) {
    drawRefRainFlowerArt(refArtCtx, pw, ph, mood, now);
  } else {
    drawRefSpringClock(refArtCtx, pw, ph, mood, now);
  }
}

function drawRefAirGardenArt(c, w, h, mood, now) {
  const pm10 = airQuality.pm10 ?? 42;
  const pm25 = airQuality.pm25 ?? 18;
  const dustLevel = Math.min(1, (pm10 / 150 + pm25 / 75) / 2);
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(${152 - dustLevel * 40}, ${64 - dustLevel * 30}%, ${88 - dustLevel * 20}%)`);
  bg.addColorStop(1, `hsl(${112 - dustLevel * 16}, ${38 - dustLevel * 18}%, ${72 - dustLevel * 16}%)`);
  c.fillStyle = bg; c.fillRect(0, 0, w, h);

  const level = pm10 <= 30 && pm25 <= 15 ? 0 : pm10 <= 80 && pm25 <= 35 ? 1 : 2;
  const sigColors = [`hsl(152,72%,54%)`, `hsl(52,92%,58%)`, `hsl(0,82%,64%)`];
  const sigColor = sigColors[level];
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.002);

  for (let i = 0; i < 60; i++) {
    const x = ((i * 97 + now * 0.02 * (1 + dustLevel)) % (w + 60)) - 30;
    const y = ((i * 53 + now * 0.012) % (h + 40)) - 20;
    const r = 1.2 + dustLevel * 4 + (i % 4) * 0.6;
    c.globalAlpha = 0.12 + dustLevel * 0.26;
    c.fillStyle = `hsl(${hueWrap(38 + i * 6)}, 68%, 62%)`;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }

  const gardenCount = Math.floor(10 - dustLevel * 6);
  for (let i = 0; i < gardenCount; i++) {
    const gx = (w / (gardenCount + 1)) * (i + 1);
    const gh = h * (0.18 + (1 - dustLevel) * 0.22) * (0.5 + (i % 3) * 0.25);
    const tip = { x: gx + Math.sin(now * 0.001 + i) * 8, y: h * 0.78 - gh };
    c.strokeStyle = `hsla(128,36%,36%,0.45)`; c.lineWidth = 1.4; c.globalAlpha = 0.7;
    c.beginPath(); c.moveTo(gx, h * 0.8); c.quadraticCurveTo(gx, h * 0.8 - gh * 0.5, tip.x, tip.y); c.stroke();
    const bs = 4 + (1 - dustLevel) * 10;
    c.fillStyle = sigColor;
    for (let p = 0; p < 5; p++) {
      const a = (TAU * p / 5) + now * 0.0004;
      c.globalAlpha = 0.6 + (1 - dustLevel) * 0.2;
      c.beginPath(); c.ellipse(tip.x + Math.cos(a) * bs * 0.35, tip.y + Math.sin(a) * bs * 0.25, bs * 0.35, bs * 0.18, a, 0, TAU); c.fill();
    }
  }

  c.globalAlpha = 0.22 + pulse * 0.16;
  c.fillStyle = sigColor;
  c.beginPath(); c.arc(w * 0.5, h * 0.38, w * (0.1 + pulse * 0.04), 0, TAU); c.fill();
  c.globalAlpha = 1;
  applyNightDim(c, w, h, mood.nightFactor);
  const pm10a = airQuality.pm10 ?? 42;
  const pm25a = airQuality.pm25 ?? 18;
  const lvlA = pm10a <= 30 && pm25a <= 15 ? "좋음" : pm10a <= 80 && pm25a <= 35 ? "보통" : "주의";
  drawArtDataPanel(
    c, w, h, "공기질",
    [
      ...currentDateRows(),
      { label: "PM10", value: `${pm10a.toFixed(1)} µg/m³` },
      { label: "PM2.5", value: `${pm25a.toFixed(1)} µg/m³` },
      { label: "상태", value: lvlA },
    ],
    142, now,
  );
}

function drawRefMobilityArt(c, w, h, mood, now) {
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(210, 22%, ${88 - mood.cloud * 10}%)`);
  bg.addColorStop(1, `hsl(${126 - mood.cloud * 14}, 32%, ${78 - mood.cloud * 8}%)`);
  c.fillStyle = bg; c.fillRect(0, 0, w, h);

  const lineCount = 8;
  for (let i = 0; i < lineCount; i++) {
    const y = h * (0.16 + i * 0.09);
    const speed = (0.6 + i * 0.25) * (1 + mood.windPower * 0.2);
    c.strokeStyle = `hsl(${hueWrap(196 + i * 22)}, 62%, 62%)`;
    c.lineWidth = 1.5 + (i % 2);
    c.globalAlpha = 0.3 + mood.light * 0.18;
    c.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const dy = Math.sin(x * 0.018 + now * 0.001 * speed + i * 0.8) * (8 + i * 2.5);
      x === 0 ? c.moveTo(x, y + dy) : c.lineTo(x, y + dy);
    }
    c.stroke();
  }

  for (let i = 0; i < 20; i++) {
    const dotX = ((i * 113 + now * 0.07 * (1 + (i % 3) * 0.4)) % (w + 20)) - 10;
    const dotY = h * (0.16 + (i % lineCount) * 0.09);
    c.globalAlpha = 0.68;
    c.fillStyle = `hsl(${hueWrap(340 + i * 18)}, 78%, 68%)`;
    c.beginPath(); c.arc(dotX, dotY, 3.5 + (i % 3), 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
  applyNightDim(c, w, h, mood.nightFactor);
  drawArtDataPanel(
    c, w, h, "교통 흐름",
    [
      ...currentDateRows(),
      { label: "바람", value: `${Math.round(weather.wind)} m/s` },
      { label: "하늘", value: skyNames.get(weather.code) || weather.label },
      { label: "흐름", value: mood.windPower > 0.5 ? "빠름" : "원활" },
    ],
    196, now,
  );
}

function drawRefLibraryArt(c, w, h, mood, now) {
  const n = mood.nightFactor;
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(${n > 0.4 ? 222 : 48}, ${n > 0.4 ? 28 : 62}%, ${Math.max(6, 92 - n * 62)}%)`);
  bg.addColorStop(1, `hsl(${n > 0.4 ? 212 : 124}, ${n > 0.4 ? 22 : 36}%, ${Math.max(5, 80 - n * 54)}%)`);
  c.fillStyle = bg; c.fillRect(0, 0, w, h);

  const starCount = 48;
  for (let i = 0; i < starCount; i++) {
    const sx = (((i * 7919 + 31337) % 99991) / 99991) * w;
    const sy = (((i * 6271 + 12289) % 99991) / 99991) * h * 0.85;
    const sr = 0.8 + (i % 5) * 0.7;
    const twinkle = 0.3 + 0.7 * Math.sin(now * 0.0018 + i * 2.17);
    c.globalAlpha = (0.22 + n * 0.52) * twinkle;
    c.fillStyle = i % 4 === 0 ? `hsl(${hueWrap(44 + i * 14)}, 92%, 82%)` : `hsl(${hueWrap(200 + i * 11)}, 68%, 78%)`;
    c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
  }

  const lampX = w * 0.5, lampY = h * 0.42;
  const lampR = w * 0.11;
  const glow = 0.28 + mood.light * 0.3 + 0.12 * Math.sin(now * 0.0014);
  const radGrad = c.createRadialGradient(lampX, lampY, 0, lampX, lampY, lampR * 2.8);
  radGrad.addColorStop(0, `hsla(44, 94%, 78%, ${glow})`);
  radGrad.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = radGrad;
  c.globalAlpha = 1;
  c.beginPath(); c.arc(lampX, lampY, lampR * 2.8, 0, TAU); c.fill();

  c.globalAlpha = 0.7 + mood.light * 0.2;
  c.fillStyle = `hsl(44, 94%, 72%)`;
  c.beginPath(); c.arc(lampX, lampY, lampR * 0.55, 0, TAU); c.fill();
  c.globalAlpha = 1;
  applyNightDim(c, w, h, mood.nightFactor);
  drawArtDataPanel(
    c, w, h, "문화 공간",
    [
      ...currentDateRows(),
      { label: "기온", value: `${Math.round(weather.temp)}°C` },
      { label: "하늘", value: skyNames.get(weather.code) || weather.label },
      { label: "분위기", value: mood.nightFactor > 0.4 ? "야간 조명" : "낮 채광" },
    ],
    44, now,
  );
}

function drawRefCalmWallArt(c, w, h, mood, now) {
  const calm = 1 - mood.wetness * 0.7;
  const bg = c.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, `hsl(${212 - mood.cloud * 16}, ${32 + calm * 16}%, ${88 - mood.nightFactor * 28}%)`);
  bg.addColorStop(1, `hsl(${192 - mood.cloud * 12}, ${42 + calm * 14}%, ${76 - mood.nightFactor * 22}%)`);
  c.fillStyle = bg; c.fillRect(0, 0, w, h);

  for (let wave = 0; wave < 5; wave++) {
    const speed = 0.0005 + wave * 0.00018;
    const amp = (12 + wave * 4) * calm;
    const baseY = h * (0.3 + wave * 0.14);
    c.globalAlpha = 0.14 + calm * 0.1 + wave * 0.04;
    c.strokeStyle = `hsl(${hueWrap(196 + wave * 14)}, 62%, ${68 - wave * 4}%)`;
    c.lineWidth = 1.2 + wave * 0.3;
    c.beginPath();
    for (let x = 0; x <= w; x += 5) {
      const y = baseY + Math.sin(x * 0.014 + now * speed + wave * 1.4) * amp;
      x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.stroke();
  }

  const breathScale = 0.5 + 0.5 * Math.sin(now * 0.0008);
  c.globalAlpha = 0.16 + calm * 0.12;
  c.fillStyle = `hsl(${196 - mood.cloud * 10}, 58%, 68%)`;
  c.beginPath(); c.arc(w * 0.5, h * 0.5, w * 0.14 * breathScale, 0, TAU); c.fill();
  c.globalAlpha = 1;
  applyNightDim(c, w, h, mood.nightFactor);
  drawArtDataPanel(
    c, w, h, "환경 감지",
    [
      ...currentDateRows(),
      { label: "바람", value: `${Math.round(weather.wind)} m/s` },
      { label: "강수", value: `${weather.rain.toFixed(1)} mm` },
      { label: "상태", value: calm > 0.6 ? "안정" : "주의" },
    ],
    196, now,
  );
}

function drawRefEnergyArt(c, w, h, mood, now) {
  const solar = mood.light;
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(${48 + solar * 12}, ${82 + solar * 10}%, ${88 - mood.nightFactor * 24}%)`);
  bg.addColorStop(1, `hsl(152, 52%, ${80 - mood.nightFactor * 20}%)`);
  c.fillStyle = bg; c.fillRect(0, 0, w, h);

  c.globalAlpha = (0.38 + solar * 0.42) * (1 - mood.nightFactor * 0.7);
  c.fillStyle = `hsl(${42 + solar * 18}, 92%, 72%)`;
  c.beginPath(); c.arc(w * 0.76, h * 0.18, w * 0.13, 0, TAU); c.fill();

  const rays = 8;
  for (let i = 0; i < rays; i++) {
    const a = (TAU * i / rays) + now * 0.0003;
    c.globalAlpha = (0.24 + solar * 0.18) * (1 - mood.nightFactor * 0.6);
    c.strokeStyle = `hsl(${42 + solar * 18}, 88%, 68%)`;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(w * 0.76 + Math.cos(a) * w * 0.14, h * 0.18 + Math.sin(a) * w * 0.14);
    c.lineTo(w * 0.76 + Math.cos(a) * w * 0.22, h * 0.18 + Math.sin(a) * w * 0.22);
    c.stroke();
  }

  const bloomCount = Math.floor(7 + solar * 14);
  for (let i = 0; i < bloomCount; i++) {
    const stemX = (w / (bloomCount + 1)) * (i + 1);
    const stemH = h * (0.16 + solar * 0.22) * (0.55 + (i % 3) * 0.22);
    const tip = { x: stemX + Math.sin(now * 0.001 + i) * 7, y: h * 0.74 - stemH };
    c.strokeStyle = `hsla(128,36%,36%,0.5)`; c.lineWidth = 1.4; c.globalAlpha = 0.7;
    c.beginPath(); c.moveTo(stemX, h * 0.77); c.quadraticCurveTo(stemX, h * 0.77 - stemH * 0.5, tip.x, tip.y); c.stroke();
    const bs = 5 + solar * 12;
    c.fillStyle = `hsl(${hueWrap(46 + solar * 28 + i * 9)}, 88%, ${66 + solar * 8}%)`;
    for (let p = 0; p < 5; p++) {
      const a = (TAU * p / 5) + now * 0.0004;
      c.globalAlpha = 0.65 + solar * 0.2;
      c.beginPath(); c.ellipse(tip.x + Math.cos(a) * bs * 0.35, tip.y + Math.sin(a) * bs * 0.25, bs * 0.35, bs * 0.18, a, 0, TAU); c.fill();
    }
  }
  c.globalAlpha = 1;
  applyNightDim(c, w, h, mood.nightFactor);
  drawArtDataPanel(
    c, w, h, "태양에너지",
    [
      ...currentDateRows(),
      { label: "기온", value: `${Math.round(weather.temp)}°C` },
      { label: "하늘", value: skyNames.get(weather.code) || weather.label },
      { label: "일조", value: mood.light > 0.6 ? "충분" : mood.light > 0.3 ? "보통" : "부족" },
    ],
    48, now,
  );
}

function drawRefSpringClock(c, w, h, mood, now) {
  // Identical to drawMiniWork — full-quality spring/weather canvas with data panel
  const gradient = c.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, `hsl(${184 - mood.cloud * 20}, 48%, 78%)`);
  gradient.addColorStop(0.55, `hsl(${52 + mood.tempWarmth * 16}, 82%, 84%)`);
  gradient.addColorStop(1, `hsl(${124 - mood.wetness * 24}, 42%, 70%)`);
  c.fillStyle = gradient;
  c.fillRect(0, 0, w, h);

  c.globalAlpha = 0.48;
  c.fillStyle = "#fff59a";
  c.beginPath();
  c.arc(w * 0.25, h * 0.24, Math.min(w, h) * 0.26, 0, Math.PI * 2);
  c.fill();

  for (let i = 0; i < 30; i += 1) {
    const x = (i * 47 + now * 0.1 * (0.8 + mood.windPower)) % (w + 40) - 20;
    const y = (i * 31 + Math.sin(now * 0.0025 + i) * 16) % (h + 20);
    const r = 3 + (i % 4);
    c.save();
    c.translate(x, y);
    c.rotate(Math.sin(now * 0.005 + i) * 1.6);
    c.globalAlpha = 0.58;
    c.fillStyle = `hsl(${hueWrap(338 + i * 17 + mood.tempWarmth * 20)}, 78%, 72%)`;
    c.beginPath();
    c.ellipse(0, 0, r * 1.8, r * 0.75, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  c.globalAlpha = 0.68;
  c.strokeStyle = "rgba(69, 119, 87, 0.62)";
  c.lineWidth = 1.2;
  for (let i = 0; i < 13; i += 1) {
    const x = (i / 12) * w;
    const sway = Math.sin(now * 0.004 + i) * 14;
    const top = h * (0.52 + (i % 4) * 0.06);
    c.beginPath();
    c.moveTo(x, h + 4);
    c.quadraticCurveTo(x + sway * 0.4, h * 0.74, x + sway, top);
    c.stroke();
    c.fillStyle = "rgba(244, 126, 116, 0.76)";
    c.beginPath();
    c.arc(x + sway, top, 5 + (i % 3), 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  applyNightDim(c, w, h, mood.nightFactor);
  drawArtDataPanel(
    c, w, h, "오늘 날씨",
    [
      ...currentDateRows(),
      { label: "하늘", value: skyNames.get(weather.code) || weather.label },
      { label: "기온", value: `${Math.round(weather.temp)}°C` },
      { label: "바람", value: `${Math.round(weather.wind)} m/s` },
    ],
    132, now,
  );
}

function drawRefDustWalkArt(c, w, h, mood, now) {
  // Identical to drawDustWalk — full-quality dust/air canvas with data panel
  const pm10 = airQuality.pm10 ?? 42;
  const pm25 = airQuality.pm25 ?? 18;
  const cleanScore = Math.max(0, Math.min(1, 1 - Math.max(pm10 / 100, pm25 / 45)));
  const signalHue = cleanScore > 0.68 ? 142 : cleanScore > 0.42 ? 52 : 8;

  const gradient = c.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, `hsl(${174 - cleanScore * 18}, 45%, 72%)`);
  gradient.addColorStop(0.58, `hsl(${60 + cleanScore * 28}, 76%, 84%)`);
  gradient.addColorStop(1, `hsl(${132 + cleanScore * 18}, 36%, 66%)`);
  c.fillStyle = gradient;
  c.fillRect(0, 0, w, h);

  c.globalAlpha = 0.2 + cleanScore * 0.2;
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.ellipse(w * 0.64, h * 0.46, w * 0.28, h * 0.2, 0, 0, Math.PI * 2);
  c.fill();

  c.lineWidth = Math.max(10, w * 0.045);
  c.lineCap = "round";
  for (let i = 0; i < 5; i += 1) {
    const offset = (i - 2) * w * 0.08;
    c.globalAlpha = 0.18 + cleanScore * 0.32;
    c.strokeStyle = `hsl(${signalHue}, 82%, ${62 + cleanScore * 14}%)`;
    c.beginPath();
    c.moveTo(w * 0.08 + offset, h * 0.9);
    c.bezierCurveTo(
      w * 0.28 + offset, h * 0.64 + Math.sin(now * 0.003 + i) * 16,
      w * 0.42 + offset, h * 0.36,
      w * 0.78 + offset, h * 0.08,
    );
    c.stroke();
  }

  for (let i = 0; i < 18; i += 1) {
    const x = (i * 59 + now * (0.07 + cleanScore * 0.1)) % (w + 40) - 20;
    const y = h * (0.28 + ((i * 13) % 42) / 100) + Math.sin(now * 0.003 + i) * 12;
    c.globalAlpha = 0.18 + (1 - cleanScore) * 0.34;
    c.fillStyle = `hsl(${34 - cleanScore * 24}, 44%, ${66 - (1 - cleanScore) * 18}%)`;
    c.beginPath();
    c.arc(x, y, 2 + (1 - cleanScore) * 5, 0, Math.PI * 2);
    c.fill();
  }

  c.globalAlpha = 0.9;
  c.fillStyle = `hsl(${signalHue}, 80%, 44%)`;
  c.beginPath();
  c.arc(w * 0.13, h * 0.18, 16 + cleanScore * 8, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
  applyNightDim(c, w, h, mood.nightFactor);
  const fineLevel = pm10 <= 30 && pm25 <= 15 ? "좋음" : pm10 <= 80 && pm25 <= 35 ? "보통" : "주의";
  const activity = fineLevel === "좋음" ? "야외활동 가능" : fineLevel === "보통" ? "짧은 활동" : "실내 권장";
  drawArtDataPanel(
    c, w, h, "미세먼지",
    [
      ...currentDateRows(),
      { label: "PM10", value: `${pm10.toFixed(1)} µg/m³` },
      { label: "PM2.5", value: `${pm25.toFixed(1)} µg/m³` },
      { label: "판단", value: `${fineLevel} · ${activity}` },
    ],
    signalHue, now,
  );
}

function drawRefTemperatureArt(c, w, h, mood, now) {
  // Identical to drawTemperatureGarden — full-quality temperature garden with data panel
  const warmth = Math.max(0, Math.min(1, (weather.temp + 4) / 36));
  const pulse = 0.5 + Math.sin(now * (0.0025 + warmth * 0.002)) * 0.5;
  const gradient = c.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, `hsl(${178 - warmth * 42}, 42%, 84%)`);
  gradient.addColorStop(0.55, `hsl(${58 + warmth * 20}, 74%, ${88 - warmth * 10}%)`);
  gradient.addColorStop(1, `hsl(${126 - warmth * 12}, 34%, ${70 - warmth * 8}%)`);
  c.fillStyle = gradient;
  c.fillRect(0, 0, w, h);

  c.globalAlpha = 0.28 + pulse * 0.22;
  c.fillStyle = `hsl(${44 + warmth * 24}, 88%, 76%)`;
  c.beginPath();
  c.arc(w * 0.5, h * 0.4, w * (0.22 + pulse * 0.05), 0, Math.PI * 2);
  c.fill();

  for (let i = 0; i < 16; i += 1) {
    const x = (i / 15) * w;
    const stemTop = h * (0.42 + ((i * 7) % 36) / 100);
    const sway = Math.sin(now * 0.004 + i) * (10 + warmth * 14);
    const bloom = 5 + warmth * 13 + Math.sin(now * 0.005 + i) * 4;
    c.globalAlpha = 0.62;
    c.strokeStyle = `hsl(${130 - warmth * 20}, 32%, 42%)`;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x, h + 6);
    c.quadraticCurveTo(x + sway * 0.2, h * 0.72, x + sway, stemTop);
    c.stroke();

    c.globalAlpha = 0.72;
    c.fillStyle = `hsl(${hueWrap(338 + warmth * 46 + i * 3)}, 78%, ${76 - warmth * 8}%)`;
    c.beginPath();
    c.arc(x + sway, stemTop, bloom, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  applyNightDim(c, w, h, mood.nightFactor);
  const tempMode = weather.temp >= 28 ? "더움" : weather.temp >= 18 ? "쾌적" : "서늘";
  drawArtDataPanel(
    c, w, h, "오늘 온도",
    [
      ...currentDateRows(),
      { label: "현재", value: `${Math.round(weather.temp)}°C` },
      { label: "감각", value: tempMode },
      { label: "표현", value: `꽃 크기 ${(warmth * 100).toFixed(0)}%` },
    ],
    24 + warmth * 36, now,
  );
}

function drawRefRainFlowerArt(c, w, h, mood, now) {
  // Identical to drawRainFlowerCity — full-quality rain flower canvas with data panel
  const rainy = weather.rain > 0.1 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(weather.code);
  const rainPower = rainy ? Math.max(0.38, Math.min(1, weather.rain / 4 + mood.cloud * 0.45)) : Math.max(0.06, mood.cloud * 0.16);
  const gradient = c.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, `hsl(${194 - rainPower * 28}, ${40 - rainPower * 10}%, ${82 - rainPower * 18}%)`);
  gradient.addColorStop(0.6, `hsl(${52 - rainPower * 14}, 74%, ${86 - rainPower * 18}%)`);
  gradient.addColorStop(1, `hsl(${112 - rainPower * 12}, 35%, ${70 - rainPower * 12}%)`);
  c.fillStyle = gradient;
  c.fillRect(0, 0, w, h);

  c.globalAlpha = 0.36;
  c.fillStyle = "#fff7b4";
  c.beginPath();
  c.arc(w * 0.52, h * 0.28, w * 0.18, 0, Math.PI * 2);
  c.fill();

  c.lineCap = "round";
  for (let i = 0; i < 7; i += 1) {
    const x = w * (0.18 + i * 0.11);
    c.globalAlpha = 0.22 + rainPower * 0.24;
    c.strokeStyle = `rgba(53, 70, 61, ${0.32 + rainPower * 0.26})`;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x, h * 0.3);
    c.lineTo(x, h);
    c.stroke();
  }

  const flowerCount = Math.floor(18 + rainPower * 42);
  for (let i = 0; i < flowerCount; i += 1) {
    const x = (i * 43 + now * (rainy ? 0.14 : 0.06)) % (w + 30) - 15;
    const y = (i * 67 + now * (rainy ? 0.22 : 0.1)) % (h + 30) - 15;
    const r = 2.5 + rainPower * 3 + (i % 3);
    c.save();
    c.translate(x, y);
    c.rotate(Math.sin(now * 0.005 + i));
    c.globalAlpha = 0.44 + rainPower * 0.32;
    c.fillStyle = rainy ? "hsl(202, 78%, 72%)" : `hsl(${hueWrap(336 + i * 12)}, 78%, 73%)`;
    for (let p = 0; p < 5; p += 1) {
      const angle = (Math.PI * 2 * p) / 5;
      c.beginPath();
      c.ellipse(Math.cos(angle) * r, Math.sin(angle) * r, r, r * 0.45, angle, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
  c.globalAlpha = 1;
  applyNightDim(c, w, h, mood.nightFactor);
  drawArtDataPanel(
    c, w, h, "비 예보",
    [
      ...currentDateRows(),
      { label: "강수", value: `${weather.rain.toFixed(1)} mm` },
      { label: "하늘", value: skyNames.get(weather.code) || weather.label },
      { label: "판단", value: rainy ? "비 예감 · 꽃비 짙음" : "비 낮음 · 꽃비 옅음" },
    ],
    rainy ? 204 : 52, now,
  );
}

function describeWeather() {
  const sky = skyNames.get(weather.code) || weather.label;
  const gentle = weather.wind < 4 ? "천천히" : weather.wind < 9 ? "조금 빠르게" : "힘 있게";
  const rainPhrase = weather.rain > 0.2 ? "비의 무게를 품고" : "빛을 가볍게 머금고";
  if (weatherLine) weatherLine.textContent = `${sky}인 오늘, 시침은 깊게 머물고 초침은 ${gentle} 꽃잎의 잔상을 그리며 ${rainPhrase} 번집니다.`;
  if (tempValue) tempValue.textContent = `${Math.round(weather.temp)}°C`;
  if (skyValue) skyValue.textContent = sky;
  if (windValue) windValue.textContent = `${Math.round(weather.wind)} m/s`;
  updatePublicDataTable();
}

function updatePublicDataTable() {
  const sky = skyNames.get(weather.code) || weather.label;

  if (springStatus) {
    const springText = `${sky}, ${Math.round(weather.temp)}°C, 바람 ${Math.round(
      weather.wind,
    )} m/s를 시계 바늘, 꽃잎, 빛의 흐름으로 표현`;
    springStatus.textContent = springText;
    if (springCardStatus) springCardStatus.textContent = springText;
  }

  if (temperatureStatus) {
    const tempTone = weather.temp >= 28 ? "뜨거운 빛과 빠른 호흡" : weather.temp >= 18 ? "따뜻한 빛과 안정적인 호흡" : "차분한 빛과 느린 호흡";
    const temperatureText = `현재 ${Math.round(weather.temp)}°C · ${tempTone}`;
    temperatureStatus.textContent = `${temperatureText}으로 시각화`;
    if (temperatureCardStatus) temperatureCardStatus.textContent = temperatureText;
  }

  if (rainStatus) {
    const rainy = weather.rain > 0.1 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(weather.code);
    const rainText = rainy
      ? `현재 강수 ${weather.rain.toFixed(1)}mm, 오늘은 꽃비가 짙어지는 비 예감 연출`
      : `현재 강수 ${weather.rain.toFixed(1)}mm, 오늘은 밝은 하늘과 옅은 꽃비 연출`;
    rainStatus.textContent = rainText;
    if (rainCardStatus) rainCardStatus.textContent = rainText;
  }

  if (dustStatus) {
    if (airQuality.pm10 === null || airQuality.pm25 === null) {
      dustStatus.textContent = "대구 미세먼지 API 연결 후 야외활동 신호를 색으로 안내";
      if (dustCardStatus) dustCardStatus.textContent = "미세먼지 데이터 연결 대기";
      return;
    }

    const fineLevel =
      airQuality.pm10 <= 30 && airQuality.pm25 <= 15
        ? "좋음"
        : airQuality.pm10 <= 80 && airQuality.pm25 <= 35
          ? "보통"
          : "주의";
    const activity =
      fineLevel === "좋음"
        ? "아이들 야외활동 가능 신호"
        : fineLevel === "보통"
          ? "짧은 야외활동과 관찰 신호"
          : "실내활동 권장 신호";
    const dustText = `PM10 ${airQuality.pm10.toFixed(1)}, PM2.5 ${airQuality.pm25.toFixed(1)} (${fineLevel}) · ${activity}`;
    dustStatus.textContent = dustText;
    if (dustCardStatus) dustCardStatus.textContent = dustText;
  }
}

async function getPosition() {
  return DAEGU;
}

let _weatherRetryTimer = null;
let _weatherRefreshTimer = null;

async function loadWeather(isRetry = false) {
  if (!isRetry) {
    if (placeLabel) placeLabel.textContent = "대구의 하늘을 읽는 중…";
    if (refreshButton) refreshButton.disabled = true;
  }

  // 재시도 타이머가 있으면 취소
  clearTimeout(_weatherRetryTimer);

  try {
    const place = await getPosition();
    const params = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: "temperature_2m,weather_code,cloud_cover,wind_speed_10m,precipitation",
      timezone: "auto",
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`weather ${res.status}`);
    const data = await res.json();
    const current = data.current;

    weather.temp = current.temperature_2m;
    weather.wind = current.wind_speed_10m / 3.6;
    weather.code = current.weather_code;
    weather.cloud = current.cloud_cover;
    weather.rain = current.precipitation;
    weather.label = skyNames.get(weather.code) || "변화하는 하늘";

    if (placeLabel) {
      placeLabel.textContent = `${place.label} · ${new Date().toLocaleDateString("ko-KR", {
        month: "long", day: "numeric", weekday: "long",
      })}`;
    }

    // 공기질 병렬 로드
    try {
      await loadAirQuality(place);
    } catch {
      airQuality.pm10 = null;
      airQuality.pm25 = null;
    }

    // 20분마다 자동 새로고침
    clearTimeout(_weatherRefreshTimer);
    _weatherRefreshTimer = setTimeout(() => loadWeather(), 20 * 60 * 1000);

  } catch (error) {
    if (placeLabel) placeLabel.textContent = "대구의 봄날 · 날씨 연결 대기";
    if (weatherLine) weatherLine.textContent = "날씨를 가져오는 중입니다. 잠시 후 자동으로 재시도합니다.";

    // 30초 후 자동 재시도 (최초 실패 시), 이후 5분
    const retryDelay = isRetry ? 5 * 60 * 1000 : 30 * 1000;
    _weatherRetryTimer = setTimeout(() => loadWeather(true), retryDelay);
  } finally {
    describeWeather();
    if (refreshButton) refreshButton.disabled = false;
  }
}

async function loadAirQuality(place) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "pm10,pm2_5",
    timezone: "auto",
  });
  const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`air-quality ${res.status}`);
  const data = await res.json();
  airQuality.pm10 = data.current.pm10;
  airQuality.pm25 = data.current.pm2_5;
  updatePublicDataTable();
}

function setPointer(event) {
  const touch = event.touches?.[0];
  pointer.x = touch ? touch.clientX : event.clientX;
  pointer.y = touch ? touch.clientY : event.clientY;
  pointer.active = true;
  pointer.force = Math.min(1, pointer.force + 0.18);
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", setPointer);
window.addEventListener("pointerdown", setPointer);
window.addEventListener("touchmove", setPointer, { passive: true });
window.addEventListener("pointerleave", () => {
  pointer.active = false;
});
refreshButton?.addEventListener("click", loadWeather);

function initMiniCanvases() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  [
    [miniCanvas, miniCtx],
    [dustWalkCanvas, dustWalkCtx],
    [temperatureGardenCanvas, temperatureGardenCtx],
    [rainFlowerCanvas, rainFlowerCtx],
    [refArtCanvas, refArtCtx],
    [propWeatherCanvas, propWeatherCtx],
    [propAirCanvas, propAirCtx],
    [propWaterCanvas, propWaterCtx],
    [propMobilityCanvas, propMobilityCtx],
    [propEnergyCanvas, propEnergyCtx],
    [propFestivalCanvas, propFestivalCtx],
  ].forEach(([cvs, cctx]) => {
    if (!cvs || !cctx) return;
    const parent = cvs.parentElement;
    if (!parent) return;
    const w = Math.max(1, parent.offsetWidth);
    const h = Math.max(1, parent.offsetHeight);
    cvs.width = Math.floor(w * dpr);
    cvs.height = Math.floor(h * dpr);
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  });
}

resize();
describeWeather();
loadWeather();
window.addEventListener("load", initMiniCanvases);
requestAnimationFrame(animate);

// 탭이 다시 활성화될 때 30분 이상 지났으면 날씨 재로드
let _lastWeatherLoad = Date.now();
const _origLoadWeather = loadWeather;
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && Date.now() - _lastWeatherLoad > 30 * 60 * 1000) {
    _lastWeatherLoad = Date.now();
    loadWeather();
  }
});
