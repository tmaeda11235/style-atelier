import {
  fallbackStaticParser,
  getActiveModel,
  LIGHTWEIGHT_MODEL
} from "./local-ai-fallback-parser"
import type { InferenceResult } from "./local-ai-fallback-parser"

export type LocalAiStatus =
  | "uninitialized"
  | "checking"
  | "download-required"
  | "downloading"
  | "ready"
  | "engine-initializing"
  | "engine-ready"
  | "idle"
  | "error"

export class LocalAiClient {
  private worker: Worker | null = null
  private status: LocalAiStatus = "uninitialized"
  private progress = 0
  private speed = 0
  private eta = 0
  private text = ""
  private error: string | null = null
  private webGpuFallback = false
  private dynamicMemoryRestricted = false
  private useStaticFallback = false

  private statusListeners = new Set<
    (status: LocalAiStatus, payload?: any) => void
  >()
  private inferenceCallbacks = new Map<
    string,
    {
      resolve: (res: InferenceResult) => void
      reject: (err: Error) => void
    }
  >()

  constructor() {}

  public addStatusListener(
    listener: (status: LocalAiStatus, payload?: any) => void
  ) {
    this.statusListeners.add(listener)
    // Emit current state immediately
    listener(this.status, {
      progress: this.progress,
      speed: this.speed,
      eta: this.eta,
      text: this.text,
      error: this.error,
      webGpuFallback: this.webGpuFallback
    })
  }

  public removeStatusListener(
    listener: (status: LocalAiStatus, payload?: any) => void
  ) {
    this.statusListeners.delete(listener)
  }

  private emitStatus(status: LocalAiStatus, payload?: any) {
    this.status = status
    const activeModel = getActiveModel(this.dynamicMemoryRestricted)
    const mode = this.useStaticFallback
      ? "static"
      : activeModel.filename === LIGHTWEIGHT_MODEL.filename
        ? "lightweight"
        : "standard"

    const data = {
      progress: this.progress,
      speed: this.speed,
      eta: this.eta,
      text: this.text,
      error: this.error,
      webGpuFallback: this.webGpuFallback,
      mode,
      ...payload
    }
    for (const listener of this.statusListeners) {
      try {
        listener(status, data)
      } catch (e) {
        console.error("Error in status listener:", e)
      }
    }
  }

