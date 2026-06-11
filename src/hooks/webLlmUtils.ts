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
      requiredBytes: 1.5 * 1024 * 1024 * 1024
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

export function createMessageListener(
  setStatus: React.Dispatch<React.SetStateAction<DownloadStatus>>,
  setProgress: React.Dispatch<React.SetStateAction<number>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setSpeed: React.Dispatch<React.SetStateAction<number>>,
  setEta: React.Dispatch<React.SetStateAction<number>>,
  setRetryCount: React.Dispatch<React.SetStateAction<number>>,
  setMaxRetries: React.Dispatch<React.SetStateAction<number>>
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
      maxRetries: wmr
    } = message.payload || {}
    if (ws === "downloading") {
      setStatus("downloading")
      setProgress(wp ?? 0)
      setSpeed(wsp ?? 0)
      setEta(weta ?? 0)
      setError(null)
    } else if (ws === "retrying") {
      setStatus("retrying")
      setRetryCount(wrc ?? 0)
      setMaxRetries(wmr ?? 0)
      setError(we ?? "Connection lost, retrying...")
    } else if (ws === "ready") {
      setStatus("ready")
      setProgress(100)
      setSpeed(0)
      setEta(0)
      setError(null)
    } else if (ws === "error") {
      setStatus("error")
      setSpeed(0)
      setEta(0)
      setError(we ?? "Unknown worker error")
    }
  }
}
