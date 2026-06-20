import { useState } from "react"

import { useLanguage } from "../contexts/LanguageContext"
import {
  exportStyleCardsToCSV,
  exportStyleCardsToMarkdownZip
} from "../lib/card-export"
import { db } from "../lib/db"

interface UseCardExportProps {
  addLog: (log: string) => void
  showStatus: (text: string, type: "success" | "error" | "info") => void
}

const downloadFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function executeExport(
  type: "csv" | "markdown",
  generator: (cards: any[], categories: any[]) => Blob,
  extension: string,
  addLog: (log: string) => void,
  showStatus: (text: string, type: "success" | "error" | "info") => void,
  setIsExporting: (exporting: boolean) => void,
  t: any
) {
  setIsExporting(true)
  showStatus(t.exportingText || "Exporting...", "info")
  try {
    const cards = await db.getAllCards()
    const categories = await db.getAllCategories()
    const blob = generator(cards, categories)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const filePrefix = type === "csv" ? "cards" : "markdown"
    downloadFile(blob, `style-atelier-${filePrefix}-${timestamp}.${extension}`)
    const logType = type === "csv" ? "CSV" : "Markdown ZIP"
    addLog(`Style cards exported to ${logType} successfully.`)
    showStatus(t.exportSuccess || "Export completed!", "success")
  } catch (err: any) {
    console.error(err)
    addLog(`${type.toUpperCase()} Export failed: ${err.message || err}`)
    showStatus(
      `${t.exportFailed || "Export failed"}: ${err.message || "Unknown error"}`,
      "error"
    )
  } finally {
    setIsExporting(false)
  }
}

export function useCardExport({ addLog, showStatus }: UseCardExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { t: i18n } = useLanguage()
  const t = i18n.settings

  const handleExportCSV = () =>
    executeExport(
      "csv",
      (cards, categories) =>
        new Blob(["\uFEFF" + exportStyleCardsToCSV(cards, categories)], {
          type: "text/csv;charset=utf-8;"
        }),
      "csv",
      addLog,
      showStatus,
      setIsExporting,
      t
    )

  const handleExportMarkdown = () =>
    executeExport(
      "markdown",
      (cards, categories) =>
        new Blob([exportStyleCardsToMarkdownZip(cards, categories) as any], {
          type: "application/zip"
        }),
      "zip",
      addLog,
      showStatus,
      setIsExporting,
      t
    )

  return {
    handleExportCSV,
    handleExportMarkdown,
    isExporting
  }
}
