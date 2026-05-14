import { PlacementTestPayload } from "./placement-test.types";
import { PLACEMENT_IFRAME_SCRIPT } from "./placement-iframe-inline.script";

function embedJsonInScript(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
    .replace(/<!--/g, "\\u003c!--");
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Inline SVG mascot (thinking mood), colors match ui-example / frontend theme */
const MASCOT_SVG_HEADER = `
<svg class="hdr-mascot" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse cx="100" cy="120" rx="55" ry="45" fill="var(--accent)"/>
  <circle cx="75" cy="115" r="8" fill="var(--accent-dim)"/>
  <circle cx="95" cy="130" r="6" fill="var(--accent-dim)"/>
  <circle cx="120" cy="110" r="10" fill="var(--accent-dim)"/>
  <path d="M155 130 Q180 130 185 155 Q190 180 165 185 Q145 188 145 170" stroke="var(--accent)" stroke-width="12" stroke-linecap="round"/>
  <ellipse cx="130" cy="155" rx="12" ry="8" fill="var(--accent)"/>
  <rect x="125" y="155" width="10" height="20" rx="5" fill="var(--accent)"/>
  <ellipse cx="70" cy="155" rx="12" ry="8" fill="var(--accent)"/>
  <rect x="65" y="155" width="10" height="20" rx="5" fill="var(--accent)"/>
  <ellipse cx="65" cy="85" rx="40" ry="35" fill="var(--accent)"/>
  <path d="M40 60 Q50 40 65 55 Q80 40 90 60" stroke="var(--primary)" stroke-width="8" stroke-linecap="round"/>
  <circle cx="55" cy="80" r="18" fill="var(--deep)"/>
  <circle cx="55" cy="80" r="14" fill="var(--foreground)"/>
  <circle cx="52" cy="77" r="5" fill="var(--deep)"/>
  <path d="M40 65 L70 70" stroke="var(--primary)" stroke-width="3" stroke-linecap="round"/>
  <path d="M30 95 Q40 105 55 100" stroke="var(--primary-soft)" stroke-width="3" stroke-linecap="round"/>
</svg>`.trim();

const MASCOT_SVG_RESULT = `
<svg class="res-mascot" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse cx="100" cy="120" rx="55" ry="45" fill="var(--accent)"/>
  <circle cx="75" cy="115" r="8" fill="var(--accent-dim)"/>
  <circle cx="120" cy="110" r="10" fill="var(--accent-dim)"/>
  <path d="M155 130 Q180 130 185 155 Q190 180 165 185 Q145 188 145 170" stroke="var(--accent)" stroke-width="12" stroke-linecap="round"/>
  <ellipse cx="130" cy="155" rx="12" ry="8" fill="var(--accent)"/>
  <rect x="125" y="155" width="10" height="20" rx="5" fill="var(--accent)"/>
  <ellipse cx="70" cy="155" rx="12" ry="8" fill="var(--accent)"/>
  <rect x="65" y="155" width="10" height="20" rx="5" fill="var(--accent)"/>
  <ellipse cx="65" cy="85" rx="40" ry="35" fill="var(--accent)"/>
  <path d="M40 60 Q50 40 65 55 Q80 40 90 60" stroke="var(--primary)" stroke-width="8" stroke-linecap="round"/>
  <circle cx="55" cy="80" r="18" fill="var(--deep)"/>
  <circle cx="55" cy="80" r="14" fill="var(--foreground)"/>
  <circle cx="52" cy="77" r="5" fill="var(--deep)"/>
  <path d="M38 65 Q55 55 72 65" stroke="var(--primary)" stroke-width="3" stroke-linecap="round"/>
  <circle cx="95" cy="50" r="3" fill="var(--primary)"/>
  <circle cx="30" cy="55" r="2" fill="var(--primary)"/>
  <path d="M30 95 Q40 105 55 100" stroke="var(--primary-soft)" stroke-width="3" stroke-linecap="round"/>
  <path d="M32 98 Q20 110 25 120" stroke="var(--danger)" stroke-width="4" stroke-linecap="round"/>
</svg>`.trim();

export function renderPlacementHtml(
  payload: PlacementTestPayload,
  accessToken: string,
  xApiToken?: string | null,
  apiPublicOrigin = "",
): string {
  const payloadOut: Record<string, unknown> = { ...payload, accessToken };
  if (xApiToken) {
    payloadOut.xApiToken = xApiToken;
  }
  const dataJson = embedJsonInScript(payloadOut);
  const dataJsonHtml = escapeAttr(dataJson);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="explys-placement-api-origin" content="${escapeAttr(apiPublicOrigin)}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeAttr(payload.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --background: oklch(0.12 0.02 285);
      --foreground: oklch(0.98 0 0);
      --card: oklch(0.18 0.03 285);
      --muted-fg: oklch(0.7 0.02 285);
      --primary: oklch(0.65 0.25 295);
      --primary-fg: oklch(1 0 0);
      --accent: oklch(0.75 0.18 145);
      --accent-dim: color-mix(in oklch, var(--accent) 60%, transparent);
      --border: oklch(0.28 0.04 285);
      --ring: oklch(0.65 0.25 295);
      --muted: oklch(0.22 0.03 285);
      --danger: oklch(0.577 0.245 27.325);
      --deep: oklch(0.12 0.02 285);
      --primary-soft: color-mix(in oklch, var(--primary) 70%, transparent);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      background: var(--background);
      color: var(--foreground);
      min-height: 100vh;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .font-display { font-family: "Space Grotesk", Inter, system-ui, sans-serif; }
    /* Quiz shell (ui-example /test layout) */
    /* ui-example app/test/header: Exit left · brand · step counter */
    #view-quiz {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .hdr-mascot {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.35));
    }
    .res-mascot { width: 120px; height: 120px; margin: 0 auto; display: block; filter: drop-shadow(0 10px 24px rgba(0,0,0,0.4)); animation: mascotFloat 4s ease-in-out infinite; }
    @keyframes mascotFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    .top-bar {
      flex-shrink: 0;
      border-bottom: 1px solid var(--border);
      background: var(--background);
    }
    .top-inner {
      max-width: 56rem;
      margin: 0 auto;
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .hdr-exit {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      margin: 0;
      padding: 0;
      border: none;
      background: none;
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--muted-fg);
      cursor: pointer;
      transition: color 0.15s ease;
      white-space: nowrap;
    }
    .hdr-exit:hover {
      color: var(--foreground);
    }
    .hdr-exit svg {
      flex-shrink: 0;
      opacity: 0.9;
    }
    .hdr-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }
    .brand-name {
      font-weight: 700;
      font-family: "Space Grotesk", Inter, sans-serif;
      font-size: 1.125rem;
      letter-spacing: -0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--foreground);
    }
    .step-count {
      font-size: 0.875rem;
      color: var(--muted-fg);
      flex-shrink: 0;
      min-width: 4rem;
      text-align: right;
    }
    .progress-wrap {
      flex-shrink: 0;
      max-width: 56rem;
      margin: 0 auto;
      width: 100%;
      padding: 1.5rem 1rem 0;
    }
    .progress-track {
      height: 0.5rem;
      width: 100%;
      border-radius: 9999px;
      background: var(--muted);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 9999px;
      background: var(--primary);
      width: 0%;
      transition: width 280ms ease;
    }
    .tags-hint {
      max-width: 56rem;
      margin: 0 auto;
      padding: 0.65rem 1rem 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .tag {
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted-fg);
      background: var(--card);
      border: 1px solid var(--border);
      padding: 0.15rem 0.55rem;
      border-radius: 9999px;
    }
    main.quiz-main {
      flex: 1 1 auto;
      max-width: 42rem;
      margin: 0 auto;
      width: 100%;
      padding: 1.5rem 1rem 2rem;
    }
    .placement-load-error {
      margin: 0 0 1.25rem;
      padding: 1rem 1.15rem;
      border-radius: 0.75rem;
      border: 1px solid color-mix(in oklch, var(--danger) 45%, var(--border));
      background: color-mix(in oklch, var(--danger) 12%, var(--card));
      color: var(--foreground);
      font-size: 0.9375rem;
      line-height: 1.5;
    }
    .placement-load-error[hidden] { display: none !important; }
    /* JSON blob: textarea avoids attribute-size / encoding issues vs data-payload */
    textarea#placement-data {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .q-type-pill {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--primary);
      margin-bottom: 0.75rem;
    }
    .q-type-pill.vocab { color: color-mix(in oklch, var(--accent) 90%, white); }
    .q-prompt {
      margin: 0 0 1.35rem;
      font-size: 1.2rem;
      font-weight: 600;
      line-height: 1.45;
    }
    @media (min-width: 640px) {
      .q-prompt { font-size: 1.375rem; }
    }
    .opts { display: flex; flex-direction: column; gap: 0.75rem; }
    .opt {
      width: 100%;
      margin: 0;
      padding: 1rem 1rem;
      border-radius: 0.75rem;
      border: 2px solid var(--border);
      background: var(--card);
      color: var(--muted-fg);
      cursor: pointer;
      text-align: left;
      font-family: inherit;
      font-size: 1rem;
      transition: border-color 0.15s, background 0.15s, color 0.15s;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .opt:hover {
      border-color: color-mix(in oklch, var(--primary) 45%, transparent);
      color: var(--foreground);
    }
    .opt[aria-checked="true"] {
      border-color: var(--primary);
      background: color-mix(in oklch, var(--primary) 10%, transparent);
      color: var(--foreground);
    }
    .opt-letter {
      width: 2rem;
      height: 2rem;
      border-radius: 9999px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 600;
      background: var(--muted);
      color: var(--muted-fg);
      transition: background 0.15s, color 0.15s;
    }
    .opt[aria-checked="true"] .opt-letter {
      background: var(--primary);
      color: var(--primary-fg);
    }
    .opt-text { flex: 1; min-width: 0; padding-top: 2px; }
    .nav-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 2rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-family: inherit;
      font-size: 0.9375rem;
      font-weight: 600;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      cursor: pointer;
      border: 1px solid transparent;
      transition: opacity 0.15s, background 0.15s;
    }
    .btn:disabled { opacity: 0.48; cursor: not-allowed; }
    .btn-outline {
      background: transparent;
      border-color: var(--border);
      color: var(--foreground);
    }
    .btn-outline:hover:not(:disabled) {
      background: color-mix(in oklch, var(--foreground) 6%, transparent);
    }
    .btn-primary {
      background: var(--primary);
      color: var(--primary-fg);
    }
    .btn-primary:hover:not(:disabled) {
      background: color-mix(in oklch, var(--primary) 90%, black);
    }
    /* Result screen (ui-example TestResult) */
    #view-result {
      display: none;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    #view-result.is-on { display: flex; }
    .result-inner {
      max-width: 28rem;
      width: 100%;
      text-align: center;
    }
    .glow {
      position: relative;
      margin-bottom: 1.75rem;
    }
    .glow-blob {
      position: absolute;
      inset: 0;
      margin: auto;
      width: 140px;
      height: 140px;
      border-radius: 9999px;
      background: color-mix(in oklch, var(--primary) 22%, transparent);
      filter: blur(28px);
    }
    .res-title {
      font-family: "Space Grotesk", Inter, sans-serif;
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0 0 0.35rem;
    }
    .res-sub {
      color: var(--muted-fg);
      margin-bottom: 1.65rem;
    }
    .score-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1.35rem;
      margin-bottom: 1.65rem;
    }
    .score-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      margin-bottom: 0.85rem;
    }
    .score-big {
      font-size: 2.75rem;
      font-weight: 700;
      color: var(--primary);
      line-height: 1;
    }
    .score-pct { color: var(--muted-fg); margin-bottom: 0.5rem; font-size: 0.9375rem; }
    .res-msg {
      color: var(--muted-fg);
      font-size: 0.9rem;
      margin-bottom: 1.65rem;
      line-height: 1.55;
    }
    .summary-card {
      background: color-mix(in oklch, var(--card) 92%, var(--primary) 8%);
      border: 1px solid color-mix(in oklch, var(--primary) 18%, var(--border));
      border-radius: 1rem;
      padding: 1.15rem 1.25rem;
      margin-bottom: 1.35rem;
      text-align: left;
    }
    .summary-card h3 {
      font-family: "Space Grotesk", Inter, sans-serif;
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      color: var(--foreground);
    }
    .summary-card p {
      margin: 0 0 0.65rem;
      font-size: 0.9rem;
      line-height: 1.5;
      color: var(--foreground);
    }
    .summary-card p:last-child { margin-bottom: 0; }
    .summary-muted {
      font-size: 0.85rem !important;
      color: var(--muted-fg) !important;
    }
    .btn-block { width: 100%; justify-content: center; padding: 1.1rem 1.25rem; font-size: 1rem; border-radius: 0.65rem; }
    /* ui-example Footer: card strip + meta row */
    .quiz-footer {
      flex-shrink: 0;
      margin-top: auto;
      border-top: 1px solid var(--border);
      background: var(--card);
    }
    .quiz-footer-inner {
      max-width: 80rem;
      margin: 0 auto;
      padding: 2rem 1rem 2.5rem;
    }
    .quiz-footer-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .quiz-footer-logo {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      opacity: 0.95;
    }
    .quiz-footer-title {
      font-family: "Space Grotesk", Inter, sans-serif;
      font-weight: 700;
      font-size: 1.0625rem;
      color: var(--foreground);
    }
    .quiz-footer-tagline {
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--muted-fg);
      max-width: 28rem;
      margin-bottom: 1rem;
    }
    .quiz-footer-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      font-size: 0.875rem;
      color: var(--muted-fg);
    }
    .quiz-footer-hint {
      font-size: 0.75rem;
      color: color-mix(in oklch, var(--muted-fg) 85%, transparent);
    }
    #view-result .msg-foot { margin-top: 1rem; min-height: 1.4rem; font-size: 0.875rem; }
    #view-result .msg-foot.ok { color: color-mix(in oklch, var(--accent) 95%, black); }
    #view-result .msg-foot.err { color: var(--danger); }
    #view-quiz.is-off { display: none; }
  </style>
