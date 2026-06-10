import { AlertTriangle, HelpCircle } from "lucide-react"
import React, { useEffect } from "react"

interface ConfirmationDialogProps {
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "primary" | "danger"
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  onConfirm,
  onCancel
}: ConfirmationDialogProps) {
  // Handle escape key to close/cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel()
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const isDanger = variant === "danger"

  return (
    <div
      id="confirmation-dialog-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 dark:bg-slate-950/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200"
      onClick={onCancel}>
      <div
        id="confirmation-dialog-container"
        className="w-full max-w-xs bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true">
        {/* Icon and content */}
        <div className="p-5 flex flex-col items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center border ${
              isDanger
                ? "bg-red-500/10 border-red-500/30 text-red-500"
                : "bg-blue-500/10 border-blue-500/30 text-blue-500"
            }`}>
            {isDanger ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <HelpCircle className="w-6 h-6" />
            )}
          </div>
          {title && (
            <h2 className="text-sm font-black text-white text-center tracking-wide">
              {title}
            </h2>
          )}
          <p className="text-xs text-slate-400 leading-relaxed text-center whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={onConfirm}
            id="confirm-dialog-ok-btn"
            className={`w-full py-2.5 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer ${
              isDanger
                ? "bg-red-600 hover:bg-red-500 active:bg-red-700 focus:ring-2 focus:ring-red-500/50"
                : "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 focus:ring-2 focus:ring-blue-500/50"
            }`}>
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            id="confirm-dialog-cancel-btn"
            className="w-full py-2 text-slate-500 hover:text-slate-300 text-[11px] font-semibold transition-all cursor-pointer focus:outline-none">
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}
