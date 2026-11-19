/* ===== Fake Browser shell + site registry ===== */
(function () {
  "use strict";
  var sites = {};         // host -> siteDef
  var bookmarks = [];
  var winRec = null;
  var root = null;        // the browser window body element (set in buildChrome)
  var current = "";       // current url string

  var Browser = {
    registerSite: function (def) { sites[def.host] = def; },
    addBookmark: function (bm) { bookmarks.push(bm); renderBookmarks(); },
    open: function (url) { OS.openApp("browser"); setTimeout(function () { go(url); }, 30); },
    _nav: function (url) { go(url); }
  };

  function parseUrl(raw) {
    var url = String(raw || "").trim();
    url = url.replace(/^https?:\/\//i, "");
    var hashPart = "", qPart = "", pathPart = "/", host = "";
    var hi = url.indexOf("#"); if (hi >= 0) { hashPart = url.slice(hi + 1); url = url.slice(0, hi); }
    var qi = url.indexOf("?"); if (qi >= 0) { qPart = url.slice(qi + 1); url = url.slice(0, qi); }
    var si = url.indexOf("/");
    if (si >= 0) { host = url.slice(0, si); pathPart = url.slice(si) || "/"; }
    else { host = url; pathPart = "/"; }
    var query = {};
    qPart.split("&").forEach(function (kv) {
      if (!kv) return; var p = kv.split("="); query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "");
    });
    return { host: host.toLowerCase(), path: pathPart, query: query, hash: hashPart };
  }

  function fullUrl(p) {
    var u = "http://" + p.host + (p.path && p.path !== "/" ? p.path : "");
    var qk = Object.keys(p.query);
    if (qk.length) u += "?" + qk.map(function (k) { return k + "=" + p.query[k]; }).join("&");
    if (p.hash) u += "#" + p.hash;
    return u;
  }

  function go(raw) {
    if (!root) return;
    var p = parseUrl(raw);
    if (!p.host) { renderHome(); return; }
    current = fullUrl(p);
    var bar = root.querySelector(".bz-url");
    if (bar) bar.value = current;
    var page = root.querySelector(".bz-page");
    page.innerHTML = "";
    var site = sites[p.host];
    if (!site) { renderUnreachable(page, p.host); return; }
    var ctx = {
      container: page, host: p.host, path: p.path, query: p.query, hash: p.hash, url: current,
      navigate: function (u) { go(u); }
    };
    try { site.render(ctx); } catch (e) {
      page.innerHTML = '<div style="padding:24px;color:#c42b1c;font-family:var(--sans)">Page crashed: ' + String(e) + "</div>";
      console.error(e);
    }
  }

  function renderUnreachable(page, host) {
    page.innerHTML =
      '<div style="font-family:var(--sans);max-width:460px;margin:70px auto;text-align:center;color:#444">' +
      '<div style="font-size:52px">🚫</div>' +
      "<h2>This site can’t be reached</h2>" +
      "<p><b>" + host + "</b> took too long to respond, or doesn’t exist.</p>" +
      '<p style="color:#888;font-size:13px">ERR_CONNECTION_TIMED_OUT</p></div>';
  }

  function renderHome() {
    if (!root) return;
    var page = root.querySelector(".bz-page");
    current = "";
    root.querySelector(".bz-url").value = "";
    // Per request: no center tiles — the sites live in the bookmarks bar above.
    page.innerHTML =
      '<div style="font-family:var(--sans);max-width:520px;margin:120px auto;text-align:center;color:#9aa3ad">' +
      '<div style="font-size:40px;font-weight:700;color:#c3cad2;letter-spacing:.5px">New Tab</div>' +
      '<div style="margin-top:10px;font-size:14px">Pick a site from your <b style="color:#8a929b">bookmarks bar</b> above, or type a URL.</div>' +
      '<div style="margin-top:6px;font-size:22px;color:#c3cad2">↑</div></div>';
  }

  function renderBookmarks() {
    if (!root) return;
    var bar = root.querySelector(".bz-bookmarks");
    if (!bar) return;
    bar.innerHTML = bookmarks.map(function (b, i) {
      return '<span class="bz-bm" data-i="' + i + '">' + (b.icon || "🔖") + " " + b.label + "</span>";
    }).join("");
    bar.querySelectorAll(".bz-bm").forEach(function (s) {
      s.addEventListener("click", function () { go(bookmarks[+s.dataset.i].url); });
    });
  }

  function buildChrome(body) {
    root = body;
    body.innerHTML =
      '<div class="bz-wrap">' +
      '<div class="bz-toolbar">' +
      '<button class="bz-nav bz-back" title="Back">◀</button>' +
      '<button class="bz-nav bz-home" title="Home">⌂</button>' +
      '<button class="bz-nav bz-reload" title="Reload">⟳</button>' +
      '<div class="bz-omni"><span class="bz-lock">🔒</span><input class="bz-url" placeholder="Search or type a URL" spellcheck="false"></div>' +
      "</div>" +
      '<div class="bz-bookmarks"></div>' +
      '<div class="bz-page"></div>' +
      "</div>";
    // styles (scoped-ish via class names)
    if (!document.getElementById("bz-style")) {
      var st = document.createElement("style"); st.id = "bz-style";
      st.textContent =
        ".bz-wrap{display:flex;flex-direction:column;height:100%;background:#fff;font-family:var(--sans)}" +
        ".bz-toolbar{flex:0 0 auto;display:flex;align-items:center;gap:6px;padding:7px 9px;background:#eef1f4;border-bottom:1px solid #dfe3e7}" +
        ".bz-nav{width:30px;height:30px;border:0;background:transparent;border-radius:15px;cursor:pointer;font-size:14px;color:#444}" +
        ".bz-nav:hover{background:#dde2e8}" +
        ".bz-omni{flex:1;display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #d6dbe0;border-radius:16px;padding:5px 12px}" +
        ".bz-omni:focus-within{border-color:var(--accent);box-shadow:0 0 0 2px rgba(0,120,212,.18)}" +
        ".bz-lock{font-size:12px;color:#5a9e5a}" +
        ".bz-url{flex:1;border:0;outline:0;font-size:13.5px;color:#222;background:transparent}" +
        ".bz-bookmarks{flex:0 0 auto;display:flex;gap:4px;padding:5px 10px;background:#f6f8fa;border-bottom:1px solid #e6eaee;min-height:30px;overflow-x:auto;white-space:nowrap}" +
        ".bz-bm{font-size:12.5px;color:#334;background:#fff;border:1px solid #e0e4e8;border-radius:5px;padding:3px 9px;cursor:pointer}" +
        ".bz-bm:hover{background:#eef4fb;border-color:var(--accent-light)}" +
        ".bz-page{flex:1;overflow:auto;background:#fff}" +
        ".bz-tile{width:120px;cursor:pointer;padding:14px 8px;border:1px solid #e6eaee;border-radius:10px;background:#fafbfc}" +
        ".bz-tile:hover{border-color:var(--accent-light);box-shadow:0 4px 14px rgba(0,0,0,.08)}" +
        ".bz-tile-i{font-size:32px}.bz-tile-l{font-size:12.5px;margin-top:6px;color:#333}";
      document.head.appendChild(st);
    }
    var url = body.querySelector(".bz-url");
    url.addEventListener("keydown", function (e) { if (e.key === "Enter") go(url.value); });
    body.querySelector(".bz-home").addEventListener("click", renderHome);
    body.querySelector(".bz-reload").addEventListener("click", function () { if (current) go(current); else renderHome(); });
    body.querySelector(".bz-back").addEventListener("click", renderHome);
    renderBookmarks();
    renderHome();
  }

  function register() {
    OS.registerApp({
      id: "browser", name: "Browser",
      icon: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#fff"/><circle cx="24" cy="24" r="21" fill="none" stroke="#d33" stroke-width="0"/><path d="M24 3a21 21 0 1 0 0 42 21 21 0 0 0 0-42z" fill="#4285F4"/><circle cx="24" cy="24" r="9" fill="#fff"/><circle cx="24" cy="24" r="6.4" fill="#4285F4"/><path d="M24 15h18A21 21 0 0 0 6.5 13l8 14A9 9 0 0 1 24 15z" fill="#EA4335"/><path d="M14.5 27l-8-14A21 21 0 0 0 20 44l8-14a9 9 0 0 1-13.5-3z" fill="#34A853" opacity=".9"/><path d="M33 24a9 9 0 0 1-5 8l-8 14A21 21 0 0 0 42 15H24a9 9 0 0 1 9 9z" fill="#FBBC05" opacity=".95"/></svg>',
      onOpen: function () {
        winRec = WM.open({
          id: "browser", title: "Browser", icon: "🌐", width: 900, height: 600,
          render: function (body) { buildChrome(body); }
        });
      }
    });
    // default bookmarks (challenge sites add themselves too, but seed the two the brief mentions)
    Browser.addBookmark({ label: "instaDog", url: "instadog.site", icon: "📸" });
    Browser.addBookmark({ label: "School Grades", url: "grading.schoolname.com", icon: "🎓" });
  }

  window.Browser = Browser;
  if (window.OS) register();
  else document.addEventListener("DOMContentLoaded", register);
})();
