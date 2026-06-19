import {
  LicenseProvider,
  useLicense,
  verifyLicenseKey
} from "@/contexts/LicenseContext"
import { act, renderHook } from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock fetch for online license key activation tests
const mockFetch = vi.fn()
global.fetch = mockFetch as any

describe("LicenseContext & verifyLicenseKey", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (typeof window !== "undefined") {
      delete (window as any).openUpgradeModalForTest
    }
  })

  describe("verifyLicenseKey logic", () => {
    it("should resolve valid for PRO-MEMBER-TEST-KEY offline", async () => {
      const status = await verifyLicenseKey("PRO-MEMBER-TEST-KEY")
      expect(status).toBe("valid")
    })

    it("should resolve expired for EXPIRED-MEMBER-TEST-KEY offline", async () => {
      const status = await verifyLicenseKey("EXPIRED-MEMBER-TEST-KEY")
      expect(status).toBe("expired")
    })

    it("should resolve invalid for INVALID-MEMBER-TEST-KEY offline", async () => {
      const status = await verifyLicenseKey("INVALID-MEMBER-TEST-KEY")
      expect(status).toBe("invalid")
    })

    it("should activate online key successfully when API returns activated true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activated: true })
      })

      const status = await verifyLicenseKey("ONLINE-VALID-KEY")
      expect(status).toBe("valid")
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.lemonsqueezy.com/v1/licenses/activate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            license_key: "ONLINE-VALID-KEY",
            instance_name: "Style Atelier Extension"
          })
        })
      )
    })

    it("should treat as expired when API response has expired error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          activated: false,
          error: "This license has expired."
        })
      })

      const status = await verifyLicenseKey("ONLINE-EXPIRED-KEY")
      expect(status).toBe("expired")
    })

    it("should treat as invalid when API response has other error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activated: false, error: "Some other error" })
      })

      const status = await verifyLicenseKey("ONLINE-INVALID-KEY")
      expect(status).toBe("invalid")
    })

    it("should fallback to invalid on API error status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      })

      const status = await verifyLicenseKey("ONLINE-ERROR-KEY")
      expect(status).toBe("invalid")
    })

    it("should fallback to invalid on network throw", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failed"))

      const status = await verifyLicenseKey("ONLINE-THROW-KEY")
      expect(status).toBe("invalid")
    })
  })

  describe("LicenseProvider hook consumption", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LicenseProvider>{children}</LicenseProvider>
    )

    it("should provide default unlicensed values", () => {
      const { result } = renderHook(() => useLicense(), { wrapper })

      expect(result.current.licenseKey).toBe("")
      expect(result.current.licenseStatus).toBe("unlicensed")
      expect(result.current.isPremium).toBe(false)
      expect(result.current.upgradeModalOpen).toBe(false)
      expect(result.current.upgradeModalReason).toBe("")
      expect(result.current.isLoading).toBe(false)
    })

    it("should load from localStorage on init", () => {
      localStorage.setItem("style-atelier-license-key", "PRO-MEMBER-TEST-KEY")
      localStorage.setItem("style-atelier-license-status", "valid")

      const { result } = renderHook(() => useLicense(), { wrapper })

      expect(result.current.licenseKey).toBe("PRO-MEMBER-TEST-KEY")
      expect(result.current.licenseStatus).toBe("valid")
      expect(result.current.isPremium).toBe(true)
    })

    it("should handle license activation flow", async () => {
      const { result } = renderHook(() => useLicense(), { wrapper })

      let success: boolean = false
      await act(async () => {
        success = await result.current.activateLicense("PRO-MEMBER-TEST-KEY")
      })

      expect(success).toBe(true)
      expect(result.current.licenseKey).toBe("PRO-MEMBER-TEST-KEY")
      expect(result.current.licenseStatus).toBe("valid")
      expect(result.current.isPremium).toBe(true)
      expect(localStorage.getItem("style-atelier-license-key")).toBe(
        "PRO-MEMBER-TEST-KEY"
      )
      expect(localStorage.getItem("style-atelier-license-status")).toBe("valid")
    })

    it("should handle license deactivation flow", async () => {
      localStorage.setItem("style-atelier-license-key", "PRO-MEMBER-TEST-KEY")
      localStorage.setItem("style-atelier-license-status", "valid")

      const { result } = renderHook(() => useLicense(), { wrapper })

      await act(async () => {
        await result.current.deactivateLicense()
      })

      expect(result.current.licenseKey).toBe("")
      expect(result.current.licenseStatus).toBe("unlicensed")
      expect(result.current.isPremium).toBe(false)
      expect(localStorage.getItem("style-atelier-license-key")).toBeNull()
      expect(localStorage.getItem("style-atelier-license-status")).toBeNull()
    })

    it("should control upgrade modal open/close states", () => {
      const { result } = renderHook(() => useLicense(), { wrapper })

      act(() => {
        result.current.openUpgradeModal("premium-style")
      })
      expect(result.current.upgradeModalOpen).toBe(true)
      expect(result.current.upgradeModalReason).toBe("premium-style")

      act(() => {
        result.current.closeUpgradeModal()
      })
      expect(result.current.upgradeModalOpen).toBe(false)
      expect(result.current.upgradeModalReason).toBe("")
    })

    it("should expose openUpgradeModalForTest on window on mount", () => {
      renderHook(() => useLicense(), { wrapper })

      expect((window as any).openUpgradeModalForTest).toBeTypeOf("function")

      const { result } = renderHook(() => useLicense(), { wrapper })
      act(() => {
        ;(window as any).openUpgradeModalForTest("test-reason")
      })

      expect(result.current.upgradeModalOpen).toBe(true)
      expect(result.current.upgradeModalReason).toBe("test-reason")
    })
  })
})
