import type { GenerateComprehensionTestsResult } from "./content-video-comprehension-tests.service";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type GradeIframeConfig = {
  token: string;
  submitPath: string;
  contentVideoId: number;
  videoName: string;
  /** Full URL to the app’s summary page (e.g. Next origin + /test/comprehension-summary). */
  summaryBase: string | null;
};

function jsonEmbedConfig(obj: GradeIframeConfig): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Standalone HTML document for `<iframe src="…/content-video/:id/tests/iframe">`.
 * `apiOrigin` e.g. `https://api.example.com` (no trailing slash) for same-origin `fetch` to submit.
 * @param options.summaryBase — e.g. `https://app.example.com/test/comprehension-summary` (add ?summaryBase=… to the iframe URL).
 */
export function renderComprehensionTestsIframeHtml(
  result: GenerateComprehensionTestsResult,
  apiOrigin: string,
  options?: { summaryBase: string | null },
): string {
  const origin = (apiOrigin || "").replace(/\/$/, "");
  const submitPath = `${origin}/content-video/${result.contentVideoId}/tests/submit`;
  const rawSummary = options?.summaryBase?.trim();
  let summaryBase: string | null = null;
  if (rawSummary) {
    try {
      const u = new URL(rawSummary);
      if (u.protocol === "http:" || u.protocol === "https:") {
        summaryBase = u.toString().replace(/\/$/, "");
      }
    } catch {
      summaryBase = null;
    }
  }
  const gradeConfigJson = jsonEmbedConfig({
    token: result.gradingToken,
    submitPath,
    contentVideoId: result.contentVideoId,
    videoName: result.videoName,
    summaryBase,
  });
  const meta = [
    result.learnerCefr
      ? `Level: ${escapeHtml(result.learnerCefr)}`
      : "Level: —",
    result.usedTranscript ? "Transcript: yes" : "Transcript: no",
    `Vocab terms: ${result.vocabularyTermsUsed}`,
    `Source: ${result.source}`,
  ].join(" · ");

  const questionsHtml = result.tests
    .map((t, idx) => {
      if (t.questionType === "open") {
        return `
      <fieldset class="q open" data-kind="open" data-qid="${escapeHtml(t.id)}" data-explanation="${escapeHtml(t.explanation ?? "")}">
        <legend class="qnum">
          <span class="qix">Q${idx + 1}</span>
          <span class="cat open">Summary</span>
        </legend>
        <p class="prompt">${escapeHtml(t.question)}</p>
        <textarea class="open-answer" rows="5" placeholder="Write 2–3 sentences in English." aria-label="Your answer"></textarea>
        <p class="ta-hint">Aim for at least ~40 characters and two sentences.</p>
        <p class="feedback" hidden></p>
      </fieldset>`;
      }
      const cat =
        t.category === "grammar"
          ? "grammar"
          : t.category === "vocabulary"
            ? "vocabulary"
            : "comprehension";
      const catLabel =
        cat === "grammar"
          ? "Grammar"
          : cat === "vocabulary"
            ? "Vocabulary"
            : "Comprehension";
      const opts = t.options
        .map(
          (o, i) => `
        <label class="opt" data-idx="${i}">
          <input type="radio" name="q_${escapeHtml(t.id)}" value="${i}" />
          <span>${escapeHtml(o)}</span>
        </label>`,
        )
        .join("");
      return `
      <fieldset class="q" data-kind="mcq" data-correct="${t.correctIndex}" data-qid="${escapeHtml(t.id)}" data-cat="${cat}" data-explanation="${escapeHtml(t.explanation ?? "")}">
        <legend class="qnum">
          <span class="qix">Q${idx + 1}</span>
          <span class="cat ${cat}">${catLabel}</span>
        </legend>
        <p class="prompt">${escapeHtml(t.question)}</p>
        <div class="opts">${opts}</div>
        <p class="feedback" hidden></p>
      </fieldset>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(result.videoName)} — test</title>
  <style>
    :root {
      --bg: #0f1419;
      --panel: #1a2332;
      --text: #e7ecf3;
      --muted: #8b9cb3;
      --ok: #22c55e;
      --bad: #f87171;
      --border: #2d3a4d;
      --accent: #0ea5e9;
      --grammar: #a78bfa;
      --comp: #38bdf8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
      min-height: 100vh;
    }
    .wrap { max-width: 42rem; margin: 0 auto; padding: 1rem 1rem 2.5rem; }
    h1 { font-size: 1.15rem; font-weight: 700; margin: 0 0 0.35rem; }
    .meta { font-size: 0.75rem; color: var(--muted); margin-bottom: 0.5rem; }
    .hint { font-size: 0.8rem; color: var(--muted); margin-bottom: 1.25rem; }
    .q {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem 1rem 0.75rem;
      margin-bottom: 1rem;
    }
    .q.ok { border-color: rgba(34, 197, 94, 0.45); }
    .q.bad { border-color: rgba(248, 113, 113, 0.5); }
    .qnum {
      font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted);
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
    }
    .qix { font-weight: 600; }
    .cat { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; padding: 0.1rem 0.45rem; border-radius: 4px; }
    .cat.grammar { background: rgba(167, 139, 250, 0.2); color: var(--grammar); }
    .cat.comprehension { background: rgba(56, 189, 248, 0.15); color: var(--comp); }
    .cat.vocabulary { background: rgba(52, 211, 153, 0.14); color: #6ee7b7; }
    .cat.open { background: rgba(226, 232, 240, 0.1); color: #cbd5e1; }
    textarea.open-answer {
      width: 100%; margin: 0.5rem 0 0; padding: 0.65rem 0.75rem; font: inherit; font-size: 0.9rem;
      border-radius: 8px; border: 1px solid var(--border); background: #0c1219; color: var(--text); resize: vertical; min-height: 6rem;
    }
    textarea.open-answer:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
    .ta-hint { font-size: 0.72rem; color: var(--muted); margin: 0.35rem 0 0; }
    .prompt { margin: 0.5rem 0 0.75rem; font-size: 0.95rem; }
    .opts { display: flex; flex-direction: column; gap: 0.45rem; }
    .opt {
      display: flex; align-items: flex-start; gap: 0.5rem;
      font-size: 0.88rem; cursor: pointer;
      padding: 0.35rem 0.5rem; border-radius: 6px;
    }
    .opt:hover { background: rgba(255,255,255,0.04); }
    .opt input { margin-top: 0.2rem; accent-color: var(--accent); }
    .feedback { font-size: 0.8rem; margin: 0.6rem 0 0; color: var(--muted); }
    .q.ok .feedback { color: var(--ok); }
    .q.bad .feedback { color: #fca5a5; }
    .bar {
      position: sticky; bottom: 0; left: 0; right: 0;
      padding: 0.75rem 0 0; background: linear-gradient(transparent, var(--bg) 40%);
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;
    }
    button {
      font: inherit; cursor: pointer;
      background: var(--accent); color: #0c1118; border: 0;
      padding: 0.55rem 1rem; border-radius: 8px; font-weight: 600;
    }
    button:hover { filter: brightness(1.08); }
    .reveal, .sec { background: transparent; color: var(--muted); border: 1px solid var(--border); }
    .reveal:hover, .sec:hover { color: var(--text); }
    .sec { color: #e7ecf3; }
    #resultPanel {
      display: none; margin-top: 1.25rem; padding: 1rem; border-radius: 10px;
      border: 1px solid var(--border); background: #141c28; font-size: 0.9rem;
    }
    #resultPanel.on { display: block; }
    #resultPanel .score { font-size: 1.25rem; font-weight: 700; color: var(--ok); }
    #resultPanel ul { margin: 0.5rem 0 0; padding-left: 1.1rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(result.videoName)}</h1>
    <p class="meta">${meta}</p>
    <p class="hint">Includes grammar, vocabulary, comprehension, and one short written summary. Use <em>Check</em>, then <strong>Save results &amp; update my topic knowledge</strong> (add <code>?userId=…</code> to the iframe URL to update scores).</p>
    ${questionsHtml}
    <div class="bar">
      <button type="button" class="sec" id="checkBtn">Check answers</button>
      <button type="button" id="revealBtn" class="reveal">Reveal correct</button>
      <button type="button" class="sec" id="submitBtn" style="border-color:var(--ok); color: var(--ok);">Save results & update topic knowledge</button>
    </div>
    <div id="resultPanel" role="status" aria-live="polite">
      <div class="score" id="resultScore"></div>
      <p id="resultBreakdown" style="color:var(--muted); font-size:0.85rem; margin:0.35rem 0 0"></p>
      <p id="resultMessage" style="margin:0.5rem 0 0; font-size:0.9rem"></p>
      <ul id="resultTopics"></ul>
    </div>
  </div>
  <script type="application/json" id="gradeConfig">${gradeConfigJson}</script>
  <script>
(function () {
  var cfg = JSON.parse(document.getElementById("gradeConfig").textContent);
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  document.getElementById("checkBtn").addEventListener("click", function () {
    each("fieldset.q", function (fs) {
      var feedback = fs.querySelector(".feedback");
      fs.classList.remove("ok", "bad");
      if (fs.getAttribute("data-kind") === "open") {
        var ta = fs.querySelector("textarea.open-answer");
        var text = ta ? ta.value.trim() : "";
        if (!text) { feedback.textContent = "Please write your answer."; feedback.hidden = false; return; }
        if (text.length < 40) { feedback.textContent = "Add a bit more detail (about two sentences)."; feedback.hidden = false; return; }
        fs.classList.add("ok");
        feedback.textContent = "Looks good to submit — final grading runs on the server.";
        feedback.hidden = false;
        return;
      }
      var cor = parseInt(fs.getAttribute("data-correct"), 10);
      var qid = fs.getAttribute("data-qid");
      var inp = fs.querySelector('input[name="q_' + qid + '"]:checked');
      if (!inp) { feedback.textContent = "Select an option."; feedback.hidden = false; return; }
      var picked = parseInt(inp.value, 10);
      if (picked === cor) { fs.classList.add("ok"); feedback.textContent = "Correct."; }
      else {
        fs.classList.add("bad");
        var right = fs.querySelector('.opt[data-idx="' + cor + '"] span');
        var expl = fs.getAttribute("data-explanation") || "";
        feedback.textContent = "Not quite. Correct: " + (right ? right.textContent : "") + (expl ? " — " + expl : "");
      }
      feedback.hidden = false;
    });
  });
  document.getElementById("revealBtn").addEventListener("click", function () {
    each("fieldset.q", function (fs) {
      if (fs.getAttribute("data-kind") === "open") return;
      var cor = parseInt(fs.getAttribute("data-correct"), 10);
      var qid = fs.getAttribute("data-qid");
      var el = fs.querySelector('input[name="q_' + qid + '"][value="' + cor + '"]');
      if (el) { el.checked = true; }
      fs.classList.remove("ok", "bad"); fs.classList.add("ok");
      var feedback = fs.querySelector(".feedback");
      feedback.textContent = "Correct option highlighted."; feedback.hidden = false;
    });
  });
  document.getElementById("submitBtn").addEventListener("click", function () {
    var answers = {};
    each("fieldset.q", function (fs) {
      var qid = fs.getAttribute("data-qid");
      if (fs.getAttribute("data-kind") === "open") {
        var ta = fs.querySelector("textarea.open-answer");
        var txt = ta && ta.value.trim();
        if (txt) { answers[qid] = txt; }
        return;
      }
      var sel = fs.querySelector('input[name="q_' + qid + '"]:checked');
      if (sel) { answers[qid] = parseInt(sel.value, 10); }
    });
    if (Object.keys(answers).length < document.querySelectorAll("fieldset.q").length) {
      document.getElementById("resultPanel").className = "on";
      document.getElementById("resultMessage").textContent = "Please answer every question first.";
      return;
    }
    var btn = document.getElementById("submitBtn");
    btn.disabled = true;
    fetch(cfg.submitPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: cfg.token, answers: answers })
    })
    .then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) {
          var m = j.message;
          var err = Array.isArray(m) ? m.join(", ") : (m || r.statusText || "Request failed");
          throw new Error(err);
        }
        return j;
      });
    })
    .then(function (d) {
      if (cfg.summaryBase) {
        try {
          var dest = new URL(cfg.summaryBase);
          dest.searchParams.set("contentVideoId", String(cfg.contentVideoId));
          dest.searchParams.set("videoName", cfg.videoName);
          dest.searchParams.set("correct", String(d.correct));
          dest.searchParams.set("total", String(d.total));
          dest.searchParams.set("percentage", String(d.percentage));
          dest.searchParams.set("cc", String(d.comprehension.correct));
          dest.searchParams.set("ct", String(d.comprehension.total));
          dest.searchParams.set("gc", String(d.grammar.correct));
          dest.searchParams.set("gt", String(d.grammar.total));
          if (d.message) { dest.searchParams.set("msg", d.message); }
          if (d.learnerCefr) { dest.searchParams.set("cefr", d.learnerCefr); }
          if (d.vocabularyTerms && d.vocabularyTerms.length) {
            dest.searchParams.set("vt", JSON.stringify(d.vocabularyTerms));
          }
          if (d.knowledgeUpdates && d.knowledgeUpdates.length) {
            dest.searchParams.set("ku", JSON.stringify(d.knowledgeUpdates));
          }
          var top = window.top;
          if (top) { top.location.assign(dest.toString()); }
          else { window.location.assign(dest.toString()); }
        } catch (e) { /* stay on page; show inline result */ }
      }
      var panel = document.getElementById("resultPanel");
      panel.className = "on";
      document.getElementById("resultScore").textContent = d.correct + " / " + d.total + " (" + d.percentage + "%)";
      document.getElementById("resultBreakdown").textContent =
        "Comprehension: " + d.comprehension.correct + "/" + d.comprehension.total +
        " — Grammar: " + d.grammar.correct + "/" + d.grammar.total +
        (d.vocabulary && typeof d.vocabulary.correct === "number" ? (" — Vocabulary: " + d.vocabulary.correct + "/" + d.vocabulary.total) : "");
      document.getElementById("resultMessage").textContent = d.message || "";
      var ul = document.getElementById("resultTopics");
      ul.innerHTML = "";
      (d.knowledgeUpdates || []).forEach(function (k) {
        var li = document.createElement("li");
        li.textContent = "Topic " + k.topicId + ": " + k.previousScore + " -> " + k.newScore;
        ul.appendChild(li);
      });
    })
    .catch(function (e) {
      var panel = document.getElementById("resultPanel");
      panel.className = "on";
      document.getElementById("resultMessage").textContent = e && e.message ? e.message : "Submit failed";
    })
    .finally(function () { btn.disabled = false; });
  });
})();
  </script>
</body>
</html>`;
}
