/* LED 패널 렌탈 · 값과 시간 계산 (예약 화면 · 작업 일정표가 같이 쓴다)
 *
 * 가격 — canon business.packages.ledWallRental 과 같은 값
 *   첫날(24시간) 260만원, 이틀째부터 하루 150만원, 광주·전라·경기·서울은 설치 추가비 30만원 (첫날 290만원)
 *   부가세·설치·철거·재생 PC 포함. 대여 시간은 24시간 단위로 올림한다 (72시간 = 3일, 73시간 = 4일).
 *
 * 시간 — 설치 기사는 대구에서 출발해 돌아온다.
 *   출발 = 시작 − 설치(3시간) − 이동     도착 = 시작 − 3시간     회수 = 끝 ~ 끝 + 1.5시간     복귀 = 회수 끝 + 이동
 *   출발부터 복귀까지가 한 예약이 장비와 기사를 쓰는 시간이다. 다른 예약은 이 사이에 못 들어온다.
 */
(function (global) {
  "use strict";

  var FIRST = 2600000, EXTRA = 1500000, REGION_FEE = 300000;
  var SETUP_H = 3, TEARDOWN_H = 1.5;
  var H = 3600e3, SEOUL = 9 * H;

  /* 대구 본거지에서 편도 이동 시간(시간) — 1톤 탑차 기준 넉넉히 */
  var REGIONS = [
    { name: "대구", fee: 0, travel: 1 },
    { name: "경북", fee: 0, travel: 2 },
    { name: "울산", fee: 0, travel: 2.5 },
    { name: "부산", fee: 0, travel: 2.5 },
    { name: "경남", fee: 0, travel: 2.5 },
    { name: "광주", fee: REGION_FEE, travel: 3.5 },
    { name: "전북", fee: REGION_FEE, travel: 3.5 },
    { name: "전남", fee: REGION_FEE, travel: 4 },
    { name: "경기", fee: REGION_FEE, travel: 4 },
    { name: "서울", fee: REGION_FEE, travel: 4 },
  ];
  var OTHER = ["인천", "강원", "대전", "세종", "충북", "충남", "제주"];   // 온라인 예약 대신 문의
  function region(n) { for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].name === n) return REGIONS[i]; return null; }

  var pad = function (n) { return String(n).padStart(2, "0"); };
  /* "2026-12-04T12:00" (서울 시각) → Date */
  function parse(s) { return new Date(s.length === 13 ? s + ":00:00+09:00" : s.length === 16 ? s + ":00+09:00" : s); }
  function local(dt) { var d = new Date(dt.getTime() + SEOUL); return d.toISOString().slice(0, 16); }
  function ymd(dt) { return local(dt).slice(0, 10); }
  function fmt(dt) {
    var d = new Date(dt.getTime() + SEOUL);
    return d.getUTCFullYear() + "년 " + (d.getUTCMonth() + 1) + "월 " + d.getUTCDate() + "일(" + "일월화수목금토"[d.getUTCDay()] + ") " +
      pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes());
  }
  function fmtShort(dt) {
    var d = new Date(dt.getTime() + SEOUL);
    return (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "(" + "일월화수목금토"[d.getUTCDay()] + ") " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes());
  }

  function days(start, end) { return Math.max(1, Math.ceil((end - start) / (24 * H) - 1e-9)); }
  function price(start, end, reg) {
    var r = region(reg), n = days(start, end);
    var fee = r ? r.fee : 0;
    return { days: n, first: FIRST, extraDays: n - 1, extra: EXTRA * (n - 1), fee: fee, total: FIRST + EXTRA * (n - 1) + fee };
  }
  function crew(start, end, reg) {
    var r = region(reg) || { travel: 4 };
    var arrive = new Date(start.getTime() - SETUP_H * H);
    var depart = new Date(arrive.getTime() - r.travel * H);
    var doneTear = new Date(end.getTime() + TEARDOWN_H * H);
    var back = new Date(doneTear.getTime() + r.travel * H);
    return { depart: depart, arrive: arrive, start: start, end: end, doneTear: doneTear, back: back, travel: r.travel };
  }
  /* 입금 기한: 설치 시작 24시간 전. 계약 다음 날 시작이면 12시간 전 */
  function deadline(start, now) {
    var nextDay = ymd(start) === ymd(new Date(now + 24 * H));
    return { at: new Date(start.getTime() - (nextDay ? 12 : 24) * H), nextDay: nextDay };
  }

  /* 막힌 구간 [from, to) 목록 */
  function blocks() {
    var out = [];
    (global.LED_CLOSED || []).forEach(function (c) {
      out.push({ from: parse(c[0] + "T00:00"), to: new Date(parse(c[1] + "T00:00").getTime() + 24 * H), why: "closed" });
    });
    (global.LED_BOOKINGS || []).forEach(function (b) {
      var c = crew(parse(b.start), parse(b.end), b.region);
      out.push({ from: c.depart, to: c.back, why: "booked", booking: b });
    });
    return out;
  }
  /* 새 예약이 들어갈 수 있는가 — 출발~복귀가 다른 막힌 구간과 겹치면 안 된다 */
  function conflict(start, end, reg) {
    var c = crew(start, end, reg), bs = blocks();
    for (var i = 0; i < bs.length; i++) if (c.depart < bs[i].to && bs[i].from < c.back) return bs[i];
    return null;
  }
  /* 하루 상태: "closed" 통째로 막힘 · "part" 일부 시간 막힘 · "" 비어 있음 */
  function dayState(ymdStr) {
    var a = parse(ymdStr + "T00:00"), b = new Date(a.getTime() + 24 * H), bs = blocks();
    var covered = 0, any = false;
    bs.forEach(function (x) {
      var f = Math.max(a, x.from), t = Math.min(b, x.to);
      if (t > f) { any = true; covered += t - f; }
    });
    if (!any) return "";
    return covered >= 24 * H - 1 ? "closed" : "part";
  }

  global.LEDOPS = {
    FIRST: FIRST, EXTRA: EXTRA, REGION_FEE: REGION_FEE, SETUP_H: SETUP_H, TEARDOWN_H: TEARDOWN_H,
    REGIONS: REGIONS, OTHER: OTHER, region: region, parse: parse, local: local, ymd: ymd, fmt: fmt, fmtShort: fmtShort,
    days: days, price: price, crew: crew, deadline: deadline, blocks: blocks, conflict: conflict, dayState: dayState,
    BANK: { name: "대구은행", number: "283-13-059978", holder: "박성실" },
    SUPPLIER: { company: "오늘은 봄날", ceo: "박성실", biz: "575-19-00976", addr: "대구광역시 수성구 동대구로 250, 102동 1층", phone: "010-4292-1999", email: "studio@publicbloom.art" },
  };
})(window);
