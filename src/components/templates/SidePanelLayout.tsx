import React from "react"
import { HelpCircle } from "lucide-react"
import type { Tab } from "../../hooks/useTabs"
import { ConnectionAlert, type AlertType } from "../molecules/ConnectionAlert"

interface SidePanelLayoutProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  children: React.ReactNode
  isDragging: boolean
  logs: string[]
  onClearLogs: () => void
  onResetDb: () => void
  droppedItem: any
  // New props for global error handling
  alertType?: AlertType
  onRetryConnection?: () => void
  onDismissAlert?: () => void
  onOpenGuide: () => void
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
  alertType,
  onRetryConnection,
  onDismissAlert,
  onOpenGuide
}: SidePanelLayoutProps) {
  return (
    <div
      className={`w-full h-screen flex flex-col font-sans text-slate-800 transition-colors ${isDragging ? "bg-blue-50" : "bg-slate-50"
        }`}
    >
      {/* Global Alert at the very top */}
      <ConnectionAlert type={alertType || null} onRetry={onRetryConnection} onDismiss={onDismissAlert} />

      <div className="p-4 bg-white shadow-sm z-10">
        <div className="mt-2">
          <div className="flex justify-between items-center border-b border-slate-200">
            <nav className="-mb-px flex space-x-4">
              <button
                onClick={() => onTabChange("history")}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "history"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
              >
                History
              </button>
              <button
                onClick={() => onTabChange("library")}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "library"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
              >
                Library
              </button>
              <button
                onClick={() => onTabChange("workbench")}
                data-tutorial="workbench-tab"
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "workbench"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
              >
                Workbench
              </button>
            </nav>
            <button
              onClick={onOpenGuide}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 py-1 px-2 hover:bg-slate-100 rounded-lg transition-all font-semibold"
              title="Show Guide"
            >
              <HelpCircle className="w-4 h-4 text-blue-500" /> Guide
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {droppedItem && (
          <div className="p-3 border rounded bg-white shadow-lg ring-2 ring-blue-500 animate-in fade-in slide-in-from-top-4">
            <p className="text-xs font-bold uppercase text-slate-800">
              {droppedItem.isMerged
                ? `Associated with Card "${droppedItem.name || 'Existing Card'}"!`
                : "New History Item Added!"}
            </p>
          </div>
        )}
        {children}

        {process.env.NODE_ENV === "development" && (
          <div className="w-full mt-8 border-t border-slate-200 pt-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Debug Logs</p>
              <div className="flex gap-2">
                <button
                  onClick={onResetDb}
                  className="text-[10px] text-red-400 hover:text-red-600 font-medium"
                >
                  Reset DB
                </button>
                <button onClick={onClearLogs} className="text-[10px] text-slate-400 hover:text-slate-600">
                  Clear Logs
                </button>
              </div>
            </div>
            <div className="bg-slate-900 text-green-400 p-2 rounded text-[10px] font-mono h-24 overflow-y-auto whitespace-pre-wrap shadow-inner">
              {logs.length === 0 ? (
                <span className="text-slate-600 opacity-50">Waiting for events...</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1 border-b border-green-900/30 pb-0.5 last:border-0">{`> ${log}`}</div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}