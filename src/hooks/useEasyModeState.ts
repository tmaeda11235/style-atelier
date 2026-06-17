import { useState } from "react"

import type { AlertType } from "../components/molecules/ConnectionAlert"
import type { StyleCard } from "../lib/db-schema"

export function useEasyModeState() {
  const [activeTab, setActiveTab] = useState<"library" | "settings">("library")
  const [logs, setLogs] = useState<string[]>([])
  const [alertType, setAlertType] = useState<AlertType>(null)
  const [activeDetailCard, setActiveDetailCard] = useState<StyleCard | null>(
    null
  )
  const [activeSimpleWorkbenchCard, setActiveSimpleWorkbenchCard] =
    useState<StyleCard | null>(null)

  const addLog = (log: string) => {
    setLogs((prev) => [log, ...prev].slice(0, 20))
  }

  const handleClearLogs = () => {
    setLogs([])
  }

  const handleDismissAlert = () => {
    setAlertType(null)
  }

  return {
    activeTab,
    setActiveTab,
    logs,
    setLogs,
    addLog,
    handleClearLogs,
    alertType,
    setAlertType,
    handleDismissAlert,
    activeDetailCard,
    setActiveDetailCard,
    activeSimpleWorkbenchCard,
    setActiveSimpleWorkbenchCard
  }
}

export type EasyModeState = ReturnType<typeof useEasyModeState>
