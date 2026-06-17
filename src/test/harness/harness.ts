import { Engine, LiteRtLm } from "@litert-lm/core"

import { checkWebGpuSupport } from "../../lib/gpu-utils"
import {
  downloadFileWithResume,
  getStorageEstimate
} from "../../lib/storage-utils"
import { initHarnessCache, mockState, setupMockListeners } from "./mockSetup"

// State variables
let engine: Engine | null = null

const MODEL_FILENAME = "gemma-4-E2B-it-web.litertlm"
const MODEL_URL =
  "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm"
const EXPECTED_SIZE = 2008432640

// Elements
const webgpuStatus = document.getElementById("webgpu-status")!
const opfsCapacity = document.getElementById("opfs-capacity")!
const btnDownload = document.getElementById("btn-download") as HTMLButtonElement
const btnPurge = document.getElementById("btn-purge") as HTMLButtonElement
const btnRun = document.getElementById("btn-run") as HTMLButtonElement
const progressContainer = document.getElementById("progress-container")!
const progressBar = document.getElementById("progress-bar")!
const statusMessage = document.getElementById("status-message")!
const systemPromptInput = document.getElementById(
  "system-prompt"
) as HTMLInputElement
const userPromptInput = document.getElementById(
  "user-prompt"
) as HTMLTextAreaElement
const engineStatusText = document.getElementById("engine-status-text")!
const outputArea = document.getElementById("output")!
const toast = document.getElementById("toast")!
const mswStatus = document.getElementById("msw-status-badge")!

function log(msg: string, isError = false) {
  const timestamp = new Date().toLocaleTimeString()
  const color = isError ? "var(--danger)" : "var(--text-main)"
  outputArea.innerHTML += `\n<span style="color: ${color}">[${timestamp}] ${msg}</span>`
  outputArea.scrollTop = outputArea.scrollHeight
}

function showToast(message: string) {
  toast.textContent = message
  toast.classList.add("show")
  setTimeout(() => toast.classList.remove("show"), 3000)
}

// 1. WebGPU Check
async function updateWebGpuStatus() {
  const supported = mockState.webGpuUnsupported
    ? false
    : await checkWebGpuSupport()

  if (supported) {
    webgpuStatus.textContent = "Supported"
    webgpuStatus.className = "status-badge supported"
  } else {
    webgpuStatus.textContent = "Not Supported"
    webgpuStatus.className = "status-badge unsupported"
  }
}

// 2. OPFS Capacity Check
async function updateStorageEstimate() {
  if (mockState.quotaExceeded) {
    opfsCapacity.textContent = "0 Bytes / 100 GB (0%)"
    return
  }
  const estimate = await getStorageEstimate()
  if (estimate) {
    opfsCapacity.textContent = `${estimate.usageFormatted} / ${estimate.quotaFormatted} (${estimate.percentage}%)`
  } else {
    opfsCapacity.textContent = "OPFS Not Supported"
  }
}

// 3. Download Model with Mocking
btnDownload.addEventListener("click", async () => {
  if (mockState.quotaExceeded) {
    log("Simulating QuotaExceededError...", true)
    statusMessage.textContent = "Error: QuotaExceededError"
    showToast("Storage quota exceeded!")
    return
  }

  btnDownload.disabled = true
  progressContainer.style.display = "block"
  statusMessage.textContent = "Starting download..."
  log("Initializing model download to OPFS...")

  try {
    LiteRtLm.DEFAULT_WASM_PATH = "/assets/wasm"

    await downloadFileWithResume(
      "litert_models",
      MODEL_FILENAME,
      MODEL_URL,
      EXPECTED_SIZE,
      (progress, speed, eta) => {
        progressBar.style.width = `${progress}%`
        statusMessage.textContent = `Downloading... ${progress}% (${speed} MB/s, ETA: ${eta}s)`
        if (progress === 100) {
          log("Download complete.")
          statusMessage.textContent = "Ready"
          btnRun.disabled = false
          updateStorageEstimate()
        }
      }
    )
  } catch (err: any) {
    log(`Download failed: ${err.message}`, true)
    statusMessage.textContent = `Error: ${err.message}`
  } finally {
    btnDownload.disabled = false
  }
})