  public async checkModelDownloaded(): Promise<boolean> {
    this.emitStatus("checking")
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const mockMode =
        localStorage.getItem("mock-webllm") === "true" ||
        urlParams.get("mock") === "true"

      const activeModel = getActiveModel(this.dynamicMemoryRestricted)

      if (mockMode) {
        const isDownloaded =
          localStorage.getItem("mock-webllm-downloaded") === "true"
        if (isDownloaded) {
          this.emitStatus("ready")
          return true
        }
        this.emitStatus("download-required")
        return false
      }

      if (!navigator.storage || !navigator.storage.getDirectory) {
        throw new Error("OPFS is not supported in this browser.")
      }
      const root = await navigator.storage.getDirectory()
      const opfsDir = await root.getDirectoryHandle("litert_models", {
        create: false
      })
      const fileHandle = await opfsDir.getFileHandle(activeModel.filename)
      const file = await fileHandle.getFile()
      const expectedSize = activeModel.size
      if (file.size === expectedSize) {
        this.emitStatus("ready")
        return true
      }
      this.emitStatus("download-required")
      return false
    } catch {
      this.emitStatus("download-required")
      return false
    }
  }

  // eslint-disable-next-line max-lines-per-function
  public init() {
    if (this.worker) return

    this.worker = new Worker(
      new URL("../workers/local-ai.worker.ts", import.meta.url),
      { type: "module" }
    )

    // eslint-disable-next-line max-lines-per-function
    this.worker.onmessage = (event) => {
      const { status, ...payload } = event.data
      console.log("LocalAiClient received from worker:", status, payload)

      switch (status) {
        case "downloading":
          this.progress = payload.progress ?? 0
          this.speed = payload.speed ?? 0
          this.eta = payload.eta ?? 0
          this.text = payload.text ?? ""
          this.emitStatus("downloading")
          break
        case "ready": {
          const urlParams = new URLSearchParams(window.location.search)
          const mockMode =
            localStorage.getItem("mock-webllm") === "true" ||
            urlParams.get("mock") === "true"
          if (mockMode) {
            localStorage.setItem("mock-webllm-downloaded", "true")
          }
          this.emitStatus("ready")
          break
        }
        case "engine-initializing":
          this.progress = payload.progress ?? 0
          this.text = payload.text ?? ""
          this.emitStatus("engine-initializing")
          break
        case "engine-ready":
          this.emitStatus("engine-ready")
          break
        case "idle":
          this.emitStatus("idle")
          break
        case "webgpu-fallback-warn":
          this.webGpuFallback = true
          this.emitStatus(this.status, { webGpuFallback: true })
          break
        case "inference-result": {
          const { requestId, result, metrics } = payload
          const cb = this.inferenceCallbacks.get(requestId)
          if (cb) {
            cb.resolve({ result, metrics })
            this.inferenceCallbacks.delete(requestId)
          }
          break
        }
        case "inference-error": {
          const { requestId, error } = payload
          const cb = this.inferenceCallbacks.get(requestId)
          if (cb) {
            cb.reject(new Error(error || "Inference failed"))
            this.inferenceCallbacks.delete(requestId)
          }
          break
        }
        case "error":
          this.error = payload.error ?? "Unknown worker error"
          this.dynamicMemoryRestricted = true
          this.useStaticFallback = true
          this.emitStatus("error")
          break
        default:
          console.warn("Unknown message status from worker:", status)
      }
    }

    // Set default Wasm path and mock mode status
    const wasmPath = `${window.location.origin}/mobile/assets/wasm`
    const urlParams = new URLSearchParams(window.location.search)
    const mockMode =
      localStorage.getItem("mock-webllm") === "true" ||
      urlParams.get("mock") === "true"

    const activeModel = getActiveModel(this.dynamicMemoryRestricted)
    this.worker.postMessage({
      action: "init",
      wasmPath,
      mockMode,
      modelInfo: activeModel
    })
  }

  public startDownload() {
    this.init()
    this.error = null
    this.worker?.postMessage({ action: "start-download" })
  }

  public preload() {
    this.init()
    this.worker?.postMessage({ action: "preload" })
  }

  public runInference(
    prompt: string,
    systemPrompt?: string
  ): Promise<InferenceResult> {
    if (this.useStaticFallback) {
      console.log(
        "LocalAiClient: Dynamic fallback to static rule-based parsing."
      )
      const result = fallbackStaticParser(prompt)
      return Promise.resolve({
        result,
        metrics: {
          latencyMs: 5,
          tokensPerSec: 200,
          estimatedTokens: Math.max(1, Math.round(result.length / 3.5)),
          vramBytes: 0
        }
      })
    }

    this.init()
    const requestId = Math.random().toString(36).substring(7)
    return new Promise<InferenceResult>((resolve, reject) => {
      this.inferenceCallbacks.set(requestId, { resolve, reject })
      this.worker?.postMessage({
        action: "run-inference",
        requestId,
        prompt,
        systemPrompt
      })
    }).catch((err) => {
      console.warn("Inference failed, retrying once with static fallback:", err)
      this.useStaticFallback = true
      this.emitStatus(this.status)
      const result = fallbackStaticParser(prompt)
      return {
        result,
        metrics: {
          latencyMs: 5,
          tokensPerSec: 200,
          estimatedTokens: Math.max(1, Math.round(result.length / 3.5)),
          vramBytes: 0
        }
      }
    })
  }

  public unload() {
    this.worker?.postMessage({ action: "unload" })
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.status = "uninitialized"
    }
  }
}
