/* ===== サイト共通設定：ここだけ書き換えればOK ===== */
window.SITE = {
  email: "k.kumagai@tenthrevolution.com",          // 問い合わせ先（会社アドレスに変えるならここ）
  linkedin: "https://www.linkedin.com/in/katsunobu-kumagai/",   // LinkedIn
  bookingUrl: "",                              // カレンダー予約URLがあれば（空なら非表示）
};

(function () {
  const S = window.SITE;
  const EN = document.documentElement.lang === "en";
  window.EN = EN;
  const yen = (m) => (m >= 10000 ? (m / 10000).toFixed(m % 10000 ? 1 : 0) + "億円" : m.toLocaleString("ja-JP") + "万円");
  const yenEn = (m) => "¥" + (m / 100).toFixed(m % 100 ? 1 : 0) + "M";
  window.fmtSalary = (m) => (m ? (EN ? "up to " + yenEn(m) : "〜" + yen(m)) : (EN ? "Negotiable" : "要相談"));

  // メール・LinkedIn リンクを一括反映
  document.querySelectorAll("[data-mail]").forEach((a) => {
    const subj = a.getAttribute("data-mail");
    a.href = "mailto:" + S.email + (subj ? "?subject=" + encodeURIComponent(subj) : "");
    if (a.classList.contains("mail")) a.textContent = S.email;
  });
  document.querySelectorAll("[data-linkedin]").forEach((a) => (a.href = S.linkedin));
  document.querySelectorAll("[data-booking]").forEach((a) => {
    if (S.bookingUrl) a.href = S.bookingUrl; else a.closest("[data-booking-wrap]")?.remove();
  });

  // モバイルメニュー
  const t = document.querySelector(".menu-toggle"), n = document.querySelector(".nav");
  if (t && n) t.addEventListener("click", () => {
    const open = n.classList.toggle("open");
    t.setAttribute("aria-expanded", open);
  });

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  window.esc = esc;

  // Revolent：プラットフォーム切替タブ
  const tabs = document.querySelectorAll(".tabs [role='tab']");
  tabs.forEach((b) => b.addEventListener("click", () => {
    tabs.forEach((x) => { x.setAttribute("aria-selected", x === b); document.getElementById(x.getAttribute("aria-controls")).hidden = x !== b; });
  }));

  // 企業向けページ：日本国内 / Market Entry の切替
  const modeEls = document.querySelectorAll("[data-mode]");
  const modeBtns = document.querySelectorAll("[data-set-mode]");
  if (modeBtns.length) {
    const setMode = (mode, push) => {
      modeEls.forEach((el) => { const m = el.getAttribute("data-mode"); el.hidden = !(m === "both" || m === mode); });
      modeBtns.forEach((b) => b.setAttribute("aria-selected", b.getAttribute("data-set-mode") === mode));
      if (push) { const u = new URL(location.href); u.searchParams.set("mode", mode); history.replaceState(null, "", u); }
      window.currentMode = mode;
    };
    modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.getAttribute("data-set-mode"), true)));
    const q = new URLSearchParams(location.search).get("mode");
    setMode(q === "entry" ? "entry" : "domestic", false);
    // アンカーが非表示セクションを指す場合は、そのモードに切り替える
    const goHash = () => {
      const t = location.hash && document.querySelector(location.hash);
      if (t && t.hidden && t.getAttribute("data-mode")) { setMode(t.getAttribute("data-mode"), true); t.scrollIntoView(); }
    };
    window.addEventListener("hashchange", goHash); goHash();
  }

  // 年収テーブル（実データから集計）。為替は概算：下の USDJPY を必要に応じて更新
  const USDJPY = 150;
  let cur = "jpy";
  const quant = (a, p) => { const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
  const money = (man) => { // man = 万円
    if (cur === "usd") { const k = Math.round((man * 10000 / USDJPY) / 1000); return "$" + k.toLocaleString("en-US") + "k"; }
    return EN ? "¥" + (man / 100).toFixed(man % 100 ? 1 : 0) + "M" : man.toLocaleString("ja-JP") + "万円";
  };
  const renderSalary = () => {
    const tb = document.querySelector("#salary-table tbody"); if (!tb) return;
    const by = {};
    (window.JOBS || []).forEach((j) => { if (j.salary) (by[j.category] = by[j.category] || []).push(j.salary); });
    const rows = Object.entries(by).filter(([, a]) => a.length >= 3).sort((a, b) => b[1].length - a[1].length).map(([k, a]) => {
      a.sort((x, y) => x - y);
      return `<tr><td>${esc(k)}</td><td class="num-c">${a.length}</td><td class="num-c">${money(Math.round(quant(a, .25)))} – ${money(Math.round(quant(a, .75)))}</td><td class="num-c">${money(Math.round(quant(a, .5)))}</td><td class="top">${money(a[a.length - 1])}</td></tr>`;
    });
    tb.innerHTML = rows.join("") || `<tr><td colspan="5" class="muted">${EN ? "Not enough data yet." : "データが不足しています。"}</td></tr>`;
    const note = document.getElementById("cur-note");
    if (note) note.textContent = cur === "usd" ? (EN ? `Converted at about ¥${USDJPY} per $1 (approximate).` : `1ドル＝${USDJPY}円で概算換算しています。`) : "";
  };
  document.querySelectorAll("[data-cur]").forEach((b) => b.addEventListener("click", () => {
    cur = b.getAttribute("data-cur");
    document.querySelectorAll("[data-cur]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    renderSalary();
  }));

  // 求人データ：まず固定データで表示し、シートの最新データが届いたら更新する
  (window.onJobs || ((f) => f()))(() => {
  const jobs = window.JOBS || [];

  // トップ：ヒーローの求人ティッカー（年収上位、重複企業を間引く）
  const tl = document.getElementById("ticker-list");
  if (tl && jobs.length) {
    const picks = [], per = {};
    for (const j of jobs) {
      if (!j.salary) continue;
      per[j.company] = (per[j.company] || 0) + 1;
      if (per[j.company] > 2) continue;
      picks.push(j);
      if (picks.length >= 18) break;
    }
    const html = picks.map((j) =>
      `<li><span class="t-title">${esc(j.title)}</span><span class="t-co">${esc(j.company)}</span><span class="t-sal">${fmtSalary(j.salary)}</span></li>`
    ).join("");
    tl.innerHTML = html + html; // 2周分でシームレスにループ
    tl.querySelectorAll("li").forEach((li, i) => { if (i >= picks.length) li.setAttribute("aria-hidden", "true"); });
    document.querySelectorAll("[data-count='all']").forEach((e) => (e.textContent = jobs.length));
  }

  // トップ：職種カードに件数と最高年収を流し込む
  document.querySelectorAll("[data-cat]").forEach((el) => {
    const cats = el.getAttribute("data-cat").split("|");
    const hit = jobs.filter((j) => cats.includes(j.category));
    const max = Math.max(0, ...hit.map((j) => j.salary || 0));
    const c = el.querySelector("[data-n]"), m = el.querySelector("[data-max]");
    if (c) c.textContent = hit.length;
    if (m) m.textContent = max ? fmtSalary(max) : (EN ? "Negotiable" : "要相談");
    el.href = "jobs.html?cat=" + encodeURIComponent(cats[0]);
  });
  renderSalary();
  const upd = document.querySelector("[data-updated]");
  if (upd && window.JOBS_UPDATED) upd.textContent = window.JOBS_UPDATED.replace(/-/g, ".");

  });
})();
