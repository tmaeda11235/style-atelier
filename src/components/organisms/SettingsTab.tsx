import React from "react"

import { useSettingsTab } from "../../hooks/useSettingsTabHandlers"
import { SettingsTabPresenter } from "./SettingsTabPresenter"

interface SettingsTabProps {
  addLog: (log: string) => void
  onResetDb: () => void
  isEasyMode?: boolean
  onToggleEasyMode?: (checked: boolean) => void
  onNavigateToLibrary?: () => void
  onReplayTutorial?: () => void
}

export function SettingsTab(props: SettingsTabProps) {
  const settings = useSettingsTab(props)
  return <SettingsTabPresenter {...settings} />
}
