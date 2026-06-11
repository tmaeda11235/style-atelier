import { useEffect, useState } from "react"

import {
  checkCurrentStateHelper,
  createMessageListener,
  purgeCacheHelper,
  runInferenceHelper,
  startDownloadHelper,
  type DownloadStatus
} from "./webLlmUtils"

export type { DownloadStatus }

function useWebLlmEffect(
  setStatus: React.Dispatch<React.SetStateAction<DownloadStatus>>,
  setProgress: React.Dispatch<React.SetStateAction<number>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setSpeed: React.Dispatch<React.SetStateAction<number>>,
  setEta: React.Dispatch<React.SetStateAction<number>>,
  setRetryCount: React.Dispatch<React.SetStateAction<number>>,
  setMaxRetries: React.Dispatch<React.SetStateAction<number>>
) {
  useEffect(() => {
    if (
      typeof chrome === "undefined" ||
      !chrome.runtime ||
      !chrome.runtime.sendMessage
    ) {
      return
    }
    const port = chrome.runtime.connect({ name: "sidepanel" })
    const messageListener = createMessageListener(
      setStatus,
      setProgress,
      setError,
      setSpeed,
      setEta,
      setRetryCount,
      setMaxRetries
    )
    chrome.runtime.onMessage.addListener(messageListener)
    checkCurrentStateHelper(setStatus, setProgress)
    return () => {
      port.disconnect()
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [
    setStatus,
    setProgress,
    setError,
    setSpeed,
    setEta,
    setRetryCount,
    setMaxRetries
  ])
}

export function useWebLlm() {
  const [status, setStatus] = useState<DownloadStatus>("idle")
  const [progress, setProgress] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [speed, setSpeed] = useState<number>(0)
  const [eta, setEta] = useState<number>(0)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [maxRetries, setMaxRetries] = useState<number>(0)

  useWebLlmEffect(
    setStatus,
    setProgress,
    setError,
    setSpeed,
    setEta,
    setRetryCount,
    setMaxRetries
  )

  const resetStats = () => {
    setSpeed(0)
    setEta(0)
    setRetryCount(0)
    setMaxRetries(0)
  }

  return {
    status,
    progress,
    error,
    speed,
    eta,
    retryCount,
    maxRetries,
    startDownload: () => {
      resetStats()
      startDownloadHelper(setStatus, setProgress, setError)
    },
    purgeCache: () => {
      resetStats()
      purgeCacheHelper(setStatus, setProgress, setError)
    },
    checkCurrentState: () => checkCurrentStateHelper(setStatus, setProgress),
    runInference: (
      prompt: string,
      systemPrompt?: string,
      temperature?: number
    ) => runInferenceHelper(prompt, systemPrompt, temperature)
  }
}
