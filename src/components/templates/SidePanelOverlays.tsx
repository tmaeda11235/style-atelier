import { History } from "lucide-react"
import React from "react"

import { ImportNotificationBanner } from "../molecules/ImportNotificationBanner"

interface DragFileOverlayProps {
  isDraggingFile?: boolean
  t: any
}

function DragFileOverlay({ isDraggingFile, t }: DragFileOverlayProps) {
  if (!isDraggingFile) return null
  return (
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
  )
}

interface DragHistoryOverlayProps {
  isDragging?: boolean
  isDraggingFile?: boolean
  t: any
}

function DragHistoryOverlay({
  isDragging,
  isDraggingFile,
  t
}: DragHistoryOverlayProps) {
  if (!isDragging || isDraggingFile) return null
  return (
    <div className="absolute inset-0 bg-indigo-500/10 border-2 border-dashed border-indigo-500 rounded-lg flex flex-col items-center justify-center z-50 backdrop-blur-[2px] pointer-events-none animate-pulse">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-full shadow-lg flex items-center justify-center border border-indigo-100 dark:border-indigo-900">
        <History className="w-8 h-8 text-indigo-500" />
      </div>
      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-2 bg-white dark:bg-slate-900 px-2 py-0.5 rounded shadow-sm">
        {t.dragAndDrop.dropHistoryOverlay}
      </span>
    </div>
  )
}

interface ImportingOverlayProps {
  isImporting?: boolean
  t: any
}

function ImportingOverlay({ isImporting, t }: ImportingOverlayProps) {
  if (!isImporting) return null
  return (
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
  )
}

interface SidePanelOverlaysProps {
  isDraggingFile?: boolean
  isDragging?: boolean
  isImporting?: boolean
  droppedItem: any
  onClearDroppedItem?: () => void
  t: any
}

export function SidePanelOverlays({
  isDraggingFile,
  isDragging,
  isImporting,
  droppedItem,
  onClearDroppedItem,
  t
}: SidePanelOverlaysProps) {
  return (
    <>
      <DragFileOverlay isDraggingFile={isDraggingFile} t={t} />
      <DragHistoryOverlay
        isDragging={isDragging}
        isDraggingFile={isDraggingFile}
        t={t}
      />
      <ImportingOverlay isImporting={isImporting} t={t} />

      <ImportNotificationBanner
        droppedItem={droppedItem}
        onClearDroppedItem={onClearDroppedItem}
        t={t}
      />
    </>
  )
}
