import React from "react"

interface SidePanelDebugLogsProps {
  logs: string[]
  onClearLogs: () => void
  onResetDb: () => void
}

export function SidePanelDebugLogs({
  logs,
  onClearLogs,
  onResetDb
}: SidePanelDebugLogsProps) {
  if (process.env.NODE_ENV !== "development") return null
  return (
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
  )
}
