import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react({
      // React 17+ の新しいJSXトランスフォーム (React is not defined を防ぐ) を適用
      jsxRuntime: "automatic",
    }),
    tsconfigPaths(),
  ],
  server: {
    port: 5173,
  },
});
