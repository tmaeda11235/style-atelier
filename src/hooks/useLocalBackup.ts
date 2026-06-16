import React from "react"

import { useLocalBackupExport } from "./useLocalBackupExport"
import { useLocalBackupImport } from "./useLocalBackupImport"

export interface UseLocalBackupProps {
  addLog: (msg: string) => void
  checkStorage: () => void
  showStatus: (msg: string, type: "info" | "success" | "error") => void
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
