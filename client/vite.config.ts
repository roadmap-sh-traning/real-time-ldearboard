import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  base: "/penalty/",
  build: {
    outDir: path.resolve(__dirname, "../public/penalty"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://127.0.0.1:3000",
      "/api": "http://127.0.0.1:3000",
      "/ws": {
        target: "ws://127.0.0.1:3000",
        ws: true,
      },
    },
  },
});
