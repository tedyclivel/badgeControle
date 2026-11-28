import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Passage",
        short_name: "Passage",
        lang: "fr",
        theme_color: "#171D27",
        background_color: "#F0F2F5",
        display: "standalone",
        icons: [
          {
            src: "/passage.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,svg}"],
        navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//, /^\/functions\//],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok-free.dev", ".ngrok.app", ".ngrok.io"],
    proxy: {
      "/auth": "http://127.0.0.1:55321",
      "/rest": "http://127.0.0.1:55321",
      "/functions": "http://127.0.0.1:55321",
      "/storage": "http://127.0.0.1:55321",
      "/realtime": { target: "ws://127.0.0.1:55321", ws: true },
    },
  },
});
