import { useLocalBackupExport } from "./useLocalBackupExport"
import { useLocalBackupImport } from "./useLocalBackupImport"

interface UseLocalBackupProps {
  addLog: (log: string) => void
  checkStorage: () => void
  showStatus: (text: string, type: "success" | "error" | "info") => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}

export function useLocalBackup({
  addLog,
  checkStorage,
  showStatus,
  fileInputRef: _fileInputRef
}: UseLocalBackupProps) {
  const { handleLocalExport } = useLocalBackupExport({ addLog, showStatus })
  const { handleLocalImport } = useLocalBackupImport({
    addLog,
    checkStorage,
    showStatus
  })

  return {
    handleLocalExport,
    handleLocalImport
  }
}
