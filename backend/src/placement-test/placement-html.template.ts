import { PlacementTestPayload } from "./placement-test.types";

function embedJsonInScript(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function renderPlacementHtml(
  payload: PlacementTestPayload,
  accessToken: string,
  xApiToken?: string | null,
): string {
  const payloadOut: Record<string, unknown> = { ...payload, accessToken };
  if (xApiToken) {
    payloadOut.xApiToken = xApiToken;
  }
  const dataJson = embedJsonInScript(payloadOut);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeAttr(payload.title)}</title>
  <style>
    :root {
      --bg: #0f1419;
      --panel: #1a2332;
      --text: #e7ecf3;
      --muted: #8b9cb3;
      --accent: #3d8bfd;
      --accent-2: #22c55e;
      --border: #2d3a4d;
      --err: #f87171;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.5;
    }
    .wrap {
      max-width: 640px;
      margin: 0 auto;
      padding: 1.5rem 1.25rem 3rem;
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      letter-spacing: -0.02em;
    }
    .sub {
      color: var(--muted);
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 1.5rem;
    }
    .tag {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: #243044;
      color: var(--muted);
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
    }
    .q {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.1rem 1rem;
      margin-bottom: 1rem;
    }
    .q-type {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 0.4rem;
    }
    .q-type.v { color: #a78bfa; }
    .q-prompt { margin: 0 0 0.8rem; font-size: 0.95rem; }
    label opt {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.45rem;
      cursor: pointer;
      font-size: 0.9rem;
    }
    input[type="radio"] { margin-top: 0.2rem; accent-color: var(--accent); }
    .actions { margin-top: 1.5rem; }
    button {
      width: 100%;
      border: 0;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      background: linear-gradient(180deg, #3d8bfd, #2563eb);
      color: #fff;
    }
    button:disabled { opacity: 0.55; cursor: not-allowed; }
    .msg { margin-top: 1rem; font-size: 0.9rem; min-height: 1.4rem; }
    .msg.ok { color: var(--accent-2); }
    .msg.err { color: var(--err); }
    footer { margin-top: 2rem; color: var(--muted); font-size: 0.75rem; text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Entry placement</h1>
    <p class="sub">Answer each question, then finish to return to the app. Target length: 10–15 items, grammar and vocabulary.</p>
    <div class="tags" id="tagRow"></div>
    <form id="f"></form>
    <div class="actions">
      <button type="button" id="btn">Complete entry test</button>
      <div class="msg" id="msg" aria-live="polite"></div>
    </div>
    <footer>Eng Curses · placement (one time)</footer>
  </div>
  <script>window.__PLACEMENT = ${dataJson};</script>
  <script>
  (function () {
    const d = window.__PLACEMENT;
    if (!d || !d.questions) return;
    const tagRow = document.getElementById("tagRow");
    (d.knowledgeTags || []).slice(0, 6).forEach(function (t) {
      const s = document.createElement("span");
      s.className = "tag";
      s.textContent = t;
      tagRow.appendChild(s);
    });
    const form = document.getElementById("f");
    d.questions.forEach(function (q) {
      const box = document.createElement("div");
      box.className = "q";
      box.setAttribute("data-id", q.id);
      const kind = (q.type === "vocabulary" ? "v" : "g");
      const typeEl = document.createElement("div");
      typeEl.className = "q-type " + (kind === "v" ? "v" : "");
      typeEl.textContent = q.type;
      const p = document.createElement("p");
      p.className = "q-prompt";
      p.textContent = q.prompt;
      box.appendChild(typeEl);
      box.appendChild(p);
      for (var i = 0; i < 4; i++) {
        var id = "o_" + q.id + "_" + i;
        var label = document.createElement("label");
        label.setAttribute("for", id);
        var inp = document.createElement("input");
        inp.type = "radio";
        inp.name = q.id;
        inp.value = String(i);
        inp.id = id;
        var span = document.createElement("span");
        span.textContent = q.options[i];
        label.appendChild(inp);
        label.appendChild(span);
        styleLabel(label);
        box.appendChild(label);
      }
      form.appendChild(box);
    });
    function styleLabel(l) { l.style.display = "flex"; l.style.gap = "0.5rem";
      l.style.alignItems = "flex-start"; l.style.cursor = "pointer";
      l.style.fontSize = "0.9rem"; l.style.marginBottom = "0.45rem"; }
    var btn = document.getElementById("btn");
    var msg = document.getElementById("msg");
    btn.addEventListener("click", function () {
      var answers = {};
      d.questions.forEach(function (q) {
        var r = form.elements[q.id];
        if (r && r.value !== undefined && r.value !== "") {
          answers[q.id] = parseInt(r.value, 10);
        }
      });
      btn.disabled = true;
      msg.textContent = "Saving...";
      msg.className = "msg";
      var h = { "Content-Type": "application/json" };
      if (d.xApiToken) h["x-api-token"] = d.xApiToken;
      fetch("/placement-test/complete", {
        method: "POST",
        headers: h,
        body: JSON.stringify({ access_token: d.accessToken, answers: answers })
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t || r.status); });
        return r.json();
      }).then(function () {
        msg.className = "msg ok";
        msg.textContent = "Thank you. You can close this test or return to the dashboard.";
        try { window.parent && window.parent.postMessage({ type: "placement_test_complete" }, "*"); } catch (e) {}
      }).catch(function (e) {
        msg.className = "msg err";
        msg.textContent = (e && e.message) || "Could not complete. Please try again.";
        btn.disabled = false;
      });
    });
  })();
  </script>
</body>
</html>`;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
