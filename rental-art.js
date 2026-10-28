/* LED 렌탈 · 렌탈 때 마음껏 트는 작품 (2026-10-28)
 *
 * 렌탈 LED(6장 · 2064×1032, 2:1) 규격으로 맞춘 AI 루프 작품. 카드를 누르면 패널 모양 화면에서 그 작품이 돈다.
 * 영상은 비메오(publicbloom.art 에서만 재생)에 있고, 여기에는 제목·뜻·주소만 둔다. 현장에서는 레졸룸 아레나로
 * 손님이 원하는 작품을 켜고 바꾼다.
 */
(function () {
  "use strict";
  var ART = [
    ["06", "유리 너머의 봄 · 덩굴", "김 서린 유리 너머로 덩굴 그림자가 자라고 연둣빛 새싹이 하나둘 켜집니다. 겨울 끝에서 봄이 번져 오는 순간입니다."],
    ["07", "유리 너머의 봄 · 손", "유리에 댄 손 그림자 안에서 작은 새싹이 돋아납니다. 손안에 쥔 작은 봄, 돌봄과 시작의 이야기입니다."],
    ["08", "유리 너머의 봄 · 새", "새 떼의 그림자가 유리 너머를 지나가고 연둣빛 잎이 흩날립니다. 계절이 바뀌는 날의 먼 이동입니다."],
    ["09", "유리 너머의 봄 · 금붕어", "흐린 유리 뒤로 금붕어 그림자가 헤엄치고 초록 빛방울이 떠오릅니다. 고요한 수조를 들여다보는 쉼입니다."],
    ["10", "유리 너머의 봄 · 잎", "몬스테라와 야자 잎 그림자가 흔들리고 잎맥 사이로 빛이 스밉니다. 창가에 드는 오후의 햇살입니다."],
    ["11", "기계가 본 봄", "투시 사진처럼 비치는 튤립을 기계의 눈이 재고 읽습니다. 숫자로 읽은 봄은 어떤 모습일까 묻습니다."],
    ["12", "가라앉은 도시 위의 배", "물에 잠긴 도시 위를 작은 나룻배 한 척이 지나갑니다. 잃어버린 것 위로도 여정은 이어집니다."],
    ["13", "바다 위에 뜬 창문", "저녁 바다 위에 뜬 창문, 불 켜진 방 안에서 한 사람이 바다를 봅니다. 혼자만의 쉼과 그리움입니다."],
    ["14", "눈의 방", "수십 개의 화면 속 눈이 깜빡이는 가운데, 한 화면에만 달이 뜬 바다가 있습니다. 보는 것과 보이는 것에 대한 작품입니다."],
    ["15", "밤거리의 빛 해파리", "잠든 도시의 거리 위로 빛나는 해파리가 헤엄칩니다. 평범한 밤에 찾아온 꿈입니다."],
    ["16", "열화상 속 한 사람", "감시 화면 속 무채색 군중 사이로 한 사람만 따뜻한 빛으로 걸어갑니다. 많은 사람 가운데 한 사람의 온기입니다."],
    ["17", "극장 안의 달", "빈 극장 무대 위로 보름달이 떠오르고 조명이 쏟아집니다. 막이 오르기 직전의 설렘입니다."],
    ["18", "풍경을 입은 사람", "산과 호수와 폭포를 옷처럼 두른 사람. 지나온 풍경이 결국 우리를 이룬다는 이야기입니다."],
    ["19", "우주의 발코니", "별이 가득한 우주에 떠 있는 발코니, 열린 문 너머로 푸른 하늘이 보입니다. 다른 세계로 난 문입니다."],
    ["20", "채널 사이의 손", "옛 TV 화면들 사이에서 두 손이 꽃다발을 받쳐 듭니다. 잡음 속에서 건네는 다정함입니다."],
    ["21", "빛의 유리판", "바다 위에 선 커다란 유리판이 햇빛을 무지개로 나눕니다. 맑게 갈라지는 빛, 새 출발의 장면입니다."],
    ["22", "숲의 신호", "보랏빛 숲의 나무 아래로 빛의 고리가 퍼져 나갑니다. 나무들이 주고받는 보이지 않는 신호입니다."]
  ];
  // 비메오 재생 주소 (작품 번호 → 주소). 비어 있으면 대표 장면 사진만 보여 준다
  var VIMEO = {
    "06": "https://player.vimeo.com/video/1240125499?h=1107c209ae",
    "07": "https://player.vimeo.com/video/1240125521?h=c5831015e0",
    "08": "https://player.vimeo.com/video/1240125546?h=3b240de4f1",
    "09": "https://player.vimeo.com/video/1240125564?h=a48bfec298",
    "10": "https://player.vimeo.com/video/1240125590?h=d0507d416a",
    "11": "https://player.vimeo.com/video/1240125609?h=9f455f008c",
    "12": "https://player.vimeo.com/video/1240125631?h=ac46260395",
    "13": "https://player.vimeo.com/video/1240125647?h=a124e32082",
    "14": "https://player.vimeo.com/video/1240125674?h=dbc36c611f",
    "15": "https://player.vimeo.com/video/1240125703?h=8ed2ea2363",
    "16": "https://player.vimeo.com/video/1240125729?h=a56e45d8fb",
    "17": "https://player.vimeo.com/video/1240125751?h=fa9475e403",
    "18": "https://player.vimeo.com/video/1240125768?h=c1d4c711eb",
    "19": "https://player.vimeo.com/video/1240125796?h=a822e193f2",
    "20": "https://player.vimeo.com/video/1240125838?h=3c45e76ef8",
    "21": "https://player.vimeo.com/video/1240125868?h=53bd96744e",
    "22": "https://player.vimeo.com/video/1240125902?h=a84208a486"
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var grid = $("[data-ra-grid]"), dlg = $("[data-ra-view]");
  if (!grid || !dlg) return;
  var cur = 0;

  grid.innerHTML = ART.map(function (a, i) {
    return '<li><button type="button" class="ra-card" data-i="' + i + '" aria-label="' + a[1] + ' 패널 화면으로 보기">' +
      '<span class="ra-panel"><img src="./assets/rental-art/' + a[0] + '.webp" alt="" width="1032" height="516" loading="lazy" decoding="async" /><span class="ra-seams" aria-hidden="true"></span></span>' +
      '<span class="ra-name"><small>' + a[0] + '</small>' + a[1] + '</span></button></li>';
  }).join("");

  var ifr = $("iframe", dlg), still = $("[data-ra-still]", dlg);
  function show(i) {
    cur = (i + ART.length) % ART.length;
    var a = ART[cur], url = VIMEO[a[0]];
    $("[data-ra-no]", dlg).textContent = a[0] + "번";
    $("[data-ra-title]", dlg).textContent = a[1];
    $("[data-ra-desc]", dlg).textContent = a[2];
    still.src = "./assets/rental-art/" + a[0] + ".webp";
    if (url) {
      ifr.hidden = false;
      ifr.src = url + (url.indexOf("?") < 0 ? "?" : "&") + "background=1&quality=1080p";
    } else { ifr.hidden = true; ifr.removeAttribute("src"); }
  }
  function open(i) {
    show(i);
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    if (typeof window.gtag === "function") window.gtag("event", "view_item", { item_id: "rental-art-" + ART[cur][0], item_name: ART[cur][1] });
  }
  function close() { ifr.removeAttribute("src"); if (dlg.open) dlg.close(); }
  grid.addEventListener("click", function (e) { var b = e.target.closest("[data-i]"); if (b) open(+b.getAttribute("data-i")); });
  $("[data-ra-prev]", dlg).addEventListener("click", function () { show(cur - 1); });
  $("[data-ra-next]", dlg).addEventListener("click", function () { show(cur + 1); });
  $("[data-ra-close]", dlg).addEventListener("click", close);
  dlg.addEventListener("close", function () { ifr.removeAttribute("src"); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") show(cur - 1);
    if (e.key === "ArrowRight") show(cur + 1);
  });
})();
