/* ===== CTF registry + tracker ===== */
(function () {
  "use strict";
  var STORE = "cyberdesk_flags_v1";
  var defs = {};          // flagId -> {title, flag, points}
  var order = ["idor", "access", "memory", "ports"];
  var solved = load();

  function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(solved)); } catch (e) {} }

  var CTF = {
    register: function (id, def) { defs[id] = def; refresh(); },
    getFlag: function (id) { return defs[id] ? defs[id].flag : null; },
    isSolved: function (id) { return !!solved[id]; },
    capture: function (id) {
      if (!defs[id]) { console.warn("capture unknown flag", id); return; }
      if (solved[id]) { refresh(); return; }
      solved[id] = true; save(); refresh();
      var d = defs[id];
      OS.toast('<div class="tt">🚩 Flag captured! +' + (d.points || 100) + "</div>" +
        d.title + '<div class="flag-box" style="margin-top:8px">' + d.flag + "</div>", "success");
      if (count() === order.length) {
        setTimeout(function () {
          OS.toast('<div class="tt">🏆 ALL 4 FLAGS CAPTURED</div>You cleared every challenge. Nice work, agent!', "success");
        }, 600);
      }
    },
    reset: function () { solved = {}; save(); refresh(); OS.toast("Progress reset.", "info"); },
    _count: count
  };

  function count() { return order.filter(function (id) { return solved[id]; }).length; }

  function refresh() {
    var b = document.querySelector('.task-btn[data-app="ctf"] .tb-badge');
    if (b) b.textContent = count() + "/" + order.length;
    var body = document.getElementById("ctf-body");
    if (body) renderTracker(body);
  }

  function renderTracker(root) {
    var n = count(), total = order.length;
    var html = '<div style="padding:16px 18px;font-family:var(--sans)">';
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">' +
      '<div style="font-size:22px;font-weight:700">CTF Tracker</div>' +
      '<div style="margin-left:auto;font-size:14px;color:var(--text-dim)">' + n + " / " + total + " solved</div></div>";
    html += '<div style="height:10px;background:#e6e6e6;border-radius:6px;overflow:hidden;margin-bottom:16px">' +
      '<div style="height:100%;width:' + (n / total * 100) + '%;background:var(--good);transition:width .4s"></div></div>';

    order.forEach(function (id, i) {
      var d = defs[id] || { title: id };
      var done = !!solved[id];
      html += '<div style="display:flex;gap:12px;align-items:flex-start;padding:11px 12px;border:1px solid var(--win-border);border-radius:7px;margin-bottom:9px;background:' + (done ? "#f1faf1" : "#fff") + '">';
      html += '<div style="font-size:20px">' + (done ? "✅" : "⬜") + "</div>";
      html += '<div style="flex:1">';
      html += '<div style="font-weight:700;font-size:14px">' + (i + 1) + ". " + d.title + (done ? "" : "") + "</div>";
      html += '<div style="font-size:12.5px;color:var(--text-dim);margin:2px 0 4px">' + (d.hint || "") + "</div>";
      if (done) html += '<div class="flag-box" style="font-size:12px">' + d.flag + "</div>";
      else html += '<div style="font-size:12px;color:#999">Flag hidden — solve the challenge to reveal it.</div>';
      html += "</div></div>";
    });

    html += '<div style="margin-top:6px;display:flex;gap:8px;align-items:center">' +
      '<button class="btn ghost" id="ctf-reset">Reset progress</button>' +
      '<span style="font-size:12px;color:var(--text-dim)">Progress saves in this browser.</span></div>';
    html += "</div>";
    root.innerHTML = html;
    var rb = root.querySelector("#ctf-reset");
    if (rb) rb.addEventListener("click", function () {
      // two-step confirm (no blocking modal — prompt/confirm are blocked in sandboxed iframes)
      if (rb.getAttribute("data-armed") === "1") { CTF.reset(); return; }
      rb.setAttribute("data-armed", "1");
      rb.textContent = "Click again to confirm reset";
      setTimeout(function () { if (rb) { rb.setAttribute("data-armed", "0"); rb.textContent = "Reset progress"; } }, 2500);
    });
  }

  function register() {
    OS.registerApp({
      id: "ctf",
      name: "CTF Tracker",
      icon: "🚩",
      onOpen: function () {
        WM.open({
          id: "ctf", title: "CTF Tracker", icon: "🚩", width: 520, height: 540,
          render: function (body) { body.id = "ctf-body"; renderTracker(body); }
        });
      }
    });
    // add badge to taskbar button once it exists
    setTimeout(function () {
      var tb = document.querySelector('.task-btn[data-app="ctf"]');
      if (tb && !tb.querySelector(".tb-badge")) {
        var s = document.createElement("span");
        s.className = "tb-badge";
        s.style.cssText = "font-size:11px;background:var(--accent);color:#fff;border-radius:9px;padding:1px 6px;margin-left:2px";
        s.textContent = count() + "/" + order.length;
        tb.appendChild(s);
      }
    }, 300);
  }

  window.CTF = CTF;
  if (window.OS) register();
  else document.addEventListener("DOMContentLoaded", register);
})();
