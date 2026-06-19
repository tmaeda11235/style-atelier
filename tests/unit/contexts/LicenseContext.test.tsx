import {
  LicenseProvider,
  useLicense,
  verifyLicenseKey
} from "@/contexts/LicenseContext"
import { act, renderHook, waitFor } from "@testing-library/react"
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

    it("should fallback to invalid and throw error on API error status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(verifyLicenseKey("ONLINE-ERROR-KEY")).rejects.toThrow(
        "Lemon Squeezy API request failed with status 500"
      )
    })

    it("should fallback to invalid and throw error on network throw", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failed"))

      await expect(verifyLicenseKey("ONLINE-THROW-KEY")).rejects.toThrow(
        "Network failed"
      )
    })
  })

  describe("LicenseProvider hook consumption", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LicenseProvider>{children}</LicenseProvider>
    )

    // Obfuscation helper helper for assertion
    const obscure = (text: string) => {
      const key = 42
      const xor = text
        .split("")
        .map((c) => String.fromCharCode(c.charCodeAt(0) ^ key))
        .join("")
      return btoa(unescape(encodeURIComponent(xor)))
    }

    it("should provide default unlicensed values", () => {
      const { result } = renderHook(() => useLicense(), { wrapper })

      expect(result.current.licenseKey).toBe("")
      expect(result.current.licenseStatus).toBe("unlicensed")
      expect(result.current.isPremium).toBe(false)
      expect(result.current.upgradeModalOpen).toBe(false)
      expect(result.current.upgradeModalReason).toBe("")
      expect(result.current.isLoading).toBe(false)
    })

    it("should load from localStorage on init and unobscure key", () => {
      localStorage.setItem(
        "style-atelier-license-key",
        obscure("PRO-MEMBER-TEST-KEY")
      )
      localStorage.setItem("style-atelier-license-status", "valid")
      localStorage.setItem(
        "style-atelier-license-last-verified",
        Date.now().toString()
      )

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
        obscure("PRO-MEMBER-TEST-KEY")
      )
      expect(localStorage.getItem("style-atelier-license-status")).toBe("valid")
      expect(
        localStorage.getItem("style-atelier-license-last-verified")
      ).not.toBeNull()
    })

    it("should handle license activation API error / throw flow", async () => {
      mockFetch.mockRejectedValueOnce(new Error("API offline"))
      const { result } = renderHook(() => useLicense(), { wrapper })

      let success: boolean = true
      await act(async () => {
        success = await result.current.activateLicense("ONLINE-THROW-KEY")
      })

      expect(success).toBe(false)
      expect(result.current.licenseStatus).toBe("invalid")
      expect(result.current.isPremium).toBe(false)
      expect(localStorage.getItem("style-atelier-license-key")).toBe(
        obscure("ONLINE-THROW-KEY")
      )
      expect(localStorage.getItem("style-atelier-license-status")).toBe(
        "invalid"
      )
      expect(
        localStorage.getItem("style-atelier-license-last-verified")
      ).toBeNull()
    })

    it("should handle license deactivation flow", async () => {
      localStorage.setItem(
        "style-atelier-license-key",
        obscure("PRO-MEMBER-TEST-KEY")
      )
      localStorage.setItem("style-atelier-license-status", "valid")
      localStorage.setItem(
        "style-atelier-license-last-verified",
        Date.now().toString()
      )

      const { result } = renderHook(() => useLicense(), { wrapper })

      await act(async () => {
        await result.current.deactivateLicense()
      })

      expect(result.current.licenseKey).toBe("")
      expect(result.current.licenseStatus).toBe("unlicensed")
      expect(result.current.isPremium).toBe(false)
      expect(localStorage.getItem("style-atelier-license-key")).toBeNull()
      expect(localStorage.getItem("style-atelier-license-status")).toBeNull()
      expect(
        localStorage.getItem("style-atelier-license-last-verified")
      ).toBeNull()
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

    it("should use local cache and skip API call if verified within 24 hours", () => {
      localStorage.setItem(
        "style-atelier-license-key",
        obscure("PRO-MEMBER-TEST-KEY")
      )
      localStorage.setItem("style-atelier-license-status", "valid")
      const verifiedRecent = Date.now() - 1000 * 60 * 60 // 1 hour ago
      localStorage.setItem(
        "style-atelier-license-last-verified",
        verifiedRecent.toString()
      )

      // verifyLicenseKey would not be called since it is cached
      const spy = vi.spyOn(global, "fetch")
      renderHook(() => useLicense(), { wrapper })
      expect(spy).not.toHaveBeenCalled()
    })

    it("should revalidate in background if verified > 24 hours ago, updating last-verified on success", async () => {
      localStorage.setItem(
        "style-atelier-license-key",
        obscure("ONLINE-VALID-KEY")
      )
      localStorage.setItem("style-atelier-license-status", "valid")
      const verifiedOld = Date.now() - 1000 * 60 * 60 * 25 // 25 hours ago
      localStorage.setItem(
        "style-atelier-license-last-verified",
        verifiedOld.toString()
      )

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activated: true })
      })

      const { result } = renderHook(() => useLicense(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(localStorage.getItem("style-atelier-license-status")).toBe("valid")
      const newVerified = parseInt(
        localStorage.getItem("style-atelier-license-last-verified") || "0",
        10
      )
      expect(newVerified).toBeGreaterThan(verifiedOld)
    })

    it("should invalidate in background if verified > 24 hours ago, and API returns invalid", async () => {
      localStorage.setItem(
        "style-atelier-license-key",
        obscure("ONLINE-INVALID-KEY")
      )
      localStorage.setItem("style-atelier-license-status", "valid")
      const verifiedOld = Date.now() - 1000 * 60 * 60 * 25 // 25 hours ago
      localStorage.setItem(
        "style-atelier-license-last-verified",
        verifiedOld.toString()
      )

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activated: false, error: "expired" })
      })

      const { result } = renderHook(() => useLicense(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.licenseStatus).toBe("expired")
      expect(result.current.isPremium).toBe(false)
      expect(localStorage.getItem("style-atelier-license-status")).toBe(
        "expired"
      )
    })

    it("should keep premium within 7-day offline grace period if verification fails due to connection error", async () => {
      localStorage.setItem(
        "style-atelier-license-key",
        obscure("ONLINE-THROW-KEY")
      )
      localStorage.setItem("style-atelier-license-status", "valid")
      const verifiedOld = Date.now() - 1000 * 60 * 60 * 25 // 25 hours ago
      localStorage.setItem(
        "style-atelier-license-last-verified",
        verifiedOld.toString()
      )

      mockFetch.mockRejectedValueOnce(new Error("Network offline"))

      const { result } = renderHook(() => useLicense(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.licenseStatus).toBe("valid")
      expect(result.current.isPremium).toBe(true)
      expect(localStorage.getItem("style-atelier-license-status")).toBe("valid")
    })

    it("should invalidate after 7-day offline grace period if verification fails due to connection error", async () => {
      localStorage.setItem(
        "style-atelier-license-key",
        obscure("ONLINE-THROW-KEY")
      )
      localStorage.setItem("style-atelier-license-status", "valid")
      const verifiedAncient = Date.now() - 1000 * 60 * 60 * 24 * 8 // 8 days ago
      localStorage.setItem(
        "style-atelier-license-last-verified",
        verifiedAncient.toString()
      )

      mockFetch.mockRejectedValueOnce(new Error("Network offline"))

      const { result } = renderHook(() => useLicense(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.licenseStatus).toBe("invalid")
      expect(result.current.isPremium).toBe(false)
      expect(localStorage.getItem("style-atelier-license-status")).toBe(
        "invalid"
      )
    })
  })
})
