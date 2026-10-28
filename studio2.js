/* ArtWork Studio (2026-10-28 새 판)
 *
 * 손님이 할 일은 셋뿐이다: 작품 고르기 → 색·빠르기 보기 → 화면 규격과 연락처 적기.
 * 예전 판은 장소·분위기·색·규격·부가 옵션·추천·번호 불러오기가 한 화면에 다 있어 작품보다
 * 설정을 먼저 만났다. 이번 판은 작품 목록이 첫 화면이고, 설정은 크게 보기와 주문서로 미뤘다.
 *
 * 카드 미리보기는 미리 뽑은 30초 영상(works/studio-gl/preview/<id>.mp4)이다.
 * 크게 보기는 색마다 미리 렌더해 비메오에 올린 고화질 영상이다. 색을 누르면 그 색의 영상으로 바뀐다.
 * 작품 코드는 웹에 올리지 않는다(2026-10-28 대표: 주문이 들어오면 코드로 규격에 맞게 새로 렌더).
 * 목록은 catalog.js(SX_CATALOG, tools/build-studio-catalog.mjs 가 만든다). 주문은 /api/inquiry (새 API 없음).
 */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var BASE = "./works/studio-gl/";
  var MOOD = { calm: "차분한", vivid: "화려한", nature: "자연", geo: "조형", cosmos: "우주" };
  var state = { ratio: "16:9", mood: "all", work: null, pal: 0, speed: 1, picked: null };
  var WORKS = {};
  (window.SX_CATALOG || []).forEach(function (w) { WORKS[w.id] = w; });
  function get(id) { return WORKS[id]; }
  function radio(group, attr, val) {
    $$("[" + attr + "]", group).forEach(function (b) { b.setAttribute("aria-checked", String(b.getAttribute(attr) === String(val))); });
  }
  function swatchBg(colors) { return "linear-gradient(135deg," + colors.join(",") + ")"; }

  /* ── 목록 ─────────────────────────────────────────── */
  var grid = $("[data-grid]");
  function cards() {
    var list = window.SX_CATALOG || [];
    grid.innerHTML = list.map(function (w, i) {
      var moods = (w.mood || []).map(function (m) { return MOOD[m]; }).filter(Boolean).join(" · ");
      return '<article class="sx-card" data-id="' + w.id + '" data-moods="' + (w.mood || []).join(" ") + '">' +
        '<button type="button" class="sx-card-hit" aria-label="' + w.title + ' 크게 보기">' +
          '<span class="sx-card-media"><video muted loop playsinline preload="none" poster="' + BASE + 'preview/' + w.id + '.jpg" data-src="' + BASE + 'preview/' + w.id + '.mp4"></video></span>' +
          '<span class="sx-card-meta"><span class="sx-card-no">' + String(i + 1).padStart(2, "0") + '</span>' +
            '<strong>' + w.title + '</strong><em>' + w.en + '</em></span>' +
          '<span class="sx-card-desc">' + w.desc + '</span>' +
          '<span class="sx-card-foot"><span class="sx-dots">' + w.palettes.map(function (p) { return '<i style="background:' + swatchBg(p.colors) + '" title="' + p.name + '"></i>'; }).join("") + '</span><span>' + moods + '</span></span>' +
        '</button></article>';
    }).join("");
    // 화면에 보일 때만 영상을 받아 돌린다
    var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { if (!v.src) v.src = v.getAttribute("data-src"); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { rootMargin: "120px" }) : null;
    $$("video", grid).forEach(function (v) { if (io) io.observe(v); else { v.src = v.getAttribute("data-src"); v.autoplay = true; } });
    $$(".sx-card-hit", grid).forEach(function (b) {
      b.addEventListener("click", function () { open(b.closest(".sx-card").getAttribute("data-id")); });
    });
    filter();
  }
  function filter() {
    $$(".sx-card", grid).forEach(function (c) {
      c.hidden = state.mood !== "all" && (" " + c.getAttribute("data-moods") + " ").indexOf(" " + state.mood + " ") < 0;
    });
  }

  /* 화면 모양 · 분위기 */
  var ratioGroup = $("[data-ratio-group]"), moodGroup = $("[data-mood-group]");
  ratioGroup.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ratio]"); if (!b) return;
    state.ratio = b.getAttribute("data-ratio"); radio(ratioGroup, "data-ratio", state.ratio);
    var pick = { "16:9": "3840x2160", "2:1": "2064x1032", "9:16": "1080x1920", "32:9": "3840x1080" }[state.ratio];
    var sel = $("[data-screen]"); if (sel && pick) { sel.value = pick; syncScreen(); }
    if (view.open) frame();
  });
  moodGroup.addEventListener("click", function (e) {
    var b = e.target.closest("[data-mood]"); if (!b) return;
    state.mood = b.getAttribute("data-mood"); radio(moodGroup, "data-mood", state.mood); filter();
  });

  /* ── 크게 보기 ───────────────────────────────────── */
  var view = $("[data-view]"), stage = $("[data-stage]"), ifr = $("[data-frame]");
  function frame() {
    var r = state.ratio.split(":").map(Number);
    stage.style.aspectRatio = r[0] + " / " + r[1];
    stage.setAttribute("data-tall", String(r[1] > r[0]));
    // 영상은 16:9. 다른 화면 모양은 가운데를 꽉 채워 잘라 보여 준다 (납품은 그 규격으로 새로 렌더)
    var box = stage.getBoundingClientRect(), k = 16 / 9;
    var w = box.width, h = box.width / k;
    if (h < box.height) { h = box.height; w = h * k; }
    var fit = { width: w + "px", height: h + "px", left: (box.width - w) / 2 + "px", top: (box.height - h) / 2 + "px" };
    var url = get(state.work).palettes[state.pal].vimeo;
    var v = $("video", stage);
    if (url) {
      if (v) v.hidden = true;
      ifr.hidden = false; Object.assign(ifr.style, fit);
      var src = url + (url.indexOf("?") < 0 ? "?" : "&") + "background=1&quality=1080p";
      if (ifr.getAttribute("src") !== src) ifr.setAttribute("src", src);
      $("[data-live-note]").hidden = true;
      return;
    }
    // 아직 비메오에 없는 색: 미리 뽑은 영상(첫 번째 색)으로 대신
    ifr.hidden = true; ifr.removeAttribute("src");
    v = v || stage.appendChild(Object.assign(document.createElement("video"), { muted: true, loop: true, playsInline: true, autoplay: true }));
    v.hidden = false; v.className = "sx-view-fallback"; v.muted = true;
    var vs = BASE + "preview/" + state.work + ".mp4";
    if (v.getAttribute("src") !== vs) { v.setAttribute("src", vs); var pp = v.play(); if (pp && pp.catch) pp.catch(function () {}); }
    $("[data-live-note]").hidden = state.pal === 0;
  }
  function open(id) {
    var w = get(id); if (!w) return;
    state.work = id; state.pal = 0; state.speed = 1;
    $("[data-v-title]").textContent = w.title;
    $("[data-v-en]").textContent = w.en;
    $("[data-v-desc]").textContent = w.desc;
    $("[data-swatches]").innerHTML = w.palettes.map(function (p, i) {
      return '<button type="button" role="radio" aria-checked="' + (i === 0) + '" data-pal="' + i + '"><i style="background:' + swatchBg(p.colors) + '"></i>' + p.name + '</button>';
    }).join("");
    radio($("[data-speed-group]"), "data-speed", 1);
    if (typeof view.showModal === "function") view.showModal(); else view.setAttribute("open", "");
    requestAnimationFrame(frame);
    if (typeof window.gtag === "function") window.gtag("event", "view_item", { item_id: id, item_name: w.title });
  }
  function close() { ifr.removeAttribute("src"); if (view.open) view.close(); }
  $("[data-swatches]").addEventListener("click", function (e) {
    var b = e.target.closest("[data-pal]"); if (!b) return;
    state.pal = +b.getAttribute("data-pal"); radio($("[data-swatches]"), "data-pal", state.pal); frame();
  });
  $("[data-speed-group]").addEventListener("click", function (e) {
    var b = e.target.closest("[data-speed]"); if (!b) return;
    state.speed = +b.getAttribute("data-speed"); radio($("[data-speed-group]"), "data-speed", state.speed);
  });
  $("[data-close]").addEventListener("click", close);
  view.addEventListener("close", function () { ifr.removeAttribute("src"); });
  view.addEventListener("click", function (e) { if (e.target === view) close(); });
  $("[data-pick]").addEventListener("click", function () {
    var w = get(state.work);
    state.picked = { id: w.id, title: w.title, en: w.en, pal: w.palettes[state.pal].name, colors: w.palettes[state.pal].colors, speed: state.speed, ratio: state.ratio };
    paintPicked();
    close();
    $("#order").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ── 주문 ─────────────────────────────────────────── */
  var form = $("[data-form]"), msg = $("[data-msg]"), send = $("[data-send]");
  function paintPicked() {
    var p = state.picked, el = $("[data-picked]");
    if (!p) return;
    el.innerHTML = '<i style="background:' + swatchBg(p.colors) + '"></i><span><strong>' + p.title + '</strong> · ' + p.en +
      '<br /><small>색 ' + p.pal + ' · ' + (p.speed === 1 ? "보통 빠르기 · 30초 반복" : "느리게 · 60초 반복") + '</small></span>' +
      '<button type="button" class="sx-link" data-repick>다른 작품</button>';
    el.setAttribute("data-on", "");
    $("[data-repick]", el).addEventListener("click", function () { $("#studio").scrollIntoView({ behavior: "smooth" }); });
  }
  function syncScreen() { $("[data-custom]").hidden = $("[data-screen]").value !== "custom"; }
  $("[data-screen]").addEventListener("change", syncScreen);
  $$('input[name="buyer"]', form).forEach(function (r) {
    r.addEventListener("change", function () { $("[data-org-label]").textContent = form.buyer.value === "shop" ? "매장 · 상호" : "기관명"; });
  });
  function say(t, tone) { msg.textContent = t; if (tone) msg.setAttribute("data-tone", tone); else msg.removeAttribute("data-tone"); }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(form);
    var v = function (k) { return String(d.get(k) || "").trim(); };
    var shop = v("buyer") === "shop";
    if (!state.picked) { say("먼저 작품을 골라 주세요.", "err"); $("#studio").scrollIntoView({ behavior: "smooth" }); return; }
    if (!v("organization")) { say(shop ? "매장 이름을 적어 주세요." : "기관명을 적어 주세요.", "err"); return; }
    if (!v("name")) { say("담당자 이름을 적어 주세요.", "err"); return; }
    if (v("phone").replace(/\D/g, "").length < 9) { say("연락처를 적어 주세요.", "err"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) { say("이메일 주소를 다시 확인해 주세요.", "err"); return; }
    if (!d.get("consent")) { say("주문 처리를 위한 수집 동의가 필요합니다.", "err"); return; }
    var scr = v("screen") === "custom" ? (v("w") + "×" + v("h") + " (직접 입력)") : (v("screen") === "unknown" ? "잘 모르겠음 · 상담 때 확인" : v("screen").replace("x", "×"));
    var p = state.picked;
    var lines = [
      "주문자: " + (shop ? "매장·개인 / 결제 희망: 카드 또는 계좌이체" : "기관·기업 / 결제: 세금계산서"),
      "",
      "작품: " + p.title + " (" + p.en + ", 코드 " + p.id + ")",
      "색: " + p.pal + " · 빠르기: " + (p.speed === 1 ? "보통 (30초 반복)" : "느리게 (60초 반복)"),
      "화면: " + scr + " · 미리 본 화면 모양 " + p.ratio,
      v("note") ? "남길 말: " + v("note") : "",
      "",
      "[동의 기록] 개인정보 수집·이용: 동의함"
    ].filter(function (x, i, a) { return x !== "" || (a[i - 1] !== ""); }).join("\n");
    send.disabled = true; say("보내는 중…");
    fetch("/api/inquiry", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: v("name"), email: v("email"), phone: v("phone"), organization: v("organization"),
        service: [shop ? "작품 주문 · 매장/개인 (ArtWork Studio)" : "작품 주문 · 기관/기업 (ArtWork Studio)"], page: "studio", message: lines })
    }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
      .then(function () {
        if (typeof window.gtag === "function") window.gtag("event", "generate_lead", { lead_source: "studio_order", buyer_type: shop ? "shop" : "org", artwork: p.title });
        if (typeof window.bnTrack === "function") window.bnTrack("inquiry");
        form.reset(); send.disabled = false;
        say("주문을 받았습니다. 평일 하루 안에 " + v("email") + " 로 금액과 결제 방법을 보내 드립니다.", "ok");
      })
      .catch(function () { send.disabled = false; say("전송이 되지 않았습니다. 010-4292-1999 또는 studio@publicbloom.art 로 연락 주세요.", "err"); });
  });

  cards();
  window.addEventListener("resize", function () { if (view.open) frame(); });
})();
