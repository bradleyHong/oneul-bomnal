/* 미디어아트 제작 AX — 담당자가 직접 쓰는 제작 요청 창구
 *
 * 담당자는 한 번에 다 적지 못합니다. 화면 규격을 시설팀에 물어보러 갔다가
 * 돌아오고, 예산을 확인하러 나갔다 옵니다. 그래서 적는 즉시 이 브라우저에
 * 저장하고, 다시 들어오면 그대로 이어서 쓰게 합니다.
 *
 * 서버에 저장하지 않습니다. 저장할 곳이 아직 없고, 있는 척하면 담당자가
 * 다른 PC에서 열었을 때 내용이 사라져 신뢰를 잃습니다. 화면에도 그렇게 적어둡니다.
 *
 * 제출은 기존 /api/inquiry를 그대로 씁니다. 그쪽은 메일 전송이 실패해도
 * 접수 기록을 서버 로그에 반드시 남기므로, 요청이 증발하지 않습니다.
 */
(function () {
  "use strict";

  var STORE = "bomnal.ax.draft.v1";
  var form = document.querySelector("[data-ax-form]");
  if (!form) return;

  var steps = [].slice.call(document.querySelectorAll("[data-ax-step]"));
  var panels = [].slice.call(document.querySelectorAll("[data-ax-panel]"));
  var status = document.querySelector("[data-ax-status]");
  var session = null;

  /* ── 단계 이동 ────────────────────────────────────────── */

  function show(key) {
    steps.forEach(function (s) {
      s.classList.toggle("is-on", s.getAttribute("data-ax-step") === key);
    });
    panels.forEach(function (p) {
      p.hidden = p.getAttribute("data-ax-panel") !== key;
    });
  }

  steps.forEach(function (s, i) {
    s.addEventListener("click", function () {
      show(s.getAttribute("data-ax-step"));
    });
    s.addEventListener("keydown", function (e) {
      var next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = steps[(i + 1) % steps.length];
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = steps[(i - 1 + steps.length) % steps.length];
      else if (e.key === "Home") next = steps[0];
      else if (e.key === "End") next = steps[steps.length - 1];
      if (!next) return;
      e.preventDefault();
      next.focus();
      show(next.getAttribute("data-ax-step"));
    });
  });

  /* ── 값 읽고 쓰기 ─────────────────────────────────────── */

  function value(name) {
    var els = form.elements[name];
    if (!els) return "";
    if (els instanceof RadioNodeList || (els.length && !els.tagName)) {
      var checked = [];
      [].forEach.call(els, function (el) {
        if (el.type === "checkbox" || el.type === "radio") {
          if (el.checked) checked.push(el.value);
        } else if (el.value) checked.push(el.value);
      });
      return checked.join(", ");
    }
    return (els.value || "").trim();
  }

  function snapshot() {
    var out = {};
    [].forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked) (out[el.name] = out[el.name] || []).push(el.value);
      } else {
        out[el.name] = el.value;
      }
    });
    return out;
  }

  function restore(data) {
    if (!data) return;
    [].forEach.call(form.elements, function (el) {
      if (!el.name || !(el.name in data)) return;
      var v = data[el.name];
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = Array.isArray(v) && v.indexOf(el.value) !== -1;
      } else {
        el.value = v;
      }
    });
  }

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(snapshot()));
    } catch (e) {
      /* 사생활 보호 모드에서는 저장이 막힙니다. 작성은 그대로 되게 둡니다. */
    }
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "null");
    } catch (e) {
      return null;
    }
  }

  /* ── 보내기 전 확인 ───────────────────────────────────── */

  var join = function (parts) {
    return parts.filter(Boolean).join(" · ") || "—";
  };

  function review() {
    var q = function (sel) { return document.querySelector(sel); };
    q("[data-ax-review-site]").textContent = join([
      value("screen"), value("ratio"), value("resolution"), value("duration"), value("place"), value("light"),
    ]);
    q("[data-ax-review-data]").textContent = join([value("source"), value("dbNote")]);
    q("[data-ax-review-brief]").textContent = join([
      value("theme"), value("reference"), value("ci"), value("font"), value("avoid"),
    ]);
    q("[data-ax-review-deliver]").textContent = join([
      value("deliver"), value("schedule"), value("budget"), "재생 PC: " + (value("pc") || "—"),
    ]);
  }

  form.addEventListener("input", function () { save(); review(); });
  form.addEventListener("change", function () { save(); review(); });

  /* ── 제출 ─────────────────────────────────────────────── */

  function brief() {
    return [
      "[미디어아트 제작 AX 요청]",
      "",
      "■ 01 현장 규격",
      "· 화면 종류: " + (value("screen") || "—"),
      "· 비율 / 해상도: " + join([value("ratio"), value("resolution")]),
      "· 재생 길이: " + (value("duration") || "—"),
      "· 설치 장소: " + (value("place") || "—"),
      "· 밝기 · 주변 조건: " + (value("light") || "—"),
      "",
      "■ 02 데이터 연결",
      "· 연결할 데이터: " + (value("source") || "—"),
      "· 기관 DB 설명: " + (value("dbNote") || "—"),
      "",
      "■ 03 원하는 방향",
      "· 주제 · 소재: " + (value("theme") || "—"),
      "· 참고: " + (value("reference") || "—"),
      "· CI · 색: " + (value("ci") || "—"),
      "· 서체: " + (value("font") || "—"),
      "· 피하고 싶은 것: " + (value("avoid") || "—"),
      "",
      "■ 04 납품 형태",
      "· 형태: " + (value("deliver") || "—"),
      "· 희망 일정: " + (value("schedule") || "—"),
      "· 재생 PC: " + (value("pc") || "—"),
    ].join("\n");
  }

  function say(text, kind) {
    if (!status) return;
    status.textContent = text;
    status.dataset.kind = kind || "";
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    var name = value("name");
    var phone = value("phone");
    if (!name || !phone) {
      say("담당자 이름과 연락처를 적어 주세요. 시안을 어디로 보낼지 알아야 합니다.", "warn");
      (form.elements[name ? "phone" : "name"] || {}).focus?.();
      return;
    }

    var btn = form.querySelector("[data-ax-submit]");
    if (btn) { btn.disabled = true; btn.textContent = "보내는 중…"; }
    say("보내는 중입니다.");

    var payload = {
      organization: (session && (session.org || session.id)) || value("name"),
      name: name,
      phone: phone,
      email: value("email"),
      service: ["미디어아트 제작 AX"],
      budget: value("budget"),
      message: brief(),
      page: "/ax-studio",
    };

    try {
      var res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("status " + res.status);
      say("접수됐습니다. 확인 후 24시간 이내에 연락드리고, 시안 3종은 1주일 이내에 보내드립니다.", "ok");
      if (btn) btn.textContent = "접수 완료";
      return;
    } catch (err) {
      /* 접수 창구가 막혔을 때 담당자를 빈손으로 돌려보내지 않는다.
         적은 내용을 그대로 담아 메일 앱을 열어 준다. */
      say("접수 창구에 연결하지 못했습니다. 메일 앱을 엽니다. 급하시면 010-4292-1999로 연락 주세요.", "warn");
      if (btn) { btn.disabled = false; btn.textContent = "제작 요청 보내기"; }
      var mail =
        "mailto:studio@publicbloom.art?subject=" +
        encodeURIComponent("[미디어아트 제작 AX] " + payload.organization) +
        "&body=" +
        encodeURIComponent(payload.message + "\n\n담당자: " + name + " / " + phone + " / " + payload.email);
      location.href = mail;
    }
  });

  var resetBtn = form.querySelector("[data-ax-reset]");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (!confirm("작성한 내용을 모두 지웁니다. 계속할까요?")) return;
      try { localStorage.removeItem(STORE); } catch (e) { /* 무시 */ }
      form.reset();
      review();
      show("site");
      say("지웠습니다. 처음부터 작성하시면 됩니다.");
    });
  }

  /* ── 시작 ─────────────────────────────────────────────── */

  restore(load());
  review();
  show("site");

  (async function () {
    try {
      var res = await fetch("/api/session", { cache: "no-store" });
      session = await res.json();
      if (!session.loggedIn) {
        location.href = "/login?next=/ax-studio&expired=1";
        return;
      }
      var who = session.org || session.id;
      document.getElementById("axOrg").textContent = who;
      document.getElementById("axWelcome").textContent = who + " 담당자님, 환영합니다.";
    } catch (e) {
      /* 세션 조회가 실패해도 화면은 그대로 둡니다. 접근 차단은 미들웨어가 합니다. */
    }
  })();
})();
