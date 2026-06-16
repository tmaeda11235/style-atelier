import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic"
    }),
    tsconfigPaths()
  ],
  base: "/style-atelier/",
  root: path.resolve(__dirname, "src/mobile-app"),
  build: {
    outDir: path.resolve(__dirname, "dist-mobile"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/mobile-app/index.html")
      }
    }
  },
  resolve: {
    alias: [
      {
        find: /^url:(.*)$/,
        replacement: "$1"
      }
    ]
  }
})
