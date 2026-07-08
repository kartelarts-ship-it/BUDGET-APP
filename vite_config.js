import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // Dossier des fichiers statiques publics
  // (manifest.json, service-worker.js, logo, icons/)
  publicDir: "public",

  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Hash pour cache-busting automatique
        entryFileNames:  "assets/[name]-[hash].js",
        chunkFileNames:  "assets/[name]-[hash].js",
        assetFileNames:  "assets/[name]-[hash].[ext]",
        // Sépare React dans son propre chunk (meilleur cache navigateur)
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },

  server: {
    port: 5173,
    // host: true → permet d'accéder depuis ton téléphone en WiFi
    // Lance avec : npm run dev
    // Puis sur ton téléphone : http://TON_IP_LOCAL:5173
    host: true,
    open: false,
  },

  preview: {
    // npm run preview → teste la PWA complète en local (SW actif)
    port: 4173,
    host: true,
  },

  // Optimisation des dépendances
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});
