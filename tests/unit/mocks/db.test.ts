import { describe, expect, it } from "vitest"

import { MockStyleAtelierDatabase } from "../../../tests/mocks/db"

describe("MockStyleAtelierDatabase", () => {
  it("should support basic CRUD operations", async () => {
    const mockDb = new MockStyleAtelierDatabase()
    const id = await mockDb.styleCards.add({ id: "card-1", name: "Card 1" })
    expect(id).toBe("card-1")

    const card = await mockDb.styleCards.get("card-1")
    expect(card).toEqual({ id: "card-1", name: "Card 1" })

    await mockDb.styleCards.update("card-1", { name: "Updated Card" })
    const updated = await mockDb.styleCards.get("card-1")
    expect(updated.name).toBe("Updated Card")

    await mockDb.styleCards.delete("card-1")
    const deleted = await mockDb.styleCards.get("card-1")
    expect(deleted).toBeUndefined()
  })

  it("should support Collection operations through filter()", async () => {
    const mockDb = new MockStyleAtelierDatabase()
    await mockDb.styleCards.add({ id: "1", name: "Alice", active: true })
    await mockDb.styleCards.add({ id: "2", name: "Bob", active: false })
    await mockDb.styleCards.add({ id: "3", name: "Charlie", active: true })

    const collection = mockDb.styleCards.filter((item: any) => item.active)

    // toArray
    const arr = await collection.toArray()
    expect(arr).toHaveLength(2)
    expect(arr[0].name).toBe("Alice")
    expect(arr[1].name).toBe("Charlie")

    // count
    const count = await collection.count()
    expect(count).toBe(2)

    // first
    const firstItem = await collection.first()
    expect(firstItem?.name).toBe("Alice")

    // last
    const lastItem = await collection.last()
    expect(lastItem?.name).toBe("Charlie")

    // each
    const names: string[] = []
    await collection.each((item: any) => {
      names.push(item.name)
    })
    expect(names).toEqual(["Alice", "Charlie"])
  })

  it("should support Collection chain methods (limit, offset, reverse, modify)", async () => {
    const mockDb = new MockStyleAtelierDatabase()
    await mockDb.styleCards.add({ id: "1", index: 1, val: "A" })
    await mockDb.styleCards.add({ id: "2", index: 2, val: "B" })
    await mockDb.styleCards.add({ id: "3", index: 3, val: "C" })

    // orderBy & reverse
    const orderedDesc = await mockDb.styleCards
      .orderBy("index")
      .reverse()
      .toArray()
    expect(orderedDesc.map((item: any) => item.val)).toEqual(["C", "B", "A"])

    // orderBy & limit & offset
    const partial = await mockDb.styleCards
      .orderBy("index")
      .offset(1)
      .limit(1)
      .toArray()
    expect(partial.map((item: any) => item.val)).toEqual(["B"])

    // modify
    await mockDb.styleCards
      .filter((item: any) => item.index > 1)
      .modify((item: any) => {
        item.val = "Modified"
      })

    const c2 = await mockDb.styleCards.get("2")
    const c3 = await mockDb.styleCards.get("3")
    expect(c2.val).toBe("Modified")
    expect(c3.val).toBe("Modified")
  })

  it("should support equals and modify in where query", async () => {
    const mockDb = new MockStyleAtelierDatabase()
    await mockDb.styleCards.add({ id: "1", type: "type-a", val: "old" })
    await mockDb.styleCards.add({ id: "2", type: "type-b", val: "old" })

    const res = await mockDb.styleCards.where("type").equals("type-a").first()
    expect(res?.id).toBe("1")

    await mockDb.styleCards
      .where("type")
      .equals("type-a")
      .modify((item: any) => {
        item.val = "new"
      })

    const item1 = await mockDb.styleCards.get("1")
    const item2 = await mockDb.styleCards.get("2")
    expect(item1.val).toBe("new")
    expect(item2.val).toBe("old")
  })

  it("should support pure CRUD saveParameterAlias", async () => {
    const mockDb = new MockStyleAtelierDatabase()
    const aliasData = { paramType: "type", value: "val", alias: "alias1" }

    // Add new alias
    const id = await mockDb.saveParameterAlias(aliasData)
    expect(id).toBeDefined()
    const added = await mockDb.parameterAliases.get(id)
    expect(added.alias).toBe("alias1")
    // Update existing alias
    await mockDb.saveParameterAlias({
      id,
      ...aliasData,
      alias: "updated-alias"
    })
    const updated = await mockDb.parameterAliases.get(id)
    expect(updated.alias).toBe("updated-alias")
  })

  it("should support pure CRUD deleteParameterFolder without cascading side effects", async () => {
    const mockDb = new MockStyleAtelierDatabase()

    // Setup a folder and an alias pointing to it
    await mockDb.parameterFolders.add({ id: "folder-1", name: "Folder 1" })
    await mockDb.parameterAliases.add({
      id: "alias-1",
      alias: "alias1",
      folderId: "folder-1"
    })

    // Delete folder
    await mockDb.deleteParameterFolder("folder-1")

    // The folder should be deleted
    const folder = await mockDb.parameterFolders.get("folder-1")
    expect(folder).toBeUndefined()

    // The alias should still have folderId (no cascade update in mock)
    const alias = await mockDb.parameterAliases.get("alias-1")
    expect(alias).toBeDefined()
    expect(alias.folderId).toBe("folder-1")
  })
})
