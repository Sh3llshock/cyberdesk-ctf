/* ===== Challenge 4 — The Exposed Camera (nmap command + Camera site) ===== */
/* Agent D. Classic script, no modules. Globals used:
   Terminal.registerCommand, Browser.registerSite, CTF.register/capture/getFlag, OS.toast */
(function () {
  "use strict";

  var TARGET = "10.10.10.5";
  var CAM_HOST = "10.10.10.5:8080";
  var introShown = false;

  /* ---------------------------------------------------------------- flag */
  CTF.register("ports", {
    title: "The Exposed Camera — Find the Open Port",
    flag: "FLAG{sh0d4n_s3es_y0ur_c4m3ra}",
    points: 100,
    hint: "Scan the IP for open ports, then open the camera service in the Browser."
  });

  /* =============================================================== helpers */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // colored, fixed-width friendly line (terminal body is white-space:pre-wrap)
  function row(port, state, service, extra, color) {
    var p = pad(port, 10), st = pad(state, 10), sv = pad(service, 11);
    var line = esc(p) + esc(st) + esc(sv) + esc(extra || "");
    if (color) return '<span style="color:' + color + '">' + line + "</span>";
    return line;
  }
  function pad(s, n) { s = String(s); while (s.length < n) s += " "; return s; }

  /* ============================================================ nmap help */
  function printUsage(io) {
    io.printHTML('<span style="color:#569cd6">Nmap 7.94 (simulated)</span> — usage: <b>nmap [options] &lt;target&gt;</b>');
    io.printHTML("");
    io.printHTML('<span style="color:#dcdcaa">OPTIONS</span>');
    io.printHTML('  <span style="color:#9cdcfe">-h, --help</span>   show this help and exit');
    io.printHTML('  <span style="color:#9cdcfe">-p &lt;ports&gt;</span>   scan given ports (e.g. <b>-p 1-65535</b> or <b>-p-</b> for all)');
    io.printHTML('  <span style="color:#9cdcfe">-sV</span>          probe open ports to detect service / version');
    io.printHTML("");
    io.printHTML('<span style="color:#dcdcaa">EXAMPLE</span>');
    io.printHTML('  <span style="color:#4ec9b0">nmap ' + TARGET + '</span>        scan the lab camera host');
    io.printHTML('  <span style="color:#4ec9b0">nmap -sV ' + TARGET + '</span>    scan and grab service banners');
    io.printHTML("");
    io.printHTML('<span style="color:#888">Tip: an OPEN port is a service you can reach. Find it, then open it in the Browser.</span>');
  }

  /* ========================================================= nmap scanning */
  function scanTarget(io, target, withVersion) {
    io.printHTML('Starting <span style="color:#569cd6">Nmap 7.94</span> ( simulated ) at ' + nowStr());
    return wait(350).then(function () {
      io.print("Initiating Ping Scan ...");
      return wait(400);
    }).then(function () {
      io.print("Host is up (0.0019s latency).");
      io.print("Initiating SYN Stealth Scan ...");
      return wait(500);
    }).then(function () {
      io.print("Scanning " + target + " [1000 ports]");
      return wait(450);
    }).then(function () {
      io.printHTML('Discovered open port <span style="color:#6ee36e">8080/tcp</span> on ' + target);
      return wait(400);
    }).then(function () {
      io.printHTML("");
      io.printHTML("Nmap scan report for " + esc(target));
      io.printHTML("Host is up (0.0019s latency).");
      io.printHTML("");
      io.printHTML(row("PORT", "STATE", "SERVICE", withVersion ? "VERSION" : "", "#888"));
      io.printHTML(row("22/tcp", "filtered", "ssh", "", null));
      io.printHTML(row("23/tcp", "closed", "telnet", "", null));
      io.printHTML(row("80/tcp", "closed", "http", "", null));
      io.printHTML(row("443/tcp", "closed", "https", "", null));
      io.printHTML(row("554/tcp", "filtered", "rtsp", "", null));
      io.printHTML(row(
        "8080/tcp", "open", "http",
        withVersion ? "Hikvision IP camera httpd (DS-2CD2032-I)" : "(IP-Camera Web UI)",
        "#6ee36e"
      ));
      io.printHTML(row("9000/tcp", "filtered", "cslistener", "", null));
      io.printHTML("");
      io.printHTML('<span style="color:#888">Nmap done: 1 IP address (1 host up) scanned — 1 open port.</span>');
      io.printHTML("");
      io.printHTML('<span style="color:#dcdcaa">[+] 8080/tcp is OPEN</span> — try <b style="color:#6ee36e">http://' + TARGET + ':8080</b> in the Browser.');
      if (withVersion) {
        io.printHTML('<span style="color:#888">    Banner: Hikvision IP camera web service (model DS-2CD2032-I) — login page exposed to the network.</span>');
      }
    });
  }

  function hostDown(io, target) {
    io.printHTML('Starting <span style="color:#569cd6">Nmap 7.94</span> ( simulated ) at ' + nowStr());
    return wait(400).then(function () {
      io.print("Initiating Ping Scan ...");
      return wait(500);
    }).then(function () {
      io.printHTML("");
      io.printHTML("Nmap scan report for " + esc(target));
      io.printHTML('<span style="color:#ff6b6b">Host seems down / all ports filtered (0 open).</span>');
      io.printHTML('<span style="color:#888">If you believe the host is up but blocking pings, try a different target.</span>');
      io.printHTML('<span style="color:#888">Hint: the lab camera lives at ' + TARGET + ' — check notes.txt.</span>');
    });
  }

  function nowStr() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes()) + " local time";
  }

  /* ========================================================= register cmd */
  Terminal.registerCommand("nmap", {
    help: "scan a host for open ports",
    run: function (args, io) {
      args = args || [];

      // help / no args
      var lower = args.map(function (a) { return String(a).toLowerCase(); });
      if (!args.length || lower.indexOf("-h") >= 0 || lower.indexOf("--help") >= 0) {
        printUsage(io);
        return;
      }

      var withVersion = lower.indexOf("-sv") >= 0;

      // find a target token: an IP-ish arg that is not a flag / port spec
      var target = null;
      for (var i = 0; i < args.length; i++) {
        var a = String(args[i]);
        if (a.charAt(0) === "-") continue;                 // flag
        // skip a port argument that follows "-p"
        if (i > 0 && String(args[i - 1]).toLowerCase() === "-p") continue;
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(a) || /[a-z]/i.test(a)) { target = a; break; }
      }

      if (!target) {
        io.printHTML('<span style="color:#ff6b6b">nmap: no target specified.</span>');
        io.printHTML("");
        printUsage(io);
        return;
      }

      // accept with or without extra flags (-p-, -p 1-65535, -sV, etc.)
      if (target === TARGET) {
        return scanTarget(io, target, withVersion);
      }
      return hostDown(io, target);
    }
  });

  /* ================================================== camera device model */
  // A real model whose factory-default login is public knowledge, so students can
  // find it with a web search ("Hikvision DS-2CD2032-I default password" -> admin / 12345).
  var CAM = {
    brand: "Hikvision",
    model: "DS-2CD2032-I",
    user: "admin",
    pass: "12345",
    name: "Camera 01 — Open Office 3F",
    serial: "DS-2CD2032-I20160418CCWR5"
  };
  var camLoggedIn = false;

  /* ================================================== camera styles */
  function injectStyle() {
    if (document.getElementById("camera-style")) return;
    var st = document.createElement("style");
    st.id = "camera-style";
    st.textContent =
      /* login portal */
      ".cl{min-height:100%;font-family:Arial,Helvetica,sans-serif;background:#2b2f36 linear-gradient(160deg,#3a3f48 0%,#23262c 100%);display:flex;align-items:center;justify-content:center;padding:30px}" +
      ".cl-box{width:380px;max-width:100%;background:#f4f4f4;border-radius:3px;box-shadow:0 10px 40px rgba(0,0,0,.45);overflow:hidden}" +
      ".cl-top{background:#1e1e1e;color:#fff;padding:16px 22px;display:flex;align-items:center;gap:12px}" +
      ".cl-top .cl-ico{width:34px;height:34px;border-radius:50%;background:#c8102e;display:flex;align-items:center;justify-content:center;font-size:17px}" +
      ".cl-top .cl-t1{font-size:16px;font-weight:700;letter-spacing:.3px}" +
      ".cl-top .cl-t2{font-size:11.5px;color:#b8b8b8;margin-top:2px}" +
      ".cl-body{padding:22px 24px 18px}" +
      ".cl-row{margin-bottom:12px}" +
      ".cl-row label{display:block;font-size:12px;color:#555;margin-bottom:4px}" +
      ".cl-row input{width:100%;padding:8px 10px;border:1px solid #c6c6c6;border-radius:2px;font-size:14px;background:#fff;font-family:Arial,sans-serif}" +
      ".cl-row input:focus{outline:0;border-color:#c8102e}" +
      ".cl-err{color:#c8102e;font-size:12.5px;min-height:16px;margin:0 0 8px}" +
      ".cl-btn{width:100%;padding:9px;background:#c8102e;color:#fff;border:0;border-radius:2px;font-size:14px;font-weight:700;cursor:var(--cur-link)}" +
      ".cl-btn:hover{background:#a50d26}" +
      ".cl-meta{display:flex;justify-content:space-between;font-size:11px;color:#888;padding:10px 24px;border-top:1px solid #e2e2e2;background:#ececec}" +
      ".cl-lang{font-size:11.5px;color:#888;margin-top:12px;text-align:center}" +
      /* live view */
      ".lv{min-height:100%;background:#1b1d21;font-family:Arial,Helvetica,sans-serif;color:#d8dbe0;display:flex;flex-direction:column}" +
      ".lv-nav{display:flex;align-items:center;gap:22px;background:#111;padding:0 18px;height:44px;border-bottom:2px solid #c8102e;font-size:13.5px}" +
      ".lv-nav .lv-brand{font-weight:700;color:#fff;letter-spacing:.4px}" +
      ".lv-nav .lv-tab{color:#9a9fa8}.lv-nav .lv-tab.on{color:#fff;border-bottom:2px solid #fff;padding-bottom:10px;margin-bottom:-12px}" +
      ".lv-nav .lv-user{margin-left:auto;color:#9a9fa8;font-size:12.5px}" +
      ".lv-nav .lv-out{color:#ff7c8f;cursor:var(--cur-link);margin-left:10px}" +
      ".lv-main{display:flex;gap:14px;padding:14px;flex:1;flex-wrap:wrap}" +
      ".lv-feedcol{flex:1 1 440px;min-width:0}" +
      ".lv-feed{position:relative;width:100%;aspect-ratio:718/404;overflow:hidden;background:#000;border:1px solid #333}" +
      ".lv-img{position:absolute;inset:-4%;width:108%;height:108%;object-fit:cover;" +
        "filter:grayscale(.55) sepia(.18) contrast(1.15) brightness(.88) saturate(.8) blur(.35px);" +
        "animation:lvPan 26s ease-in-out infinite alternate}" +
      "@keyframes lvPan{0%{transform:translate(0,0) scale(1)}100%{transform:translate(-2.5%,-1.2%) scale(1.03)}}" +
      ".lv-tint{position:absolute;inset:0;background:rgba(40,80,60,.10);mix-blend-mode:multiply;pointer-events:none}" +
      ".lv-scan{position:absolute;inset:0;pointer-events:none;opacity:.18;background:repeating-linear-gradient(0deg,rgba(0,0,0,.9) 0,rgba(0,0,0,.9) 1px,transparent 1px,transparent 3px)}" +
      ".lv-noise{position:absolute;inset:-50%;pointer-events:none;opacity:.08;" +
        "background-image:radial-gradient(rgba(255,255,255,.9) 0.6px,transparent 0.7px),radial-gradient(rgba(255,255,255,.7) 0.6px,transparent 0.7px);" +
        "background-size:5px 5px,7px 7px;background-position:0 0,3px 2px;animation:lvNoise .25s steps(4) infinite}" +
      "@keyframes lvNoise{0%{transform:translate(0,0)}25%{transform:translate(-3%,2%)}50%{transform:translate(2%,-3%)}75%{transform:translate(-2%,-1%)}100%{transform:translate(1%,3%)}}" +
      ".lv-band{position:absolute;left:0;right:0;height:18%;top:-20%;pointer-events:none;background:linear-gradient(180deg,transparent,rgba(255,255,255,.06),transparent);animation:lvBand 7s linear infinite}" +
      "@keyframes lvBand{0%{top:-20%}100%{top:110%}}" +
      ".lv-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.55) 100%)}" +
      ".lv-flick{position:absolute;inset:0;pointer-events:none;background:#fff;opacity:0;animation:lvFlick 9s infinite}" +
      "@keyframes lvFlick{0%,96%,100%{opacity:0}97%{opacity:.05}98%{opacity:0}98.5%{opacity:.04}}" +
      ".lv-osd{position:absolute;font-family:'Courier New',monospace;font-weight:700;color:#fff;font-size:14px;letter-spacing:.5px;" +
        "text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;pointer-events:none}" +
      ".lv-osd.tl{left:12px;top:10px}.lv-osd.br{right:12px;bottom:10px}" +
      ".lv-rec{position:absolute;right:12px;top:10px;display:flex;align-items:center;gap:6px;font-family:'Courier New',monospace;font-weight:700;color:#fff;font-size:13px;text-shadow:1px 1px 0 #000}" +
      ".lv-rec i{width:10px;height:10px;border-radius:50%;background:#e01b24;box-shadow:0 0 6px #e01b24;animation:lvBlink 1.2s steps(1) infinite}" +
      "@keyframes lvBlink{50%{opacity:.15}}" +
      ".lv-bar{display:flex;gap:8px;align-items:center;background:#24272c;border:1px solid #333;border-top:0;padding:7px 10px;font-size:12px;color:#9a9fa8}" +
      ".lv-bar span{background:#2f3339;border-radius:2px;padding:3px 8px}" +
      ".lv-side{flex:0 0 260px;background:#24272c;border:1px solid #333}" +
      ".lv-side h4{margin:0;padding:10px 12px;font-size:13px;background:#2c3036;color:#fff;border-bottom:1px solid #383c43}" +
      ".lv-side table{width:100%;border-collapse:collapse;font-size:12.5px}" +
      ".lv-side td{padding:7px 12px;border-bottom:1px solid #31353b;vertical-align:top}" +
      ".lv-side td:first-child{color:#8e939b;width:42%}" +
      ".lv-side .flag-box{margin:10px 12px 12px;font-size:12px}" +
      /* bare-host error page (looks like the browser's own) */
      ".cam-refused{font-family:var(--sans);max-width:470px;margin:70px auto;text-align:left;color:#444}" +
      ".cam-refused h2{margin:14px 0 8px;color:#333}" +
      ".cam-refused .code{color:#888;font-size:12.5px;margin-top:18px}";
    document.head.appendChild(st);
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function osdTime() {
    var d = new Date();
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) + " " + days[d.getDay()] + " " +
      pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
  }

  /* ================================================== :8080 login portal */
  function renderLogin(ctx) {
    ctx.container.innerHTML =
      '<div class="cl"><div class="cl-box">' +
        '<div class="cl-top"><div class="cl-ico">📷</div><div>' +
          '<div class="cl-t1">' + esc(CAM.brand) + " Network Camera</div>" +
          '<div class="cl-t2">Model ' + esc(CAM.model) + " · Web Service</div></div></div>" +
        '<form class="cl-body" autocomplete="off">' +
          '<div class="cl-row"><label>User Name</label><input class="cl-u" spellcheck="false"></div>' +
          '<div class="cl-row"><label>Password</label><input class="cl-p" type="password"></div>' +
          '<div class="cl-err"></div>' +
          '<button class="cl-btn" type="submit">Login</button>' +
          '<div class="cl-lang">English ▾</div>' +
        "</form>" +
        '<div class="cl-meta"><span>' + esc(CAM_HOST) + "</span><span>Firmware V5.4.5 build 170124</span></div>" +
      "</div></div>";

    var form = ctx.container.querySelector(".cl-body");
    var u = ctx.container.querySelector(".cl-u"), p = ctx.container.querySelector(".cl-p");
    var err = ctx.container.querySelector(".cl-err");
    setTimeout(function () { u.focus(); }, 40);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (u.value.trim() === CAM.user && p.value === CAM.pass) {
        camLoggedIn = true;
        renderLive(ctx);
      } else {
        err.textContent = "Invalid user name or password.";
        p.value = ""; p.focus();
      }
    });
  }

  /* ================================================== live view (after login) */
  function renderLive(ctx) {
    if (window.CTF && CTF.capture) CTF.capture("ports");   // default creds on an exposed camera = the exploit
    var flag = (window.CTF && CTF.getFlag) ? CTF.getFlag("ports") : "FLAG{...}";
    ctx.container.innerHTML =
      '<div class="lv">' +
        '<div class="lv-nav"><span class="lv-brand">' + esc(CAM.brand.toUpperCase()) + '</span>' +
          '<span class="lv-tab on">Live View</span><span class="lv-tab">Playback</span><span class="lv-tab">Picture</span><span class="lv-tab">Configuration</span>' +
          '<span class="lv-user">👤 admin<span class="lv-out" title="Logout">⏻ Logout</span></span></div>' +
        '<div class="lv-main">' +
          '<div class="lv-feedcol">' +
            '<div class="lv-feed">' +
              '<img class="lv-img" src="assets/img/office-cam.jpg" alt="">' +
              '<div class="lv-tint"></div><div class="lv-scan"></div><div class="lv-noise"></div>' +
              '<div class="lv-band"></div><div class="lv-vig"></div><div class="lv-flick"></div>' +
              '<div class="lv-osd tl" id="lv-time">' + osdTime() + "</div>" +
              '<div class="lv-rec"><i></i>REC</div>' +
              '<div class="lv-osd br">' + esc(CAM.name) + "</div>" +
            "</div>" +
            '<div class="lv-bar"><span>Main Stream</span><span>1920×1080</span><span>25 fps</span><span>H.264</span>' +
              '<span style="margin-left:auto">Channel 1</span></div>' +
          "</div>" +
          '<div class="lv-side"><h4>Device Information</h4><table><tbody>' +
            "<tr><td>Device Name</td><td>" + esc(CAM.name) + "</td></tr>" +
            "<tr><td>Model</td><td>" + esc(CAM.model) + "</td></tr>" +
            "<tr><td>Serial No.</td><td>" + esc(CAM.serial) + "</td></tr>" +
            "<tr><td>Firmware</td><td>V5.4.5 build 170124</td></tr>" +
            "<tr><td>Login</td><td>admin / <i>factory default</i></td></tr>" +
            "<tr><td>Device Note</td><td>Lab registration key:</td></tr>" +
          "</tbody></table>" +
          '<div class="flag-box">' + esc(flag) + "</div></div>" +
        "</div>" +
      "</div>";

    ctx.container.querySelector(".lv-out").addEventListener("click", function () { camLoggedIn = false; renderLogin(ctx); });

    var t = ctx.container.querySelector("#lv-time");
    (function tick() {
      if (!document.body.contains(t)) return;   // navigated away -> stop
      t.textContent = osdTime();
      setTimeout(tick, 1000);
    })();
  }

  Browser.registerSite({
    host: CAM_HOST,
    title: CAM.brand + " Network Camera",
    favicon: "📷",
    render: function (ctx) {
      injectStyle();
      if (camLoggedIn) renderLive(ctx); else renderLogin(ctx);
    }
  });

  /* ============================================ bare host :80 — nothing is there */
  Browser.registerSite({
    host: TARGET,
    title: TARGET,
    favicon: "🚫",
    render: function (ctx) {
      injectStyle();
      ctx.container.innerHTML =
        '<div class="cam-refused">' +
          '<div style="font-size:46px">🚫</div>' +
          "<h2>This site can’t be reached</h2>" +
          "<p><b>" + esc(TARGET) + "</b> refused to connect.</p>" +
          '<div class="code">ERR_CONNECTION_REFUSED</div>' +
        "</div>";
    }
  });

  /* ============================================ bookmark: just the IP */
  if (window.Browser && Browser.addBookmark) {
    Browser.addBookmark({ label: "Lab Camera", url: TARGET, icon: "📷" });
  }

})();
