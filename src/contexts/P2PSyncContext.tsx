import React, { createContext, useContext, useEffect } from "react"

import { useP2PSync } from "../lib/use-p2p-sync"

type P2PSyncContextType = ReturnType<typeof useP2PSync>

const P2PSyncContext = createContext<P2PSyncContextType | null>(null)

export function P2PSyncProvider({
  children,
  t
}: {
  children: React.ReactNode
  t?: any
}) {
  const sync = useP2PSync(t)

  const isActive =
    sync.role !== "idle" &&
    (sync.status === "connecting" ||
      sync.status === "connected" ||
      sync.status === "syncing" ||
      sync.status === "relay-connecting" ||
      sync.status === "relay-syncing")

  useEffect(() => {
    if (!isActive) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue =
        "P2P Synchronization is in progress. Are you sure you want to leave?"
      return e.returnValue
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [isActive])

  return (
    <P2PSyncContext.Provider value={sync}>{children}</P2PSyncContext.Provider>
  )
}

export function useP2PSyncContext() {
  const context = useContext(P2PSyncContext)
  if (!context) {
    throw new Error("useP2PSyncContext must be used within a P2PSyncProvider")
  }
  return context
}
