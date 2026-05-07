const canvas = document.querySelector("#springCanvas");
const ctx = canvas.getContext("2d");
const miniCanvas = document.querySelector("#miniSpringCanvas");
const miniCtx = miniCanvas?.getContext("2d");
const dustWalkCanvas = document.querySelector("#dustWalkCanvas");
const dustWalkCtx = dustWalkCanvas?.getContext("2d");
const temperatureGardenCanvas = document.querySelector("#temperatureGardenCanvas");
const temperatureGardenCtx = temperatureGardenCanvas?.getContext("2d");
const rainFlowerCanvas = document.querySelector("#rainFlowerCanvas");
const rainFlowerCtx = rainFlowerCanvas?.getContext("2d");
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
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    light: 1 - cloud * 0.36 - wetness * 0.18,
  };
}

function drawBackground(mood) {
  const top = `hsl(${190 - mood.cloud * 30}, ${48 - mood.cloud * 16}%, ${82 - mood.cloud * 14}%)`;
  const middle = `hsl(${48 + mood.tempWarmth * 16}, 78%, ${88 - mood.wetness * 9}%)`;
  const bottom = `hsl(${126 - mood.wetness * 28}, ${44 - mood.cloud * 10}%, ${76 - mood.cloud * 8}%)`;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(0.52, middle);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.36 + mood.light * 0.26;
  ctx.fillStyle = `hsl(${42 + mood.tempWarmth * 18}, 92%, 76%)`;
  ctx.beginPath();
  ctx.arc(width * 0.18, height * 0.18, Math.min(width, height) * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  for (let i = 0; i < 8; i += 1) {
    const y = height * (0.16 + i * 0.075) + Math.sin(time * 0.0003 + i) * 12;
    ctx.globalAlpha = 0.05 + mood.cloud * 0.075;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(width * (0.2 + (i % 4) * 0.22), y, width * 0.17, 28 + mood.cloud * 36, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
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
  drawBackground(mood);
  drawBreath(mood);
  drawClockArt(mood);
  drawGarden(mood);
  drawPetals(mood);
  drawRainOrSnow(mood);
  drawMiniWork(mood, now);
  drawDustWalk(mood, now);
  drawTemperatureGarden(mood, now);
  drawRainFlowerCity(mood, now);
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
    const x = (i * 47 + now * 0.035 * (0.8 + mood.windPower)) % (miniWidth + 40) - 20;
    const y = (i * 31 + Math.sin(now * 0.001 + i) * 16) % (miniHeight + 20);
    const r = 3 + (i % 4);
    miniCtx.save();
    miniCtx.translate(x, y);
    miniCtx.rotate(Math.sin(now * 0.002 + i) * 1.6);
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
    const sway = Math.sin(now * 0.0015 + i) * 9;
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
  drawArtDataPanel(
    miniCtx,
    miniWidth,
    miniHeight,
    "오늘 날씨",
    [
      ...currentDateRows(),
      { label: "하늘", value: skyNames.get(weather.code) || weather.label },
      { label: "기온", value: `${Math.round(weather.temp)}°C` },
      { label: "바람", value: `${Math.round(weather.wind)} m/s` },
    ],
    132,
    now,
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
      previewHeight * 0.64 + Math.sin(now * 0.001 + i) * 10,
      previewWidth * 0.42 + offset,
      previewHeight * 0.36,
      previewWidth * 0.78 + offset,
      previewHeight * 0.08,
    );
    dustWalkCtx.stroke();
  }

  for (let i = 0; i < 18; i += 1) {
    const x = (i * 59 + now * (0.018 + cleanScore * 0.045)) % (previewWidth + 40) - 20;
    const y = previewHeight * (0.28 + ((i * 13) % 42) / 100) + Math.sin(now * 0.0012 + i) * 12;
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
  const fineLevel =
    pm10 <= 30 && pm25 <= 15 ? "좋음" : pm10 <= 80 && pm25 <= 35 ? "보통" : "주의";
  const activity = fineLevel === "좋음" ? "야외활동 가능" : fineLevel === "보통" ? "짧은 활동" : "실내 권장";
  drawArtDataPanel(
    dustWalkCtx,
    previewWidth,
    previewHeight,
    "미세먼지",
    [
      ...currentDateRows(),
      { label: "PM10", value: `${pm10.toFixed(1)} µg/m³` },
      { label: "PM2.5", value: `${pm25.toFixed(1)} µg/m³` },
      { label: "판단", value: `${fineLevel} · ${activity}` },
    ],
    signalHue,
    now,
  );
}

function drawTemperatureGarden(mood, now) {
  const preview = preparePreview(temperatureGardenCanvas, temperatureGardenCtx);
  if (!preview) return;

  const { previewWidth, previewHeight } = preview;
  const warmth = Math.max(0, Math.min(1, (weather.temp + 4) / 36));
  const pulse = 0.5 + Math.sin(now * (0.001 + warmth * 0.0012)) * 0.5;
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
    const sway = Math.sin(now * 0.0014 + i) * (5 + warmth * 9);
    const bloom = 5 + warmth * 13 + Math.sin(now * 0.002 + i) * 2;
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
  const tempMode = weather.temp >= 28 ? "더움" : weather.temp >= 18 ? "쾌적" : "서늘";
  drawArtDataPanel(
    temperatureGardenCtx,
    previewWidth,
    previewHeight,
    "오늘 온도",
    [
      ...currentDateRows(),
      { label: "현재", value: `${Math.round(weather.temp)}°C` },
      { label: "감각", value: tempMode },
      { label: "표현", value: `꽃 크기 ${(warmth * 100).toFixed(0)}%` },
    ],
    24 + warmth * 36,
    now,
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
    const x = (i * 43 + now * (rainy ? 0.05 : 0.018)) % (previewWidth + 30) - 15;
    const y = (i * 67 + now * (rainy ? 0.09 : 0.035)) % (previewHeight + 30) - 15;
    const r = 2.5 + rainPower * 3 + (i % 3);
    rainFlowerCtx.save();
    rainFlowerCtx.translate(x, y);
    rainFlowerCtx.rotate(Math.sin(now * 0.002 + i));
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
  drawArtDataPanel(
    rainFlowerCtx,
    previewWidth,
    previewHeight,
    "비 예보",
    [
      ...currentDateRows(),
      { label: "강수", value: `${weather.rain.toFixed(1)} mm` },
      { label: "하늘", value: skyNames.get(weather.code) || weather.label },
      { label: "판단", value: rainy ? "비 예감 · 꽃비 짙음" : "비 낮음 · 꽃비 옅음" },
    ],
    rainy ? 204 : 52,
    now,
  );
}

function describeWeather() {
  const sky = skyNames.get(weather.code) || weather.label;
  const gentle = weather.wind < 4 ? "천천히" : weather.wind < 9 ? "조금 빠르게" : "힘 있게";
  const rainPhrase = weather.rain > 0.2 ? "비의 무게를 품고" : "빛을 가볍게 머금고";
  weatherLine.textContent = `${sky}인 오늘, 시침은 깊게 머물고 초침은 ${gentle} 꽃잎의 잔상을 그리며 ${rainPhrase} 번집니다.`;
  tempValue.textContent = `${Math.round(weather.temp)}°C`;
  skyValue.textContent = sky;
  windValue.textContent = `${Math.round(weather.wind)} m/s`;
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

async function loadWeather() {
  placeLabel.textContent = "대구의 하늘을 읽는 중";
  refreshButton.disabled = true;

  try {
    const place = await getPosition();
    const params = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: "temperature_2m,weather_code,cloud_cover,wind_speed_10m,precipitation",
      timezone: "auto",
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error("weather request failed");
    const data = await response.json();
    const current = data.current;

    weather.temp = current.temperature_2m;
    weather.wind = current.wind_speed_10m / 3.6;
    weather.code = current.weather_code;
    weather.cloud = current.cloud_cover;
    weather.rain = current.precipitation;
    weather.label = skyNames.get(weather.code) || "변화하는 하늘";

    placeLabel.textContent = `${place.label} · ${new Date().toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "long",
    })}`;
    try {
      await loadAirQuality(place);
    } catch (airError) {
      airQuality.pm10 = null;
      airQuality.pm25 = null;
      updatePublicDataTable();
    }
  } catch (error) {
    placeLabel.textContent = "대구의 봄날 · 날씨 연결 전";
    weatherLine.textContent = "날씨를 가져오지 못해도 봄날은 여기서 천천히 움직입니다.";
  } finally {
    describeWeather();
    refreshButton.disabled = false;
  }
}

async function loadAirQuality(place) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "pm10,pm2_5",
    timezone: "auto",
  });
  const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
  if (!response.ok) throw new Error("air quality request failed");
  const data = await response.json();

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
refreshButton.addEventListener("click", loadWeather);

resize();
describeWeather();
loadWeather();
requestAnimationFrame(animate);
