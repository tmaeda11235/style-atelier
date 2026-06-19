import {
  AlertTriangle,
  Database,
  ExternalLink,
  Key,
  RefreshCw,
  ShieldCheck
} from "lucide-react"
import React from "react"

import { Button } from "../../../components/atoms/Button"
import { Input } from "../../../components/atoms/Input"

interface NotionSettingsHeaderProps {
  isPremium: boolean
  t: any
}

export function NotionSettingsHeader({
  isPremium,
  t
}: NotionSettingsHeaderProps) {
  return (
    <div className="flex items-start gap-4 mb-4">
      <div
        className={`p-3 rounded-xl ${isPremium ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
        <ExternalLink className="w-6 h-6" />
      </div>
      <div className="space-y-1 flex-1">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          {t.lang === "ja" ? "Notion 連携設定" : "Notion Integration"}
          {isPremium && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
              <ShieldCheck className="w-3 h-3 mr-0.5" />{" "}
              {t.lang === "ja" ? "有効" : "Active"}
            </span>
          )}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {t.lang === "ja"
            ? "スタイルカードを Notion データベースと同期するための設定を行います。"
            : "Configure connection settings to sync your style cards to Notion database."}
        </p>
      </div>
    </div>
  )
}

interface NotionSettingsAlertProps {
  t: any
  onUpgrade: () => void
}

export function NotionSettingsAlert({
  t,
  onUpgrade
}: NotionSettingsAlertProps) {
  return (
    <div
      className="flex flex-col gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4 text-xs text-amber-800"
      id="notion-premium-alert">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span className="font-medium">
          {t.lang === "ja"
            ? "Notion 同期機能を利用するには Premium Pro ライセンスが必要です。"
            : "A Premium Pro license is required to use Notion integration."}
        </span>
      </div>
      <Button
        type="button"
        onClick={onUpgrade}
        className="self-start px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-all text-xs"
        id="notion-upgrade-btn">
        {t.lang === "ja" ? "アップグレード" : "Upgrade"}
      </Button>
    </div>
  )
}

interface FieldProps {
  val: string
  setVal: (v: string) => void
  disabled: boolean
  t: any
}

function NotionApiKeyField({ val, setVal, disabled, t }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="notion-api-key-input"
        className="text-xs font-semibold text-slate-600 dark:text-slate-400">
        {t.lang === "ja"
          ? "Notion API キー (Internal Integration Token)"
          : "Notion API Key"}
      </label>
      <div className="relative">
        <Input
          type="password"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={disabled}
          placeholder="secret_..."
          className="pl-3 pr-10 font-mono text-xs h-9"
          size="sm"
          id="notion-api-key-input"
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <Key className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}

function NotionDatabaseIdField({ val, setVal, disabled, t }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="notion-database-id-input"
        className="text-xs font-semibold text-slate-600 dark:text-slate-400">
        {t.lang === "ja" ? "データベース ID (Database ID)" : "Database ID"}
      </label>
      <div className="relative">
        <Input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={disabled}
          placeholder="e.g. 8b67..."
          className="pl-3 pr-10 font-mono text-xs h-9"
          size="sm"
          id="notion-database-id-input"
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <Database className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}

interface NotionInputFieldsProps {
  apiKey: string
  setApiKey: (val: string) => void
  databaseId: string
  setDatabaseId: (val: string) => void
  isPremium: boolean
  isTesting: boolean
  isSaving: boolean
  t: any
}

function NotionInputFields({
  apiKey,
  setApiKey,
  databaseId,
  setDatabaseId,
  isPremium,
  isTesting,
  isSaving,
  t
}: NotionInputFieldsProps) {
  const disabled = !isPremium || isTesting || isSaving
  return (
    <>
      <NotionApiKeyField
        val={apiKey}
        setVal={setApiKey}
        disabled={disabled}
        t={t}
      />
      <NotionDatabaseIdField
        val={databaseId}
        setVal={setDatabaseId}
        disabled={disabled}
        t={t}
      />
    </>
  )
}

interface NotionButtonActionsProps {
  apiKey: string
  databaseId: string
  isPremium: boolean
  isTesting: boolean
  isSaving: boolean
  onTest: () => void
  t: any
}

function NotionButtonActions({
  apiKey,
  databaseId,
  isPremium,
  isTesting,
  isSaving,
  onTest,
  t
}: NotionButtonActionsProps) {
  const isBtnDisabled =
    !isPremium || !apiKey.trim() || !databaseId.trim() || isTesting || isSaving
  return (
    <div className="flex gap-2 pt-2">
      <Button
        type="button"
        onClick={onTest}
        disabled={isBtnDisabled}
        variant="outline"
        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all disabled:opacity-50"
        id="notion-test-connection-btn">
        {isTesting && (
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
        )}
        {t.lang === "ja" ? "接続確認テスト" : "Test Connection"}
      </Button>

      <Button
        type="submit"
        disabled={isBtnDisabled}
        variant="primary"
        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/10 transition-all active:scale-99"
        id="notion-save-settings-btn">
        {isSaving && (
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
        )}
        {t.lang === "ja" ? "設定を保存" : "Save Settings"}
      </Button>
    </div>
  )
}

interface NotionSettingsFormProps {
  apiKey: string
  setApiKey: (val: string) => void
  databaseId: string
  setDatabaseId: (val: string) => void
  isPremium: boolean
  isTesting: boolean
  isSaving: boolean
  onTest: () => void
  onSave: (e: React.FormEvent) => void
  t: any
}

export function NotionSettingsForm({
  apiKey,
  setApiKey,
  databaseId,
  setDatabaseId,
  isPremium,
  isTesting,
  isSaving,
  onTest,
  onSave,
  t
}: NotionSettingsFormProps) {
  return (
    <form onSubmit={onSave} className="space-y-4">
      <NotionInputFields
        apiKey={apiKey}
        setApiKey={setApiKey}
        databaseId={databaseId}
        setDatabaseId={setDatabaseId}
        isPremium={isPremium}
        isTesting={isTesting}
        isSaving={isSaving}
        t={t}
      />
      <NotionButtonActions
        apiKey={apiKey}
        databaseId={databaseId}
        isPremium={isPremium}
        isTesting={isTesting}
        isSaving={isSaving}
        onTest={onTest}
        t={t}
      />
    </form>
  )
}

export function FeedbackAlert({
  feedback
}: {
  feedback: { type: "success" | "error" | null; message: string }
}) {
  return (
    <div
      className={`flex items-start gap-2.5 p-3 mt-4 rounded-xl text-xs animate-in fade-in duration-200 ${
        feedback.type === "success"
          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          : "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
      }`}
      id="notion-feedback-alert">
      <span className="font-semibold leading-relaxed">{feedback.message}</span>
    </div>
  )
}
