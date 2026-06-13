import { X } from "lucide-react"
import React from "react"

interface ImportNotificationBannerProps {
  droppedItem: any
  onClearDroppedItem?: () => void
  t: any
}

interface ImportErrorBannerContentProps {
  droppedItem: any
  t: any
}

function ImportErrorBannerContent({
  droppedItem,
  t
}: ImportErrorBannerContentProps) {
  return (
    <div className="flex flex-col gap-2.5 pr-6">
      <div className="flex items-start gap-2.5">
        <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0 mt-0.5">
          <svg
            className="w-3.5 h-3.5 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <p className="text-xs font-bold text-red-800 dark:text-red-300 leading-tight pt-0.5">
          {droppedItem.errorMessage || "Import failed"}
        </p>
      </div>

      {droppedItem.errorType === "no_metadata_or_qr" && (
        <div className="mt-2 text-xs border-t border-red-200/50 dark:border-red-900/50 pt-2 text-slate-600 dark:text-slate-400">
          <p className="leading-relaxed mb-2 bg-red-100/30 dark:bg-red-950/20 p-2 rounded-lg text-[11px]">
            {t.dragAndDrop.errorNoMetadataReason}
          </p>
          <p className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-[11px]">
            {t.dragAndDrop.errorNoMetadataActionTitle}
          </p>
          <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px] leading-relaxed">
            <li>{t.dragAndDrop.errorNoMetadataStep1}</li>
            <li>{t.dragAndDrop.errorNoMetadataStep2}</li>
            <li>{t.dragAndDrop.errorNoMetadataStep3}</li>
          </ol>
        </div>
      )}
    </div>
  )
}

interface ImportSuccessBannerContentProps {
  droppedItem: any
  t: any
}

function ImportSuccessBannerContent({
  droppedItem,
  t
}: ImportSuccessBannerContentProps) {
  return (
    <div className="flex items-center gap-2.5 pr-6">
      <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
        <svg
          className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
        {droppedItem.isImport
          ? t.dragAndDrop.importSuccess.replace(
              "{name}",
              droppedItem.name || "New Card"
            )
          : droppedItem.isMerged
            ? t.dragAndDrop.associated.replace(
                "{name}",
                droppedItem.name || "Existing Card"
              )
            : t.dragAndDrop.historyAdded}
      </p>
    </div>
  )
}

export function ImportNotificationBanner({
  droppedItem,
  onClearDroppedItem,
  t
}: ImportNotificationBannerProps) {
  if (!droppedItem) return null

  return (
    <div
      className={`p-3 border rounded-xl bg-white dark:bg-slate-900 shadow-xl animate-in fade-in slide-in-from-top-4 duration-200 relative ${
        droppedItem.isError
          ? "ring-2 ring-red-500/80 border-red-100 dark:border-red-950 bg-red-50/10 dark:bg-red-950/10"
          : "ring-2 ring-blue-500/80 border-blue-100 dark:border-blue-900"
      }`}>
      {onClearDroppedItem && (
        <button
          onClick={onClearDroppedItem}
          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Dismiss"
          aria-label="Dismiss notification"
          id="dismiss-import-notification-btn">
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {droppedItem.isError ? (
        <ImportErrorBannerContent droppedItem={droppedItem} t={t} />
      ) : (
        <ImportSuccessBannerContent droppedItem={droppedItem} t={t} />
      )}
    </div>
  )
}
