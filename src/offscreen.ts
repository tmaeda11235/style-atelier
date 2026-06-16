import { checkAvailableStorage, verifyOpfsIntegrity } from "./lib/storage-utils"

// LiteRT Worker instance
let litertWorker: Worker | null = null
const pendingInferences = new Map<
  string,
  { resolve: (res: any) => void; reject: (err: any) => void }
>()

const MODEL_FILENAME = "gemma-4-E2B-it-web.litertlm"

// Expected size for Gemma-2 2B is exactly 2008432640 bytes
const GEMMA_MODEL_FILES = [{ name: MODEL_FILENAME, size: 2008432640 }]

console.log("Offscreen Document loaded.")

if (process.env.PLASMO_PUBLIC_USE_LOCAL_CACHE === "true") {
  import("./mocks/browser")
    .then(({ worker }) => {
      const swUrl =
        typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
          ? chrome.runtime.getURL("assets/mockServiceWorker.js")
          : "/assets/mockServiceWorker.js"
      worker
        .start({
          serviceWorker: {
            url: swUrl
          },
          onUnhandledRequest: "bypass"
        })
        .then(() => {
          console.log(
            "[MSW] Mock Service Worker initialized successfully in offscreen document."
          )
        })
        .catch((err) => {
          console.error("[MSW] Failed to start Mock Service Worker:", err)
        })
    })
    .catch((err) => {
      console.error("[MSW] Failed to load mock worker:", err)
    })
}

// Listen for messages from background service worker or sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== "offscreen") return

  switch (message.action) {
    case "check-quota":
      handleCheckQuota(
        message.requiredBytes ?? 2.5 * 1024 * 1024 * 1024,
        sendResponse
      )
      return true // Async response

    case "verify-integrity":
      handleVerifyIntegrity(sendResponse)
      return true

    case "init-worker":
      handleInitWorker(sendResponse)
      return true

    case "start-download":
      handleStartDownload(sendResponse)
      return true

    case "purge-cache":
      handlePurgeCache(sendResponse)
      return true

    case "preload-engine":
      handlePreloadEngine(sendResponse)
      return true

    case "run-inference":
      handleRunInference(
        message.requestId ?? Math.random().toString(36).substring(7),
        message.prompt,
        message.systemPrompt,
        sendResponse
      )
      return true // Async response

    default:
      sendResponse({
        status: "error",
        error: `Unknown action: ${message.action}`
      })
  }
})

async function handleCheckQuota(
  requiredBytes: number,
  sendResponse: (res: any) => void
) {
  try {
    const isSufficient = await checkAvailableStorage(requiredBytes)
    sendResponse({ status: "success", isSufficient })
  } catch (err: any) {
    sendResponse({ status: "error", error: err.message })
  }
}

async function handleVerifyIntegrity(sendResponse: (res: any) => void) {
  try {
    // Check OPFS for the downloaded model
    const opfsValid = await verifyOpfsIntegrity(
      "litert_models",
      GEMMA_MODEL_FILES
    )

    sendResponse({
      status: "success",
      integrityPassed: opfsValid
    })
  } catch (err: any) {
    sendResponse({ status: "error", error: err.message })
  }
}

function handleInitWorker(sendResponse: (res: any) => void) {
  try {
    if (!litertWorker) {
      litertWorker = new Worker(
        new URL("./litert.worker.ts", import.meta.url),
        {
          type: "module"
        }
      )

      litertWorker.onmessage = (event) => {
        const data = event.data
        if (
          data &&
          (data.status === "inference-result" ||
            data.status === "inference-error")
        ) {
          const { requestId, result, error } = data
          const pending = pendingInferences.get(requestId)
          if (pending) {
            pendingInferences.delete(requestId)
            if (data.status === "inference-result") {
              pending.resolve(result)
            } else {
              pending.reject(error || "Inference failed")
            }
          }
        }

        // Forward message from Worker to Background / Side Panel
        chrome.runtime.sendMessage({
          source: "offscreen-worker",
          payload: event.data
        })
      }

      // Send init configuration to worker (wasm path)
      const wasmPath = chrome.runtime.getURL("assets/wasm")
      litertWorker.postMessage({
        action: "init",
        wasmPath
      })
    }
    sendResponse({ status: "success", message: "Worker initialized" })
  } catch (err: any) {
    sendResponse({ status: "error", error: err.message })
  }
}

function handleRunInference(
  requestId: string,
  prompt: string,
  systemPrompt: string | undefined,
  sendResponse: (res: any) => void
) {
  try {
    if (!litertWorker) {
      handleInitWorker(() => {})
    }

    if (litertWorker) {
      pendingInferences.set(requestId, {
        resolve: (result) => {
          sendResponse({ status: "success", result })
        },
        reject: (error) => {
          sendResponse({ status: "error", error })
        }
      })

      litertWorker.postMessage({
        action: "run-inference",
        requestId,
        prompt,
        systemPrompt
      })
    } else {
      sendResponse({ status: "error", error: "Failed to initialize worker" })
    }
  } catch (err: any) {
    sendResponse({ status: "error", error: err.message })
  }
}

function handleStartDownload(sendResponse: (res: any) => void) {
  try {
    if (!litertWorker) {
      handleInitWorker(() => {})
    }
    if (litertWorker) {
      litertWorker.postMessage({ action: "start-download" })
      sendResponse({ status: "success", message: "Download started" })
    } else {
      sendResponse({ status: "error", error: "Failed to initialize worker" })
    }
  } catch (err: any) {
    sendResponse({ status: "error", error: err.message })
  }
}

async function handlePreloadEngine(sendResponse: (res: any) => void) {
  try {
    const opfsValid = await verifyOpfsIntegrity(
      "litert_models",
      GEMMA_MODEL_FILES
    )

    if (opfsValid) {
      if (!litertWorker) {
        handleInitWorker(() => {})
      }
      if (litertWorker) {
        litertWorker.postMessage({ action: "preload" })
        sendResponse({ status: "success", message: "Preload started" })
      } else {
        sendResponse({
          status: "error",
          error: "Failed to initialize worker for preload"
        })
      }
    } else {
      sendResponse({
        status: "success",
        message: "Model not downloaded, skipping preload"
      })
    }
  } catch (err: any) {
    sendResponse({ status: "error", error: err.message })
  }
}

async function handlePurgeCache(sendResponse: (res: any) => void) {
  try {
    if (litertWorker) {
      litertWorker.postMessage({ action: "unload" })
      litertWorker.terminate()
      litertWorker = null
    }

    // Clear OPFS
    if (
      typeof navigator !== "undefined" &&
      navigator.storage &&
      navigator.storage.getDirectory
    ) {
      const root = await navigator.storage.getDirectory()
      try {
        await root.removeEntry("litert_models", { recursive: true })
      } catch {
        // Ignored if directory doesn't exist
      }
    }

    sendResponse({ status: "success" })
  } catch (err: any) {
    sendResponse({ status: "error", error: err.message })
  }
}
