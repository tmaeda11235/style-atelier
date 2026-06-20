/* eslint-disable max-lines */
import { Backend, Engine, LiteRtLm } from "@litert-lm/core"

import { setupWorkerCache } from "../mocks/interceptor"

console.log("LiteRT Worker context initialized.")
setupWorkerCache()

let engine: Engine | null = null
let isInitializing = false
let idleTimer: any = null
const IDLE_TIMEOUT_MS = 5 * 60 * 1000
let MODEL_FILENAME = "gemma-4-E2B-it-web.litertlm"
let MODEL_URL =
  "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm"
let EXPECTED_SIZE = 2008432640
let mockMode = false

interface InferenceRequest {
  requestId: string
  prompt: string
  systemPrompt?: string
}

const inferenceQueue: InferenceRequest[] = []
let isProcessingInference = false

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(async () => {
    if (engine && !isProcessingInference && inferenceQueue.length === 0) {
      if (mockMode) {
        engine = null
        self.postMessage({
          status: "idle",
          info: "Engine unloaded due to idle timeout"
        })
        return
      }
      try {
        await engine.delete()
      } catch (e) {
        console.error("Failed to unload engine during idle timeout:", e)
      }
      engine = null
      self.postMessage({
        status: "idle",
        info: "Engine unloaded due to idle timeout"
      })
    }
  }, IDLE_TIMEOUT_MS)
}

async function waitForEngineInit(): Promise<Engine> {
  while (isInitializing) await new Promise((r) => setTimeout(r, 100))
  if (engine) return engine
  throw new Error("Engine initialization failed")
}

async function getModelFile(): Promise<File> {
  const root = await navigator.storage.getDirectory()
  const opfsDir = await root.getDirectoryHandle("litert_models", {
    create: true
  })
  const file = await (await opfsDir.getFileHandle(MODEL_FILENAME)).getFile()
  if (file.size !== EXPECTED_SIZE) {
    throw new Error(
      `Incomplete model file in OPFS. Expected ${EXPECTED_SIZE} but got ${file.size}`
    )
  }
  return file
}

// eslint-disable-next-line max-lines-per-function
async function instantiateEngine(file: File): Promise<Engine> {
  const localUrl = URL.createObjectURL(file)
  try {
    self.postMessage({
      status: "engine-initializing",
      progress: 30,
      speed: 0,
      slate: 0,
      text: "Loading Wasm module and compiling WebGPU shaders..."
    } as any)
    const engineInstance = await Engine.create({
      model: localUrl,
      mainExecutorSettings: { maxNumTokens: 8192 }
    })
    self.postMessage({
      status: "engine-initializing",
      progress: 80,
      speed: 0,
      slate: 0,
      text: "Creating conversation context..."
    } as any)
    return engineInstance
  } catch (gpuError: any) {
    console.warn(
      "WebGPU initialization failed, falling back to CPU (Wasm) mode:",
      gpuError
    )

    // Notify UI of the WebGPU fallback
    self.postMessage({
      status: "webgpu-fallback-warn",
      error: gpuError.message || "WebGPU load failed"
    } as any)

    self.postMessage({
      status: "engine-initializing",
      progress: 30,
      speed: 0,
      slate: 0,
      text: "WebGPU unsupported. Falling back to CPU (Wasm) mode..."
    } as any)

    try {
      const engineInstance = await Engine.create({
        model: localUrl,
        backend: Backend.CPU,
        mainExecutorSettings: { maxNumTokens: 8192 }
      })
      self.postMessage({
        status: "engine-initializing",
        progress: 80,
        speed: 0,
        slate: 0,
        text: "Creating conversation context (CPU Mode)..."
      } as any)
      return engineInstance
    } catch (cpuError: any) {
      console.error("CPU (Wasm) fallback initialization failed:", cpuError)
      const wasmSupported =
        typeof WebAssembly === "object" &&
        typeof WebAssembly.instantiate === "function"
      if (wasmSupported) {
        // Wasm is supported, so the failure is likely file corruption or load failure
        throw cpuError
      }
      throw new Error("both-unsupported")
    }
  }
}

