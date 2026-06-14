/* eslint-disable */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import ReactDOM from "react-dom/client"

import SidePanelPage from "../../src/pages/SidePanel"

import "../../src/style.css" // スタイルの読み込み

import { db } from "../../src/lib/db"
import {
  checkAvailableStorage,
  verifyCacheIntegrity,
  verifyOpfsIntegrity
} from "../../src/lib/storage-utils"

const queryClient = new QueryClient()

// シードデータ設定
async function seedSandboxData() {
  try {
    console.log("[Sandbox Seed] Clearing old style cards...")
    await db.styleCards.clear()
    console.log("[Sandbox Seed] Seeding mock cards into IndexedDB...")
    await db.styleCards.bulkAdd([
      {
        id: "mock-card-1",
        name: "cyberpunk style",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptSegments: [
          { type: "text", value: "neon-lit cyberpunk aesthetic" }
        ],
        parameters: { sref: ["https://midjourney.com/mock-sref"] },
        masking: { isSrefHidden: false, isPHidden: false },
        tier: "Common",
        isFavorite: false,
        isPinned: true, // HandBar に表示されるようにピン留め
        usageCount: 0,
        tags: ["style"],
        dominantColor: "#3b82f6",
        thumbnailData:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231e293b'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-size='10'>cyberpunk</text></svg>",
        frameId: "default",
        genealogy: { generation: 1, parentIds: [] }
      },
      {
        id: "mock-card-2",
        name: "anime slot template",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptSegments: [
          { type: "text", value: "retro anime style," },
          { type: "slot", label: "Subject", default: "girl" },
          { type: "text", value: "eating ramen" }
        ],
        parameters: {},
        masking: { isSrefHidden: false, isPHidden: false },
        tier: "Rare",
        isFavorite: false,
        isPinned: true,
        usageCount: 2,
        tags: ["anime"],
        dominantColor: "#ec4899",
        thumbnailData:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231e293b'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23ec4899' font-size='10'>anime</text></svg>",
        frameId: "default",
        genealogy: { generation: 1, parentIds: [] }
      }
    ])

    console.log("[Sandbox Seed] Clearing old categories...")
    await db.categories.clear()
    console.log("[Sandbox Seed] Seeding default categories...")
    const now = Date.now()
    await db.categories.bulkAdd([
      { id: "style", name: "Style", iconEmoji: "🎨", createdAt: now },
      { id: "character", name: "Character", iconEmoji: "👤", createdAt: now },
      { id: "landscape", name: "Landscape", iconEmoji: "🌲", createdAt: now },
      { id: "lighting", name: "Lighting", iconEmoji: "💡", createdAt: now },
      { id: "camera", name: "Camera", iconEmoji: "📷", createdAt: now },
      { id: "abstract", name: "Abstract", iconEmoji: "🌀", createdAt: now },
      { id: "other", name: "Other", iconEmoji: "📁", createdAt: now }
    ])

    console.log("[Sandbox Seed] Seeding finished successfully.")
  } catch (err) {
    console.error("[Sandbox Seed] Failed to seed sandbox database:", err)
  }
}

seedSandboxData()

