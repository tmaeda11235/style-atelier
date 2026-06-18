import React, { useEffect, useRef, useState } from "react"

import { P2PConnection } from "./p2p-connection"
import {
  initGuestConnection,
  initHostConnection
} from "./p2p-connection-helpers"
import type { SyncState, SyncStateUpdater } from "./p2p-connection-helpers"
import { generateQRCodeUrl } from "./qr-utils"

function stopScanning(
  updateState: SyncStateUpdater,
  scanIntervalRef: React.MutableRefObject<any>,
  videoRef: React.RefObject<HTMLVideoElement>
) {
  updateState({ isScanning: false })
  if (scanIntervalRef.current) {
    clearInterval(scanIntervalRef.current)
    scanIntervalRef.current = null
  }
  if (videoRef.current && videoRef.current.srcObject) {
    const stream = videoRef.current.srcObject as MediaStream
    stream.getTracks().forEach((track) => track.stop())
    videoRef.current.srcObject = null
  }
}

function handleError(
  err: Error,
  updateState: SyncStateUpdater,
  connectionRef: React.MutableRefObject<P2PConnection | null>,
  stopScanningFn: () => void
) {
  updateState({
    status: "error",
    errorMessage:
      err.message || "An unknown error occurred during synchronization."
  })
  if (connectionRef.current) {
    connectionRef.current.close()
    connectionRef.current = null
  }
  stopScanningFn()
}

interface StartHostParams {
  connectionRef: React.MutableRefObject<P2PConnection | null>
  updateState: SyncStateUpdater
  handleError: (err: Error) => void
  t: any
}

async function startHost({
  connectionRef,
  updateState,
  handleError: handleErrorFn,
  t
}: StartHostParams) {
  if (connectionRef.current) connectionRef.current.close()
  updateState({
    role: "host",
    status: "setup",
    statusMessage: t?.hostInit || "Initializing sync host..."
  })
  try {
    const room = Math.random().toString(36).substring(2, 12)
    const key = Math.random().toString(36).substring(2, 12)
    const port = (window as any).__SIGNALING_PORT || "9000"
    const wsUrl = `ws://${window.location.hostname || "localhost"}:${port}?roomId=${room}`
    const syncUrl = `${window.location.origin}${window.location.pathname}?p2proom=${room}&p2pkey=${key}&p2pserver=${encodeURIComponent(wsUrl)}`
    ;(window as any).__lastSyncUrl = syncUrl

    const qrDataUrl = await generateQRCodeUrl(syncUrl, 250)
    updateState({
      qrCodeDataUrl: qrDataUrl,
      status: "connecting",
      statusMessage: t?.hostWaiting || "Waiting for remote device to scan QR..."
    })
    initHostConnection({
      wsUrl,
      key,
      t,
      updateState,
      handleError: handleErrorFn,
      connectionRef
    })
  } catch (err: any) {
    handleErrorFn(err)
  }
}

async function scanQRFrame(
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isScanning: boolean,
  stopScanningFn: () => void,
  handleDecodedUrlFn: (url: string) => void
) {
  const video = videoRef.current
  const canvas = canvasRef.current
  if (
    !video ||
    !canvas ||
    !isScanning ||
    video.readyState !== video.HAVE_ENOUGH_DATA
  )
    return
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { default: jsQR } = await import("jsqr")
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "dontInvert"
  })
  if (code) {
    stopScanningFn()
    handleDecodedUrlFn(code.data)
  }
}

async function startGuestScan(
  updateState: SyncStateUpdater,
  videoRef: React.RefObject<HTMLVideoElement>,
  scanIntervalRef: React.MutableRefObject<any>,
  scanQRFrameFn: () => void
) {
  updateState({ isScanning: true })
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    })
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.setAttribute("playsinline", "true")
      videoRef.current.play()
      scanIntervalRef.current = setInterval(scanQRFrameFn, 300)
    }
  } catch (err) {
    console.warn(
      "Camera not available or access denied. Please paste the URL manually.",
      err
    )
    updateState({ isScanning: false })
  }
}

