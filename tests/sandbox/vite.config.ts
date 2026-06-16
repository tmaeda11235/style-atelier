import fs from "fs"
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [
    react({
      // React 17+ の新しいJSXトランスフォーム (React is not defined を防ぐ) を適用
      jsxRuntime: "automatic"
    }),
    tsconfigPaths(),
    {
      name: "serve-fixtures-static",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (
            req.url &&
            req.url.includes("/tests/fixtures/") &&
            req.url.endsWith(".css")
          ) {
            const urlPath = req.url.split("?")[0]
            const filePath = path.join(__dirname, "../..", urlPath)
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "text/css")
              res.end(fs.readFileSync(filePath))
              return
            }
          }
          if (
            req.url &&
            req.url.includes("/assets/") &&
            !req.url.includes("?import") &&
            !req.url.includes("&import")
          ) {
            const urlPath = req.url.split("?")[0]
            const filePath = path.join(__dirname, "../..", urlPath)
            if (fs.existsSync(filePath)) {
              if (urlPath.endsWith(".wasm")) {
                res.setHeader("Content-Type", "application/wasm")
                res.setHeader("Cross-Origin-Opener-Policy", "same-origin")
                res.setHeader("Cross-Origin-Embedder-Policy", "require-corp")
                res.end(fs.readFileSync(filePath))
                return
              } else if (urlPath.endsWith(".js")) {
                res.setHeader("Content-Type", "application/javascript")
                res.setHeader("Cross-Origin-Opener-Policy", "same-origin")
                res.setHeader("Cross-Origin-Embedder-Policy", "require-corp")
                res.end(fs.readFileSync(filePath))
                return
              }
            }
          }
          next()
        })
      }
    }
  ],
  resolve: {
    alias: [
      {
        find: /^url:(.*)$/,
        replacement: "$1"
      }
    ]
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: [
        "**/tests/screenshots/**",
        "**/tests/e2e/**",
        "**/build/**",
        "**/.git/**",
        "**/node_modules/**"
      ]
    }
  }
})