// 4. Purge Cache
btnPurge.addEventListener("click", async () => {
  log("Purging OPFS storage cache...")
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.storage &&
      navigator.storage.getDirectory
    ) {
      const root = await navigator.storage.getDirectory()
      try {
        await root.removeEntry("litert_models", { recursive: true })
      } catch (err) {
        console.warn("Could not remove litert_models entry:", err)
      }
    }

    progressBar.style.width = "0%"
    progressContainer.style.display = "none"
    statusMessage.textContent = "Cache cleared"
    btnRun.disabled = true
    if (engine) {
      await engine.delete()
      engine = null
      engineStatusText.textContent = "Engine Status: Unloaded"
    }
    log("OPFS cache purged and engine unloaded.")
    updateStorageEstimate()
  } catch (err: any) {
    log(`Purge failed: ${err.message}`, true)
  }
})

// 5. Model Loading & Inference helper to satisfy max-lines-per-function
async function loadOrVerifyModelFile(): Promise<File> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    throw new Error("OPFS is not supported in this environment")
  }
  const root = await navigator.storage.getDirectory()
  const opfsDir = await root.getDirectoryHandle("litert_models")
  const fileHandle = await opfsDir.getFileHandle(MODEL_FILENAME)
  let file = await fileHandle.getFile()

  if (mockState.corrupted) {
    file = new File(["corrupted content"], MODEL_FILENAME, {
      type: "application/octet-stream"
    })
    log("Simulating verification failure due to file size mismatch...", true)
  }

  if (file.size !== EXPECTED_SIZE) {
    throw new Error(
      `Model verification failed: Expected ${EXPECTED_SIZE} bytes, but found ${file.size} bytes.`
    )
  }
  return file
}

async function runModelInference(systemPrompt: string, userPrompt: string) {
  try {
    if (!engine) {
      const file = await loadOrVerifyModelFile()
      const localUrl = URL.createObjectURL(file)

      log(
        "Compiling WebGPU shaders & loading weights (Main thread will block slightly)..."
      )
      engine = await Engine.create({
        model: localUrl,
        mainExecutorSettings: { maxNumTokens: 2048 }
      })
      log("LiteRT-LM Engine loaded successfully.")
    }

    engineStatusText.textContent = "Engine Status: Ready"
    log("Executing inference query...")

    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n${userPrompt}`
      : userPrompt
    log(`Prompt sent to Gemma: "${fullPrompt}"`)

    const chat = await engine.createConversation()
    const response = await chat.sendMessage({
      role: "user",
      content: fullPrompt
    })

    const responseText = response.content[0].text || ""
    log(`Response: "${responseText}"`)
  } catch (err: any) {
    log(`Inference failed: ${err.message}`, true)
    engineStatusText.textContent = "Engine Status: Error"
  }
}

btnRun.addEventListener("click", async () => {
  const systemPrompt = systemPromptInput.value.trim()
  const userPrompt = userPromptInput.value.trim()

  if (!userPrompt) {
    showToast("User prompt cannot be empty!")
    return
  }

  btnRun.disabled = true
  engineStatusText.textContent = "Engine Status: Initializing..."
  log("Loading LiteRT-LM Wasm engine & model weights...")

  await runModelInference(systemPrompt, userPrompt)
  btnRun.disabled = false
})

// Init
async function init() {
  setupMockListeners(log, updateWebGpuStatus, updateStorageEstimate)
  await initHarnessCache(mswStatus, log)
  await updateWebGpuStatus()
  await updateStorageEstimate()

  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.storage &&
      navigator.storage.getDirectory
    ) {
      const root = await navigator.storage.getDirectory()
      const opfsDir = await root.getDirectoryHandle("litert_models")
      const fileHandle = await opfsDir.getFileHandle(MODEL_FILENAME)
      const file = await fileHandle.getFile()
      if (file.size === EXPECTED_SIZE) {
        btnRun.disabled = false
        log("Model file found in OPFS. Inference is ready.")
      }
    }
  } catch (err) {
    console.debug("Initial model file check skipped:", err)
  }
}

init()
