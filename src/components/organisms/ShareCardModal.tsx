import {
  AlertCircle,
  Clipboard,
  Download,
  ExternalLink,
  Share2,
  X
} from "lucide-react"
import React from "react"

import { useShareCard } from "../../hooks/useShareCard"
import type { StyleCard, UserSettings } from "../../shared/lib/db-schema"
import { Button } from "../atoms/Button"
import { OpfsImage } from "../atoms/OpfsImage"
import { PremiumBrandingPanel } from "./PremiumBrandingPanel"

interface ShareCardModalProps {
  card: StyleCard
  onClose: () => void
  addLog: (msg: string) => void
}

interface HeaderProps {
  title: string
  onClose: () => void
}

function ShareCardModalHeader({ title, onClose }: HeaderProps) {
  return (
    <div className="p-4 border-b border-border-primary flex items-center justify-between">
      <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
        <Share2 className="w-4 h-4 text-blue-500" />
        <span>{title}</span>
      </h3>
      <Button
        onClick={onClose}
        variant="ghost"
        size="icon"
        className="p-1 rounded-full text-text-secondary hover:bg-surface-hover transition-colors"
        data-testid="share-modal-close-btn">
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}

interface CardSummaryProps {
  card: StyleCard
  tierLabel: string
  srefIdLabel: string
}

function CardSummary({ card, tierLabel, srefIdLabel }: CardSummaryProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted border border-border-primary rounded-lg">
      <div className="w-16 h-16 rounded overflow-hidden border border-border-primary shadow-sm flex-shrink-0">
        <OpfsImage
          src={card.thumbnailPath || card.thumbnailData || "assets/icon.png"}
          className="w-full h-full object-cover"
          alt={card.name}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-text-primary truncate">
          {card.name}
        </p>
        <p className="text-[10px] text-text-secondary mt-0.5">
          {tierLabel} {card.tier}
        </p>
        {card.parameters?.sref && (
          <p className="text-[10px] text-text-secondary truncate mt-0.5">
            {srefIdLabel} {card.parameters.sref}
          </p>
        )}
      </div>
    </div>
  )
}

interface BrandLogoToggleProps {
  label: string
  enabled: boolean
  onToggle: () => void
}

