import { useLanguage } from "../contexts/LanguageContext"
import { exportDatabase } from "../lib/backup-manager"

interface UseLocalBackupExportProps {
  addLog: (log: string) => void
  showStatus: (text: string, type: "success" | "error" | "info") => void
}

export function useLocalBackupExport({
  addLog,
  showStatus
}: UseLocalBackupExportProps) {
  const { t: i18n } = useLanguage()
  const t = i18n.settings

  const handleLocalExport = async () => {
    try {
      showStatus(t.readingFile, "info")
      const jsonData = await exportDatabase()
      const blob = new Blob([jsonData], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      link.href = url
      link.download = `style-atelier-backup-${timestamp}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      addLog("Database exported to local JSON file successfully.")
      showStatus(t.exportSuccess, "success")
    } catch (err: any) {
      console.error(err)
      addLog(`Export failed: ${err.message || err}`)
      showStatus(
        `${t.exportFailed}: ${err.message || "Unknown error"}`,
        "error"
      )
    }
  }

  return { handleLocalExport }
}
