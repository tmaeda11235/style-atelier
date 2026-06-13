import { CheckCircle2, Share2 } from "lucide-react"
import React, { useEffect } from "react"

import { useLanguage } from "../../contexts/LanguageContext"

interface ExportSuccessModalProps {
  isOpen: boolean
  onClose: () => void
}

function handleShareClick(lang: string) {
  const isJa = lang === "ja"
  const text = isJa
    ? "Midjourneyのプロンプトを Style Atelier でカード化しました！画像を追加してシェアしよう！"
    : "I made a Midjourney prompt card using Style Atelier! Add your card image and share!"
  const hashtags = "Midjourney,StyleAtelier"
  const intentUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}&hashtags=${encodeURIComponent(hashtags)}`

  window.open(intentUrl, "_blank", "noopener,noreferrer")
}

/* eslint-disable-next-line max-lines-per-function */
export function ExportSuccessModal({
  isOpen,
  onClose
}: ExportSuccessModalProps) {
  const { t, lang } = useLanguage()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const modalTranslations = (t as any).exportSuccessModal || {
    title: "Card Exported Successfully!",
    message:
      "The exported card image preserves prompt metadata.\nOther users can directly import it back into Style Atelier.",
    shareText: "Share on X (Twitter)",
    closeText: "Close"
  }

  return (
    <div
      id="export-success-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 dark:bg-slate-950/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200"
      onClick={onClose}>
      <div
        id="export-success-container"
        className="w-full max-w-xs bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true">
        <div className="p-5 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center border bg-emerald-500/10 border-emerald-500/30 text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-black text-white text-center tracking-wide">
            {modalTranslations.title}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed text-center whitespace-pre-line">
            {modalTranslations.message}
          </p>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={() => handleShareClick(lang)}
            id="export-success-share-btn"
            className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2 focus:ring-2 focus:ring-sky-500/50">
            <Share2 className="w-4 h-4" />
            {modalTranslations.shareText}
          </button>
          <button
            onClick={onClose}
            id="export-success-close-btn"
            className="w-full py-2 text-slate-500 hover:text-slate-300 text-[11px] font-semibold transition-all cursor-pointer focus:outline-none text-center">
            {modalTranslations.closeText}
          </button>
        </div>
      </div>
    </div>
  )
}
