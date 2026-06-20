import type React from "react"

import type { DownloadStatus } from "./webLlmUtils"

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
  setWebGpuFallback?: React.Dispatch<React.SetStateAction<boolean>>
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
    dispatch.setError((prev) =>
      prev === "both-unsupported" ? "both-unsupported" : null
    )
    return true
  }
  if (ws === "engine-ready") {
    dispatch.setEngineStatus("ready")
    dispatch.setProgress(100)
    dispatch.setSpeed(0)
    dispatch.setEta(0)
    dispatch.setText("")
    dispatch.setError((prev) =>
      prev === "both-unsupported" ? "both-unsupported" : null
    )
    return true
  }
  return false
}

/* eslint-disable-next-line max-lines-per-function */
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
  if (ws === "webgpu-fallback-warn") {
    if (dispatch.setWebGpuFallback) {
      dispatch.setWebGpuFallback(true)
    }
  } else if (ws === "downloading") {
    dispatch.setStatus((prev) =>
      prev === "unsupported" ? "unsupported" : "downloading"
    )
    dispatch.setProgress(payload.wp ?? 0)
    dispatch.setSpeed(payload.wsp ?? 0)
    dispatch.setEta(payload.weta ?? 0)
    dispatch.setText(payload.wtxt ?? "")
    dispatch.setError((prev) =>
      prev === "both-unsupported" ? "both-unsupported" : null
    )
  } else if (ws === "retrying") {
    dispatch.setStatus((prev) =>
      prev === "unsupported" ? "unsupported" : "retrying"
    )
    dispatch.setRetryCount(payload.wrc ?? 0)
    dispatch.setMaxRetries(payload.wmr ?? 0)
    dispatch.setText("")
    dispatch.setError((prev) =>
      prev === "both-unsupported"
        ? "both-unsupported"
        : (payload.we ?? "Connection lost, retrying...")
    )
  } else if (ws === "ready") {
    dispatch.setStatus((prev) =>
      prev === "unsupported" ? "unsupported" : "ready"
    )
    dispatch.setEngineStatus("ready")
    dispatch.setProgress(100)
    dispatch.setSpeed(0)
    dispatch.setEta(0)
    dispatch.setText("")
    dispatch.setError((prev) =>
      prev === "both-unsupported" ? "both-unsupported" : null
    )
  } else if (ws === "error") {
    dispatch.setStatus((prev) =>
      prev === "unsupported" ? "unsupported" : "error"
    )
    dispatch.setEngineStatus("idle")
    dispatch.setSpeed(0)
    dispatch.setEta(0)
    dispatch.setText("")
    dispatch.setError((prev) =>
      prev === "both-unsupported"
        ? "both-unsupported"
        : (payload.we ?? "Unknown worker error")
    )
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
  setText: React.Dispatch<React.SetStateAction<string>>,
  setWebGpuFallback?: React.Dispatch<React.SetStateAction<boolean>>
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

    // Output detailed progress logs to allow tracing download vs compilation phases
    console.log(
      `[WebLLM Progress Trace] status="${ws}", progress=${wp ?? 0}%, speed=${wsp ?? 0}MB/s, text="${wtxt || ""}"`
    )

    const dispatch: Dispatchers = {
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
    }
    handleStatusMessage(ws, { wp, we, wsp, weta, wrc, wmr, wtxt }, dispatch)
  }
}
