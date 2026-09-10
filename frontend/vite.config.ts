import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // `output/` guarda capturas y artefactos de QA que se reescriben en lote
      // mientras el dev server corre. Vigilarlos no aporta nada y sí rompe: un
      // archivo bloqueado por otro proceso tumba el watcher con EBUSY y se cae
      // el servidor entero.
      ignored: ["**/output/**"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // `three` (Audio Orb) es, por lejos, la dependencia más pesada del bundle;
        // aislarla en su propio chunk evita que infle el chunk principal o cualquier
        // otro chunk lazy que la importe transitivamente. `react-vendor` agrupa el
        // núcleo de React/routing/data-fetching, estable entre builds (mejor cache).
        manualChunks: {
          three: ["three"],
          "react-vendor": ["react", "react-dom", "react-router", "@tanstack/react-query"],
        },
      },
    },
  },
});
