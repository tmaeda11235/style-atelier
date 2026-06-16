import { Engine, LiteRtLm } from "@litert-lm/core"

import { setupWorkerCache } from "./mocks/interceptor"

console.log("LiteRT Worker context initialized.")
setupWorkerCache()

let engine: Engine | null = null
let isInitializing = false
let idleTimer: any = null
const IDLE_TIMEOUT_MS = 5 * 60 * 1000
const MODEL_FILENAME = "gemma-4-E2B-it-web.litertlm"
const MODEL_URL =
  "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm"
const EXPECTED_SIZE = 2008432640

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
      console.log("LiteRT Engine idle timeout reached. Unloading model...")
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

function waitForEngineInit(): Promise<Engine> {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      if (engine) {
        clearInterval(checkInterval)
        resolve(engine)
      } else if (!isInitializing) {
        clearInterval(checkInterval)
        reject(new Error("Engine initialization failed"))
      }
    }, 100)
  })
}

async function getModelFile(): Promise<File> {
  const root = await navigator.storage.getDirectory()
  const opfsDir = await root.getDirectoryHandle("litert_models", {
    create: true
  })
  const fileHandle = await opfsDir.getFileHandle(MODEL_FILENAME)
  const file = await fileHandle.getFile()
  if (file.size !== EXPECTED_SIZE) {
    throw new Error(
      `Incomplete model file in OPFS. Expected ${EXPECTED_SIZE} but got ${file.size}`
    )
  }
  return file
}

async function instantiateEngine(file: File): Promise<Engine> {
  self.postMessage({
    status: "engine-initializing",
    progress: 30,
    speed: 0,
    slate: 0,
    text: "Loading Wasm module and compiling WebGPU shaders..."
  } as any)
  const localUrl = URL.createObjectURL(file)
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
    const fileHandle = await opfsDir.getFileHandle(MODEL_FILENAME)
    const file = await fileHandle.getFile()
    return file.size === EXPECTED_SIZE
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

async function doModelDownload() {
  self.postMessage({
    status: "downloading",
    progress: 0,
    speed: 0,
    eta: 0,
    text: "Starting download..."
  })
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
    self.postMessage({
      status: "error",
      error: err.message || "Download failed"
    })
  }
}

async function executeInference(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Inference timeout")), 30000)
  })
  const inferencePromise = (async () => {
    const activeEngine = await loadEngine()
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
    const chat = await activeEngine.createConversation()
    const response = await chat.sendMessage({
      role: "user",
      content: fullPrompt
    })
    return response.content[0].text || ""
  })()
  return Promise.race([inferencePromise, timeoutPromise])
}

async function processQueue() {
  if (isProcessingInference || inferenceQueue.length === 0) return
  isProcessingInference = true
  if (idleTimer) clearTimeout(idleTimer)
  const request = inferenceQueue.shift()!
  const { requestId, prompt, systemPrompt } = request
  try {
    const result = await executeInference(prompt, systemPrompt)
    self.postMessage({ status: "inference-result", requestId, result })
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

self.onmessage = async (event) => {
  console.log("LiteRT Worker received message:", event.data)
  const { action, ...payload } = event.data

  switch (action) {
    case "init":
      if (payload.wasmPath) {
        LiteRtLm.DEFAULT_WASM_PATH = payload.wasmPath
      }
      break
    case "start-download":
      await doModelDownload()
      break
    case "preload":
      try {
        await loadEngine()
      } catch (err) {
        console.error("Preload trigger failed:", err)
      }
      break
    case "run-inference": {
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
      break
    }
    case "unload":
      if (engine) {
        try {
          await engine.delete()
        } catch (e) {
          console.error("Failed to unload engine:", e)
        }
        engine = null
      }
      self.postMessage({ status: "idle", info: "Engine unloaded manually" })
      break
    default:
      self.postMessage({ status: "error", error: `Unknown action: ${action}` })
      break
  }
}
