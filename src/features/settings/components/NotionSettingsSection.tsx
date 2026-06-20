import React from "react"

import { useLanguage } from "../../../contexts/LanguageContext"
import { useLicense } from "../../../contexts/LicenseContext"
import {
  FeedbackAlert,
  NotionSettingsAlert,
  NotionSettingsForm,
  NotionSettingsHeader
} from "./NotionSettingsForm"
import { useNotionSettingsSection } from "./useNotionSettingsSection"

export function NotionSettingsSection() {
  const { isPremium, openUpgradeModal } = useLicense()
  const { t } = useLanguage()
  const state = useNotionSettingsSection(t)

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
      <NotionSettingsHeader isPremium={isPremium} t={t} />
      {!isPremium && (
        <NotionSettingsAlert
          t={t}
          onUpgrade={() => openUpgradeModal("notionSync")}
        />
      )}
      <NotionSettingsForm
        apiKey={state.apiKey}
        setApiKey={state.setApiKey}
        databaseId={state.databaseId}
        setDatabaseId={state.setDatabaseId}
        isPremium={isPremium}
        isTesting={state.isTesting}
        isSaving={state.isSaving}
        onTest={state.handleTest}
        onSave={state.handleSave}
        t={t}
      />
      {state.feedback.type && <FeedbackAlert feedback={state.feedback} />}
    </div>
  )
}
