/* 홈 화면의 두 인터랙션: 미디어아트 AX 데이터 선택기와 설치 현장 탭
 *
 * 둘 다 진행형 향상(progressive enhancement)입니다. 이 파일이 로드되지 않아도
 * 첫 항목의 설명과 네 개의 설치 패널이 HTML에 그대로 들어 있어 읽을 수 있습니다.
 * 스크립트는 "감추고 바꾸는" 일만 합니다.
 *
 * 키보드: 탭 목록 안에서 ←→로 이동하고 Home/End로 양 끝으로 갑니다.
 * 공공기관 담당자 중에 키보드만 쓰는 분이 있어 마우스 없이도 다 돌아가야 합니다.
 */
(function () {
  "use strict";

  /* 데이터 소스별 문구. 여기 적힌 값은 캐논(canon/canon.json)의
     business.scopes.ax와 business.capabilities에 근거한 것만 씁니다.
     예시 응답은 형식을 보여주는 예시일 뿐 실측값이 아니므로 "예시 응답"으로 표시합니다. */
  var SOURCES = {
    weather: {
      node: "기상청 날씨",
      title: "날씨가 화면의 색을 정합니다",
      desc:
        "기온 · 습도 · 일출입 시각을 읽어 색온도와 속도를 정합니다. " +
        "아침 화면과 한밤중 화면이 같지 않습니다.",
      uses: [
        "일출입에 맞춘 낮 · 밤 전환",
        "그날 날씨에 따른 색 · 속도 변화",
        "연동이 없으면 4K 영상으로 대체",
      ],
      sample: "GET /weather/daegu → 기온 12.4 · 습도 54 · 풍속 2.1",
    },
    air: {
      node: "에어코리아 대기질",
      title: "대기질이 화면의 밀도를 정합니다",
      desc:
        "초미세먼지 농도에 따라 입자 수와 시야가 달라집니다. " +
        "공기가 나쁜 날에는 화면도 탁해집니다.",
      uses: [
        "등급에 따른 입자 수 · 시야 변화",
        "야외활동 가능 여부를 색으로 표시",
        "측정소 갱신 주기에 맞춰 자동 반영",
      ],
      sample: "GET /airkorea/daegu → PM2.5 18 · 등급 좋음",
    },
    db: {
      node: "기관 보유 DB",
      title: "기관의 데이터가 화면의 내용이 됩니다",
      desc:
        "행사 일정, 이용자 수, 지역 소식이 타이포와 흐름으로 나타납니다. " +
        "영상을 갈아 끼우지 않아도 됩니다.",
      uses: [
        "행사 일정 · 이용 현황 연동",
        "다국어 타이포 미디어아트",
        "기관 CI · 컬러 · 서체 반영",
      ],
      sample: "GET /institution/events → 이번 주 등록 행사 24건",
    },
  };

  /* 탭 목록 하나를 키보드로 돌 수 있게 만든다. AX 칩과 설치 탭이 같은 규칙을 쓴다. */
  function wireTablist(tabs, activate) {
    function focusTab(i) {
      var next = tabs[(i + tabs.length) % tabs.length];
      next.focus();
      activate(next);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        activate(tab);
      });
      tab.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          focusTab(i + 1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          focusTab(i - 1);
        } else if (e.key === "Home") {
          e.preventDefault();
          focusTab(0);
        } else if (e.key === "End") {
          e.preventDefault();
          focusTab(tabs.length - 1);
        }
      });
    });
  }

  function mountAx() {
    var root = document.querySelector("[data-ax-explorer]");
    if (!root) return;

    var chips = [].slice.call(root.querySelectorAll("[data-ax-source]"));
    var detail = root.querySelector("#ax-detail");
    var titleEl = root.querySelector("[data-ax-title]");
    var descEl = root.querySelector("[data-ax-desc]");
    var usesEl = root.querySelector("[data-ax-uses]");
    var sampleEl = root.querySelector("[data-ax-sample]");
    var nodeEl = root.querySelector("[data-ax-node]");
    if (!chips.length || !titleEl || !descEl || !usesEl || !sampleEl) return;

    function activate(chip) {
      var data = SOURCES[chip.getAttribute("data-ax-source")];
      if (!data) return;

      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle("is-on", on);
        c.setAttribute("aria-selected", String(on));
        c.tabIndex = on ? 0 : -1;
      });

      titleEl.textContent = data.title;
      descEl.textContent = data.desc;
      sampleEl.textContent = data.sample;
      if (nodeEl) nodeEl.textContent = data.node;
      if (detail) detail.setAttribute("aria-labelledby", chip.id);

      usesEl.textContent = "";
      data.uses.forEach(function (u) {
        var li = document.createElement("li");
        li.textContent = u;
        usesEl.appendChild(li);
      });
    }

    wireTablist(chips, activate);
  }

  function mountInstall() {
    var root = document.querySelector("[data-install-tabs]");
    if (!root) return;

    var tabs = [].slice.call(root.querySelectorAll("[data-install-tab]"));
    var panels = [].slice.call(root.querySelectorAll("[data-install-panel]"));
    if (!tabs.length || tabs.length !== panels.length) return;

    // 스크립트가 살아 있을 때만 패널을 감춘다. 이 클래스가 붙기 전에는
    // 네 패널이 모두 펼쳐진 채로 보이므로 스크립트가 죽어도 내용이 사라지지 않는다.
    root.classList.add("is-enhanced");

    function activate(tab) {
      var key = tab.getAttribute("data-install-tab");
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle("is-on", on);
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p) {
        p.hidden = p.getAttribute("data-install-panel") !== key;
      });
    }

    wireTablist(tabs, activate);

    var current = tabs.filter(function (t) {
      return t.getAttribute("aria-selected") === "true";
    })[0];
    activate(current || tabs[0]);
  }

  function mount() {
    mountAx();
    mountInstall();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
