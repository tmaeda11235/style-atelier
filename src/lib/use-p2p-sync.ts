import React, { useEffect, useRef, useState } from "react"

import { P2PConnection } from "./p2p-connection"
import { WebSocketSignalingChannel } from "./p2p-signaling"
import {
  decryptSyncData,
  encryptSyncData,
  mergeIncomingSyncData,
  prepareOutgoingSyncData
} from "./p2p-sync-manager"
import { generateQRCodeUrl } from "./qr-utils"

export type SyncRole = "idle" | "host" | "guest"
export type SyncStatus =
  | "setup"
  | "connecting"
  | "connected"
  | "syncing"
  | "success"
  | "error"

interface HostConnectionParams {
  wsUrl: string
  key: string
  t: any
  setStatus: (s: SyncStatus) => void
  setStatusMessage: (m: string) => void
  setProcessedCount: (c: { cards: number; categories: number }) => void
  handleError: (err: Error) => void
  connectionRef: React.MutableRefObject<P2PConnection | null>
}

function initHostConnection({
  wsUrl,
  key,
  t,
  setStatus,
  setStatusMessage,
  setProcessedCount,
  handleError,
  connectionRef
}: HostConnectionParams) {
  const sigChannel = new WebSocketSignalingChannel(wsUrl)
  connectionRef.current = new P2PConnection({
    signalingChannel: sigChannel,
    isHost: true,
    onStatusChange: (s) => {
      if (s === "datachannel-open") {
        setStatus("connected")
        setStatusMessage(t?.connected || "Device connected. Ready to sync.")
      } else if (s.startsWith("connection-state-failed")) {
        handleError(new Error("P2P Connection failed"))
      }
    },
    onMessageReceived: async (encryptedPayload) => {
      setStatus("syncing")
      setStatusMessage(t?.receiving || "Receiving and decrypting data...")
      try {
        const decrypted = await decryptSyncData(encryptedPayload, key)
        const mergeResult = await mergeIncomingSyncData(decrypted)
        if (mergeResult.success) {
          setProcessedCount({
            cards: mergeResult.cardsCount,
            categories: mergeResult.categoriesCount
          })
          setStatus("success")
          setStatusMessage(t?.syncSuccess || "Sync completed successfully!")
        } else {
          throw new Error("Merge failed")
        }
      } catch (err: any) {
        handleError(err)
      }
    },
    onError: handleError
  })
}

interface GuestConnectionParams {
  key: string
  wsUrl: string
  t: any
  setStatus: (s: SyncStatus) => void
  setStatusMessage: (m: string) => void
  handleError: (err: Error) => void
  connectionRef: React.MutableRefObject<P2PConnection | null>
}

function initGuestConnection({
  key,
  wsUrl,
  t,
  setStatus,
  setStatusMessage,
  handleError,
  connectionRef
}: GuestConnectionParams) {
  const sigChannel = new WebSocketSignalingChannel(wsUrl)
  connectionRef.current = new P2PConnection({
    signalingChannel: sigChannel,
    isHost: false,
    onStatusChange: async (s) => {
      if (s === "datachannel-open") {
        setStatus("syncing")
        setStatusMessage(t?.sending || "Encrypting and sending local data...")
        try {
          const syncData = await prepareOutgoingSyncData()
          const encrypted = await encryptSyncData(syncData, key)
          connectionRef.current?.send(encrypted)
          setStatus("success")
          setStatusMessage(t?.syncSuccess || "Data synced successfully!")
        } catch (err: any) {
          handleError(err)
        }
      } else if (s.startsWith("connection-state-failed")) {
        handleError(new Error("P2P connection failed to establish"))
      }
    },
    onError: handleError
  })
}

function stopScanning(
  setIsScanning: (s: boolean) => void,
  scanIntervalRef: React.MutableRefObject<any>,
  videoRef: React.RefObject<HTMLVideoElement>
) {
  setIsScanning(false)
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
  setStatus: (s: SyncStatus) => void,
  setErrorMessage: (m: string) => void,
  connectionRef: React.MutableRefObject<P2PConnection | null>,
  stopScanningFn: () => void
) {
  console.error("[P2PSyncUI] Error occurred:", err)
  setStatus("error")
  setErrorMessage(
    err.message || "An unknown error occurred during synchronization."
  )
  if (connectionRef.current) {
    connectionRef.current.close()
    connectionRef.current = null
  }
  stopScanningFn()
}

interface StartHostParams {
  connectionRef: React.MutableRefObject<P2PConnection | null>
  setRole: (r: SyncRole) => void
  setStatus: (s: SyncStatus) => void
  setStatusMessage: (m: string) => void
  setQrCodeDataUrl: (url: string | null) => void
  setProcessedCount: (c: { cards: number; categories: number }) => void
  handleError: (err: Error) => void
  t: any
}

