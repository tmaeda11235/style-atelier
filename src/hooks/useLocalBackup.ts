import { useConfirm } from "../contexts/ConfirmContext"
import { useLanguage } from "../contexts/LanguageContext"
import { exportDatabase, importDatabase } from "../lib/backup-manager"

interface UseLocalBackupProps {
  addLog: (log: string) => void
  checkStorage: () => void
  showStatus: (text: string, type: "success" | "error" | "info") => void
}

export function useLocalBackup({
  addLog,
  checkStorage,
  showStatus
}: UseLocalBackupProps) {
  const confirm = useConfirm()
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
      showStatus(t.importSuccess, "success")
    } catch (err: any) {
      console.error(err)
      addLog(`Export failed: ${err.message || err}`)
      showStatus(
        `${t.importFailed}: ${err.message || "Unknown error"}`,
        "error"
      )
    }
  }

  const handleLocalImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const confirmMsg = t.importConfirm

    const ok = await confirm({
      title: t.confirmTitle,
      message: confirmMsg,
      confirmText: t.confirmBtn,
      cancelText: t.cancelBtn,
      variant: "danger"
    })
    if (!ok) {
      e.target.value = ""
      return
    }

    showStatus(t.readingFile, "info")
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        if (!text) {
          throw new Error("File is empty.")
        }

        await importDatabase(text, "merge")
        addLog("Database restored from local JSON file successfully.")
        showStatus(t.importSuccess, "success")
        checkStorage()
      } catch (err: any) {
        console.error(err)
        addLog(`Import failed: ${err.message || err}`)
        showStatus(
          `${t.importFailed}: ${err.message || "Unknown error"}`,
          "error"
        )
      } finally {
        e.target.value = ""
      }
    }

    reader.onerror = () => {
      addLog("Import failed: File reading error.")
      showStatus(`${t.importFailed}: File reading error.`, "error")
      e.target.value = ""
    }

    reader.readAsText(file)
  }

  return {
    handleLocalExport,
    handleLocalImport
  }
}
