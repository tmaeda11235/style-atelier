import { useWebLlm } from "@/hooks/useWebLlm"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Helper to trigger runtime.onMessage event
declare global {
  var triggerChromeEvent: (event: string, ...args: any[]) => void
}

describe("useWebLlm", () => {
  const mockDisconnect = vi.fn()
  const mockPort = {
    disconnect: mockDisconnect
  }

  beforeEach(() => {
    vi.clearAllMocks()
    chrome.runtime.connect = vi.fn().mockReturnValue(mockPort)
    chrome.runtime.sendMessage = vi.fn()
  })

  it("should initialize with checking status and call verify-integrity", async () => {
    let resolveMessage: any
    const sendMessagePromise = new Promise((resolve) => {
      resolveMessage = resolve
    })

    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "verify-integrity") {
          setTimeout(() => {
            if (callback)
              callback({ status: "success", integrityPassed: false })
            resolveMessage()
          }, 10)
        }
      }
    )

    const { result } = renderHook(() => useWebLlm())

    expect(result.current.status).toBe("checking")

    await act(async () => {
      await sendMessagePromise
    })

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { target: "offscreen", action: "verify-integrity" },
      expect.any(Function)
    )
    await waitFor(() => {
      expect(result.current.status).toBe("idle")
    })
  })

  it("should set status to ready if integrity verification passes", async () => {
    let resolveMessage: any
    const sendMessagePromise = new Promise((resolve) => {
      resolveMessage = resolve
    })

    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "verify-integrity") {
          setTimeout(() => {
            if (callback) callback({ status: "success", integrityPassed: true })
            resolveMessage()
          }, 10)
        }
      }
    )

    const { result } = renderHook(() => useWebLlm())

    await act(async () => {
      await sendMessagePromise
    })

    await waitFor(() => {
      expect(result.current.status).toBe("ready")
    })
    expect(result.current.progress).toBe(100)
  })

  it("should handle startDownload success workflow", async () => {
    // 1. mock verify-integrity to return false (idle)
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "verify-integrity") {
          if (callback) callback({ status: "success", integrityPassed: false })
        }
      }
    )

    const { result } = renderHook(() => useWebLlm())

    // Reset call counts for clean assert
    vi.mocked(chrome.runtime.sendMessage).mockClear()

    // 2. Setup mock responses for startDownload sequence
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message) {
          if (message.action === "check-quota") {
            if (callback) callback({ status: "success", isSufficient: true })
          } else if (message.action === "init-worker") {
            if (callback) callback({ status: "success" })
          } else if (message.action === "start-download") {
            if (callback) callback({ status: "success" })
          } else if (message.action === "set-downloading") {
            if (callback) callback({ status: "success" })
          }
        }
      }
    )

    await act(async () => {
      await result.current.startDownload()
    })

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        target: "offscreen",
        action: "check-quota",
        requiredBytes: 2.5 * 1024 * 1024 * 1024
      },
      expect.any(Function)
    )
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { target: "offscreen", action: "init-worker" },
      expect.any(Function)
    )
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { target: "offscreen", action: "start-download" },
      expect.any(Function)
    )
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      target: "background",
      action: "set-downloading",
      value: true
    })

    expect(result.current.status).toBe("downloading")
    expect(result.current.progress).toBe(0)

    // Simulate progress updates from worker
    act(() => {
      globalThis.triggerChromeEvent("runtime.onMessage", {
        source: "offscreen-worker",
        payload: { status: "downloading", progress: 50 }
      })
    })

    expect(result.current.status).toBe("downloading")
    expect(result.current.progress).toBe(50)

    // Simulate download complete
    act(() => {
      globalThis.triggerChromeEvent("runtime.onMessage", {
        source: "offscreen-worker",
        payload: { status: "ready" }
      })
    })

    expect(result.current.status).toBe("ready")
    expect(result.current.progress).toBe(100)
  })

  it("should handle startDownload quota insufficiency warning", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "verify-integrity") {
          if (callback) callback({ status: "success", integrityPassed: false })
        }
      }
    )

    const { result } = renderHook(() => useWebLlm())
    vi.mocked(chrome.runtime.sendMessage).mockClear()

    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "check-quota") {
          if (callback) callback({ status: "success", isSufficient: false })
        }
      }
    )

    await act(async () => {
      await result.current.startDownload()
    })

    expect(result.current.status).toBe("insufficient-quota")
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
      { target: "offscreen", action: "init-worker" },
      expect.any(Function)
    )
  })

  it("should purge cache correctly", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "verify-integrity") {
          if (callback) callback({ status: "success", integrityPassed: true })
        }
      }
    )

    const { result } = renderHook(() => useWebLlm())

    // Wait for the async initialization check to settle
    await waitFor(() => {
      expect(result.current.status).toBe("ready")
    })

    vi.mocked(chrome.runtime.sendMessage).mockClear()

    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "purge-cache") {
          if (callback) callback({ status: "success" })
        }
      }
    )

    await act(async () => {
      await result.current.purgeCache()
    })

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { target: "offscreen", action: "purge-cache" },
      expect.any(Function)
    )
    expect(result.current.status).toBe("idle")
    expect(result.current.progress).toBe(0)
  })

  it("should execute runInference and resolve on success", async () => {
    const { result } = renderHook(() => useWebLlm())

    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "run-inference") {
          setTimeout(() => {
            if (callback) {
              callback({ status: "success", result: "Inferred text content" })
            }
          }, 10)
        }
      }
    )

    const inferenceResult = await result.current.runInference(
      "Generate a style",
      "You are an artist",
      0.5
    )

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        target: "offscreen",
        action: "run-inference",
        requestId: expect.any(String),
        prompt: "Generate a style",
        systemPrompt: "You are an artist",
        temperature: 0.5
      },
      expect.any(Function)
    )
    expect(inferenceResult).toBe("Inferred text content")
  })

  it("should reject runInference on failure response", async () => {
    const { result } = renderHook(() => useWebLlm())

    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "run-inference") {
          setTimeout(() => {
            if (callback) {
              callback({ status: "error", error: "Inference failed error" })
            }
          }, 10)
        }
      }
    )

    await expect(
      result.current.runInference("Generate a style")
    ).rejects.toThrow("Inference failed error")
  })

  it("should set status to unsupported on initialization if WebGPU is not supported", async () => {
    vi.stubGlobal("navigator", {
      ...window.navigator,
      gpu: undefined
    })

    const { result } = renderHook(() => useWebLlm())

    // Wait for async checks to complete
    await waitFor(() => {
      expect(result.current.status).toBe("unsupported")
    })
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
      { target: "offscreen", action: "verify-integrity" },
      expect.any(Function)
    )
    vi.unstubAllGlobals()
  })

  it("should set status to unsupported when startDownload is called if WebGPU is not supported", async () => {
    vi.stubGlobal("navigator", {
      ...window.navigator,
      gpu: undefined
    })

    const { result } = renderHook(() => useWebLlm())

    await waitFor(() => {
      expect(result.current.status).toBe("unsupported")
    })

    // Try to trigger startDownload
    await act(async () => {
      await result.current.startDownload()
    })

    expect(result.current.status).toBe("unsupported")
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
      {
        target: "offscreen",
        action: "check-quota",
        requiredBytes: expect.any(Number)
      },
      expect.any(Function)
    )
    vi.unstubAllGlobals()
  })
})
