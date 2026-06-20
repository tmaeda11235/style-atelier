import { useParameterAliases } from "@/hooks/useParameterAliases"
import { db } from "@/lib/db"
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock dexie-react-hooks
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any) => fn()
}))

vi.mock("@/lib/db", () => ({
  db: {
    getAllParameterAliases: vi.fn(),
    saveParameterAlias: vi.fn(),
    deleteParameterAlias: vi.fn()
  }
}))

describe("useParameterAliases hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch all parameter aliases from IndexedDB", () => {
    const mockAliases = [{ id: "1", parameter: "--p", alias: "p1" }]
    vi.mocked(db.getAllParameterAliases).mockReturnValue(mockAliases as any)

    const { result } = renderHook(() => useParameterAliases())

    expect(result.current.aliases).toEqual(mockAliases)
    expect(db.getAllParameterAliases).toHaveBeenCalled()
  })

  it("should call saveParameterAlias on db when saveAlias is called", async () => {
    vi.mocked(db.saveParameterAlias).mockResolvedValue("new-id" as any)
    const { result } = renderHook(() => useParameterAliases())

    const aliasData = { parameter: "--p", alias: "p1" } as any
    const newId = await result.current.saveAlias(aliasData)

    expect(newId).toBe("new-id")
    expect(db.saveParameterAlias).toHaveBeenCalledWith(aliasData)
  })

  it("should call deleteParameterAlias on db when deleteAlias is called", async () => {
    vi.mocked(db.deleteParameterAlias).mockResolvedValue(1 as any)
    const { result } = renderHook(() => useParameterAliases())

    await result.current.deleteAlias("1")

    expect(db.deleteParameterAlias).toHaveBeenCalledWith("1")
  })
})
