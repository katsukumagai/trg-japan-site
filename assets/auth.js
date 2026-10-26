/* ===== Googleログイン =====
   誰でもログインできる。ただし「許可リスト」にあるメールだけが、実名とJDリンク入りの求人データを受け取れる。
   データはApps Script（サーバー側）がメールを確認してから返す。画面で隠しているだけではない。 */
(function () {
  var C = window.TRG_AUTH || {};
  if (!C.clientId || !C.api) return;
  var EN = document.documentElement.lang === "en";
  var KEY = "trg_cred";
  var T = EN
    ? { login: "Log in", logout: "Log out", title: "Log in with Google", body: "For the team and invited guests. After logging in, authorized accounts see company names and can open each job description.", ok: "Logged in", team: "Team access: company names and JDs are shown.", guest: "Logged in. This account has no extra access yet.", fail: "Login failed. Please try again." }
    : { login: "ログイン", logout: "ログアウト", title: "Googleでログイン", body: "チーム・招待された方向けです。ログインすると、許可されたアカウントには企業名とJDが表示されます。", ok: "ログイン済み", team: "チーム権限：企業名とJDを表示しています。", guest: "ログインしました。このアカウントには追加の閲覧権限はありません。", fail: "ログインに失敗しました。もう一度お試しください。" };

  function jwt(t) { try { return JSON.parse(decodeURIComponent(escape(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))))); } catch (e) { return null; } }
  function load() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function save(t) { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch (e) {} }

  // 画面部品
  var nav = document.querySelector(".nav .lang");
  if (!nav) return;
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "loginbtn"; btn.textContent = T.login;
  nav.parentNode.insertBefore(btn, nav.nextSibling);

  var modal = document.createElement("div");
  modal.className = "login-modal"; modal.hidden = true;
  modal.innerHTML = '<div class="login-card" role="dialog" aria-modal="true" aria-labelledby="lm-t"><button class="lm-x" type="button" aria-label="Close">×</button><h2 id="lm-t">' + T.title + '</h2><p>' + T.body + '</p><div id="g-btn"></div><p class="lm-msg" id="lm-msg" role="status"></p></div>';
  document.body.appendChild(modal);
  var msg = modal.querySelector("#lm-msg");
  function open() { modal.hidden = false; }
  function close() { modal.hidden = true; }
  modal.addEventListener("click", function (e) { if (e.target === modal || e.target.classList.contains("lm-x")) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  function setLoggedIn(email, team) {
    btn.textContent = T.logout; btn.classList.add("on");
    btn.title = email + (team ? " (team)" : "");
    btn.onclick = function () {
      save(""); try { google.accounts.id.disableAutoSelect(); } catch (e) {}
      location.reload();
    };
  }
  function setLoggedOut() { btn.textContent = T.login; btn.classList.remove("on"); btn.title = ""; btn.onclick = open; }
  setLoggedOut();

  function callApi(cred, fromClick) {
    return fetch(C.api, { method: "POST", body: cred })   // text/plain の単純リクエスト（プリフライト不要）
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) { save(""); setLoggedOut(); if (fromClick) { msg.textContent = T.fail; open(); } return; }
        setLoggedIn(d.email, d.team);
        if (d.team && d.jobs && window.trgSetTeamJobs) window.trgSetTeamJobs(d.jobs);
        if (fromClick) { msg.textContent = d.team ? T.team : T.guest; setTimeout(close, 1400); }
      })
      .catch(function () { if (fromClick) { msg.textContent = T.fail; open(); } });
  }

  function onCred(resp) { if (resp && resp.credential) { save(resp.credential); callApi(resp.credential, true); } }

  function initGsi() {
    google.accounts.id.initialize({ client_id: C.clientId, callback: onCred, auto_select: false });
    google.accounts.id.renderButton(document.getElementById("g-btn"), { theme: "outline", size: "large", shape: "pill", text: "signin_with", locale: EN ? "en" : "ja" });
  }
  var s = document.createElement("script");
  s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.defer = true; s.onload = initGsi;
  document.head.appendChild(s);

  // 保存済みのトークンが有効なら、そのまま復元（IDトークンの有効期限は約1時間）
  var saved = load(), p = saved && jwt(saved);
  if (p && p.exp * 1000 > Date.now() + 30000) callApi(saved, false); else if (saved) save("");
})();