function BrandLogoToggle({ label, enabled, onToggle }: BrandLogoToggleProps) {
  return (
    <div className="flex items-center justify-between bg-muted border border-border-primary rounded-lg p-3">
      <span className="text-xs font-bold text-text-primary">{label}</span>
      <Button
        type="button"
        id="share-modal-brand-logo-toggle"
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          enabled ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800"
        }`}
        style={{ padding: 0 }}>
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </Button>
    </div>
  )
}

interface ShareActionsProps {
  isSharing: boolean
  copyImageBtn: string
  openPageBtn: string
  downloadPngBtn: string
  onCopyToClipboard: () => void
  onOpenSharePage: () => void
  onDownload: () => void
}

function ShareActions({
  isSharing,
  copyImageBtn,
  openPageBtn,
  downloadPngBtn,
  onCopyToClipboard,
  onOpenSharePage,
  onDownload
}: ShareActionsProps) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <Button
        onClick={onCopyToClipboard}
        disabled={isSharing}
        className="w-full py-2.5 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
        data-testid="share-copy-button">
        <Clipboard className="w-4 h-4" />
        {copyImageBtn}
      </Button>

      <Button
        onClick={onOpenSharePage}
        variant="outline"
        disabled={isSharing}
        className="w-full py-2.5 flex items-center justify-center gap-2 font-bold text-xs"
        data-testid="share-page-button">
        <ExternalLink className="w-4 h-4" />
        {openPageBtn}
      </Button>

      <Button
        onClick={onDownload}
        variant="secondary"
        disabled={isSharing}
        className="w-full py-2.5 flex items-center justify-center gap-2 font-bold text-xs"
        data-testid="share-download-button">
        <Download className="w-4 h-4" />
        {downloadPngBtn}
      </Button>
    </div>
  )
}

interface ErrorMessageProps {
  message: string
}

function ShareCardErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="p-2.5 bg-red-50 border border-red-100 dark:bg-red-950/30 dark:border-red-900/30 dark:text-red-400 rounded-lg text-red-600 text-[11px] flex items-start gap-1.5">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  )
}

interface ShareCardModalContentProps {
  card: StyleCard
  onClose: () => void
  isSharing: boolean
  errorMessage: string | null
  localIncludeBrandLogo: boolean
  handleToggleBrandLogo: () => void
  handleOpenSharePage: () => void
  handleCopyToClipboard: () => void
  handleDownload: () => void
  isPremium: boolean
  userSettings: UserSettings | null
  handleUpdateBranding: (changes: Partial<UserSettings["branding"]>) => void
  openUpgradeModal: (type: string) => void
  t: any
}

interface ShareCardModalBodyProps {
  card: StyleCard
  errorMessage: string | null
  localIncludeBrandLogo: boolean
  handleToggleBrandLogo: () => void
  isSharing: boolean
  isPremium: boolean
  userSettings: UserSettings | null
  handleUpdateBranding: (changes: Partial<UserSettings["branding"]>) => void
  openUpgradeModal: (type: string) => void
  t: any
  handleCopyToClipboard: () => void
  handleOpenSharePage: () => void
  handleDownload: () => void
}

interface BrandingToggleSectionProps {
  localIncludeBrandLogo: boolean
  handleToggleBrandLogo: () => void
  isPremium: boolean
  userSettings: UserSettings | null
  handleUpdateBranding: (changes: Partial<UserSettings["branding"]>) => void
  openUpgradeModal: (type: string) => void
  t: any
}

function BrandingToggleSection({
  localIncludeBrandLogo,
  handleToggleBrandLogo,
  isPremium,
  userSettings,
  handleUpdateBranding,
  openUpgradeModal,
  t
}: BrandingToggleSectionProps) {
  return (
    <>
      <BrandLogoToggle
        label={
          t.share.includeBrandLogoToggleLabel ||
          "Include logo in exported image"
        }
        enabled={localIncludeBrandLogo}
        onToggle={handleToggleBrandLogo}
      />
      {localIncludeBrandLogo && (
        <PremiumBrandingPanel
          isPremium={isPremium}
          userSettings={userSettings}
          onUpdateBranding={handleUpdateBranding}
          onUpgrade={() => openUpgradeModal("custom-branding")}
        />
      )}
    </>
  )
}

interface ShareModalMainSectionProps {
  card: StyleCard
  errorMessage: string | null
  localIncludeBrandLogo: boolean
  handleToggleBrandLogo: () => void
  isSharing: boolean
  isPremium: boolean
  userSettings: UserSettings | null
  handleUpdateBranding: (changes: Partial<UserSettings["branding"]>) => void
  openUpgradeModal: (type: string) => void
  t: any
  handleCopyToClipboard: () => void
  handleOpenSharePage: () => void
  handleDownload: () => void
}

function ShareModalMainSection(props: ShareModalMainSectionProps) {
  const { t } = props
  const actions = {
    isSharing: props.isSharing,
    copyImageBtn: t.share.copyImageBtn,
    openPageBtn: t.share.openPageBtn,
    downloadPngBtn: t.share.downloadPngBtn,
    onCopyToClipboard: props.handleCopyToClipboard,
    onOpenSharePage: props.handleOpenSharePage,
    onDownload: props.handleDownload
  }

  return (
    <>
      <CardSummary
        card={props.card}
        tierLabel={t.share.tierLabel}
        srefIdLabel={t.share.srefIdLabel}
      />
      {props.errorMessage && (
        <ShareCardErrorMessage message={props.errorMessage} />
      )}
      <BrandingToggleSection {...props} />
      <ShareActions {...actions} />
    </>
  )
}

function ShareCardModalBody(props: ShareCardModalBodyProps) {
  return (
    <div className="p-5 flex flex-col gap-4 overflow-y-auto">
      <ShareModalMainSection {...props} />
    </div>
  )
}

function ShareCardModalContent(props: ShareCardModalContentProps) {
  return (
    <div
      className="bg-surface rounded-t-xl max-h-[85%] flex flex-col shadow-2xl transition-all duration-300 transform translate-y-0"
      onClick={(e) => e.stopPropagation()}>
      <ShareCardModalHeader
        title={props.t.share.shareTitle}
        onClose={props.onClose}
      />
      <ShareCardModalBody {...props} />
    </div>
  )
}

/**
 * カード共有アクションを提供するドロワー形式のモーダル。
 * 1. Web Share APIを利用したSNS共有
 * 2. 専用画像ページへの遷移
 * 3. PNGダウンロード
 */
export function ShareCardModal({ card, onClose, addLog }: ShareCardModalProps) {
  const state = useShareCard({ card, onClose, addLog })

  return (
    <div
      data-testid="share-card-modal-overlay"
      className="fixed inset-0 bg-black/20 dark:bg-slate-900/60 backdrop-blur-sm z-[100] flex flex-col justify-end"
      onClick={onClose}>
      <ShareCardModalContent card={card} onClose={onClose} {...state} />
    </div>
  )
}
