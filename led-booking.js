/* LED 패널 렌탈 · 일정 → 견적서(메일·QR) → 전자계약 → 입금 안내
 *
 * 서버를 새로 두지 않는다.
 *  - 막힌 시간은 led-booking-data.js 에서 읽고, 설치·회수·이동 시간은 led-ops.js 가 붙인다.
 *  - 견적서·계약서는 브라우저가 그림(PNG)으로 만들어 문의폼과 같은 길(formsubmit)로
 *    회사 메일에 보내고, 손님에게도 사본이 간다(_cc).
 *  - 견적서 안의 QR(주소 ?q=…)에는 일정·장소·손님 정보가 들어 있다. 찍으면 이 화면이
 *    그 내용을 그대로 펴고 바로 전자계약 단계로 간다. 금액은 주소에서 읽지 않고 다시 계산한다.
 *
 * 예약은 입금이 확인되어야 확정이다. 이 화면이 시간을 잡아 두지는 않는다.
 */
(function () {
  "use strict";
  var O = window.LEDOPS;
  var FORM_URL = "https://formsubmit.co/ajax/studio@publicbloom.art";
  var SITE = "https://publicbloom.art/led-booking";
  var HOURS = []; for (var h = 6; h <= 22; h++) HOURS.push(h);
  var H = 3600e3;

  var $ = function (q, el) { return (el || document).querySelector(q); };
  var won = function (n) { return n.toLocaleString("ko-KR") + "원"; };
  var man = function (n) { return (n / 10000).toLocaleString("ko-KR") + "만원"; };
  var pad = function (n) { return String(n).padStart(2, "0"); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function addDays(d, n) { var x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  function fmtDay(d) { var x = new Date(d + "T00:00:00Z"); return (x.getUTCMonth() + 1) + "월 " + x.getUTCDate() + "일(" + "일월화수목금토"[x.getUTCDay()] + ")"; }
  function today() { return O.ymd(new Date()); }

  /* ── 상태 ─────────────────────────────────────────────── */
  var S = { sDay: "", eDay: "", sHour: 12, eHour: 12, region: "", address: "", event: "",
            org: "", name: "", phone: "", email: "", biz: "", quoteNo: "", viewMonth: "" };
  function startAt() { return S.sDay ? O.parse(S.sDay + "T" + pad(S.sHour)) : null; }
  function endAt() { return S.eDay ? O.parse(S.eDay + "T" + pad(S.eHour)) : null; }
  function place() {
    var a = S.address, r = S.region;
    var long = { "경북": "경상북도", "경남": "경상남도", "전남": "전라남도", "전북": "전라북도", "경기": "경기도" }[r];
    return (a.indexOf(r) === 0 || (long && a.indexOf(long) === 0)) ? a : r + " " + a;
  }

  /* ── 1단계: 달력 (시작일 → 끝일 두 번 누른다) ───────────── */
  var cal = $("[data-cal]");
  function dayOpen(d) { return d > today() && O.dayState(d) !== "closed"; }
  function firstOpen() { var d = addDays(today(), 1); for (var i = 0; i < 400; i++) { if (dayOpen(d)) return d; d = addDays(d, 1); } return d; }
  function renderCal() {
    var ym = S.viewMonth, y = +ym.slice(0, 4), m = +ym.slice(5, 7);
    var lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), n = new Date(Date.UTC(y, m, 0)).getUTCDate();
    var html = '<div class="bk-cal-head"><button type="button" data-cal-prev aria-label="이전 달">‹</button><b>' + y + "년 " + m +
      '월</b><button type="button" data-cal-next aria-label="다음 달">›</button></div><div class="bk-cal-grid">' +
      "일월화수목금토".split("").map(function (w) { return '<span class="bk-w">' + w + "</span>"; }).join("");
    for (var i = 0; i < lead; i++) html += "<span></span>";
    for (var dd = 1; dd <= n; dd++) {
      var d = ym + "-" + pad(dd), st = O.dayState(d), open = dayOpen(d);
      var inRange = S.sDay && d >= S.sDay && d <= (S.eDay || S.sDay);
      var cls = "bk-d" + (open ? "" : " is-off") + (st === "closed" && d > today() ? " is-full" : "") + (st === "part" ? " is-part" : "") +
        (inRange ? " is-sel" : "") + (d === S.sDay || d === S.eDay ? " is-start" : "");
      var tag = st === "closed" && d > today() ? "<small>마감</small>" : st === "part" ? "<small>일부</small>" : "";
      html += '<button type="button" class="' + cls + '" data-day="' + d + '"' + (open ? "" : " disabled") + ' aria-label="' + fmtDay(d) +
        (st === "closed" ? " 예약 마감" : st === "part" ? " 일부 시간 예약됨" : "") + '">' + dd + tag + "</button>";
    }
    cal.innerHTML = html + "</div>";
  }
  cal.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-cal-prev") || b.hasAttribute("data-cal-next")) {
      var y = +S.viewMonth.slice(0, 4), m = +S.viewMonth.slice(5, 7) + (b.hasAttribute("data-cal-next") ? 1 : -1);
      if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
      var next = y + "-" + pad(m); if (next < today().slice(0, 7)) return;
      S.viewMonth = next; renderCal();
      $("[data-cal-hint]").textContent = O.dayState(next + "-15") === "closed" ? "이 달은 예약이 모두 찼습니다." : hintText();
      return;
    }
    var d = b.getAttribute("data-day"); if (!d || b.disabled) return;
    if (!S.sDay || S.eDay || d < S.sDay) { S.sDay = d; S.eDay = ""; }      // 시작일
    else { S.eDay = d; }                                                  // 끝일
    renderCal(); $("[data-cal-hint]").textContent = hintText(); sync1();
  });
  function hintText() {
    if (!S.sDay) return "달력에서 시작일을 누르세요.";
    if (!S.eDay) return fmtDay(S.sDay) + " 시작 · 이제 끝나는 날을 누르세요 (같은 날이면 한 번 더).";
    return fmtDay(S.sDay) + " → " + fmtDay(S.eDay);
  }

  var f1 = $("[data-step1]");
  var sHourSel = $("[name=sHour]"), eHourSel = $("[name=eHour]"), regionSel = $("[name=region]");
  var hourOpts = HOURS.map(function (x) { return '<option value="' + x + '">' + pad(x) + ":00</option>"; }).join("");
  sHourSel.innerHTML = hourOpts; eHourSel.innerHTML = hourOpts; sHourSel.value = "12"; eHourSel.value = "12";
  regionSel.innerHTML = '<option value="">설치 지역을 고르세요</option>' +
    '<optgroup label="첫날 260만원">' + O.REGIONS.filter(function (r) { return !r.fee; }).map(function (r) { return "<option>" + r.name + "</option>"; }).join("") + "</optgroup>" +
    '<optgroup label="첫날 290만원 (설치 추가비 30만원)">' + O.REGIONS.filter(function (r) { return r.fee; }).map(function (r) { return "<option>" + r.name + "</option>"; }).join("") + "</optgroup>" +
    '<optgroup label="온라인 예약 대신 문의">' + O.OTHER.map(function (r) { return "<option>" + r + "</option>"; }).join("") + "</optgroup>";
  ["change", "input"].forEach(function (ev) {
    f1.addEventListener(ev, function () {
      S.sHour = +sHourSel.value; S.eHour = +eHourSel.value; S.region = regionSel.value;
      S.address = $("[name=address]").value.trim(); S.event = $("[name=event]").value.trim();
      sync1();
    });
  });

  function problem1() {
    var s = startAt(), e = endAt();
    if (!S.sDay) return "달력에서 시작일을 고르세요.";
    if (!S.eDay) return "달력에서 끝나는 날을 고르세요.";
    if (e - s < 12 * H) return "대여는 최소 12시간입니다 (24시간 요금). 끝 시각을 늦춰 주세요.";
    if (s.getTime() - Date.now() < 13 * H) return "시작 시각이 너무 가깝습니다. 지금부터 13시간 뒤부터 잡을 수 있습니다.";
    if (!S.region) return "설치 지역을 고르세요.";
    if (!O.region(S.region)) return S.region + " 지역은 운송 일정을 따로 맞춰야 해서 온라인 예약 대신 문의로 받습니다.";
    var c = O.conflict(s, e, S.region);
    if (c) return c.why === "closed" ? "고른 기간(설치·회수 이동 시간 포함)에 예약이 찬 날이 들어 있습니다." :
      "그 시간에는 다른 현장 설치·회수·이동이 잡혀 있습니다 (" + O.fmtShort(c.from) + " ~ " + O.fmtShort(c.to) + "). 시간을 옮겨 주세요.";
    if (S.address.length < 6) return "설치 주소를 적어 주세요.";
    return "";
  }
  function summaryHtml() {
    var s = startAt(), e = endAt(), q = O.price(s, e, S.region), dl = O.deadline(s, Date.now()), c = O.crew(s, e, S.region);
    return "<dl>" +
      "<div><dt>대여</dt><dd>" + O.fmt(s) + " ~ " + O.fmt(e) + "<small>" + Math.round((e - s) / H) + "시간 · " + q.days + "일 요금</small></dd></div>" +
      "<div><dt>설치 · 회수</dt><dd>" + O.fmtShort(c.arrive) + " 도착해 설치 · " + O.fmtShort(c.doneTear) + "까지 회수</dd></div>" +
      "<div><dt>첫날 (24시간)</dt><dd>" + man(q.first + q.fee) + (q.fee ? "<small>설치 추가비 30만원 포함 (" + S.region + ")</small>" : "") + "</dd></div>" +
      (q.extraDays ? "<div><dt>추가 " + q.extraDays + "일</dt><dd>" + man(q.extra) + "<small>하루 150만원</small></dd></div>" : "") +
      "<div><dt>미디어아트</dt><dd>17편 무료 송출<small>렌탈 기간 내내</small></dd></div>" +
      '<div class="is-total"><dt>합계 · 부가세 포함</dt><dd>' + won(q.total) + "</dd></div>" +
      "<div><dt>입금 기한</dt><dd>" + O.fmt(dl.at) + "<small>" + (dl.nextDay ? "다음 날 시작 · 12시간 전" : "시작 24시간 전") + "</small></dd></div>" +
      "</dl>";
  }
  function sync1() {
    var box = $("[data-summary]"), p = problem1();
    var priceable = S.sDay && S.eDay && O.region(S.region) && endAt() - startAt() >= 12 * H;
    box.innerHTML = priceable ? summaryHtml() : '<p class="bk-muted">기간과 지역을 고르면 금액과 입금 기한이 나옵니다.</p>';
    $("[data-step1-msg]").textContent = p;
    $("[data-to-step2]").disabled = !!p;
    $("[data-other]").hidden = !(S.region && !O.region(S.region));
  }
  $("[data-to-step2]").addEventListener("click", function () { if (!problem1()) { $("[data-quote-summary]").innerHTML = summaryHtml(); show(2); } });

  /* ── 2단계: 견적서 받기 ───────────────────────────────── */
  var f2 = $("[data-step2]");
  function val(form, n) { var el = form.querySelector("[name=" + n + "]"); return el ? el.value.trim() : ""; }
  function readCustomer(form) { ["org", "name", "phone", "email", "biz"].forEach(function (n) { if (form.querySelector("[name=" + n + "]")) S[n] = val(form, n); }); }
  function fillCustomer(form) { ["org", "name", "phone", "email", "biz"].forEach(function (n) { var el = form.querySelector("[name=" + n + "]"); if (el && S[n]) el.value = S[n]; }); }
  function problemCustomer() {
    if (!S.org) return "업체명(기관명)을 적어 주세요.";
    if (!S.name) return "담당자 이름을 적어 주세요.";
    if (!/^[0-9\-+() ]{9,20}$/.test(S.phone)) return "연락처를 숫자로 적어 주세요.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(S.email)) return "견적서를 받을 이메일을 적어 주세요.";
    return "";
  }
  function sync2() { readCustomer(f2); var p = problemCustomer(); $("[data-step2-msg]").textContent = p; $("[data-send-quote]").disabled = !!p; }
  f2.addEventListener("input", sync2);
  $("[data-back-1]").addEventListener("click", function () { show(1); });

  /* 견적 코드 — 주소에 실어 QR 로 만든다. 일정·장소·손님 정보만 담는다(금액은 다시 계산). */
  function encodeQ() {
    var o = { v: 1, n: S.quoteNo, s: S.sDay + "T" + pad(S.sHour), e: S.eDay + "T" + pad(S.eHour), r: S.region, a: S.address, ev: S.event,
              o: S.org, m: S.name, p: S.phone, em: S.email, b: S.biz };
    var bytes = new TextEncoder().encode(JSON.stringify(o)), bin = "";
    bytes.forEach(function (x) { bin += String.fromCharCode(x); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodeQ(code) {
    try {
      var b = atob(code.replace(/-/g, "+").replace(/_/g, "/")), arr = new Uint8Array(b.length);
      for (var i = 0; i < b.length; i++) arr[i] = b.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(arr));
    } catch (e) { return null; }
  }
  function contractUrl() { return SITE + "?q=" + encodeQ(); }

  function qrCanvas(text, size) {
    var qr = window.qrcode(0, "M"); qr.addData(unescape(encodeURIComponent(text)), "Byte"); qr.make();
    var n = qr.getModuleCount(), q = 4, cell = Math.max(1, Math.floor(size / (n + q * 2))), cv = document.createElement("canvas");
    cv.width = cv.height = cell * (n + q * 2);
    var c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = "#000";
    for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (qr.isDark(r, k)) c.fillRect((k + q) * cell, (r + q) * cell, cell, cell);
    return cv;
  }

  var seal = new Image(); seal.src = "./assets/contract/seal.png";
  var FONT = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", sans-serif';
  /* 낱말(띄어쓰기) 단위로 줄을 바꾼다. 한 낱말이 한 줄보다 길 때만 글자 단위로 자른다. */
  function wrap(ctx, text, maxW) {
    var out = [], line = "";
    String(text).split(" ").forEach(function (word) {
      var t = line ? line + " " + word : word;
      if (ctx.measureText(t).width <= maxW) { line = t; return; }
      if (line) out.push(line);
      if (ctx.measureText(word).width <= maxW) { line = word; return; }
      line = "";
      Array.from(word).forEach(function (ch) { if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; });
    });
    if (line) out.push(line);
    return out;
  }
  async function ready() {
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
    if (!seal.complete) await new Promise(function (r) { seal.onload = r; seal.onerror = r; });
  }
  function stamp(ctx, cx, cy, size) {
    if (!seal.complete || !seal.naturalWidth) return;
    ctx.globalAlpha = 0.9; ctx.drawImage(seal, cx - size / 2, cy - size / 2, size, size * seal.naturalHeight / seal.naturalWidth); ctx.globalAlpha = 1;
  }
  function supplierBlock(ctx, x, y, w, title) {
    var sp = O.SUPPLIER;
    ctx.font = "800 24px " + FONT; ctx.fillStyle = "#111"; ctx.fillText(title, x, y); y += 40;
    ctx.font = "500 20px " + FONT; ctx.fillStyle = "#222";
    var rows = ["상호: " + sp.company, "대표: " + sp.ceo + "   (인)", "사업자등록번호: " + sp.biz, "주소: " + sp.addr, "연락처: " + sp.phone];
    var ceoY = 0, ceoEnd = 0;
    rows.forEach(function (r, i) {
      wrap(ctx, r, w).forEach(function (l) { ctx.fillText(l, x, y); if (i === 1) { ceoY = y; ceoEnd = x + ctx.measureText(l).width; } y += 30; });
    });
    stamp(ctx, ceoEnd - 14, ceoY - 8, 88);        // 도장: (인) 위에, 이름과 상호를 반쯤 덮는다
    return y;
  }
  function finish(cv, W, y) { var out = document.createElement("canvas"); out.width = W; out.height = y; out.getContext("2d").drawImage(cv, 0, 0); return out; }

  /* 견적서 그림 */
  function renderQuote(issuedAt) {
    var W = 1240, M = 90, CW = W - M * 2, cv = document.createElement("canvas"); cv.width = W; cv.height = 2200;
    var ctx = cv.getContext("2d"), s = startAt(), e = endAt(), q = O.price(s, e, S.region), dl = O.deadline(s, Date.now()), c = O.crew(s, e, S.region);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, 2200); ctx.textBaseline = "alphabetic";
    var y = 116;
    ctx.fillStyle = "#111"; ctx.font = "800 48px " + FONT; ctx.textAlign = "center"; ctx.fillText("견 적 서", W / 2, y); y += 40;
    ctx.font = "500 19px " + FONT; ctx.fillStyle = "#666"; ctx.fillText("LED 패널 렌탈 · 견적번호 " + S.quoteNo + " · 발행 " + O.fmt(issuedAt), W / 2, y); ctx.textAlign = "left"; y += 60;
    var top = y, colW = CW / 2 - 24;
    ctx.font = "800 24px " + FONT; ctx.fillStyle = "#111"; ctx.fillText("받는 곳", M, y); y += 40;
    ctx.font = "500 20px " + FONT; ctx.fillStyle = "#222";
    ["업체명: " + S.org, "담당자: " + S.name, "연락처: " + S.phone, "이메일: " + S.email].forEach(function (r) { wrap(ctx, r, colW).forEach(function (l) { ctx.fillText(l, M, y); y += 30; }); });
    var yL = y; y = supplierBlock(ctx, M + CW / 2 + 24, top, colW, "공급자"); y = Math.max(y, yL) + 30;
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.strokeRect(M, y, CW, 86);
    ctx.font = "700 26px " + FONT; ctx.fillStyle = "#111"; ctx.fillText("합계 (부가세 포함)", M + 26, y + 54);
    ctx.textAlign = "right"; ctx.font = "800 36px " + FONT; ctx.fillText(won(q.total), M + CW - 26, y + 56); ctx.textAlign = "left"; y += 86 + 40;
    var cols = [M, M + 640, M + 800, M + CW];
    function row(a, b, cc, bold) {
      ctx.font = (bold ? "700 " : "500 ") + "21px " + FONT; ctx.fillStyle = "#111";
      var la = wrap(ctx, a, cols[1] - cols[0] - 24);
      la.forEach(function (l, i) { ctx.fillText(l, cols[0] + 12, y + 34 + i * 28); });
      ctx.fillText(b, cols[1] + 12, y + 34);
      ctx.textAlign = "right"; ctx.fillText(cc, cols[3] - 12, y + 34); ctx.textAlign = "left";
      var hgt = 20 + la.length * 28 + 6;
      ctx.strokeStyle = "#ccc"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(M, y + hgt); ctx.lineTo(M + CW, y + hgt); ctx.stroke();
      y += hgt;
    }
    ctx.fillStyle = "#eef3e0"; ctx.fillRect(M, y, CW, 54); row("항목", "수량", "금액", true);
    row("LED 패널 렌탈 첫날 (24시간) · 6장 3.84 × 1.92m · 설치·철거·재생 PC 포함", "1일", won(q.first));
    if (q.fee) row("설치 추가비 (" + S.region + ")", "1식", won(q.fee));
    if (q.extraDays) row("추가 대여 (장비값 · 하루 1,500,000원)", q.extraDays + "일", won(q.extra));
    row("오늘은 봄날 미디어아트 송출", "기간 내", "무료");
    y += 36;
    var qrSize = 300, qrX = M + CW - qrSize, infoTop = y;
    ctx.font = "700 22px " + FONT; ctx.fillStyle = "#111"; ctx.fillText("일정 · 장소 · 입금", M, y); y += 36;
    ctx.font = "500 20px " + FONT; ctx.fillStyle = "#222";
    ["대여: " + O.fmt(s) + " ~ " + O.fmt(e) + " (" + Math.round((e - s) / H) + "시간)",
     "설치: " + O.fmtShort(c.arrive) + " 도착 · 시작 전 완료",
     "회수: " + O.fmtShort(e) + " ~ " + O.fmtShort(c.doneTear),
     "장소: " + place() + (S.event ? " (행사: " + S.event + ")" : ""),
     "입금 기한: " + O.fmt(dl.at),
     "입금 계좌: " + O.BANK.name + " " + O.BANK.number + " (예금주 " + O.BANK.holder + ")"]
      .forEach(function (r) { wrap(ctx, r, CW - qrSize - 40).forEach(function (l) { ctx.fillText(l, M, y); y += 30; }); });
    ctx.drawImage(qrCanvas(contractUrl(), qrSize), qrX, infoTop - 10, qrSize, qrSize);
    ctx.font = "700 18px " + FONT; ctx.fillStyle = "#111"; ctx.textAlign = "center";
    ctx.fillText("QR을 찍으면 전자계약", qrX + qrSize / 2, infoTop + qrSize + 14); ctx.textAlign = "left";
    y = Math.max(y, infoTop + qrSize + 30) + 24;
    ctx.font = "500 18px " + FONT; ctx.fillStyle = "#555";
    ["· 이 견적의 일정은 전자계약과 입금이 끝나야 확정됩니다. 그 전에 다른 계약이 먼저 입금되면 일정이 바뀔 수 있습니다.",
     "· 대여료 전액은 시작 24시간 전까지(다음 날 시작이면 12시간 전까지) 입금해 주셔야 렌탈이 진행됩니다.",
     "· 대여 중 물품이 파손되거나 도난당하면 물품 가격을 배상합니다. 설치 때 고장 난 패널은 저희가 대체 패널로 바꿔 드립니다."]
      .forEach(function (r) { wrap(ctx, r, CW).forEach(function (l) { ctx.fillText(l, M, y); y += 28; }); y += 4; });
    return finish(cv, W, y + 50);
  }

  function toBlob(cv) { return new Promise(function (r) { cv.toBlob(r, "image/png"); }); }
  async function post(fields, file, fileName, fileField, fallbackMsg) {
    try {
      var fd = new FormData();
      Object.keys(fields).forEach(function (k) { fd.append(k, fields[k]); });
      if (file) fd.append(fileField, new File([file], fileName, { type: "image/png" }));
      var res = await fetch(FORM_URL, { method: "POST", body: fd, headers: { Accept: "application/json" } });
      if (res.ok) return true;
    } catch (e) {}
    try {
      var r2 = await fetch("/api/inquiry", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ organization: S.org, name: S.name, phone: S.phone, email: S.email, service: ["LED 패널 렌탈"], message: fallbackMsg, page: location.pathname }) });
      return r2.ok;
    } catch (e) { return false; }
  }
  function crewText() {
    var c = O.crew(startAt(), endAt(), S.region);
    return "대구 출발 " + O.fmtShort(c.depart) + " → 현장 도착·설치 " + O.fmtShort(c.arrive) + " → 시작 " + O.fmtShort(c.start) +
      " → 회수 " + O.fmtShort(c.end) + "~" + O.fmtShort(c.doneTear) + " → 대구 복귀 " + O.fmtShort(c.back) + " (편도 약 " + c.travel + "시간)";
  }

  var quoteBlobUrl = "";
  $("[data-send-quote]").addEventListener("click", async function () {
    sync2(); if (problemCustomer()) return;
    var btn = this; btn.disabled = true; btn.textContent = "견적서 만드는 중…";
    S.quoteNo = "Q" + today().replace(/-/g, "").slice(2) + "-" + Math.floor(1000 + Math.random() * 9000);
    await ready();
    var cv = renderQuote(new Date()), blob = await toBlob(cv), name = "오늘은봄날_LED렌탈견적서_" + S.quoteNo + ".png";
    var q = O.price(startAt(), endAt(), S.region);
    var sent = await post({
      _subject: "[LED 렌탈 견적] " + S.org + " · " + fmtDay(S.sDay) + " · " + won(q.total),
      _template: "table", _captcha: "false", _cc: S.email, _replyto: S.email,
      "단계": "견적서 발송 (계약 전)", "견적번호": S.quoteNo, "업체명": S.org, "담당자": S.name, "연락처": S.phone, "이메일": S.email,
      "대여": O.fmt(startAt()) + " ~ " + O.fmt(endAt()), "장소": place(), "행사": S.event || "-", "합계(부가세 포함)": won(q.total),
      "전자계약 바로가기": contractUrl(), "설치 기사 일정": crewText(),
    }, blob, name, "견적서", "[견적서] " + S.quoteNo + "\n" + contractUrl());
    if (typeof window.bnTrack === "function") window.bnTrack("inquiry");
    if (typeof window.gtag === "function") window.gtag("event", "led_quote", { value: q.total / 10000 });
    if (quoteBlobUrl) URL.revokeObjectURL(quoteBlobUrl);
    quoteBlobUrl = URL.createObjectURL(blob);
    $("[data-quote-img]").src = quoteBlobUrl;
    var dl = $("[data-quote-download]"); dl.href = quoteBlobUrl; dl.download = name;
    $("[data-quote-sent]").textContent = sent ? S.email + "로 견적서를 보냈습니다. 메일 속 QR을 찍거나 아래 단추로 바로 계약할 수 있습니다."
      : "메일을 보내지 못했습니다. 견적서를 내려받아 두시고 아래 단추로 바로 계약하시거나 010-4292-1999로 연락 주세요.";
    $("[data-quote-done]").hidden = false;
    btn.textContent = "견적서 다시 받기"; btn.disabled = false;
  });
  $("[data-to-step3]").addEventListener("click", function () { goContract(); });

  /* ── 3단계: 전자계약 ──────────────────────────────────── */
  function clauses() {
    var s = startAt(), e = endAt(), q = O.price(s, e, S.region), dl = O.deadline(s, Date.now()), b = O.BANK;
    return [
      ["제1조 (목적)", "을은 갑에게 스탠드형 LED 패널(P1.86 GOB, 640 × 1920mm) 6장을 이어 붙인 화면(3.84m × 1.92m)과 재생 PC를 대여하고, 설치와 철거를 수행한다."],
      ["제2조 (대여 기간과 장소)", "대여 기간은 " + O.fmt(s) + "부터 " + O.fmt(e) + "까지(" + Math.round((e - s) / H) + "시간)이다. 을은 시작 시각 전에 설치를 마치고, 끝 시각 이후 회수한다. 설치 장소: " + place() + (S.event ? " (행사: " + S.event + ")" : "") + "."],
      ["제3조 (대여료)", "첫날(24시간) " + won(q.first) + (q.fee ? ", 설치 추가비(" + S.region + ") " + won(q.fee) : "") + (q.extraDays ? ", 추가 " + q.extraDays + "일 " + won(q.extra) + "(하루 " + won(O.EXTRA) + ")" : "") + ", 합계 " + won(q.total) + "(부가세 포함). 대여 시간은 24시간 단위로 올려 계산한다. 설치·철거·재생 PC 세팅을 포함하며, 대여 기간 동안 을의 미디어아트를 무료로 송출한다. 기관 홍보 영상 제작은 별도 계약으로 한다."],
      ["제4조 (입금과 렌탈 진행)", "갑은 대여료 전액(100%)을 설치 시작 24시간 전까지 아래 계좌로 입금한다. 계약 다음 날 시작하는 경우에는 설치 12시간 전까지 입금이 확인되어야 한다. 이 계약의 입금 기한은 " + O.fmt(dl.at) + "이다. 입금이 확인된 뒤에 렌탈을 진행하며, 기한까지 입금이 확인되지 않으면 렌탈은 진행되지 않는다. 입금 계좌: " + b.name + " " + b.number + " (예금주 " + b.holder + ")."],
      ["제5조 (설치 중 고장)", "설치 때 패널이 고장 나면 을이 대체 패널을 설치한다. 이 경우 갑에게 추가 비용을 청구하지 않는다."],
      ["제6조 (파손과 도난)", "대여 기간 중 물품이 파손되거나 도난당한 경우 갑은 해당 물품의 가격을 을에게 배상한다."],
      ["제7조 (갑이 준비할 것)", "콘센트 두 회로(최대 약 3.6kW), 폭 4m 남짓한 평평한 바닥, 장비 반입 동선과 설치·회수 시간의 출입을 갑이 마련한다."],
      ["제8조 (기타)", "이 계약에 정하지 않은 사항은 갑과 을이 협의하여 정하고, 협의가 되지 않으면 일반 상관례에 따른다. 이 계약은 전자 서명으로 체결하며 갑과 을이 각각 사본을 보관한다."],
    ];
  }
  var f3 = $("[data-step3]");
  function goContract() {
    $("[data-contract-body]").innerHTML = clauses().map(function (c) { return "<h3>" + c[0] + "</h3><p>" + esc(c[1]) + "</p>"; }).join("");
    fillCustomer(f3);
    show(3);
  }

  var padEl = $("[data-sign]"), sctx = padEl.getContext("2d"), signed = false, drawing = false, last = null;
  function sizePad() {
    var r = padEl.getBoundingClientRect(), dpr = Math.max(1, window.devicePixelRatio || 1);
    if (!r.width) return;
    var keep = signed ? padEl.toDataURL() : null;
    padEl.width = Math.round(r.width * dpr); padEl.height = Math.round(r.height * dpr);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0); sctx.lineCap = "round"; sctx.lineJoin = "round"; sctx.strokeStyle = "#111"; sctx.lineWidth = 2.6;
    if (keep) { var im = new Image(); im.onload = function () { sctx.drawImage(im, 0, 0, r.width, r.height); }; im.src = keep; }
  }
  function pos(e) { var r = padEl.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  padEl.addEventListener("pointerdown", function (e) { drawing = true; last = pos(e); try { padEl.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
  padEl.addEventListener("pointermove", function (e) {
    if (!drawing) return; var p = pos(e);
    sctx.beginPath(); sctx.moveTo(last.x, last.y); sctx.lineTo(p.x, p.y); sctx.stroke(); last = p;
    if (!signed) { signed = true; sync3(); }
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { padEl.addEventListener(ev, function () { drawing = false; }); });
  $("[data-sign-clear]").addEventListener("click", function () { sctx.clearRect(0, 0, padEl.width, padEl.height); signed = false; sync3(); });
  window.addEventListener("resize", function () { if (!$("[data-step='3']").hidden) sizePad(); });

  function problem3() {
    readCustomer(f3);
    var p = problemCustomer(); if (p) return p;
    if (f3.querySelectorAll("[data-agree]:not(:checked)").length) return "계약 조항 확인란에 모두 체크해 주세요.";
    if (!signed) return "서명란에 서명해 주세요.";
    var s = startAt(); if (s.getTime() - Date.now() < 13 * H) return "시작 시각이 너무 가까워졌습니다. 일정을 다시 골라 주세요.";
    if (O.conflict(s, endAt(), S.region)) return "그 사이 일정이 찼습니다. 일정을 다시 골라 주세요.";
    return "";
  }
  function sync3() { var p = problem3(); $("[data-step3-msg]").textContent = p; $("[data-sign-btn]").disabled = !!p; }
  f3.addEventListener("input", sync3); f3.addEventListener("change", sync3);
  $("[data-back-2]").addEventListener("click", function () { show(S.quoteNo ? 2 : 1); });

  function renderContract(signedAt, contractNo) {
    var W = 1240, M = 96, CW = W - M * 2, cv = document.createElement("canvas"); cv.width = W; cv.height = 3000;
    var ctx = cv.getContext("2d"), q = O.price(startAt(), endAt(), S.region);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, 3000); ctx.fillStyle = "#111";
    var y = 120;
    ctx.font = "800 46px " + FONT; ctx.textAlign = "center"; ctx.fillText("LED 패널 렌탈 계약서", W / 2, y); y += 44;
    ctx.font = "500 19px " + FONT; ctx.fillStyle = "#555";
    ctx.fillText("계약번호 " + contractNo + (S.quoteNo ? " · 견적 " + S.quoteNo : "") + " · 전자 서명 " + O.fmt(signedAt), W / 2, y); y += 56;
    ctx.textAlign = "left"; ctx.fillStyle = "#111"; ctx.font = "500 22px " + FONT;
    wrap(ctx, "임차인(이하 \"갑\") " + S.org + "과(와) 임대인(이하 \"을\") " + O.SUPPLIER.company + "은(는) 다음과 같이 LED 패널 렌탈 계약을 맺는다.", CW).forEach(function (l) { ctx.fillText(l, M, y); y += 34; });
    y += 18;
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.strokeRect(M, y, CW, 84);
    ctx.font = "700 26px " + FONT; ctx.fillText("계약 금액 (부가세 포함)", M + 24, y + 52);
    ctx.textAlign = "right"; ctx.font = "800 34px " + FONT; ctx.fillText(won(q.total), M + CW - 24, y + 54); ctx.textAlign = "left"; y += 84 + 48;
    clauses().forEach(function (c) {
      ctx.font = "700 24px " + FONT; ctx.fillStyle = "#111"; ctx.fillText(c[0], M, y); y += 40;
      ctx.font = "500 22px " + FONT; ctx.fillStyle = "#222";
      wrap(ctx, c[1], CW).forEach(function (l) { ctx.fillText(l, M, y); y += 34; }); y += 18;
    });
    y += 20; ctx.fillStyle = "#111"; ctx.font = "500 22px " + FONT; ctx.textAlign = "center";
    var d = new Date(signedAt.getTime() + 9 * H);
    ctx.fillText(d.getUTCFullYear() + "년 " + (d.getUTCMonth() + 1) + "월 " + d.getUTCDate() + "일", W / 2, y); y += 60; ctx.textAlign = "left";
    var colW = CW / 2 - 20, top = y, yy = top;
    ctx.font = "800 24px " + FONT; ctx.fillText("갑 (임차인)", M, yy); yy += 40; ctx.font = "500 20px " + FONT; ctx.fillStyle = "#222";
    ["업체명: " + S.org, "계약자: " + S.name, "연락처: " + S.phone, "이메일: " + S.email].concat(S.biz ? ["사업자등록번호: " + S.biz] : [])
      .forEach(function (r) { wrap(ctx, r, colW).forEach(function (l) { ctx.fillText(l, M, yy); yy += 30; }); });
    ctx.fillStyle = "#555"; ctx.fillText("서명", M, yy + 18);
    var sigW = 300, sigH = sigW * padEl.height / padEl.width;
    ctx.drawImage(padEl, M + 70, yy - 30, sigW, sigH);
    var yB = supplierBlock(ctx, M + CW / 2 + 20, top, colW, "을 (임대인)");
    y = Math.max(yy + sigH, yB) + 40;
    ctx.font = "500 17px " + FONT; ctx.fillStyle = "#888";
    ctx.fillText("이 계약서는 publicbloom.art 렌탈 예약 화면에서 전자 서명으로 작성되었습니다.", M, y);
    return finish(cv, W, y + 50);
  }

  $("[data-sign-btn]").addEventListener("click", async function () {
    if (problem3()) return;
    var btn = this; btn.disabled = true; btn.textContent = "계약서 만드는 중…";
    var contractNo = "LED-" + today().replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);
    var signedAt = new Date();
    await ready();
    var cv = renderContract(signedAt, contractNo), blob = await toBlob(cv), name = "오늘은봄날_LED렌탈계약서_" + contractNo + ".png";
    var s = startAt(), e = endAt(), q = O.price(s, e, S.region), dl = O.deadline(s, Date.now());
    var sent = await post({
      _subject: "[LED 렌탈 계약] " + S.org + " · " + fmtDay(S.sDay) + " · " + won(q.total),
      _template: "table", _captcha: "false", _cc: S.email, _replyto: S.email,
      "단계": "전자계약 서명 완료 · 입금 확인 대기", "계약번호": contractNo, "견적번호": S.quoteNo || "-",
      "업체명": S.org, "계약자": S.name, "연락처": S.phone, "이메일": S.email, "사업자등록번호": S.biz || "-",
      "대여": O.fmt(s) + " ~ " + O.fmt(e), "장소": place(), "행사": S.event || "-",
      "합계(부가세 포함)": won(q.total), "입금 기한": O.fmt(dl.at), "입금 계좌": O.BANK.name + " " + O.BANK.number + " " + O.BANK.holder,
      "설치 기사 일정": crewText(), "요청 사항": val(f3, "note") || "-",
      "일정표에 더할 줄 (입금 확인 후)": '{ start: "' + O.local(s) + '", end: "' + O.local(e) + '", region: "' + S.region + '", no: "' + contractNo + '" },',
    }, blob, name, "계약서", "[계약] " + contractNo + "\n" + crewText());
    if (typeof window.bnTrack === "function") window.bnTrack("inquiry");
    if (typeof window.gtag === "function") window.gtag("event", "led_booking_contract", { value: q.total / 10000 });
    var url = URL.createObjectURL(blob);
    $("[data-done-no]").textContent = contractNo;
    $("[data-done-amount]").textContent = won(q.total);
    $("[data-done-deadline]").textContent = O.fmt(dl.at);
    $("[data-done-bank]").textContent = O.BANK.name + " " + O.BANK.number;
    $("[data-done-holder]").textContent = "예금주 " + O.BANK.holder;
    $("[data-done-who]").textContent = S.org + " " + S.name;
    var dlA = $("[data-done-download]"); dlA.href = url; dlA.download = name;
    $("[data-done-img]").src = url;
    $("[data-done-sent]").hidden = !sent; $("[data-done-fail]").hidden = sent;
    show(4);
  });
  $("[data-copy-bank]").addEventListener("click", function () {
    var t = O.BANK.number.replace(/-/g, "");
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { $("[data-copy-bank]").textContent = "복사했습니다"; });
  });

  /* ── 단계 넘기기 ───────────────────────────────────────── */
  function show(n) {
    document.querySelectorAll("[data-step]").forEach(function (s) { s.hidden = s.getAttribute("data-step") !== String(n); });
    document.querySelectorAll("[data-dot]").forEach(function (d) {
      var k = +d.getAttribute("data-dot"); d.classList.toggle("is-on", k === n); d.classList.toggle("is-done", k < n);
    });
    if (n === 2) { fillCustomer(f2); sync2(); }
    if (n === 3) { sizePad(); sync3(); }
    var top = $("[data-steps]").getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: top, behavior: "smooth" });
  }

  /* ── 시작 ──────────────────────────────────────────────── */
  var fo = firstOpen();
  $("[data-open-from]").textContent = fmtDay(fo);
  S.viewMonth = fo.slice(0, 7);
  /* 처음 보여 줄 달: 예약할 수 있는 첫날이 있는 달. 그 앞이 막혀 있으면 언제까지 막혔는지 알린다 */
  (function () {
    var lastClosed = addDays(fo, -1);
    if (lastClosed > today() && O.dayState(lastClosed) === "closed") {
      $("[data-cal-hint]").textContent = fmtDay(lastClosed) + "까지는 예약이 찼습니다. " + fmtDay(fo) + "부터 고를 수 있습니다.";
    } else $("[data-cal-hint]").textContent = hintText();
  })();

  // 견적서 QR 로 들어온 경우: 내용을 펴고 바로 전자계약으로
  var code = new URLSearchParams(location.search).get("q");
  var data = code ? decodeQ(code) : null;
  if (data && data.s && data.e) {
    S.sDay = data.s.slice(0, 10); S.sHour = +data.s.slice(11, 13); S.eDay = data.e.slice(0, 10); S.eHour = +data.e.slice(11, 13);
    S.region = data.r || ""; S.address = data.a || ""; S.event = data.ev || "";
    S.org = data.o || ""; S.name = data.m || ""; S.phone = data.p || ""; S.email = data.em || ""; S.biz = data.b || ""; S.quoteNo = data.n || "";
    sHourSel.value = String(S.sHour); eHourSel.value = String(S.eHour); regionSel.value = S.region;
    $("[name=address]").value = S.address; $("[name=event]").value = S.event;
    S.viewMonth = S.sDay.slice(0, 7);
    renderCal(); sync1(); $("[data-cal-hint]").textContent = hintText();
    var banner = $("[data-q-banner]"), p = problem1();
    if (!p) { banner.textContent = "견적서 " + (S.quoteNo || "") + " 내용으로 계약서를 채웠습니다."; banner.hidden = false; goContract(); }
    else { banner.textContent = "견적서의 일정을 그대로 쓸 수 없습니다: " + p + " 일정을 다시 골라 주세요."; banner.hidden = false; }
  } else { renderCal(); sync1(); }
})();
