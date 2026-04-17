import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { 
    port: 3000, 
    host: "0.0.0.0",
    proxy: {
      "/api/framegen": {
        target: "http://localhost:3002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/framegen/, "/api")
      },
      "/videos": {
        target: "http://localhost:3002",
        changeOrigin: true
      },
      "/photo-repo": {
        target: "http://localhost:3002",
        changeOrigin: true
      },
      "/refs": {
        target: "http://localhost:3002",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "/tmp/mothership-dist",
    emptyOutDir: true,
  },
});