interface ConnectGuestParams {
  key: string
  wsUrl: string
  connectionRef: React.MutableRefObject<P2PConnection | null>
  updateState: SyncStateUpdater
  handleError: (err: Error) => void
  t: any
}

function connectAsGuest({
  key,
  wsUrl,
  connectionRef,
  updateState,
  handleError: handleErrorFn,
  t
}: ConnectGuestParams) {
  if (connectionRef.current) connectionRef.current.close()
  updateState({
    status: "connecting",
    statusMessage: t?.guestConnecting || "Connecting to signaling server..."
  })
  try {
    initGuestConnection({
      key,
      wsUrl,
      t,
      updateState,
      handleError: handleErrorFn,
      connectionRef
    })
  } catch (err: any) {
    handleErrorFn(err)
  }
}

function handleDecodedUrl(
  url: string,
  connectAsGuestFn: (key: string, wsUrl: string) => void,
  handleErrorFn: (err: Error) => void
) {
  try {
    const parsedUrl = new URL(url)
    const room = parsedUrl.searchParams.get("p2proom")
    const key = parsedUrl.searchParams.get("p2pkey")
    const server = parsedUrl.searchParams.get("p2pserver")
    if (!room || !key || !server) throw new Error("Invalid sync QR URL format")
    connectAsGuestFn(key, decodeURIComponent(server))
  } catch (err: any) {
    handleErrorFn(new Error("Failed to parse QR Code: " + err.message))
  }
}

function triggerGuestScan(
  update: SyncStateUpdater,
  videoRef: React.RefObject<HTMLVideoElement>,
  scanIntervalRef: React.MutableRefObject<any>,
  scanFrameFn: () => void
) {
  update({ role: "guest", status: "setup", errorMessage: "" })
  startGuestScan(update, videoRef, scanIntervalRef, scanFrameFn)
}

function triggerReset(
  connectionRef: React.MutableRefObject<P2PConnection | null>,
  stopFn: () => void,
  update: SyncStateUpdater
) {
  if (connectionRef.current) connectionRef.current.close()
  stopFn()
  update({
    role: "idle",
    status: "setup",
    errorMessage: "",
    qrCodeDataUrl: null,
    scanInputUrl: ""
  })
}

function triggerManualSubmit(
  e: React.FormEvent,
  scanInputUrl: string,
  decodedFn: (url: string) => void
) {
  e.preventDefault()
  if (scanInputUrl) decodedFn(scanInputUrl)
}

const initialSyncState: SyncState = {
  role: "idle",
  status: "setup",
  statusMessage: "",
  qrCodeDataUrl: null,
  processedCount: { cards: 0, categories: 0 },
  errorMessage: "",
  isScanning: false,
  scanInputUrl: ""
}

export function useP2PSync(t: any) {
  const [state, setState] = useState<SyncState>(initialSyncState)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const connectionRef = useRef<P2PConnection | null>(null)
  const scanIntervalRef = useRef<any>(null)

  const update = (f: Partial<SyncState>) =>
    setState((prev) => ({ ...prev, ...f }))
  const stop = () => stopScanning(update, scanIntervalRef, videoRef)
  const err = (e: Error) => handleError(e, update, connectionRef, stop)
  const host = () =>
    startHost({ connectionRef, updateState: update, handleError: err, t })
  const decoded = (url: string) =>
    handleDecodedUrl(
      url,
      (key, ws) =>
        connectAsGuest({
          key,
          wsUrl: ws,
          connectionRef,
          updateState: update,
          handleError: err,
          t
        }),
      err
    )
  const scanFrame = () =>
    scanQRFrame(videoRef, canvasRef, state.isScanning, stop, decoded)

  useEffect(() => {
    const conn = connectionRef.current
    return () => {
      if (conn) conn.close()
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    ...state,
    setScanInputUrl: (url: string) => update({ scanInputUrl: url }),
    videoRef,
    canvasRef,
    startHost: host,
    startGuestScan: () =>
      triggerGuestScan(update, videoRef, scanIntervalRef, scanFrame),
    handleManualUrlSubmit: (e: React.FormEvent) =>
      triggerManualSubmit(e, state.scanInputUrl, decoded),
    reset: () => triggerReset(connectionRef, stop, update)
  }
}
