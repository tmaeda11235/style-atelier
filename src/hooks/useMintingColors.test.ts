import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { analyzeImageColors } from "../lib/color-utils"
import { getFallbackColors, useMintingColors } from "./useMintingColors"

vi.mock("../lib/color-utils", () => ({
  analyzeImageColors: vi.fn()
}))

describe("useMintingColors hook and utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getFallbackColors", () => {
    it("should return correct fallback colors for Legendary", () => {
      const colors = getFallbackColors("Legendary")
      expect(colors.dominantHex).toBeDefined()
      expect(colors.accentHex).toBeDefined()
      expect(colors.colorTags.length).toBeGreaterThan(0)
    })
  })

  describe("useMintingColors hook", () => {
    it("should apply fallback colors when mintingItem is null", () => {
      const { result } = renderHook(() => useMintingColors(null, null, "Rare"))

      expect(result.current.isColorFallback).toBe(true)
      expect(result.current.detectedDominantColor).toBeDefined()
    })

    it("should analyze image colors when mintingItem has imageUrl", async () => {
      const mockColors = {
        dominantHex: "#ff0000",
        accentHex: "#00ff00",
        dominantName: "Red",
        accentName: "Green",
        isFallback: false
      }
      vi.mocked(analyzeImageColors).mockResolvedValue(mockColors as any)

      const mintingItem = { imageUrl: "https://example.com/image.png" } as any

      const { result } = renderHook(() =>
        useMintingColors(mintingItem, null, "Rare")
      )

      // Wait for async analysis
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(analyzeImageColors).toHaveBeenCalledWith(
        "https://example.com/image.png",
        "Rare"
      )
      expect(result.current.detectedDominantColor).toBe("#ff0000")
      expect(result.current.detectedAccentColor).toBe("#00ff00")
      expect(result.current.detectedColorTags).toContain("Red")
      expect(result.current.detectedColorTags).toContain("Green")
      expect(result.current.isColorFallback).toBe(false)
    })

    it("should fall back if analyzeImageColors throws error", async () => {
      vi.mocked(analyzeImageColors).mockRejectedValue(new Error("failed"))

      const mintingItem = { imageUrl: "https://example.com/image.png" } as any

      const { result } = renderHook(() =>
        useMintingColors(mintingItem, null, "Rare")
      )

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(analyzeImageColors).toHaveBeenCalled()
      expect(result.current.isColorFallback).toBe(true)
    })

    it("should update colors when selectedRarity changes and using fallback", async () => {
      const { result, rerender } = renderHook(
        ({ rarity }) => useMintingColors(null, null, rarity),
        { initialProps: { rarity: "Common" as any } }
      )

      expect(result.current.isColorFallback).toBe(true)
      const commonDominant = result.current.detectedDominantColor

      rerender({ rarity: "Legendary" })

      expect(result.current.detectedDominantColor).not.toBe(commonDominant)
    })
  })
})
