import { useAiPromptDeclutter } from "@/hooks/useAiPromptDeclutter"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

describe("useAiPromptDeclutter", () => {
  const mockDisconnect = vi.fn()
  const mockPort = { disconnect: mockDisconnect }

  beforeEach(() => {
    vi.clearAllMocks()
    if (typeof chrome === "undefined") {
      global.chrome = {
        runtime: {
          connect: vi.fn().mockReturnValue(mockPort),
          sendMessage: vi.fn(),
          onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn()
          }
        }
      } as any
    } else {
      chrome.runtime.connect = vi.fn().mockReturnValue(mockPort)
      chrome.runtime.sendMessage = vi.fn()
    }
  })

  it("should de-clutter a messy prompt and return parsed segments", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "verify-integrity") {
          if (callback) callback({ status: "success", integrityPassed: true })
        } else if (message && message.action === "run-inference") {
          if (callback) {
            callback({
              status: "success",
              result: JSON.stringify({
                segments: [
                  "a beautiful cyberpunk girl",
                  "in a neon alley",
                  "glowing lights"
                ]
              })
            })
          }
        }
      }
    )

    const { result } = renderHook(() => useAiPromptDeclutter())

    // Wait for verify-integrity to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(result.current.isModelReady).toBe(true)

    let segments: any
    await act(async () => {
      segments = await result.current.declutterPrompt(
        "a beautiful cyberpunk girl in a neon alley glowing lights"
      )
    })

    expect(segments).toEqual([
      { type: "text", value: "a beautiful cyberpunk girl" },
      { type: "text", value: "in a neon alley" },
      { type: "text", value: "glowing lights" }
    ])
    expect(result.current.error).toBeNull()
  })

  it("should handle error gracefully when inference fails and return fallback", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "verify-integrity") {
          if (callback) callback({ status: "success", integrityPassed: true })
        } else if (message && message.action === "run-inference") {
          if (callback) {
            callback({
              status: "error",
              error: "Failed to allocate memory"
            })
          }
        }
      }
    )

    const { result } = renderHook(() => useAiPromptDeclutter())

    // Wait for verify-integrity to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    let segments: any
    await act(async () => {
      segments = await result.current.declutterPrompt("test prompt")
    })

    expect(segments).toEqual([{ type: "text", value: "test prompt" }])
    expect(result.current.isFallbackMode).toBe(true)
    expect(result.current.error).toBe("Failed to allocate memory")
  })

  it("should run fallback directly when status is not ready", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "verify-integrity") {
          if (callback) callback({ status: "success", integrityPassed: false })
        }
      }
    )

    const { result } = renderHook(() => useAiPromptDeclutter())

    // Wait for verify-integrity to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(result.current.isModelReady).toBe(false)

    let segments: any
    await act(async () => {
      segments = await result.current.declutterPrompt(
        "another test prompt --ar 4:3"
      )
    })

    expect(segments).toEqual([{ type: "text", value: "another test prompt" }])
    expect(result.current.error).toBeNull()
  })
})
