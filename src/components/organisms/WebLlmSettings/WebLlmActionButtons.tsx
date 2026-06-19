import { Download, Trash2 } from "lucide-react"
import React from "react"

import { Button } from "../../atoms/Button"

export function WebLlmActionButtons({
  status,
  startDownload,
  handlePurge,
  t,
  _isSupported = true
}: {
  status: string
  startDownload: () => void
  handlePurge: () => void
  t: Record<string, string>
  _isSupported?: boolean
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      {status !== "ready" &&
        status !== "downloading" &&
        status !== "retrying" && (
          <Button
            id="webllm-download-btn"
            type="button"
            onClick={startDownload}
            disabled={status === "checking"}
            variant="primary"
            size="sm"
            fullWidth
            className="flex-1 gap-1.5 cursor-pointer">
            <Download className="w-3.5 h-3.5" />
            {t.webLlmDownloadBtn || "Download Model"}
          </Button>
        )}

      {status === "ready" && (
        <Button
          type="button"
          onClick={handlePurge}
          variant="secondary"
          size="sm"
          fullWidth
          className="flex-1 gap-1.5 cursor-pointer">
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          {t.webLlmPurgeBtn || "Delete Cache"}
        </Button>
      )}
    </div>
  )
}
