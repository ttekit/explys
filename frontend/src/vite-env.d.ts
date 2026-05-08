/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Back-end origin (e.g. `http://localhost:4200`). Defaults to `http://localhost:4200` if unset. */
  readonly VITE_API_BASE_URL?: string;
  /** Optional absolute public site URL for canonical/OG links (e.g. `https://explys.com`). */
  readonly VITE_SITE_URL?: string;
  /** Optional; set in production to match `API_TOKEN` (header `x-api-token`). */
  readonly VITE_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
