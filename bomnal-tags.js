/* 마케팅 측정 태그 — 메타 픽셀 · 네이버 애널리틱스(광고 전환) · 구글 애즈 전환
 *
 * 번호(ID)만 아래 칸에 넣으면 켜진다. 비어 있으면 아무것도 불러오지 않는다.
 * 페이지마다 이미 GA4 이벤트를 쏘고 있으므로(gtag 'event'), 그 이벤트를 그대로
 * 메타·네이버·구글 애즈 전환으로 옮겨 준다. 새로 이벤트를 심을 필요가 없다.
 *
 *   GA4 이벤트             메타                    네이버(wcs.cnv)   구글 애즈
 *   contact_click         Contact                 5 기타            contact
 *   quote_cta_click       QuoteClick(맞춤)        —                 —
 *   led_quote             Lead (견적서 발송)       4 신청·예약       lead
 *   led_booking_contract  SubmitApplication(계약) 4 신청·예약       contract
 *   inquiry (문의폼)       Lead                    5 기타            lead
 *
 * 개인정보: 이름·연락처·이메일은 어떤 태그에도 보내지 않는다(금액만).
 * 개인정보처리방침에 "행태정보 수집(메타·네이버·구글)" 항목이 함께 적혀 있어야 한다.
 */
(function () {
  "use strict";
  var CFG = {
    META_PIXEL_ID: "",          // 예: "1234567890123456"  (메타 이벤트 관리자 → 데이터 세트 ID)
    NAVER_WA_ID: "",            // 예: "s_1a2b3c4d5e6f"     (네이버 애널리틱스 → 사이트 ID)
    GOOGLE_ADS_ID: "",          // 예: "AW-123456789"
    GOOGLE_ADS_LABELS: {        // 구글 애즈 → 전환 → 태그 설정의 라벨
      contact: "", lead: "", contract: "",
    },
  };

  function load(src, onload) {
    var s = document.createElement("script"); s.async = true; s.src = src;
    if (onload) s.onload = onload;
    document.head.appendChild(s);
  }

  /* ── 메타 픽셀 ── */
  if (CFG.META_PIXEL_ID) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; }(window, document);
    load("https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", CFG.META_PIXEL_ID);
    window.fbq("track", "PageView");
  }

  /* ── 네이버 애널리틱스 + 광고 전환 ── */
  var naverReady = false, naverQueue = [];
  if (CFG.NAVER_WA_ID) {
    load("https://wcs.naver.net/wcslog.js", function () {
      window.wcs_add = window.wcs_add || {}; window.wcs_add.wa = CFG.NAVER_WA_ID;
      if (window.wcs) { window.wcs.inflow && window.wcs.inflow("publicbloom.art"); window.wcs_do(); }
      naverReady = true; naverQueue.splice(0).forEach(naverConv);
    });
  }
  function naverConv(c) {
    if (!CFG.NAVER_WA_ID) return;
    if (!naverReady || !window.wcs) { naverQueue.push(c); return; }
    window._nasa = { cnv: window.wcs.cnv(c.type, String(c.value || 1)) };
    window.wcs_do(window._nasa);
  }

  /* ── 구글 애즈 ── */
  function gads(kind, value) {
    var label = CFG.GOOGLE_ADS_LABELS[kind];
    if (!CFG.GOOGLE_ADS_ID || !label || !origGtag) return;
    origGtag("event", "conversion", { send_to: CFG.GOOGLE_ADS_ID + "/" + label, value: value || 0, currency: "KRW" });
  }

  /* GA4 이벤트를 가로채 다른 곳으로도 보낸다 */
  var origGtag = window.gtag;
  if (CFG.GOOGLE_ADS_ID && origGtag) origGtag("config", CFG.GOOGLE_ADS_ID);
  function forward(name, params) {
    var won = params && params.value ? Math.round(params.value * 10000) : 0;   // GA4 value 는 만원 단위로 보낸다
    var fb = window.fbq;
    if (name === "contact_click") { fb && fb("track", "Contact", { method: params && params.method }); naverConv({ type: "5" }); gads("contact"); }
    else if (name === "quote_cta_click") { fb && fb("trackCustom", "QuoteClick"); }
    else if (name === "led_quote") { fb && fb("track", "Lead", { value: won, currency: "KRW", content_name: "LED 렌탈 견적서" }); naverConv({ type: "4", value: won }); gads("lead", won); }
    else if (name === "led_booking_contract") { fb && fb("track", "SubmitApplication", { value: won, currency: "KRW", content_name: "LED 렌탈 전자계약" }); naverConv({ type: "4", value: won }); gads("contract", won); }
  }
  if (origGtag) {
    window.gtag = function () {
      origGtag.apply(this, arguments);
      try { if (arguments[0] === "event") forward(arguments[1], arguments[2]); } catch (e) {}
    };
  }
  /* 문의폼 접수는 bnTrack("inquiry") 로 알린다 (inquiry.js · led-booking.js) */
  var origTrack = window.bnTrack;
  window.bnTrack = function (kind) {
    if (typeof origTrack === "function") { try { origTrack.apply(this, arguments); } catch (e) {} }
    if (kind === "inquiry") { window.fbq && window.fbq("track", "Lead"); naverConv({ type: "5" }); gads("lead"); }
  };
})();
