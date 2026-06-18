import { useLiveQuery } from "dexie-react-hooks"

import { db } from "../lib/db"
import type { ParameterAlias } from "../shared/lib/db-schema"

export function useParameterAliases() {
  const aliases = useLiveQuery(() => db.getAllParameterAliases()) ?? []

  const saveAlias = async (
    alias: Omit<ParameterAlias, "id" | "createdAt" | "updatedAt"> & {
      id?: string
    }
  ) => {
    return db.saveParameterAlias(alias)
  }

  const deleteAlias = async (id: string) => {
    return db.deleteParameterAlias(id)
  }

  return {
    aliases,
    saveAlias,
    deleteAlias
  }
}
