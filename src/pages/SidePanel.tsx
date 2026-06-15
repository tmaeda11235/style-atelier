import React, { useEffect } from "react"

import { EasyModeView } from "../components/organisms/EasyModeView"
import { ExpertModeView } from "../components/organisms/ExpertModeView"
import { ConfirmProvider } from "../contexts/ConfirmContext"
import { LanguageProvider } from "../contexts/LanguageContext"
import { SettingsProvider, useSettings } from "../contexts/SettingsContext"
import { TutorialProvider } from "../contexts/TutorialContext"
import { WebLlmProvider } from "../contexts/WebLlmContext"
import { WorkbenchProvider } from "../contexts/WorkbenchContext"
import { useActiveTabUrl } from "../hooks/useActiveTabUrl"
import { useWebLlm } from "../hooks/useWebLlm"
import { initializeAutoSync } from "../lib/auto-sync"

/**
 * Main inner container for the side panel. It manages site target detection
 * and handles top-level routing between Easy Mode and Expert Mode.
 */
function SidePanelInner() {
  const { isTargetSite, isLoading } = useActiveTabUrl()
  const { isEasyMode, toggleEasyMode } = useSettings()

  const { preloadEngine } = useWebLlm()

  useEffect(() => {
    initializeAutoSync()
    preloadEngine()
  }, [preloadEngine])

  const handleToggleEasyMode = (enabled: boolean) => {
    toggleEasyMode(enabled)
  }

  const handleOpenMidjourney = () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.update) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.update(tabs[0].id, {
            url: "https://www.midjourney.com/imagine"
          })
        }
      })
    } else {
      window.open("https://www.midjourney.com/imagine", "_blank")
    }
  }

  if (isLoading) {
    return <div className="w-full h-screen bg-slate-950" />
  }

  return (
    <WorkbenchProvider>
      {isEasyMode ? (
        <EasyModeView
          isEasyMode={isEasyMode}
          onToggleEasyMode={handleToggleEasyMode}
          isTargetSite={isTargetSite}
          onOpenMidjourney={handleOpenMidjourney}
        />
      ) : (
        <ExpertModeView
          isEasyMode={isEasyMode}
          onToggleEasyMode={handleToggleEasyMode}
          isTargetSite={isTargetSite}
          onOpenMidjourney={handleOpenMidjourney}
        />
      )}
    </WorkbenchProvider>
  )
}

/**
 * Root page component – wraps everything in SettingsProvider, LanguageProvider, and TutorialProvider so useSettings, useLanguage, and useTutorial
 * are available within both the SidePanelInner router and underlying views.
 */
function SidePanelPage() {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <WebLlmProvider>
          <TutorialProvider>
            <ConfirmProvider>
              <SidePanelInner />
            </ConfirmProvider>
          </TutorialProvider>
        </WebLlmProvider>
      </SettingsProvider>
    </LanguageProvider>
  )
}

export default SidePanelPage
