/* eslint-disable */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import ReactDOM from "react-dom/client"

import SidePanelPage from "../../src/pages/SidePanel"

import "../../src/style.css" // スタイルの読み込み

import { OnboardingGuide } from "../../src/components/organisms/OnboardingGuide"
import { LanguageProvider } from "../../src/contexts/LanguageContext"
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

const urlParams = new URLSearchParams(
  typeof window !== "undefined" ? window.location.search : ""
)
if (urlParams.get("noseed") !== "true") {
  seedSandboxData()
}

let updateProfilingCallback: ((data: any) => void) | null = null
let actualWorker: Worker | null = null

if (typeof window !== "undefined") {
  // Mock navigator.gpu for sandbox / E2E tests
  if (typeof navigator !== "undefined") {
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

  ;(window as any).queryClient = queryClient
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
      existingConfig.initDelay !== undefined ? existingConfig.initDelay : 0,
    supportWebGpu:
      existingConfig.supportWebGpu !== undefined
        ? existingConfig.supportWebGpu
        : true
  }
  ;(window as any).mockWebLlmConfig = mockWebLlmConfig

  // Mock navigator.storage.estimate if mock quota is configured
  if (navigator.storage && navigator.storage.estimate) {
    const originalEstimate = navigator.storage.estimate.bind(navigator.storage)
    navigator.storage.estimate = async () => {
      const isRealMode =
        localStorage.getItem("sandbox-use-real-worker") === "true"
      if (!isRealMode && !mockWebLlmConfig.quotaSufficient) {
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

  const inferenceStartTimes = new Map<string, number>()
  const pendingCallbacks = new Map<string, (res: any) => void>()

  async function updateOpfsMetrics() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate()
        updateProfilingCallback?.({
          opfsUsage: estimate.usage || 0,
          opfsQuota: estimate.quota || 0
        })
      } catch (e) {
        console.error("Failed to estimate storage", e)
      }
    }
  }

  function recordingInferenceStart(requestId: string, prompt: string) {
    inferenceStartTimes.set(requestId, performance.now())
    updateProfilingCallback?.({
      lastPrompt: prompt,
      lastResponse: "Generating..."
    })
  }

  ;(window as any).chrome = {
    tabs: {
      query: async (queryInfo: any) => {
        const urlParams = new URLSearchParams(window.location.search)
        const mockUrl =
          (window as any).__mockUrl ||
          (window.parent && (window.parent as any).__mockUrl) ||
          urlParams.get("mockUrl") ||
          "https://www.midjourney.com/imagine"
        return [{ id: 1, url: mockUrl, active: true }]
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
        console.log("Mock chrome.tabs.reload triggered")
      }
    },
    runtime: {
      id: "mock-extension-id",
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
        const isRealMode =
          localStorage.getItem("sandbox-use-real-worker") === "true"

        if (message && message.target === "offscreen") {
          // --- REAL WORKER MODE ---
          if (isRealMode) {
            if (message.action === "verify-integrity") {
              ;(async () => {
                try {
                  const GEMMA_MODEL_FILES = [
                    {
                      name: "gemma-4-E2B-it-web.litertlm",
                      size: 2008432640
                    }
                  ]
                  const opfsValid = await verifyOpfsIntegrity(
                    "litert_models",
                    GEMMA_MODEL_FILES
                  )
                  if (callback) {
                    callback({ status: "success", integrityPassed: opfsValid })
                  }
                  updateProfilingCallback?.({
                    workerStatus: opfsValid ? "ready" : "idle"
                  })
                  updateOpfsMetrics()
                } catch (err: any) {
                  if (callback)
                    callback({ status: "error", error: err.message })
                }
              })()
            } else if (message.action === "check-quota") {
              const requiredBytes =
                message.requiredBytes ?? 2.5 * 1024 * 1024 * 1024
              ;(async () => {
                try {
                  const isSufficient =
                    await checkAvailableStorage(requiredBytes)
                  if (callback) {
                    callback({ status: "success", isSufficient })
                  }
                  updateOpfsMetrics()
                } catch (err: any) {
                  if (callback)
                    callback({ status: "error", error: err.message })
                }
              })()
            } else if (message.action === "init-worker") {
              try {
                if (!actualWorker) {
                  updateProfilingCallback?.({ workerStatus: "initializing" })

                  actualWorker = new Worker(
                    new URL("../../src/litert.worker.ts", import.meta.url),
                    {
                      type: "module"
                    }
                  )

                  actualWorker.onmessage = (event) => {
                    const data = event.data
                    const listeners =
                      (window as any).chromeMessageListeners || []
                    listeners.forEach((l: any) =>
                      l({
                        source: "offscreen-worker",
                        payload: data
                      })
                    )

                    if (data.status === "downloading") {
                      updateProfilingCallback?.({
                        workerStatus: "downloading",
                        downloadProgress: data.progress,
                        downloadSpeed: data.speed,
                        downloadEta: data.eta,
                        downloadText: data.text
                      })
                      updateOpfsMetrics()
                    } else if (data.status === "ready") {
                      updateProfilingCallback?.({
                        workerStatus: "ready",
                        downloadProgress: 100,
                        downloadText: "Model downloaded successfully."
                      })
                      updateOpfsMetrics()
                    } else if (data.status === "engine-initializing") {
                      updateProfilingCallback?.({
                        workerStatus: "engine-initializing",
                        downloadText: data.text || "Loading engine...",
                        vramModel: 1.87
                      })
                    } else if (data.status === "engine-ready") {
                      updateProfilingCallback?.({
                        workerStatus: "engine-ready",
                        vramModel: 1.87,
                        vramCache: 1.05,
                        vramTotal: 1.87 + 1.05
                      })
                    } else if (data.status === "inference-result") {
                      const { requestId, result } = data
                      const startTime = inferenceStartTimes.get(requestId)
                      if (startTime) {
                        const latency = performance.now() - startTime
                        const charCount = result.length
                        const estimatedTokens = Math.max(
                          1,
                          Math.round(charCount / 3.5)
                        )
                        const tokensPerSec = estimatedTokens / (latency / 1000)

                        updateProfilingCallback?.({
                          inferenceLatency: latency,
                          tokensPerSec: tokensPerSec,
                          lastResponse: result
                        })
                        inferenceStartTimes.delete(requestId)
                      }

                      const cb = pendingCallbacks.get(requestId)
                      if (cb) {
                        cb({ status: "success", result })
                        pendingCallbacks.delete(requestId)
                      }
                    } else if (data.status === "inference-error") {
                      const { requestId, error } = data
                      const cb = pendingCallbacks.get(requestId)
                      if (cb) {
                        cb({ status: "error", error })
                        pendingCallbacks.delete(requestId)
                      }
                      updateProfilingCallback?.({
                        workerStatus: "error",
                        errorMsg: error
                      })
                    } else if (data.status === "error") {
                      updateProfilingCallback?.({
                        workerStatus: "error",
                        errorMsg: data.error
                      })
                    } else if (data.status === "idle") {
                      updateProfilingCallback?.({
                        workerStatus: "idle",
                        vramModel: 0,
                        vramCache: 0,
                        vramTotal: 0
                      })
                    }
                  }

                  actualWorker.postMessage({
                    action: "init",
                    wasmPath: "/assets/wasm"
                  })
                }
                if (callback) callback({ status: "success" })
              } catch (err: any) {
                if (callback) callback({ status: "error", error: err.message })
              }
            } else if (message.action === "start-download") {
              if (!actualWorker) {
                ;(window as any).chrome.runtime.sendMessage({
                  target: "offscreen",
                  action: "init-worker"
                })
              }
              setTimeout(() => {
                if (actualWorker) {
                  actualWorker.postMessage({ action: "start-download" })
                  if (callback) callback({ status: "success" })
                }
              }, 100)
            } else if (message.action === "preload-engine") {
              if (!actualWorker) {
                ;(window as any).chrome.runtime.sendMessage({
                  target: "offscreen",
                  action: "init-worker"
                })
              }
              setTimeout(() => {
                if (actualWorker) {
                  actualWorker.postMessage({ action: "preload" })
                  if (callback) callback({ status: "success" })
                }
              }, 100)
            } else if (message.action === "run-inference") {
              if (!actualWorker) {
                ;(window as any).chrome.runtime.sendMessage({
                  target: "offscreen",
                  action: "init-worker"
                })
              }
              const requestId =
                message.requestId ?? Math.random().toString(36).substring(7)

              setTimeout(() => {
                if (actualWorker) {
                  recordingInferenceStart(requestId, message.prompt)
                  pendingCallbacks.set(requestId, callback)
                  actualWorker.postMessage({
                    action: "run-inference",
                    requestId,
                    prompt: message.prompt,
                    systemPrompt: message.systemPrompt
                  })
                } else {
                  if (callback)
                    callback({
                      status: "error",
                      error: "Worker not initialized"
                    })
                }
              }, 100)
            } else if (message.action === "purge-cache") {
              if (actualWorker) {
                actualWorker.postMessage({ action: "unload" })
                actualWorker.terminate()
                actualWorker = null
              }
              updateProfilingCallback?.({
                workerStatus: "idle",
                vramModel: 0,
                vramCache: 0,
                vramTotal: 0
              })
              ;(async () => {
                try {
                  if (
                    typeof navigator !== "undefined" &&
                    navigator.storage &&
                    navigator.storage.getDirectory
                  ) {
                    const root = await navigator.storage.getDirectory()
                    try {
                      await root.removeEntry("litert_models", {
                        recursive: true
                      })
                    } catch {
                      // Ignored
                    }
                  }
                  updateOpfsMetrics()
                  if (callback) callback({ status: "success" })
                } catch (err: any) {
                  if (callback)
                    callback({ status: "error", error: err.message })
                }
              })()
            }
          }
          // --- MOCK MODE (For E2E Tests) ---
          else {
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
                ;(async () => {
                  try {
                    const GEMMA_MODEL_FILES = [
                      {
                        name: "gemma-4-E2B-it-web.litertlm",
                        size: 2008432640
                      }
                    ]
                    const opfsValid = await verifyOpfsIntegrity(
                      "litert_models",
                      GEMMA_MODEL_FILES
                    )
                    if (callback) {
                      callback({
                        status: "success",
                        integrityPassed: opfsValid
                      })
                    }
                  } catch (err: any) {
                    if (callback)
                      callback({ status: "error", error: err.message })
                  }
                })()
              } else {
                setTimeout(() => {
                  if (callback)
                    callback({
                      status: "success",
                      integrityPassed: isDownloaded
                    })
                }, 50)
              }
            } else if (message.action === "check-quota") {
              const requiredBytes =
                message.requiredBytes ?? 2.5 * 1024 * 1024 * 1024
              ;(async () => {
                try {
                  if (!mockWebLlmConfig.quotaSufficient) {
                    if (callback)
                      callback({ status: "success", isSufficient: false })
                    return
                  }
                  const isSufficient =
                    await checkAvailableStorage(requiredBytes)
                  if (callback) {
                    callback({ status: "success", isSufficient })
                  }
                } catch (err: any) {
                  if (callback)
                    callback({ status: "error", error: err.message })
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

                  if (isRetrying) {
                    isRetrying = false
                    retryCount = 0
                  }

                  progress += 25
                  if (progress > 100) {
                    clearInterval(intervalId)
                    localStorage.setItem("mock-webllm-downloaded", "true")

                    if (mockWebLlmConfig.useRealIntegrity) {
                      ;(async () => {
                        try {
                          if (
                            navigator.storage &&
                            navigator.storage.getDirectory
                          ) {
                            const root = await navigator.storage.getDirectory()
                            const dirHandle = await root.getDirectoryHandle(
                              "litert_models",
                              {
                                create: true
                              }
                            )
                            const fileHandle = await dirHandle.getFileHandle(
                              "gemma-4-E2B-it-web.litertlm",
                              { create: true }
                            )
                            const writable = await fileHandle.createWritable()
                            const dummyContent = new Uint8Array(2008432640)
                            await writable.write(dummyContent)
                            await writable.close()
                          }
                        } catch (e) {
                          console.error("Failed to seed dummy OPFS file", e)
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
                          text: `Fetching model weights: ${progress}% (dummy size info: 2.0 GB total)`
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
                systemPrompt.includes("style search") ||
                systemPrompt.includes("解析器") ||
                systemPrompt.includes("スタイル検索")

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

                  if (
                    promptLower.includes("style") ||
                    promptLower.includes("スタイル") ||
                    promptLower.includes("風")
                  ) {
                    category = "Style"
                  }

                  query = query
                    .replace(
                      /legendary|伝説|rare|レア|blue|青|red|赤|style|スタイル|風|の/gi,
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
                          else if (
                            part.includes("shot") ||
                            part.includes("lens")
                          )
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

function SandboxWrapper() {
  const [isOnboardingOpen, setIsOnboardingOpen] = React.useState(false)
  const [useRealWorker, setUseRealWorker] = React.useState(() => {
    return localStorage.getItem("sandbox-use-real-worker") === "true"
  })
  const [windowWidth, setWindowWidth] = React.useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  )

  React.useEffect(() => {
    const handleResize = () => {
      console.log(
        `[Sandbox Dashboard] Resizing layout, clientWidth: ${window.innerWidth}`
      )
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const isWide = windowWidth >= 1024
  const isNarrow = !isWide

  const [profiling, setProfiling] = React.useState<any>({
    workerStatus: "uninitialized",
    downloadProgress: 0,
    downloadSpeed: 0,
    downloadEta: 0,
    downloadText: "Worker not started",
    opfsUsage: 0,
    opfsQuota: 0,
    inferenceLatency: 0,
    tokensPerSec: 0,
    vramModel: 0,
    vramCache: 0,
    vramTotal: 0,
    lastPrompt: "",
    lastResponse: "",
    errorMsg: null
  })

  React.useEffect(() => {
    updateProfilingCallback = (newData) => {
      setProfiling((prev: any) => ({ ...prev, ...newData }))
    }

    // 初期 OPFS メトリクス
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        setProfiling((prev: any) => ({
          ...prev,
          opfsUsage: estimate.usage || 0,
          opfsQuota: estimate.quota || 0
        }))
      })
    }

    if (useRealWorker) {
      // 実際の状態取得を試みる
      setProfiling((prev: any) => ({
        ...prev,
        workerStatus: "idle"
      }))
    } else {
      setProfiling((prev: any) => ({
        ...prev,
        workerStatus: "mock-active",
        downloadText: "Mock system active for E2E validation."
      }))
    }

    return () => {
      updateProfilingCallback = null
    }
  }, [useRealWorker])

  const handleToggleMode = (mode: boolean) => {
    localStorage.setItem("sandbox-use-real-worker", mode ? "true" : "false")
    setUseRealWorker(mode)
    if (!mode && actualWorker) {
      actualWorker.postMessage({ action: "unload" })
      actualWorker.terminate()
      actualWorker = null
    }
    window.location.reload()
  }

  // バイト数を読みやすい単位に変換するヘルパー
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="dark h-screen w-screen overflow-hidden bg-slate-950 text-slate-50 flex relative">
      {/* 左半分: プロファイリング＆デバッグダッシュボード */}
      {isWide && (
        <div className="flex-1 h-full p-6 overflow-y-auto border-r border-slate-800/80 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
              <div>
                <h1 className="text-xl font-bold text-indigo-400 flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-950 rounded-lg text-indigo-400 border border-indigo-900">
                    ⚡
                  </span>
                  LiteRT-LM Developer Profiler
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Real-time WebGPU & OPFS inference analysis harness.
                </p>
              </div>

              {/* モード切り替えトグルスイッチ */}
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800/80 rounded-xl p-1.5">
                <button
                  onClick={() => handleToggleMode(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    !useRealWorker
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}>
                  Mock Mode
                </button>
                <button
                  onClick={() => handleToggleMode(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    useRealWorker
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}>
                  Real WebGPU
                </button>
              </div>
            </div>

            {/* VRAM & Memory Panel */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 flex flex-col justify-between">
                <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <span>📟</span> VRAM Allocation
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-slate-100">
                    {useRealWorker
                      ? `${profiling.vramTotal.toFixed(2)} GB`
                      : "N/A (Mock)"}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {useRealWorker
                      ? `Model: ${profiling.vramModel.toFixed(2)}G | Cache: ${profiling.vramCache.toFixed(2)}G`
                      : "Mock mode runs lightweight"}
                  </div>
                </div>
                <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{
                      width: useRealWorker
                        ? `${Math.min(100, (profiling.vramTotal / 8) * 100)}%`
                        : "0%"
                    }}
                  />
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 flex flex-col justify-between">
                <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <span>💾</span> OPFS Storage Usage
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-slate-100">
                    {formatBytes(profiling.opfsUsage)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Quota: {formatBytes(profiling.opfsQuota)}
                  </div>
                </div>
                <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-sky-500 h-full transition-all duration-300"
                    style={{
                      width: `${profiling.opfsQuota ? (profiling.opfsUsage / profiling.opfsQuota) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 flex flex-col justify-between">
                <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <span>⏱️</span> Inference Latency
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-slate-100">
                    {profiling.inferenceLatency > 0
                      ? `${(profiling.inferenceLatency / 1000).toFixed(2)}s`
                      : "0.00s"}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Speed: {profiling.tokensPerSec.toFixed(1)} tokens/s
                  </div>
                </div>
                <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (profiling.tokensPerSec / 50) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Model Downloading Metrics */}
            {profiling.workerStatus === "downloading" && (
              <div className="bg-slate-900/80 border border-amber-900/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5 animate-pulse">
                    <span>📥</span> Downloading Model Weights...
                  </span>
                  <span className="text-slate-400">
                    {profiling.downloadProgress}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full transition-all duration-200"
                    style={{ width: `${profiling.downloadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Speed: {profiling.downloadSpeed} MB/s</span>
                  <span>ETA: {profiling.downloadEta}s</span>
                </div>
              </div>
            )}

            {/* Last Inference Request / Output Logs */}
            <div className="bg-slate-900/20 border border-slate-800/50 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <span>💻</span> Real-time Console Inference Log
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-indigo-400 font-bold block mb-1">
                    PROMPT
                  </span>
                  <div className="bg-slate-950 border border-slate-900 rounded-lg p-2.5 text-xs text-slate-355 font-mono min-h-[40px] whitespace-pre-wrap">
                    {profiling.lastPrompt || "(No query executed yet)"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold block mb-1">
                    RESPONSE
                  </span>
                  <div className="bg-slate-950 border border-slate-900 rounded-lg p-2.5 text-xs text-emerald-350 font-mono min-h-[80px] max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                    {profiling.lastResponse || "(Waiting for prompt...)"}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message Panel */}
            {profiling.errorMsg && (
              <div className="bg-rose-955/40 border border-rose-900/50 rounded-xl p-4 text-xs text-rose-300">
                <strong className="block text-rose-400 font-bold mb-1">
                  ⚠️ Error Encountered:
                </strong>
                {profiling.errorMsg}
              </div>
            )}
          </div>

          {/* Onboarding Trigger Button & Footer */}
          <div className="border-t border-slate-900 pt-4 mt-6 flex items-center justify-between">
            <button
              id="test-open-onboarding-btn"
              onClick={() => {
                console.log(
                  "[Sandbox] Clicked Open Onboarding Button, setting state to true"
                )
                setIsOnboardingOpen(true)
              }}
              className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-bold transition-all shadow-md shadow-indigo-950/30">
              💡 Open Onboarding Guide
            </button>
            <span className="text-[10px] text-slate-600">
              Style Atelier Test Suite v0.2.0
            </span>
          </div>
        </div>
      )}

      <div
        style={{ width: isWide ? "380px" : "100%" }}
        className="h-full shadow-2xl flex-shrink-0">
        <SidePanelPage />
      </div>

      {isNarrow &&
        !(typeof navigator !== "undefined" && navigator.webdriver) && (
          <button
            id="test-open-onboarding-btn"
            onClick={() => setIsOnboardingOpen(true)}
            className="absolute bottom-4 left-4 z-[9999] px-2 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 rounded text-white font-bold opacity-20 hover:opacity-100 transition-opacity shadow-md">
            💡 Open Onboarding Guide
          </button>
        )}

      <OnboardingGuide
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById("root")!)
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SandboxWrapper />
      </LanguageProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
