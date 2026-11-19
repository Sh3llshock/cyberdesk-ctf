/* dogbook.js — Challenge 1: instaDog (IDOR / broken access control)
   Instagram-style dog social app inside the fake Browser.
   You log in as Jake (profile id=4) with Jake / Jake123 (shared via window.Auth).
   DMs: on your OWN profile you can open and read your messages like real Instagram.
   Every profile has a Messages button too — and because the app trusts the ?id in the
   URL as "who you are", changing the id lets you read ANYONE's private DMs (the IDOR).
   Duke (id=7) is the mean neighbour; the flag is hidden in his DMs. */
(function () {
  "use strict";
  if (!window.Browser || !window.CTF) return;

  var ME = 4;
  var MEAN_ID = 7;
  var captured = false;

  // view state. meId = the account you're "logged in as" (the ?id the server trusts =
  // the IDOR). viewId = whose profile you're looking at (?view, defaults to meId).
  var curCtx = null, meId = ME, viewId = ME, tab = "posts", thread = null;

  CTF.register("idor", {
    title: "instaDog — Snoop on Your Mean Neighbour",
    flag: "FLAG{1d0r_pups_h4ve_n0_s3cr3ts}",
    points: 100,
    hint: "Change the profile id in the address bar, then open that profile's Messages."
  });

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* ---- users (ids 1-8): public posts + private DM conversations ---- */
  var U = {
    1: { user: "bella_goldie", name: "Bella", av: "🐕", ring: "#f6c453", posts: 14, followers: 842, following: 310,
      bio: "Golden Retriever 🎾 | professional ball chaser",
      grid: ["🎾", "🌳", "🦴", "🏖️", "🐾", "💤", "🥎", "🌞", "🐶"],
      dms: [
        { who: "max_the_sniffer", msgs: [["max_the_sniffer", "share your dinner tonight?"], ["bella_goldie", "always 🐾"], ["max_the_sniffer", "you're the best"]] },
        { who: "daisy_fluff", msgs: [["daisy_fluff", "spa day friday?"], ["bella_goldie", "yes!! 💅"]] }
      ] },
    2: { user: "max_the_sniffer", name: "Max", av: "🐶", ring: "#7bc86c", posts: 9, followers: 455, following: 288,
      bio: "Beagle 👃 | will work for treats",
      grid: ["👃", "🐿️", "🌭", "🛋️", "😴", "🦴", "🚶", "🌙", "🐾"],
      dms: [
        { who: "bella_goldie", msgs: [["max_the_sniffer", "race you to the mailbox"], ["bella_goldie", "you always win 😤"]] },
        { who: "the_mailman", msgs: [["max_the_sniffer", "don't tell anyone my scary bark is 100% for show"]] }
      ] },
    3: { user: "luna_sings", name: "Luna", av: "🐺", ring: "#9bb7d4", posts: 21, followers: 1203, following: 190,
      bio: "Husky 🎤 | I do not scream, I sing",
      grid: ["🎤", "❄️", "🕳️", "🎧", "🌨️", "🐾", "📱", "🦴", "😤"],
      dms: [
        { who: "rocky_snores", msgs: [["luna_sings", "midnight howl?"], ["rocky_snores", "obviously"]] },
        { who: "mom", msgs: [["luna_sings", "i buried the tv remote in the yard. and a phone. no regrets 😇"]] }
      ] },
    4: { user: "jake", name: "Jake", av: "🐕‍🦺", ring: "#5d9bff", posts: 7, followers: 388, following: 254,
      bio: "German Shepherd 🐾 | good boy, certified | THIS IS YOU",
      grid: ["🐾", "🏡", "🦴", "🎾", "🚗", "🌞", "🐶", "🛡️", "💙"],
      dms: [
        { who: "mom", msgs: [["mom", "who's a good boy?"], ["jake", "it is I 🐾"], ["mom", "yes you are!!"]] },
        { who: "bella_goldie", msgs: [["bella_goldie", "park at 5?"], ["jake", "always 🎾"]] },
        { who: "duke_doberman", msgs: [["duke_doberman", "stay off MY sidewalk 😤"], ["jake", "it's a public sidewalk Duke"]] }
      ] },
    5: { user: "daisy_fluff", name: "Daisy", av: "🐩", ring: "#e79fc6", posts: 33, followers: 2104, following: 401,
      bio: "Poodle 💅 | fluff. elegance. occasional chaos.",
      grid: ["💅", "✨", "🎀", "☔", "🛁", "🧦", "🐾", "💖", "🌸"],
      dms: [
        { who: "coco_longboi", msgs: [["daisy_fluff", "spa day?"], ["coco_longboi", "always 💅"]] },
        { who: "bella_goldie", msgs: [["daisy_fluff", "ok real talk… i eat socks when nobody's looking"]] }
      ] },
    6: { user: "rocky_snores", name: "Rocky", av: "🦮", ring: "#c9a27e", posts: 5, followers: 220, following: 97,
      bio: "Bulldog 😴 | low energy, high snore",
      grid: ["😴", "🛋️", "🦴", "🐌", "🫧", "🐾", "🍖", "🌙", "💤"],
      dms: [
        { who: "luna_sings", msgs: [["luna_sings", "midnight howl?"], ["rocky_snores", "zzz… yes"]] },
        { who: "the_puppy", msgs: [["rocky_snores", "i let you win tug-of-war every time btw. don't tell"]] }
      ] },
    7: { user: "duke_doberman", name: "Duke", av: "😤", ring: "#5a5a66", posts: 11, followers: 666, following: 12,
      bio: "Doberman 🔒 | THIS PROFILE IS PRIVATE. mind your own kibble.",
      grid: ["😈", "🦴", "🚧", "🖤", "⛓️", "🐾", "🌚", "👑", "🔒"],
      dms: [
        { who: "spike", msgs: [
          ["duke_doberman", "set my whole profile to private. nobody can read my messages now 😎"],
          ["spike", "smart move. your secrets are safe buddy"],
          ["duke_doberman", "yep. even my diary password is in here. super secret, watch: __FLAG__"],
          ["spike", "lol nobody will ever see that"]
        ] },
        { who: "jake", msgs: [["duke_doberman", "stay off MY sidewalk 😤"]] }
      ] },
    8: { user: "coco_longboi", name: "Coco", av: "🌭", ring: "#d98a5a", posts: 18, followers: 980, following: 333,
      bio: "Dachshund 🌭 | long dog, short legs, big dreams",
      grid: ["🌭", "🪜", "☀️", "🧸", "🐾", "🦴", "😏", "💭", "🛏️"],
      dms: [
        { who: "daisy_fluff", msgs: [["coco_longboi", "spa day sounds great"], ["daisy_fluff", "🐾"]] },
        { who: "mom", msgs: [["coco_longboi", "the squeaky toy IS my best friend and i won't apologise"]] }
      ] }
  };

  var AVMAP = {}; Object.keys(U).forEach(function (k) { AVMAP[U[k].user] = U[k].av; });
  function avFor(handle) { return AVMAP[handle] || "💬"; }

  function injectStyle() {
    if (document.getElementById("insta-style")) return;
    var st = document.createElement("style");
    st.id = "insta-style";
    st.textContent =
      ".ig{font-family:var(--sans);color:#262626;background:#fafafa;min-height:100%}" +
      ".ig-top{position:sticky;top:0;z-index:6;background:#fff;border-bottom:1px solid #dbdbdb;display:flex;align-items:center;gap:14px;padding:10px 18px}" +
      ".ig-logo{font-size:25px;font-weight:800;font-style:italic;letter-spacing:.3px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);-webkit-background-clip:text;background-clip:text;color:transparent}" +
      ".ig-search{flex:1;max-width:240px;background:#efefef;border-radius:8px;padding:7px 12px;font-size:13px;color:#8e8e8e}" +
      /* bigger, more obvious 'logged in as' badge */
      ".ig-me{margin-left:auto;display:flex;align-items:center;gap:10px;background:#eef5ff;border:1px solid #cfe0ff;border-radius:24px;padding:5px 14px 5px 6px}" +
      ".ig-me .ig-ava-sm{width:40px;height:40px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:23px;box-shadow:0 0 0 2px var(--accent)}" +
      ".ig-me .ig-mewho{line-height:1.15}" +
      ".ig-me .ig-melabel{font-size:11px;color:#5a7fb8;font-weight:600;text-transform:uppercase;letter-spacing:.4px}" +
      ".ig-me .ig-mehandle{font-size:16px;font-weight:800;color:#1b3c6b}" +
      ".ig-me.danger{background:#fff2f0;border-color:#f0c5bd}" +
      ".ig-me.danger .ig-melabel{color:#c0392b}.ig-me.danger .ig-mehandle{color:#a01e10}" +
      ".ig-me.danger .ig-ava-sm{box-shadow:0 0 0 2px var(--bad)}" +
      ".ig-wrap{max-width:900px;margin:0 auto;padding:26px 18px;display:flex;gap:26px;align-items:flex-start}" +
      ".ig-main{flex:1;min-width:0}" +
      ".ig-side{flex:0 0 220px}" +
      ".ig-head{display:flex;gap:28px;align-items:center;margin-bottom:24px}" +
      ".ig-ava{flex:0 0 118px;width:118px;height:118px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:64px;background:#fff;padding:4px;box-shadow:0 0 0 3px #fff,0 0 0 6px var(--ring)}" +
      ".ig-info{flex:1;min-width:0}" +
      ".ig-uline{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px}" +
      ".ig-user{font-size:21px;font-weight:400}" +
      ".ig-btn{font-size:13px;font-weight:600;background:#efefef;border:0;border-radius:8px;padding:7px 16px;cursor:pointer}" +
      ".ig-btn.follow{background:#0095f6;color:#fff}" +
      ".ig-stats{display:flex;gap:30px;margin-bottom:12px;font-size:15px}.ig-stats b{font-weight:700}" +
      ".ig-name{font-weight:700;font-size:14px}.ig-bio{font-size:14px;line-height:1.4;max-width:420px}" +
      ".ig-tabs{display:flex;justify-content:center;gap:48px;border-top:1px solid #dbdbdb;margin-top:6px}" +
      ".ig-tab{padding:14px 4px;font-size:12px;font-weight:700;letter-spacing:1px;color:#8e8e8e;border-top:1px solid transparent;margin-top:-1px;display:flex;gap:6px;align-items:center;cursor:pointer}" +
      ".ig-tab.on{color:#262626;border-top-color:#262626}" +
      ".ig-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:10px}" +
      ".ig-cell{aspect-ratio:1/1;background:#efefef;display:flex;align-items:center;justify-content:center;font-size:46px}" +
      /* DMs */
      ".ig-msgwrap{margin-top:12px;border:1px solid #dbdbdb;border-radius:12px;overflow:hidden;background:#fff}" +
      ".ig-msghdr{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #efefef;font-weight:700;font-size:15px}" +
      ".ig-leak{background:#fff6f5;border-bottom:1px solid #f3cfca;color:#9a2015;font-size:12.5px;padding:10px 16px}" +
      ".ig-inbox .ig-conv{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #f4f4f4;cursor:pointer}" +
      ".ig-inbox .ig-conv:hover{background:#fafafa}" +
      ".ig-inbox .ig-conv:last-child{border-bottom:0}" +
      ".ig-cav{width:44px;height:44px;border-radius:50%;background:#efefef;display:flex;align-items:center;justify-content:center;font-size:24px;flex:0 0 44px}" +
      ".ig-cmeta{flex:1;min-width:0}.ig-cwho{font-weight:600;font-size:14px}.ig-cprev{font-size:13px;color:#8e8e8e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".ig-cgo{color:#8e8e8e;font-size:18px}" +
      ".ig-thread{padding:10px 14px}" +
      ".ig-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#0095f6;cursor:pointer;margin-bottom:6px}" +
      ".ig-bub{max-width:78%;margin:6px 0;padding:8px 12px;border-radius:16px;font-size:13.5px;line-height:1.4;width:fit-content}" +
      ".ig-bub.them{background:#efefef;color:#262626}" +
      ".ig-bub.me{background:#3797f0;color:#fff;margin-left:auto}" +
      ".ig-lockmsg{padding:34px 20px;text-align:center;color:#8e8e8e}" +
      ".ig-lockmsg .lk-big{font-size:40px}" +
      /* suggestions */
      ".ig-sug{background:#fff;border:1px solid #dbdbdb;border-radius:10px;padding:14px}" +
      ".ig-sug h5{margin:0 0 10px;font-size:13px;color:#8e8e8e}" +
      ".ig-sline{display:flex;align-items:center;gap:10px;padding:7px 6px;border-radius:7px;cursor:pointer}" +
      ".ig-sline:hover{background:#fafafa}" +
      ".ig-sline.mean{background:#fff4f2}.ig-sline.mean:hover{background:#ffe9e5}" +
      ".ig-sline.self{background:#eef5ff}" +
      ".ig-sline .s-av{width:38px;height:38px;border-radius:50%;background:#efefef;display:flex;align-items:center;justify-content:center;font-size:20px}" +
      ".ig-sline .s-u{font-size:13px;font-weight:600}.ig-sline .s-n{font-size:12px;color:#8e8e8e}";
    document.head.appendChild(st);
  }

  function lastPreview(conv) {
    var m = conv.msgs[conv.msgs.length - 1];
    return m[0] + ": " + m[1].replace("__FLAG__", "🔑 (a secret)");
  }

  function threadHTML(u, id) {
    var c = u.dms[thread];
    var html = '<div class="ig-thread"><span class="ig-back" data-back="1">← Messages</span>' +
      '<div style="font-weight:700;margin:4px 0 10px">💬 @' + esc(c.who) + "</div>";
    c.msgs.forEach(function (m) {
      var mine = m[0].toLowerCase() === u.user.toLowerCase();
      var text = m[1];
      if (text.indexOf("__FLAG__") >= 0) {
        text = text.replace("__FLAG__", "");
        html += '<div class="ig-bub ' + (mine ? "me" : "them") + '">' + esc(text) +
          '<div class="flag-box" style="margin-top:6px">' + CTF.getFlag("idor") + "</div></div>";
      } else {
        html += '<div class="ig-bub ' + (mine ? "me" : "them") + '">' + esc(text) + "</div>";
      }
    });
    html += "</div>";
    return html;
  }

  function inboxHTML(u, id) {
    var rows = u.dms.map(function (c, i) {
      return '<div class="ig-conv" data-ci="' + i + '">' +
        '<div class="ig-cav">' + avFor(c.who) + "</div>" +
        '<div class="ig-cmeta"><div class="ig-cwho">@' + esc(c.who) + '</div><div class="ig-cprev">' + esc(lastPreview(c)) + "</div></div>" +
        '<div class="ig-cgo">›</div></div>';
    }).join("");
    return '<div class="ig-inbox">' + rows + "</div>";
  }

  function messagesHTML(u) {
    var impersonating = (meId !== ME);
    var html = '<div class="ig-msgwrap">';
    html += '<div class="ig-msghdr">✉️ Direct — @' + esc(u.user) + "</div>";
    if (impersonating) {
      html += '<div class="ig-leak">⚠️ The address bar says you are <b>@' + esc(u.user) + "</b> — but you really logged in as @" + esc(U[ME].user) +
        ". instaDog trusted the <b>id</b> in the URL as your identity, so it just handed you @" + esc(u.user) + "'s private inbox. That's the bug (IDOR).</div>";
    }
    html += (thread == null ? inboxHTML(u) : threadHTML(u));
    html += "</div>";
    return html;
  }

  function renderProfile(ctx) {
    curCtx = ctx;
    var me = U[meId];            // the account you're logged in as (from ?id)
    var u = U[viewId];           // the profile you're looking at (?view, default = me)
    var isOwn = (viewId === meId);
    var showMsgs = isOwn;        // DMs only exist on the account you're logged in as
    if (!showMsgs && tab === "messages") tab = "posts";

    // IDOR capture: you changed the id to impersonate another account and read ITS DMs
    if (meId !== ME && isOwn && tab === "messages" && !captured) { captured = true; try { CTF.capture("idor"); } catch (e) {} }

    var suggestions = Object.keys(U).map(function (k) {
      var kid = +k, su = U[kid];
      var cls = kid === meId ? "self" : (kid === MEAN_ID ? "mean" : "");
      var sub = kid === meId ? "logged in as this" : (kid === MEAN_ID ? "your mean neighbour 😤" : su.bio.split("|")[0]);
      return '<div class="ig-sline ' + cls + '" data-id="' + kid + '"><div class="s-av">' + su.av + "</div>" +
        '<div><div class="s-u">@' + esc(su.user) + '</div><div class="s-n">' + esc(sub) + "</div></div></div>";
    }).join("");

    var grid = u.grid.map(function (g) { return '<div class="ig-cell">' + g + "</div>"; }).join("");
    var mainContent = (tab === "messages" && showMsgs) ? messagesHTML(u) : '<div class="ig-grid">' + grid + "</div>";

    ctx.container.innerHTML =
      '<div class="ig" style="--ring:' + u.ring + '">' +
      '<div class="ig-top"><div class="ig-logo">instaDog</div><div class="ig-search">🔍 Search</div>' +
      '<div class="ig-me' + (meId !== ME ? " danger" : "") + '"><span class="ig-ava-sm">' + me.av + '</span>' +
      '<span class="ig-mewho"><span class="ig-melabel">Logged in as</span><br><span class="ig-mehandle">@' + esc(me.user) + "</span></span></div></div>" +
      '<div class="ig-wrap"><div class="ig-main">' +
      '<div class="ig-head"><div class="ig-ava">' + u.av + "</div>" +
      '<div class="ig-info"><div class="ig-uline"><span class="ig-user">' + esc(u.user) + "</span>" +
      (isOwn ? '<button class="ig-btn">Edit profile</button>' : '<button class="ig-btn follow">Follow</button>') +
      (showMsgs ? '<button class="ig-btn ig-msgbtn">✉️ Message</button>' : '') +
      "</div>" +
      '<div class="ig-stats"><span><b>' + u.posts + "</b> posts</span><span><b>" + u.followers + "</b> followers</span><span><b>" + u.following + "</b> following</span></div>" +
      '<div class="ig-name">' + esc(u.name) + '</div><div class="ig-bio">' + esc(u.bio) + "</div></div></div>" +
      '<div class="ig-tabs"><div class="ig-tab ' + (tab === "posts" ? "on" : "") + '" data-tab="posts">▦ POSTS</div>' +
      (showMsgs ? '<div class="ig-tab ' + (tab === "messages" ? "on" : "") + '" data-tab="messages">✉️ MESSAGES</div>' : "") +
      "</div>" +
      mainContent +
      '</div><div class="ig-side"><div class="ig-sug"><h5>Suggested for you</h5>' + suggestions + "</div></div>" +
      "</div></div>";

    // wire: clicking a suggestion VIEWS that profile but keeps your identity (?id=me&view=kid)
    ctx.container.querySelectorAll(".ig-sline").forEach(function (n) {
      n.addEventListener("click", function () { tab = "posts"; thread = null; ctx.navigate("instadog.site/profile?id=" + meId + "&view=" + n.dataset.id); });
    });
    ctx.container.querySelectorAll(".ig-tab").forEach(function (t) {
      t.addEventListener("click", function () { tab = t.dataset.tab; thread = null; renderProfile(ctx); });
    });
    var msgBtn = ctx.container.querySelector(".ig-msgbtn");
    if (msgBtn) msgBtn.addEventListener("click", function () { tab = "messages"; thread = null; renderProfile(ctx); });
    ctx.container.querySelectorAll(".ig-conv").forEach(function (c) {
      c.addEventListener("click", function () { thread = +c.dataset.ci; renderProfile(ctx); });
    });
    var back = ctx.container.querySelector("[data-back]");
    if (back) back.addEventListener("click", function () { thread = null; renderProfile(ctx); });

    if (window.Hacker) Hacker.notify("instadog");
  }

  function render(ctx) {
    if (!window.Auth || !Auth.isLoggedIn()) {
      Auth.renderLogin(ctx.container, {
        brand: "instaDog", icon: "📸",
        subtitle: "Sign in to see photos and messages from your pack.",
        onSuccess: function () { render(ctx); }
      });
      return;
    }
    injectStyle();
    var id = parseInt(ctx.query.id, 10);
    if (!id || !U[id]) { tab = "posts"; thread = null; ctx.navigate("instadog.site/profile?id=" + ME); return; }
    var prevMe = meId, prevView = viewId;
    meId = id;
    var v = parseInt(ctx.query.view, 10);
    viewId = (v && U[v]) ? v : meId;
    if (meId !== prevMe || viewId !== prevView) { tab = "posts"; thread = null; }
    renderProfile(ctx);
  }

  Browser.registerSite({ host: "instadog.site", title: "instaDog", favicon: "📸", render: render });
})();
