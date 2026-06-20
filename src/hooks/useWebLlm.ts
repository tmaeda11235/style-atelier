import { useContext } from "react"

import {
  WebLlmContext,
  type WebLlmContextType
} from "../contexts/WebLlmContext"
import type { DownloadStatus } from "./webLlmUtils"

export type { DownloadStatus }

const defaultFallbackValue: WebLlmContextType = {
  status: "idle",
  engineStatus: "idle",
  isEngineReady: false,
  isEngineInitializing: false,
  progress: 0,
  error: null,
  speed: 0,
  eta: 0,
  retryCount: 0,
  maxRetries: 0,
  text: "",
  webGpuFallback: false,
  startDownload: () => {},
  purgeCache: () => {},
  checkCurrentState: () => {},
  preloadEngine: () => {},
  runInference: () => Promise.resolve("")
}

export function useWebLlm() {
  const context = useContext(WebLlmContext)
  return context !== undefined ? context : defaultFallbackValue
}
