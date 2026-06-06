import React, { useState, useEffect } from "react"
import { useActiveTabUrl } from "../hooks/useActiveTabUrl"
import { NonTargetSiteView } from "../components/organisms/NonTargetSiteView"
import { WorkbenchProvider } from "../contexts/WorkbenchContext"
import { TutorialProvider } from "../contexts/TutorialContext"
import { EasyModeView } from "../components/organisms/EasyModeView"
import { ExpertModeView } from "../components/organisms/ExpertModeView"

import { initializeAutoSync } from "../lib/auto-sync"

/**
 * Main inner container for the side panel. It manages site target detection
 * and handles top-level routing between Easy Mode and Expert Mode.
 */
function SidePanelInner() {
  const { isTargetSite, isLoading } = useActiveTabUrl()
  const [isEasyMode, setIsEasyMode] = useState(false)

  useEffect(() => {
    initializeAutoSync()
    const easyMode = localStorage.getItem("style-atelier-easy-mode") === "true"
    setIsEasyMode(easyMode)
  }, [])

  const handleToggleEasyMode = (enabled: boolean) => {
    setIsEasyMode(enabled)
    localStorage.setItem("style-atelier-easy-mode", enabled ? "true" : "false")
  }

  const handleOpenMidjourney = () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.update) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.update(tabs[0].id, { url: "https://www.midjourney.com/imagine" })
        }
      })
    } else {
      window.open("https://www.midjourney.com/imagine", "_blank")
    }
  }

  if (isLoading) {
    return <div className="w-full h-screen bg-slate-950" />
  }

  if (!isTargetSite) {
    return <NonTargetSiteView onOpenMidjourney={handleOpenMidjourney} />
  }

  return (
    <WorkbenchProvider>
      {isEasyMode ? (
        <EasyModeView isEasyMode={isEasyMode} onToggleEasyMode={handleToggleEasyMode} />
      ) : (
        <ExpertModeView isEasyMode={isEasyMode} onToggleEasyMode={handleToggleEasyMode} />
      )}
    </WorkbenchProvider>
  )
}

/**
 * Root page component – wraps everything in TutorialProvider so useTutorial
 * is available within both the SidePanelInner router and underlying views.
 */
function SidePanelPage() {
  return (
    <TutorialProvider>
      <SidePanelInner />
    </TutorialProvider>
  )
}

export default SidePanelPage