import { AlertTriangle, ExternalLink, RefreshCw, X } from "lucide-react"

import { useLanguage } from "../../contexts/LanguageContext"
import { safeReloadTab } from "../../lib/chrome-utils"
import { Button } from "../atoms/Button"

export type AlertType =
  | "disconnected"
  | "no_input"
  | "hand_full"
  | "db_error"
  | null

interface ConnectionAlertProps {
  type: AlertType
  onRetry: () => void
  onDismiss?: () => void
}

interface AlertItemProps {
  t: any
  DismissButton: () => React.JSX.Element | null
}

const DisconnectedAlert = ({
  t,
  onDismiss,
  DismissButton
}: AlertItemProps & { onDismiss?: () => void }) => (
  <div className="relative bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex gap-3 text-amber-900 shadow-sm pr-8">
    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
    <div className="flex-1 space-y-2">
      <p className="font-semibold">
        {t.alerts?.disconnectedTitle || "Connection Lost"}
      </p>
      <p className="text-amber-800/80 text-xs leading-relaxed">
        {t.alerts?.disconnectedDesc ||
          "The extension has lost connection to the page. This usually happens after an update or prolonged inactivity."}
      </p>
      <Button
        size="sm"
        variant="outline"
        className="bg-white border-amber-300 hover:bg-amber-50 text-amber-800 w-full justify-center"
        onClick={() => {
          safeReloadTab()
          if (onDismiss) onDismiss()
        }}>
        <RefreshCw className="w-3 h-3 mr-2" />
        {t.alerts?.disconnectedBtn || "Reload Page"}
      </Button>
    </div>
    <DismissButton />
  </div>
)

const NoInputAlert = ({
  t,
  onRetry,
  DismissButton
}: AlertItemProps & { onRetry: () => void }) => (
  <div className="relative bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm flex gap-3 text-blue-900 shadow-sm pr-8">
    <ExternalLink className="w-5 h-5 text-blue-600 shrink-0" />
    <div className="flex-1 space-y-2">
      <p className="font-semibold">
        {t.alerts?.noInputTitle || "Input Not Found"}
      </p>
      <p className="text-blue-800/80 text-xs leading-relaxed">
        {t.alerts?.noInputDesc ||
          'Could not find the chat input. Please ensure you are on the "Create" page or the Midjourney gallery details view.'}
      </p>
      <Button
        size="sm"
        variant="outline"
        className="bg-white border-blue-300 hover:bg-blue-50 text-blue-800 w-full justify-center"
        onClick={onRetry}>
        <RefreshCw className="w-3 h-3 mr-2" />
        {t.alerts?.noInputBtn || "Retry Connection"}
      </Button>
    </div>
    <DismissButton />
  </div>
)

const HandFullAlert = ({ t, DismissButton }: AlertItemProps) => (
  <div
    className="relative bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm flex gap-3 text-rose-900 shadow-sm pr-8"
    id="alert-hand-full">
    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
    <div className="flex-1 space-y-1">
      <p className="font-semibold text-rose-950">
        {t.alerts?.handFullTitle || "Hand is Full"}
      </p>
      <p className="text-rose-800/80 text-xs leading-relaxed">
        {t.alerts?.handFullDesc ||
          "You can only pin up to 7 cards. Please unpin another card first."}
      </p>
    </div>
    <DismissButton />
  </div>
)

const DbErrorAlert = ({ t, DismissButton }: AlertItemProps) => (
  <div
    className="relative bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm flex gap-3 text-rose-900 shadow-sm pr-8"
    id="alert-db-error">
    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
    <div className="flex-1 space-y-1">
      <p className="font-semibold text-rose-950">
        {t.alerts?.dbErrorTitle || "Database Write Error"}
      </p>
      <p className="text-rose-800/80 text-xs leading-relaxed">
        {t.alerts?.dbErrorDesc ||
          "Database write failed. Please check your storage limits."}
      </p>
    </div>
    <DismissButton />
  </div>
)

export const ConnectionAlert = ({
  type,
  onRetry,
  onDismiss
}: ConnectionAlertProps) => {
  const context = useLanguage()
  const { t } = context
  if (!type) return null

  const DismissButton = () =>
    onDismiss ? (
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 text-slate-500 hover:text-slate-700 transition-colors"
        title="Dismiss">
        <X className="w-3 h-3" />
      </button>
    ) : null

  switch (type) {
    case "disconnected":
      return (
        <DisconnectedAlert
          t={t}
          onDismiss={onDismiss}
          DismissButton={DismissButton}
        />
      )
    case "no_input":
      return (
        <NoInputAlert t={t} onRetry={onRetry} DismissButton={DismissButton} />
      )
    case "hand_full":
      return <HandFullAlert t={t} DismissButton={DismissButton} />
    case "db_error":
      return <DbErrorAlert t={t} DismissButton={DismissButton} />
    default:
      return null
  }
}
