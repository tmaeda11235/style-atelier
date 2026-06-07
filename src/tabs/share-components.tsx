import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clipboard,
  Download
} from "lucide-react"
import React from "react"

import { Button } from "../components/atoms/Button"
import type { StyleCard } from "../lib/db-schema"

export interface TranslationType {
  noCardId: string
  cardNotFound: string
  failedLoad: string
  failedBlob: string
  clipboardSuccess: string
  clipboardBlocked: string
  clipboardFailed: string
  downloadStarted: string
  downloadFailed: string
  loading: string
  errorTitle: string
  closeWindow: string
  headerSubtitle: string
  generatedCardView: string
  rightClickHint: string
  styleDetails: string
  category: string
  sharingOptions: string
  copyImage: string
  downloadPng: string
  tip: string
  specifications: string
  promptPreview: string
  noSegments: string
  footer: string
}

export function ShareHeader({
  onClose,
  t
}: {
  onClose: () => void
  t: TranslationType
}) {
  return (
    <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          title="Go Back">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-black tracking-wider text-white">
            Style Atelier
          </h1>
          <p className="text-[10px] text-slate-500">{t.headerSubtitle}</p>
        </div>
      </div>
      <div className="text-xs px-3 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
        {t.generatedCardView}
      </div>
    </header>
  )
}

export function ShareCardPreview({
  imageSrc,
  cardName,
  hintText
}: {
  imageSrc: string | null
  cardName: string
  hintText: string
}) {
  if (!imageSrc) {
    return (
      <div className="w-full aspect-[600/850] max-w-sm bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
    )
  }
  return (
    <div className="relative group max-w-sm w-full rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.15)] border border-slate-800/80 transition-all hover:scale-[1.01]">
      <img
        src={imageSrc}
        alt={cardName}
        className="w-full h-auto object-contain cursor-zoom-in"
      />
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
        <p className="text-xs text-white bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-700/80">
          {hintText}
        </p>
      </div>
    </div>
  )
}

export function FeedbackMessage({
  success,
  error
}: {
  success: string | null
  error: string | null
}) {
  if (success) {
    return (
      <div className="p-3 bg-emerald-950/40 border border-emerald-800/30 rounded-xl text-emerald-400 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{success}</span>
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-3 bg-red-950/40 border border-red-800/30 rounded-xl text-red-400 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    )
  }
  return null
}

export function ActionDashboard({
  onCopy,
  onDownload,
  t
}: {
  onCopy: () => void
  onDownload: () => void
  t: TranslationType
}) {
  return (
    <div className="bg-slate-900/50 border border-slate-800/60 p-5 rounded-2xl flex flex-col gap-4">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {t.sharingOptions}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          onClick={onCopy}
          className="py-3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
          <Clipboard className="w-4 h-4" />
          {t.copyImage}
        </Button>
        <Button
          onClick={onDownload}
          variant="outline"
          className="py-3 flex items-center justify-center gap-2 border-slate-800 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs">
          <Download className="w-4 h-4" />
          {t.downloadPng}
        </Button>
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed">{t.tip}</p>
    </div>
  )
}

export function SpecificationView({
  promptSegments,
  t
}: {
  promptSegments?: Array<{ value: string }>
  t: TranslationType
}) {
  return (
    <div className="bg-slate-900/30 border border-slate-800/40 p-4 rounded-xl space-y-3">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {t.specifications}
      </h3>
      <div className="space-y-1">
        <span className="text-[10px] text-slate-500 block">
          {t.promptPreview}
        </span>
        <p className="text-xs text-slate-300 font-mono bg-slate-950 p-2.5 rounded border border-slate-900 overflow-x-auto whitespace-pre-wrap">
          {promptSegments?.map((s) => s.value).join(" ") || t.noSegments}
        </p>
      </div>
    </div>
  )
}

export function SharePageStatusView({
  loading,
  loadError,
  card,
  onClose,
  t
}: {
  loading: boolean
  loadError: string | null
  card: StyleCard | null
  onClose: () => void
  t: TranslationType
}) {
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-slate-800 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">{t.loading}</p>
      </div>
    )
  }

  if (loadError && !card) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-16 h-16 bg-red-950 border border-red-500/30 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold mb-2">{t.errorTitle}</h1>
        <p className="text-sm text-slate-400 max-w-md text-center mb-6">
          {loadError}
        </p>
        <Button onClick={onClose} variant="secondary">
          {t.closeWindow}
        </Button>
      </div>
    )
  }

  return null
}

interface SharePageContentProps {
  card: StyleCard
  imageSrc: string | null
  activeSuccess: string | null
  activeError: string | null
  handleCopyToClipboard: () => void
  handleDownload: () => void
  handleClose: () => void
  t: TranslationType
}

export function ShareCardDetails({
  card,
  t
}: {
  card: StyleCard
  t: TranslationType
}) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500">
        {t.styleDetails}
      </span>
      <h2 className="text-2xl font-black text-white">{card.name}</h2>
      <div className="flex gap-2">
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-400">
          {card.tier}
        </span>
        {card.category && (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/40 border border-blue-900/30 text-blue-400">
            {t.category}: {card.category}
          </span>
        )}
      </div>
    </div>
  )
}

export function ShareFooter({ t }: { t: TranslationType }) {
  return (
    <footer className="max-w-5xl w-full mx-auto pt-6 border-t border-slate-900 text-center text-[10px] text-slate-600 mt-auto">
      {t.footer.replace("{year}", new Date().getFullYear().toString())}
    </footer>
  )
}

export function SharePageContent({
  card,
  imageSrc,
  activeSuccess,
  activeError,
  handleCopyToClipboard,
  handleDownload,
  handleClose,
  t
}: SharePageContentProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6 font-sans">
      <ShareHeader onClose={handleClose} t={t} />
      <main className="max-w-5xl w-full mx-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-8">
        <div className="md:col-span-6 flex flex-col items-center justify-center">
          <ShareCardPreview
            imageSrc={imageSrc}
            cardName={card.name}
            hintText={t.rightClickHint}
          />
        </div>
        <div className="md:col-span-6 flex flex-col gap-6">
          <ShareCardDetails card={card} t={t} />
          <FeedbackMessage success={activeSuccess} error={activeError} />
          <ActionDashboard
            onCopy={handleCopyToClipboard}
            onDownload={handleDownload}
            t={t}
          />
          <SpecificationView promptSegments={card.promptSegments} t={t} />
        </div>
      </main>
      <ShareFooter t={t} />
    </div>
  )
}
