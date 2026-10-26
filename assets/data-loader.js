/* ===== 求人データの読み込み =====
   スプレッドシートの「WEB公開」タブ（CSVで公開）を読み込み、サイトの求人一覧に反映する。
   取得に失敗した場合や、中身が想定外の場合は、同梱の data/jobs.js（固定データ）をそのまま使う。 */
(function () {
  // 「WEB公開」タブを「ウェブに公開」したCSVのURL（シートの更新は数分で反映）
  var CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDcnLHoRNQ5XntmqfTi2CbHpYJM4B7x_14BwsjV5pH-mES1W5NAtdBbv3ESghLn0_hbs5SjibOZcs-/pub?gid=9001&single=true&output=csv";

  // シートは英語表記、サイトは日本語表記。ここに無い値は、そのまま表示される。
  var MAP = {
    category: {
      "AI Consultant": "AI・データコンサルタント",
      "AI / LLM Engineer": "AI / LLMエンジニア",
      "FDE": "FDE・ソリューション実装",
      "SE / Pre-sales": "ソリューションエンジニア / プリセールス",
      "Data Scientist": "データサイエンティスト",
      "Data Engineer / Architect": "データエンジニア / アーキテクト",
      "AE / BDR": "セールス・カスタマーサクセス",
      "Data Analyst": "データアナリスト・リスク"
    },
    industry: {
      "Consulting & SIer": "コンサル・SIer",
      "Tech & Internet": "テック・SaaS",
      "Financial Services & Fintech": "金融・フィンテック",
      "Industrial, Mobility & Infrastructure": "製造・モビリティ・インフラ",
      "Consumer & Commerce": "小売・コンシューマー",
      "Real estate & PropTech": "不動産テック",
      "Healthcare & Pharma": "ヘルスケア・製薬"
    },
    style: { "Hybrid": "ハイブリッド", "Full-remote": "フルリモート" },
    language: { "Japanese": "日本語", "Bilingual": "日英バイリンガル", "English": "英語" }
  };

  // CSV（引用符・改行・カンマに対応）
  function parseCSV(text) {
    var rows = [], row = [], cell = "", q = false, i = 0, c;
    text = text.replace(/^﻿/, "");
    for (; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); cell = ""; rows.push(row); row = [];
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function toJobs(rows) {
    var h = rows[0].map(function (s) { return s.trim(); });
    var need = ["company", "title", "category", "industry", "salary", "style", "language", "about", "confidential"];
    if (need.some(function (k) { return h.indexOf(k) < 0; })) throw new Error("unexpected header");
    var idx = {}; need.forEach(function (k) { idx[k] = h.indexOf(k); });
    var tr = function (k, v) { return (MAP[k] && MAP[k][v]) || v; };
    var out = [];
    rows.slice(1).forEach(function (r) {
      var g = function (k) { return (r[idx[k]] || "").trim(); };
      if (!g("company") || !g("title")) return;
      var sal = parseInt(g("salary").replace(/[^0-9]/g, ""), 10);
      out.push({
        company: g("company"),
        confidential: g("confidential") === "1" || g("confidential").toLowerCase() === "true",
        title: g("title"),
        category: tr("category", g("category")),
        industry: tr("industry", g("industry")),
        salary: isNaN(sal) ? 0 : sal,
        style: tr("style", g("style")),
        language: tr("language", g("language")),
        about: g("about")
      });
    });
    return out;
  }

  var today = function () {
    try { return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  };

  // onJobs(cb)：まず固定データ（data/jobs.js）で cb を実行。シートの最新データが取れたら、もう一度 cb を実行する。
  var subs = [], liveReady = false;
  window.onJobs = function (cb) {
    subs.push(cb);
    try { cb(); } catch (e) { if (window.console) console.error(e); }
    if (liveReady) { try { cb(); } catch (e) { if (window.console) console.error(e); } }
  };
  window.JOBS_SOURCE = "static";

  fetch(CSV_URL, { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.text(); })
    .then(function (t) {
      var jobs = toJobs(parseCSV(t));
      if (jobs.length < 1) throw new Error("empty");
      window.JOBS = jobs;
      window.JOBS_UPDATED = today();
      window.JOBS_SOURCE = "sheet";
      liveReady = true;
      subs.forEach(function (cb) { try { cb(); } catch (e) { if (window.console) console.error(e); } });
    })
    .catch(function (e) {
      // 失敗時は固定データのまま表示（エラーは画面に出さない）
      if (window.console) console.warn("求人データ：固定データを表示します（" + e.message + "）");
    });
})();
