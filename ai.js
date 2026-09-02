/* /ai — 미디어아트 AX 서비스 페이지
 *
 * 메인은 자체 제작 홍보 시퀀스다. 영상 파일이 아니라 편집표(EDL)를 따라
 * 장면을 갈아 끼우는 방식이라, 문구만 바꾸면 언어별 버전이 그대로 나온다.
 *
 * 편집점을 왜 이렇게 잡았나
 *   같은 길이로 끊으면 시계처럼 들린다. 사람은 그걸 금방 지루해한다.
 *   그래서 긴 숏(2.4~4.0초)으로 말을 하고, 짧은 비트(0.7~1.1초)로 숨을 끊는다.
 *   글자는 컷과 같이 들어오지 않는다. 컷 뒤 0.18초에 들어오고 다음 컷
 *   0.22초 전에 빠진다. 그래야 컷이 컷으로 읽히고 글자가 글자로 읽힌다.
 *
 * 화면 두 장(A/B)을 번갈아 쓴다. 다음 장면을 안 보이는 쪽에 미리 띄워두고
 * 컷 순간에 바꿔치기한다. 한 장으로 돌리면 매 컷마다 다시 불러오느라
 * 검은 화면이 번쩍인다.
 */
(function () {
  "use strict";

  var ART = "./works/studio-art.html";

  /* ── 편집표 ────────────────────────────────────────────────
     dur   장면 길이(초)
     cut   이 장면으로 들어가는 방식: cut(하드컷) · dip(암전) · flash(플래시)
     key   문구 키. 없으면 글자 없이 그림만 (숨 끊는 비트)
     art   배경 파라미터. /studio 엔진에 그대로 넘어간다 */
  var EDL = [
    { dur: 2.8, cut: "dip",   key: "s1", art: "style=aurora&palette=ink&density=52&contrast=62&speed=38&glow=44" },
    { dur: 1.1, cut: "cut",   key: "s2", art: "style=minimal&palette=mono&density=30&contrast=80&speed=46" },
    { dur: 0.7, cut: "flash", key: null, art: "style=pixel&palette=neon&density=72&contrast=78&speed=70" },
    { dur: 2.4, cut: "cut",   key: "s3", art: "style=futuristic&palette=bomnal&density=58&contrast=66&speed=44&glow=38" },
    { dur: 0.9, cut: "flash", key: null, art: "style=swiss&palette=hiroshige&density=64&contrast=84&speed=60" },
    { dur: 3.2, cut: "dip",   key: "s4", art: "style=clay&palette=klimt&density=44&contrast=60&speed=34&glow=30" },
    { dur: 0.8, cut: "cut",   key: null, art: "style=graffiti&palette=munch&density=58&contrast=76&speed=66" },
    { dur: 2.6, cut: "cut",   key: "s5", art: "style=surreal&palette=vermeer&density=40&contrast=64&speed=32" },
    { dur: 1.0, cut: "flash", key: null, art: "style=cyber&palette=neon&density=66&contrast=80&speed=72" },
    { dur: 4.0, cut: "dip",   key: "s6", art: "style=hand&palette=gogh&density=38&contrast=68&speed=28&glow=42" },
  ];
  var TEXT_IN = 0.18;    // 컷 뒤 글자가 들어오기까지
  var TEXT_OUT = 0.22;   // 다음 컷 전에 글자가 빠지는 시점

  /* ── 언어팩 ────────────────────────────────────────────────
     한국어가 정본이다. 나머지는 같은 사실을 그 언어의 어법으로 옮긴 것이며,
     캐논에 없는 수치나 실적을 새로 만들지 않는다. */
  var L = {
    ko: {
      name: "한국어", dir: "ltr", lang: "ko",
      title: "미디어아트 AX",
      lede: "기관이 가진 데이터를 화면의 재료로 바꿉니다.",
      s1: ["화면이 데이터를 읽습니다", "영상 파일을 트는 화면에서"],
      s2: ["같은 화면이 매일 달라집니다", ""],
      s3: ["공공 API를 실시간으로", "대형 사이니지에서도 같은 방식으로"],
      s4: ["AI 제작 파이프라인을 대신 돌립니다", "기관이 도구를 갖추지 않아도 됩니다"],
      s5: ["시안 3종, 1주일 이내", "영상 외주는 통상 1개월 이상"],
      s6: ["오늘은 봄날", "미디어아트를 코드로 만듭니다"],
      ctaMake: "직접 만들어 보기", ctaAsk: "견적 문의",
      skip: "홍보 시퀀스 건너뛰기", play: "재생", pause: "멈춤",
      cutsLabel: "편집점", langLabel: "언어",
      whatH: "무엇을 하는 서비스인가",
      what: "미디어아트를 영상 편집이 아니라 코드로 만듭니다. 그래서 화면 비율과 해상도를 현장 규격에 맞춰 다시 뽑을 수 있고, 공공데이터나 기관 보유 DB를 연결하면 같은 화면이 매일 달라집니다.",
      p1H: "공공데이터 · 기관 DB 연동",
      p1: "기존 사이니지는 정해진 영상을 순서대로 틉니다. 저희는 자체 개발한 방식으로 공공 API를 실시간으로 읽어 화면에 반영합니다. 연동이 필요 없으면 패널 크기에 맞춘 4K 영상으로 드립니다.",
      p2H: "AI 제작 파이프라인 대행",
      p2: "기관이 AI 도구를 직접 갖추지 않으셔도 됩니다. 참고 이미지만 주시면 시안 3종을 1주일 이내에 드립니다.",
      p3H: "화면까지 한 계약으로",
      p3: "LED 패널·전광판 설치와 빔프로젝터 미디어파사드 시공을 직접 합니다. 업체를 나눠 협의하지 않으셔도 됩니다.",
      badge1: "여성기업 · 공공기관 우선구매 대상",
      badge2: "직접생산확인 · 경쟁입찰 즉시 참여",
      badge3: "대구 · 경북 · 부산 · 경남 · 울산",
    },
    en: {
      name: "English", dir: "ltr", lang: "en",
      title: "Media Art AX",
      lede: "We turn the data your organization already holds into what the screen is made of.",
      s1: ["The screen reads data", "Not just a video file on loop"],
      s2: ["The same screen changes every day", ""],
      s3: ["Public APIs, in real time", "The same method on large-format signage"],
      s4: ["We run the AI pipeline for you", "No tooling for you to set up"],
      s5: ["Three concepts within a week", "Outsourced video usually takes a month or more"],
      s6: ["Oneul-eun Bomnal", "We make media art with code"],
      ctaMake: "Try the editor", ctaAsk: "Request a quote",
      skip: "Skip the sequence", play: "Play", pause: "Pause",
      cutsLabel: "Cuts", langLabel: "Language",
      whatH: "What this service does",
      what: "We build media art with code rather than a video editor. That means the same piece can be re-rendered to your site's exact aspect ratio and resolution, and once public data or your own database is connected, the screen looks different every day.",
      p1H: "Public data and in-house database",
      p1: "Conventional signage players run fixed video files in order. Ours reads public APIs live and puts the result on screen, at large-format sizes too. Where a live feed is not needed, we deliver 4K video rendered to your panel size.",
      p2H: "AI production pipeline, run for you",
      p2: "You do not need to set up AI tooling. Send a reference image and we return three concepts within a week.",
      p3H: "Screen included, one contract",
      p3: "We install LED panels and displays and build projector media facades ourselves, so you do not have to coordinate separate vendors.",
      badge1: "Women-owned business · public procurement priority",
      badge2: "Direct production certified · eligible for restricted tenders",
      badge3: "Daegu · Gyeongbuk · Busan · Gyeongnam · Ulsan",
    },
    ja: {
      name: "日本語", dir: "ltr", lang: "ja",
      title: "メディアアート AX",
      lede: "機関がすでに持っているデータを、画面の素材に変えます。",
      s1: ["画面がデータを読みます", "映像ファイルを流すだけの画面から"],
      s2: ["同じ画面が毎日変わります", ""],
      s3: ["公共APIをリアルタイムで", "大型サイネージでも同じ方式で"],
      s4: ["AI制作パイプラインを代行します", "機関側でツールを揃える必要はありません"],
      s5: ["提案3案を1週間以内に", "映像の外注は通常1か月以上"],
      s6: ["オヌルン・ボムナル", "メディアアートをコードでつくります"],
      ctaMake: "エディタを試す", ctaAsk: "見積もり依頼",
      skip: "シーケンスをスキップ", play: "再生", pause: "停止",
      cutsLabel: "編集点", langLabel: "言語",
      whatH: "どんなサービスか",
      what: "メディアアートを映像編集ではなくコードで制作します。そのため画面比率と解像度を現場の規格に合わせて出力し直すことができ、公共データや機関のデータベースをつなげば同じ画面が毎日変わります。",
      p1H: "公共データ・機関データベース連携",
      p1: "既存のサイネージは決められた映像を順番に流す仕組みです。当社は独自の方式で公共APIをリアルタイムに読み取り、画面に反映します。連携が不要な場合はパネルの寸法に合わせた4K映像で納品します。",
      p2H: "AI制作パイプラインの代行",
      p2: "機関側でAIツールを揃える必要はありません。参考画像をいただければ、提案3案を1週間以内にお出しします。",
      p3H: "画面まで一つの契約で",
      p3: "LEDパネル・電光掲示板の設置と、プロジェクターによるメディアファサード施工まで自社で行います。業者を分けて調整する必要がありません。",
      badge1: "女性企業・公共機関の優先購買対象",
      badge2: "直接生産確認済み・制限入札に即参加",
      badge3: "大邱・慶北・釜山・慶南・蔚山",
    },
    zh: {
      name: "中文", dir: "ltr", lang: "zh-Hans",
      title: "媒体艺术 AX",
      lede: "把机构已有的数据，变成画面的材料。",
      s1: ["让画面读取数据", "而不只是循环播放视频文件"],
      s2: ["同一块屏幕，每天都不一样", ""],
      s3: ["实时接入公共 API", "大型标牌同样适用"],
      s4: ["我们代运行 AI 制作流程", "贵机构无需自行搭建工具"],
      s5: ["三版方案，一周之内", "视频外包通常需要一个月以上"],
      s6: ["今天是春日", "我们用代码创作媒体艺术"],
      ctaMake: "试用编辑器", ctaAsk: "索取报价",
      skip: "跳过片头", play: "播放", pause: "暂停",
      cutsLabel: "剪辑点", langLabel: "语言",
      whatH: "这是什么服务",
      what: "我们用代码而非视频剪辑软件制作媒体艺术。因此同一件作品可以按现场的画面比例与分辨率重新输出；一旦接入公共数据或机构自有数据库，同一块屏幕每天都会不同。",
      p1H: "公共数据与机构数据库对接",
      p1: "常见的标牌播放程序只能按顺序播放固定视频文件。我们以自研方式实时读取公共 API 并反映到画面上，大型标牌同样适用。若不需要实时对接，我们按面板尺寸渲染 4K 视频交付。",
      p2H: "代运行 AI 制作流程",
      p2: "贵机构无需自行搭建 AI 工具。提供参考图像即可，我们在一周内交付三版方案。",
      p3H: "含屏幕，一份合同",
      p3: "LED 面板与显示屏安装、投影媒体立面施工均由我们自行完成，无需分头对接多家供应商。",
      badge1: "女性企业 · 公共机构优先采购对象",
      badge2: "已获直接生产确认 · 可直接参与限制性招标",
      badge3: "大邱 · 庆北 · 釜山 · 庆南 · 蔚山",
    },
    ar: {
      name: "العربية", dir: "rtl", lang: "ar",
      title: "الفن الإعلامي AX",
      lede: "نحوّل البيانات التي تملكها مؤسستكم إلى مادة تُصنع منها الشاشة.",
      s1: ["الشاشة تقرأ البيانات", "لا مجرد ملف فيديو يُعاد تشغيله"],
      s2: ["الشاشة نفسها تتغير كل يوم", ""],
      s3: ["واجهات البيانات العامة، في الوقت الفعلي", "والطريقة نفسها على الشاشات الكبيرة"],
      s4: ["نُشغّل مسار الإنتاج بالذكاء الاصطناعي نيابةً عنكم", "دون حاجة إلى إعداد أدوات لديكم"],
      s5: ["ثلاثة تصاميم خلال أسبوع", "إسناد إنتاج الفيديو يستغرق عادةً شهرًا أو أكثر"],
      s6: ["أونول-أون بومنال", "نصنع الفن الإعلامي بالبرمجة"],
      ctaMake: "جرّب المحرر", ctaAsk: "اطلب عرض سعر",
      skip: "تخطّي المقدمة", play: "تشغيل", pause: "إيقاف",
      cutsLabel: "نقاط المونتاج", langLabel: "اللغة",
      whatH: "ما هذه الخدمة",
      what: "نصنع الفن الإعلامي بالبرمجة لا ببرامج تحرير الفيديو. لذلك يمكن إعادة إخراج العمل نفسه بنسبة الشاشة ودقتها كما هي في الموقع، وعند ربط البيانات العامة أو قاعدة بيانات المؤسسة تختلف الشاشة نفسها كل يوم.",
      p1H: "ربط البيانات العامة وقواعد بيانات المؤسسة",
      p1: "برامج الشاشات المعتادة تُشغّل ملفات فيديو ثابتة بالترتيب. أما نحن فنقرأ واجهات البيانات العامة مباشرةً ونعكسها على الشاشة، وينطبق ذلك على الشاشات الكبيرة أيضًا. وإن لم يكن الربط المباشر مطلوبًا، نسلّم فيديو بدقة 4K مُخرَجًا بمقاس لوحتكم.",
      p2H: "تشغيل مسار الإنتاج بالذكاء الاصطناعي نيابةً عنكم",
      p2: "لا حاجة لإعداد أدوات ذكاء اصطناعي لديكم. أرسلوا صورة مرجعية ونعيد إليكم ثلاثة تصاميم خلال أسبوع.",
      p3H: "الشاشة ضمن العقد نفسه",
      p3: "نتولى بأنفسنا تركيب لوحات وشاشات LED وتنفيذ واجهات الإسقاط الضوئي، فلا تحتاجون إلى التنسيق بين عدة مورّدين.",
      badge1: "منشأة مملوكة لسيدات · أولوية في المشتريات الحكومية",
      badge2: "شهادة إنتاج مباشر · أهلية فورية للمناقصات المحدودة",
      badge3: "دايغو · غيونغبوك · بوسان · غيونغنام · أولسان",
    },
  };
  var ORDER = ["ko", "en", "ja", "zh", "ar"];

  /* ── 상태 ─────────────────────────────────────────────────── */
  var lang = "ko";
  var shot = 0;
  var playing = true;
  var timer = null, textTimer = null;
  var TOTAL = EDL.reduce(function (a, s) { return a + s.dur; }, 0);

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };

  var stage = $("[data-promo]");
  var frames = [$("[data-frame-a]"), $("[data-frame-b]")];
  var live = 0;                       // 지금 보이는 화면

  /* ── 화면 갈아 끼우기 ─────────────────────────────────────── */
  function artUrl(spec) {
    /* 미리보기 해상도는 작게. 홍보 시퀀스 때문에 팬이 돌면 안 된다. */
    return ART + "?w=880&h=495&seed=" + (4820000 + shot * 7919) + "&dur=12&fps=30&" + spec;
  }

  function preload(i) {
    var next = EDL[(i) % EDL.length];
    var hidden = frames[1 - live];
    hidden.src = artUrl(next.art);
    /* 뜨자마자 세워둔다. 안 보이는 화면이 계속 그려질 이유가 없다. */
    hidden.addEventListener("load", function once() {
      hidden.removeEventListener("load", once);
      try { hidden.contentWindow.postMessage("bomnal:pause", "*"); } catch (e) { /* 무시 */ }
    });
  }

  function swap() {
    var showing = frames[1 - live];
    var hiding = frames[live];
    try { showing.contentWindow.postMessage("bomnal:play", "*"); } catch (e) { /* 무시 */ }
    try { hiding.contentWindow.postMessage("bomnal:pause", "*"); } catch (e) { /* 무시 */ }
    showing.classList.add("is-live");
    hiding.classList.remove("is-live");
    live = 1 - live;
  }

  /* ── 한 장면 ──────────────────────────────────────────────── */
  function playShot(i) {
    shot = i % EDL.length;
    var s = EDL[shot];
    var t = L[lang];

    /* 전환. 컷은 그냥 바뀌고, 암전은 검게 눌렀다 열고, 플래시는 밝게 튄다. */
    stage.dataset.cut = s.cut;
    stage.classList.remove("is-cutting");
    void stage.offsetWidth;            // 재시작을 위해 리플로우를 한 번 강제한다
    stage.classList.add("is-cutting");

    swap();
    preload(shot + 1);

    /* 글자는 컷과 같이 들어오지 않는다. */
    var box = $("[data-promo-text]");
    box.classList.remove("is-in");
    clearTimeout(textTimer);
    if (s.key && t[s.key]) {
      $("[data-promo-line1]").textContent = t[s.key][0] || "";
      $("[data-promo-line2]").textContent = t[s.key][1] || "";
      textTimer = setTimeout(function () { box.classList.add("is-in"); }, TEXT_IN * 1000);
    } else {
      $("[data-promo-line1]").textContent = "";
      $("[data-promo-line2]").textContent = "";
    }

    markCuts();

    if (!playing) return;
    clearTimeout(timer);
    timer = setTimeout(function () {
      /* 다음 컷 직전에 글자를 먼저 뺀다. */
      box.classList.remove("is-in");
      setTimeout(function () { playShot(shot + 1); }, TEXT_OUT * 1000);
    }, Math.max(200, (s.dur - TEXT_OUT) * 1000));
  }

  /* ── 편집점 눈금 ──────────────────────────────────────────
     편집표를 화면에 그대로 보여준다. 이 서비스가 무엇을 파는지
     설명하는 데에도 도움이 되고, 지금 어디쯤인지도 알 수 있다. */
  function buildCuts() {
    var bar = $("[data-cuts]");
    bar.textContent = "";
    EDL.forEach(function (s, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cut";
      b.dataset.cutIndex = i;
      b.style.flexGrow = String(s.dur);
      b.title = (i + 1) + " · " + s.dur.toFixed(1) + "s · " + s.cut;
      b.setAttribute("aria-label", (i + 1) + "번째 장면, " + s.dur.toFixed(1) + "초");
      b.appendChild(document.createElement("span"));
      b.addEventListener("click", function () { playShot(i); });
      bar.appendChild(b);
    });
  }
  function markCuts() {
    $$("[data-cut-index]").forEach(function (b) {
      b.classList.toggle("is-on", +b.dataset.cutIndex === shot);
    });
  }

  /* ── 언어 ─────────────────────────────────────────────────── */
  function applyLang(code) {
    if (!L[code]) code = "ko";
    lang = code;
    var t = L[code];

    document.documentElement.lang = t.lang;
    document.documentElement.dir = t.dir;
    document.body.dataset.lang = code;

    $$("[data-t]").forEach(function (n) {
      var v = t[n.dataset.t];
      if (typeof v === "string") n.textContent = v;
    });
    $$("[data-lang-btn]").forEach(function (b) {
      var on = b.dataset.langBtn === code;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    $("[data-pause-label]").textContent = playing ? t.pause : t.play;

    /* 주소에 남겨 공유·북마크가 그 언어로 열리게 한다. */
    try {
      var u = new URL(location.href);
      if (code === "ko") u.searchParams.delete("lang");
      else u.searchParams.set("lang", code);
      history.replaceState(null, "", u);
    } catch (e) { /* 무시 */ }

    /* 지금 장면의 글자도 바로 그 언어로 바꾼다. */
    var s = EDL[shot];
    if (s && s.key && t[s.key]) {
      $("[data-promo-line1]").textContent = t[s.key][0] || "";
      $("[data-promo-line2]").textContent = t[s.key][1] || "";
    }
  }

  /* ── 조작 ─────────────────────────────────────────────────── */
  function setPlaying(on) {
    playing = on;
    $("[data-pause]").setAttribute("aria-pressed", String(!on));
    $("[data-pause-label]").textContent = on ? L[lang].pause : L[lang].play;
    stage.classList.toggle("is-paused", !on);
    if (on) playShot(shot);
    else {
      clearTimeout(timer);
      try { frames[live].contentWindow.postMessage("bomnal:pause", "*"); } catch (e) { /* 무시 */ }
    }
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-lang-btn]");
    if (b) { applyLang(b.dataset.langBtn); return; }
    if (e.target.closest("[data-pause]")) setPlaying(!playing);
  });

  /* ── 시작 ─────────────────────────────────────────────────── */
  function init() {
    buildCuts();
    /* 주소에 lang이 있을 때만 그 언어로 연다. 브라우저 설정으로 자동
       전환하면, 정본 주소가 한국어라고 선언해 둔 것과 실제로 보이는 화면이
       어긋난다. 크롤러도 사람도 그 차이를 그대로 본다. */
    var q = new URLSearchParams(location.search);
    applyLang(q.get("lang") || "ko");

    /* 움직임을 줄여 달라고 설정한 사람에게는 시퀀스를 돌리지 않는다.
       화면이 계속 튀는 것을 힘들어하는 사람이 있다. */
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calm) {
      playing = false;
      frames[0].src = artUrl(EDL[0].art);
      frames[0].classList.add("is-live");
      var t = L[lang];
      $("[data-promo-line1]").textContent = t.s1[0];
      $("[data-promo-line2]").textContent = t.s1[1];
      $("[data-promo-text]").classList.add("is-in");
      $("[data-pause-label]").textContent = t.play;
      $("[data-pause]").setAttribute("aria-pressed", "true");
      markCuts();
    } else {
      frames[0].src = artUrl(EDL[0].art);
      frames[0].classList.add("is-live");
      frames[0].addEventListener("load", function once() {
        frames[0].removeEventListener("load", once);
        playShot(0);
      });
    }

    /* 화면 밖으로 나가면 세운다. 안 보이는 홍보영상은 배터리만 쓴다. */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        en.forEach(function (x) {
          if (!playing) return;
          try {
            frames[live].contentWindow.postMessage(x.isIntersecting ? "bomnal:play" : "bomnal:pause", "*");
          } catch (e) { /* 무시 */ }
          if (x.isIntersecting) { if (!timer) playShot(shot); }
          else { clearTimeout(timer); timer = null; }
        });
      }, { rootMargin: "60px" }).observe(stage);
    }
    document.addEventListener("visibilitychange", function () {
      if (!playing) return;
      if (document.hidden) { clearTimeout(timer); timer = null; }
      else playShot(shot);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