async function startHost({
  connectionRef,
  setRole,
  setStatus,
  setStatusMessage,
  setQrCodeDataUrl,
  setProcessedCount,
  handleError: handleErrorFn,
  t
}: StartHostParams) {
  if (connectionRef.current) {
    connectionRef.current.close()
    connectionRef.current = null
  }
  setRole("host")
  setStatus("setup")
  setStatusMessage(t?.hostInit || "Initializing sync host...")
  try {
    const room = Math.random().toString(36).substring(2, 12)
    const key = Math.random().toString(36).substring(2, 12)
    const port = (window as any).__SIGNALING_PORT || "9000"
    const wsUrl = `ws://${window.location.hostname || "localhost"}:${port}?roomId=${room}`
    const syncUrl = `${window.location.origin}${window.location.pathname}?p2proom=${room}&p2pkey=${key}&p2pserver=${encodeURIComponent(wsUrl)}`
    ;(window as any).__lastSyncUrl = syncUrl

    const qrDataUrl = await generateQRCodeUrl(syncUrl, 250)
    setQrCodeDataUrl(qrDataUrl)
    setStatus("connecting")
    setStatusMessage(
      t?.hostWaiting || "Waiting for remote device to scan QR..."
    )
    initHostConnection({
      wsUrl,
      key,
      t,
      setStatus,
      setStatusMessage,
      setProcessedCount,
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
  setIsScanning: (s: boolean) => void,
  videoRef: React.RefObject<HTMLVideoElement>,
  scanIntervalRef: React.MutableRefObject<any>,
  scanQRFrameFn: () => void
) {
  setIsScanning(true)
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
    setIsScanning(false)
  }
}

interface ConnectGuestParams {
  key: string
  wsUrl: string
  connectionRef: React.MutableRefObject<P2PConnection | null>
  setStatus: (s: SyncStatus) => void
  setStatusMessage: (m: string) => void
  handleError: (err: Error) => void
  t: any
}

function connectAsGuest({
  key,
  wsUrl,
  connectionRef,
  setStatus,
  setStatusMessage,
  handleError: handleErrorFn,
  t
}: ConnectGuestParams) {
  if (connectionRef.current) {
    connectionRef.current.close()
    connectionRef.current = null
  }
  setStatus("connecting")
  setStatusMessage(t?.guestConnecting || "Connecting to signaling server...")
  try {
    initGuestConnection({
      key,
      wsUrl,
      t,
      setStatus,
      setStatusMessage,
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

export function useP2PSync(t: any) {
  const [role, setRole] = useState<SyncRole>("idle")
  const [status, setStatus] = useState<SyncStatus>("setup")
  const [statusMessage, setStatusMessage] = useState("")
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [processedCount, setProcessedCount] = useState({
    cards: 0,
    categories: 0
  })
  const [errorMessage, setErrorMessage] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [scanInputUrl, setScanInputUrl] = useState("")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const connectionRef = useRef<P2PConnection | null>(null)
  const scanIntervalRef = useRef<any>(null)

  const stop = () => stopScanning(setIsScanning, scanIntervalRef, videoRef)
  const err = (e: Error) =>
    handleError(e, setStatus, setErrorMessage, connectionRef, stop)
  const host = () =>
    startHost({
      connectionRef,
      setRole,
      setStatus,
      setStatusMessage,
      setQrCodeDataUrl,
      setProcessedCount,
      handleError: err,
      t
    })
  const decoded = (url: string) =>
    handleDecodedUrl(
      url,
      (key, wsUrl) =>
        connectAsGuest({
          key,
          wsUrl,
          connectionRef,
          setStatus,
          setStatusMessage,
          handleError: err,
          t
        }),
      err
    )
  const scanFrame = () =>
    scanQRFrame(videoRef, canvasRef, isScanning, stop, decoded)
  const guestScan = () => {
    setRole("guest")
    setStatus("setup")
    setErrorMessage("")
    startGuestScan(setIsScanning, videoRef, scanIntervalRef, scanFrame)
  }

  const manualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (scanInputUrl) decoded(scanInputUrl)
  }

  const resetState = () => {
    if (connectionRef.current) connectionRef.current.close()
    stop()
    setRole("idle")
    setStatus("setup")
    setErrorMessage("")
    setQrCodeDataUrl(null)
    setScanInputUrl("")
  }

  useEffect(() => {
    const conn = connectionRef.current
    return () => {
      if (conn) conn.close()
      stop()
    }
  }, [])

  return {
    role,
    status,
    statusMessage,
    qrCodeDataUrl,
    processedCount,
    errorMessage,
    isScanning,
    scanInputUrl,
    setScanInputUrl,
    videoRef,
    canvasRef,
    startHost: host,
    startGuestScan: guestScan,
    handleManualUrlSubmit: manualSubmit,
    reset: resetState
  }
}
