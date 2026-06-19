import React, { useEffect } from "react"

import { EasyModeView } from "../components/organisms/EasyModeView"
import { ExpertModeView } from "../components/organisms/ExpertModeView"
import { UpgradeModal } from "../components/organisms/UpgradeModal"
import { ConfirmProvider } from "../contexts/ConfirmContext"
import { LanguageProvider, useLanguage } from "../contexts/LanguageContext"
import { LicenseProvider } from "../contexts/LicenseContext"
import { P2PSyncProvider } from "../contexts/P2PSyncContext"
import { SettingsProvider, useSettings } from "../contexts/SettingsContext"
import { TutorialProvider } from "../contexts/TutorialContext"
import { WebLlmProvider } from "../contexts/WebLlmContext"
import { WorkbenchProvider } from "../contexts/WorkbenchContext"
import { useActiveTabUrl } from "../hooks/useActiveTabUrl"
import { useWebLlm } from "../hooks/useWebLlm"
import { initializeAutoSync } from "../lib/auto-sync"
import {
  isExtensionContextValid,
  safeQueryTabs,
  safeUpdateTab
} from "../lib/chrome-utils"

/**
 * Main inner container for the side panel. It manages site target detection
 * and handles top-level routing between Easy Mode and Expert Mode.
 */
/* eslint-disable-next-line max-lines-per-function */
function SidePanelInner() {
  const { isTargetSite, isLoading } = useActiveTabUrl()
  const { isEasyMode, toggleEasyMode } = useSettings()
  const { t } = useLanguage()

  const { preloadEngine } = useWebLlm()

  useEffect(() => {
    initializeAutoSync()
    preloadEngine()
  }, [preloadEngine])

  const handleToggleEasyMode = (enabled: boolean) => {
    toggleEasyMode(enabled)
  }

  const handleOpenMidjourney = () => {
    if (!isExtensionContextValid()) {
      window.open("https://www.midjourney.com/imagine", "_blank")
      return
    }
    safeQueryTabs({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs?.[0]
      if (activeTab?.id) {
        safeUpdateTab(activeTab.id, {
          url: "https://www.midjourney.com/imagine"
        })
      }
    })
  }

  if (isLoading) {
    return <div className="w-full h-screen bg-slate-950" />
  }

  return (
    <P2PSyncProvider t={t}>
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
        <UpgradeModal />
      </WorkbenchProvider>
    </P2PSyncProvider>
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
        <LicenseProvider>
          <WebLlmProvider>
            <TutorialProvider>
              <ConfirmProvider>
                <SidePanelInner />
              </ConfirmProvider>
            </TutorialProvider>
          </WebLlmProvider>
        </LicenseProvider>
      </SettingsProvider>
    </LanguageProvider>
  )
}

export default SidePanelPage
