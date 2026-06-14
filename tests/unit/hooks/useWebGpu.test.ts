import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useWebGpu } from "../../../src/hooks/useWebGpu"

describe("useWebGpu", () => {
  beforeEach(() => {
    vi.stubGlobal("chrome", {
      tabs: {
        create: vi.fn()
      }
    })
    vi.stubGlobal("navigator", {
      gpu: undefined,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("should return false if navigator.gpu is undefined", async () => {
    const { result } = renderHook(() => useWebGpu())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isSupported).toBe(false)
  })

  it("should return true if navigator.gpu.requestAdapter returns an adapter", async () => {
    const requestAdapterMock = vi.fn().mockResolvedValue({ name: "MockGPU" })
    vi.stubGlobal("navigator", {
      gpu: {
        requestAdapter: requestAdapterMock
      }
    })

    const { result } = renderHook(() => useWebGpu())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(requestAdapterMock).toHaveBeenCalled()
    expect(result.current.isSupported).toBe(true)
  })

  it("should return false if requestAdapter returns null", async () => {
    const requestAdapterMock = vi.fn().mockResolvedValue(null)
    vi.stubGlobal("navigator", {
      gpu: {
        requestAdapter: requestAdapterMock
      }
    })

    const { result } = renderHook(() => useWebGpu())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isSupported).toBe(false)
  })

  it("should open chrome settings when openChromeSettings is called", () => {
    const { result } = renderHook(() => useWebGpu())
    act(() => {
      result.current.openChromeSettings()
    })
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: "chrome://settings/system"
    })
  })
})
