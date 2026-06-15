import { useState } from "react"

import { useLanguage } from "../contexts/LanguageContext"
import { useSettings } from "../contexts/SettingsContext"
import type { StyleCard } from "../lib/db-schema"
import { exportCardAsImage, renderCardToCanvas } from "../lib/export-utils"

interface UseShareCardProps {
  card: StyleCard
  onClose: () => void
  addLog: (msg: string) => void
}

function openSharePage(
  cardId: string,
  cardName: string,
  addLog: (msg: string) => void,
  onClose: () => void
) {
  try {
    const sharePageUrl =
      chrome.runtime.getURL("tabs/share.html") + `?id=${cardId}`
    chrome.tabs.create({ url: sharePageUrl })
    addLog(`Opened share page for card "${cardName}".`)
    onClose()
  } catch (err) {
    console.error("Failed to open share page:", err)
    window.open(`/tabs/share.html?id=${cardId}`, "_blank")
  }
}

interface CopyParams {
  card: StyleCard
  includeLogo: boolean
  logoText: string
  failedMsg: string
  blockedMsg: string
  addLog: (msg: string) => void
  onClose: () => void
  setIsSharing: (v: boolean) => void
  setErrorMessage: (msg: string | null) => void
}

async function copyToClipboard({
  card,
  includeLogo,
  logoText,
  failedMsg,
  blockedMsg,
  addLog,
  onClose,
  setIsSharing,
  setErrorMessage
}: CopyParams) {
  setIsSharing(true)
  setErrorMessage(null)
  try {
    const canvas = await renderCardToCanvas(card, {
      includeBrandLogo: includeLogo,
      brandLogoText: logoText
    })
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setErrorMessage(failedMsg)
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
        setErrorMessage(blockedMsg)
      }
    }, "image/png")
  } catch (err: any) {
    console.error("Clipboard copy failed:", err)
    setErrorMessage(`Failed to copy image to clipboard: ${err.message || err}`)
  } finally {
    setIsSharing(false)
  }
}

interface DownloadParams {
  card: StyleCard
  includeLogo: boolean
  logoText: string
  addLog: (msg: string) => void
  onClose: () => void
  setIsSharing: (v: boolean) => void
  setErrorMessage: (msg: string | null) => void
}

async function downloadImage({
  card,
  includeLogo,
  logoText,
  addLog,
  onClose,
  setIsSharing,
  setErrorMessage
}: DownloadParams) {
  setIsSharing(true)
  try {
    await exportCardAsImage(card, {
      includeBrandLogo: includeLogo,
      brandLogoText: logoText
    })
    addLog(`Downloaded card "${card.name}" as PNG.`)
    onClose()
  } catch (err: any) {
    console.error("Download failed:", err)
    setErrorMessage(`Failed to download image: ${err.message || err}`)
  } finally {
    setIsSharing(false)
  }
}

export function useShareCard({ card, onClose, addLog }: UseShareCardProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { t } = useLanguage()
  const { includeBrandLogo, alwaysEnglishLogoText } = useSettings()
  const [localIncludeBrandLogo, setLocalIncludeBrandLogo] =
    useState(includeBrandLogo)

  const brandLogoText = alwaysEnglishLogoText
    ? "Minted with Style Atelier 🔮"
    : t.share.brandBadgeText || "Minted with Style Atelier 🔮"

  const handleOpenSharePage = () =>
    openSharePage(card.id, card.name, addLog, onClose)

  const handleCopyToClipboard = () =>
    copyToClipboard({
      card,
      includeLogo: localIncludeBrandLogo,
      logoText: brandLogoText,
      failedMsg: t.share.failedGenerate,
      blockedMsg: t.share.blockedCopy,
      addLog,
      onClose,
      setIsSharing,
      setErrorMessage
    })

  const handleDownload = () =>
    downloadImage({
      card,
      includeLogo: localIncludeBrandLogo,
      logoText: brandLogoText,
      addLog,
      onClose,
      setIsSharing,
      setErrorMessage
    })

  return {
    isSharing,
    errorMessage,
    localIncludeBrandLogo,
    setLocalIncludeBrandLogo,
    handleOpenSharePage,
    handleCopyToClipboard,
    handleDownload,
    t
  }
}
