(function () {
  let JOBS = window.JOBS || [];
  const S = window.SITE, esc = window.esc, fmt = window.fmtSalary, EN = window.EN;
  const $ = (id) => document.getElementById(id);
  const MAXBAR = 3000; // 年収バーのスケール上限（万円）

  const chips = $("chips");

  // 求人データが（再）取得されるたびに、件数・絞り込み項目・一覧を作り直す
  function build() {
    JOBS = window.JOBS || [];
    $("s-total").textContent = JOBS.length;
    $("s-fde").textContent = JOBS.filter((j) => j.category.startsWith("FDE")).length;
    $("s-high").textContent = JOBS.filter((j) => (j.salary || 0) >= 1500).length;
    $("s-upd").textContent = (window.JOBS_UPDATED || "").replace(/-/g, ".");

    // 絞り込み項目を実データから生成（件数の多い順）。選択中の値は保持する
    const tally = (k) => Object.entries(JOBS.reduce((a, j) => (j[k] && (a[j[k]] = (a[j[k]] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
    [["industry", "industry"], ["style", "style"], ["lang", "language"]].forEach(([id, k]) => {
      const sel = $(id), cur = sel.value;
      sel.length = 1;
      tally(k).forEach(([v, n]) => sel.insertAdjacentHTML("beforeend", `<option value="${esc(v)}">${esc(v)}${EN ? " (" + n + ")" : "（" + n + "）"}</option>`));
      sel.value = [...sel.options].some((o) => o.value === cur) ? cur : "";
      state[k === "language" ? "language" : k] = sel.value;
    });
    chips.innerHTML = `<button class="chip" type="button" data-v="" aria-pressed="true">${EN ? "All" : "すべて"}<span class="c">${JOBS.length}</span></button>` +
      tally("category").map(([v, n]) => `<button class="chip" type="button" data-v="${esc(v)}" aria-pressed="false">${esc(v)}<span class="c">${n}</span></button>`).join("");
    syncChips(); render();
  }

  const state = { q: "", cat: "", industry: "", style: "", language: "", sal: 0, sort: "sal" };

  // URLパラメータで初期状態を復元（トップの職種カードから ?cat= で来る）
  const params = new URLSearchParams(location.search);
  if (params.get("cat")) state.cat = params.get("cat");
  if (params.get("q")) state.q = $("q").value = params.get("q");

  function syncChips() {
    chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c.dataset.v === state.cat));
  }

  function render() {
    const q = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let list = JOBS.filter((j) => {
      if (state.cat && j.category !== state.cat) return false;
      if (state.industry && j.industry !== state.industry) return false;
      if (state.style && j.style !== state.style) return false;
      if (state.language && j.language !== state.language) return false;
      if (state.sal && (j.salary || 0) < state.sal) return false;
      if (q.length) {
        const hay = (j.title + " " + j.company + " " + j.category + " " + j.industry + " " + j.about).toLowerCase();
        if (!q.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    list.sort(state.sort === "co"
      ? (a, b) => a.company.localeCompare(b.company, "ja") || (b.salary || 0) - (a.salary || 0)
      : (a, b) => (b.salary || 0) - (a.salary || 0) || a.company.localeCompare(b.company, "ja"));

    $("count").textContent = list.length;
    $("list").innerHTML = list.length ? list.map(row).join("") :
      (EN ? `<li class="empty">No roles match. Clear a filter, or <a href="#" data-mail="Inquiry about confidential roles">ask us about confidential roles</a>.</li>` : `<li class="empty">条件に合う求人がありません。条件を外すか、<a href="#" data-mail="求人の相談">非公開求人について相談</a>してください。</li>`);
    $("list").querySelectorAll("[data-mail]").forEach((a) => {
      a.href = "mailto:" + S.email + "?subject=" + encodeURIComponent(a.dataset.mail);
    });

    const p = new URLSearchParams();
    if (state.cat) p.set("cat", state.cat);
    if (state.q) p.set("q", state.q);
    history.replaceState(null, "", p.toString() ? "?" + p : location.pathname);
  }

  function row(j) {
    const pct = j.salary ? Math.min(100, Math.round((j.salary / MAXBAR) * 100)) : 0;
    const tags = [`<span class="cat">${esc(j.category)}</span>`, j.industry, j.style, j.language]
      .filter(Boolean).map((t) => (t.startsWith("<") ? t : `<span>${esc(t)}</span>`)).join("");
    const subject = EN ? `Role inquiry: ${j.company} / ${j.title}` : `求人の相談：${j.company}／${j.title}`;
    const generic = EN ? "We will explain the role, the process and the experience required." : "業務内容・選考の流れ・求める経験を詳しくご説明します。";
    const about = j.confidential
      ? (EN ? "The company name is shared in our conversation. " : "企業名は面談の際にお伝えしています。") + generic
      : (j.about || generic);
    return `<li class="job"><details>
      <summary>
        <span class="j-title">${esc(j.title)}</span>
        <span class="j-co">${esc(j.company)}${j.confidential ? `<span class="conf">${EN ? "Confidential" : "企業名非公開"}</span>` : ""}</span>
        <span class="j-tags">${tags}</span>
        <span class="j-sal"><small>${EN ? "Salary" : "年収"}</small> <b>${fmt(j.salary)}</b>${pct ? `<span class="bar" aria-hidden="true"><i style="width:${pct}%"></i></span>` : ""}</span>
      </summary>
      <div class="j-body"><p>${esc(about)}</p><a class="btn btn-primary btn-sm" href="#" data-mail="${esc(subject)}">${EN ? "Ask about this role" : "この求人について相談する"}</a></div>
    </details></li>`;
  }

  // イベント
  let t;
  $("q").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; render(); }, 150); });
  ["industry", "style"].forEach((k) => $(k).addEventListener("change", (e) => { state[k] = e.target.value; render(); }));
  $("lang").addEventListener("change", (e) => { state.language = e.target.value; render(); });
  $("sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  $("sal").addEventListener("input", (e) => {
    state.sal = +e.target.value;
    $("sal-v").textContent = state.sal ? (EN ? "¥" + (state.sal / 100) + "M+" : state.sal.toLocaleString("ja-JP") + "万円以上") : (EN ? "Any" : "指定なし");
    render();
  });
  chips.addEventListener("click", (e) => {
    const c = e.target.closest(".chip"); if (!c) return;
    state.cat = c.dataset.v; syncChips(); render();
  });
  $("reset").addEventListener("click", () => {
    Object.assign(state, { q: "", cat: "", industry: "", style: "", language: "", sal: 0 });
    $("q").value = ""; ["industry", "style", "lang"].forEach((k) => ($(k).value = ""));
    $("sal").value = 0; $("sal-v").textContent = EN ? "Any" : "指定なし";
    syncChips(); render();
  });

  (window.onJobs || ((f) => f()))(build);
})();