</head>
<body>
  <div id="view-quiz">
    <header class="top-bar">
      <div class="top-inner">
        <button type="button" class="hdr-exit" id="btnExit" aria-label="Exit placement test">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span>Exit Test</span>
        </button>
        <div class="hdr-brand">
          ${MASCOT_SVG_HEADER}
          <span class="brand-name">Explys</span>
        </div>
        <span class="step-count" id="stepLabel">— / —</span>
      </div>
    </header>
    <div class="progress-wrap">
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="progress-fill" id="progressFill"></div>
      </div>
    </div>
    <div class="tags-hint" id="tagRow" aria-label="Practice focus tags"></div>
    <main class="quiz-main" aria-live="polite">
      <div class="placement-load-error" id="placementLoadError" hidden role="alert"></div>
      <div class="q-type-pill" id="qKind"></div>
      <h2 class="q-prompt font-display" id="qText"></h2>
      <div class="opts" id="opts" role="radiogroup" aria-labelledby="qText"></div>
      <div class="nav-row">
        <button type="button" class="btn btn-outline" id="btnPrev">Previous</button>
        <button type="button" class="btn btn-primary" id="btnNext">Next</button>
      </div>
    </main>
    <footer class="quiz-footer">
      <div class="quiz-footer-inner">
        <div class="quiz-footer-brand">
          ${MASCOT_SVG_HEADER.replace("hdr-mascot", "quiz-footer-logo")}
          <span class="quiz-footer-title">Explys</span>
        </div>
        <p class="quiz-footer-tagline">
          Personalized English learning through adaptive video content — learn at your own pace.
        </p>
        <div class="quiz-footer-meta">
          <span class="quiz-footer-hint">One-time placement — answers personalize your catalogue.</span>
          <span>© 2026 Explys</span>
        </div>
      </div>
    </footer>
  </div>

  <section id="view-result" aria-hidden="true">
    <div class="result-inner">
      <div class="glow">
        <div class="glow-blob" aria-hidden="true"></div>
        <div style="position:relative">${MASCOT_SVG_RESULT}</div>
      </div>
      <h1 class="res-title font-display">Test complete!</h1>
      <p class="res-sub">Great job — here&apos;s how you did.</p>
      <div class="score-card">
        <div class="score-row">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
          <span style="font-weight:600;color:var(--foreground)">Your score</span>
        </div>
        <div class="score-big" id="scoreFract">0/0</div>
        <div class="score-pct" id="scorePct"></div>
      </div>
      <div class="summary-card" id="summaryCard" hidden>
        <h3>What you practiced</h3>
        <p id="summaryVocab"></p>
        <p id="summaryGrammar"></p>
        <p class="summary-muted" id="summaryHint"></p>
      </div>
      <p class="res-msg" id="lvlMsg"></p>
      <button type="button" class="btn btn-primary btn-block" id="btnContinue">
        Start learning →
      </button>
      <div class="msg-foot" id="finishMsg" role="status" aria-live="polite"></div>
    </div>
  </section>

  <!-- Payload only in textarea (entities escape <script>-breaking sequences in JSON). No <template> + raw JSON (can confuse HTML tokenizer vs following <script>). -->
  <textarea id="placement-data" class="placement-data-blob" readonly aria-hidden="true">${dataJsonHtml}</textarea>
  <script>
${PLACEMENT_IFRAME_SCRIPT}
  </script>
</body>
</html>`;
}
