import React, { useEffect, useState } from "react"

import type { StyleCard } from "../lib/db-schema"
import { exportCardAsImage, renderCardToCanvas } from "../lib/export-utils"
import { getStyleCardById } from "../lib/style-card-store"

import "../style.css"

import { LanguageProvider, useLanguage } from "../contexts/LanguageContext"
import {
  SharePageContent,
  SharePageStatusView,
  TranslationType
} from "./share-components"

function useClipboardCopy(card: StyleCard | null, t: TranslationType) {
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const copy = async () => {
    if (!card) return
    setSuccess(null)
    setError(null)
    try {
      const canvas = await renderCardToCanvas(card)
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError(t.failedBlob)
          return
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ])
          setSuccess(t.clipboardSuccess)
        } catch {
          setError(t.clipboardBlocked)
        }
      }, "image/png")
    } catch {
      setError(t.clipboardFailed)
    }
  }

  return { copy, success, error, setSuccess, setError }
}

function useDownloadCard(card: StyleCard | null, t: TranslationType) {
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    if (!card) return
    setSuccess(null)
    setError(null)
    try {
      await exportCardAsImage(card)
      setSuccess(t.downloadStarted)
    } catch {
      setError(t.downloadFailed)
    }
  }

  return { download, success, error, setSuccess, setError }
}

function useLoadCard(t: TranslationType) {
  const [card, setCard] = useState<StyleCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCard() {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const id = urlParams.get("id")
        if (!id) throw new Error(t.noCardId)

        const foundCard = await getStyleCardById(id)
        if (!foundCard) throw new Error(t.cardNotFound)

        setCard(foundCard)
        const canvas = await renderCardToCanvas(foundCard)
        setImageSrc(canvas.toDataURL("image/png"))
      } catch (err: any) {
        console.error("Error loading shared card:", err)
        setError(err.message || t.failedLoad)
      } finally {
        setLoading(false)
      }
    }
    loadCard()
  }, [t])

  return { card, loading, imageSrc, error }
}

export function SharePageInner() {
  const { t: i18n } = useLanguage()
  const t = i18n.share

  const { card, loading, imageSrc, error: loadError } = useLoadCard(t)
  const copyState = useClipboardCopy(card, t)
  const dlState = useDownloadCard(card, t)

  const handleCopyToClipboard = () => {
    dlState.setSuccess(null)
    dlState.setError(null)
    copyState.copy()
  }

  const handleDownload = () => {
    copyState.setSuccess(null)
    copyState.setError(null)
    dlState.download()
  }

  if (loading || (loadError && !card) || !card) {
    return (
      <SharePageStatusView
        loading={loading}
        loadError={loadError}
        card={card}
        onClose={() => window.close()}
        t={t}
      />
    )
  }

  return (
    <SharePageContent
      card={card}
      imageSrc={imageSrc}
      activeSuccess={copyState.success || dlState.success}
      activeError={copyState.error || dlState.error}
      handleCopyToClipboard={handleCopyToClipboard}
      handleDownload={handleDownload}
      handleClose={() => window.close()}
      t={t}
    />
  )
}

export default function SharePage() {
  return (
    <LanguageProvider>
      <SharePageInner />
    </LanguageProvider>
  )
}
