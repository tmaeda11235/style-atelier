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
  setMaxRetries: React.Dispatch<React.SetStateAction<number>>,
  setText: React.Dispatch<React.SetStateAction<string>>
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
      setMaxRetries,
      setText
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
    setMaxRetries,
    setText
  ])
}

function useWebLlmState() {
  const [status, setStatus] = useState<DownloadStatus>("idle")
  const [progress, setProgress] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [speed, setSpeed] = useState<number>(0)
  const [eta, setEta] = useState<number>(0)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [maxRetries, setMaxRetries] = useState<number>(0)
  const [text, setText] = useState<string>("")

  const resetStats = () => {
    setSpeed(0)
    setEta(0)
    setRetryCount(0)
    setMaxRetries(0)
    setText("")
  }

  return {
    status,
    setStatus,
    progress,
    setProgress,
    error,
    setError,
    speed,
    setSpeed,
    eta,
    setEta,
    retryCount,
    setRetryCount,
    maxRetries,
    setMaxRetries,
    text,
    setText,
    resetStats
  }
}

export function useWebLlm() {
  const state = useWebLlmState()

  useWebLlmEffect(
    state.setStatus,
    state.setProgress,
    state.setError,
    state.setSpeed,
    state.setEta,
    state.setRetryCount,
    state.setMaxRetries,
    state.setText
  )

  return {
    status: state.status,
    progress: state.progress,
    error: state.error,
    speed: state.speed,
    eta: state.eta,
    retryCount: state.retryCount,
    maxRetries: state.maxRetries,
    text: state.text,
    startDownload: () => {
      state.resetStats()
      startDownloadHelper(state.setStatus, state.setProgress, state.setError)
    },
    purgeCache: () => {
      state.resetStats()
      purgeCacheHelper(state.setStatus, state.setProgress, state.setError)
    },
    checkCurrentState: () =>
      checkCurrentStateHelper(state.setStatus, state.setProgress),
    runInference: (
      prompt: string,
      systemPrompt?: string,
      temperature?: number
    ) => runInferenceHelper(prompt, systemPrompt, temperature)
  }
}
