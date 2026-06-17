import { safeSendMessage } from "../lib/chrome-utils"
import { checkWebGpuSupport } from "../lib/gpu-utils"

export type DownloadStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "verifying"
  | "ready"
  | "error"
  | "insufficient-quota"
  | "retrying"
  | "engine-initializing"
  | "engine-ready"
  | "unsupported"

export async function checkCurrentStateHelper(
  setStatus: (s: DownloadStatus) => void,
  setProgress: (p: number) => void,
  setWebGpuFallback?: (fb: boolean) => void,
  setError?: (e: string | null) => void
) {
  setStatus("checking")
  const gpuSupported = await checkWebGpuSupport()
  const wasmSupported =
    typeof WebAssembly === "object" &&
    typeof WebAssembly.instantiate === "function"
  console.log(
    "checkCurrentStateHelper: gpuSupported =",
    gpuSupported,
    "wasmSupported =",
    wasmSupported,
    "typeof WebAssembly =",
    typeof WebAssembly
  )

  if (!gpuSupported && !wasmSupported) {
    if (setError) setError("both-unsupported")
    setStatus("unsupported")
    return
  }

  if (!gpuSupported) {
    if (setWebGpuFallback) setWebGpuFallback(true)
  }

  safeSendMessage({ target: "offscreen", action: "verify-integrity" })
    .then((res: any) => {
      if (res && res.status === "success" && res.integrityPassed) {
        setStatus("ready")
        setProgress(100)
      } else {
        setStatus("idle")
        setProgress(0)
      }
    })
    .catch((err) => {
      console.error("checkCurrentStateHelper error:", err)
      setStatus("error")
      setProgress(0)
      if (setError) {
        setError("接続が切断されました。ページをリロードしてください。")
      }
    })
}

function runStartDownload(
  setStatus: (s: DownloadStatus) => void,
  setProgress: (p: number) => void,
  setError: (e: string | null) => void
) {
  safeSendMessage({ target: "offscreen", action: "start-download" })
    .then((downloadRes: any) => {
      if (!downloadRes || downloadRes.status === "error") {
        setStatus("error")
        setError(downloadRes?.error ?? "Start download failed")
      } else {
        setStatus("downloading")
        setProgress(0)
        safeSendMessage({
          target: "background",
          action: "set-downloading",
          value: true
        }).catch((err) => {
          console.error("set-downloading error:", err)
        })
      }
    })
    .catch((err) => {
      console.error("runStartDownload error:", err)
      setStatus("error")
      setError("接続が切断されました。ページをリロードしてください。")
    })
}

function runInitWorker(
  setStatus: (s: DownloadStatus) => void,
  setProgress: (p: number) => void,
  setError: (e: string | null) => void
) {
  safeSendMessage({ target: "offscreen", action: "init-worker" })
    .then((workerRes: any) => {
      if (!workerRes || workerRes.status === "error") {
        setStatus("error")
        setError(workerRes?.error ?? "Worker init failed")
      } else {
        runStartDownload(setStatus, setProgress, setError)
      }
    })
    .catch((err) => {
      console.error("runInitWorker error:", err)
      setStatus("error")
      setError("接続が切断されました。ページをリロードしてください。")
    })
}

export async function startDownloadHelper(
  setStatus: (s: DownloadStatus) => void,
  setProgress: (p: number) => void,
  setError: (e: string | null) => void,
  setWebGpuFallback?: (fb: boolean) => void
) {
  setStatus("checking")
  setError(null)

  const gpuSupported = await checkWebGpuSupport()
  const wasmSupported =
    typeof WebAssembly === "object" &&
    typeof WebAssembly.instantiate === "function"

  if (!gpuSupported && !wasmSupported) {
    setError("both-unsupported")
    setStatus("unsupported")
    return
  }

  if (!gpuSupported) {
    if (setWebGpuFallback) setWebGpuFallback(true)
  }

  safeSendMessage({
    target: "offscreen",
    action: "check-quota",
    requiredBytes: 2.5 * 1024 * 1024 * 1024
  })
    .then((quotaRes: any) => {
      if (!quotaRes || quotaRes.status === "error") {
        setStatus("error")
        setError(quotaRes?.error ?? "Quota check failed")
      } else if (!quotaRes.isSufficient) {
        setStatus("insufficient-quota")
      } else {
        runInitWorker(setStatus, setProgress, setError)
      }
    })
    .catch((err) => {
      console.error("startDownloadHelper error:", err)
      setStatus("error")
      setError("接続が切断されました。ページをリロードしてください。")
    })
}

export function purgeCacheHelper(
  setStatus: (s: DownloadStatus) => void,
  setProgress: (p: number) => void,
  setError: (e: string | null) => void
) {
  setStatus("checking")
  safeSendMessage({ target: "offscreen", action: "purge-cache" })
    .then((res: any) => {
      if (res && res.status === "success") {
        setStatus("idle")
        setProgress(0)
      } else {
        setStatus("error")
        setError(res?.error ?? "Failed to purge cache")
      }
    })
    .catch((err) => {
      console.error("purgeCacheHelper error:", err)
      setStatus("error")
      setError("接続が切断されました。ページをリロードしてください。")
    })
}

export function runInferenceHelper(
  prompt: string,
  systemPrompt?: string,
  temperature?: number
): Promise<string> {
  const requestId = Math.random().toString(36).substring(7)
  return safeSendMessage({
    target: "offscreen",
    action: "run-inference",
    requestId,
    prompt,
    systemPrompt,
    temperature
  })
    .then((res: any) => {
      if (!res) {
        throw new Error("No response from background")
      } else if (res.status === "error") {
        throw new Error(res.error || "Inference failed")
      } else {
        return res.result || ""
      }
    })
    .catch((err) => {
      console.error("runInferenceHelper error:", err)
      if (
        err.message &&
        err.message.includes("Extension context invalidated")
      ) {
        throw new Error("接続が切断されました。ページをリロードしてください。")
      }
      throw err
    })
}
