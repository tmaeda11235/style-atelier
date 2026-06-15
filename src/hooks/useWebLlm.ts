import { useEffect, useState } from "react"

import { createMessageListener } from "./webLlmMessageListener"
import {
  checkCurrentStateHelper,
  purgeCacheHelper,
  runInferenceHelper,
  startDownloadHelper,
  type DownloadStatus
} from "./webLlmUtils"

export type { DownloadStatus }

interface WebLlmEffectProps {
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
  setWebGpuFallback: React.Dispatch<React.SetStateAction<boolean>>
}

// eslint-disable-next-line max-lines-per-function
function useWebLlmEffect(props: WebLlmEffectProps) {
  const {
    setStatus,
    setEngineStatus,
    setProgress,
    setError,
    setSpeed,
    setEta,
    setRetryCount,
    setMaxRetries,
    setText,
    setWebGpuFallback
  } = props

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
      setEngineStatus,
      setProgress,
      setError,
      setSpeed,
      setEta,
      setRetryCount,
      setMaxRetries,
      setText,
      setWebGpuFallback
    )
    chrome.runtime.onMessage.addListener(messageListener)
    checkCurrentStateHelper(setStatus, setProgress, setWebGpuFallback, setError)
    return () => {
      port.disconnect()
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [
    setStatus,
    setEngineStatus,
    setProgress,
    setError,
    setSpeed,
    setEta,
    setRetryCount,
    setMaxRetries,
    setText,
    setWebGpuFallback
  ])
}

function useWebLlmState() {
  const [status, setStatus] = useState<DownloadStatus>("idle")
  const [engineStatus, setEngineStatus] = useState<
    "idle" | "initializing" | "ready"
  >("idle")
  const [progress, setProgress] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [speed, setSpeed] = useState<number>(0)
  const [eta, setEta] = useState<number>(0)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [maxRetries, setMaxRetries] = useState<number>(0)
  const [text, setText] = useState<string>("")
  const [webGpuFallback, setWebGpuFallback] = useState<boolean>(false)

  const resetStats = () => {
    setSpeed(0)
    setEta(0)
    setRetryCount(0)
    setMaxRetries(0)
    setText("")
    setWebGpuFallback(false)
  }

  return {
    status,
    setStatus,
    engineStatus,
    setEngineStatus,
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
    webGpuFallback,
    setWebGpuFallback,
    resetStats
  }
}

function preloadEngineHelper() {
  if (
    typeof chrome === "undefined" ||
    !chrome.runtime ||
    !chrome.runtime.sendMessage
  ) {
    return
  }
  chrome.runtime.sendMessage({ target: "offscreen", action: "preload-engine" })
}

// eslint-disable-next-line max-lines-per-function
export function useWebLlm() {
  const state = useWebLlmState()

  useWebLlmEffect({
    setStatus: state.setStatus,
    setEngineStatus: state.setEngineStatus,
    setProgress: state.setProgress,
    setError: state.setError,
    setSpeed: state.setSpeed,
    setEta: state.setEta,
    setRetryCount: state.setRetryCount,
    setMaxRetries: state.setMaxRetries,
    setText: state.setText,
    setWebGpuFallback: state.setWebGpuFallback
  })

  return {
    status: state.status,
    engineStatus: state.engineStatus,
    isEngineReady: state.engineStatus === "ready",
    isEngineInitializing: state.engineStatus === "initializing",
    progress: state.progress,
    error: state.error,
    speed: state.speed,
    eta: state.eta,
    retryCount: state.retryCount,
    maxRetries: state.maxRetries,
    text: state.text,
    webGpuFallback: state.webGpuFallback,
    startDownload: () => {
      state.resetStats()
      startDownloadHelper(
        state.setStatus,
        state.setProgress,
        state.setError,
        state.setWebGpuFallback
      )
    },
    purgeCache: () => {
      state.resetStats()
      purgeCacheHelper(state.setStatus, state.setProgress, state.setError)
    },
    checkCurrentState: () =>
      checkCurrentStateHelper(
        state.setStatus,
        state.setProgress,
        state.setWebGpuFallback,
        state.setError
      ),
    preloadEngine: preloadEngineHelper,
    runInference: runInferenceHelper
  }
}
