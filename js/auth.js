/* ===== Shared login (gates instaDog + School Grades) ===== */
(function () {
  "use strict";
  var USER = "Jake", PASS = "Jake123";
  var loggedIn = false;

  var Auth = {
    isLoggedIn: function () { return loggedIn; },
    user: function () { return loggedIn ? USER : null; },
    // pure credential check (does NOT change login state) — used by the OS lock screen
    check: function (u, p) { return u === USER && p === PASS; },
    login: function (u, p) {
      if (u === USER && p === PASS) { loggedIn = true; return true; }
      return false;
    },
    logout: function () { loggedIn = false; },

    /* Render a login screen into `container`.
       opts = { brand, icon, subtitle, onSuccess } */
    renderLogin: function (container, opts) {
      opts = opts || {};
      injectStyle();
      var wrap = document.createElement("div");
      wrap.className = "auth-screen";
      wrap.innerHTML =
        '<div class="auth-card">' +
        '<div class="auth-brand">' + (opts.icon || "🔐") + " " + esc(opts.brand || "Sign in") + "</div>" +
        (opts.subtitle ? '<div class="auth-sub">' + esc(opts.subtitle) + "</div>" : "") +
        '<div class="auth-field"><label>Username</label><input class="auth-user" autocomplete="off" spellcheck="false" placeholder="username"></div>' +
        '<div class="auth-field"><label>Password</label><input class="auth-pass" type="password" autocomplete="off" placeholder="password"></div>' +
        '<div class="auth-err"></div>' +
        '<button class="btn auth-go">Log in</button>' +
        '<div class="auth-hint">Demo account for this lab — <b>Username:</b> Jake &nbsp; <b>Password:</b> Jake123</div>' +
        "</div>";
      container.innerHTML = "";
      container.appendChild(wrap);

      var u = wrap.querySelector(".auth-user");
      var p = wrap.querySelector(".auth-pass");
      var err = wrap.querySelector(".auth-err");
      function submit() {
        if (Auth.login(u.value.trim(), p.value)) {
          if (opts.onSuccess) opts.onSuccess();
        } else {
          err.textContent = "Sorry, your username or password was incorrect.";
          p.value = ""; p.focus();
        }
      }
      wrap.querySelector(".auth-go").addEventListener("click", submit);
      p.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
      u.addEventListener("keydown", function (e) { if (e.key === "Enter") p.focus(); });
      setTimeout(function () { u.focus(); }, 40);
    }
  };

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function injectStyle() {
    if (document.getElementById("auth-style")) return;
    var st = document.createElement("style");
    st.id = "auth-style";
    st.textContent =
      ".auth-screen{min-height:100%;display:flex;align-items:center;justify-content:center;background:#fafafa;font-family:var(--sans);padding:30px}" +
      ".auth-card{width:330px;max-width:100%;background:#fff;border:1px solid #e3e6ea;border-radius:12px;padding:26px 26px 20px;box-shadow:0 6px 24px rgba(0,0,0,.06)}" +
      ".auth-brand{font-size:26px;font-weight:800;text-align:center;letter-spacing:.3px}" +
      ".auth-sub{text-align:center;color:var(--text-dim);font-size:13px;margin:4px 0 18px}" +
      ".auth-field{margin-bottom:11px}" +
      ".auth-field label{display:block;font-size:12px;color:var(--text-dim);margin-bottom:4px}" +
      ".auth-field input{width:100%;padding:9px 11px;border:1px solid #d6dbe0;border-radius:6px;font-size:14px;background:#fafbfc}" +
      ".auth-field input:focus{outline:0;border-color:var(--accent);background:#fff}" +
      ".auth-err{color:var(--bad);font-size:12.5px;min-height:16px;margin:2px 0 8px;text-align:center}" +
      ".auth-go{width:100%;padding:10px;font-size:14px;font-weight:700}" +
      ".auth-hint{margin-top:14px;font-size:11.5px;color:#8a929b;text-align:center;background:#f3f5f7;border-radius:6px;padding:8px}";
    document.head.appendChild(st);
  }

  window.Auth = Auth;
})();
