import { useEffect, useState } from "react"

import { isExtensionContextValid, safeSendMessage } from "../lib/chrome-utils"
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
}

function setupWebLlmConnection(
  props: WebLlmEffectProps
): (() => void) | undefined {
  if (!isExtensionContextValid()) {
    props.setError("接続が切断されました。ページをリロードしてください。")
    return
  }
  let port: chrome.runtime.Port | undefined
  try {
    port = chrome.runtime.connect({ name: "sidepanel" })
  } catch (err) {
    console.error("Failed to connect port:", err)
    props.setError("接続が切断されました。ページをリロードしてください。")
    return
  }
  const messageListener = createMessageListener(
    props.setStatus,
    props.setEngineStatus,
    props.setProgress,
    props.setError,
    props.setSpeed,
    props.setEta,
    props.setRetryCount,
    props.setMaxRetries,
    props.setText
  )
  try {
    chrome.runtime.onMessage.addListener(messageListener)
  } catch (err) {
    console.error("Failed to add message listener:", err)
  }
  checkCurrentStateHelper(props.setStatus, props.setProgress, props.setError)
  return () => {
    if (port) {
      try {
        port.disconnect()
      } catch {
        // ignore
      }
    }
    try {
      chrome.runtime.onMessage.removeListener(messageListener)
    } catch {
      // ignore
    }
  }
}

function useWebLlmEffect(props: WebLlmEffectProps) {
  useEffect(() => {
    return setupWebLlmConnection(props)
  }, [
    props.setStatus,
    props.setEngineStatus,
    props.setProgress,
    props.setError,
    props.setSpeed,
    props.setEta,
    props.setRetryCount,
    props.setMaxRetries,
    props.setText
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
    resetStats
  }
}

function preloadEngineHelper() {
  safeSendMessage({ target: "offscreen", action: "preload-engine" }).catch(
    (err) => {
      console.error("preloadEngineHelper error:", err)
    }
  )
}

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
    setText: state.setText
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
    startDownload: () => {
      state.resetStats()
      startDownloadHelper(state.setStatus, state.setProgress, state.setError)
    },
    purgeCache: () => {
      state.resetStats()
      purgeCacheHelper(state.setStatus, state.setProgress, state.setError)
    },
    checkCurrentState: () =>
      checkCurrentStateHelper(
        state.setStatus,
        state.setProgress,
        state.setError
      ),
    preloadEngine: preloadEngineHelper,
    runInference: runInferenceHelper
  }
}
