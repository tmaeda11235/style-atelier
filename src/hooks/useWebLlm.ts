import { useContext, useEffect, useState } from "react"

import { WebLlmContext } from "../contexts/WebLlmContext"
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

function preloadEngineHelper() {
  safeSendMessage({ target: "offscreen", action: "preload-engine" }).catch(
    (err) => {
      console.error("preloadEngineHelper error:", err)
    }
  )
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

function useWebLlmStates() {
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
    setText
  }
}

function useLocalWebLlm() {
  const states = useWebLlmStates()
  useWebLlmEffect(states)

  const resetStats = () => {
    states.setSpeed(0)
    states.setEta(0)
    states.setRetryCount(0)
    states.setMaxRetries(0)
    states.setText("")
  }

  return {
    status: states.status,
    engineStatus: states.engineStatus,
    isEngineReady: states.engineStatus === "ready",
    isEngineInitializing: states.engineStatus === "initializing",
    progress: states.progress,
    error: states.error,
    speed: states.speed,
    eta: states.eta,
    retryCount: states.retryCount,
    maxRetries: states.maxRetries,
    text: states.text,
    startDownload: () => {
      resetStats()
      startDownloadHelper(states.setStatus, states.setProgress, states.setError)
    },
    purgeCache: () => {
      resetStats()
      purgeCacheHelper(states.setStatus, states.setProgress, states.setError)
    },
    checkCurrentState: () =>
      checkCurrentStateHelper(
        states.setStatus,
        states.setProgress,
        states.setError
      ),
    preloadEngine: preloadEngineHelper,
    runInference: runInferenceHelper
  }
}

export function useWebLlm() {
  const context = useContext(WebLlmContext)
  const local = useLocalWebLlm()
  return context !== undefined ? context : local
}
