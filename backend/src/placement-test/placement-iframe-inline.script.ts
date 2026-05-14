/** Inline script for placement test iframe. String.raw preserves \ for emitted browser JS (regex \b, /\/$/, \s+, \u2026, etc.). */
export const PLACEMENT_IFRAME_SCRIPT = String.raw`
(function () {
  try {
    var m = document.querySelector('meta[name="explys-placement-api-origin"]');
    var c = m && m.getAttribute("content");
    window.__PLACEMENT_API_ORIGIN__ = c != null && c !== "" ? String(c) : "";
  } catch (eMeta) {
    window.__PLACEMENT_API_ORIGIN__ = "";
  }

  // #region agent log
  function diag(step, data) {
    try {
      var errSteps =
        step === "raw_empty" ||
        step === "parse_err" ||
        step === "no_questions" ||
        step === "dom_missing" ||
        step === "dom_missing_nav" ||
        step === "dom_missing_result" ||
        step === "throw";
      if (typeof console !== "undefined") {
        if (errSteps && console.error) {
          console.error("[placement:iframe]", step, data || {});
        } else if (console.log) {
          console.log("[placement:iframe]", step, data || {});
        }
      }
    } catch (eC) {}
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: "placement_diag", sessionId: "0c8a48", step: step, data: data || {} },
          "*",
        );
      }
    } catch (e0) {}
  }
  // #endregion

  function plApi(path) {
    var o =
      typeof window.__PLACEMENT_API_ORIGIN__ === "string"
        ? String(window.__PLACEMENT_API_ORIGIN__).replace(/\/$/, "")
        : "";
    path = String(path || "");
    if (!path || path.charAt(0) !== "/") {
      path = "/" + path;
    }
    return o ? o + path : path;
  }

  function showLoadError(msg) {
    try {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[placement:iframe] showLoadError (visible banner)", msg);
      }
    } catch (eW) {}
    var banner = document.getElementById("placementLoadError");
    if (!banner) {
      try {
        if (typeof console !== "undefined" && console.error) {
          console.error(
            "[placement:iframe] showLoadError: #placementLoadError missing — cannot show:",
            msg,
          );
        }
      } catch (eB) {}
      return;
    }
    banner.textContent = msg;
    banner.removeAttribute("hidden");
  }

  diag("boot", { href: String(typeof location !== "undefined" ? location.href : "") });

  var elTa = document.getElementById("placement-data");
  var raw = "";
  var rawSource = "none";
  if (elTa && elTa.tagName === "TEXTAREA") {
    var tv = String(elTa.value || "").trim();
    if (tv) {
      raw = tv;
      rawSource = "textarea";
    }
  }
  diag("raw", { len: raw.length, source: rawSource });
  if (raw == null || raw === "") {
    showLoadError("Could not load test data. Please refresh the page or try again later.");
    diag("raw_empty", {});
    return;
  }

  var d;
  try {
    d = JSON.parse(raw);
  } catch (eParse) {
    diag("parse_err", { err: String(eParse && eParse.message) });
    showLoadError("Test data was corrupted. Please refresh the page.");
    return;
  }

  if (!d || !d.questions || !d.questions.length) {
    diag("no_questions", { hasD: !!d, qLen: d && d.questions ? d.questions.length : -1 });
    showLoadError("No questions were returned for this test. Refresh the page, or sign out and back in if this keeps happening.");
    return;
  }

  diag("parsed", { n: d.questions.length });

  try {

  function getLevel(score, total) {
    var pct = (score / total) * 100;
    if (pct >= 90) return { level: "C1", label: "Advanced" };
    if (pct >= 70) return { level: "B2", label: "Upper intermediate" };
    if (pct >= 50) return { level: "B1", label: "Intermediate" };
    if (pct >= 30) return { level: "A2", label: "Elementary" };
    return { level: "A1", label: "Beginner" };
  }

  function levelMessage(code) {
    if (code === "A1" || code === "A2") {
      return "We will personalize lessons to your beginner level and help you build strong foundations.";
    }
    if (code === "B1" || code === "B2") {
      return "We will match content to your intermediate level and help you keep advancing.";
    }
    return "We will personalize with more challenging material for your advanced skills.";
  }

  var questions = d.questions;
  var n = questions.length;
  var answers = [];
  var i = 0;
  var lastSummary = null;
  for (var z = 0; z < n; z++) { answers[z] = null; }

  var tagRow = document.getElementById("tagRow");
  if (tagRow) {
    (d.knowledgeTags || []).slice(0, 7).forEach(function (t) {
      var s = document.createElement("span");
      s.className = "tag";
      s.textContent = t;
      tagRow.appendChild(s);
    });
  }

  var qKind = document.getElementById("qKind");
  var qText = document.getElementById("qText");
  var optsEl = document.getElementById("opts");
  var stepLabel = document.getElementById("stepLabel");
  var prog = document.getElementById("progressFill");
  var bar = document.querySelector('[role="progressbar"]');
  var btnPrev = document.getElementById("btnPrev");
  var btnNext = document.getElementById("btnNext");

  var btnExit = document.getElementById("btnExit");
  if (btnExit) {
    btnExit.addEventListener("click", function () {
      try {
        window.parent && window.parent.postMessage({ type: "placement_exit" }, "*");
      } catch (e0) {}
    });
  }

  diag("dom_refs", {
    qKind: !!qKind,
    qText: !!qText,
    optsEl: !!optsEl,
    stepLabel: !!stepLabel,
    prog: !!prog,
    bar: !!bar,
    btnPrev: !!btnPrev,
    btnNext: !!btnNext,
  });
  if (!prog || !stepLabel) {
    try {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[placement:iframe] setProgress will no-op (missing #progressFill or #stepLabel)");
      }
    } catch (eP) {}
  }

  function setProgress(idx) {
    if (!prog || !stepLabel) return;
    var p = Math.round(((idx + 1) / n) * 100);
    prog.style.width = p + "%";
    if (bar) { bar.setAttribute("aria-valuenow", String(p)); }
    stepLabel.textContent = (idx + 1) + " / " + n;
  }

  function renderQuestion(idx) {
    if (!qKind || !qText || !optsEl || !btnNext || !btnPrev) {
      diag("dom_missing", {
        qKind: !!qKind,
        qText: !!qText,
        optsEl: !!optsEl,
        btnNext: !!btnNext,
        btnPrev: !!btnPrev,
      });
      showLoadError("Could not wire the quiz UI. Please refresh the page.");
      return;
    }
    var q = questions[idx];
    qKind.textContent = String(q.type || "");
    qKind.className = "q-type-pill" + (q.type === "vocabulary" ? " vocab" : "");
    qText.textContent = String(q.prompt != null ? q.prompt : "");

    optsEl.innerHTML = "";
    var selected = answers[idx];
    for (var j = 0; j < 4; j++) {
      var opt = document.createElement("button");
      opt.type = "button";
      opt.className = "opt";
      opt.setAttribute("role", "radio");
      opt.setAttribute("aria-checked", selected === j ? "true" : "false");
      opt.setAttribute("data-idx", String(j));

      var L = document.createElement("span");
      L.className = "opt-letter";
      L.textContent = String.fromCharCode(65 + j);
      var T = document.createElement("span");
      T.className = "opt-text";
      T.textContent = String(q.options[j] != null ? q.options[j] : "");

      opt.appendChild(L);
      opt.appendChild(T);
      opt.addEventListener("click", function (ev) {
        var dj = parseInt(ev.currentTarget.getAttribute("data-idx"), 10);
        answers[idx] = dj;
        var buttons = optsEl.querySelectorAll(".opt");
        for (var k = 0; k < buttons.length; k++) {
          buttons[k].setAttribute("aria-checked", k === dj ? "true" : "false");
        }
        btnNext.disabled = answers[idx] === null;
      });
      optsEl.appendChild(opt);
    }

    setProgress(idx);
    btnPrev.disabled = idx === 0;
    var last = idx === n - 1;
    btnNext.textContent = last ? "Finish test" : "Next";
    btnNext.disabled = answers[idx] === null;
  }

  if (!btnPrev || !btnNext) {
    diag("dom_missing_nav", { btnPrev: !!btnPrev, btnNext: !!btnNext });
    showLoadError("Could not wire navigation buttons. Please refresh the page.");
    throw new Error("placement: missing #btnPrev or #btnNext");
  }

  btnPrev.addEventListener("click", function () {
    if (i <= 0) return;
    i--;
    renderQuestion(i);
  });

  btnNext.addEventListener("click", function () {
    if (answers[i] === null) return;
    if (i < n - 1) {
      i++;
      renderQuestion(i);
      return;
    }
    showResult();
  });

  var GRAMMAR_TOPIC_RULES = [
    [/\bif\b[\s\S]{0,80}\b(would have|had taken|hadn't)\b|third conditional|mixed conditional/i, "conditionals"],
    [/\b(will have|future perfect|by next|by then)\b/i, "future perfect and timelines"],
    [/\b(have been|has been|present perfect|past perfect)\b/i, "perfect tenses"],
    [/\b(relative pronoun|relative clause)\b|\bwhose\b|\bwhich\b|\bwhom\b/i, "relative clauses"],
    [/\b(despite|although|however|because of|even though)\b/i, "connectors and contrast"],
    [/\b(keen on|depend on|good at)\b/i, "prepositions and patterns"],
    [/\b(article|choose the correct article|\ba\b\/\ban\b\/\bthe\b)\b/i, "articles (a / an / the)"],
    [/\b(passive|was built|been made|being done)\b/i, "passive voice"],
    [/\b(gerund|infinitive|vs\.?\s*to\s+)/i, "gerunds and infinitives"],
    [/\bmodal\b|\b(should|must|might|could|would)\b(?![a-z])/i, "modal verbs"],
    [/\b(subjunctive|if I were|were I)\b/i, "subjunctive / unreal forms"],
    [/\b(comparative|superlative|more than|less than|as \w+ as)\b/i, "comparatives"],
    [/\b(subject-verb|agreement|plural verb)\b/i, "subject–verb agreement"],
    [/\b(inversion|word order|so do I|neither do I)\b/i, "word order"]
  ];

  function uniqueTrim(items, max, maxLen) {
    var seen = {};
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var t = String(items[i] || "").replace(/\s+/g, " ").trim();
      if (!t) continue;
      if (t.length > maxLen) t = t.slice(0, maxLen - 1) + "\u2026";
      var key = t.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push(t);
      if (out.length >= max) break;
    }
    return out;
  }

  function inferGrammarTopics(prompt) {
    var topics = [];
    for (var ri = 0; ri < GRAMMAR_TOPIC_RULES.length; ri++) {
      if (GRAMMAR_TOPIC_RULES[ri][0].test(prompt)) topics.push(GRAMMAR_TOPIC_RULES[ri][1]);
    }
    if (!topics.length) topics.push("general sentence patterns");
    return uniqueTrim(topics, 20, 80);
  }

  function buildClientSummary(questions, answers) {
    var vReinforced = [];
    var vReview = [];
    var gPracticed = [];
    var gReview = [];
    for (var k = 0; k < questions.length; k++) {
      var q = questions[k];
      var pick = answers[k];
      var ok = pick !== null && pick !== undefined && pick === q.correctIndex;
      var type = q.type === "vocabulary" ? "vocabulary" : "grammar";
      var phrase = "";
      if (q.options && q.options.length === 4) {
        phrase = String(q.options[q.correctIndex] || "").replace(/\s+/g, " ").trim();
      }
      if (type === "vocabulary") {
        if (!phrase) continue;
        if (ok) vReinforced.push(phrase);
        else vReview.push(phrase);
        continue;
      }
      var p = String(q.prompt || "").replace(/\s+/g, " ").trim();
      var topics = inferGrammarTopics(p);
      for (var t = 0; t < topics.length; t++) gPracticed.push(topics[t]);
      if (!ok) {
        for (var t2 = 0; t2 < topics.length; t2++) gReview.push(topics[t2]);
      }
    }
    return {
      vocabularyReinforced: uniqueTrim(vReinforced, 8, 120),
      vocabularyToReview: uniqueTrim(vReview, 8, 120),
      grammarYouPracticed: uniqueTrim(gPracticed, 12, 80),
      grammarToRevisit: uniqueTrim(gReview, 8, 80)
    };
  }

  function joinPhrases(arr, max) {
    var u = uniqueTrim(arr,max, 120);
    if (!u.length) return "";
    if (u.length === 1) return u[0];
    if (u.length === 2) return u[0] + " and " + u[1];
    return u.slice(0, -1).join(", ") + ", and " + u[u.length - 1];
  }

  function joinTopics(arr, max) {
    var u = uniqueTrim(arr, max, 80);
    if (!u.length) return "";
    if (u.length === 1) return u[0];
    if (u.length === 2) return u[0] + " and " + u[1];
    return u.slice(0, -1).join(", ") + ", and " + u[u.length - 1];
  }

  function renderSummary(summary) {
    var card = document.getElementById("summaryCard");
    var elV = document.getElementById("summaryVocab");
    var elG = document.getElementById("summaryGrammar");
    var elH = document.getElementById("summaryHint");
    var vOk = summary.vocabularyReinforced.length;
    var vBad = summary.vocabularyToReview.length;

    var vocabParts = [];
    if (vOk) {
      vocabParts.push("Vocabulary — You reinforced words and phrases such as " + joinPhrases(summary.vocabularyReinforced, 8) + ".");
    }
    if (vBad) {
      vocabParts.push("Worth another look: " + joinPhrases(summary.vocabularyToReview, 6) + " (these were the best answers).");
    }
    if (!vocabParts.length) {
      elV.textContent = "Vocabulary — You worked on meaning, collocations, and word choice. Keep noticing how native speakers phrase ideas in your lessons.";
    } else {
      elV.textContent = vocabParts.join(" ");
    }

    var gP = summary.grammarYouPracticed.length;
    var gR = summary.grammarToRevisit.length;
    var gParts = [];
    if (gP) {
      gParts.push("Grammar — You used structures tied to " + joinTopics(summary.grammarYouPracticed, 10) + ".");
    }
    if (gR) {
      gParts.push("If any item felt shaky, revisit " + joinTopics(summary.grammarToRevisit, 6) + ".");
    }
    if (!gParts.length) {
      elG.textContent = "";
    } else {
      elG.textContent = gParts.join(" ");
    }

    elH.textContent = "We use this recap to tune your catalogue — not as a judgment of you.";
    card.hidden = false;
  }

  function computeScore() {
    var score = 0;
    for (var k = 0; k < n; k++) {
      var q = questions[k];
      if (answers[k] !== null && answers[k] === q.correctIndex) score++;
    }
    return score;
  }

  function showResult() {
    document.getElementById("view-quiz").classList.add("is-off");
    document.getElementById("view-quiz").setAttribute("aria-hidden", "true");
    var res = document.getElementById("view-result");
    res.style.display = "flex";
    res.classList.add("is-on");
    res.setAttribute("aria-hidden", "false");

    var score = computeScore();
    var level = getLevel(score, n);
    var pct = Math.round((score / n) * 100);

    document.getElementById("scoreFract").textContent = score + "/" + n;
    document.getElementById("scorePct").textContent = pct + "% correct";
    document.getElementById("lvlCode").textContent = level.level;
    document.getElementById("lvlLabel").textContent = level.label;
    document.getElementById("lvlMsg").textContent = levelMessage(level.level);

    lastSummary = buildClientSummary(questions, answers);
    renderSummary(lastSummary);
  }

  var btnContinue = document.getElementById("btnContinue");
  var finishMsg = document.getElementById("finishMsg");
  if (!btnContinue || !finishMsg) {
    try {
      if (typeof console !== "undefined" && console.error) {
        console.error("[placement:iframe] missing result controls — cannot wire complete", {
          btnContinue: !!btnContinue,
          finishMsg: !!finishMsg,
        });
      }
    } catch (e0) {}
    diag("dom_missing_result", { btnContinue: !!btnContinue, finishMsg: !!finishMsg });
  } else {
    btnContinue.addEventListener("click", function () {
      btnContinue.disabled = true;
      finishMsg.textContent = "Saving…";
      finishMsg.className = "msg-foot";

      var payloadAnswers = {};
      for (var k = 0; k < n; k++) {
        var qi = questions[k];
        if (answers[k] !== null && answers[k] !== undefined) {
          payloadAnswers[qi.id] = answers[k];
        }
      }

      var h = { "Content-Type": "application/json" };
      if (d.xApiToken) h["x-api-token"] = d.xApiToken;

      fetch(plApi("/placement-test/complete"), {
        method: "POST",
        headers: h,
        body: JSON.stringify({ access_token: d.accessToken, answers: payloadAnswers })
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t || String(r.status)); });
        return r.json();
      }).then(function () {
        finishMsg.className = "msg-foot ok";
        finishMsg.textContent = "You are all set. Returning to your library.";
        try {
          if (typeof console !== "undefined" && console.log) {
            console.log("[placement:iframe] complete OK — posting placement_test_complete to parent");
          }
        } catch (eL) {}
        try {
          window.parent && window.parent.postMessage({ type: "placement_test_complete", summary: lastSummary }, "*");
        } catch (e) {}
      }).catch(function (e) {
        try {
          if (typeof console !== "undefined" && console.error) {
            console.error("[placement:iframe] POST /placement-test/complete failed", e && e.message, e);
          }
        } catch (eC) {}
        finishMsg.className = "msg-foot err";
        finishMsg.textContent = (e && e.message) || "Could not save. Tap to retry.";
        btnContinue.disabled = false;
      });
    });
  }

  renderQuestion(0);
  diag("rendered", { ok: true, n: n });
  } catch (errRun) {
    diag("throw", {
      err: String(errRun && errRun.message),
      stack: errRun && errRun.stack ? String(errRun.stack).slice(0, 800) : "",
    });
    showLoadError("Something went wrong loading the test. Please refresh the page.");
    if (typeof console !== "undefined" && console.error) console.error("[placement:iframe] uncaught init", errRun);
  }
})();
`.trim();
