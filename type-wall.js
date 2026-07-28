/**
 * 봄날 타이포 월 · 로비 LED 패널용 다국어 타이포 미디어아트
 *
 * 원본 DAEGU TYPE WALL(제어 패널판)에서 송출에 필요한 부분만 남긴 판입니다.
 * 결정론적 렌더(Math.random·Date.now 미사용)라 언제 재생해도 같은 화면이 나옵니다.
 * 기관명만 바꾸면 도시·기관 단위로 통째 교체할 수 있습니다.
 */
(() => {
  const canvas = document.getElementById("typeWallCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: false });

  const TEXTS = [
    "대구광역시", "대구시청",
    "DAEGU METROPOLITAN CITY", "DAEGU CITY HALL",
    "大邱広域市", "大邱市役所",
    "大邱广域市", "大邱市政府",
    "นครแทกู", "ศาลาว่าการนครแทกู",
    "Thành phố Daegu", "Tòa thị chính Daegu",
  ];

  const CFG = {
    fps: 30,
    dur: 46,
    seed: 3147025,
    angle: -14,
    speed: 0.75,
    lead: 1.24,
    trail: 0.26,
    sizevar: 0.35,
    dimvar: 0.25,
    vstart: 14,   // 흐름 유지 시간
    vdur: 9,      // 한 글자씩 사라지는 시간
    vblank: 1.6,  // 암전
    vreveal: 12,  // 한 글자씩 복귀
    beat: 0.22,   // 리듬 격자
    vpop: 0.3,
    vdrift: 0.4,
    base: "#f5f2ea",
    accent: "#ff4a1c",
    aratio: 0.22,
  };

  const FONT_STACK =
    '"Helvetica Neue",Arial,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",' +
    '"Hiragino Sans","Noto Sans JP","PingFang SC","Noto Sans SC","Microsoft YaHei",' +
    '"Thonburi","Noto Sans Thai","Leelawadee UI",sans-serif';

  const mulberry32 = (a) => () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const hash2 = (a, b) => {
    let x = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177) | 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  };

  const SEG = "Segmenter" in Intl ? new Intl.Segmenter("ko", { granularity: "grapheme" }) : null;
  const graphemes = (s) =>
    SEG ? Array.from(SEG.segment(s), (o) => o.segment) : s.match(/\P{M}\p{M}*/gu) || Array.from(s);

  let W = 0, H = 0, RAD = 0, LW = 0, LH = 0, TOTAL = 0;
  let ROWS = [];

  function build() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(rect.width, 1);
    H = Math.max(rect.height, 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    // 패널 폭에 맞춰 글자 크기를 정한다 (원본의 56px @ 3840 기준 비율)
    const size = Math.max(W * 0.0155, 11);
    const rand = mulberry32(CFG.seed | 0);
    RAD = (CFG.angle * Math.PI) / 180;
    const c = Math.abs(Math.cos(RAD)), s = Math.abs(Math.sin(RAD));
    LW = W * c + H * s + size * 6;
    LH = W * s + H * c + size * 2;
    TOTAL = Math.max(1, Math.round(CFG.fps * CFG.dur));

    // 모든 줄이 같은 속도로 흐르도록, 속도를 먼저 고정하고 타일 길이를 맞춘다.
    const V0 = size * 2.2 * CFG.speed;
    const travel = V0 * CFG.dur;
    let L = Math.max(1, Math.round(travel / (LW * 1.25)));
    let TL = travel / L;
    if (TL < LW * 0.9 && L > 1) {
      L = Math.max(1, Math.floor(travel / (LW * 0.9)));
      TL = travel / L;
    }

    ROWS = [];
    let id = 0, y = -LH / 2, r = 0;
    while (y < LH / 2) {
      const pick = [0.8, 0.92, 1.0, 1.0, 1.14, 1.28][Math.floor(rand() * 6)];
      const fs = size * (1 + (pick - 1) * CFG.sizevar);
      const weight = rand() < 0.24 ? 500 : 800;
      const dim = 1 - CFG.dimvar * rand();
      const font = `${weight} ${fs.toFixed(1)}px ${FONT_STACK}`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = font;

      const gap0 = fs * 0.62;
      const pool = [];
      let acc = 0;
      while (acc < TL + gap0 * 2) {
        const t = TEXTS[Math.floor(rand() * TEXTS.length)];
        const wdt = ctx.measureText(t).width;
        pool.push({ t, w: wdt });
        acc += wdt + gap0;
      }
      let best = pool.length, err = Infinity, run = 0;
      for (let k = 0; k < pool.length; k += 1) {
        run += pool[k].w + gap0;
        const e = Math.abs(run - TL);
        if (e < err) { err = e; best = k + 1; }
      }
      let used = pool.slice(0, best);
      let sumW = used.reduce((a, o) => a + o.w, 0);
      let gap = (TL - sumW) / best;
      if (gap < fs * 0.3 && best > 1) {
        best -= 1;
        used = pool.slice(0, best);
        sumW = used.reduce((a, o) => a + o.w, 0);
        gap = (TL - sumW) / best;
      }
      gap = Math.max(fs * 0.3, gap);

      const toks = [];
      let x = 0;
      for (const o of used) {
        const chars = [];
        let pre = "";
        for (const g of graphemes(o.t)) {
          const x0 = ctx.measureText(pre).width;
          pre += g;
          const x1 = ctx.measureText(pre).width;
          if (!/^\s+$/.test(g)) chars.push({ c: g, x: x0, w: x1 - x0 });
        }
        toks.push({ t: o.t, x, w: o.w, id: id++, chars, accent: rand() < CFG.aratio });
        x += o.w + gap;
      }
      const TLa = x;
      const dir = r % 2 ? -1 : 1; // 한 줄씩 좌우 교대
      ROWS.push({ y: y + fs * 0.34, fs, font, dim, toks, TL: TLa, v: (dir * TLa * L) / CFG.dur });
      y += fs * CFG.lead;
      r += 1;
    }
    canvas.__dpr = dpr;
  }

  const easeIO = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const backOut = (k) => { const c = 1.9, u = k - 1; return 1 + (c + 1) * u * u * u + c * u * u; };

  function renderFrame(n) {
    const dpr = canvas.__dpr || 1;
    const t = n / CFG.fps;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = CFG.trail > 0 ? `rgba(5,5,5,${(1 - CFG.trail * 0.86).toFixed(3)})` : "#050505";
    ctx.fillRect(0, 0, W, H);

    const BT = Math.max(0.02, CFG.beat);
    const VF = Math.min(0.2, BT * 0.85);
    const RI = Math.min(0.24, BT * 0.95);
    const VS = CFG.vstart, VD = CFG.vdur, VB = CFG.vblank;
    const RD = Math.max(0.5, Math.min(CFG.vreveal, CFG.dur - (VS + VD + VB + RI) - BT - 0.2));
    const VEND = VS + VD + VB + RD + RI + BT;
    const inVR = t >= VS - BT && t < VEND;
    const snap = (x) => Math.round(x / BT) * BT;

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(RAD);
    ctx.textBaseline = "middle";

    for (const row of ROWS) {
      ctx.font = row.font;
      const off = (((t * row.v) % row.TL) + row.TL) % row.TL;
      const flow = row.v > 0 ? 0 : Math.PI;
      const reps = Math.ceil(LW / row.TL) + 1;

      for (const tk of row.toks) {
        for (let m = 0; m <= reps; m += 1) {
          const px = -LW / 2 + tk.x - off + m * row.TL;
          if (px > LW / 2 + tk.w || px < -LW / 2 - tk.w - row.fs * 2) continue;
          ctx.fillStyle = tk.accent ? CFG.accent : CFG.base;

          if (!inVR) {
            ctx.globalAlpha = row.dim;
            ctx.fillText(tk.t, px, row.y);
            continue;
          }

          const N = tk.chars.length;
          for (let ci = 0; ci < N; ci += 1) {
            const ch = tk.chars[ci];
            const cx = px + ch.x;
            const sx = (cx + LW / 2) / LW;
            const stag = N > 1 ? ci / (N - 1) : 0;
            const tv = snap(VS + VD * (0.42 * sx + 0.18 * stag + 0.4 * hash2(tk.id * 61 + ci, 3)));
            const tr = snap(VS + VD + VB + RD * (0.46 * sx + 0.2 * stag + 0.34 * hash2(tk.id * 53 + ci, 9)));
            let a = 1, sc = 1;
            if (t < tv) a = 1;
            else if (t < tv + VF) { const k = (t - tv) / VF; a = 1 - easeIO(k); sc = 1 - CFG.vpop * easeIO(k); }
            else if (t < tr) a = 0;
            else if (t < tr + RI) { const k = (t - tr) / RI; a = easeIO(k); sc = (1 - CFG.vpop) + CFG.vpop * backOut(k); }
            if (a <= 0.004) continue;
            ctx.globalAlpha = row.dim * a;
            if (a >= 0.996 && Math.abs(sc - 1) < 0.004) { ctx.fillText(ch.c, cx, row.y); continue; }
            const dd = row.fs * 1.4 * CFG.vdrift * (1 - a);
            ctx.save();
            ctx.translate(cx + Math.cos(flow) * dd + ch.w / 2, row.y + Math.sin(flow) * dd * 0.7);
            ctx.scale(sc, sc);
            ctx.fillText(ch.c, -ch.w / 2, 0);
            ctx.restore();
          }
        }
      }
    }
    ctx.restore();

    // 비네트
    ctx.globalAlpha = 1;
    const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.72);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  // 백그라운드 전환 시에도 화면이 멈추지 않도록 저프레임 타이머로 대체한다.
  // 숨겨진 탭에서 대기하던 rAF 콜백을 취소하지 않으면
  // 화면 전환을 반복할수록 루프가 중복돼 애니메이션이 빨라지고 CPU가 오른다.
  let frame = 0;
  let fallbackTimer = null;
  let rafId = 0;
  const step = () => { renderFrame(frame % TOTAL); frame += 1; };
  function loop() { rafId = 0; step(); if (!document.hidden) rafId = requestAnimationFrame(loop); }
  function startLoop() {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      if (!fallbackTimer) fallbackTimer = window.setInterval(step, 1000 / 12);
      return;
    }
    if (fallbackTimer) { window.clearInterval(fallbackTimer); fallbackTimer = null; }
    if (rafId) return;
    rafId = requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", startLoop);

  let resizeTimer = null;
  const rebuild = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      build();
      step();
    }, 180);
  };
  window.addEventListener("resize", rebuild, { passive: true });

  // 패널 사진이 늦게 로드되면 캔버스가 0px 상태로 잡혀 화면이 뭉개진다.
  // 크기가 달라졌을 때만 다시 구성한다.
  function ensureSize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    if (Math.abs(rect.width - W) < 1 && Math.abs(rect.height - H) < 1) return;
    build();
    step();
  }
  const stagePhoto = canvas.closest(".lobby-stage")?.querySelector("img");
  if (stagePhoto && !stagePhoto.complete) stagePhoto.addEventListener("load", ensureSize, { once: true });
  window.setInterval(ensureSize, 1000);
  if ("ResizeObserver" in window) {
    try { new ResizeObserver(ensureSize).observe(canvas); } catch { /* 미지원 환경은 위 타이머로 대응 */ }
  }

  (async () => {
    if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* 폰트 대기 실패해도 진행 */ } }
    build();
    step();
    startLoop();
  })();
})();