async function loadEngine(): Promise<Engine> {
  if (engine) {
    resetIdleTimer()
    return engine
  }
  if (isInitializing) return waitForEngineInit()
  isInitializing = true
  self.postMessage({
    status: "engine-initializing",
    progress: 10,
    speed: 0,
    eta: 0,
    text: "Accessing local model file..."
  })
  try {
    const file = await getModelFile()
    const engineInstance = await instantiateEngine(file)
    engine = engineInstance
    self.postMessage({ status: "engine-ready" })
    resetIdleTimer()
    return engineInstance
  } catch (err: any) {
    self.postMessage({
      status: "error",
      error: err.message || "Failed to load LiteRT model"
    })
    throw err
  } finally {
    isInitializing = false
  }
}

async function isModelAlreadyDownloaded(
  opfsDir: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    return (
      (await (await opfsDir.getFileHandle(MODEL_FILENAME)).getFile()).size ===
      EXPECTED_SIZE
    )
  } catch {
    return false
  }
}

async function streamDownload(
  response: Response,
  fileHandle: FileSystemFileHandle
) {
  const contentLength = response.headers.get("Content-Length")
  const totalBytes = contentLength ? parseInt(contentLength, 10) : EXPECTED_SIZE
  let receivedBytes = 0
  const reader = response.body!.getReader()
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
      self.postMessage({
        status: "downloading",
        progress,
        speed,
        eta,
        text: `Downloading model weights... (${progress}%)`
      })
    }
  }
  await writable.close()
}

