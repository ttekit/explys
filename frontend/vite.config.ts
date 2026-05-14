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
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: useApiProxy
        ? {
            "/__proxy": {
              target: proxyTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/__proxy/, "") || "/",
            },
          }
        : undefined,
    },
  };
});
