import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../lib/db"
import { useParameterFolders } from "./useParameterFolders"

// Mock dexie-react-hooks
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any) => fn()
}))

vi.mock("../lib/db", () => ({
  db: {
    getAllParameterFolders: vi.fn(),
    addParameterFolder: vi.fn(),
    updateParameterFolder: vi.fn(),
    deleteParameterFolder: vi.fn()
  }
}))

describe("useParameterFolders hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch all parameter folders from IndexedDB", () => {
    const mockFolders = [{ id: "1", name: "Folder 1" }]
    vi.mocked(db.getAllParameterFolders).mockReturnValue(mockFolders as any)

    const { result } = renderHook(() => useParameterFolders())

    expect(result.current.folders).toEqual(mockFolders)
    expect(db.getAllParameterFolders).toHaveBeenCalled()
  })

  it("should call addParameterFolder on db when addFolder is called", async () => {
    vi.mocked(db.addParameterFolder).mockResolvedValue("new-id" as any)
    const { result } = renderHook(() => useParameterFolders())

    const folderData = { name: "New Folder" }
    const newId = await result.current.addFolder(folderData)

    expect(newId).toBe("new-id")
    expect(db.addParameterFolder).toHaveBeenCalledWith(folderData)
  })

  it("should call updateParameterFolder on db when updateFolder is called", async () => {
    vi.mocked(db.updateParameterFolder).mockResolvedValue(1 as any)
    const { result } = renderHook(() => useParameterFolders())

    await result.current.updateFolder("1", "Updated Folder", "parent-id")

    expect(db.updateParameterFolder).toHaveBeenCalledWith(
      "1",
      "Updated Folder",
      "parent-id"
    )
  })

  it("should call deleteParameterFolder on db when deleteFolder is called", async () => {
    vi.mocked(db.deleteParameterFolder).mockResolvedValue(1 as any)
    const { result } = renderHook(() => useParameterFolders())

    await result.current.deleteFolder("1")

    expect(db.deleteParameterFolder).toHaveBeenCalledWith("1")
  })
})
