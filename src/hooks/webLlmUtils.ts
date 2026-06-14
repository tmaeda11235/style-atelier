import type React from "react"

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

export function checkCurrentStateHelper(
  setStatus: (s: DownloadStatus) => void,
  setProgress: (p: number) => void
) {
  setStatus("checking")
  if (
    typeof chrome === "undefined" ||
    !chrome.runtime ||
    !chrome.runtime.sendMessage
  ) {
    setStatus("idle")
    setProgress(0)
    return
  }
  chrome.runtime.sendMessage(
    { target: "offscreen", action: "verify-integrity" },
    (res) => {
      if (res && res.status === "success" && res.integrityPassed) {
        setStatus("ready")
        setProgress(100)
      } else {
        setStatus("idle")
        setProgress(0)
      }
    }
  )
}

function runStartDownload(
  setStatus: (s: DownloadStatus) => void,
  setProgress: (p: number) => void,
  setError: (e: string | null) => void
) {
  chrome.runtime.sendMessage(
    { target: "offscreen", action: "start-download" },
    (downloadRes) => {
      if (!downloadRes || downloadRes.status === "error") {
        setStatus("error")
        setError(downloadRes?.error ?? "Start download failed")
      } else {
        setStatus("downloading")
        setProgress(0)
        chrome.runtime.sendMessage({
          target: "background",
          action: "set-downloading",
          value: true
        })
      }
    }
  )
}

function runInitWorker(
  setStatus: (s: DownloadStatus) => void,
  setProgress: (p: number) => void,
  setError: (e: string | null) => void
) {
  chrome.runtime.sendMessage(
    { target: "offscreen", action: "init-worker" },
    (workerRes) => {
      if (!workerRes || workerRes.status === "error") {
        setStatus("error")
        setError(workerRes?.error ?? "Worker init failed")
      } else {
        runStartDownload(setStatus, setProgress, setError)
      }
    }
  )
}

export function startDownloadHelper(
  setStatus: (s: DownloadStatus) => void,
  setProgress: (p: number) => void,
  setError: (e: string | null) => void
) {
  if (
    typeof chrome === "undefined" ||
    !chrome.runtime ||
    !chrome.runtime.sendMessage
  ) {
    setError("Extension environment not available")
    return
  }
  setStatus("checking")
  setError(null)

  chrome.runtime.sendMessage(
    {
      target: "offscreen",
      action: "check-quota",
      requiredBytes: 2.5 * 1024 * 1024 * 1024
    },
    (quotaRes) => {
      if (!quotaRes || quotaRes.status === "error") {
        setStatus("error")
        setError(quotaRes?.error ?? "Quota check failed")
      } else if (!quotaRes.isSufficient) {
        setStatus("insufficient-quota")
      } else {
        runInitWorker(setStatus, setProgress, setError)
      }
    }
  )
}

export function purgeCacheHelper(
  setStatus: (s: DownloadStatus) => void,
  setProgress: (p: number) => void,
  setError: (e: string | null) => void
) {
  setStatus("checking")
  if (
    typeof chrome === "undefined" ||
    !chrome.runtime ||
    !chrome.runtime.sendMessage
  ) {
    setError("Extension environment not available")
    return
  }
  chrome.runtime.sendMessage(
    { target: "offscreen", action: "purge-cache" },
    (res) => {
      if (res && res.status === "success") {
        setStatus("idle")
        setProgress(0)
      } else {
        setStatus("error")
        setError(res?.error ?? "Failed to purge cache")
      }
    }
  )
}

export function runInferenceHelper(
  prompt: string,
  systemPrompt?: string,
  temperature?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (
      typeof chrome === "undefined" ||
      !chrome.runtime ||
      !chrome.runtime.sendMessage
    ) {
      reject(new Error("Extension environment not available"))
      return
    }

    const requestId = Math.random().toString(36).substring(7)
    chrome.runtime.sendMessage(
      {
        target: "offscreen",
        action: "run-inference",
        requestId,
        prompt,
        systemPrompt,
        temperature
      },
      (res) => {
        if (!res) {
          reject(new Error("No response from background"))
        } else if (res.status === "error") {
          reject(new Error(res.error || "Inference failed"))
        } else {
          resolve(res.result || "")
        }
      }
    )
  })
}

