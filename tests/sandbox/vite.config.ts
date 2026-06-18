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
          const pwaFiles = [
            "/manifest.json",
            "/icon-192.png",
            "/icon-512.png",
            "/sw.js"
          ]
          const isRootPath =
            req.url &&
            (req.url === "/" ||
              req.url.startsWith("/?") ||
              req.url === "/index.html" ||
              req.url.startsWith("/index.html?"))
          const isMobilePath = req.url && req.url.startsWith("/mobile/")
          const isPwaFile =
            req.url &&
            (pwaFiles.some((f) => req.url.startsWith(f)) || isRootPath)
          if (isMobilePath || isPwaFile) {
            const urlPath = isMobilePath
              ? req.url.slice("/mobile/".length).split("?")[0]
              : isRootPath
                ? "index.html"
                : req.url.slice(1).split("?")[0]

            // Try serving from dist-web (built PWA assets) first if it exists
            const distFilePath = path.join(
              __dirname,
              "../../dist-web",
              urlPath || "index.html"
            )
            if (
              fs.existsSync(distFilePath) &&
              fs.statSync(distFilePath).isFile()
            ) {
              const ext = path.extname(distFilePath)
              let contentType = "application/octet-stream"
              if (ext === ".html") contentType = "text/html"
              else if (ext === ".js") contentType = "application/javascript"
              else if (ext === ".css") contentType = "text/css"
              else if (ext === ".json") contentType = "application/json"
              else if (ext === ".png") contentType = "image/png"
              res.setHeader("Content-Type", contentType)
              res.end(fs.readFileSync(distFilePath))
              return
            }

            if (urlPath === "index.html") {
              req.url =
                "/src/web-app/index.html" +
                (req.url.includes("?")
                  ? req.url.slice(req.url.indexOf("?"))
                  : "")
              next()
              return
            }

            const filePath = path.join(
              __dirname,
              "../../src/web-app/public",
              urlPath
            )
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const ext = path.extname(filePath)
              let contentType = "application/octet-stream"
              if (ext === ".json") contentType = "application/json"
              else if (ext === ".png") contentType = "image/png"
              res.setHeader("Content-Type", contentType)
              res.end(fs.readFileSync(filePath))
              return
            }
          }
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
            let urlPath = req.url.split("?")[0]
            if (urlPath.startsWith("/mobile/assets/")) {
              urlPath = urlPath.slice("/mobile".length)
            }

            // Try serving from dist-web first if it exists
            const distFilePath = path.join(__dirname, "../../dist-web", urlPath)
            if (
              fs.existsSync(distFilePath) &&
              fs.statSync(distFilePath).isFile()
            ) {
              const ext = path.extname(distFilePath)
              let contentType = "application/octet-stream"
              if (ext === ".html") contentType = "text/html"
              else if (ext === ".js") contentType = "application/javascript"
              else if (ext === ".css") contentType = "text/css"
              else if (ext === ".json") contentType = "application/json"
              else if (ext === ".png") contentType = "image/png"
              else if (ext === ".wasm") contentType = "application/wasm"

              if (
                contentType === "application/wasm" ||
                contentType === "application/javascript"
              ) {
                res.setHeader("Cross-Origin-Opener-Policy", "same-origin")
                res.setHeader("Cross-Origin-Embedder-Policy", "require-corp")
              }
              res.setHeader("Content-Type", contentType)
              res.end(fs.readFileSync(distFilePath))
              return
            }

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
                if (urlPath.includes("mockServiceWorker.js")) {
                  res.setHeader("Service-Worker-Allowed", "/")
                }
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
