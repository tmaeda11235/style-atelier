import {
  checkAvailableStorage,
  verifyCacheIntegrity,
  verifyOpfsIntegrity
} from "./lib/storage-utils"

// WebLLM Worker instance
let webLlmWorker: Worker | null = null
const pendingInferences = new Map<
  string,
  { resolve: (res: any) => void; reject: (err: any) => void }
>()

// Expected models and sizes for Gemma-4 E2B
const GEMMA_MODEL_FILES = [
  { name: "gemma-4-e2b-q4f16_1.bin", size: 1024 * 1024 * 1024 } // Example ~1GB file
]

console.log("Offscreen Document loaded.")

// Listen for messages from background service worker or sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== "offscreen") return

  switch (message.action) {
    case "check-quota":
      handleCheckQuota(
        message.requiredBytes ?? 1.5 * 1024 * 1024 * 1024,
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

    case "run-inference":
      handleRunInference(
        message.requestId ?? Math.random().toString(36).substring(7),
        message.prompt,
        message.systemPrompt,
        message.temperature,
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
    // Check both Cache API and OPFS (we support both)
    const opfsValid = await verifyOpfsIntegrity(
      "webllm_models",
      GEMMA_MODEL_FILES
    )
    // Cache storage verify (example cache name 'webllm/model_cache')
    const cacheExpected = GEMMA_MODEL_FILES.map((f) => ({
      url: `https://webllm/model/${f.name}`,
      size: f.size
    }))
    const cacheValid = await verifyCacheIntegrity(
      "webllm/model_cache",
      cacheExpected
    )

    sendResponse({
      status: "success",
      integrityPassed: opfsValid || cacheValid
    })
  } catch (err: any) {
    sendResponse({ status: "error", error: err.message })
  }
}

function handleInitWorker(sendResponse: (res: any) => void) {
  try {
    if (!webLlmWorker) {
      // In Plasmo, workers can be initialized using new URL with import.meta.url
      webLlmWorker = new Worker(
        new URL("./webllm.worker.ts", import.meta.url),
        {
          type: "module"
        }
      )

      webLlmWorker.onmessage = (event) => {
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
  temperature: number | undefined,
  sendResponse: (res: any) => void
) {
  try {
    if (!webLlmWorker) {
      handleInitWorker(() => {})
    }

    if (webLlmWorker) {
      pendingInferences.set(requestId, {
        resolve: (result) => {
          sendResponse({ status: "success", result })
        },
        reject: (error) => {
          sendResponse({ status: "error", error })
        }
      })

      webLlmWorker.postMessage({
        action: "run-inference",
        requestId,
        prompt,
        systemPrompt,
        temperature
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
    if (!webLlmWorker) {
      handleInitWorker(() => {})
    }
    if (webLlmWorker) {
      webLlmWorker.postMessage({ action: "start-download" })
      sendResponse({ status: "success", message: "Download started" })
    } else {
      sendResponse({ status: "error", error: "Failed to initialize worker" })
    }
  } catch (err: any) {
    sendResponse({ status: "error", error: err.message })
  }
}

async function handlePurgeCache(sendResponse: (res: any) => void) {
  try {
    // 1. Clear OPFS
    if (
      typeof navigator !== "undefined" &&
      navigator.storage &&
      navigator.storage.getDirectory
    ) {
      const root = await navigator.storage.getDirectory()
      try {
        await root.removeEntry("webllm_models", { recursive: true })
      } catch {
        // Ignored if directory doesn't exist
      }
    }
    // 2. Clear Cache Storage
    if (typeof caches !== "undefined") {
      await caches.delete("webllm/model_cache")
    }
    sendResponse({ status: "success" })
  } catch (err: any) {
    sendResponse({ status: "error", error: err.message })
  }
}
