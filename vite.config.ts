import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const pathText = String(env.FRONT_PATH ?? "").replace(/^\/+|\/+$/g, "");
  const basePath = pathText ? `/${pathText}` : "";

  return {
    base: `${basePath}/`,
    envPrefix: ["DEPLOY_", "FRONT_", "API_"],
    plugins: [react()],
  };
});
