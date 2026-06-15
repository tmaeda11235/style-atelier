import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  isExtensionContextValid,
  safeQueryTabs,
  safeReloadTab,
  safeSendMessage,
  safeSendTabMessage,
  safeUpdateTab
} from "../../../src/lib/chrome-utils"

describe("chrome-utils", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("isExtensionContextValid", () => {
    it("should return false if chrome is undefined", () => {
      vi.stubGlobal("chrome", undefined)
      expect(isExtensionContextValid()).toBe(false)
    })

    it("should return false if chrome.runtime is undefined", () => {
      vi.stubGlobal("chrome", {})
      expect(isExtensionContextValid()).toBe(false)
    })

    it("should return false if chrome.runtime.id is undefined", () => {
      vi.stubGlobal("chrome", {
        runtime: {}
      })
      expect(isExtensionContextValid()).toBe(false)
    })

    it("should return true if chrome, runtime, and runtime.id are all defined", () => {
      vi.stubGlobal("chrome", {
        runtime: {
          id: "mock-extension-id"
        }
      })
      expect(isExtensionContextValid()).toBe(true)
    })
  })

  describe("safeSendMessage", () => {
    it("should reject if extension context is invalid (promise path)", async () => {
      vi.stubGlobal("chrome", undefined)
      await expect(safeSendMessage({ action: "test" })).rejects.toThrow(
        "Extension context invalidated"
      )
    })

    it("should warn and not call callback if extension context is invalid (callback path)", () => {
      vi.stubGlobal("chrome", undefined)
      const callback = vi.fn()
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      safeSendMessage({ action: "test" }, callback)
      expect(callback).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalledWith(
        "safeSendMessage: Extension context invalidated"
      )
      warnSpy.mockRestore()
    })

    it("should resolve with response when chrome.runtime.sendMessage succeeds (promise path)", async () => {
      const mockResponse = { status: "ok" }
      const sendMessageSpy = vi.fn().mockResolvedValue(mockResponse)
      vi.stubGlobal("chrome", {
        runtime: {
          id: "mock-id",
          sendMessage: sendMessageSpy
        }
      })

      const result = await safeSendMessage({ action: "test" })
      expect(sendMessageSpy).toHaveBeenCalledWith({ action: "test" })
      expect(result).toEqual(mockResponse)
    })

    it("should trigger callback when chrome.runtime.sendMessage is called with callback (callback path)", () => {
      const mockResponse = { status: "ok" }
      const callback = vi.fn()
      const sendMessageSpy = vi.fn((msg, cb) => cb(mockResponse))
      vi.stubGlobal("chrome", {
        runtime: {
          id: "mock-id",
          sendMessage: sendMessageSpy
        }
      })

      safeSendMessage({ action: "test" }, callback)
      expect(sendMessageSpy).toHaveBeenCalledWith({ action: "test" }, callback)
      expect(callback).toHaveBeenCalledWith(mockResponse)
    })

    it("should reject if chrome.runtime.sendMessage fails (promise path)", async () => {
      const mockErrorMsg = "Some runtime error"
      const sendMessageSpy = vi.fn().mockRejectedValue(new Error(mockErrorMsg))
      vi.stubGlobal("chrome", {
        runtime: {
          id: "mock-id",
          sendMessage: sendMessageSpy
        }
      })

      await expect(safeSendMessage({ action: "test" })).rejects.toThrow(
        mockErrorMsg
      )
    })
  })

  describe("safeSendTabMessage", () => {
    it("should reject if extension context is invalid (promise path)", async () => {
      vi.stubGlobal("chrome", undefined)
      await expect(safeSendTabMessage(1, { action: "test" })).rejects.toThrow(
        "Extension context invalidated"
      )
    })

    it("should warn and not call callback if extension context is invalid (callback path)", () => {
      vi.stubGlobal("chrome", undefined)
      const callback = vi.fn()
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      safeSendTabMessage(1, { action: "test" }, callback)
      expect(callback).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalledWith(
        "safeSendTabMessage: Extension context invalidated"
      )
      warnSpy.mockRestore()
    })

    it("should resolve with response when chrome.tabs.sendMessage succeeds (promise path)", async () => {
      const mockResponse = { status: "ok" }
      const sendMessageSpy = vi.fn().mockResolvedValue(mockResponse)
      vi.stubGlobal("chrome", {
        runtime: {
          id: "mock-id"
        },
        tabs: {
          sendMessage: sendMessageSpy
        }
      })

      const result = await safeSendTabMessage(1, { action: "test" })
      expect(sendMessageSpy).toHaveBeenCalledWith(1, { action: "test" })
      expect(result).toEqual(mockResponse)
    })

    it("should trigger callback when chrome.tabs.sendMessage is called with callback (callback path)", () => {
      const mockResponse = { status: "ok" }
      const callback = vi.fn()
      const sendMessageSpy = vi.fn((tabId, msg, cb) => cb(mockResponse))
      vi.stubGlobal("chrome", {
        runtime: {
          id: "mock-id"
        },
        tabs: {
          sendMessage: sendMessageSpy
        }
      })

      safeSendTabMessage(1, { action: "test" }, callback)
      expect(sendMessageSpy).toHaveBeenCalledWith(
        1,
        { action: "test" },
        callback
      )
      expect(callback).toHaveBeenCalledWith(mockResponse)
    })
  })

  describe("safeQueryTabs", () => {
    it("should reject if extension context is invalid (promise path)", async () => {
      vi.stubGlobal("chrome", undefined)
      await expect(safeQueryTabs({ active: true })).rejects.toThrow(
        "Extension context invalidated"
      )
    })

    it("should resolve with tabs when chrome.tabs.query succeeds (promise path)", async () => {
      const mockTabs = [{ id: 1, url: "http://example.com" }]
      const querySpy = vi.fn().mockResolvedValue(mockTabs)
      vi.stubGlobal("chrome", {
        runtime: {
          id: "mock-id"
        },
        tabs: {
          query: querySpy
        }
      })

      const result = await safeQueryTabs({ active: true })
      expect(querySpy).toHaveBeenCalledWith({ active: true })
      expect(result).toEqual(mockTabs)
    })

    it("should trigger callback when chrome.tabs.query is called with callback (callback path)", () => {
      const mockTabs = [{ id: 1, url: "http://example.com" }]
      const callback = vi.fn()
      const querySpy = vi.fn((info, cb) => cb(mockTabs))
      vi.stubGlobal("chrome", {
        runtime: {
          id: "mock-id"
        },
        tabs: {
          query: querySpy
        }
      })

      safeQueryTabs({ active: true }, callback)
      expect(querySpy).toHaveBeenCalledWith({ active: true }, callback)
      expect(callback).toHaveBeenCalledWith(mockTabs)
    })
  })

  describe("safeReloadTab", () => {
    it("should reload active tab if context is valid", () => {
      const reloadSpy = vi.fn()
      vi.stubGlobal("chrome", {
        runtime: { id: "mock-id" },
        tabs: { reload: reloadSpy }
      })

      safeReloadTab()
      expect(reloadSpy).toHaveBeenCalled()
    })

    it("should reload specific tab if context is valid", () => {
      const reloadSpy = vi.fn()
      vi.stubGlobal("chrome", {
        runtime: { id: "mock-id" },
        tabs: { reload: reloadSpy }
      })

      safeReloadTab(123)
      expect(reloadSpy).toHaveBeenCalledWith(123)
    })

    it("should fallback to window.location.reload if context is invalid", () => {
      vi.stubGlobal("chrome", undefined)
      const locationReloadSpy = vi.fn()
      vi.stubGlobal("window", {
        location: { reload: locationReloadSpy }
      })

      safeReloadTab()
      expect(locationReloadSpy).toHaveBeenCalled()
    })
  })

  describe("safeUpdateTab", () => {
    it("should reject if context is invalid (promise path)", async () => {
      vi.stubGlobal("chrome", undefined)
      await expect(
        safeUpdateTab(123, { url: "http://example.com" })
      ).rejects.toThrow("Extension context invalidated")
    })

    it("should resolve when chrome.tabs.update succeeds (promise path)", async () => {
      const mockTab = { id: 123, url: "http://example.com" }
      const updateSpy = vi.fn((tabId, props, cb) => cb(mockTab))
      vi.stubGlobal("chrome", {
        runtime: { id: "mock-id" },
        tabs: { update: updateSpy }
      })

      const result = await safeUpdateTab(123, { url: "http://example.com" })
      expect(updateSpy).toHaveBeenCalledWith(
        123,
        { url: "http://example.com" },
        expect.any(Function)
      )
      expect(result).toEqual(mockTab)
    })

    it("should trigger callback when context is valid (callback path)", () => {
      const mockTab = { id: 123, url: "http://example.com" }
      const callback = vi.fn()
      const updateSpy = vi.fn((tabId, props, cb) => cb(mockTab))
      vi.stubGlobal("chrome", {
        runtime: { id: "mock-id" },
        tabs: { update: updateSpy }
      })

      safeUpdateTab(123, { url: "http://example.com" }, callback)
      expect(updateSpy).toHaveBeenCalledWith(
        123,
        { url: "http://example.com" },
        callback
      )
      expect(callback).toHaveBeenCalledWith(mockTab)
    })
  })
})
