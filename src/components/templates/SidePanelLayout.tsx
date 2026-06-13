import { BookOpen, BookUp2, HelpCircle, History, Settings } from "lucide-react"
import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import type { Tab } from "../../hooks/useTabs"
import { ConnectionAlert, type AlertType } from "../molecules/ConnectionAlert"
import { ImportNotificationBanner } from "../molecules/ImportNotificationBanner"

interface SidePanelLayoutProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  children: React.ReactNode
  isDragging: boolean
  logs: string[]
  onClearLogs: () => void
  onResetDb: () => void
  droppedItem: any
  onClearDroppedItem?: () => void
  // New props for global error handling
  alertType?: AlertType
  onRetryConnection?: () => void
  onDismissAlert?: () => void
  onOpenGuide: () => void
  isDraggingFile?: boolean
  isImporting?: boolean
  isEasyMode?: boolean
}

export function SidePanelLayout({
  activeTab,
  onTabChange,
  children,
  isDragging,
  logs,
  onClearLogs,
  onResetDb,
  droppedItem,
  onClearDroppedItem,
  alertType,
  onRetryConnection,
  onDismissAlert,
  onOpenGuide,
  isDraggingFile,
  isImporting,
  isEasyMode
}: SidePanelLayoutProps) {
  const { t } = useLanguage()
  return (
    <div
      className={`w-full h-screen flex flex-col font-sans text-slate-800 dark:text-slate-100 transition-colors ${
        isDraggingFile
          ? "bg-blue-50 dark:bg-blue-950"
          : isDragging
            ? "bg-indigo-50 dark:bg-indigo-950"
            : "bg-slate-50 dark:bg-slate-950"
      }`}>
      {/* Global Alert at the very top */}
      <ConnectionAlert
        type={alertType || null}
        onRetry={onRetryConnection}
        onDismiss={onDismissAlert}
      />

      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 shadow-sm z-10">
        <div className="mt-2">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/50 pb-2">
            {isEasyMode ? (
              <div className="flex items-center gap-2 py-1">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  {activeTab === "settings" ? (
                    <>
                      <span className="text-sm">⚙️</span>{" "}
                      {t.navigation.settings}
                    </>
                  ) : (
                    <>
                      <span className="text-sm">🎴</span> {t.navigation.library}
                    </>
                  )}
                </span>
              </div>
            ) : (
              <nav className="-mb-px flex space-x-4">
                <button
                  onClick={() => onTabChange("history")}
                  title={t.navigation.history}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-1.5 ${
                    activeTab === "history"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}>
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {t.navigation.history}
                  </span>
                </button>
                <button
                  onClick={() => onTabChange("library")}
                  title={t.navigation.library}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-1.5 ${
                    activeTab === "library"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}>
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {t.navigation.library}
                  </span>
                </button>
                <button
                  onClick={() => onTabChange("workbench")}
                  data-tutorial="workbench-tab"
                  title={t.navigation.workbench}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-1.5 ${
                    activeTab === "workbench"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}>
                  <BookUp2 className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {t.navigation.workbench}
                  </span>
                </button>
              </nav>
            )}
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
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 relative">
        {isDraggingFile && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex flex-col items-center justify-center z-50 backdrop-blur-[2px] pointer-events-none animate-pulse">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-full shadow-lg flex items-center justify-center border border-blue-100 dark:border-blue-900">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-500">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-2 bg-white dark:bg-slate-900 px-2 py-0.5 rounded shadow-sm">
              {t.dragAndDrop.dropOverlay}
            </span>
          </div>
        )}

        {isDragging && !isDraggingFile && (
          <div className="absolute inset-0 bg-indigo-500/10 border-2 border-dashed border-indigo-500 rounded-lg flex flex-col items-center justify-center z-50 backdrop-blur-[2px] pointer-events-none animate-pulse">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-full shadow-lg flex items-center justify-center border border-indigo-100 dark:border-indigo-900">
              <History className="w-8 h-8 text-indigo-500" />
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-2 bg-white dark:bg-slate-900 px-2 py-0.5 rounded shadow-sm">
              {t.dragAndDrop.dropHistoryOverlay}
            </span>
          </div>
        )}

        {isImporting && (
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 rounded-lg flex flex-col items-center justify-center z-50 backdrop-blur-[1px] pointer-events-none">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-xl flex items-center gap-3 border border-slate-100 dark:border-slate-800">
              <svg
                className="animate-spin h-5 w-5 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t.dragAndDrop.importing}
              </span>
            </div>
          </div>
        )}

        <ImportNotificationBanner
          droppedItem={droppedItem}
          onClearDroppedItem={onClearDroppedItem}
          t={t}
        />
        {children}

        {process.env.NODE_ENV === "development" && (
          <div className="w-full mt-8 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                Debug Logs
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onResetDb}
                  className="text-[10px] text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 font-medium">
                  Reset DB
                </button>
                <button
                  onClick={onClearLogs}
                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400">
                  Clear Logs
                </button>
              </div>
            </div>
            <div className="bg-slate-900 dark:bg-black text-green-400 p-2 rounded text-[10px] font-mono h-24 overflow-y-auto whitespace-pre-wrap shadow-inner border border-slate-800">
              {logs.length === 0 ? (
                <span className="text-slate-600 dark:text-slate-500 opacity-50">
                  Waiting for events...
                </span>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className="mb-1 border-b border-green-900/30 pb-0.5 last:border-0">{`> ${log}`}</div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
