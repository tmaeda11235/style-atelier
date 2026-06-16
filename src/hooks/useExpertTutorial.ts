import { useCallback, useEffect, useState } from "react"

const getLocal = (key: string) => localStorage.getItem(key)
const setLocal = (key: string, value: string) =>
  localStorage.setItem(key, value)
const removeLocal = (key: string) => localStorage.removeItem(key)

export function useExpertTutorial(
  setActiveTab: (tab: string) => void,
  startTutorial: () => void,
  onToggleEasyMode: (enabled: boolean) => void
) {
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (getLocal("style-atelier-onboarding-replay-trigger") === "true") {
      removeLocal("style-atelier-onboarding-replay-trigger")
      setActiveTab("history")
      startTutorial()
      setShowWelcome(false)
    } else if (!getLocal("style-atelier-onboarding-seen")) {
      setShowWelcome(true)
    }
  }, [setActiveTab, startTutorial])

  const startTutorialAtHistory = useCallback(() => {
    setActiveTab("history")
    startTutorial()
  }, [setActiveTab, startTutorial])
  const handleStartTutorial = useCallback(() => {
    setLocal("style-atelier-onboarding-seen", "true")
    setShowWelcome(false)
    startTutorialAtHistory()
  }, [startTutorialAtHistory])
  const handleSkipTutorial = useCallback(() => {
    setLocal("style-atelier-onboarding-seen", "true")
    setShowWelcome(false)
  }, [])
  const handleToggleEasyMode = useCallback(
    (enabled: boolean) => {
      onToggleEasyMode(enabled)
      if (enabled) setActiveTab("library")
    },
    [onToggleEasyMode, setActiveTab]
  )
  const handleReplayTutorial = useCallback(() => {
    removeLocal("style-atelier-onboarding-seen")
    startTutorialAtHistory()
  }, [startTutorialAtHistory])

  return {
    showWelcome,
    setShowWelcome,
    handleStartTutorial,
    handleSkipTutorial,
    handleOpenGuide: startTutorialAtHistory,
    handleToggleEasyMode,
    handleReplayTutorial
  }
}
