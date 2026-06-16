import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react"

import { createMessageListener } from "../hooks/webLlmMessageListener"
import {
  checkCurrentStateHelper,
  purgeCacheHelper,
  runInferenceHelper,
  startDownloadHelper,
  type DownloadStatus
} from "../hooks/webLlmUtils"
import { isExtensionContextValid, safeSendMessage } from "../lib/chrome-utils"

export interface WebLlmContextType {
  status: DownloadStatus
  engineStatus: "idle" | "initializing" | "ready"
  isEngineReady: boolean
  isEngineInitializing: boolean
  progress: number
  error: string | null
  speed: number
  eta: number
  retryCount: number
  maxRetries: number
  text: string
  startDownload: () => void
  purgeCache: () => void
  checkCurrentState: () => void
  preloadEngine: () => void
  runInference: (prompt: string, options?: any) => Promise<string>
}

export const WebLlmContext = createContext<WebLlmContextType | undefined>(
  undefined
)

function preloadEngineHelper() {
  safeSendMessage({ target: "offscreen", action: "preload-engine" })?.catch(
    (err) => console.error("preloadEngineHelper failed:", err)
  )
}

function useWebLlmProviderStates() {
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

function useWebLlmEffect(props: WebLlmEffectProps) {
  useEffect(() => {
    if (!isExtensionContextValid()) {
      return
    }
    try {
      const port = chrome.runtime.connect({ name: "sidepanel" })
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
      chrome.runtime.onMessage.addListener(messageListener)
      checkCurrentStateHelper(props.setStatus, props.setProgress)
      return () => {
        try {
          port.disconnect()
        } catch {
          // ignore
        }
        try {
          chrome.runtime.onMessage.removeListener(messageListener)
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn("Failed to setup WebLLM message listener:", err)
    }
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

export const WebLlmProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const states = useWebLlmProviderStates()
  useWebLlmEffect(states)

  const resetStats = useCallback(() => {
    states.setSpeed(0)
    states.setEta(0)
    states.setRetryCount(0)
    states.setMaxRetries(0)
    states.setText("")
  }, [states])

  const startDownload = useCallback(() => {
    resetStats()
    startDownloadHelper(states.setStatus, states.setProgress, states.setError)
  }, [resetStats, states])

  const purgeCache = useCallback(() => {
    resetStats()
    purgeCacheHelper(states.setStatus, states.setProgress, states.setError)
  }, [resetStats, states])

  const value: WebLlmContextType = {
    status: states.status,
    engineStatus: states.engineStatus,
    isEngineReady: states.engineStatus === "ready",
    isEngineInitializing: states.engineStatus === "initializing",
    progress: states.progress,
    error: states.error,
    speed: states.speed,
    text: states.text,
    eta: states.eta,
    retryCount: states.retryCount,
    maxRetries: states.maxRetries,
    startDownload,
    purgeCache,
    checkCurrentState: useCallback(() => {
      checkCurrentStateHelper(states.setStatus, states.setProgress)
    }, [states]),
    preloadEngine: preloadEngineHelper,
    runInference: runInferenceHelper
  }

  return (
    <WebLlmContext.Provider value={value}>{children}</WebLlmContext.Provider>
  )
}

export const useWebLlmContext = () => {
  const context = useContext(WebLlmContext)
  if (context === undefined) {
    throw new Error("useWebLlmContext must be used within a WebLlmProvider")
  }
  return context
}
