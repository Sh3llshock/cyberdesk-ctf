/* ===== "mr_hacker" bottom-right story notifications =====
   Replaces the old in-app briefing popups. Each note sets the STORY for a
   challenge (flavour / motivation only) — never the solution or step-by-step hints. */
(function () {
  "use strict";
  var shown = {};

  // Story text per challenge. Deliberately NO solutions or technique hints.
  var STORIES = {
    instadog: { from: "mr_hacker", body:
      "hey — it’s <b>mr_hacker</b>. your neighbour <b>Duke</b> has been talking trash about you in his private messages, and he’s <i>sure</i> nobody can read them. people always are. maybe have a look around instaDog. 👀" },
    grading: { from: "mr_hacker", body:
      "<b>mr_hacker</b> here. the school runs a staff-only admin page for the grade system — see everyone’s marks, delete whoever. students aren’t <i>meant</i> to reach it. “aren’t meant to” is my favourite phrase. 😏" },
    camera: { from: "mr_hacker", body:
      "it’s <b>mr_hacker</b>. the school keeps bragging that the new lab camera is “totally secure.” cameras like that are usually wide open to anyone who bothers to look. fancy a peek?" },
    game: { from: "mr_hacker", body:
      "<b>mr_hacker</b> here. those <b>Wings</b> in the shop would make this whole thing trivial — which is exactly why they cost a fortune. a fortune you’ll never earn playing fair, anyway. 😉" }
  };

  function host() {
    var h = document.getElementById("hacker-notes");
    if (!h) { h = document.createElement("div"); h.id = "hacker-notes"; document.body.appendChild(h); }
    return h;
  }

  var Hacker = {
    notify: function (id, opts) {
      if (id && shown[id]) return null;
      if (id) shown[id] = true;
      opts = opts || STORIES[id] || {};
      var note = document.createElement("div");
      note.className = "hk-note";
      note.innerHTML =
        '<div class="hk-head"><div class="hk-ava">🕶️</div>' +
        '<div class="hk-who">@' + (opts.from || "mr_hacker") + "</div>" +
        '<div class="hk-dot"></div><button class="hk-x" title="Dismiss">✕</button></div>' +
        '<div class="hk-body">' + (opts.body || "") + "</div>";
      host().appendChild(note);
      note.querySelector(".hk-x").addEventListener("click", function () {
        note.style.transition = "opacity .3s, transform .3s";
        note.style.opacity = "0"; note.style.transform = "translateX(22px)";
        setTimeout(function () { note.remove(); }, 300);
      });
      return note;
    },
    reset: function () { shown = {}; }
  };

  window.Hacker = Hacker;
})();
