/* ===== Fake Terminal shell + command registry ===== */
(function () {
  "use strict";
  var cmds = {};          // name -> {help, run}
  var winRec = null;
  var history = [];
  var hIdx = 0;
  var busy = false;

  var Terminal = {
    registerCommand: function (name, def) { cmds[name.toLowerCase()] = def; },
    _run: runLine
  };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function makeIO(out) {
    return {
      prompt: "student@cyberdesk:~$",
      print: function (text) { line(out, esc(text == null ? "" : text)); },
      printHTML: function (html) { line(out, html); },
      clear: function () { out.innerHTML = ""; }
    };
  }

  function line(out, html) {
    var d = document.createElement("div");
    d.className = "tm-line"; d.innerHTML = html;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }

  function tokenize(s) {
    var m = s.match(/"[^"]*"|'[^']*'|\S+/g) || [];
    return m.map(function (t) { return t.replace(/^["']|["']$/g, ""); });
  }

  function runLine(raw, out, done) {
    var parts = tokenize(raw.trim());
    if (!parts.length) { done && done(); return; }
    var name = parts[0].toLowerCase();
    var args = parts.slice(1);
    var io = makeIO(out);

    // built-ins
    if (name === "clear" || name === "cls") { io.clear(); done && done(); return; }
    if (name === "help") { builtinHelp(io); done && done(); return; }
    if (name === "echo") { io.print(args.join(" ")); done && done(); return; }
    if (name === "ls" || name === "dir") {
      io.printHTML('<span style="color:#5ec8ff">challenges.txt  notes.txt  tools/</span>'); done && done(); return;
    }
    if (name === "cat") {
      if (args[0] === "notes.txt") io.print("TODO: learn nmap and gobuster. Mrs. Lee said the camera on the lab network is 'totally secure'. we'll see.");
      else if (args[0] === "challenges.txt") io.print("1) find the open camera  2) brute-force the hidden admin page. tools are in your PATH: nmap, gobuster.");
      else io.print("cat: " + (args[0] || "") + ": No such file");
      done && done(); return;
    }
    if (name === "whoami") { io.print("student"); done && done(); return; }

    var c = cmds[name];
    if (!c) { io.printHTML('<span style="color:#ff6b6b">' + esc(name) + ': command not found</span>. Type <b>help</b> for a list.'); done && done(); return; }
    try {
      var r = c.run(args, io);
      if (r && typeof r.then === "function") r.then(function () { done && done(); }, function (e) { io.printHTML('<span style="color:#ff6b6b">error: ' + esc(String(e)) + "</span>"); done && done(); });
      else done && done();
    } catch (e) { io.printHTML('<span style="color:#ff6b6b">error: ' + esc(String(e)) + "</span>"); done && done(); }
  }

  function builtinHelp(io) {
    io.printHTML('<span style="color:#9cdcfe">Available commands:</span>');
    var rows = [
      ["help", "show this help"],
      ["ls", "list files"],
      ["cat <file>", "print a file"],
      ["clear", "clear the screen"],
      ["whoami", "print current user"]
    ];
    Object.keys(cmds).forEach(function (n) { rows.push([n, (cmds[n].help || "")]); });
    rows.forEach(function (r) {
      io.printHTML('  <span style="color:#dcdcaa;display:inline-block;min-width:140px">' + esc(r[0]) + "</span> " + esc(r[1]));
    });
    io.printHTML('<span style="color:#888">Tip: many tools support <b>-h</b> for detailed help.</span>');
  }

  function buildTerm(body) {
    if (!document.getElementById("tm-style")) {
      var st = document.createElement("style"); st.id = "tm-style";
      st.textContent =
        ".tm{height:100%;background:#0c0c0c;color:#d4d4d4;font-family:var(--mono);font-size:13.5px;line-height:1.5;display:flex;flex-direction:column}" +
        ".tm-out{flex:1;overflow:auto;padding:10px 12px;white-space:pre-wrap;word-break:break-word}" +
        ".tm-line{min-height:1em}" +
        ".tm-input-row{display:flex;align-items:center;padding:4px 12px 10px;gap:8px}" +
        ".tm-ps{color:#4ec9b0;white-space:nowrap}" +
        ".tm-input{flex:1;background:transparent;border:0;outline:0;color:#fff;font-family:var(--mono);font-size:13.5px}";
      document.head.appendChild(st);
    }
    body.innerHTML =
      '<div class="tm">' +
      '<div class="tm-out"></div>' +
      '<div class="tm-input-row"><span class="tm-ps">student@cyberdesk:~$</span>' +
      '<input class="tm-input" spellcheck="false" autocomplete="off"></div></div>';
    var out = body.querySelector(".tm-out");
    var input = body.querySelector(".tm-input");

    line(out, '<span style="color:#569cd6">CyberDesk Terminal</span>  —  simulated shell for CTF practice');
    line(out, 'Type <b style="color:#dcdcaa">help</b> to list commands. Tools available: <b>nmap</b>, <b>gobuster</b>.');
    line(out, "");
    if (window.Hacker) Hacker.notify("camera");

    body.addEventListener("click", function () { input.focus(); });
    setTimeout(function () { input.focus(); }, 50);

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        if (busy) return;
        var raw = input.value;
        line(out, '<span class="tm-ps" style="color:#4ec9b0">student@cyberdesk:~$</span> ' + esc(raw));
        if (raw.trim()) { history.push(raw); hIdx = history.length; }
        input.value = ""; busy = true;
        runLine(raw, out, function () { busy = false; input.focus(); out.scrollTop = out.scrollHeight; });
      } else if (e.key === "ArrowUp") {
        if (hIdx > 0) { hIdx--; input.value = history[hIdx] || ""; } e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (hIdx < history.length) { hIdx++; input.value = history[hIdx] || ""; } e.preventDefault();
      }
    });
  }

  function register() {
    OS.registerApp({
      id: "terminal", name: "Terminal", icon: '<img src="assets/img/terminal.png" alt="Terminal">',
      onOpen: function () {
        winRec = WM.open({
          id: "terminal", title: "Terminal", icon: '<img src="assets/img/terminal.png" alt="">', width: 760, height: 480,
          render: function (body) { buildTerm(body); }
        });
      }
    });
  }

  window.Terminal = Terminal;
  if (window.OS) register();
  else document.addEventListener("DOMContentLoaded", register);
})();
