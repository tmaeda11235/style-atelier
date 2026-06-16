import { db } from "@/lib/db"
import {
  addParameterFolder,
  deleteParameterFolder,
  generateUUID,
  saveParameterAlias
} from "@/lib/db/alias-ops"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.unmock("@/lib/db")
vi.unmock("@/lib/db/alias-ops")

describe("alias-ops tests", () => {
  beforeEach(async () => {
    await db.parameterAliases.clear()
    await db.parameterFolders.clear()
  })

  it("generateUUID should return a string uuid", () => {
    const uuid1 = generateUUID()
    const uuid2 = generateUUID()
    expect(typeof uuid1).toBe("string")
    expect(uuid1.length).toBeGreaterThan(5)
    expect(uuid1).not.toBe(uuid2)
  })

  describe("saveParameterAlias", () => {
    it("should add a new alias if no id or existing value", async () => {
      const aliasId = await saveParameterAlias(db, {
        paramType: "sref",
        value: "value-1",
        alias: "Alias 1"
      })
      expect(aliasId).toBeDefined()
      const saved = await db.parameterAliases.get(aliasId)
      expect(saved).toBeDefined()
      expect(saved?.alias).toBe("Alias 1")
    })

    it("should update existing alias if id is provided", async () => {
      await db.parameterAliases.add({
        id: "existing-id",
        paramType: "sref",
        value: "value-1",
        alias: "Alias 1",
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      const returnedId = await saveParameterAlias(db, {
        id: "existing-id",
        paramType: "sref",
        value: "value-1",
        alias: "Updated Alias"
      })

      expect(returnedId).toBe("existing-id")
      const saved = await db.parameterAliases.get("existing-id")
      expect(saved?.alias).toBe("Updated Alias")
    })

    it("should update by matching value if duplicate value is found without id", async () => {
      await db.parameterAliases.add({
        id: "existing-id",
        paramType: "sref",
        value: "value-1",
        alias: "Alias 1",
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      const returnedId = await saveParameterAlias(db, {
        paramType: "sref",
        value: "value-1",
        alias: "Duplicate Updated Alias"
      })

      expect(returnedId).toBe("existing-id")
      const saved = await db.parameterAliases.get("existing-id")
      expect(saved?.alias).toBe("Duplicate Updated Alias")
    })
  })

  describe("addParameterFolder and deleteParameterFolder", () => {
    it("should add a folder", async () => {
      const folderId = await addParameterFolder(db, {
        name: "Folder 1"
      })
      expect(folderId).toBeDefined()
      const folder = await db.parameterFolders.get(folderId)
      expect(folder?.name).toBe("Folder 1")
    })

    it("should delete folder and clear folderId on aliases, plus update parentIds on children", async () => {
      const parentFolderId = await addParameterFolder(db, {
        name: "Parent Folder"
      })
      const childFolderId = await addParameterFolder(db, {
        name: "Child Folder",
        parentId: parentFolderId
      })

      await db.parameterAliases.add({
        id: "alias-1",
        paramType: "sref",
        value: "value-1",
        alias: "Alias 1",
        folderId: parentFolderId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      await deleteParameterFolder(db, parentFolderId)

      // Alias folderId should be cleared
      const alias = await db.parameterAliases.get("alias-1")
      expect(alias?.folderId).toBeUndefined()

      // Child folder parentId should be updated to parent's parentId (which was undefined)
      const childFolder = await db.parameterFolders.get(childFolderId)
      expect(childFolder?.parentId).toBeUndefined()

      // Parent folder should be deleted
      const parentFolder = await db.parameterFolders.get(parentFolderId)
      expect(parentFolder).toBeUndefined()
    })
  })
})
