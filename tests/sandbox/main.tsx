/* eslint-disable */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import ReactDOM from "react-dom/client"

import SidePanelPage from "../../src/pages/SidePanel"

import "../../src/style.css" // スタイルの読み込み

import { db } from "../../src/lib/db"
import {
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
  ;(window as any).db = db
  ;(window as any).verifyCacheIntegrity = verifyCacheIntegrity
  ;(window as any).verifyOpfsIntegrity = verifyOpfsIntegrity

  const mockWebLlmConfig = {
    quotaSufficient: true,
    integrityPassed: null as boolean | null,
    downloadSpeed: 100,
    failDownload: false,
    downloadErrorMsg: "Network connection lost",
    offlineMode: false,
    onDownloadStart: null as (() => void) | null,
    inferenceResult: null as string | null
  }
  ;(window as any).mockWebLlmConfig = mockWebLlmConfig

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
        // 常にアクティブなMidjourneyタブが存在するようにエミュレート
        return [
          { id: 1, url: "https://www.midjourney.com/imagine", active: true }
        ]
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
            const passed =
              mockWebLlmConfig.integrityPassed !== null
                ? mockWebLlmConfig.integrityPassed
                : isDownloaded
            setTimeout(() => {
              if (callback)
                callback({ status: "success", integrityPassed: passed })
            }, 50)
          } else if (message.action === "check-quota") {
            setTimeout(() => {
              if (callback)
                callback({
                  status: "success",
                  isSufficient: mockWebLlmConfig.quotaSufficient
                })
            }, 50)
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

              if (mockWebLlmConfig.failDownload) {
                let currentRetry = 0
                const maxRetries = 3
                const runRetryStep = () => {
                  const listeners = (window as any).chromeMessageListeners || []
                  if (currentRetry < maxRetries) {
                    currentRetry++
                    listeners.forEach((l: any) =>
                      l({
                        source: "offscreen-worker",
                        payload: {
                          status: "retrying",
                          retryCount: currentRetry,
                          maxRetries,
                          error: `Connection lost. Retrying (${currentRetry}/${maxRetries})...`
                        }
                      })
                    )
                    setTimeout(runRetryStep, 1000)
                  } else {
                    listeners.forEach((l: any) =>
                      l({
                        source: "offscreen-worker",
                        payload: {
                          status: "error",
                          error: mockWebLlmConfig.downloadErrorMsg
                        }
                      })
                    )
                  }
                }
                setTimeout(runRetryStep, 200)
                return
              }

              let progress = 0
              let intervalId: any = null

              const runProgressStep = () => {
                if (mockWebLlmConfig.offlineMode) {
                  const listeners = (window as any).chromeMessageListeners || []
                  listeners.forEach((l: any) =>
                    l({
                      source: "offscreen-worker",
                      payload: {
                        status: "error",
                        error: "Network connection offline"
                      }
                    })
                  )
                  return
                }

                progress += 25
                const listeners = (window as any).chromeMessageListeners || []
                if (progress > 100) {
                  clearInterval(intervalId)
                  localStorage.setItem("mock-webllm-downloaded", "true")
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
                        eta: Math.round((100 - progress) / 10)
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
          } else if (message.action === "run-inference") {
            const systemPrompt = (message.systemPrompt || "").toLowerCase()
            const isSemanticSearch =
              systemPrompt.includes("search query parser") ||
              systemPrompt.includes("style search")

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

              if (promptLower.includes("blue") || promptLower.includes("青")) {
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
                .replace(/legendary|伝説|rare|レア|blue|青|red|赤|style/gi, "")
                .replace(/\s+/g, " ")
                .trim()

              setTimeout(() => {
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
              }, 100)
            } else {
              const result =
                (mockWebLlmConfig as any).inferenceResult ||
                (() => {
                  const promptStr = message.prompt || ""
                  const parts = promptStr.split(/\s*,\s*/).filter(Boolean)
                  const resultList = parts.map((part: string, idx: number) => {
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
                  })
                  return JSON.stringify(resultList)
                })()
              setTimeout(() => {
                if (callback) callback({ status: "success", result })
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
