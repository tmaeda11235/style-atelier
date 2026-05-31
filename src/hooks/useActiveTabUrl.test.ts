import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useActiveTabUrl } from "./useActiveTabUrl"

describe("useActiveTabUrl hook", () => {
  let mockActivatedListener: any = null
  let mockUpdatedListener: any = null
  let mockFocusListener: any = null

  beforeEach(() => {
    vi.stubGlobal("chrome", {
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
})
