import { WebLlmProvider } from "@/contexts/WebLlmContext"
import { useWebLlm } from "@/hooks/useWebLlm"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Helper to trigger runtime.onMessage event
declare global {
  var triggerChromeEvent: (event: string, ...args: any[]) => void
}

let mockSendMessage: any

describe("useWebLlm", () => {
  const mockDisconnect = vi.fn()
  const mockPort = {
    disconnect: mockDisconnect
  }

  beforeEach(() => {
    vi.clearAllMocks()
    chrome.runtime.connect = vi.fn().mockReturnValue(mockPort)
    chrome.runtime.sendMessage = vi.fn()
    mockSendMessage = chrome.runtime.sendMessage
  })

  it("should initialize with checking status and call verify-integrity", async () => {
    let resolveMessage: any
    const sendMessagePromise = new Promise((resolve) => {
      resolveMessage = resolve
    })

    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "verify-integrity") {
        setTimeout(() => {
          if (callback) callback({ status: "success", integrityPassed: false })
          resolveMessage()
        }, 10)
      }
    })

    const { result } = renderHook(() => useWebLlm(), {
      wrapper: WebLlmProvider
    })

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

    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "verify-integrity") {
        setTimeout(() => {
          if (callback) callback({ status: "success", integrityPassed: true })
          resolveMessage()
        }, 10)
      }
    })

    const { result } = renderHook(() => useWebLlm(), {
      wrapper: WebLlmProvider
    })

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
    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "verify-integrity") {
        if (callback) callback({ status: "success", integrityPassed: false })
      }
    })

    const { result } = renderHook(() => useWebLlm(), {
      wrapper: WebLlmProvider
    })

    // Reset call counts for clean assert
    mockSendMessage.mockClear()

    // 2. Setup mock responses for startDownload sequence
    mockSendMessage.mockImplementation((message, callback) => {
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
    })

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
    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "verify-integrity") {
        if (callback) callback({ status: "success", integrityPassed: false })
      }
    })

    const { result } = renderHook(() => useWebLlm(), {
      wrapper: WebLlmProvider
    })
    mockSendMessage.mockClear()

    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "check-quota") {
        if (callback) callback({ status: "success", isSufficient: false })
      }
    })

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
    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "verify-integrity") {
        if (callback) callback({ status: "success", integrityPassed: true })
      }
    })

    const { result } = renderHook(() => useWebLlm(), {
      wrapper: WebLlmProvider
    })

    // Wait for the async initialization check to settle
    await waitFor(() => {
      expect(result.current.status).toBe("ready")
    })

    mockSendMessage.mockClear()

    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "purge-cache") {
        if (callback) callback({ status: "success" })
      }
    })

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
    const { result } = renderHook(() => useWebLlm(), {
      wrapper: WebLlmProvider
    })

    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "run-inference") {
        setTimeout(() => {
          if (callback) {
            callback({ status: "success", result: "Inferred text content" })
          }
        }, 10)
      }
    })

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
    const { result } = renderHook(() => useWebLlm(), {
      wrapper: WebLlmProvider
    })

    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "run-inference") {
        setTimeout(() => {
          if (callback) {
            callback({ status: "error", error: "Inference failed error" })
          }
        }, 10)
      }
    })

    await expect(
      result.current.runInference("Generate a style")
    ).rejects.toThrow("Inference failed error")
  })

  it("should set status to unsupported on initialization if both WebGPU and WebAssembly are not supported", async () => {
    vi.stubGlobal("navigator", {
      ...window.navigator,
      gpu: undefined
    })
    vi.stubGlobal("WebAssembly", undefined)

    const { result } = renderHook(() => useWebLlm(), {
      wrapper: WebLlmProvider
    })

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

  it("should set status to unsupported when startDownload is called if both WebGPU and WebAssembly are not supported", async () => {
    vi.stubGlobal("navigator", {
      ...window.navigator,
      gpu: undefined
    })
    vi.stubGlobal("WebAssembly", undefined)

    const { result } = renderHook(() => useWebLlm(), {
      wrapper: WebLlmProvider
    })

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

  it("should enable webGpuFallback when WebGPU is not supported but WebAssembly is supported", async () => {
    vi.stubGlobal("navigator", {
      ...window.navigator,
      gpu: undefined
    })
    // WebAssembly is left as defined (supported)

    let resolveMessage: any
    const sendMessagePromise = new Promise((resolve) => {
      resolveMessage = resolve
    })

    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "verify-integrity") {
        setTimeout(() => {
          if (callback) callback({ status: "success", integrityPassed: true })
          resolveMessage()
        }, 10)
      }
    })

    const { result } = renderHook(() => useWebLlm(), {
      wrapper: WebLlmProvider
    })

    await act(async () => {
      await sendMessagePromise
    })

    expect(result.current.status).toBe("ready")
    expect(result.current.webGpuFallback).toBe(true)
    vi.unstubAllGlobals()
  })

  it("should attempt to reconnect the port when disconnected", async () => {
    let disconnectCallback: any
    const mockAddListener = vi.fn((fn) => {
      disconnectCallback = fn
    })
    const localMockPort = {
      disconnect: vi.fn(),
      onDisconnect: {
        addListener: mockAddListener,
        removeListener: vi.fn()
      }
    }
    chrome.runtime.connect = vi.fn().mockReturnValue(localMockPort)

    vi.useFakeTimers()
    const { unmount } = renderHook(() => useWebLlm(), {
      wrapper: WebLlmProvider
    })

    expect(mockAddListener).toHaveBeenCalled()

    // Trigger disconnect
    act(() => {
      disconnectCallback()
    })

    // Advance timers by 1 second to trigger reconnect
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Should have called connect again (first during initial render, second during reconnect)
    expect(chrome.runtime.connect).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
    unmount()
  })
})
