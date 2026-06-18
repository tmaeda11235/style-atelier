import React from "react"

import { useP2PSync } from "../lib/use-p2p-sync"
import { P2PSyncIdleView } from "./P2PSyncCommonViews"
import { P2PSyncGuestView } from "./P2PSyncGuestView"
import { P2PSyncHostView } from "./P2PSyncHostView"

interface P2PSyncUIProps {
  t?: any
}

export function P2PSyncUI({ t }: P2PSyncUIProps) {
  const sync = useP2PSync(t)
  return (
    <div className="w-full bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {sync.role === "idle" && (
        <P2PSyncIdleView
          t={t}
          onStartHost={sync.startHost}
          onStartGuestScan={sync.startGuestScan}
        />
      )}
      {sync.role === "host" && (
        <P2PSyncHostView
          status={sync.status}
          statusMessage={sync.statusMessage}
          qrCodeDataUrl={sync.qrCodeDataUrl}
          processedCount={sync.processedCount}
          errorMessage={sync.errorMessage}
          t={t}
          onReset={sync.reset}
          onRetry={sync.startHost}
          syncProgress={sync.syncProgress}
        />
      )}
      {sync.role === "guest" && (
        <P2PSyncGuestView
          status={sync.status}
          statusMessage={sync.statusMessage}
          scanInputUrl={sync.scanInputUrl}
          setScanInputUrl={sync.setScanInputUrl}
          isScanning={sync.isScanning}
          videoRef={sync.videoRef}
          canvasRef={sync.canvasRef}
          errorMessage={sync.errorMessage}
          t={t}
          onConnect={sync.handleManualUrlSubmit}
          onReset={sync.reset}
          onRetry={sync.startGuestScan}
          syncProgress={sync.syncProgress}
        />
      )}
    </div>
  )
}
