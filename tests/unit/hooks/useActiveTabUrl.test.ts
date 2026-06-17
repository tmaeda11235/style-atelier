import { useActiveTabUrl } from "@/hooks/useActiveTabUrl"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("useActiveTabUrl hook", () => {
  let mockActivatedListener: any = null
  let mockUpdatedListener: any = null
  let mockFocusListener: any = null

  beforeEach(() => {
    vi.stubGlobal("chrome", {
      runtime: {
        id: "mock-extension-id",
        sendMessage: vi.fn(),
        connect: vi.fn()
      },
      tabs: {
        query: vi.fn(),
        onActivated: {
          addListener: vi.fn((fn) => {
            mockActivatedListener = fn
          }),
          removeListener: vi.fn()
        },
        onUpdated: {
          addListener: vi.fn((fn) => {
            mockUpdatedListener = fn
          }),
          removeListener: vi.fn()
        }
      },
      windows: {
        onFocusChanged: {
          addListener: vi.fn((fn) => {
            mockFocusListener = fn
          }),
          removeListener: vi.fn()
        }
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockActivatedListener = null
    mockUpdatedListener = null
    mockFocusListener = null
  })

  it("should return isTargetSite = true when active tab is a Midjourney domain", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: "https://www.midjourney.com/imagine" }
    ] as any)

    const { result } = renderHook(() => useActiveTabUrl())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isTargetSite).toBe(true)
  })

  it("should return isTargetSite = false when active tab is not a target domain", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: "https://www.google.com" }
    ] as any)

    const { result } = renderHook(() => useActiveTabUrl())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isTargetSite).toBe(false)
  })

  it("should update isTargetSite when tab is activated", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: "https://www.midjourney.com" }
    ] as any)

    const { result } = renderHook(() => useActiveTabUrl())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isTargetSite).toBe(true)

    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: "https://google.com" }
    ] as any)

    await act(async () => {
      mockActivatedListener()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isTargetSite).toBe(false)
  })

  it("should update isTargetSite when tab URL updates", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: "https://google.com" }
    ] as any)

    const { result } = renderHook(() => useActiveTabUrl())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isTargetSite).toBe(false)

    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: "https://discord.com/channels/123" }
    ] as any)

    await act(async () => {
      mockUpdatedListener(1, { url: "https://discord.com/channels/123" }, {})
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isTargetSite).toBe(true)
  })

  it("should update isTargetSite when window focus changes", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: "https://google.com" }
    ] as any)

    const { result } = renderHook(() => useActiveTabUrl())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isTargetSite).toBe(false)

    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: "https://discord.com/channels/123" }
    ] as any)

    await act(async () => {
      mockFocusListener()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isTargetSite).toBe(true)
  })

  it("should clean up listeners on unmount", () => {
    const { unmount } = renderHook(() => useActiveTabUrl())

    unmount()

    expect(chrome.tabs.onActivated.removeListener).toHaveBeenCalled()
    expect(chrome.tabs.onUpdated.removeListener).toHaveBeenCalled()
    expect(chrome.windows.onFocusChanged.removeListener).toHaveBeenCalled()
  })
})