// chrome API モックの定義
if (typeof window !== "undefined") {
  // Mock navigator.gpu for sandbox / E2E tests
  if (typeof navigator !== "undefined") {
    // If it's already set to undefined by a test script (like in troubleshooting E2E), respect it.
    // Otherwise, override requestAdapter to always return a mock adapter.
    if (navigator.gpu !== undefined) {
      try {
        const mockGpu = {
          requestAdapter: async () => ({ name: "MockGPU" })
        }
        Object.defineProperty(navigator, "gpu", {
          value: mockGpu,
          writable: true,
          configurable: true
        })
      } catch (e) {
        console.error(
          "[Sandbox GPU Mock] Failed to inject navigator.gpu mock:",
          e
        )
      }
    }
  }

  ;(window as any).db = db
  ;(window as any).verifyCacheIntegrity = verifyCacheIntegrity
  ;(window as any).verifyOpfsIntegrity = verifyOpfsIntegrity
  ;(window as any).checkAvailableStorage = checkAvailableStorage

  const existingConfig = (window as any).mockWebLlmConfig || {}
  const mockWebLlmConfig = {
    quotaSufficient:
      existingConfig.quotaSufficient !== undefined
        ? existingConfig.quotaSufficient
        : true,
    integrityPassed:
      existingConfig.integrityPassed !== undefined
        ? existingConfig.integrityPassed
        : (null as boolean | null),
    useRealIntegrity:
      existingConfig.useRealIntegrity !== undefined
        ? existingConfig.useRealIntegrity
        : typeof localStorage !== "undefined" &&
          localStorage.getItem("mock-webllm-use-real-integrity") === "true",
    downloadSpeed:
      existingConfig.downloadSpeed !== undefined
        ? existingConfig.downloadSpeed
        : 100,
    failDownload:
      existingConfig.failDownload !== undefined
        ? existingConfig.failDownload
        : false,
    downloadErrorMsg:
      existingConfig.downloadErrorMsg !== undefined
        ? existingConfig.downloadErrorMsg
        : "Failed to fetch model weights: Connection lost",
    offlineMode:
      existingConfig.offlineMode !== undefined
        ? existingConfig.offlineMode
        : false,
    onDownloadStart:
      existingConfig.onDownloadStart !== undefined
        ? existingConfig.onDownloadStart
        : (null as (() => void) | null),
    inferenceResult:
      existingConfig.inferenceResult !== undefined
        ? existingConfig.inferenceResult
        : (null as string | null),
    initDelay:
      existingConfig.initDelay !== undefined ? existingConfig.initDelay : 0
  }
  ;(window as any).mockWebLlmConfig = mockWebLlmConfig

  // Mock navigator.storage.estimate if not sufficient
  if (navigator.storage && navigator.storage.estimate) {
    const originalEstimate = navigator.storage.estimate.bind(navigator.storage)
    navigator.storage.estimate = async () => {
      if (!mockWebLlmConfig.quotaSufficient) {
        return {
          quota: 2.0 * 1024 * 1024 * 1024,
          usage: 1.8 * 1024 * 1024 * 1024
        }
      }
      return originalEstimate()
    }
  }

  const pendingRequests = new Map<string, (value: any) => void>()

  // 親ウィンドウからのレスポンスを待受
  window.addEventListener("message", (event) => {
    const data = event.data
    if (data && data.source === "chrome-api-mock-response") {
      const resolve = pendingRequests.get(data.messageId)
      if (resolve) {
        resolve(data.payload)
        pendingRequests.delete(data.messageId)
      }
    }
  })
  ;(window as any).chrome = {
    tabs: {
      query: async (queryInfo: any) => {
        let targetUrl = "https://www.midjourney.com/imagine"
        try {
          const urlParams = new URLSearchParams(window.location.search)
          const parentUrlParams = new URLSearchParams(
            window.parent.location.search
          )
          const mockUrlParam =
            urlParams.get("mockUrl") || parentUrlParams.get("mockUrl")

          if (mockUrlParam) {
            targetUrl = mockUrlParam
          } else if (
            urlParams.get("variant")?.includes("non-target") ||
            parentUrlParams.get("variant")?.includes("non-target") ||
            (window as any).__mockUrl ||
            (window.parent as any).__mockUrl
          ) {
            targetUrl =
              (window as any).__mockUrl ||
              (window.parent as any).__mockUrl ||
              "https://example.com"
          }
        } catch (e) {
          // ignore cross-origin/access errors if any
        }
        return [{ id: 1, url: targetUrl, active: true }]
      },
      sendMessage: (tabId: number, message: any) => {
        return new Promise((resolve) => {
          const messageId = Math.random().toString(36).substring(2, 15)
          pendingRequests.set(messageId, resolve)

          // 親ウィンドウへ中継を依頼
          window.parent.postMessage(
            {
              target: "content-script",
              payload: message,
              messageId
            },
            "*"
          )
        })
      },
      reload: () => {
        // 親ウィンドウに対してリロードのメッセージを送る、あるいは直接リロードさせる
        console.log("Mock chrome.tabs.reload triggered")
      }
    },
    runtime: {
      onMessage: {
        addListener: (fn: any) => {
          ;(window as any).chromeMessageListeners =
            (window as any).chromeMessageListeners || []
          ;(window as any).chromeMessageListeners.push(fn)
        },
        removeListener: (fn: any) => {
          if ((window as any).chromeMessageListeners) {
            ;(window as any).chromeMessageListeners = (
              window as any
            ).chromeMessageListeners.filter((l: any) => l !== fn)
          }
        }
      },
      connect: () => {
        return {
          onDisconnect: {
            addListener: () => {},
            removeListener: () => {}
          },
          disconnect: () => {}
        }
      },
      sendMessage: (message: any, callback: any) => {
        if (message && message.target === "offscreen") {
          if (message.action === "verify-integrity") {
            const isDownloaded =
              localStorage.getItem("mock-webllm-downloaded") === "true"
            const passed = mockWebLlmConfig.integrityPassed

            if (passed !== null) {
              setTimeout(() => {
                if (callback)
                  callback({ status: "success", integrityPassed: passed })
              }, 50)
            } else if (mockWebLlmConfig.useRealIntegrity) {
              // Execute actual integrity check
              ;(async () => {
                try {
                  const GEMMA_MODEL_FILES = [
                    {
                      name: "gemma-4-e2b-q4f16_1.bin",
                      size: 1024 * 1024 * 1024
                    }
                  ]
                  const opfsValid = await verifyOpfsIntegrity(
                    "webllm_models",
                    GEMMA_MODEL_FILES
                  )
                  const cacheExpected = GEMMA_MODEL_FILES.map((f) => ({
                    url: `https://webllm/model/${f.name}`,
                    size: f.size
                  }))
                  const cacheValid = await verifyCacheIntegrity(
                    "webllm/model_cache",
                    cacheExpected
                  )
                  const integrityPassed = opfsValid || cacheValid

                  if (callback) {
                    callback({ status: "success", integrityPassed })
                  }
                } catch (err: any) {
                  if (callback)
                    callback({ status: "error", error: err.message })
                }
              })()
            } else {
              setTimeout(() => {
                if (callback)
                  callback({ status: "success", integrityPassed: isDownloaded })
              }, 50)
            }
          } else if (message.action === "check-quota") {
            const requiredBytes =
              message.requiredBytes ?? 1.5 * 1024 * 1024 * 1024
            ;(async () => {
              try {
                // If config explicitly says not sufficient, fail immediately.
                if (!mockWebLlmConfig.quotaSufficient) {
                  if (callback)
                    callback({ status: "success", isSufficient: false })
                  return
                }
                const isSufficient = await checkAvailableStorage(requiredBytes)
                if (callback) {
                  callback({ status: "success", isSufficient })
                }
              } catch (err: any) {
                if (callback) callback({ status: "error", error: err.message })
              }
            })()
          } else if (message.action === "init-worker") {
            setTimeout(() => {
              if (callback) callback({ status: "success" })
            }, 50)
          } else if (message.action === "start-download") {
            setTimeout(() => {
              if (callback) callback({ status: "success" })

              if (mockWebLlmConfig.onDownloadStart) {
                mockWebLlmConfig.onDownloadStart()
              }

              let progress = 0
              let intervalId: any = null
              let isRetrying = false
              let retryCount = 0
              const maxRetries = 3

              const runProgressStep = () => {
                const isOffline =
                  !navigator.onLine ||
                  mockWebLlmConfig.offlineMode ||
                  mockWebLlmConfig.failDownload
                const listeners = (window as any).chromeMessageListeners || []

                if (isOffline) {
                  if (!isRetrying) {
                    isRetrying = true
                    retryCount = 0
                  }

                  if (retryCount < maxRetries) {
                    retryCount++
                    listeners.forEach((l: any) =>
                      l({
                        source: "offscreen-worker",
                        payload: {
                          status: "retrying",
                          retryCount,
                          maxRetries,
                          error:
                            "Failed to fetch model weights: Connection lost"
                        }
                      })
                    )
                  } else {
                    clearInterval(intervalId)
                    listeners.forEach((l: any) =>
                      l({
                        source: "offscreen-worker",
                        payload: {
                          status: "error",
                          error:
                            mockWebLlmConfig.downloadErrorMsg ||
                            "Failed to fetch model weights: Connection lost"
                        }
                      })
                    )
                  }
                  return
                }

                // If online
                if (isRetrying) {
                  isRetrying = false
                  retryCount = 0
                }

                progress += 25
                if (progress > 100) {
                  clearInterval(intervalId)
                  localStorage.setItem("mock-webllm-downloaded", "true")

                  // Seed actual cache on successful download finish to satisfy integrity check
                  if (mockWebLlmConfig.useRealIntegrity) {
                    ;(async () => {
                      try {
                        if (typeof caches !== "undefined") {
                          const cache = await caches.open("webllm/model_cache")
                          await cache.put(
                            "https://webllm/model/gemma-4-e2b-q4f16_1.bin",
                            new Response(new Uint8Array(1024 * 1024))
                          )
                        }
                      } catch (e) {
                        console.error("Failed to seed dummy cache file", e)
                      }
                    })()
                  }

                  listeners.forEach((l: any) =>
                    l({
                      source: "offscreen-worker",
                      payload: { status: "ready" }
                    })
                  )
                } else {
                  listeners.forEach((l: any) =>
                    l({
                      source: "offscreen-worker",
                      payload: {
                        status: "downloading",
                        progress,
                        speed: 12.5,
                        eta: Math.round((100 - progress) / 10),
                        text: `Fetching model weights: ${progress}% (dummy size info: 1.0 GB total)`
                      }
                    })
                  )
                }
              }

              intervalId = setInterval(
                runProgressStep,
                mockWebLlmConfig.downloadSpeed
              )
            }, 50)
          } else if (message.action === "preload-engine") {
            setTimeout(() => {
              if (callback) callback({ status: "success" })
              const listeners = (window as any).chromeMessageListeners || []
              listeners.forEach((l: any) =>
                l({
                  source: "offscreen-worker",
                  payload: { status: "engine-initializing" }
                })
              )
              setTimeout(() => {
                listeners.forEach((l: any) =>
                  l({
                    source: "offscreen-worker",
                    payload: { status: "engine-ready" }
                  })
                )
              }, mockWebLlmConfig.initDelay || 100)
            }, 50)
          } else if (message.action === "run-inference") {
            const systemPrompt = (message.systemPrompt || "").toLowerCase()
            const isSemanticSearch =
              systemPrompt.includes("search query parser") ||
              systemPrompt.includes("style search")

            const runActualInference = () => {
              if (isSemanticSearch) {
                const promptLower = (message.prompt || "").toLowerCase()
                let rarity = "All"
                let color = "All"
                let category = "All"
                let query = message.prompt || ""

                if (
                  promptLower.includes("legendary") ||
                  promptLower.includes("伝説")
                ) {
                  rarity = "Legendary"
                } else if (
                  promptLower.includes("rare") ||
                  promptLower.includes("レア")
                ) {
                  rarity = "Rare"
                }

                if (
                  promptLower.includes("blue") ||
                  promptLower.includes("青")
                ) {
                  color = "Blue"
                } else if (
                  promptLower.includes("red") ||
                  promptLower.includes("赤")
                ) {
                  color = "Red"
                }

                if (promptLower.includes("style")) {
                  category = "Style"
                }

                // Clean up query mock keywords
                query = query
                  .replace(
                    /legendary|伝説|rare|レア|blue|青|red|赤|style/gi,
                    ""
                  )
                  .replace(/\s+/g, " ")
                  .trim()

                if (callback) {
                  callback({
                    status: "success",
                    result: JSON.stringify({
                      rarity,
                      color,
                      category,
                      query
                    })
                  })
                }
              } else {
                const result =
                  (mockWebLlmConfig as any).inferenceResult ||
                  (() => {
                    const promptStr = message.prompt || ""
                    const parts = promptStr.split(/\s*,\s*/).filter(Boolean)
                    const resultList = parts.map(
                      (part: string, idx: number) => {
                        let cat = "other"
                        if (idx === 0) cat = "subject"
                        else if (part.includes("style")) cat = "style"
                        else if (part.includes("shot") || part.includes("lens"))
                          cat = "camera"
                        else if (
                          part.includes("lighting") ||
                          part.includes("sunlight")
                        )
                          cat = "lighting"
                        return { value: part, category: cat }
                      }
                    )
                    return JSON.stringify(resultList)
                  })()
                if (callback) callback({ status: "success", result })
              }
            }

            const initDelayVal = mockWebLlmConfig.initDelay || 0
            if (initDelayVal > 0) {
              const listeners = (window as any).chromeMessageListeners || []
              listeners.forEach((l: any) =>
                l({
                  source: "offscreen-worker",
                  payload: { status: "engine-initializing" }
                })
              )
              setTimeout(() => {
                listeners.forEach((l: any) =>
                  l({
                    source: "offscreen-worker",
                    payload: { status: "engine-ready" }
                  })
                )
                setTimeout(() => {
                  runActualInference()
                }, 50)
              }, initDelayVal)
            } else {
              setTimeout(() => {
                runActualInference()
              }, 100)
            }
          } else if (message.action === "purge-cache") {
            localStorage.removeItem("mock-webllm-downloaded")
            setTimeout(() => {
              if (callback) callback({ status: "success" })
            }, 50)
          }
        } else if (message && message.target === "background") {
          if (callback) callback({ status: "success" })
        }
      }
    },
    identity: {
      getAuthToken: (details: any, callback: any) => {
        if (callback) callback("mock-token-123")
        return Promise.resolve("mock-token-123")
      },
      removeCachedAuthToken: (details: any, callback: any) => {
        if (callback) callback()
        return Promise.resolve()
      }
    }
  }
}

const root = ReactDOM.createRoot(document.getElementById("root")!)
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <div className="dark h-screen w-screen overflow-hidden bg-slate-950 text-slate-50">
        <SidePanelPage />
      </div>
    </QueryClientProvider>
  </React.StrictMode>
)
