import {
  AlertCircle,
  Clipboard,
  Download,
  ExternalLink,
  Share2,
  X
} from "lucide-react"
import React, { useState } from "react"
import iconUrl from "url:../../../assets/icon.png"

import { useLanguage } from "../../contexts/LanguageContext"
import type { StyleCard } from "../../lib/db-schema"
import { exportCardAsImage, renderCardToCanvas } from "../../lib/export-utils"
import { Button } from "../atoms/Button"

interface ShareCardModalProps {
  card: StyleCard
  onClose: () => void
  addLog: (msg: string) => void
}

/**
 * カード共有アクションを提供するドロワー形式のモーダル。
 * 1. Web Share APIを利用したSNS共有
 * 2. 専用画像ページへの遷移
 * 3. PNGダウンロード
 */
export function ShareCardModal({ card, onClose, addLog }: ShareCardModalProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { t } = useLanguage()

  const handleOpenSharePage = () => {
    try {
      const sharePageUrl =
        chrome.runtime.getURL("tabs/share.html") + `?id=${card.id}`
      chrome.tabs.create({ url: sharePageUrl })
      addLog(`Opened share page for card "${card.name}".`)
      onClose()
    } catch (err) {
      console.error("Failed to open share page:", err)
      // Fallback
      window.open(`/tabs/share.html?id=${card.id}`, "_blank")
    }
  }

  const handleCopyToClipboard = async () => {
    setIsSharing(true)
    setErrorMessage(null)
    try {
      const canvas = await renderCardToCanvas(card)
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setErrorMessage(t.share.failedGenerate)
          return
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ])
          addLog(`Copied card "${card.name}" to clipboard.`)
          onClose()
        } catch (clipErr: any) {
          console.error("Clipboard copy failed:", clipErr)
          setErrorMessage(t.share.blockedCopy)
        }
      }, "image/png")
    } catch (err: any) {
      console.error("Clipboard copy failed:", err)
      setErrorMessage(
        `Failed to copy image to clipboard: ${err.message || err}`
      )
    } finally {
      setIsSharing(false)
    }
  }

  const handleDownload = async () => {
    setIsSharing(true)
    try {
      await exportCardAsImage(card)
      addLog(`Downloaded card "${card.name}" as PNG.`)
      onClose()
    } catch (err: any) {
      console.error("Download failed:", err)
      setErrorMessage(`Failed to download image: ${err.message || err}`)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div
      data-testid="share-card-modal-overlay"
      className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex flex-col justify-end"
      onClick={onClose}>
      {/* Drawer Container */}
      <div
        className="bg-white rounded-t-xl max-h-[85%] flex flex-col shadow-2xl transition-all duration-300 transform translate-y-0"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-blue-500" />
            <span>{t.share.shareTitle}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Card Summary Card */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border rounded-lg">
            <div className="w-16 h-16 rounded overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
              <img
                src={
                  !card.thumbnailData ||
                  card.thumbnailData === "assets/icon.png"
                    ? iconUrl
                    : card.thumbnailData
                }
                className="w-full h-full object-cover"
                alt={card.name}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">
                {card.name}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {t.share.tierLabel} {card.tier}
              </p>
              {card.parameters?.sref && (
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {t.share.srefIdLabel} {card.parameters.sref}
                </p>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[11px] flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action List */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              onClick={handleCopyToClipboard}
              disabled={isSharing}
              className="w-full py-2.5 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              data-testid="share-copy-button">
              <Clipboard className="w-4 h-4" />
              {t.share.copyImageBtn}
            </Button>

            <Button
              onClick={handleOpenSharePage}
              variant="outline"
              disabled={isSharing}
              className="w-full py-2.5 flex items-center justify-center gap-2 text-slate-700 border-slate-300 hover:bg-slate-50 font-bold text-xs"
              data-testid="share-page-button">
              <ExternalLink className="w-4 h-4" />
              {t.share.openPageBtn}
            </Button>

            <Button
              onClick={handleDownload}
              variant="secondary"
              disabled={isSharing}
              className="w-full py-2.5 flex items-center justify-center gap-2 text-slate-800 font-bold text-xs"
              data-testid="share-download-button">
              <Download className="w-4 h-4" />
              {t.share.downloadPngBtn}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
