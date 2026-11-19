/* ===== CyberDesk OS core + Window Manager ===== */
(function () {
  "use strict";

  var Z = 20;                 // z-index counter
  var windows = {};           // id -> record
  var apps = {};              // id -> app def
  var desktopEl, iconsEl, taskAppsEl;

  /* ---------- Window Manager ---------- */
  var WM = {
    isOpen: function (id) { return !!windows[id]; },
    focus: function (id) {
      var w = windows[id]; if (!w) return;
      Z += 1; w.el.style.zIndex = Z;
      Object.keys(windows).forEach(function (k) { windows[k].el.classList.toggle("active", k === id); });
      markTaskbar();
    },
    close: function (id) {
      var w = windows[id]; if (!w) return;
      w.el.remove(); delete windows[id];
      markTaskbar();
    },
    open: function (opts) {
      if (windows[opts.id]) { WM.focus(opts.id); return windows[opts.id]; }
      var w = Math.min(opts.width || 760, window.innerWidth - 40);
      var h = Math.min(opts.height || 520, window.innerHeight - 90);
      var count = Object.keys(windows).length;
      var left = Math.max(30, (window.innerWidth - w) / 2 + (count * 26) % 160 - 80);
      var top = Math.max(16, (window.innerHeight - 44 - h) / 2 + (count * 22) % 120 - 50);

      var el = document.createElement("div");
      el.className = "window";
      el.style.width = w + "px"; el.style.height = h + "px";
      el.style.left = Math.round(left) + "px"; el.style.top = Math.round(top) + "px";

      var bar = document.createElement("div");
      bar.className = "win-title";
      bar.innerHTML =
        '<span class="wt-icon">' + (opts.icon || "🪟") + '</span>' +
        '<span class="wt-name"></span>' +
        '<button class="win-btn max" title="Maximize / Restore">▢</button>' +
        '<button class="win-btn close" title="Close">✕</button>';
      bar.querySelector(".wt-name").textContent = opts.title || "Window";

      var body = document.createElement("div");
      body.className = "win-body";

      var grip = document.createElement("div");
      grip.className = "win-resize";

      el.appendChild(bar); el.appendChild(body); el.appendChild(grip);
      desktopEl.appendChild(el);

      var rec = {
        id: opts.id, el: el, bodyEl: body,
        focus: function () { WM.focus(opts.id); },
        close: function () { WM.close(opts.id); }
      };
      windows[opts.id] = rec;

      el.addEventListener("mousedown", function () { WM.focus(opts.id); });
      bar.querySelector(".close").addEventListener("click", function (e) { e.stopPropagation(); WM.close(opts.id); });
      bar.querySelector(".max").addEventListener("click", function (e) { e.stopPropagation(); toggleMax(el, rec); });
      bar.addEventListener("dblclick", function (e) {
        if (e.target.closest(".win-btn")) return;
        toggleMax(el, rec);
      });
      makeDraggable(el, bar);
      makeResizable(el, rec);

      try { opts.render && opts.render(body); } catch (err) {
        body.innerHTML = '<div style="padding:16px;color:#c42b1c">App error: ' + String(err) + "</div>";
        console.error(err);
      }
      WM.focus(opts.id);
      return rec;
    }
  };

  function toggleMax(el, rec) {
    if (el.classList.contains("maximized")) {
      el.classList.remove("maximized");
      var r = rec.prevRect || {};
      el.style.left = r.left || "60px"; el.style.top = r.top || "40px";
      el.style.width = r.width || "760px"; el.style.height = r.height || "520px";
    } else {
      rec.prevRect = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
      el.classList.add("maximized");
      el.style.left = "0"; el.style.top = "0"; el.style.width = "100%"; el.style.height = "100%";
    }
  }

  function makeResizable(el, rec) {
    var grip = el.querySelector(".win-resize");
    if (!grip) return;
    var sx, sy, sw, sh, active = false;
    grip.addEventListener("mousedown", function (e) {
      active = true; sx = e.clientX; sy = e.clientY; sw = el.offsetWidth; sh = el.offsetHeight;
      el.classList.remove("maximized");
      e.preventDefault(); e.stopPropagation();
    });
    document.addEventListener("mousemove", function (e) {
      if (!active) return;
      var nw = Math.max(300, sw + (e.clientX - sx));
      var nh = Math.max(180, sh + (e.clientY - sy));
      el.style.width = nw + "px"; el.style.height = nh + "px";
    });
    document.addEventListener("mouseup", function () { active = false; });
  }

  function makeDraggable(el, handle) {
    var sx, sy, ox, oy, dragging = false;
    handle.addEventListener("mousedown", function (e) {
      if (e.target.closest(".win-btn")) return;
      if (el.classList.contains("maximized")) {
        // restore to a normal size before dragging, under the cursor
        el.classList.remove("maximized");
        el.style.width = "760px"; el.style.height = "520px";
        el.style.left = Math.max(0, e.clientX - 120) + "px";
        el.style.top = "0px";
      }
      dragging = true; handle.classList.add("drag");
      sx = e.clientX; sy = e.clientY; ox = el.offsetLeft; oy = el.offsetTop;
      e.preventDefault();
    });
    document.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      var nx = ox + (e.clientX - sx), ny = oy + (e.clientY - sy);
      nx = Math.max(-el.offsetWidth + 80, Math.min(window.innerWidth - 60, nx));
      ny = Math.max(0, Math.min(window.innerHeight - 80, ny));
      el.style.left = nx + "px"; el.style.top = ny + "px";
    });
    document.addEventListener("mouseup", function () { dragging = false; handle.classList.remove("drag"); });
  }

  /* ---------- OS: apps, desktop, taskbar ---------- */
  var OS = {
    registerApp: function (def) {
      apps[def.id] = def;
      if (desktopEl) { renderIcons(); renderTaskApps(); }
    },
    openApp: function (id) {
      var a = apps[id]; if (!a) { OS.toast("App not found: " + id, "error"); return; }
      // un-minimize if it exists
      if (windows[id]) { windows[id].el.style.display = ""; WM.focus(id); markTaskbar(); return; }
      a.onOpen && a.onOpen();
      markTaskbar();
    },
    toast: function (msg, type) {
      var t = document.createElement("div");
      t.className = "toast" + (type ? " " + type : "");
      t.innerHTML = msg;
      document.getElementById("toasts").appendChild(t);
      setTimeout(function () { t.style.transition = "opacity .4s"; t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 400); }, 4200);
    },
    _apps: apps,
    _windows: windows
  };

  function iconMarkup(a) {
    return '<div class="glyph">' + (a.icon || "🪟") + "</div>" +
           '<div class="label">' + a.name + "</div>";
  }

  function renderIcons() {
    iconsEl.innerHTML = "";
    Object.keys(apps).forEach(function (id) {
      var a = apps[id];
      if (a.hideDesktop) return;
      var d = document.createElement("div");
      d.className = "desk-icon"; d.innerHTML = iconMarkup(a);
      d.addEventListener("click", function (e) {
        e.stopPropagation();
        document.querySelectorAll(".desk-icon").forEach(function (n) { n.classList.remove("sel"); });
        d.classList.add("sel");
      });
      d.addEventListener("dblclick", function () { OS.openApp(id); });
      iconsEl.appendChild(d);
    });
  }

  function renderTaskApps() {
    taskAppsEl.innerHTML = "";
    Object.keys(apps).forEach(function (id) {
      var a = apps[id];
      if (a.hideTaskbar) return;
      var b = document.createElement("div");
      b.className = "task-btn"; b.dataset.app = id;
      b.innerHTML = '<span class="tb-icon">' + (a.icon || "🪟") + "</span>";
      b.title = a.name;
      b.addEventListener("click", function () {
        if (windows[id] && windows[id].el.style.display !== "none") { windows[id].el.style.display = "none"; }
        else { OS.openApp(id); }
      });
      taskAppsEl.appendChild(b);
    });
    markTaskbar();
  }

  function markTaskbar() {
    document.querySelectorAll(".task-btn").forEach(function (b) {
      b.classList.toggle("open", !!windows[b.dataset.app] && windows[b.dataset.app].el.style.display !== "none");
    });
  }

  function clock() {
    var el = document.getElementById("clock"); if (!el) return;
    var n = new Date();
    var hh = n.getHours(), mm = String(n.getMinutes()).padStart(2, "0");
    var ap = hh >= 12 ? "PM" : "AM"; var h12 = hh % 12 || 12;
    el.innerHTML = h12 + ":" + mm + " " + ap + "<br>" +
      (n.getMonth() + 1) + "/" + n.getDate() + "/" + n.getFullYear();
  }

  /* ---------- Kali-style lock / login screen (gates the whole desktop) ---------- */
  function lockClock() {
    var el = document.getElementById("lk-time"); if (!el) return;
    var n = new Date();
    var hh = n.getHours(), mm = String(n.getMinutes()).padStart(2, "0");
    var ap = hh >= 12 ? "PM" : "AM"; var h12 = hh % 12 || 12;
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var mons = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    el.innerHTML = '<div class="lk-hm">' + h12 + ":" + mm + " " + ap + "</div>" +
      '<div class="lk-date">' + days[n.getDay()] + ", " + mons[n.getMonth()] + " " + n.getDate() + "</div>";
  }

  function showLock() {
    var ov = document.createElement("div");
    ov.id = "lockscreen";
    ov.innerHTML =
      '<div id="lk-time"></div>' +
      '<form class="lk-card" autocomplete="off">' +
      '<div class="lk-ava">🐕</div>' +
      '<div class="lk-user">Jake</div>' +
      '<div class="lk-host">cyberdesk · Kali GNU/Linux</div>' +
      '<input class="lk-input lk-u" placeholder="username" spellcheck="false" value="">' +
      '<input class="lk-input lk-p" type="password" placeholder="password">' +
      '<div class="lk-err"></div>' +
      '<button class="lk-go" type="submit">Log In</button>' +
      '<div class="lk-hint">Demo login — <b>Jake</b> / <b>Jake123</b></div>' +
      "</form>";
    document.body.appendChild(ov);
    lockClock(); var t = setInterval(lockClock, 10000);

    var u = ov.querySelector(".lk-u"), p = ov.querySelector(".lk-p"), err = ov.querySelector(".lk-err");
    setTimeout(function () { u.focus(); }, 60);
    ov.querySelector(".lk-card").addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = window.Auth ? Auth.check(u.value.trim(), p.value) : (u.value.trim() === "Jake" && p.value === "Jake123");
      if (ok) {
        clearInterval(t);
        ov.classList.add("out");
        setTimeout(function () { ov.remove(); }, 480);
      } else {
        err.textContent = "Authentication failure. Try again.";
        ov.querySelector(".lk-card").classList.remove("shake"); void ov.offsetWidth;
        ov.querySelector(".lk-card").classList.add("shake");
        p.value = ""; p.focus();
      }
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    desktopEl = document.getElementById("desktop");
    iconsEl = document.getElementById("icons");
    taskAppsEl = document.querySelector(".task-apps");
    desktopEl.addEventListener("click", function () {
      document.querySelectorAll(".desk-icon").forEach(function (n) { n.classList.remove("sel"); });
    });
    renderIcons(); renderTaskApps();
    clock(); setInterval(clock, 10000);
    showBoot();
  }

  /* ---------- Kali-style boot sequence (plays before the lock screen) ---------- */
  function showBoot() {
    var ov = document.createElement("div");
    ov.id = "bootscreen";
    ov.innerHTML = '<div id="boot-log"></div>';
    document.body.appendChild(ov);
    var log = ov.querySelector("#boot-log");

    var lines = [
      { t: "CyberDesk Security Lab — Kali GNU/Linux (live)", c: "head" },
      { t: "[  OK  ] Reached target Basic System.", c: "ok" },
      { t: "[  OK  ] Mounted /dev/sda1 on /lab.", c: "ok" },
      { t: "         loading kernel modules ....................... done", c: "dim" },
      { t: "         compiling challenge modules .................. done", c: "dim" },
      { t: "         bringing up virtual network 10.10.10.0/24 .... up", c: "dim" },
      { t: "         starting services: browser, terminal, cheatengine ... ok", c: "dim" },
      { t: "         loading wordlists (common.txt) ............... 4719 entries", c: "dim" },
      { t: "[  OK  ] Started CyberDesk Desktop Environment.", c: "ok" },
      { t: "         running security self-check .................. passed", c: "dim" },
      { t: "[SUCCESS] Opening Kali …", c: "success" }
    ];

    var delay = 160;
    lines.forEach(function (ln) {
      setTimeout(function () {
        var d = document.createElement("div");
        d.className = "boot-ln boot-" + ln.c;
        d.textContent = ln.t;
        log.appendChild(d);
        log.scrollTop = log.scrollHeight;
      }, delay);
      delay += (ln.c === "success") ? 200 : 180;   // command lines ~2s total
    });

    // last line is [SUCCESS]; hang ~1s, then hand off to the login screen
    setTimeout(function () {
      ov.classList.add("out");
      setTimeout(function () { ov.remove(); showLock(); }, 450);
    }, delay + 1000);
  }

  window.WM = WM;
  window.OS = OS;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
