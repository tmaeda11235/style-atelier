import { AlertTriangle, RefreshCw, ExternalLink, X } from "lucide-react"
import { Button } from "../atoms/Button"

export type AlertType = "disconnected" | "no_input" | null

interface ConnectionAlertProps {
    type: AlertType
    onRetry: () => void
    onDismiss?: () => void
}

export const ConnectionAlert = ({ type, onRetry, onDismiss }: ConnectionAlertProps) => {
    if (!type) return null

    const DismissButton = () => (
        onDismiss ? (
            <button
                onClick={onDismiss}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 text-slate-500 hover:text-slate-700 transition-colors"
                title="Dismiss"
            >
                <X className="w-3 h-3" />
            </button>
        ) : null
    )

    if (type === "disconnected") {
        return (
            <div className="relative bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex gap-3 text-amber-900 shadow-sm pr-8">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1 space-y-2">
                    <p className="font-semibold">Connection Lost</p>
                    <p className="text-amber-800/80 text-xs leading-relaxed">
                        The extension has lost connection to the page. This usually happens after an update or prolonged inactivity.
                    </p>
                    <Button
                        size="sm"
                        variant="outline"
                        className="bg-white border-amber-300 hover:bg-amber-50 text-amber-800 w-full justify-center"
                        onClick={() => {
                            chrome.tabs.reload()
                            if (onDismiss) onDismiss()
                        }}
                    >
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Reload Page
                    </Button>
                </div>
                <DismissButton />
            </div>
        )
    }

    if (type === "no_input") {
        return (
            <div className="relative bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm flex gap-3 text-blue-900 shadow-sm pr-8">
                <ExternalLink className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="flex-1 space-y-2">
                    <p className="font-semibold">Input Not Found</p>
                    <p className="text-blue-800/80 text-xs leading-relaxed">
                        Could not find the chat input. Please ensure you are on the "Create" page or the Midjourney gallery details view.
                    </p>
                    <Button
                        size="sm"
                        variant="outline"
                        className="bg-white border-blue-300 hover:bg-blue-50 text-blue-800 w-full justify-center"
                        onClick={onRetry}
                    >
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Retry Connection
                    </Button>
                </div>
                <DismissButton />
            </div>
        )
    }

    return null
}
