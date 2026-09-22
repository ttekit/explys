import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { ManifestOptions, VitePWA } from "vite-plugin-pwa";

const manifest: Partial<ManifestOptions> = {
  theme_color: "#8936FF",
  background_color: "#ffffff",
  icons: [
    {
      purpose: "maskable",
      sizes: "512x512",
      src: "icon512_maskable.png",
      type: "image/png",
    },
    {
      purpose: "any",
      sizes: "512x512",
      src: "icon512_rounded.png",
      type: "image/png",
    },
  ],
  orientation: "any",
  display: "standalone",
  dir: "ltr",
  lang: "ru",
  name: "Explys",
  start_url: "/",
  short_name: "Explys",
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useApiProxy =
    env.VITE_USE_API_PROXY === "true" || env.VITE_USE_API_PROXY === "1";
  const proxyTarget =
    env.VITE_DEV_PROXY_TARGET?.trim() || "http://localhost:4200";
  const basicUser = env.VITE_API_BASIC_AUTH_USER?.trim();
  const basicPass = env.VITE_API_BASIC_AUTH_PASSWORD ?? "";
  const proxyBasicAuthHeader = basicUser
    ? `Basic ${Buffer.from(`${basicUser}:${basicPass}`, "utf8").toString("base64")}`
    : null;
  /** `DEV_MODE` / `VITE_DEV_MODE`: `1` = relax subscription UI/gates; `0` = product-like enforcement. Default dev server `1`, production build `0`. */
  const subscriptionDevModeResolved =
    (env.DEV_MODE ?? env.VITE_DEV_MODE ?? "").trim() ||
    (mode === "development" ? "1" : "0");

  // Automatically configure base path for GitHub Actions PR Previews
  let base = "/";
  if (process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REF?.startsWith("refs/pull/")) {
    const prNumber = process.env.GITHUB_REF.split("/")[2];
    const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "explys";
    base = `/${repoName}/pr-preview/pr-${prNumber}/`;
  }

  return {
    base,
    define: {
      "import.meta.env.VITE_APP_SUBSCRIPTION_DEV_MODE": JSON.stringify(
        subscriptionDevModeResolved,
      ),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        },
        manifest: manifest,
      }),
    ],
    server: {
      proxy: useApiProxy
        ? {
            "/__proxy": {
              target: proxyTarget,
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/__proxy/, "") || "/",
              configure(proxy) {
                proxy.on("proxyReq", (proxyReq) => {
                  if (proxyBasicAuthHeader) {
                    proxyReq.setHeader("Authorization", proxyBasicAuthHeader);
                  }
                });
                proxy.on("proxyRes", (proxyRes) => {
                  if (!proxyBasicAuthHeader) {
                    return;
                  }
                  delete proxyRes.headers["www-authenticate"];
                  delete proxyRes.headers["WWW-Authenticate"];
                });
              },
            },
          }
        : undefined,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router", "react-router-dom"],
            player: ["hls.js"],
            icons: ["lucide-react"],
          },
        },
      },
    },
  };
});
