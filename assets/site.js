/* ===== サイト共通設定：ここだけ書き換えればOK ===== */
window.SITE = {
  email: "k.kumagai@tenthrevolution.com",          // 問い合わせ先（会社アドレスに変えるならここ）
  linkedin: "https://www.linkedin.com/in/",   // 熊谷さんのLinkedIn URLに差し替え
  bookingUrl: "",                              // カレンダー予約URLがあれば（空なら非表示）
};

(function () {
  const S = window.SITE;
  const yen = (m) => (m >= 10000 ? (m / 10000).toFixed(m % 10000 ? 1 : 0) + "億円" : m.toLocaleString("ja-JP") + "万円");
  window.fmtSalary = (m) => (m ? "〜" + yen(m) : "要相談");

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
    if (m) m.textContent = max ? fmtSalary(max) : "要相談";
    el.href = "jobs.html?cat=" + encodeURIComponent(cats[0]);
  });
  const upd = document.querySelector("[data-updated]");
  if (upd && window.JOBS_UPDATED) upd.textContent = window.JOBS_UPDATED.replace(/-/g, ".");

  });
})();
