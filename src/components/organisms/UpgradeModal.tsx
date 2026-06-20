import { Check, CreditCard, Key, ShieldAlert, Sparkles, X } from "lucide-react"
import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useLicense } from "../../contexts/LicenseContext"
import { useSettings } from "../../contexts/SettingsContext"
import { Button } from "../atoms/Button"
import { IconButton } from "../atoms/IconButton"

interface UpgradeModalProps {
  onNavigateToSettings?: () => void
}

function UpgradeCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute top-4 right-4">
      <IconButton
        onClick={onClose}
        variant="slate"
        size="sm"
        aria-label="Close modal">
        <X className="w-5 h-5" />
      </IconButton>
    </div>
  )
}

function UpgradeHeader({ reason, t }: { reason: string; t: any }) {
  const featureName = reason && t.settings.upgrade.features[reason]

  return (
    <div className="text-center pt-2">
      <div className="inline-flex p-2.5 bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 rounded-xl mb-3 animate-bounce">
        <Sparkles className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
        {t.settings.upgrade.modalTitle}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {t.settings.upgrade.modalSubtitle}
      </p>
      {featureName && (
        <div className="mt-2.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 border border-amber-500/20 max-w-fit mx-auto animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>
            {t.lang === "ja"
              ? `「${featureName}」を利用するにはアップグレードが必要です`
              : `Upgrading is required to use "${featureName}"`}
          </span>
        </div>
      )}
    </div>
  )
}

function UpgradeFeaturesTable({ t }: { t: any }) {
  const proFeatures = [
    { key: "unlimitedCards", free: false, pro: true },
    { key: "gdriveSync", free: false, pro: true },
    { key: "notionSync", free: false, pro: true },
    { key: "customCard", free: false, pro: true },
    { key: "localAi", free: true, pro: true },
    { key: "prioritySupport", free: false, pro: true }
  ]

  return (
    <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <th className="p-3 text-left font-bold">
              {t.lang === "ja" ? "機能" : "Features"}
            </th>
            <th className="p-3 text-center w-16">
              {t.settings.upgrade.freePlan}
            </th>
            <th className="p-3 text-center w-16 text-indigo-600 dark:text-indigo-400">
              {t.settings.upgrade.proPlan}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-600 dark:text-slate-300">
          {proFeatures.map((feat) => (
            <tr
              key={feat.key}
              className="hover:bg-slate-100/30 dark:hover:bg-slate-900/10">
              <td className="p-3 font-medium text-xs">
                {t.settings.upgrade.features[feat.key]}
              </td>
              <td className="p-3 text-center">
                {feat.free ? (
                  <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                ) : (
                  <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                )}
              </td>
              <td className="p-3 text-center">
                <Check className="w-4 h-4 text-indigo-500 dark:text-indigo-400 mx-auto font-bold" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UpgradeFooter({
  onGoToSettings,
  t
}: {
  onGoToSettings: () => void
  t: any
}) {
  return (
    <div className="space-y-4 pt-2">
      <a
        href="https://style-atelier.lemonsqueezy.com/buy"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full">
        <Button
          variant="primary"
          fullWidth
          className="h-11 justify-center gap-2 shadow-lg shadow-indigo-500/20 dark:shadow-none bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-none font-semibold text-white">
          <CreditCard className="w-4 h-4" />
          <span>{t.settings.upgrade.checkoutBtn}</span>
        </Button>
      </a>

      <Button
        id="upgrade-goto-settings-btn"
        variant="ghost"
        fullWidth
        onClick={onGoToSettings}
        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold justify-center gap-1.5">
        <Key className="w-3.5 h-3.5" />
        <span>{t.settings.upgrade.alreadyHaveKey}</span>
      </Button>
    </div>
  )
}

export function UpgradeModal({ onNavigateToSettings }: UpgradeModalProps) {
  const { upgradeModalOpen, upgradeModalReason, closeUpgradeModal } =
    useLicense()
  const { t, lang } = useLanguage()
  const { setAutoOpenSection } = useSettings()

  if (!upgradeModalOpen) return null

  const handleGoToSettings = () => {
    closeUpgradeModal()
    setAutoOpenSection("license")
    if (onNavigateToSettings) {
      onNavigateToSettings()
    } else {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("change-expert-tab", { detail: "settings" })
        )
        window.dispatchEvent(
          new CustomEvent("change-easy-tab", { detail: "settings" })
        )
      }, 0)
    }
  }

  const tWithLang = { ...t, lang }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="upgrade-modal"
        className="relative w-full max-w-md overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
        <UpgradeCloseButton onClose={closeUpgradeModal} />
        <div className="p-6 overflow-y-auto space-y-6">
          <UpgradeHeader reason={upgradeModalReason} t={tWithLang} />
          <UpgradeFeaturesTable t={tWithLang} />
          <UpgradeFooter onGoToSettings={handleGoToSettings} t={tWithLang} />
        </div>
      </div>
    </div>
  )
}
