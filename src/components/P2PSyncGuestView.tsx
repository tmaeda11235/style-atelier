import { CheckCircle, Loader2 } from "lucide-react"
import React from "react"

import { P2PSyncErrorView } from "./P2PSyncCommonViews"

interface P2PSyncGuestViewProps {
  status: string
  statusMessage: string
  scanInputUrl: string
  setScanInputUrl: (val: string) => void
  isScanning: boolean
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  errorMessage: string
  t: any
  onConnect: (e: React.FormEvent) => void
  onReset: () => void
  onRetry: () => void
}

interface SetupViewProps {
  isScanning: boolean
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  scanInputUrl: string
  setScanInputUrl: (val: string) => void
  t: any
  onConnect: (e: React.FormEvent) => void
}

function P2PGuestSetupView({
  isScanning,
  videoRef,
  canvasRef,
  scanInputUrl,
  setScanInputUrl,
  t,
  onConnect
}: SetupViewProps) {
  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-sm">
      {isScanning ? (
        <div className="relative w-full aspect-square max-w-[280px] bg-black rounded-lg overflow-hidden border border-border shadow-inner">
          <video ref={videoRef} className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-4 border-2 border-dashed border-blue-500/60 rounded-md pointer-events-none animate-pulse" />
        </div>
      ) : (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs text-text-secondary border border-border">
          {t?.cameraError ||
            "Camera input is unavailable. Please input the sync URL below manually."}
        </div>
      )}
      <form onSubmit={onConnect} className="w-full space-y-3">
        <div className="flex flex-col items-start space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary">
            {t?.manualUrlLabel || "Or paste Sync URL:"}
          </label>
          <input
            type="text"
            value={scanInputUrl}
            onChange={(e) => setScanInputUrl(e.target.value)}
            placeholder="style-atelier://sync?roomId=..."
            className="w-full text-xs px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">
          {t?.connectBtn || "Connect"}
        </button>
      </form>
    </div>
  )
}

function P2PGuestSuccessView({ t, onReset }: { t: any; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center space-y-4 py-6">
      <CheckCircle className="w-14 h-14 text-green-500" />
      <h4 className="text-base font-bold text-text-primary">
        {t?.syncSuccess || "Data Sent successfully!"}
      </h4>
      <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
        {t?.guestSuccessDesc ||
          "All cards and custom collections have been encrypted and transmitted. Check the receiver screen for completion details."}
      </p>
      <button
        onClick={onReset}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
        {t?.doneBtn || "Done"}
      </button>
    </div>
  )
}

export function P2PSyncGuestView({
  status,
  statusMessage,
  scanInputUrl,
  setScanInputUrl,
  isScanning,
  videoRef,
  canvasRef,
  errorMessage,
  t,
  onConnect,
  onReset,
  onRetry
}: P2PSyncGuestViewProps) {
  return (
    <div className="flex flex-col items-center p-6 space-y-6 text-center animate-in fade-in duration-300">
      <h3 className="text-base font-bold text-text-primary">
        {t?.sendTitle || "P2P Sync Sender Mode"}
      </h3>
      {status === "setup" && (
        <P2PGuestSetupView
          isScanning={isScanning}
          videoRef={videoRef}
          canvasRef={canvasRef}
          scanInputUrl={scanInputUrl}
          setScanInputUrl={setScanInputUrl}
          t={t}
          onConnect={onConnect}
        />
      )}
      {(status === "connecting" || status === "syncing") && (
        <div className="flex flex-col items-center space-y-4 py-8">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-sm font-semibold text-text-primary">
            {statusMessage}
          </p>
        </div>
      )}
      {status === "success" && <P2PGuestSuccessView t={t} onReset={onReset} />}
      {status === "error" && (
        <P2PSyncErrorView
          t={t}
          errorMessage={errorMessage}
          onReset={onReset}
          onRetry={onRetry}
        />
      )}
    </div>
  )
}
