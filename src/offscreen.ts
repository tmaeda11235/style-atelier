import { Engine, LiteRtLm } from "@litert-lm/core"

import { checkAvailableStorage, verifyOpfsIntegrity } from "./lib/storage-utils"

// Override WASM path to load locally from the extension, preventing CSP errors from jsdelivr
LiteRtLm.DEFAULT_WASM_PATH = chrome.runtime.getURL("assets/wasm")

// LiteRT-LM instances
let litertEngine: any = null
let litertChat: any = null
const pendingInferences = new Map<
  string,
  { resolve: (res: any) => void; reject: (err: any) => void }
>()

const MODEL_URL =
  "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm"
const MODEL_FILENAME = "gemma-4-E2B-it-web.litertlm"

// Expected size for Gemma-4 E2B is exactly 2008432640 bytes
const GEMMA_MODEL_FILES = [{ name: MODEL_FILENAME, size: 2008432640 }]

console.log("Offscreen Document loaded for LiteRT-LM.")

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

    case "init-worker": // Kept the same action name for compatibility
      handleInitEngine(sendResponse)
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

async function handleInitEngine(sendResponse: (res: any) => void) {
  try {
    if (!litertEngine) {
      console.log("Initializing LiteRT-LM Engine...")

      const root = await navigator.storage.getDirectory()
      const opfsDir = await root.getDirectoryHandle("litert_models", {
        create: true
      })

      let fileHandle
      try {
        fileHandle = await opfsDir.getFileHandle(MODEL_FILENAME)
      } catch {
        console.log("Model file not found. Skipping engine initialization.")
        sendResponse({ status: "success", message: "Skipped (no file)" })
        return
      }

      const file = await fileHandle.getFile()

      if (file.size !== 2008432640) {
        console.log(
          "Model file is incomplete or corrupted. Skipping engine initialization.",
          file.size
        )
        sendResponse({
          status: "success",
          message: "Skipped (incomplete file)"
        })
        return
      }

      const localUrl = URL.createObjectURL(file)

      litertEngine = await Engine.create({
        model: localUrl,
        mainExecutorSettings: {
          maxNumTokens: 8192
        }
      })

      console.log("LiteRT-LM Engine loaded. Creating Conversation...")

      // Initialize a reusable chat conversation
      litertChat = await litertEngine.createConversation()
      console.log("LiteRT-LM Engine completely initialized.")
    }
    sendResponse({ status: "success", message: "Engine initialized" })
  } catch (err: any) {
    console.error("Failed to initialize engine:", err.name, err.message, err)
    sendResponse({ status: "error", error: `${err.name}: ${err.message}` })
  }
}

async function handleRunInference(
  requestId: string,
  prompt: string,
  systemPrompt: string | undefined,
  sendResponse: (res: any) => void
) {
  try {
    if (!litertEngine || !litertChat) {
      // Re-initialize if not ready
      await new Promise((resolve, reject) => {
        handleInitEngine((res) => {
          if (res.status === "error") reject(new Error(res.error))
          else resolve(true)
        })
      })
    }

    if (litertChat) {
      pendingInferences.set(requestId, {
        resolve: (result) => {
          sendResponse({ status: "success", result })
        },
        reject: (error) => {
          sendResponse({ status: "error", error })
        }
      })

      try {
        const fullPrompt = systemPrompt
          ? `${systemPrompt}\n\n${prompt}`
          : prompt
        const chat = await litertEngine.createConversation()
        const response = await chat.sendMessage({
          role: "user",
          content: fullPrompt
        })
        const result = response.content[0].text

        const pending = pendingInferences.get(requestId)
        if (pending) {
          pendingInferences.delete(requestId)
          pending.resolve(result)
        }
      } catch (err: any) {
        console.error("Inference Error:", err)
        const pending = pendingInferences.get(requestId)
        if (pending) {
          pendingInferences.delete(requestId)
          pending.reject(err.message || String(err))
        }
      }
    } else {
      sendResponse({ status: "error", error: "Failed to initialize engine" })
    }
  } catch (err: any) {
    sendResponse({ status: "error", error: err.message })
  }
}

let isDownloading = false

async function handleStartDownload(sendResponse: (res: any) => void) {
  if (isDownloading) {
    console.log("Download already in progress.")
    sendResponse({ status: "success", message: "Already downloading" })
    return
  }

  try {
    isDownloading = true
    const root = await navigator.storage.getDirectory()
    const opfsDir = await root.getDirectoryHandle("litert_models", {
      create: true
    })

    // Check if file already exists and has correct size
    try {
      const fileHandle = await opfsDir.getFileHandle(MODEL_FILENAME)
      const file = await fileHandle.getFile()
      if (file.size === 2008432640) {
        console.log("Model already downloaded in OPFS")
        chrome.runtime.sendMessage({
          source: "offscreen-worker",
          payload: { status: "ready" }
        })
        sendResponse({
          status: "success",
          message: "Download skipped (cached)"
        })
        return
      }
    } catch {
      // file not found, proceed to download
    }

    await doModelDownload(opfsDir)
    sendResponse({ status: "success", message: "Download finished" })
  } catch (err: any) {
    chrome.runtime.sendMessage({
      source: "offscreen-worker",
      payload: { status: "error", error: err.message }
    })
    sendResponse({ status: "error", error: err.message })
  } finally {
    isDownloading = false
  }
}

async function doModelDownload(opfsDir: FileSystemDirectoryHandle) {
  console.log("Starting OPFS streaming download...")
  const response = await fetch(MODEL_URL)
  if (!response.ok || !response.body)
    throw new Error("Network response was not ok")

  const contentLength = response.headers.get("Content-Length")
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 2147483648

  let receivedBytes = 0
  const reader = response.body.getReader()
  const fileHandle = await opfsDir.getFileHandle(MODEL_FILENAME, {
    create: true
  })
  const writable = await fileHandle.createWritable()

  const startTime = Date.now()
  let lastProgress = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    await writable.write(value)
    receivedBytes += value.length

    const progress = Math.min(
      99,
      Math.round((receivedBytes / totalBytes) * 100)
    )
    if (progress > lastProgress) {
      lastProgress = progress
      const elapsedMs = Date.now() - startTime
      const speed = Number(
        (receivedBytes / (elapsedMs / 1000) / (1024 * 1024)).toFixed(1)
      )
      const eta = Math.max(
        0,
        Math.round(
          (elapsedMs / (receivedBytes / totalBytes) - elapsedMs) / 1000
        )
      )
      chrome.runtime.sendMessage({
        source: "offscreen-worker",
        payload: { status: "downloading", progress, speed, eta }
      })
    }
  }

  await writable.close()
  chrome.runtime.sendMessage({
    source: "offscreen-worker",
    payload: { status: "ready" }
  })
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
        await root.removeEntry("litert_models", { recursive: true })
      } catch {
        // Ignored if directory doesn't exist
      }
    }

    if (litertEngine) {
      litertEngine = null
      litertChat = null
    }

    sendResponse({ status: "success" })
  } catch (err: any) {
    sendResponse({ status: "error", error: err.message })
  }
}
