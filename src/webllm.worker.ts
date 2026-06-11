import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm"

console.log("WebLLM Worker context initialized.")

let engine: MLCEngine | null = null
let isInitializing = false
let idleTimer: any = null
const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

interface InferenceRequest {
  requestId: string
  prompt: string
  systemPrompt?: string
  temperature?: number
}

const inferenceQueue: InferenceRequest[] = []
let isProcessingInference = false

// Reset idle timer
function resetIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer)
  }
  idleTimer = setTimeout(async () => {
    if (engine && !isProcessingInference && inferenceQueue.length === 0) {
      console.log("WebLLM Engine idle timeout reached. Unloading model...")
      try {
        await engine.unload()
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

const TOTAL_SIZE_BYTES = 1.0 * 1024 * 1024 * 1024 // Assume ~1.0 GB model size

function createProgressCallback(startTime: number) {
  return (report: any) => {
    const progress = Math.round(report.progress * 100)
    const now = Date.now()
    const elapsedMs = now - startTime
    let speed = 0
    let eta = 0

    if (elapsedMs > 500 && report.progress > 0) {
      const downloadedBytes = TOTAL_SIZE_BYTES * report.progress
      const speedBps = downloadedBytes / (elapsedMs / 1000)
      speed = Number((speedBps / (1024 * 1024)).toFixed(1))

      const totalEstimatedMs = elapsedMs / report.progress
      const etaMs = totalEstimatedMs - elapsedMs
      eta = Math.max(0, Math.round(etaMs / 1000))
    }

    self.postMessage({ status: "downloading", progress, speed, eta })
  }
}

function waitForEngineInit(): Promise<MLCEngine> {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      if (engine) {
        clearInterval(checkInterval)
        resolve(engine)
      } else if (!isInitializing) {
        clearInterval(checkInterval)
        reject(new Error("Engine initialization failed or cancelled"))
      }
    }, 100)
  })
}

async function loadEngine(): Promise<MLCEngine> {
  if (engine) {
    resetIdleTimer()
    return engine
  }

  if (isInitializing) {
    return waitForEngineInit()
  }

  const maxRetries = 3
  let retryCount = 0

  while (true) {
    isInitializing = true
    const startTime = Date.now()
    try {
      self.postMessage({ status: "downloading", progress: 0, speed: 0, eta: 0 })

      const engineInstance = await CreateMLCEngine("gemma-2b-it-q4f16_1-MLC", {
        initProgressCallback: createProgressCallback(startTime)
      })

      engine = engineInstance
      self.postMessage({ status: "ready" })
      resetIdleTimer()
      return engineInstance
    } catch (err: any) {
      isInitializing = false
      if (retryCount < maxRetries) {
        retryCount++
        const delay = 1000 * Math.pow(2, retryCount - 1)
        self.postMessage({
          status: "retrying",
          retryCount,
          maxRetries,
          error: err.message || "Connection lost"
        })
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      self.postMessage({
        status: "error",
        error: err.message || "Failed to load WebLLM model"
      })
      throw err
    } finally {
      isInitializing = false
    }
  }
}

async function executeInference(
  activeEngine: MLCEngine,
  prompt: string,
  systemPrompt?: string,
  temperature?: number
): Promise<string> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Inference timeout")), 30000)
  })

  const messages: any[] = []
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt })
  }
  messages.push({ role: "user", content: prompt })

  const inferencePromise = (async () => {
    const reply = await activeEngine.chat.completions.create({
      messages,
      temperature: temperature ?? 0.7,
      stream: false
    })
    return reply.choices[0].message.content || ""
  })()

  return Promise.race([inferencePromise, timeoutPromise])
}

// Process the next inference request in the queue
async function processQueue() {
  if (isProcessingInference || inferenceQueue.length === 0) return

  isProcessingInference = true
  if (idleTimer) clearTimeout(idleTimer) // Suspend idle timeout during active inference

  const request = inferenceQueue.shift()!
  const { requestId, prompt, systemPrompt, temperature } = request

  try {
    const activeEngine = await loadEngine()
    const result = await executeInference(
      activeEngine,
      prompt,
      systemPrompt,
      temperature
    )

    self.postMessage({
      status: "inference-result",
      requestId,
      result
    })
  } catch (err: any) {
    console.error("Inference failed for request:", requestId, err)

    // If it was a timeout, the engine might be in a bad state. Unload it.
    if (err.message === "Inference timeout" && engine) {
      try {
        await engine.unload()
      } catch (e) {
        console.error("Failed to unload hung engine:", e)
      }
      engine = null
    }

    self.postMessage({
      status: "inference-error",
      requestId,
      error: err.message || "Inference execution failed"
    })
  } finally {
    isProcessingInference = false
    resetIdleTimer()
    // Process next item
    processQueue()
  }
}

self.onmessage = async (event) => {
  console.log("WebLLM Worker received message:", event.data)
  const { action, ...payload } = event.data

  if (action === "start-download") {
    try {
      await loadEngine()
    } catch (err) {
      console.error("Start download trigger failed:", err)
    }
  } else if (action === "run-inference") {
    const { requestId, prompt, systemPrompt, temperature } = payload
    if (!prompt || !requestId) {
      self.postMessage({
        status: "inference-error",
        requestId,
        error: "Missing prompt or requestId"
      })
      return
    }

    inferenceQueue.push({ requestId, prompt, systemPrompt, temperature })
    processQueue()
  } else if (action === "unload") {
    if (engine) {
      try {
        await engine.unload()
      } catch (e) {
        console.error("Failed to unload engine:", e)
      }
      engine = null
    }
    self.postMessage({ status: "idle", info: "Engine unloaded manually" })
  } else {
    self.postMessage({
      status: "error",
      error: `Unknown action: ${action}`
    })
  }
}
