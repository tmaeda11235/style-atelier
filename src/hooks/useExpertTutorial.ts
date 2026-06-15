import { useCallback, useEffect, useState } from "react"

export function useExpertTutorial(
  setActiveTab: (tab: string) => void,
  startTutorial: () => void,
  onToggleEasyMode: (enabled: boolean) => void
) {
  const [showWelcome, setShowWelcome] = useState(false)
  useEffect(() => {
    if (!localStorage.getItem("style-atelier-onboarding-seen")) {
      setShowWelcome(true)
    }
  }, [])
  const handleStartTutorial = useCallback(() => {
    localStorage.setItem("style-atelier-onboarding-seen", "true")
    setShowWelcome(false)
    setActiveTab("history")
    startTutorial()
  }, [setActiveTab, startTutorial])
  const handleSkipTutorial = useCallback(() => {
    localStorage.setItem("style-atelier-onboarding-seen", "true")
    setShowWelcome(false)
  }, [])
  const handleOpenGuide = useCallback(() => {
    setActiveTab("history")
    startTutorial()
  }, [setActiveTab, startTutorial])

  const handleToggleEasyMode = useCallback(
    (enabled: boolean) => {
      onToggleEasyMode(enabled)
      if (enabled) setActiveTab("library")
    },
    [onToggleEasyMode, setActiveTab]
  )

  return {
    showWelcome,
    setShowWelcome,
    handleStartTutorial,
    handleSkipTutorial,
    handleOpenGuide,
    handleToggleEasyMode
  }
}