interface Dispatchers {
  setStatus: React.Dispatch<React.SetStateAction<DownloadStatus>>
  setEngineStatus: React.Dispatch<
    React.SetStateAction<"idle" | "initializing" | "ready">
  >
  setProgress: React.Dispatch<React.SetStateAction<number>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setSpeed: React.Dispatch<React.SetStateAction<number>>
  setEta: React.Dispatch<React.SetStateAction<number>>
  setRetryCount: React.Dispatch<React.SetStateAction<number>>
  setMaxRetries: React.Dispatch<React.SetStateAction<number>>
  setText: React.Dispatch<React.SetStateAction<string>>
}

function handleEngineStatusMessage(
  ws: string,
  payload: { wp: number; wtxt: string },
  dispatch: Dispatchers
): boolean {
  if (ws === "engine-initializing") {
    dispatch.setEngineStatus("initializing")
    dispatch.setProgress(payload.wp ?? 0)
    dispatch.setSpeed(0)
    dispatch.setEta(0)
    dispatch.setText(payload.wtxt ?? "")
    dispatch.setError(null)
    return true
  }
  if (ws === "engine-ready") {
    dispatch.setEngineStatus("ready")
    dispatch.setProgress(100)
    dispatch.setSpeed(0)
    dispatch.setEta(0)
    dispatch.setText("")
    dispatch.setError(null)
    return true
  }
  return false
}

function handleStatusMessage(
  ws: string,
  payload: {
    wp: number
    we: string | null
    wsp: number
    weta: number
    wrc: number
    wmr: number
    wtxt: string
  },
  dispatch: Dispatchers
) {
  if (handleEngineStatusMessage(ws, payload, dispatch)) {
    return
  }
  if (ws === "downloading") {
    dispatch.setStatus("downloading")
    dispatch.setProgress(payload.wp ?? 0)
    dispatch.setSpeed(payload.wsp ?? 0)
    dispatch.setEta(payload.weta ?? 0)
    dispatch.setText(payload.wtxt ?? "")
    dispatch.setError(null)
  } else if (ws === "retrying") {
    dispatch.setStatus("retrying")
    dispatch.setRetryCount(payload.wrc ?? 0)
    dispatch.setMaxRetries(payload.wmr ?? 0)
    dispatch.setText("")
    dispatch.setError(payload.we ?? "Connection lost, retrying...")
  } else if (ws === "ready") {
    dispatch.setStatus("ready")
    dispatch.setEngineStatus("ready")
    dispatch.setProgress(100)
    dispatch.setSpeed(0)
    dispatch.setEta(0)
    dispatch.setText("")
    dispatch.setError(null)
  } else if (ws === "error") {
    dispatch.setStatus("error")
    dispatch.setEngineStatus("idle")
    dispatch.setSpeed(0)
    dispatch.setEta(0)
    dispatch.setText("")
    dispatch.setError(payload.we ?? "Unknown worker error")
  }
}

export function createMessageListener(
  setStatus: React.Dispatch<React.SetStateAction<DownloadStatus>>,
  setEngineStatus: React.Dispatch<
    React.SetStateAction<"idle" | "initializing" | "ready">
  >,
  setProgress: React.Dispatch<React.SetStateAction<number>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setSpeed: React.Dispatch<React.SetStateAction<number>>,
  setEta: React.Dispatch<React.SetStateAction<number>>,
  setRetryCount: React.Dispatch<React.SetStateAction<number>>,
  setMaxRetries: React.Dispatch<React.SetStateAction<number>>,
  setText: React.Dispatch<React.SetStateAction<string>>
) {
  return (message: any) => {
    if (message.source !== "offscreen-worker") return
    const {
      status: ws,
      progress: wp,
      error: we,
      speed: wsp,
      eta: weta,
      retryCount: wrc,
      maxRetries: wmr,
      text: wtxt
    } = message.payload || {}

    const dispatch: Dispatchers = {
      setStatus,
      setEngineStatus,
      setProgress,
      setError,
      setSpeed,
      setEta,
      setRetryCount,
      setMaxRetries,
      setText
    }
    handleStatusMessage(ws, { wp, we, wsp, weta, wrc, wmr, wtxt }, dispatch)
  }
}
