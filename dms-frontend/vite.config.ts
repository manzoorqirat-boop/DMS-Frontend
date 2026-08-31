import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Matches Cors:AllowedOrigins in appsettings.Development.json out of the box. The proxy
    // is a convenience, not a requirement — VITE_API_BASE_URL in .env can point straight at
    // the API instead, and CORS is what makes that work too.
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
