/**
 * 봄날 관제 프로그램 (Fleet Control)
 * 현장 실측 → LED 설치 → 하드웨어 설치 → 맞춤 DB 콘텐츠 → 원격 AS 전 과정을 관리합니다.
 * 데이터는 브라우저 localStorage에 저장되며, JSON으로 내보내 백업·인수인계할 수 있습니다.
 */
(() => {
  const STORE_KEY = "bomnal-fleet-v1";

  /* ---------------- 저장소 ---------------- */

  const emptyDb = () => ({ sites: [], logs: [], updatedAt: null });

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return emptyDb();
      const parsed = JSON.parse(raw);
      return {
        sites: Array.isArray(parsed.sites) ? parsed.sites : [],
        logs: Array.isArray(parsed.logs) ? parsed.logs : [],
        updatedAt: parsed.updatedAt ?? null,
      };
    } catch {
      return emptyDb();
    }
  }

  function save() {
    db.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(db));
    } catch {
      alert("저장 공간이 부족해 저장하지 못했습니다. JSON으로 내보낸 뒤 오래된 이력을 정리해주세요.");
    }
  }

  let db = load();

  /**
   * 과거 버전에서 같은 밀리초에 등록된 현장들이 동일 ID를 받는 문제가 있었다.
   * 중복된 ID는 새 ID로 재발급해, 이후 조작이 엉뚱한 현장에 적용되지 않게 한다.
   */
  function dedupeSiteIds() {
    const seen = new Set();
    let fixed = 0;
    db.sites.forEach((site) => {
      if (!site.id || seen.has(site.id)) {
        site.id = uid();
        fixed += 1;
      }
      seen.add(site.id);
    });
    if (fixed) save();
    return fixed;
  }

  /* ---------------- 공통 유틸 ---------------- */

  // 같은 밀리초에 여러 건을 등록해도 겹치지 않도록 순번을 함께 넣고, 기존 ID와 대조해 재발급한다.
  let idSeq = 0;
  function uid() {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      idSeq += 1;
      const rand = Math.floor(Math.random() * 900 + 100);
      const candidate = `S${Date.now().toString(36).toUpperCase()}${String(idSeq).padStart(2, "0")}${rand}`;
      const taken = db && Array.isArray(db.sites) && db.sites.some((s) => s.id === candidate);
      if (!taken) return candidate;
    }
    return `S${Date.now().toString(36).toUpperCase()}${idSeq}${Math.floor(Math.random() * 1e6)}`;
  }
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const nf = (n) => (Number.isFinite(n) ? n.toLocaleString("ko-KR") : "-");
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const fmtDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };
  const fmtDateTime = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const daysSince = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  };

  /* ---------------- 단계 정의 ---------------- */

  const STAGES = [
    { key: "survey", label: "실측" },
    { key: "led", label: "LED 설치" },
    { key: "hardware", label: "하드웨어 설치" },
    { key: "content", label: "콘텐츠 제작" },
    { key: "operating", label: "운영·AS" },
  ];
  const stageLabel = (k) => STAGES.find((s) => s.key === k)?.label ?? k;
  const stageIndex = (k) => STAGES.findIndex((s) => s.key === k);

  const HEALTH = {
    ok: { label: "정상", cls: "ok" },
    warn: { label: "점검 필요", cls: "warn" },
    down: { label: "장애", cls: "down" },
    pending: { label: "설치 전", cls: "pending" },
  };

  /* ---------------- 실측 계산 ---------------- */

  /**
   * 시야 거리와 벽면 크기로 권장 픽셀 피치·해상도·전력을 산정합니다.
   * 픽셀 피치(mm) ≈ 최소 시야거리(m) · 업계에서 통용되는 1:1 경험식(10배 규칙의 역).
   */
  function calcSpec({ wallW, wallH, viewDist, brightnessNeeded }) {
    if (!(wallW > 0) || !(wallH > 0) || !(viewDist > 0)) return null;

    const rawPitch = viewDist; // m → mm
    const PITCHES = [1.2, 1.5, 1.8, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0];
    const pitch = PITCHES.reduce((a, b) => (Math.abs(b - rawPitch) < Math.abs(a - rawPitch) ? b : a));

    // 캐비닛 500x500mm 기준으로 실제 설치 가능 크기 산정
    const CAB = 0.5;
    const cabX = Math.max(Math.floor(wallW / CAB), 1);
    const cabY = Math.max(Math.floor(wallH / CAB), 1);
    const panelW = cabX * CAB;
    const panelH = cabY * CAB;

    const pxW = Math.round((panelW * 1000) / pitch);
    const pxH = Math.round((panelH * 1000) / pitch);
    const area = panelW * panelH;

    // 실내 사이니지 평균 소비전력 약 250W/㎡, 피크 약 600W/㎡
    const avgW = Math.round(area * 250);
    const peakW = Math.round(area * 600);
    // 단상 220V 기준 권장 회로 용량 (여유율 1.3)
    const amps = +((peakW * 1.3) / 220).toFixed(1);

    const resLabel =
      pxW >= 3840 ? "4K 이상" : pxW >= 1920 ? "FHD 이상" : pxW >= 1280 ? "HD 급" : "저해상도";

    // 미디어박스 권장: 해상도(디코딩 부하)와 화면 면적(상시 공공 노출 규모)을 함께 본다.
    // 소형 패널·키오스크가 아닌 로비급(6㎡ 이상)은 상시 운영 안정성을 위해 최소 Standard로 올린다.
    const pixels = pxW * pxH;
    const box =
      pixels >= 3840 * 2160 || area >= 20
        ? "맥미니 M4 Pro (Pro)"
        : pixels >= 1920 * 1080 || area >= 6
          ? "맥미니 M4 (Standard)"
          : "라즈베리파이 5 (Edge)";

    return {
      pitch,
      cabX,
      cabY,
      panelW: +panelW.toFixed(2),
      panelH: +panelH.toFixed(2),
      pxW,
      pxH,
      area: +area.toFixed(2),
      avgW,
      peakW,
      amps,
      resLabel,
      box,
      brightness: brightnessNeeded || 800,
      minViewDist: +(pitch * 1).toFixed(1),
    };
  }

  /* ---------------- 렌더링 ---------------- */

  function healthOf(site) {
    if (site.stage !== "operating") return "pending";
    return site.health || "ok";
  }

  function renderSummary() {
    const total = db.sites.length;
    const operating = db.sites.filter((s) => s.stage === "operating").length;
    const issues = db.sites.filter((s) => ["warn", "down"].includes(healthOf(s))).length;
    const revenue = operating * 7000000;

    $("#sumTotal").textContent = nf(total);
    $("#sumOperating").textContent = nf(operating);
    $("#sumIssues").textContent = nf(issues);
    $("#sumRevenue").textContent = `${nf(revenue)}원`;
    $("#sumIssues").parentElement.classList.toggle("has-issue", issues > 0);
  }

  function renderSites() {
    const tbody = $("#siteRows");
    const filter = $("#stageFilter").value;
    const q = $("#siteSearch").value.trim().toLowerCase();

    let rows = [...db.sites];
    if (filter !== "all") {
      rows = filter === "issue" ? rows.filter((s) => ["warn", "down"].includes(healthOf(s))) : rows.filter((s) => s.stage === filter);
    }
    if (q) rows = rows.filter((s) => `${s.org} ${s.place} ${s.id}`.toLowerCase().includes(q));
    rows.sort((a, b) => stageIndex(a.stage) - stageIndex(b.stage) || a.org.localeCompare(b.org, "ko"));

    if (!rows.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">표시할 현장이 없습니다. 오른쪽 "현장 등록"으로 첫 현장을 추가하세요.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((s) => {
        const h = HEALTH[healthOf(s)];
        const since = daysSince(s.lastPing);
        const pingText =
          s.stage !== "operating" ? "-" : since === null ? "기록 없음" : since === 0 ? "오늘" : `${since}일 전`;
        const spec = s.spec;
        return `<tr data-id="${s.id}">
          <td>
            <strong>${esc(s.org)}</strong>
            <small>${esc(s.place || "설치 위치 미입력")}</small>
            <code>${esc(s.id)}</code>
          </td>
          <td>
            <div class="stage-track" aria-label="진행 단계">
              ${STAGES.map(
                (st, i) =>
                  `<i class="${i <= stageIndex(s.stage) ? "done" : ""}" title="${st.label}"></i>`
              ).join("")}
            </div>
            <small>${esc(stageLabel(s.stage))}</small>
          </td>
          <td>${spec ? `${spec.panelW}×${spec.panelH}m · P${spec.pitch}<small>${spec.pxW}×${spec.pxH} (${spec.resLabel})</small>` : "-"}</td>
          <td>${esc(s.box || (spec ? spec.box : "-"))}</td>
          <td><span class="health ${h.cls}">${h.label}</span><small>${pingText}</small></td>
          <td>${esc(s.dataSource || "-")}</td>
          <td class="row-actions">
            <button type="button" data-act="advance" title="다음 단계로">단계 ▸</button>
            <button type="button" data-act="ping" title="헬스체크 기록">체크</button>
            <button type="button" data-act="as" title="AS 이력 추가">AS</button>
            <button type="button" data-act="del" class="danger" title="삭제">삭제</button>
          </td>
        </tr>`;
      })
      .join("");
  }

  function renderLogs() {
    const wrap = $("#logList");
    const logs = [...db.logs].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 40);
    if (!logs.length) {
      wrap.innerHTML = `<li class="empty">기록된 이력이 없습니다.</li>`;
      return;
    }
    wrap.innerHTML = logs
      .map((l) => {
        const site = db.sites.find((s) => s.id === l.siteId);
        return `<li class="log-${esc(l.kind)}">
          <span class="log-when">${fmtDateTime(l.at)}</span>
          <span class="log-kind">${esc(l.kindLabel)}</span>
          <span class="log-body"><strong>${esc(site ? site.org : l.siteId)}</strong> ${esc(l.text)}</span>
        </li>`;
      })
      .join("");
  }

  function renderAll() {
    renderSummary();
    renderSites();
    renderPlaySites();
    renderLogs();
    $("#storeMeta").textContent = db.updatedAt ? `마지막 저장 ${fmtDateTime(db.updatedAt)}` : "저장된 내용 없음";
  }

  function addLog(siteId, kind, kindLabel, text) {
    db.logs.push({ id: uid(), siteId, kind, kindLabel, text, at: new Date().toISOString() });
  }

  /* ---------------- 실측 계산기 ---------------- */

  function readSurveyForm() {
    return {
      wallW: parseFloat($("#calcW").value),
      wallH: parseFloat($("#calcH").value),
      viewDist: parseFloat($("#calcDist").value),
      brightnessNeeded: parseInt($("#calcLux").value, 10) || 800,
    };
  }

  let lastSpec = null;

  function runCalc() {
    const input = readSurveyForm();
    const spec = calcSpec(input);
    const out = $("#calcResult");
    if (!spec) {
      out.innerHTML = `<p class="calc-hint">벽면 가로·세로와 주 시야 거리를 입력하면 권장 사양이 계산됩니다.</p>`;
      lastSpec = null;
      $("#applySpec").disabled = true;
      return;
    }
    lastSpec = spec;
    $("#applySpec").disabled = false;
    out.innerHTML = `
      <dl class="calc-grid">
        <div><dt>권장 픽셀 피치</dt><dd>P${spec.pitch} <small>최소 시야 ${spec.minViewDist}m</small></dd></div>
        <div><dt>설치 가능 크기</dt><dd>${spec.panelW} × ${spec.panelH} m <small>캐비닛 ${spec.cabX}×${spec.cabY}장 (500mm)</small></dd></div>
        <div><dt>해상도</dt><dd>${nf(spec.pxW)} × ${nf(spec.pxH)} <small>${spec.resLabel}</small></dd></div>
        <div><dt>화면 면적</dt><dd>${spec.area} ㎡</dd></div>
        <div><dt>소비전력</dt><dd>평균 ${nf(spec.avgW)}W <small>피크 ${nf(spec.peakW)}W</small></dd></div>
        <div><dt>권장 전기 용량</dt><dd>${spec.amps}A <small>단상 220V · 여유율 30%</small></dd></div>
        <div><dt>권장 휘도</dt><dd>${nf(spec.brightness)} nit</dd></div>
        <div class="calc-box"><dt>권장 미디어박스</dt><dd>${esc(spec.box)}</dd></div>
      </dl>`;
  }

  /* ---------------- 이벤트 ---------------- */

  function bindCalc() {
    ["#calcW", "#calcH", "#calcDist", "#calcLux"].forEach((sel) => {
      $(sel).addEventListener("input", runCalc);
    });
    $("#applySpec").addEventListener("click", () => {
      if (!lastSpec) return;
      $("#fOrg").focus();
      $("#specNote").textContent = `실측 사양 적용됨 · ${lastSpec.panelW}×${lastSpec.panelH}m / P${lastSpec.pitch} / ${lastSpec.box}`;
      $("#specNote").hidden = false;
    });
  }

  function bindSiteForm() {
    $("#siteForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const org = $("#fOrg").value.trim();
      if (!org) return;
      const site = {
        id: uid(),
        org,
        place: $("#fPlace").value.trim(),
        contact: $("#fContact").value.trim(),
        stage: $("#fStage").value,
        box: $("#fBox").value,
        dataSource: $("#fData").value.trim(),
        spec: lastSpec ? { ...lastSpec } : null,
        health: "ok",
        lastPing: $("#fStage").value === "operating" ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
      };
      db.sites.push(site);
      addLog(site.id, "create", "현장 등록", `${stageLabel(site.stage)} 단계로 등록${site.spec ? ` · ${site.spec.panelW}×${site.spec.panelH}m P${site.spec.pitch}` : ""}`);
      save();
      renderAll();
      e.target.reset();
      $("#specNote").hidden = true;
    });
  }

  function bindTable() {
    $("#siteRows").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const id = btn.closest("tr").dataset.id;
      const site = db.sites.find((s) => s.id === id);
      if (!site) return;

      const act = btn.dataset.act;

      if (act === "advance") {
        const i = stageIndex(site.stage);
        if (i >= STAGES.length - 1) {
          alert("이미 운영·AS 단계입니다.");
          return;
        }
        site.stage = STAGES[i + 1].key;
        if (site.stage === "operating" && !site.lastPing) site.lastPing = new Date().toISOString();
        addLog(site.id, "stage", "단계 진행", `${stageLabel(STAGES[i].key)} → ${stageLabel(site.stage)}`);
      }

      if (act === "ping") {
        const state = prompt("상태를 입력하세요: ok(정상) / warn(점검 필요) / down(장애)", site.health || "ok");
        if (state === null) return;
        const key = state.trim().toLowerCase();
        if (!["ok", "warn", "down"].includes(key)) {
          alert("ok, warn, down 중 하나를 입력해주세요.");
          return;
        }
        site.health = key;
        site.lastPing = new Date().toISOString();
        if (site.stage !== "operating") site.stage = "operating";
        addLog(site.id, key === "ok" ? "check" : "alert", "헬스체크", `상태 ${HEALTH[key].label}`);
      }

      if (act === "as") {
        const text = prompt("AS 조치 내용을 입력하세요 (예: 원격 재부팅으로 화면 정지 복구)");
        if (!text) return;
        site.health = "ok";
        site.lastPing = new Date().toISOString();
        addLog(site.id, "as", "원격 AS", text.trim());
      }

      if (act === "del") {
        if (!confirm(`${site.org} 현장을 삭제할까요? 이력도 함께 삭제됩니다.`)) return;
        db.sites = db.sites.filter((s) => s.id !== id);
        db.logs = db.logs.filter((l) => l.siteId !== id);
      }

      save();
      renderAll();
    });

    $("#stageFilter").addEventListener("change", renderSites);
    $("#siteSearch").addEventListener("input", renderSites);
  }

  function bindDataTools() {
    $("#exportJson").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      const d = new Date();
      a.href = URL.createObjectURL(blob);
      a.download = `bomnal-fleet-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $("#importJson").addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          if (!Array.isArray(parsed.sites)) throw new Error("형식 오류");
          if (!confirm(`현재 데이터를 불러온 파일로 교체할까요? (현장 ${parsed.sites.length}건)`)) return;
          db = { sites: parsed.sites, logs: Array.isArray(parsed.logs) ? parsed.logs : [], updatedAt: null };
          save();
          renderAll();
        } catch {
          alert("불러오지 못했습니다. 이 프로그램에서 내보낸 JSON 파일인지 확인해주세요.");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });

    $("#exportReport").addEventListener("click", () => {
      const lines = [];
      const d = new Date();
      lines.push(`봄날 미디어박스 운영 리포트`);
      lines.push(`발행일: ${fmtDate(d.toISOString())}`);
      lines.push("");
      lines.push(`총 현장 ${db.sites.length}건 · 운영 중 ${db.sites.filter((s) => s.stage === "operating").length}건`);
      lines.push("");
      lines.push("현장,기관,설치위치,단계,패널,미디어박스,상태,최근점검,연동데이터");
      db.sites.forEach((s) => {
        const spec = s.spec ? `${s.spec.panelW}x${s.spec.panelH}m P${s.spec.pitch}` : "-";
        lines.push(
          [s.id, s.org, s.place || "-", stageLabel(s.stage), spec, s.box || "-", HEALTH[healthOf(s)].label, fmtDate(s.lastPing), s.dataSource || "-"]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        );
      });
      lines.push("");
      lines.push("최근 이력");
      [...db.logs]
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, 100)
        .forEach((l) => {
          const site = db.sites.find((s) => s.id === l.siteId);
          lines.push(`${fmtDateTime(l.at)} | ${site ? site.org : l.siteId} | ${l.kindLabel} | ${l.text}`);
        });

      const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `bomnal-report-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $("#loadSample").addEventListener("click", () => {
      if (db.sites.length && !confirm("예시 데이터를 추가할까요? 기존 현장은 유지됩니다.")) return;
      const samples = [
        { org: "대구 북구청", place: "본관 1층 민원실 로비", stage: "operating", health: "ok", dataSource: "에어코리아 공기질 · 민원 처리 현황", w: 4, h: 2.5, dist: 3 },
        { org: "대구문화재단", place: "1층 안내데스크 미디어월", stage: "content", health: "ok", dataSource: "공연 일정 DB · 기상청", w: 3, h: 2, dist: 2.5 },
        { org: "경주시 관광안내소", place: "야외 파사드", stage: "led", health: "ok", dataSource: "관광객 수 · 일몰 시각", w: 6, h: 3.5, dist: 8 },
        { org: "수성구립도서관", place: "2층 열람실 입구", stage: "survey", health: "ok", dataSource: "방문자 수 · 대출 통계", w: 2, h: 1.5, dist: 2 },
        { org: "안동시청", place: "본관 로비 정보게시대", stage: "operating", health: "warn", dataSource: "낙동강 수위 · 축제 일정", w: 3.5, h: 2, dist: 4 },
      ];
      samples.forEach((sm) => {
        const spec = calcSpec({ wallW: sm.w, wallH: sm.h, viewDist: sm.dist, brightnessNeeded: 800 });
        const site = {
          id: uid(),
          org: sm.org,
          place: sm.place,
          contact: "",
          stage: sm.stage,
          box: spec.box,
          dataSource: sm.dataSource,
          spec,
          health: sm.health,
          lastPing: sm.stage === "operating" ? new Date(Date.now() - (sm.health === "warn" ? 4 : 0) * 86400000).toISOString() : null,
          createdAt: new Date().toISOString(),
        };
        db.sites.push(site);
        addLog(site.id, "create", "현장 등록", `예시 데이터 · ${stageLabel(site.stage)} 단계`);
        if (sm.health === "warn") addLog(site.id, "alert", "헬스체크", "4일간 응답 없음. 네트워크 점검 필요");
      });
      save();
      renderAll();
    });

    $("#clearAll").addEventListener("click", () => {
      if (!confirm("저장된 모든 현장과 이력을 삭제할까요? 되돌릴 수 없습니다.")) return;
      if (!confirm("정말 삭제하시겠습니까? 먼저 JSON 내보내기로 백업하는 것을 권합니다.")) return;
      db = emptyDb();
      save();
      renderAll();
    });
  }

  /* ---------------- 송출 설정 ---------------- */
  /* 현장별 재생 목록·운영시간을 정해 미디어박스에 넣을 주소를 만듭니다.
     플레이어는 이 주소의 물음표 뒤 설정만 읽고 동작하므로,
     현장 장비에는 주소 하나만 넣어두면 됩니다. */

  const PLAYER_PATH = "/player";

  function playerOrigin() {
    // 로컬에서 열어본 경우에도 현장에 줄 주소는 실제 도메인이어야 한다.
    return location.protocol.startsWith("http") && location.hostname !== "localhost"
      ? location.origin
      : "https://publicbloom.art";
  }

  function readPlayForm() {
    const picks = [...document.querySelectorAll(".play-list input:checked")].map((i) => i.value);
    const custom = $("#playCustom").value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const from = $("#playFrom").value.trim();
    const to = $("#playTo").value.trim();
    return {
      list: [...picks, ...custom],
      dwell: Math.min(600, Math.max(10, Number($("#playDwell").value) || 90)),
      hours: from !== "" && to !== "" ? `${Number(from)}-${Number(to)}` : ""
    };
  }

  function buildPlayerUrl(site, opts) {
    if (!site || !opts.list.length) return "";
    const q = new URLSearchParams();
    q.set("site", `${site.org}${site.place ? " " + site.place : ""}`);
    q.set("list", opts.list.join(","));
    q.set("dwell", String(opts.dwell));
    if (opts.hours) q.set("hours", opts.hours);
    return `${playerOrigin()}${PLAYER_PATH}?${q.toString()}`;
  }

  function currentPlaySite() {
    return db.sites.find((s) => s.id === $("#playSite").value) || null;
  }

  function renderPlayUrl() {
    const site = currentPlaySite();
    const opts = readPlayForm();
    const url = buildPlayerUrl(site, opts);
    const out = $("#playUrl");

    if (!site) {
      out.textContent = "현장을 선택하세요";
    } else if (!opts.list.length) {
      out.textContent = "재생할 작품을 하나 이상 선택하세요";
    } else {
      out.textContent = url;
    }

    ["#playCopy", "#playOpen", "#playSave"].forEach((sel) => {
      $(sel).disabled = !url;
    });
    return url;
  }

  function renderPlaySites() {
    const sel = $("#playSite");
    const keep = sel.value;
    if (!db.sites.length) {
      sel.innerHTML = `<option value="">현장을 먼저 등록하세요</option>`;
      renderPlayUrl();
      return;
    }
    sel.innerHTML =
      `<option value="">현장 선택…</option>` +
      db.sites
        .map((s) => `<option value="${esc(s.id)}">${esc(s.org)}${s.place ? " · " + esc(s.place) : ""}</option>`)
        .join("");
    if (keep && db.sites.some((s) => s.id === keep)) sel.value = keep;
    renderPlayUrl();
  }

  function loadPlaySettings() {
    const site = currentPlaySite();
    const play = (site && site.play) || null;
    const list = play ? play.list : ["spring", "air", "typewall"];

    document.querySelectorAll(".play-list input").forEach((i) => {
      i.checked = list.includes(i.value);
    });
    // 내장 작품이 아닌 항목은 기관 자체 콘텐츠 칸으로 되돌린다.
    const builtIn = ["spring", "air", "typewall"];
    $("#playCustom").value = list.filter((x) => !builtIn.includes(x)).join(", ");
    $("#playDwell").value = play ? play.dwell : 90;

    const hours = play && play.hours ? play.hours.split("-") : ["", ""];
    $("#playFrom").value = hours[0] || "";
    $("#playTo").value = hours[1] || "";
    renderPlayUrl();
  }

  function bindPlay() {
    $("#playSite").addEventListener("change", loadPlaySettings);
    ["#playCustom", "#playDwell", "#playFrom", "#playTo"].forEach((sel) => {
      $(sel).addEventListener("input", renderPlayUrl);
    });
    document.querySelectorAll(".play-list input").forEach((i) => {
      i.addEventListener("change", renderPlayUrl);
    });

    $("#playCopy").addEventListener("click", async () => {
      const url = renderPlayUrl();
      if (!url) return;
      const btn = $("#playCopy");
      try {
        await navigator.clipboard.writeText(url);
        btn.textContent = "복사됨 ✓";
      } catch (err) {
        // 클립보드 권한이 막힌 브라우저에서도 손으로 복사할 수 있게 한다.
        btn.textContent = "주소를 직접 선택해 복사하세요";
      }
      setTimeout(() => { btn.textContent = "주소 복사"; }, 2400);
    });

    $("#playOpen").addEventListener("click", () => {
      const url = renderPlayUrl();
      if (url) window.open(url, "_blank", "noopener");
    });

    $("#playSave").addEventListener("click", () => {
      const site = currentPlaySite();
      const url = renderPlayUrl();
      if (!site || !url) return;
      site.play = readPlayForm();
      addLog(site.id, "content", "송출 설정", `재생 ${site.play.list.length}편 · 작품당 ${site.play.dwell}초${site.play.hours ? ` · ${site.play.hours}시 운영` : " · 24시간"}`);
      save();
      renderAll();
      const btn = $("#playSave");
      btn.textContent = "저장됨 ✓";
      setTimeout(() => { btn.textContent = "이 현장 설정 저장"; }, 2400);
    });
  }

  /* ---------------- 초기화 ---------------- */

  dedupeSiteIds();
  bindCalc();
  bindSiteForm();
  bindTable();
  bindDataTools();
  bindPlay();
  runCalc();
  renderAll();
})();
