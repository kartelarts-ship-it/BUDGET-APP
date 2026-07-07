import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Assure que le service worker et le manifest
  // sont servis depuis la racine correctement
  publicDir: "public",

  build: {
    // Dossier de sortie (défaut Vite)
    outDir: "dist",

    // Génère les source maps pour le debug en prod
    sourcemap: false,

    // Minification optimisée
    minify: "esbuild",

    // Seuil d'alerte si un chunk dépasse 500kb
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        // Nom de fichiers avec hash pour le cache busting
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },

  server: {
    // Port local en développement
    port: 5173,
    // Permet l'accès depuis le réseau local (pour tester sur téléphone)
    host: true,
    // Ouvre automatiquement le navigateur
    open: false,
  },

  preview: {
    // Port pour `vite preview` (après build)
    port: 4173,
    host: true,
  },
});
