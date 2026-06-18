import type {
  ParameterAlias,
  ParameterFolder
} from "../../shared/lib/db-schema"
import type { StyleAtelierDatabase } from "../db"

export function generateUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  )
}

export async function saveParameterAlias(
  db: StyleAtelierDatabase,
  alias: Omit<ParameterAlias, "id" | "createdAt" | "updatedAt"> & {
    id?: string
  }
): Promise<string> {
  const now = Date.now()
  if (alias.id) {
    await db.parameterAliases.update(alias.id, {
      ...alias,
      updatedAt: now
    })
    return alias.id
  } else {
    const existing = await db.getAliasByValue(alias.paramType, alias.value)
    if (existing) {
      await db.parameterAliases.update(existing.id, {
        alias: alias.alias,
        folderId: alias.folderId,
        updatedAt: now
      })
      return existing.id
    } else {
      const id = generateUUID()
      await db.parameterAliases.add({
        ...alias,
        id,
        createdAt: now,
        updatedAt: now
      } as ParameterAlias)
      return id
    }
  }
}

export async function deleteParameterFolder(
  db: StyleAtelierDatabase,
  id: string
): Promise<void> {
  await db.parameterAliases
    .where("folderId")
    .equals(id)
    .modify({ folderId: undefined })
  const folder = await db.parameterFolders.get(id)
  const newParentId = folder?.parentId
  await db.parameterFolders
    .where("parentId")
    .equals(id)
    .modify({ parentId: newParentId })
  await db.parameterFolders.delete(id)
}

export async function addParameterFolder(
  db: StyleAtelierDatabase,
  folder: Omit<ParameterFolder, "id" | "createdAt"> & { id?: string }
): Promise<string> {
  const id = folder.id || generateUUID()
  await db.parameterFolders.add({
    ...folder,
    id,
    createdAt: Date.now()
  } as ParameterFolder)
  return id
}
