import { BookOpen, BookUp2, HelpCircle, History, Settings } from "lucide-react"
import React from "react"

import type { Tab } from "../../hooks/useTabs"

interface EasyModeNavProps {
  activeTab: Tab
  t: any
}

function EasyModeNav({ activeTab, t }: EasyModeNavProps) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
        {activeTab === "settings" ? (
          <>
            <span className="text-sm">⚙️</span> {t.navigation.settings}
          </>
        ) : (
          <>
            <span className="text-sm">🎴</span> {t.navigation.library}
          </>
        )}
      </span>
    </div>
  )
}

interface NormalModeNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  t: any
}

function NormalModeNav({ activeTab, onTabChange, t }: NormalModeNavProps) {
  const tabs: {
    id: Tab
    label: string
    icon: React.ReactNode
    testId?: string
  }[] = [
    {
      id: "history",
      label: t.navigation.history,
      icon: <History className="w-4 h-4" />,
      testId: "history-tab"
    },
    {
      id: "library",
      label: t.navigation.library,
      icon: <BookOpen className="w-4 h-4" />,
      testId: "library-tab"
    },
    {
      id: "workbench",
      label: t.navigation.workbench,
      icon: <BookUp2 className="w-4 h-4" />,
      testId: "workbench-tab"
    }
  ]

  return (
    <nav className="-mb-px flex space-x-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          title={tab.label}
          data-tutorial={tab.testId}
          className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-1.5 ${
            activeTab === tab.id
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}>
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

interface HeaderRightActionsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  isEasyMode?: boolean
  onOpenGuide: () => void
  t: any
}

function HeaderRightActions({
  activeTab,
  onTabChange,
  isEasyMode,
  onOpenGuide,
  t
}: HeaderRightActionsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onTabChange("settings")}
        id="settings-nav-btn"
        className={`text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all font-semibold ${
          activeTab === "settings"
            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            : ""
        }`}
        title={t.navigation.settings}>
        <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span className="sr-only">{t.navigation.settings}</span>
      </button>
      {!isEasyMode && (
        <button
          onClick={onOpenGuide}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all font-semibold"
          title={t.navigation.showGuide}>
          <HelpCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <span className="hidden sm:inline">{t.navigation.guide}</span>
        </button>
      )}
    </div>
  )
}

interface SidePanelHeaderProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  isEasyMode?: boolean
  onOpenGuide: () => void
  t: any
}

export function SidePanelHeader({
  activeTab,
  onTabChange,
  isEasyMode,
  onOpenGuide,
  t
}: SidePanelHeaderProps) {
  return (
    <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 shadow-sm z-10">
      <div className="mt-2">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/50 pb-2">
          {isEasyMode ? (
            <EasyModeNav activeTab={activeTab} t={t} />
          ) : (
            <NormalModeNav
              activeTab={activeTab}
              onTabChange={onTabChange}
              t={t}
            />
          )}
          <HeaderRightActions
            activeTab={activeTab}
            onTabChange={onTabChange}
            isEasyMode={isEasyMode}
            onOpenGuide={onOpenGuide}
            t={t}
          />
        </div>
      </div>
    </div>
  )
}
