import { chromeAsyncStorage } from "@/lib/react-query-persist"
import { beforeEach, describe, expect, it, vi } from "vitest"

describe("chromeAsyncStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("should use chrome.storage.local.get when chrome API is available", async () => {
    const mockData = { testKey: "testValue" }
    vi.mocked(chrome.storage.local.get).mockResolvedValue(mockData as any)

    const result = await chromeAsyncStorage.getItem("testKey")

    expect(chrome.storage.local.get).toHaveBeenCalledWith("testKey")
    expect(result).toBe("testValue")
  })

  it("should return null if chrome.storage.local.get returns empty", async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({} as any)

    const result = await chromeAsyncStorage.getItem("testKey")

    expect(result).toBeNull()
  })

  it("should use chrome.storage.local.set when chrome API is available", async () => {
    await chromeAsyncStorage.setItem("testKey", "testValue")

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      testKey: "testValue"
    })
  })

  it("should use chrome.storage.local.remove when chrome API is available", async () => {
    await chromeAsyncStorage.removeItem("testKey")

    expect(chrome.storage.local.remove).toHaveBeenCalledWith("testKey")
  })

  it("should fallback to window.localStorage when chrome API is not available", async () => {
    // Save original chrome mock
    const originalChrome = global.chrome
    // Temporarily delete chrome from global
    delete global.chrome

    localStorage.setItem("fallbackKey", "fallbackValue")

    const getResult = await chromeAsyncStorage.getItem("fallbackKey")
    expect(getResult).toBe("fallbackValue")

    await chromeAsyncStorage.setItem("fallbackKey2", "fallbackValue2")
    expect(localStorage.getItem("fallbackKey2")).toBe("fallbackValue2")

    await chromeAsyncStorage.removeItem("fallbackKey")
    expect(localStorage.getItem("fallbackKey")).toBeNull()

    // Restore original chrome mock
    global.chrome = originalChrome
  })
})
