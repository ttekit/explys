# Explys (`eng_curses`)

Monorepo for **Explys**: personalized English learning through curated video clips, captions, quizzes, vocabulary support, placements, Stripe subscriptions, and an admin toolkit.

---

## Repo layout

```text
eng_curses/
├── backend/                 # NestJS API, Prisma, workers/pipelines integration
│   ├── prisma/              # schema (split under schema/), migrations, seed
│   ├── src/
│   │   ├── auth/            # JWT, guards, registration
│   │   ├── billing/         # Stripe checkout + webhook
│   │   ├── content-video/    # quizzes, summaries, vocab personalization, surveys
│   │   ├── contents/        # media pipeline: captions (Deepgram/FFmpeg), tags
│   │   ├── user-vocabulary/ # learner word lists & glosses
│   │   ├── users/           # profiles, placements, learning stats
│   │   ├── admin-ish modules# topics, analytics, placements, etc.
│   │   └── generated/prisma/# Prisma client output (committed / post-generate)
│   ├── docker-compose.yml   # Postgres + Redis for local/dev
│   └── .env.example         # canonical env vars
│
├── frontend/                # SPA: React 19 + Vite + Tailwind + React Router
│   ├── src/
│   │   ├── pages/           # landing, catalog, lesson watch, profile, registration, admin
│   │   ├── components/      # catalog, content-watch, landing, SEO, …
│   │   ├── context/        # User, registration, landing locale
│   │   └── lib/             # api client, SEO, checkout helpers
│   ├── public/
│   └── wrangler.toml        # optional Cloudflare Pages deploy
│
└── README.md                # this file
```

See also `frontend/README.md` (short pointer to this doc).

---

## Tech stack

| Area | Choices |
|------|---------|
| **API** | NestJS 11, Express, Swagger |
| **Data** | PostgreSQL (Prisma 7), optional Redis in Docker |
| **Auth** | JWT, role-aware guards |
| **Payments** | Stripe (subscriptions + webhook) |
| **LLM** | Google Gemini (`GEMINI_MODEL`, `GEMINI_API_KEY`) — quizzes, grading, summaries, surveys, vocab glosses |
| **Speech** | Deepgram (captions WAV → transcript) |
| **Storage** | AWS S3 (video/assets) |
| **SPA** | React 19, Vite 7, Tailwind 4, PostHog (optional analytics) |

---

## Prerequisites

- Node.js 20+ (LTS recommended)
- `npm`, `pnpm`, or `pnpm`-compatible lockfiles exist in both apps (use one manager consistently per package).

---

## Workflows

### Backend

```bash
cd backend

# Install
npm ci   # or: npm install / pnpm install

# Env: copy example and edit secrets (JWT, DATABASE_URL / Postgres vars, Gemini, Stripe, S3…)
cp .env.example .env

# Postgres & Redis locally (fills POSTGRES_* from .env)
docker compose --env-file .env up -d

# Migrate DB & generate client (local: migrate dev applies + names migration; CI/prod often uses migrate deploy)
npx prisma migrate dev
npx prisma generate

# Optional seed
npm run seed

# Dev API (watch)
npm run dev
# Default PORT from .env, often http://localhost:4200

# Production-shaped build + start (after prisma generate / migrate on the host or CI)
npm run build && npm run start
```

**Typical `.env` items:** `DATABASE_URL` *or* `POSTGRES_*` pieces (see `src/config/database-url.ts`), `JWT_SECRET`, `GEMINI_*`, optional `GEMINI_API_URL`, Stripe keys + price IDs, `AWS_*`, `DEEPGRAM_API_KEY`. In production, `NODE_ENV=production` enables the global `API_TOKEN`; match `VITE_API_TOKEN` on the frontend.

### Frontend

```bash
cd frontend

npm ci    # or pnpm install

cp .env.example .env   # set VITE_API_BASE_URL / token if used

npm run dev            # http://localhost:5173

npm run build          # static output → dist/

npm run preview        # local preview of prod build

# Optional Cloudflare Pages
npm run pages:deploy
```

**Quality:**

```bash
npm run lint
npm run type-check
```

Wire the SPA to the API origin (`VITE_*` vars in `.env.example`).

---

## High-level learner flow

1. **Register / placement** → level and preferences stored in Prisma.
2. **Catalog** → lists `ContentVideo` entries from the API.
3. **Lesson** → video player + captions vocabulary side panel (personalization can call Gemini via backend).
4. **Post-watch** → watch completion can trigger Gemini-generated reflection questions (`post-watch-survey`).
5. **Comprehension** → quizzes are **generated on demand** via Gemini (`content-video-comprehension-tests`; transcript excerpt up to **14 000 chars** grounded in captions); open answers graded by Gemini (`content-video-open-answer-grader`; transcript excerpt up to **6 000 chars**).
6. **Summary** → short recommendations (`content-video-summary-recommendations`).
7. **Profile / billing** → stats, Stripe customer portal/checkout from `billing` module.

---

## Estimated monthly LLM token use (one user × 3 new lessons/day)

Rough **order-of-magnitude** numbers for budgeting — not a guarantee. Actual usage depends on transcript length, whether Gemini is configured (otherwise fallbacks consume **0** tokens), retries, caching changes, and which screens the learner opens.

### Assumption

One signed-in learner completes **three different videos per calendar day**, each time going through:

- video finishes → **post-watch survey** generation (Gemini),
- loads quiz → **comprehension + key vocabulary bundle** generation (heavy; grounded in transcript),
- submits quiz → **open-ended summary grading**,
- lesson summary UI → **summary recommendations**.

Optionally (+1 smaller call/day): **vocabulary personalization** (~20 lemmas) when expanding glosses.

### Typical Gemini calls per fully completed lesson (core path)

| Call | Approx. input tokens | Approx. output tokens | Notes |
|------|----------------------|-----------------------|-------|
| Post-watch survey | 700–1 200 | 350–750 | Title/description led |
| Comprehension + vocab (`generateTests`) | 8 000–14 000 | 2 000–4 000 | Largest line item; transcript slice up to ~14 k chars in prompt |
| Open summary grading | 2 000–4 000 | 450–950 | Answer + excerpt of transcript |
| Summary recommendations | 900–1 600 | 400–950 | Structured feedback |
| *Optional*: vocab personalization (≤20 words) | 1 600–3 500 | 1 300–3 000 | One batch |

**Per lesson (core, median-ish):** about **13–20 000 input** + **3.5–6 500 output** → **≈17–26 500 total tokens** (`input + output`).

**Monthly (3 lessons/day × 30 days ≈ 90 lessons):**

- Core path: **≈1.6–2.4 million total tokens/month** per user  
- Adding optional personalization on every lesson adds ~**±0.35–0.65 million**, so treat **≈2.0–3.1 million** as a stretch upper band for aggressive UI use.

**If the learner only watches without quizzes**, expect mostly small post-watch (and maybe no Gemini if keys missing) → an order of magnitude **lower**.

**Non-LLM cost:** playback itself does not consume Gemini tokens; **Deepgram/S3** relate to ingestion and CDN-style delivery, billed separately from Gemini.

---

## License / contribution

No License gfys