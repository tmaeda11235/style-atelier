import { useConfirm } from "../contexts/ConfirmContext"
import { useLanguage } from "../contexts/LanguageContext"
import { importDatabase } from "../lib/backup-manager"

interface UseLocalBackupImportProps {
  addLog: (log: string) => void
  checkStorage: () => void
  showStatus: (text: string, type: "success" | "error" | "info") => void
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve((e.target?.result as string) || "")
    reader.onerror = () => reject(new Error("File reading error."))
    reader.readAsText(file)
  })
}

export function useLocalBackupImport({
  addLog,
  checkStorage,
  showStatus
}: UseLocalBackupImportProps) {
  const confirm = useConfirm()
  const { t: i18n } = useLanguage()
  const t = i18n.settings

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
    try {
      const text = await readFileAsText(file)
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

  return { handleLocalImport }
}
