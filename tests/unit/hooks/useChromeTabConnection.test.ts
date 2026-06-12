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
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({ status: "success" })

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
})
