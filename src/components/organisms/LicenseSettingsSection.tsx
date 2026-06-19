import {
  Key,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles
} from "lucide-react"
import React, { useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useLicense } from "../../contexts/LicenseContext"
import { Button } from "../atoms/Button"
import { Input } from "../atoms/Input"

interface StatusConfig {
  color: string
  text: string
  icon: React.ReactNode
}

interface Feedback {
  type: "success" | "error" | null
  message: string
}

const INPUT_CLASS =
  "w-full pl-3 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-text-primary placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 font-mono"
const ACTIVATE_BTN_CLASS =
  "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/10 transition-all active:scale-99"
const BUY_BTN_CLASS =
  "flex items-center justify-center py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all"

function getStatusConfig(licenseStatus: string, t: any): StatusConfig {
  switch (licenseStatus) {
    case "valid":
      return {
        color:
          "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 border border-emerald-500/20",
        text: t.settings.license.statusValid,
        icon: <ShieldCheck className="w-4 h-4 shrink-0" />
      }
    case "expired":
      return {
        color:
          "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 border border-amber-500/20",
        text: t.settings.license.statusExpired,
        icon: <ShieldAlert className="w-4 h-4 shrink-0" />
      }
    case "invalid":
      return {
        color:
          "bg-rose-500/10 text-rose-600 dark:bg-rose-400/10 dark:text-rose-400 border border-rose-500/20",
        text: t.settings.license.statusInvalid,
        icon: <ShieldAlert className="w-4 h-4 shrink-0" />
      }
    default:
      return {
        color:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
        text: t.settings.license.statusUnlicensed,
        icon: <Key className="w-4 h-4 shrink-0" />
      }
  }
}

function LicenseStatusBadge({ statusConfig }: { statusConfig: StatusConfig }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusConfig.color}`}
      id="license-status-badge">
      {statusConfig.icon}
      <span>{statusConfig.text}</span>
    </div>
  )
}

function LicenseFeedbackAlert({ feedback }: { feedback: Feedback }) {
  if (!feedback.type) return null
  const isSuccess = feedback.type === "success"
  return (
    <div
      className={`flex items-start gap-2.5 p-3 rounded-xl text-xs animate-in fade-in duration-200 ${
        isSuccess
          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          : "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
      }`}
      id="license-feedback-alert">
      {isSuccess ? (
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
      ) : (
        <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
      )}
      <span className="font-semibold leading-relaxed">{feedback.message}</span>
    </div>
  )
}

function LicenseActiveView({
  onDeactivate,
  t
}: {
  onDeactivate: () => void
  t: any
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-text-secondary">
          {t.settings.license.keyLabel}
        </label>
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            ••••••••••••••••••••••••••••••••
          </span>
          <span className="inline-flex p-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Sparkles className="w-4.5 h-4.5" />
          </span>
        </div>
      </div>

      <Button
        onClick={onDeactivate}
        variant="outline"
        fullWidth
        className="py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs transition-all active:scale-99"
        id="license-deactivate-btn">
        {t.settings.license.deactivate}
      </Button>
    </div>
  )
}

function LicenseActionButtons({
  isLoading,
  inputKey,
  t
}: {
  isLoading: boolean
  inputKey: string
  t: any
}) {
  return (
    <div className="flex gap-2">
      <Button
        type="submit"
        disabled={isLoading || !inputKey.trim()}
        variant="primary"
        className={ACTIVATE_BTN_CLASS}
        id="license-activate-btn">
        {isLoading && (
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
        )}
        {t.settings.license.activate}
      </Button>

      <a
        href="https://style-atelier.lemonsqueezy.com/checkout/buy/pro"
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1">
        <Button
          type="button"
          variant="outline"
          fullWidth
          className={BUY_BTN_CLASS}
          id="license-buy-btn">
          {t.settings.license.getLicense}
        </Button>
      </a>
    </div>
  )
}

function LicenseInactiveForm({
  inputKey,
  setInputKey,
  isLoading,
  onSubmit,
  t
}: {
  inputKey: string
  setInputKey: (val: string) => void
  isLoading: boolean
  onSubmit: (e: React.FormEvent) => void
  t: any
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-text-secondary">
          {t.settings.license.keyLabel}
        </label>
        <div className="relative">
          <Input
            type="text"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            disabled={isLoading}
            placeholder={t.settings.license.placeholder}
            className={INPUT_CLASS}
            id="license-key-input"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Key className="w-4 h-4" />
          </div>
        </div>
      </div>

      <LicenseActionButtons isLoading={isLoading} inputKey={inputKey} t={t} />
    </form>
  )
}

function LicenseSettingsHeader({ t }: { t: any }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-text-primary">
        {t.settings.license.title}
      </h3>
      <p className="text-xs text-text-secondary leading-relaxed">
        {t.settings.license.description}
      </p>
    </div>
  )
}

function LicenseSettingsStatus({
  licenseStatus,
  t
}: {
  licenseStatus: string
  t: any
}) {
  const statusConfig = getStatusConfig(licenseStatus, t)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-text-secondary">
        {t.settings.license.status}
      </span>
      <LicenseStatusBadge statusConfig={statusConfig} />
    </div>
  )
}

// eslint-disable-next-line max-lines-per-function
export function LicenseSettingsSection() {
  const {
    licenseKey,
    licenseStatus,
    isLoading,
    activateLicense,
    deactivateLicense
  } = useLicense()
  const { t } = useLanguage()

  const [inputKey, setInputKey] = useState<string>(licenseKey)
  const [feedback, setFeedback] = useState<Feedback>({
    type: null,
    message: ""
  })

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputKey.trim()) return

    setFeedback({ type: null, message: "" })
    const success = await activateLicense(inputKey)

    setFeedback({
      type: success ? "success" : "error",
      message: success ? t.settings.license.success : t.settings.license.failed
    })
  }

  const handleDeactivate = async () => {
    await deactivateLicense()
    setInputKey("")
    setFeedback({
      type: "success",
      message: t.settings.license.deactivateSuccess
    })
  }

  return (
    <div className="p-5 space-y-6 animate-in slide-in-from-top-2 duration-250">
      <LicenseSettingsHeader t={t} />
      <LicenseSettingsStatus licenseStatus={licenseStatus} t={t} />

      {licenseStatus === "valid" ? (
        <LicenseActiveView onDeactivate={handleDeactivate} t={t} />
      ) : (
        <LicenseInactiveForm
          inputKey={inputKey}
          setInputKey={setInputKey}
          isLoading={isLoading}
          onSubmit={handleActivate}
          t={t}
        />
      )}

      <LicenseFeedbackAlert feedback={feedback} />
    </div>
  )
}
