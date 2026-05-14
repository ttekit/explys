/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Back-end origin (e.g. `http://localhost:4200`). Defaults to `http://localhost:4200` if unset. */
  readonly VITE_API_BASE_URL?: string;
  /** Optional absolute public site URL for canonical/OG links (e.g. `https://explys.com`). */
  readonly VITE_SITE_URL?: string;
  /** Optional; set in production to match `API_TOKEN` (header `x-api-token`). */
  readonly VITE_API_TOKEN?: string;
  /** Dev: when `1` or `true`, `getApiBase()` uses `/__proxy` (see `vite.config.ts`). */
  readonly VITE_USE_API_PROXY?: string;
  /** Dev: proxy target when `VITE_USE_API_PROXY` is enabled. */
  readonly VITE_DEV_PROXY_TARGET?: string;
  /** When `1` or `true`, logs failed API requests to the console (in addition to dev server default logging). */
  readonly VITE_LOG_API_ERRORS?: string;
  /** Skip subscription gates when `true`, `1`, or `yes` (pairs with backend `SKIP_SUBSCRIPTION_ENFORCEMENT`). */
  readonly VITE_SKIP_SUBSCRIPTION_ENFORCEMENT?: string;
  /** Optional; Stripe publishable key (pk_test_… / pk_live_…). Mirrored backend: `STRIPE_PUBLISHABLE_KEY` + GET /billing/stripe-publishable-key */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
