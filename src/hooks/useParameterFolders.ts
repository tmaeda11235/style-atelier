import { useLiveQuery } from "dexie-react-hooks"

import { db } from "../lib/db"
import type { ParameterFolder } from "../lib/db-schema"

export function useParameterFolders() {
  const folders = useLiveQuery(() => db.getAllParameterFolders()) ?? []

  const addFolder = async (
    folder: Omit<ParameterFolder, "id" | "createdAt"> & { id?: string }
  ) => {
    return db.addParameterFolder(folder)
  }

  const updateFolder = async (id: string, name: string, parentId?: string) => {
    return db.updateParameterFolder(id, name, parentId)
  }

  const deleteFolder = async (id: string) => {
    return db.deleteParameterFolder(id)
  }

  return {
    folders,
    addFolder,
    updateFolder,
    deleteFolder
  }
}