// eslint-disable-next-line max-lines-per-function
async function doModelDownload() {
  self.postMessage({
    status: "downloading",
    progress: 0,
    speed: 0,
    eta: 0,
    text: "Starting download..."
  })

  if (mockMode) {
    let progress = 0
    const intervalId = setInterval(() => {
      progress += 25
      if (progress > 100) {
        clearInterval(intervalId)
        self.postMessage({ status: "ready" })
      } else {
        self.postMessage({
          status: "downloading",
          progress,
          speed: 12.5,
          eta: Math.round((100 - progress) / 10),
          text: `Fetching model weights: ${progress}% (dummy size info: 2.0 GB total)`
        })
      }
    }, 100)
    return
  }

  try {
    const root = await navigator.storage.getDirectory()
    const opfsDir = await root.getDirectoryHandle("litert_models", {
      create: true
    })
    if (await isModelAlreadyDownloaded(opfsDir)) {
      self.postMessage({ status: "ready" })
      return
    }
    const response = await fetch(MODEL_URL)
    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch model: ${response.statusText}`)
    }
    const fileHandle = await opfsDir.getFileHandle(MODEL_FILENAME, {
      create: true
    })
    await streamDownload(response, fileHandle)
    self.postMessage({ status: "ready" })
  } catch (err: any) {
    const isQuotaError =
      err.name === "QuotaExceededError" ||
      err.message?.includes("QuotaExceededError") ||
      err.message?.includes("quota")
    self.postMessage({
      status: "error",
      error: isQuotaError
        ? "QuotaExceededError"
        : err.message || "Download failed"
    })
  }
}

async function executeInference(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  if (mockMode) {
    self.postMessage({
      status: "engine-initializing",
      progress: 30,
      speed: 0,
      slate: 0,
      text: "Loading Wasm module and compiling WebGPU shaders..."
    } as any)
    await new Promise((r) => setTimeout(r, 200))
    self.postMessage({
      status: "engine-initializing",
      progress: 80,
      speed: 0,
      slate: 0,
      text: "Creating conversation context..."
    } as any)
    await new Promise((r) => setTimeout(r, 200))
    self.postMessage({ status: "engine-ready" })

    return JSON.stringify({
      genre: "Cyberpunk / Fantasy",
      tags: ["cyberpunk", "alchemy", "neon", "potion"],
      summary:
        "A fusion of cyberpunk aesthetics and classical alchemy, featuring vibrant neon illumination."
    })
  }

  const timeout = new Promise<never>((_, r) =>
    setTimeout(() => r(new Error("Inference timeout")), 30000)
  )
  const work = (async () => {
    const activeEngine = await loadEngine()
    const chat = await activeEngine.createConversation()
    const response = await chat.sendMessage({
      role: "user",
      content: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
    })
    const firstContent = response.content[0]
    if (typeof firstContent === "string") {
      return firstContent
    }
    return (firstContent as any).text || ""
  })()
  return Promise.race([work, timeout])
}

async function processQueue() {
  if (isProcessingInference || inferenceQueue.length === 0) return
  isProcessingInference = true
  if (idleTimer) clearTimeout(idleTimer)
  const request = inferenceQueue.shift()!
  const { requestId, prompt, systemPrompt } = request
  try {
    const startTime = performance.now()
    const result = await executeInference(prompt, systemPrompt)
    const latencyMs = performance.now() - startTime

    // Estimate token metrics
    const charCount = result.length
    const estimatedTokens = Math.max(1, Math.round(charCount / 3.5))
    const tokensPerSec = Number(
      (estimatedTokens / (latencyMs / 1000)).toFixed(2)
    )

    // Estimate VRAM usage (Base model weights ~2008MB + dynamic allocation for context)
    const baseVramBytes = 2008432640
    const kvCacheBytes = 256 * 1024 * 1024 // ~256MB dynamic allocation
    const vramBytes = baseVramBytes + kvCacheBytes

    self.postMessage({
      status: "inference-result",
      requestId,
      result,
      metrics: {
        latencyMs,
        tokensPerSec,
        estimatedTokens,
        vramBytes
      }
    })
  } catch (err: any) {
    console.error("Inference failed for request:", requestId, err)
    self.postMessage({
      status: "inference-error",
      requestId,
      error: err.message || "Inference execution failed"
    })
  } finally {
    isProcessingInference = false
    resetIdleTimer()
    processQueue()
  }
}

function handleInitAction(payload: any) {
  if (payload.wasmPath) LiteRtLm.DEFAULT_WASM_PATH = payload.wasmPath
  if (payload.mockMode !== undefined) mockMode = !!payload.mockMode
  if (payload.modelInfo) {
    MODEL_FILENAME = payload.modelInfo.filename
    MODEL_URL = payload.modelInfo.url
    EXPECTED_SIZE = payload.modelInfo.size
  }
}

function handleInferenceAction(payload: any) {
  const { requestId, prompt, systemPrompt } = payload
  if (!prompt || !requestId) {
    self.postMessage({
      status: "inference-error",
      requestId,
      error: "Missing prompt or requestId"
    })
    return
  }
  inferenceQueue.push({ requestId, prompt, systemPrompt })
  processQueue()
}

async function handleUnloadAction() {
  if (engine) {
    try {
      await engine.delete()
    } catch (e) {
      console.error("Failed to unload engine:", e)
    }
    engine = null
  }
  self.postMessage({ status: "idle", info: "Engine unloaded manually" })
}

self.onmessage = async (event) => {
  console.log("LiteRT Worker received message:", event.data)
  const { action, ...payload } = event.data

  switch (action) {
    case "init":
      handleInitAction(payload)
      break
    case "start-download":
      await doModelDownload()
      break
    case "preload":
      if (mockMode) {
        self.postMessage({ status: "engine-ready" })
        break
      }
      await loadEngine().catch((err) =>
        console.error("Preload trigger failed:", err)
      )
      break
    case "run-inference":
      handleInferenceAction(payload)
      break
    case "unload":
      await handleUnloadAction()
      break
    default:
      self.postMessage({ status: "error", error: `Unknown action: ${action}` })
      break
  }
}
