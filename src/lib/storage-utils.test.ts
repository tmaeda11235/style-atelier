import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { formatBytes, getStorageEstimate } from "./storage-utils"

describe("storage-utils", () => {
  describe("formatBytes", () => {
    it("should format 0 bytes", () => {
      expect(formatBytes(0)).toBe("0 Bytes")
    })

    it("should format bytes with custom decimals", () => {
      expect(formatBytes(1024)).toBe("1.0 KB")
      expect(formatBytes(1500, 2)).toBe("1.46 KB")
      expect(formatBytes(1500, -1)).toBe("1 KB") // test negative decimals fallback to 0
    })

    it("should handle larger units", () => {
      expect(formatBytes(1024 * 1024)).toBe("1.0 MB")
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB")
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1.0 TB")
    })
  })

  describe("getStorageEstimate", () => {
    const originalNavigator = global.navigator

    beforeEach(() => {
      vi.stubGlobal("window", {})
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
        configurable: true
      })
    })

    it("should return null if navigator is not defined", async () => {
      Object.defineProperty(global, "navigator", {
        value: undefined,
        writable: true,
        configurable: true
      })
      const res = await getStorageEstimate()
      expect(res).toBeNull()
    })

    it("should return null if navigator.storage is not defined", async () => {
      Object.defineProperty(global, "navigator", {
        value: {},
        writable: true,
        configurable: true
      })
      const res = await getStorageEstimate()
      expect(res).toBeNull()
    })

    it("should return null if navigator.storage.estimate is not defined", async () => {
      Object.defineProperty(global, "navigator", {
        value: { storage: {} },
        writable: true,
        configurable: true
      })
      const res = await getStorageEstimate()
      expect(res).toBeNull()
    })

    it("should estimate successfully with default values", async () => {
      const mockEstimate = vi
        .fn()
        .mockResolvedValue({ usage: 1024, quota: 4096 })
      Object.defineProperty(global, "navigator", {
        value: { storage: { estimate: mockEstimate } },
        writable: true,
        configurable: true
      })

      const res = await getStorageEstimate()
      expect(res).toEqual({
        usage: 1024,
        quota: 4096,
        percentage: 25,
        usageFormatted: "1.0 KB",
        quotaFormatted: "4.0 KB"
      })
    })

    it("should handle zero or undefined values gracefully", async () => {
      const mockEstimate = vi
        .fn()
        .mockResolvedValue({ usage: undefined, quota: undefined })
      Object.defineProperty(global, "navigator", {
        value: { storage: { estimate: mockEstimate } },
        writable: true,
        configurable: true
      })

      const res = await getStorageEstimate()
      expect(res).toEqual({
        usage: 0,
        quota: 1, // fallback to 1 to avoid division by zero
        percentage: 0,
        usageFormatted: "0 Bytes",
        quotaFormatted: "1.0 Bytes"
      })
    })

    it("should return null and log error if estimate rejects", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      const mockEstimate = vi
        .fn()
        .mockRejectedValue(new Error("Estimate failed"))
      Object.defineProperty(global, "navigator", {
        value: { storage: { estimate: mockEstimate } },
        writable: true,
        configurable: true
      })

      const res = await getStorageEstimate()
      expect(res).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to estimate storage usage:",
        expect.any(Error)
      )
      consoleErrorSpy.mockRestore()
    })
  })
})
