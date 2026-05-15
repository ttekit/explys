import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
  return {
    define: {
      "import.meta.env.VITE_APP_SUBSCRIPTION_DEV_MODE": JSON.stringify(
        subscriptionDevModeResolved,
      ),
    },
    plugins: [react(), tailwindcss()],
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
  };
});
