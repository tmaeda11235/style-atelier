import { useChromeTabConnection } from "@/hooks/useChromeTabConnection"
import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("useChromeTabConnection", () => {
  const mockSetAlertType = vi.fn()
  const mockAddLog = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const flushPromises = async () => {
    await vi.runAllTicks()
    // Using Promise.resolve() to yield back to event loop without hitting fake timers
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await vi.runAllTicks()
  }

  it("sets alert type to null on successful connection", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 1, status: "complete" }
    ] as any)
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({
      status: "success"
    } as any)

    renderHook(() =>
      useChromeTabConnection({
        workbenchCardsDependency: "card-1-12345",
        setAlertType: mockSetAlertType,
        addLog: mockAddLog
      })
    )

    await flushPromises()

    expect(chrome.tabs.query).toHaveBeenCalled()
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, { type: "PING" })
    expect(mockSetAlertType).toHaveBeenCalledWith(null)
  })

  it("retries on temporary failure and eventually sets alert type to disconnected", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 1, status: "complete" }
    ] as any)
    vi.mocked(chrome.tabs.sendMessage).mockRejectedValue(
      new Error("Connection fail")
    )

    renderHook(() =>
      useChromeTabConnection({
        workbenchCardsDependency: "card-1-12345",
        setAlertType: mockSetAlertType,
        addLog: mockAddLog
      })
    )

    // First attempt fails
    await flushPromises()
    expect(mockAddLog).toHaveBeenCalledWith(
      expect.stringContaining("attempt 1/3")
    )

    // Advance timer for retry 1 (1500ms)
    vi.advanceTimersByTime(1500)
    await flushPromises()
    expect(mockAddLog).toHaveBeenCalledWith(
      expect.stringContaining("attempt 2/3")
    )

    // Advance timer for retry 2 (1500ms)
    vi.advanceTimersByTime(1500)
    await flushPromises()
    expect(mockAddLog).toHaveBeenCalledWith(
      expect.stringContaining("attempt 3/3")
    )

    // Advance timer for retry 3 (1500ms)
    vi.advanceTimersByTime(1500)
    await flushPromises()
    expect(mockAddLog).toHaveBeenCalledWith(
      expect.stringContaining("attempt 4/3")
    )
    expect(mockSetAlertType).toHaveBeenCalledWith("disconnected")
  })

  it("clears timeouts on unmount", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 1, status: "complete" }
    ] as any)
    vi.mocked(chrome.tabs.sendMessage).mockRejectedValue(
      new Error("Connection fail")
    )

    const { unmount } = renderHook(() =>
      useChromeTabConnection({
        workbenchCardsDependency: "card-1-12345",
        setAlertType: mockSetAlertType,
        addLog: mockAddLog
      })
    )

    await flushPromises()
    expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1)

    // Unmount before retry fires
    unmount()

    vi.advanceTimersByTime(1500)
    await flushPromises()

    // Should not have called sendMessage a second time
    expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1)
  })

  it("handles case where no active tab is returned", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([] as any)

    renderHook(() =>
      useChromeTabConnection({
        workbenchCardsDependency: "card-1-12345",
        setAlertType: mockSetAlertType,
        addLog: mockAddLog
      })
    )

    await flushPromises()
    expect(mockAddLog).toHaveBeenCalledWith(
      expect.stringContaining("No active tab returned from query")
    )
  })

  it("handles case where active tab has no ID", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { status: "complete", url: "https://example.com" }
    ] as any)

    renderHook(() =>
      useChromeTabConnection({
        workbenchCardsDependency: "card-1-12345",
        setAlertType: mockSetAlertType,
        addLog: mockAddLog
      })
    )

    await flushPromises()
    expect(mockAddLog).toHaveBeenCalledWith(
      expect.stringContaining("Active tab has no ID")
    )
  })

  it("retries when tab status is loading", async () => {
    vi.mocked(chrome.tabs.query)
      .mockResolvedValueOnce([
        { id: 1, status: "loading", url: "https://example.com" }
      ] as any)
      .mockResolvedValueOnce([
        { id: 1, status: "complete", url: "https://example.com" }
      ] as any)
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({
      status: "success"
    } as any)

    renderHook(() =>
      useChromeTabConnection({
        workbenchCardsDependency: "card-1-12345",
        setAlertType: mockSetAlertType,
        addLog: mockAddLog
      })
    )

    // First query returns loading status, sets timer for 1s
    await flushPromises()
    expect(mockAddLog).toHaveBeenCalledWith(
      expect.stringContaining("Tab is still loading")
    )

    // Advance timer by 1000ms to trigger checkConnection again
    vi.advanceTimersByTime(1000)
    await flushPromises()

    // Second attempt succeeds
    expect(mockSetAlertType).toHaveBeenCalledWith(null)
  })
})
