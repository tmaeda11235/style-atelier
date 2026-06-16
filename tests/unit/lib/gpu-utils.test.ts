import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { checkWebGpuSupport } from "../../../src/lib/gpu-utils"

describe("gpu-utils - checkWebGpuSupport", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      ...window.navigator,
      gpu: undefined
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("should return false if navigator.gpu is undefined", async () => {
    const supported = await checkWebGpuSupport()
    expect(supported).toBe(false)
  })

  it("should return true if navigator.gpu.requestAdapter returns an adapter", async () => {
    const requestAdapterMock = vi.fn().mockResolvedValue({ name: "MockGPU" })
    vi.stubGlobal("navigator", {
      ...window.navigator,
      gpu: {
        requestAdapter: requestAdapterMock
      }
    })

    const supported = await checkWebGpuSupport()
    expect(requestAdapterMock).toHaveBeenCalled()
    expect(supported).toBe(true)
  })

  it("should return false if requestAdapter returns null", async () => {
    const requestAdapterMock = vi.fn().mockResolvedValue(null)
    vi.stubGlobal("navigator", {
      ...window.navigator,
      gpu: {
        requestAdapter: requestAdapterMock
      }
    })

    const supported = await checkWebGpuSupport()
    expect(requestAdapterMock).toHaveBeenCalled()
    expect(supported).toBe(false)
  })

  it("should return false if requestAdapter throws an error", async () => {
    const requestAdapterMock = vi.fn().mockRejectedValue(new Error("GPU lost"))
    vi.stubGlobal("navigator", {
      ...window.navigator,
      gpu: {
        requestAdapter: requestAdapterMock
      }
    })

    const supported = await checkWebGpuSupport()
    expect(requestAdapterMock).toHaveBeenCalled()
    expect(supported).toBe(false)
  })
})
