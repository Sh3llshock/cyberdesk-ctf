/* cheatengine.js — Challenge 3: simplified Cheat-Engine memory scanner
   Agent C. Classic script, own IIFE, no modules/libs/network.
   Reads window.GameMemory exposed by game.js. */
(function () {
  "use strict";

  /* ---------- scanner state ---------- */
  var attached = false;          // attached to PuppyQuest.exe?
  var scanning = false;          // a scan session is active (First Scan done)
  var results = [];              // array of addr strings currently in the result set
  var frozen = {};               // addr -> frozen value
  var editing = null;            // addr currently being edited inline (null = none)
  var body = null;               // window body (null when closed)
  var tick = null;               // refresh interval
  var round = 0;                 // how many Next Scans so far this session
  var fakeVals = {};             // decoy addr -> displayed value
  var fakeDrop = {};             // decoy addr -> Next-Scan round at which it disappears

  function mem() { return window.GameMemory || null; }
  function gameRunning() { return !!(mem() && WM.isOpen("game")); }

  function isFake(addr) { return Object.prototype.hasOwnProperty.call(fakeVals, addr); }
  function valueOf(addr) { if (isFake(addr)) return fakeVals[addr]; var c = cellByAddr(addr); return c ? c.value : "?"; }
  function randFakeAddr() {
    var a; do { a = "0x" + ("000000" + Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase()).slice(-6); }
    while (isFake(a) || cellByAddr(a)); return a;
  }

  function cellByAddr(addr) {
    var m = mem(); if (!m) return null;
    for (var i = 0; i < m.cells.length; i++) if (m.cells[i].addr === addr) return m.cells[i];
    return null;
  }

  function style() {
    if (document.getElementById("ce-style")) return;
    var s = document.createElement("style");
    s.id = "ce-style";
    s.textContent = [
      "#ce-wrap{font-family:var(--mono);color:var(--text);padding:14px 16px;font-size:13px}",
      "#ce-wrap h2{font-family:var(--sans);margin:0 0 2px;font-size:18px}",
      "#ce-wrap .sub{font-family:var(--sans);color:var(--text-dim);font-size:12px;margin-bottom:12px}",
      "#ce-wrap .panel{border:1px solid var(--win-border);border-radius:8px;padding:11px 12px;margin-bottom:12px;background:#fafafa}",
      "#ce-wrap .panel .cap{font-family:var(--sans);font-weight:700;font-size:12px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px}",
      "#ce-wrap label{font-family:var(--sans)}",
      "#ce-wrap input,#ce-wrap select{padding:6px 8px;border:1px solid var(--win-border);border-radius:5px;font-family:var(--mono)}",
      "#ce-wrap .line{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
      "#ce-count{font-family:var(--sans);font-size:12.5px;color:var(--text-dim);margin:8px 0 6px}",
      "#ce-res{border:1px solid var(--win-border);border-radius:6px;overflow:hidden;background:#fff}",
      "#ce-res .hd,#ce-res .rw{display:grid;grid-template-columns:1.2fr 1fr 1.6fr;gap:0;align-items:center}",
      "#ce-res .hd{background:#2b2b2b;color:#eee;font-family:var(--sans);font-size:11.5px;padding:6px 10px}",
      "#ce-res .rw{padding:5px 10px;border-top:1px solid #eee;cursor:pointer}",
      "#ce-res .rw:hover{background:#eef6fd}",
      "#ce-res .rw.one{background:#f1faf1}",
      "#ce-res .val{font-weight:700;color:var(--accent-dark)}",
      "#ce-res .act{display:flex;gap:6px;align-items:center;justify-content:flex-end;font-family:var(--sans)}",
      "#ce-res .act .mini{font-size:11.5px;padding:3px 8px}",
      "#ce-res .frz{font-family:var(--sans);font-size:11px;display:flex;align-items:center;gap:3px}",
      "#ce-empty{padding:14px;text-align:center;color:var(--text-dim);font-family:var(--sans)}",
      "#ce-wrap .btn.mini{padding:4px 10px;font-size:12px}",
      "#ce-edit{margin-top:8px;padding:9px;border:1px dashed var(--accent);border-radius:6px;background:#fffdf4;font-family:var(--sans)}"
    ].join("");
    document.head.appendChild(s);
  }

  /* ---------- rendering ---------- */
  function render() {
    if (!body) return;
    style();

    // if the game process died while attached, detach gracefully
    if (attached && !gameRunning()) {
      attached = false; scanning = false; results = []; frozen = {};
    }

    body.innerHTML =
      '<div id="ce-wrap">' +
      '<h2><img src="assets/img/cheatengine.png" alt="" style="width:22px;height:22px;vertical-align:-4px;margin-right:4px"> CheatEngine</h2>' +
      '<div class="sub">Scan a process’s memory for a value, then edit it.</div>' +
      attachPanel() +
      (attached ? scanPanel() : "") +
      '</div>';

    wire();
  }

  function attachPanel() {
    var running = gameRunning();
    var opts = running
      ? '<option value="puppyquest">DoggoDash.exe (pid 1337)</option>'
      : '<option value="">— no game process found —</option>';
    var statusTxt = attached
      ? '<span style="color:var(--good);font-weight:700">● Attached to DoggoDash.exe</span>'
      : (running ? 'Select the game process and click Attach.'
                 : 'No game process found — open <b>Doggo Dash</b> first.');
    return '<div class="panel"><div class="cap">1 · Attach to process</div>' +
      '<div class="line">' +
      '<select id="ce-proc"' + (attached || !running ? " disabled" : "") + '>' + opts + '</select>' +
      (attached
        ? '<button class="btn ghost mini" id="ce-detach">Detach</button>'
        : '<button class="btn mini" id="ce-attach"' + (running ? "" : " disabled") + '>Attach</button>') +
      '</div>' +
      '<div style="font-family:var(--sans);font-size:12px;margin-top:8px;color:var(--text-dim)">' + statusTxt + '</div>' +
      '</div>';
  }

  function scanPanel() {
    var first = !scanning;
    var html = '<div class="panel"><div class="cap">2 · Scan</div>' +
      '<div class="line">' +
      '<label>Value</label>' +
      '<input id="ce-value" type="text" inputmode="numeric" placeholder="e.g. 50" style="width:110px">' +
      '<label>Scan type</label>' +
      '<select id="ce-type"><option value="exact">Exact Value</option></select>' +
      '</div>' +
      '<div class="line" style="margin-top:9px">' +
      '<button class="btn mini" id="ce-first"' + (first ? "" : " disabled") + '>First Scan</button>' +
      '<button class="btn mini" id="ce-next"' + (first ? " disabled" : "") + '>Next Scan</button>' +
      '<button class="btn ghost mini" id="ce-new">New Scan</button>' +
      '</div>';

    if (scanning) {
      html += '<div id="ce-count">' + results.length + ' result' + (results.length === 1 ? "" : "s") + ' found' +
        (results.length === 1 ? ' — you isolated it! Edit the value below. 🎯' : ' — spend coins in the game, then Next Scan to narrow down.') + '</div>';
      html += resultsTable();
      if (editing) {
        html += '<div id="ce-edit">' +
          '<div style="font-weight:700;margin-bottom:6px">💉 Edit ' + editing +
          ' <span style="font-weight:400;color:var(--text-dim)">(current: ' + valueOf(editing) + ')</span></div>' +
          '<div class="line">' +
          '<label>New value</label>' +
          '<input id="ce-edit-val" type="text" inputmode="numeric" value="999999" style="width:130px">' +
          '<button class="btn mini" id="ce-edit-set">Set value</button>' +
          '<button class="btn ghost mini" id="ce-edit-cancel">Cancel</button>' +
          '</div>' +
          '<div style="font-size:11.5px;color:var(--text-dim);margin-top:6px">Tip: set it sky-high, then go buy the Golden Bone in the game.</div>' +
          '</div>';
      }
    }
    html += '</div>';
    return html;
  }

  function resultsTable() {
    if (!results.length) {
      return '<div id="ce-res"><div id="ce-empty">No addresses match. Try <b>New Scan</b> with the value shown in the game.</div></div>';
    }
    var rows = '<div id="ce-res"><div class="hd"><div>Address</div><div>Value</div><div style="text-align:right">Action</div></div>';
    results.forEach(function (addr) {
      var v = valueOf(addr);
      var one = results.length === 1 ? " one" : "";
      var frz = frozen.hasOwnProperty(addr);
      rows += '<div class="rw' + one + '" data-addr="' + addr + '">' +
        '<div>' + addr + '</div>' +
        '<div class="val">' + v + (frz ? ' 🔒' : '') + '</div>' +
        '<div class="act">' +
        '<label class="frz"><input type="checkbox" class="ce-freeze" ' + (frz ? "checked" : "") + '>Freeze</label>' +
        '<button class="btn mini ce-edit-btn">Edit</button>' +
        '</div></div>';
    });
    rows += '</div>';
    return rows;
  }

  /* ---------- actions ---------- */
  function parseVal(raw) {
    if (raw == null) return null;
    raw = String(raw).trim();
    if (raw === "" || !/^-?\d+$/.test(raw)) return null;
    var n = parseInt(raw, 10);
    return isFinite(n) ? n : null;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }

  function firstScan() {
    var m = mem(); if (!m) { render(); return; }
    var v = parseVal(body.querySelector("#ce-value").value);
    if (v === null) { OS.toast("Enter a whole number to scan for.", "error"); return; }
    round = 0; fakeVals = {}; fakeDrop = {};
    // the one REAL match that matters: the live coins cell
    results = m.cells.filter(function (c) { return c.label === "coins" && c.value === v; }).map(function (c) { return c.addr; });
    // pad with decoy candidates so isolating the real one ALWAYS takes several Next Scans.
    var maxR = 4 + Math.floor(Math.random() * 3);       // disappears fully after 4..6 Next Scans
    var drops = [];
    for (var r = 1; r <= maxR; r++) drops.push(r);      // at least one decoy drops on each round
    var extra = 1 + Math.floor(Math.random() * 3);
    for (var e = 0; e < extra; e++) drops.push(1 + Math.floor(Math.random() * maxR));
    shuffle(drops).forEach(function (d) { var a = randFakeAddr(); fakeVals[a] = v; fakeDrop[a] = d; results.push(a); });
    shuffle(results);
    scanning = true; editing = null; render();
    OS.toast("First Scan: " + results.length + " candidates hold " + v + ".", "info");
  }

  function nextScan() {
    var v = parseVal(body.querySelector("#ce-value").value);
    if (v === null) { OS.toast("Enter the game’s current coin value, then Next Scan.", "error"); return; }
    round++;
    results = results.filter(function (addr) {
      if (isFake(addr)) { if (fakeDrop[addr] > round) { fakeVals[addr] = v; return true; } return false; }
      var c = cellByAddr(addr); return c && c.value === v;   // real coins cell
    });
    editing = null; render();
    if (results.length <= 1) OS.toast("Next Scan: isolated 1 address. 🎯", "success");
    else OS.toast("Next Scan: " + results.length + " candidates left — keep going.", "info");
  }

  function newScan() {
    scanning = false; results = []; editing = null; round = 0; fakeVals = {}; fakeDrop = {}; render();
  }

  // open the inline editor for an address (no window.prompt — works in sandboxed iframes)
  function editAddr(addr) {
    var m = mem();
    if (!m) { OS.toast("Game process is gone — re-attach.", "error"); return; }
    editing = addr;
    render();
    var inp = body.querySelector("#ce-edit-val");
    if (inp) { inp.focus(); inp.select(); }
  }

  // commit the inline editor's value to memory
  function commitEdit() {
    var m = mem();
    if (!m || !editing) { editing = null; render(); return; }
    var addr = editing;
    var inp = body.querySelector("#ce-edit-val");
    var v = parseVal(inp ? inp.value : null);
    if (v === null) { OS.toast("That’s not a valid whole number.", "error"); return; }
    var ok = m.onExternalWrite(addr, v);
    if (ok) {
      if (frozen.hasOwnProperty(addr)) frozen[addr] = v;
      editing = null;
      render();
      OS.toast("Wrote " + v + " to " + addr + ". 💉 Now buy the Golden Bone!", "success");
    } else {
      OS.toast("Write failed for " + addr + ".", "error");
    }
  }

  function wire() {
    var q = function (sel) { return body.querySelector(sel); };

    var at = q("#ce-attach");
    if (at) at.addEventListener("click", function () {
      if (!gameRunning()) { render(); return; }
      var sel = q("#ce-proc");
      if (sel && !sel.value) { OS.toast("No process selected.", "error"); return; }
      attached = true; scanning = false; results = []; frozen = {};
      render();
      OS.toast("Attached to DoggoDash.exe. Now First Scan your coin value.", "success");
    });

    var dt = q("#ce-detach");
    if (dt) dt.addEventListener("click", function () {
      attached = false; scanning = false; results = []; frozen = {};
      render();
    });

    var fb = q("#ce-first"); if (fb) fb.addEventListener("click", firstScan);
    var nb = q("#ce-next");  if (nb) nb.addEventListener("click", nextScan);
    var sb = q("#ce-new");   if (sb) sb.addEventListener("click", newScan);
    var vi = q("#ce-value");
    if (vi) vi.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { if (scanning) nextScan(); else firstScan(); }
    });

    body.querySelectorAll(".ce-edit-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        editAddr(btn.closest(".rw").dataset.addr);
      });
    });
    var setBtn = q("#ce-edit-set");
    if (setBtn) setBtn.addEventListener("click", commitEdit);
    var cancelBtn = q("#ce-edit-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", function () { editing = null; render(); });
    var editInp = q("#ce-edit-val");
    if (editInp) editInp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") commitEdit();
      if (e.key === "Escape") { editing = null; render(); }
    });
    body.querySelectorAll(".rw").forEach(function (rw) {
      rw.addEventListener("dblclick", function () { editAddr(rw.dataset.addr); });
    });
    body.querySelectorAll(".ce-freeze").forEach(function (cb) {
      cb.addEventListener("change", function (e) {
        e.stopPropagation();
        var addr = cb.closest(".rw").dataset.addr;
        if (cb.checked) { frozen[addr] = valueOf(addr); }
        else { delete frozen[addr]; }
        render();
      });
      cb.addEventListener("click", function (e) { e.stopPropagation(); });
    });
  }

  /* ---------- live refresh: show values changing + apply freezes ---------- */
  function refresh() {
    if (!body) return;
    var m = mem();

    // detect game exit while attached
    if (attached && !gameRunning()) { render(); return; }

    // apply freezes (re-write every tick)
    if (m && attached) {
      Object.keys(frozen).forEach(function (addr) {
        m.onExternalWrite(addr, frozen[addr]);
      });
    }

    // live-update just the displayed result values (no full re-render = keeps inputs)
    if (scanning) {
      body.querySelectorAll("#ce-res .rw").forEach(function (rw) {
        var cell = rw.querySelector(".val");
        if (cell) cell.innerHTML = valueOf(rw.dataset.addr) + (frozen.hasOwnProperty(rw.dataset.addr) ? ' 🔒' : '');
      });
    }

    // if attach availability changed (game opened/closed), refresh the attach panel state
    var procSel = body.querySelector("#ce-proc");
    if (!attached && procSel) {
      var running = gameRunning();
      var hasProc = procSel.value === "puppyquest";
      if (running !== hasProc) render();
    }
  }

  /* ---------- registration ---------- */
  OS.registerApp({
    id: "cheatengine",
    name: "CheatEngine",
    icon: '<img src="assets/img/cheatengine.png" alt="CheatEngine">',
    onOpen: function () {
      var rec = WM.open({
        id: "cheatengine", title: "CheatEngine", icon: '<img src="assets/img/cheatengine.png" alt="">', width: 560, height: 560,
        render: function (b) {
          body = b;
          render();
          if (tick) clearInterval(tick);
          tick = setInterval(refresh, 700);
        }
      });
      var closeBtn = rec.el.querySelector(".win-btn.close");
      if (closeBtn) closeBtn.addEventListener("click", function () {
        if (tick) { clearInterval(tick); tick = null; }
        body = null;
        attached = false; scanning = false; results = []; frozen = {};
      });
    }
  });
})();
