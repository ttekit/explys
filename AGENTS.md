# AGENTS.md — Explys Engineering & Agent Guidelines

Guidelines for AI agents and human contributors working on the Explys codebase.

---

## 1. Branching & Git Workflow Rules (CRITICAL)

> [!IMPORTANT]
> **NEVER apply changes directly on the `product` branch (or `main`).**
> If you are currently on `product` and need to make modifications or apply fixes, you MUST create and switch to a dedicated branch before making or committing changes.

### Branching Commands
```bash
# Verify current branch
git branch --show-current

# If on product, create and switch to a new branch:
git checkout -b <type>/<short-description>

# Examples:
git checkout -b feature/video-stars-prerequisite
git checkout -b fix/auth-token-refresh
git checkout -b chore/agents-guidelines
```

- **Types**: `feature/`, `fix/`, `chore/`, `refactor/`, `perf/`.
- All changes must be reviewed and merged into `product` via Pull Requests.

---

## 2. Knowledge Graph & Token Cost Reduction (Graphify)

To drastically reduce LLM token usage and understand cross-module architecture without loading raw files into context, this repository uses a **Graphify Knowledge Graph** locally in `graphify-out/`.

> [!NOTE]
> **Developer-Local Only (`.gitignore`)**:
> `graphify-out/` is ignored by Git and should **never be committed**. Each developer or AI agent builds and updates it locally on demand. This avoids multi-megabyte git churn, merge conflicts on `graph.json`, and prompt cache bloat.

### How to Navigate the Codebase with Graphify
1. **Read `graphify-out/GRAPH_REPORT.md` first**:
   - Summarizes god nodes (most heavily connected classes/modules), community clusters, and architectural entry points.
2. **Use Graphify MCP Tools** (preferred when available):
   - `query_graph`: Natural language / keyword BFS/DFS search across symbols and relationships.
   - `get_node`: Inspect a specific function, class, or service node and its dependencies.
   - `get_neighbors`: See incoming/outgoing calls, imports, and field accesses.
   - `shortest_path`: Trace the dependency chain between two distant components.
   - `get_pr_impact`: Assess blast radius of changed files.
3. **CLI Equivalents**:
   ```bash
   graphify query "<question>"
   graphify path "<ComponentA>" "<ComponentB>"
   graphify explain "<Symbol>"
   ```
4. **Keeping the Graph Updated (Zero Token Cost)**:
   - Run `graphify update .` after code additions/refactors. This uses local AST parsing with tree-sitter — **zero API cost, zero token consumption**.
   - Git hooks in `.husky/` will also run `graphify update .` automatically on post-commit and post-checkout.

---

## 3. AI Code Review & Feedback Guidelines

When performing code reviews (via Gemini PR Reviewer or agent self-review):

- **Strict Severity Threshold**: Only comment on:
  1. **Critical functional bugs** (data loss, payment/checkout failures, state corruption).
  2. **Severe security vulnerabilities** (OWASP Top 10, auth bypass, IDOR, secret leaks).
  3. **Runtime crashes** / unhandled exceptions (>90% certainty).
- **Zero Noise**:
  - Do NOT comment on formatting, styling, variable naming, or subjective patterns.
  - Do NOT comment on edge cases if surrounding types or guards mitigate them.
  - If no severe issues are present, post NO review comments or approve with LGTM.
- **Token Optimization**:
  - Never include lockfiles (`package-lock.json`, `pnpm-lock.yaml`), `.github/workflows/**`, `graphify-out/**`, or binary/svg assets in review diffs.
  - Keep review context compact (`context-lines: 3`).

---

## 4. Subproject Architecture & Sub-Rules

This workspace is organized into three main subsystems. Always consult the respective subproject guidelines:

| Subproject | Stack | Sub-Guide | Primary Commands |
| :--- | :--- | :--- | :--- |
| **`backend/`** | NestJS 11, Prisma 7, PostgreSQL, Redis | [backend/AGENTS.md](file:///Users/ivankoltsov/Workspaces/explys/backend/AGENTS.md) | `npm run start:dev`, `npm run test:ci` |
| **`frontend/`** | React 19, Vite, TailwindCSS, TanStack Router | [frontend/AGENTS.md](file:///Users/ivankoltsov/Workspaces/explys/frontend/AGENTS.md) | `npm run dev`, `npm test`, `npm run type-check` |
| **`mobile/`** | React Native, Expo SDK 56 | [mobile/AGENTS.md](file:///Users/ivankoltsov/Workspaces/explys/mobile/AGENTS.md) | `npm run start`, `npm run type-check` |

---

## 5. Post-Fix / Post-Feature Verification Loop (MANDATORY)

> [!IMPORTANT]
> **Run Verification Loop After Every Fix or Feature Implementation.**
> Immediately after fixing a bug or implementing a feature, you MUST run the verification loop for the affected subsystems to guarantee no regressions, type errors, or broken tests exist before committing or opening a PR.

### Verification Loop Workflow:
1. **Execute Checks**: Run the corresponding validation commands for all touched subsystems:
   ```bash
   # Frontend validation (if frontend/ touched)
   cd frontend && npm run type-check && npm test && npm run seo:lint

   # Backend validation (if backend/ touched)
   cd ../backend && npm run test:ci

   # Mobile validation (if mobile/ touched)
   cd ../mobile && npm run type-check

   # Scripts / Automation validation (if scripts/ touched)
   ./backend/node_modules/.bin/tsc --project scripts/tsconfig.json --noEmit
   ```
2. **Self-Healing Loop**: If any check fails, immediately inspect compiler/test diagnostics, correct the source code, and re-run the verification loop until all tests and type checks pass with 0 errors.
3. **Knowledge Graph Sync**: Run `graphify update .` to ensure the local knowledge graph AST stays in sync with changes.

