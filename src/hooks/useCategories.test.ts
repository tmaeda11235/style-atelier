import { renderHook, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../lib/db"
import * as store from "../lib/style-card-store"
import { QueryTestProvider } from "../test/react-query-helper"
import {
  useAddCategory,
  useCategories,
  useDeleteCategory,
  useUpdateCategory
} from "./useCategories"

vi.mock("../lib/style-card-store", () => ({
  getAllCategories: vi.fn()
}))

vi.mock("../lib/db", () => ({
  db: {
    addCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn()
  }
}))

describe("useCategories hooks", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryTestProvider, null, children)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("useCategories fetches all categories", async () => {
    const mockCategories = [{ id: "1", name: "Category 1" }]
    vi.mocked(store.getAllCategories).mockResolvedValue(mockCategories as any)

    const { result } = renderHook(() => useCategories(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockCategories)
    expect(store.getAllCategories).toHaveBeenCalled()
  })

  it("useAddCategory calls db.addCategory and invalidates query", async () => {
    vi.mocked(db.addCategory).mockResolvedValue("new-cat-id")

    const { result } = renderHook(() => useAddCategory(), { wrapper })

    result.current.mutate({ id: "new", name: "New" } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(db.addCategory).mock.calls[0][0]).toEqual({
      id: "new",
      name: "New"
    })
  })

  it("useUpdateCategory calls db.updateCategory", async () => {
    vi.mocked(db.updateCategory).mockResolvedValue(1)

    const { result } = renderHook(() => useUpdateCategory(), { wrapper })

    result.current.mutate({ id: "1", changes: { name: "updated" } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(db.updateCategory).mock.calls[0][0]).toBe("1")
    expect(vi.mocked(db.updateCategory).mock.calls[0][1]).toEqual({
      name: "updated"
    })
  })

  it("useDeleteCategory calls db.deleteCategory", async () => {
    vi.mocked(db.deleteCategory).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteCategory(), { wrapper })

    result.current.mutate("1")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(db.deleteCategory).mock.calls[0][0]).toBe("1")
  })
})
