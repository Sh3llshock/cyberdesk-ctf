/* game.js — Challenge 3: "Doggo Dash" endless runner + window.GameMemory bridge
   An original side-scrolling runner (NOT the Chrome dino). Run, jump over obstacles,
   collect coins. Shop: Jump Boots & Vision are cheap; WINGS are 5000 coins and let you
   fly over everything. The goal distance (1000 m) is only reachable with Wings — and you
   can't earn 5000 coins honestly, so you must edit the coin value in memory with CheatEngine.
   Winning (reaching the goal) captures the flag. */
(function () {
  "use strict";

  var WIN_DIST = 1000;                 // metres to win (unreachable without Wings)
  var PRICE = { boots: 20, shield: 25, wings: 5000 };

  CTF.register("memory", {
    title: "Game Hacking — Buy the Wings",
    flag: "FLAG{sc4nn3d_4nd_fr0z3_my_c01ns}",
    points: 100,
    hint: "Scan the game's coin value with CheatEngine and edit it, then buy Wings."
  });

  /* ---------- persistent state (survives close/reopen) ---------- */
  var state = { coins: 35, best: 0, won: false, boots: false, shield: false, wings: false };

  /* Simulated RAM. ONE coins cell (mirrors state.coins) + decoys; a few decoys start
     at 35 too, so First Scan for 35 returns several hits. Buying a cheap item changes
     coins (e.g. 35 -> 15) and the decoys don't move, so one Next Scan isolates coins. */
  var cells = [
    { addr: "0x004A1C", value: 35,   label: "coins" },
    { addr: "0x004B20", value: 35,   label: "decoy" },  // HP
    { addr: "0x004C34", value: 35,   label: "decoy" },  // Energy
    { addr: "0x004D48", value: 100,  label: "decoy" },  // MaxHP
    { addr: "0x004E5C", value: 35,   label: "decoy" },  // Stamina
    { addr: "0x004F70", value: 7,    label: "decoy" },  // Level
    { addr: "0x005084", value: 60,   label: "decoy" },  // FPS
    { addr: "0x005198", value: 1337, label: "decoy" }   // Hi-Score
  ];
  function coinsCell() { for (var i = 0; i < cells.length; i++) if (cells[i].label === "coins") return cells[i]; return cells[0]; }

  window.GameMemory = {
    cells: cells,
    onExternalWrite: function (addr, newValue) {
      var v = Number(newValue); if (!isFinite(v)) return false; v = Math.round(v);
      for (var i = 0; i < cells.length; i++) {
        if (cells[i].addr === addr) {
          if (cells[i].label === "coins") setCoins(v); else cells[i].value = v;
          return true;
        }
      }
      return false;
    }
  };

  function setCoins(n) { n = Math.max(0, Math.round(Number(n) || 0)); state.coins = n; coinsCell().value = n; paintHUD(); paintShop(); }
  function addCoins(n) { setCoins(state.coins + n); }

  /* ---------- DOM / canvas ---------- */
  var bodyEl = null, cv = null, ctx = null, raf = 0;
  var W = 560, H = 190, GROUND = H - 26;

  // runtime game vars
  var mode = "ready";   // ready | running | dead | won
  var player, obstacles, coins, dist, speed, spawnTimer, coinTimer, holding, jumpHold, invuln;

  function reset() {
    player = { x: 64, y: GROUND, vy: 0, onGround: true, r: 15 };
    obstacles = []; coins = []; dist = 0; speed = 3.2; spawnTimer = 40; coinTimer = 70;
    holding = false; jumpHold = 0; invuln = 0;
  }

  function startRun() {
    if (mode === "running") return;
    reset(); mode = "running";
    paintHUD();
    if (!raf) loop();
  }

  /* ---------- input ---------- */
  function press() {
    if (mode === "ready" || mode === "dead") { startRun(); return; }
    if (mode !== "running") return;
    holding = true;
    if (state.wings) return;                 // wings handled continuously in update
    if (player.onGround) {
      player.vy = state.boots ? -11.2 : -9;
      player.onGround = false; jumpHold = state.boots ? 16 : 12;
    }
  }
  function release() { holding = false; jumpHold = 0; }

  function keyDown(e) {
    if (!bodyEl || !WM.isOpen("game")) return;
    if (e.code === "Space" || e.code === "ArrowUp" || e.key === " " || e.key === "ArrowUp") { e.preventDefault(); press(); }
  }
  function keyUp(e) {
    if (e.code === "Space" || e.code === "ArrowUp" || e.key === " " || e.key === "ArrowUp") release();
  }

  /* ---------- update ---------- */
  function update() {
    if (mode !== "running") return;
    if (invuln > 0) invuln--;
    speed += 0.0022;                          // ramps up -> impossible on foot eventually
    dist += speed * 0.12;
    if (dist > state.best) state.best = dist;

    // player physics
    if (state.wings && holding) {
      player.vy = -4.2;                        // fly up
    } else {
      if (!player.onGround && player.vy < 0 && holding && jumpHold > 0) { player.vy += 0.28; jumpHold--; } // variable jump (hold = higher)
      else player.vy += 0.7;                   // gravity
    }
    if (state.wings && !holding && !player.onGround) player.vy += 0.35; // gentle glide down
    player.y += player.vy;
    if (player.y >= GROUND) { player.y = GROUND; player.vy = 0; player.onGround = true; }
    else player.onGround = false;
    if (player.y < 12) { player.y = 12; player.vy = 0; }   // flight ceiling

    // spawn obstacles (gap shrinks as speed rises)
    if (--spawnTimer <= 0) {
      var h = 18 + Math.floor(Math.random() * 20);
      obstacles.push({ x: W + 10, w: 16 + Math.floor(Math.random() * 10), h: h });
      spawnTimer = Math.max(26, Math.round(90 - speed * 6) + Math.floor(Math.random() * 20));
    }
    // spawn coins
    if (--coinTimer <= 0) {
      coins.push({ x: W + 10, y: GROUND - 20 - Math.floor(Math.random() * 60), got: false });
      coinTimer = 55 + Math.floor(Math.random() * 60);
    }

    var px = player.x, py = player.y, pr = player.r;
    // move + collide obstacles
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i]; o.x -= speed;
      if (o.x + o.w < -10) { obstacles.splice(i, 1); continue; }
      // collision box
      var oy = GROUND - o.h;
      if (px + pr > o.x && px - pr < o.x + o.w && py + pr > oy) {
        // hit (unless you're clearly above it, i.e. flying over)
        if (py + pr - 4 > oy && invuln <= 0) {
          if (state.shield) {
            state.shield = false; invuln = 75; obstacles.splice(i, 1); paintShop();
            OS.toast('<div class="tt">🛡️ Shield took the hit!</div>Your extra life saved you — keep running.', "info");
          } else { die(); }
        }
      }
    }
    // move + collect coins
    for (var j = coins.length - 1; j >= 0; j--) {
      var c = coins[j]; c.x -= speed;
      if (c.x < -10) { coins.splice(j, 1); continue; }
      if (!c.got && Math.abs(c.x - px) < pr + 9 && Math.abs(c.y - py) < pr + 9) {
        c.got = true; coins.splice(j, 1); addCoins(1);
      }
    }

    if (dist >= WIN_DIST && !state.won) win();
  }

  function die() { mode = "dead"; paintHUD(); }
  function win() {
    mode = "won"; state.won = true;
    try { CTF.capture("memory"); } catch (e) {}
    paintWin();
  }

  /* ---------- draw ---------- */
  function drawDog(x, y) {
    // original cartoon dog (not a copyrighted character)
    var g = ctx;
    g.fillStyle = "#8d6e4f";                 // body
    g.beginPath(); g.ellipse(x, y - 8, 15, 11, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(x + 8, y - 16, 12, 11);        // head
    g.beginPath(); g.moveTo(x + 9, y - 16); g.lineTo(x + 6, y - 24); g.lineTo(x + 14, y - 17); g.closePath(); g.fill(); // ear
    g.fillStyle = "#6f553b";                  // muzzle
    g.fillRect(x + 18, y - 12, 6, 5);
    g.fillStyle = "#1b1b1b";                  // eye + nose
    g.fillRect(x + 15, y - 14, 2, 2); g.fillRect(x + 23, y - 12, 2, 2);
    g.strokeStyle = "#6f553b"; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 15, y - 9); g.lineTo(x - 22, y - 13); g.stroke(); // tail
    // legs (simple run animation via dist)
    g.fillStyle = "#6f553b";
    var swing = Math.sin(dist * 0.6) * 4;
    g.fillRect(x - 6 + swing, y + 1, 4, 8);
    g.fillRect(x + 6 - swing, y + 1, 4, 8);
    if (state.wings) { // wings overlay
      g.fillStyle = "rgba(255,255,255,.9)";
      var wy = y - 10 + Math.sin(dist) * 2;
      g.beginPath(); g.moveTo(x - 2, wy); g.lineTo(x - 20, wy - 12); g.lineTo(x - 6, wy + 2); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x + 2, wy); g.lineTo(x + 18, wy - 14); g.lineTo(x + 6, wy + 2); g.closePath(); g.fill();
    }
    // shield bubble: solid while you still have the shield, flashing briefly after it absorbs a hit
    if (state.shield || (invuln > 0 && Math.floor(invuln / 6) % 2 === 0)) {
      g.strokeStyle = state.shield ? "rgba(45,170,255,.9)" : "rgba(255,170,60,.9)";
      g.lineWidth = 2.5; g.beginPath(); g.arc(x + 2, y - 8, 22, 0, Math.PI * 2); g.stroke();
    }
  }

  function draw() {
    if (!ctx) return;
    // sky
    var grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#cfeaff"); grd.addColorStop(1, "#eaf6ff");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    // goal marker position (parallax)
    // ground
    ctx.fillStyle = "#caa36a"; ctx.fillRect(0, GROUND + 14, W, H - GROUND);
    ctx.strokeStyle = "#a9814b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GROUND + 14); ctx.lineTo(W, GROUND + 14); ctx.stroke();

    // obstacles (barrels/rocks)
    ctx.fillStyle = "#4a7c59";
    obstacles.forEach(function (o) {
      var oy = GROUND - o.h;
      ctx.fillStyle = "#3f6d50"; ctx.fillRect(o.x, oy, o.w, o.h + 14);
      ctx.fillStyle = "#52906a"; ctx.fillRect(o.x + 2, oy + 2, o.w - 4, 5);
    });
    // coins
    coins.forEach(function (c) {
      ctx.fillStyle = "#f5c518"; ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#c99700"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.fillText("$", c.x, c.y + 3);
    });
    // player
    drawDog(player.x, player.y);

    // distance bar
    ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(10, 10, 160, 7);
    ctx.fillStyle = "#2777ff"; ctx.fillRect(10, 10, Math.min(160, 160 * dist / WIN_DIST), 7);
    ctx.fillStyle = "#15314f"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(Math.floor(dist) + " m / " + WIN_DIST + " m", 10, 32);

    if (mode === "ready") centerText("Press Space / click to run", "#15314f");
    else if (mode === "dead") centerText("💥 Crashed at " + Math.floor(dist) + " m — Space to retry", "#b1301f");
    else if (mode === "won") centerText("🏁 GOAL REACHED!", "#0b7a2e");
  }

  function centerText(t, col) {
    ctx.fillStyle = "rgba(255,255,255,.72)"; ctx.fillRect(0, H / 2 - 18, W, 36);
    ctx.fillStyle = col; ctx.font = "bold 15px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(t, W / 2, H / 2 + 5);
  }

  function loop() {
    if (!bodyEl || !cv) { raf = 0; return; }
    update(); draw();
    raf = requestAnimationFrame(loop);
  }

  /* ---------- HUD + shop ---------- */
  function paintHUD() {
    if (!bodyEl) return;
    var h = bodyEl.querySelector("#rn-coins"); if (h) h.textContent = state.coins;
    var b = bodyEl.querySelector("#rn-best"); if (b) b.textContent = Math.floor(state.best) + " m";
  }

  function shopCard(id, name, icon, desc) {
    var owned = !!state[id];
    var price = PRICE[id];
    return '<div class="rn-item' + (owned ? " owned" : "") + '">' +
      '<div class="rn-ic">' + icon + "</div>" +
      '<div class="rn-it"><div class="rn-nm">' + name + '</div><div class="rn-ds">' + desc + "</div></div>" +
      (owned
        ? '<div class="rn-have">✓ owned</div>'
        : '<button class="btn rn-buy" data-item="' + id + '">' + price + " 🪙</button>") +
      "</div>";
  }

  function paintShop() {
    if (!bodyEl) return;
    var s = bodyEl.querySelector("#rn-shop"); if (!s) return;
    s.innerHTML =
      shopCard("boots", "Jump Boots", "🥾", "Jump higher.") +
      shopCard("shield", "Shield", "🛡️", "Survive one hit — an extra life.") +
      shopCard("wings", "Wings", "🪽", "Hold to FLY over everything. The only way to the goal.");
    s.querySelectorAll(".rn-buy").forEach(function (btn) {
      btn.addEventListener("click", function () { buy(btn.dataset.item); });
    });
  }

  function buy(item) {
    var price = PRICE[item];
    if (state.coins < price) {
      OS.toast("Not enough coins for " + item + " — you need " + price + " 🪙.", "error");
      return;
    }
    setCoins(state.coins - price);
    state[item] = true;
    paintShop();
    if (item === "wings") OS.toast('<div class="tt">🪽 Wings equipped!</div>Hold <b>Space</b> (or click & hold) to fly over the obstacles to the goal.', "success");
    else if (item === "shield") OS.toast('<div class="tt">🛡️ Shield equipped!</div>You\'ll survive one hit this run.', "success");
    else OS.toast("Bought " + item + ".", "success");
  }

  function paintWin() {
    if (!bodyEl) return;
    var w = bodyEl.querySelector("#rn-win"); if (!w) return;
    w.innerHTML =
      '<div style="font-weight:800;color:var(--good);font-size:15px">🏆 You reached the goal with the Wings!</div>' +
      '<div style="font-size:13px;margin:4px 0">A distance no honest runner could reach. Flag captured:</div>' +
      '<div class="flag-box">' + CTF.getFlag("memory") + "</div>";
  }

  /* ---------- styles ---------- */
  function style() {
    if (document.getElementById("rn-style")) return;
    var s = document.createElement("style"); s.id = "rn-style";
    s.textContent = [
      "#rn-wrap{font-family:var(--sans);color:var(--text);padding:14px 16px}",
      "#rn-wrap h2{margin:0 0 2px;font-size:19px}",
      "#rn-wrap .sub{color:var(--text-dim);font-size:12.5px;margin-bottom:10px}",
      "#rn-hud{display:flex;gap:18px;align-items:center;margin-bottom:8px;font-size:14px}",
      "#rn-hud .pill{background:#eef6fd;border:1px solid #cfe6fa;border-radius:16px;padding:5px 12px;font-weight:700}",
      "#rn-hud .pill b{color:var(--accent-dark)}",
      "#rn-canvas{width:100%;height:auto;display:block;border:1px solid var(--win-border);border-radius:10px;background:#eaf6ff;cursor:var(--cur-link)}",
      "#rn-controls{font-size:12px;color:var(--text-dim);margin:7px 0 12px}",
      "#rn-shop{display:flex;gap:10px;flex-wrap:wrap}",
      ".rn-item{flex:1;min-width:150px;display:flex;align-items:center;gap:10px;border:1px solid var(--win-border);border-radius:10px;padding:10px;background:#fff}",
      ".rn-item.owned{background:#f1faf1;border-color:#bfe3bf}",
      ".rn-ic{font-size:26px}",
      ".rn-it{flex:1;min-width:0}.rn-nm{font-weight:700;font-size:13.5px}.rn-ds{font-size:11.5px;color:var(--text-dim)}",
      ".rn-buy{padding:6px 12px;font-size:13px;white-space:nowrap}",
      ".rn-have{color:var(--good);font-weight:700;font-size:12.5px}",
      "#rn-win{margin-top:12px}"
    ].join("");
    document.head.appendChild(s);
  }

  function build(body) {
    bodyEl = body; style(); mode = "ready"; reset();
    body.innerHTML =
      '<div id="rn-wrap">' +
      "<h2>Doggo Dash 🐾</h2>" +
      '<div class="sub">Run, jump the obstacles, grab coins. Reach <b>' + WIN_DIST + ' m</b> to win.</div>' +
      '<div id="rn-hud">' +
      '<div class="pill">🪙 Coins: <b id="rn-coins">' + state.coins + "</b></div>" +
      '<div class="pill">🏁 Best: <b id="rn-best">' + Math.floor(state.best) + " m</b></div>" +
      "</div>" +
      '<canvas id="rn-canvas" width="' + W + '" height="' + H + '" tabindex="0"></canvas>' +
      '<div id="rn-controls">▶ <b>Space</b> / click to jump — <b>hold</b> to jump higher &amp; farther. (With Wings: hold to fly.)</div>' +
      '<div style="font-weight:700;font-size:13px;margin-bottom:7px">🛒 Shop</div>' +
      '<div id="rn-shop"></div>' +
      '<div id="rn-win"></div>' +
      "</div>";

    cv = body.querySelector("#rn-canvas"); ctx = cv.getContext("2d");
    paintShop();
    if (state.won) paintWin();

    // input: pointer on canvas + keyboard on document (gated to this window)
    cv.addEventListener("mousedown", function (e) { e.preventDefault(); cv.focus(); press(); });
    cv.addEventListener("mouseup", release);
    cv.addEventListener("mouseleave", release);
    cv.addEventListener("touchstart", function (e) { e.preventDefault(); press(); }, { passive: false });
    cv.addEventListener("touchend", function (e) { e.preventDefault(); release(); }, { passive: false });

    draw();
    if (window.Hacker) Hacker.notify("game");
  }

  // keyboard listeners (document-level, gated by game window being open)
  document.addEventListener("keydown", keyDown);
  document.addEventListener("keyup", keyUp);

  OS.registerApp({
    id: "game", name: "Doggo Dash",
    icon: "🐾",
    onOpen: function () {
      var rec = WM.open({
        id: "game", title: "Doggo Dash", icon: "🐾", width: 640, height: 600,
        render: function (b) { build(b); }
      });
      var closeBtn = rec.el.querySelector(".win-btn.close");
      if (closeBtn) closeBtn.addEventListener("click", function () {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        mode = "ready"; bodyEl = null; cv = null; ctx = null;
      });
    }
  });
})();
