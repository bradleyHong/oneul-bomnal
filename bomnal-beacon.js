/*
 * 오늘은 봄날 방문·연락 집계 (2026-10-12) — 기록은 상상연필 서버(/api/track/bomnal)로 보낸다.
 * 상상연필 관리자 화면 「오늘은 봄날」에서 본다. 대표 지시: "상상연필 어드민에 봄날 애널리틱스 붙이자".
 *
 * 개인정보를 보내지 않는다: 익명 방문자 id(이 브라우저에 만든 무작위 문자열), 유입 사이트의 호스트만,
 * 광고 클릭 여부(참/거짓), utm. IP·브라우저 정보는 서버가 저장하지 않는다.
 * 30분 동안 아무 페이지도 안 보면 다음 조회는 새 방문으로 센다(상상연필과 같은 규칙).
 * 연락: tel: 링크 = call, 카카오 링크 = kakao, 견적문의 폼 접수 = inquiry(inquiry.js 가 window.bnTrack 을 부른다).
 */
(function () {
  "use strict";
  var URL_ = "https://www.visionpencil.co.kr/api/track/bomnal";
  var VID = "bn_vid", SES = "bn_ses", IDLE = 30 * 60 * 1000;
  var mem = {};
  function get(store, k) { try { return window[store].getItem(k); } catch (e) { return mem[store + k] || null; } }
  function set(store, k, v) { try { window[store].setItem(k, v); } catch (e) { mem[store + k] = v; } }
  function rid() {
    try { return crypto.randomUUID().replace(/-/g, "").slice(0, 20); }
    catch (e) { return (Date.now().toString(36) + Math.random().toString(36).slice(2)).slice(0, 20); }
  }
  function post(obj) {
    var body = JSON.stringify(obj);
    try { if (navigator.sendBeacon && navigator.sendBeacon(URL_, body)) return; } catch (e) {}
    try { fetch(URL_, { method: "POST", body: body, keepalive: true, mode: "no-cors" }); } catch (e) {}
  }

  var vid = get("localStorage", VID);
  if (!vid) { vid = rid(); set("localStorage", VID, vid); }
  var now = Date.now(), s = null, start = false;
  try { s = JSON.parse(get("sessionStorage", SES) || "null"); } catch (e) { s = null; }
  var path = decodeURI(location.pathname);
  if (!s || now - s.t > IDLE) {
    var q = new URLSearchParams(location.search), host;
    try { var h = document.referrer ? new URL(document.referrer).hostname : ""; if (h && h !== location.hostname) host = h; } catch (e) {}
    s = { t: now, l: path, r: host, us: q.get("utm_source") || undefined, um: q.get("utm_medium") || undefined,
          uc: q.get("utm_campaign") || undefined, fb: q.has("fbclid"), g: q.has("gclid") };
    start = true;
  }
  s.t = now;
  set("sessionStorage", SES, JSON.stringify(s));
  function base() {
    return { vid: vid, landing: s.l, ref: s.r, utm_source: s.us, utm_medium: s.um, utm_campaign: s.uc, fb: !!s.fb, g: !!s.g };
  }
  var visit = base(); visit.t = "visit"; visit.path = path; visit.start = start;
  post(visit);

  window.bnTrack = function (kind) {
    var ev = base(); ev.t = "event"; ev.kind = kind; ev.page = decodeURI(location.pathname);
    post(ev);
  };
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (/^tel:/i.test(href)) window.bnTrack("call");
    else if (/kakao\.com|kakaotalk/i.test(href)) window.bnTrack("kakao");
  }, true);
})();
