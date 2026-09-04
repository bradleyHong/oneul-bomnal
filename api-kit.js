/**
 * 공공 API 복붙 키트
 *
 * 기관 담당자가 지역만 고르면 화면에 물릴 API 주소와 최소 코드가 나옵니다.
 * 인증키가 없고 브라우저에서 바로 호출되는 API(Open-Meteo)만 다룹니다.
 * data.go.kr 계열은 인증키가 노출되고 CORS가 막혀 복붙으로 되지 않으므로
 * 여기에 넣지 않습니다. 그쪽은 서버 중계가 필요하다고 안내합니다.
 */
(function () {
  "use strict";

  // 대표 좌표. Open-Meteo 격자가 약 11km라 구·군 대표점이면 충분합니다.
  var PLACES = [
    ["대구광역시", [
      ["중구", 35.8694, 128.6062], ["동구", 35.8865, 128.6356],
      ["서구", 35.8720, 128.5591], ["남구", 35.8461, 128.5975],
      ["북구", 35.8858, 128.5828], ["수성구", 35.8583, 128.6306],
      ["달서구", 35.8300, 128.5327], ["달성군", 35.7746, 128.4313],
      ["군위군", 36.2429, 128.5729]]],
    ["경상북도", [
      ["경주시", 35.8562, 129.2247], ["안동시", 36.5684, 128.7294],
      ["구미시", 36.1195, 128.3446], ["포항시", 36.0190, 129.3435],
      ["김천시", 36.1398, 128.1136], ["영주시", 36.8057, 128.6240],
      ["상주시", 36.4109, 128.1590], ["고령군", 35.7266, 128.2628]]],
    ["부산광역시", [
      ["중구", 35.1064, 129.0322], ["서구", 35.0979, 129.0243],
      ["해운대구", 35.1631, 129.1636], ["사하구", 35.1045, 128.9747]]],
    ["그 밖", [
      ["울산광역시", 35.5384, 129.3114], ["창원시", 35.2280, 128.6811],
      ["서울특별시", 37.5665, 126.9780]]]
  ];

  var WEATHER_FIELDS = "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,cloud_cover";
  var AIR_FIELDS = "pm10,pm2_5,european_aqi";

  function urls(lat, lon) {
    var common = "latitude=" + lat + "&longitude=" + lon + "&timezone=Asia%2FSeoul";
    return {
      weather: "https://api.open-meteo.com/v1/forecast?" + common + "&current=" + WEATHER_FIELDS,
      air: "https://air-quality-api.open-meteo.com/v1/air-quality?" + common + "&current=" + AIR_FIELDS
    };
  }

  function snippet(label, u) {
    return [
      "// " + label + " — 화면에 물릴 실시간 값",
      "// 인증키가 필요 없고 브라우저에서 바로 호출됩니다.",
      "async function loadLive() {",
      "  const [w, a] = await Promise.all([",
      "    fetch(" + JSON.stringify(u.weather) + ").then(r => r.json()),",
      "    fetch(" + JSON.stringify(u.air) + ").then(r => r.json())",
      "  ]);",
      "  return {",
      "    기온:      w.current.temperature_2m,      // °C",
      "    습도:      w.current.relative_humidity_2m, // %",
      "    풍속:      w.current.wind_speed_10m,       // km/h",
      "    미세먼지:   a.current.pm10,                 // ㎍/㎥",
      "    초미세먼지: a.current.pm2_5                 // ㎍/㎥",
      "  };",
      "}",
      "",
      "loadLive().then(v => console.log(v));"
    ].join("\n");
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var root = document.querySelector("#api-kit");
    if (!root) return;

    var sel = root.querySelector("[data-kit-place]");
    var out = root.querySelectorAll("[data-kit-out]");
    if (!sel) return;

    PLACES.forEach(function (grp) {
      var og = document.createElement("optgroup");
      og.label = grp[0];
      grp[1].forEach(function (p) {
        var o = document.createElement("option");
        o.value = p[1] + "," + p[2];
        o.textContent = grp[0].replace(/(광역시|특별시|도)$/, "") + " " + p[0];
        o.dataset.label = o.textContent;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
    sel.value = "35.8583,128.6306"; // 대구 수성구

    function render() {
      var parts = sel.value.split(",");
      var u = urls(parts[0], parts[1]);
      var label = sel.options[sel.selectedIndex].dataset.label || "선택 지역";
      var map = { weather: u.weather, air: u.air, code: snippet(label, u) };
      out.forEach(function (el) {
        var key = el.getAttribute("data-kit-out");
        var field = el.querySelector("[data-kit-value]");
        if (field) field.textContent = map[key];
      });
    }

    sel.addEventListener("change", render);
    render();

    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-kit-copy]");
      if (!btn) return;
      var box = btn.closest("[data-kit-out]");
      var text = box ? box.querySelector("[data-kit-value]").textContent : "";
      var done = function (ok) {
        var old = btn.textContent;
        btn.textContent = ok ? "복사했습니다" : "복사 실패";
        setTimeout(function () { btn.textContent = old; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        // 구형 브라우저 대비. 화면에 보이지 않는 임시 영역을 써서 복사합니다.
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", "");
        ta.style.cssText = "position:absolute;left:-9999px";
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
        document.body.removeChild(ta); done(ok);
      }
    });
  });
})();
