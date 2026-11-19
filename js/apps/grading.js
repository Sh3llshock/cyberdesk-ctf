/* grading.js — Challenge 2: School Grading Platform
 * (directory discovery via gobuster + broken access control on /admin)
 * Classic script, no modules, no network. Attaches to global shells only.
 */
(function () {
  "use strict";

  /* ---------- flag registration ---------- */
  CTF.register("access", {
    title: "School Grading Platform — Hidden Admin Panel",
    flag: "FLAG{h1dd3n_4dm1n_n0_4uth_check}",
    points: 100,
    hint: "Brute-force for hidden directories, then open /admin."
  });

  /* ---------- one-time styles ---------- */
  function injectStyle() {
    if (document.getElementById("grading-style")) return;
    var st = document.createElement("style");
    st.id = "grading-style";
    st.textContent =
      ".gr{font-family:var(--sans);color:var(--text);min-height:100%;position:relative;background:#f4f6f9}" +
      ".gr-head{display:flex;align-items:center;gap:12px;padding:14px 22px;background:#15385c;color:#fff}" +
      ".gr-head .gr-logo{font-size:26px}" +
      ".gr-head .gr-school{font-size:18px;font-weight:700;line-height:1.1}" +
      ".gr-head .gr-sub{font-size:12.5px;color:#bcd2e8}" +
      ".gr-head .gr-user{margin-left:auto;text-align:right;font-size:13px}" +
      ".gr-logout{margin-top:4px;font-size:12px;background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:5px;padding:4px 10px;cursor:pointer}" +
      ".gr-logout:hover{background:rgba(255,255,255,.28)}" +
      ".gr-body{padding:22px}" +
      ".gr-card{background:#fff;border:1px solid #e2e7ec;border-radius:9px;padding:18px 20px;max-width:760px;margin:0 auto 18px;box-shadow:0 2px 10px rgba(0,0,0,.05)}" +
      ".gr-h2{font-size:17px;font-weight:700;margin:0 0 4px}" +
      ".gr-note{font-size:13px;color:var(--text-dim);margin:0 0 14px}" +
      ".gr-table{width:100%;border-collapse:collapse;font-size:14px}" +
      ".gr-table th,.gr-table td{text-align:left;padding:9px 10px;border-bottom:1px solid #eceff2}" +
      ".gr-table th{background:#f0f3f6;font-size:13px;color:#415}" +
      ".gr-table tr:last-child td{border-bottom:0}" +
      ".gr-gpa{display:inline-block;margin-top:14px;font-size:15px;font-weight:700;color:#15385c}" +
      ".gr-grade{font-weight:700}" +
      ".gr-A{color:#107c10}.gr-B{color:#3a7bbf}.gr-C{color:#9d5d00}.gr-D{color:#c42b1c}.gr-F{color:#c42b1c}" +
      ".gr-adminbar{background:#7a1020;color:#fff;padding:14px 22px;font-size:14px;line-height:1.4}" +
      ".gr-adminbar b{font-size:15px}" +
      ".gr-del{font-size:12.5px;background:var(--bad);color:#fff;border:0;border-radius:5px;padding:5px 11px;cursor:pointer}" +
      ".gr-del:hover{background:#9a2015}" +
      ".gr-del:disabled{opacity:.45;cursor:default}" +
      ".gr-viewall{font-size:13px;background:#15385c;color:#fff;border:0;border-radius:5px;padding:7px 14px;cursor:pointer;margin-bottom:12px}" +
      ".gr-viewall:hover{background:#1d4e80}" +
      ".gr-footer{text-align:center;font-size:12px;color:#8a97a3;padding:10px}";
    document.head.appendChild(st);
  }

  var briefingShown = false;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function gradeClass(g) {
    var c = String(g).charAt(0).toUpperCase();
    return "gr-grade gr-" + (/[ABCDF]/.test(c) ? c : "B");
  }

  /* ---------- data ---------- */
  var ME = { name: "Alex Rivera", grade: "Grade 11", id: "STU-1047" };

  var MY_GRADES = [
    { subject: "English 11", grade: "A-" },
    { subject: "US History", grade: "B+" },
    { subject: "Algebra II", grade: "B" },
    { subject: "Chemistry", grade: "A" },
    { subject: "Spanish II", grade: "B-" },
    { subject: "Computer Science", grade: "A" }
  ];

  var ALL_STUDENTS = [
    { id: "STU-1042", name: "Maya Chen", grade: "Grade 11", gpa: "3.91" },
    { id: "STU-1047", name: "Alex Rivera", grade: "Grade 11", gpa: "3.52" },
    { id: "STU-1051", name: "Jordan Blake", grade: "Grade 12", gpa: "2.98" },
    { id: "STU-1066", name: "Priya Nair", grade: "Grade 10", gpa: "4.00" },
    { id: "STU-1073", name: "Liam O'Connor", grade: "Grade 12", gpa: "3.14" },
    { id: "STU-1080", name: "Sofia Martinez", grade: "Grade 11", gpa: "3.77" },
    { id: "STU-1095", name: "Noah Williams", grade: "Grade 10", gpa: "2.65" },
    { id: "STU-1102", name: "Emma Thompson", grade: "Grade 12", gpa: "3.88" }
  ];

  /* ---------- briefing overlay ---------- */
  function showBriefing(container) {
    if (briefingShown) return;
    briefingShown = true;
    var ov = document.createElement("div");
    ov.className = "brief-ov";
    ov.innerHTML =
      '<div class="brief">' +
      "<h3>🎓 Mission: Lincoln High Grades Portal</h3>" +
      '<div class="bd">You are logged in as a normal student and can only see your own grades. ' +
      "But school admins have a management page that is not linked anywhere on this site. " +
      "Use a directory brute-forcer in the Terminal to find the hidden path, then check whether it is actually protected.</div>" +
      '<div class="ft"><button class="btn" id="gr-brief-ok">Got it</button></div>' +
      "</div>";
    container.appendChild(ov);
    var ok = ov.querySelector("#gr-brief-ok");
    ok.addEventListener("click", function () { ov.remove(); });
  }

  /* ---------- shared header ---------- */
  function headerHTML(userLine) {
    return '<div class="gr-head">' +
      '<div class="gr-logo">🎓</div>' +
      '<div><div class="gr-school">Lincoln High School</div>' +
      '<div class="gr-sub">Student Grades Portal</div></div>' +
      '<div class="gr-user">' + userLine +
      '<div><button class="gr-logout" type="button">Log out</button></div></div>' +
      "</div>";
  }

  /* ---------- student dashboard ---------- */
  function renderDashboard(ctx) {
    var rows = MY_GRADES.map(function (g) {
      return "<tr><td>" + esc(g.subject) + "</td>" +
        '<td><span class="' + gradeClass(g.grade) + '">' + esc(g.grade) + "</span></td></tr>";
    }).join("");

    ctx.container.innerHTML =
      '<div class="gr">' +
      headerHTML('Signed in as <b>' + esc(ME.name) + "</b><br>" + esc(ME.grade) + " · " + esc(ME.id)) +
      '<div class="gr-body">' +
      '<div class="gr-card">' +
      '<div class="gr-h2">My Report Card — ' + esc(ME.name) + "</div>" +
      '<p class="gr-note">You can only view your own grades. Contact the front office for corrections.</p>' +
      '<table class="gr-table"><thead><tr><th>Subject</th><th>Grade</th></tr></thead><tbody>' +
      rows + "</tbody></table>" +
      '<div class="gr-gpa">Current GPA: 3.52</div>' +
      "</div></div>" +
      '<div class="gr-footer">© Lincoln High School · Grades Portal v2.3</div>' +
      "</div>";

    wireLogout(ctx);
    if (window.Hacker) Hacker.notify("grading");
  }

  /* ---------- hidden admin panel (THE VULN: no auth check) ---------- */
  function renderAdmin(ctx) {
    // broken access control: anyone who knows the path gets in.
    CTF.capture("access");

    var students = ALL_STUDENTS.slice(); // local working copy (no persistence)

    ctx.container.innerHTML =
      '<div class="gr">' +
      headerHTML('<b>⚙ ADMIN</b><br>system console') +
      '<div class="gr-adminbar">⚠️ You reached the admin panel with no login — broken access control!' +
      '<div class="flag-box" style="margin-top:10px">' + CTF.getFlag("access") + "</div></div>" +
      '<div class="gr-body">' +
      '<div class="gr-card">' +
      '<div class="gr-h2">All Students — Administrative View</div>' +
      '<p class="gr-note">This page has no authentication gate. A logged-in student should never be able to load it.</p>' +
      '<button class="gr-viewall" type="button" id="gr-viewall">View all grades</button>' +
      '<table class="gr-table" id="gr-admin-table"><thead><tr>' +
      "<th>ID</th><th>Name</th><th>Year</th><th>GPA</th><th>Action</th>" +
      "</tr></thead><tbody id=\"gr-admin-body\"></tbody></table>" +
      "</div></div>" +
      '<div class="gr-footer">© Lincoln High School · Grades Portal v2.3</div>' +
      "</div>";

    var tbody = ctx.container.querySelector("#gr-admin-body");
    function paint() {
      tbody.innerHTML = students.map(function (s, i) {
        return "<tr data-i=\"" + i + "\"><td>" + esc(s.id) + "</td><td>" + esc(s.name) +
          "</td><td>" + esc(s.grade) + "</td><td>" + esc(s.gpa) +
          '</td><td><button class="gr-del" type="button" data-i="' + i + '">Delete account</button></td></tr>';
      }).join("");
      tbody.querySelectorAll(".gr-del").forEach(function (b) {
        b.addEventListener("click", function () {
          var idx = +b.getAttribute("data-i");
          var s = students[idx];
          if (!s) return;
          // two-step confirm without a blocking modal (prompt/confirm are blocked in sandboxed iframes)
          if (b.getAttribute("data-armed") !== "1") {
            b.setAttribute("data-armed", "1");
            b.textContent = "Click again to delete";
            setTimeout(function () {
              if (b) { b.setAttribute("data-armed", "0"); b.textContent = "Delete account"; }
            }, 2500);
            return;
          }
          students.splice(idx, 1);
          paint();
          OS.toast('<div class="tt">🗑 Account deleted</div>Removed ' + esc(s.name) + " — and you were never even logged in as an admin.", "error");
        });
      });
    }
    paint();

    var va = ctx.container.querySelector("#gr-viewall");
    va.addEventListener("click", function () {
      OS.toast('<div class="tt">👀 Viewing all grades</div>Every student\'s GPA is exposed to anyone who finds this page.', "info");
    });

    wireLogout(ctx);
  }

  function wireLogout(ctx) {
    var lo = ctx.container.querySelector(".gr-logout");
    if (lo) lo.addEventListener("click", function () {
      OS.toast("Logout is disabled in this demo.", "info");
    });
  }

  /* ---------- site registration ---------- */
  Browser.registerSite({
    host: "grading.schoolname.com",
    title: "Lincoln High Grades Portal",
    favicon: "🎓",
    render: function (ctx) {
      injectStyle();
      ctx.container.style.position = "relative";
      // login gate (shared account Jake / Jake123). You must authenticate to use
      // the portal — but note /admin still has NO authorization check once you're in.
      if (!window.Auth || !Auth.isLoggedIn()) {
        Auth.renderLogin(ctx.container, {
          brand: "Lincoln High", icon: "🎓",
          subtitle: "Student Grades Portal — please sign in",
          onSuccess: function () { ctx.container.style.position = "relative"; routeGrading(ctx); }
        });
        return;
      }
      routeGrading(ctx);
    }
  });

  function routeGrading(ctx) {
    injectStyle();
    {
      var p = (ctx.path || "/").toLowerCase().replace(/\/+$/, "") || "/";
      if (p === "/admin") {
        renderAdmin(ctx);
      } else if (p === "/" || p === "/dashboard" || p === "/login" || p === "/home") {
        // /login just drops you on your dashboard (already "authenticated")
        renderDashboard(ctx);
      } else {
        // unknown path under this host -> back to dashboard
        renderDashboard(ctx);
      }
    }
  }

  /* ---------- gobuster terminal command ---------- */
  var GRADING_HOST = "grading.schoolname.com";

  function printUsage(io) {
    io.printHTML('<span style="color:#9cdcfe">gobuster — directory/file brute-forcer</span>');
    io.print("");
    io.print("Usage: gobuster dir -u <url> -w <wordlist>");
    io.print("");
    io.printHTML('<span style="color:#dcdcaa">Options:</span>');
    io.print("  dir            directory/file enumeration mode");
    io.print("  -u <url>       the target base URL");
    io.print("  -w <wordlist>  wordlist of paths to try (e.g. common.txt)");
    io.print("  -t <n>         number of concurrent threads (default 10)");
    io.print("  -h, --help     show this help");
    io.print("");
    io.printHTML('<span style="color:#888">Example:</span> gobuster dir -u http://' + GRADING_HOST + " -w common.txt");
  }

  // pull a target host out of the args (accepts -u http://host/..., bare host, etc.)
  function findHost(args) {
    for (var i = 0; i < args.length; i++) {
      var a = String(args[i]).toLowerCase();
      if (a === "-u" || a === "--url") continue;
      if (a === "dir" || a === "-w" || a === "--wordlist" || a === "-t" || a === "--threads") { i++; continue; }
      if (a.charAt(0) === "-") continue;
      var cleaned = a.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
      if (cleaned.indexOf(".") >= 0) return cleaned;
    }
    // last resort: scan raw tokens for the grading host substring
    for (var j = 0; j < args.length; j++) {
      if (String(args[j]).toLowerCase().indexOf(GRADING_HOST) >= 0) return GRADING_HOST;
    }
    return "";
  }

  function getWordlist(args) {
    for (var i = 0; i < args.length - 1; i++) {
      var a = String(args[i]).toLowerCase();
      if (a === "-w" || a === "--wordlist") return args[i + 1];
    }
    return "common.txt";
  }

  // results for the grading host: realistic decoys + the key /admin finding
  var SCAN = [
    { path: "/images", status: 403 },
    { path: "/css", status: 301 },
    { path: "/js", status: 301 },
    { path: "/login", status: 200 },
    { path: "/dashboard", status: 200 },
    { path: "/config.php", status: 404 },
    { path: "/backup", status: 404 },
    { path: "/uploads", status: 404 },
    { path: "/admin", status: 200, hit: true },
    { path: "/portal.old", status: 404 }
  ];

  function pad(s, n) {
    s = String(s);
    while (s.length < n) s += " ";
    return s;
  }
  function statusColor(code) {
    if (code === 200) return "#73c991";
    if (code === 301 || code === 302) return "#dcdcaa";
    if (code === 403) return "#e0a060";
    return "#8a8a8a"; // 404 etc.
  }

  Terminal.registerCommand("gobuster", {
    help: "brute-force hidden web directories",
    run: function (args, io) {
      if (!args.length || args.indexOf("-h") >= 0 || args.indexOf("--help") >= 0) {
        printUsage(io);
        return;
      }

      var host = findHost(args);
      var wordlist = getWordlist(args);

      if (!host) {
        io.printHTML('<span style="color:#ff6b6b">Error: no target URL.</span> See <b>gobuster -h</b> for usage.');
        return;
      }

      if (host.indexOf(GRADING_HOST) < 0) {
        // unknown / unreachable target -> no results so students use the right one
        io.print("===============================================================");
        io.print("Gobuster v3.6");
        io.print("===============================================================");
        io.printHTML('[+] Url:          <span style="color:#9cdcfe">http://' + esc(host) + "</span>");
        io.printHTML("[+] Wordlist:     " + esc(wordlist));
        io.print("===============================================================");
        io.printHTML('<span style="color:#ff6b6b">[ERROR] could not connect to http://' + esc(host) + "/ — host unreachable</span>");
        io.print("Found: 0 paths. Did you mean http://" + GRADING_HOST + " ?");
        return;
      }

      // animate a scan against the grading host, total < ~2.5s
      return new Promise(function (resolve) {
        io.print("===============================================================");
        io.print("Gobuster v3.6");
        io.print("===============================================================");
        io.printHTML('[+] Url:          <span style="color:#9cdcfe">http://' + GRADING_HOST + "</span>");
        io.printHTML("[+] Method:       GET");
        io.printHTML("[+] Threads:      10");
        io.printHTML("[+] Wordlist:     " + esc(wordlist));
        io.printHTML("[+] Status codes: 200,204,301,302,307,401,403");
        io.print("===============================================================");
        io.print("Starting gobuster in directory enumeration mode");
        io.print("===============================================================");

        var i = 0;
        function step() {
          if (i >= SCAN.length) {
            io.print("===============================================================");
            io.print("Finished");
            io.print("===============================================================");
            io.printHTML('<span style="color:#73c991">[+] Found interesting path: /admin</span>  → try opening <b>http://' + GRADING_HOST + "/admin</b> in the Browser");
            resolve();
            return;
          }
          var r = SCAN[i++];
          var line = pad(r.path, 20) + " (Status: " + r.status + ")";
          if (r.hit) {
            io.printHTML('<span style="color:#00ff7f;font-weight:700">' + esc(line) + "   &lt;-- no auth gate?!</span>");
          } else {
            io.printHTML('<span style="color:' + statusColor(r.status) + '">' + esc(line) + "</span>");
          }
          setTimeout(step, 190);
        }
        setTimeout(step, 150);
      });
    }
  });

})();
