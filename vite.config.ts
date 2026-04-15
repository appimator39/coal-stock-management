import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: {
        enabled: false,
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        id: "/",
        name: "Coal Tracker Pro",
        short_name: "CoalTracker",
        description: "Coal consumption and production tracking system for industrial facilities",
        theme_color: "#0F172A",
        background_color: "#0F172A",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "any",
        scope: "/",
        start_url: "/?source=pwa",
        categories: ["business", "productivity", "utilities"],
        shortcuts: [
          {
            name: "Daily Log",
            short_name: "Daily Log",
            description: "Log today's coal consumption",
            url: "/daily-log",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Balance Report",
            short_name: "Balance",
            description: "View inventory balance",
            url: "/balance",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Purchase Orders",
            short_name: "Orders",
            description: "Manage purchase orders",
            url: "/purchase-orders",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
