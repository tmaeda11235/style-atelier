import { db } from "@/lib/db"
import { useEffect, useState } from "react"

import { useLanguage } from "../contexts/LanguageContext"
import { useLicense } from "../contexts/LicenseContext"
import { useSettings } from "../contexts/SettingsContext"
import { exportCardAsImage, renderCardToCanvas } from "../lib/export-utils"
import type { StyleCard, UserSettings } from "../shared/lib/db-schema"

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
  brandingEnabled?: boolean
  customLogo?: string
  customLogoPath?: string
  twitter?: string
  etsy?: string
  socialDisplayType?: "text" | "qr" | "none"
  failedMsg: string
  blockedMsg: string
  addLog: (msg: string) => void
  onClose: () => void
  setIsSharing: (v: boolean) => void
  setErrorMessage: (msg: string | null) => void
}

async function copyToClipboard(params: CopyParams) {
  params.setIsSharing(true)
  params.setErrorMessage(null)
  try {
    const canvas = await renderCardToCanvas(params.card, {
      includeBrandLogo: params.includeLogo,
      brandLogoText: params.logoText,
      brandingEnabled: params.brandingEnabled,
      customLogo: params.customLogo,
      customLogoPath: params.customLogoPath,
      twitter: params.twitter,
      etsy: params.etsy,
      socialDisplayType: params.socialDisplayType
    })
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    )
    if (!blob) {
      params.setErrorMessage(params.failedMsg)
      return
    }
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
    params.addLog(`Copied card "${params.card.name}" to clipboard.`)
    params.onClose()
  } catch (err: any) {
    console.error("Clipboard copy failed:", err)
    if (err.name === "NotAllowedError" || err.message?.includes("permission")) {
      params.setErrorMessage(params.blockedMsg)
    } else {
      params.setErrorMessage(
        `Failed to copy image to clipboard: ${err.message || err}`
      )
    }
  } finally {
    params.setIsSharing(false)
  }
}

interface DownloadParams {
  card: StyleCard
  includeLogo: boolean
  logoText: string
  brandingEnabled?: boolean
  customLogo?: string
  customLogoPath?: string
  twitter?: string
  etsy?: string
  socialDisplayType?: "text" | "qr" | "none"
  addLog: (msg: string) => void
  onClose: () => void
  setIsSharing: (v: boolean) => void
  setErrorMessage: (msg: string | null) => void
}

async function downloadImage({
  card,
  includeLogo,
  logoText,
  brandingEnabled,
  customLogo,
  customLogoPath,
  twitter,
  etsy,
  socialDisplayType,
  addLog,
  onClose,
  setIsSharing,
  setErrorMessage
}: DownloadParams) {
  setIsSharing(true)
  try {
    await exportCardAsImage(card, {
      includeBrandLogo: includeLogo,
      brandLogoText: logoText,
      brandingEnabled,
      customLogo,
      customLogoPath,
      twitter,
      etsy,
      socialDisplayType
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

interface BrandingData {
  brandingEnabled?: boolean
  customLogo?: string
  customLogoPath?: string
  twitter?: string
  etsy?: string
  socialDisplayType?: "text" | "qr" | "none"
}

function getBrandingParams(
  isPremium: boolean,
  userSettings: UserSettings | null
): BrandingData {
  if (!isPremium) return { socialDisplayType: "none" }
  return {
    brandingEnabled: userSettings?.branding?.enabled,
    customLogo: userSettings?.branding?.customLogo,
    customLogoPath: userSettings?.branding?.customLogoPath,
    twitter: userSettings?.branding?.twitter,
    etsy: userSettings?.branding?.etsy,
    socialDisplayType: userSettings?.branding?.socialDisplayType || "none"
  }
}

export function useBrandingSettings(
  isPremium: boolean,
  openUpgradeModal: (type: string) => void
) {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)

  useEffect(() => {
    db.getUserSettings().then((settings) => {
      setUserSettings(settings)
    })
  }, [])

  const handleUpdateBranding = async (
    changes: Partial<UserSettings["branding"]>
  ) => {
    if (!isPremium) {
      openUpgradeModal("custom-branding")
      return
    }
    setUserSettings((prev) => {
      if (!prev) return null
      return {
        ...prev,
        branding: {
          ...prev.branding,
          ...changes
        }
      }
    })
    await db.updateUserSettings({ branding: changes as any })
  }

  return { userSettings, handleUpdateBranding }
}

function useShareActions(
  card: StyleCard,
  localIncludeBrandLogo: boolean,
  logoTxt: string,
  brandParams: any,
  addLog: (msg: string) => void,
  onClose: () => void,
  isPremium: boolean,
  openUpgradeModal: (type: string) => void,
  t: any
) {
  const [isSharing, setIsSharing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const common = {
    card,
    includeLogo: localIncludeBrandLogo,
    logoText: logoTxt,
    ...brandParams,
    addLog,
    onClose,
    setIsSharing,
    setErrorMessage
  }

  return {
    isSharing,
    errorMessage,
    handleToggleBrandLogo: (
      setLocal: (v: boolean) => void,
      current: boolean
    ) => {
      if (!isPremium) return openUpgradeModal("custom-branding")
      setLocal(!current)
    },
    handleOpenSharePage: () =>
      openSharePage(card.id, card.name, addLog, onClose),
    handleCopyToClipboard: () =>
      copyToClipboard({
        ...common,
        failedMsg: t.share.failedGenerate,
        blockedMsg: t.share.blockedCopy
      }),
    handleDownload: () => downloadImage(common)
  }
}

export function useShareCard({ card, onClose, addLog }: UseShareCardProps) {
  const { t } = useLanguage()
  const { isPremium, openUpgradeModal } = useLicense()
  const { includeBrandLogo, alwaysEnglishLogoText } = useSettings()
  const [localIncludeBrandLogo, setLocalIncludeBrandLogo] = useState(
    isPremium ? includeBrandLogo : true
  )
  const { userSettings, handleUpdateBranding } = useBrandingSettings(
    isPremium,
    openUpgradeModal
  )

  const logoTxt = alwaysEnglishLogoText
    ? "Minted with Style Atelier 🔮"
    : t.share.brandBadgeText || "Minted with Style Atelier 🔮"
  const brandParams = getBrandingParams(isPremium, userSettings)

  const actions = useShareActions(
    card,
    localIncludeBrandLogo,
    logoTxt,
    brandParams,
    addLog,
    onClose,
    isPremium,
    openUpgradeModal,
    t
  )

  return {
    ...actions,
    localIncludeBrandLogo,
    handleToggleBrandLogo: () =>
      actions.handleToggleBrandLogo(
        setLocalIncludeBrandLogo,
        localIncludeBrandLogo
      ),
    isPremium,
    userSettings,
    handleUpdateBranding,
    openUpgradeModal,
    t
  }
}
