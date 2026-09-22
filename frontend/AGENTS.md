# Frontend Engineering & Agent Guidelines

Guidelines for working in `frontend/` (React 19 + Vite + TailwindCSS 4).

---

## 1. Branching Rule Reminder
If you are on `product`, switch to a new branch before modifying frontend files:
```bash
git checkout -b <type>/<description>
```

---

## 2. Core Stack & Conventions
- **Framework**: React 19, React Router v7 (`react-router-dom`), Vite.
- **Styling**: TailwindCSS 4 (`@tailwindcss/vite`), Vanilla CSS tokens.
- **State & Analytics**: PostHog (`posthog-js`), React Hot Toast.
- **Testing**: Vitest (`vitest run`).

---

## 3. Critical Rules for PR Previews & Asset Resolution

### Base Path Handling
- PR preview deployments run under nested paths (e.g. `/explys/pr-preview/pr-<number>/`).
- **Always resolve public static assets with `import.meta.env.BASE_URL`**:
  ```tsx
  // BAD: Hardcoded root path breaks on PR preview subpaths
  <img src="/Icon.svg" alt="Explys" />

  // GOOD: Dynamically resolves to current deployment base
  <img src={`${import.meta.env.BASE_URL}Icon.svg`} alt="Explys" />
  ```

### SEO & Pre-rendering
- Keep marketing route SEO definitions in sync with `scripts/inject-marketing-seo.mjs`.
- Always run `npm run seo:lint` when modifying routes or SEO components.

---

## 4. Verification Commands
```bash
cd frontend
npm run type-check   # TypeScript check (tsc --noEmit)
npm test             # Vitest test suite
npm run seo:lint     # Verify route SEO definitions
npm run build        # Full production build + SEO injection
```
