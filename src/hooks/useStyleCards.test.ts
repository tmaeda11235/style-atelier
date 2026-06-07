import { renderHook, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import * as store from "../lib/style-card-store"
import { QueryTestProvider } from "../test/react-query-helper"
import {
  useAddStyleCard,
  useDeleteStyleCard,
  usePinnedStyleCards,
  useStyleCards,
  useUpdateStyleCard
} from "./useStyleCards"

vi.mock("../lib/style-card-store", () => ({
  getAllStyleCards: vi.fn(),
  getPinnedStyleCards: vi.fn(),
  addStyleCard: vi.fn(),
  updateStyleCard: vi.fn(),
  deleteStyleCard: vi.fn()
}))

describe("useStyleCards hooks", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryTestProvider, null, children)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("useStyleCards fetches all cards", async () => {
    const mockCards = [{ id: "1", name: "Card 1" }]
    vi.mocked(store.getAllStyleCards).mockResolvedValue(mockCards as any)

    const { result } = renderHook(() => useStyleCards(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockCards)
    expect(store.getAllStyleCards).toHaveBeenCalled()
  })

  it("usePinnedStyleCards fetches pinned cards", async () => {
    const mockCards = [{ id: "1", name: "Card 1", isPinned: true }]
    vi.mocked(store.getPinnedStyleCards).mockResolvedValue(mockCards as any)

    const { result } = renderHook(() => usePinnedStyleCards(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockCards)
    expect(store.getPinnedStyleCards).toHaveBeenCalled()
  })

  it("useAddStyleCard calls addStyleCard and invalidates query", async () => {
    vi.mocked(store.addStyleCard).mockResolvedValue("new-id")

    const { result } = renderHook(() => useAddStyleCard(), { wrapper })

    result.current.mutate({ id: "new" } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(store.addStyleCard).mock.calls[0][0]).toEqual({
      id: "new"
    })
  })

  it("useUpdateStyleCard calls updateStyleCard", async () => {
    vi.mocked(store.updateStyleCard).mockResolvedValue(1)

    const { result } = renderHook(() => useUpdateStyleCard(), { wrapper })

    result.current.mutate({ id: "1", changes: { name: "updated" } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(store.updateStyleCard).mock.calls[0][0]).toBe("1")
    expect(vi.mocked(store.updateStyleCard).mock.calls[0][1]).toEqual({
      name: "updated"
    })
  })

  it("useDeleteStyleCard calls deleteStyleCard", async () => {
    vi.mocked(store.deleteStyleCard).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteStyleCard(), { wrapper })

    result.current.mutate("1")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(store.deleteStyleCard).mock.calls[0][0]).toBe("1")
  })
})
