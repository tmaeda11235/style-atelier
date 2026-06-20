import { useAiRecipeAdvice } from "@/hooks/useAiRecipeAdvice"
import { useWebLlm } from "@/hooks/useWebLlm"
import {
  generateRecipeAdviceHeuristics,
  generateStaticRecipeAdvice
} from "@/lib/ai/recipe-heuristics"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock useWebLlm
vi.mock("@/hooks/useWebLlm", () => {
  return {
    useWebLlm: vi.fn()
  }
})

// Mock useWebGpuCheck
vi.mock("@/hooks/useWebGpuCheck", () => {
  return {
    useWebGpuCheck: () => ({ hasWebGpu: true, isChecking: false })
  }
})

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" }
  })
}))

describe("useAiRecipeAdvice", () => {
  const mockRunInference = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.mocked(useWebLlm).mockReturnValue({
      status: "ready",
      progress: 100,
      error: null,
      startDownload: vi.fn(),
      purgeCache: vi.fn(),
      checkCurrentState: vi.fn(),
      runInference: mockRunInference
    } as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should return null advice and loading=false when card length < 2", () => {
    const { result } = renderHook(() => useAiRecipeAdvice([]))

    expect(result.current.advice).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(mockRunInference).not.toHaveBeenCalled()
  })

  it("should return static fallback advice when WebLLM status is not ready", () => {
    vi.mocked(useWebLlm).mockReturnValue({
      status: "idle",
      progress: 0,
      error: null,
      startDownload: vi.fn(),
      purgeCache: vi.fn(),
      checkCurrentState: vi.fn(),
      runInference: mockRunInference
    } as any)

    const cards = [
      { id: "1", name: "Card 1", prompt: "prompt 1", weight: 1.0 },
      { id: "2", name: "Card 2", prompt: "prompt 2", weight: 1.0 }
    ]
    const { result } = renderHook(() => useAiRecipeAdvice(cards))

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(result.current.advice).not.toBeNull()
    expect(result.current.advice).toContain("Recipe")
    expect(result.current.isFallback).toBe(true)
    expect(result.current.isFallbackMode).toBe(true)
    expect(result.current.loading).toBe(false)
    expect(mockRunInference).not.toHaveBeenCalled()
  })

  it("should trigger inference after debounce duration when status is ready and cards >= 2", async () => {
    mockRunInference.mockResolvedValue("AI recipe advice mock result")
    const cards = [
      { id: "1", name: "Card 1", prompt: "prompt 1", weight: 1.0 },
      { id: "2", name: "Card 2", prompt: "prompt 2", weight: 1.0 }
    ]

    const { result } = renderHook(() => useAiRecipeAdvice(cards))

    // Debounce timer is running, should not call immediately
    expect(result.current.loading).toBe(false)
    expect(mockRunInference).not.toHaveBeenCalled()

    // Advance timer to trigger inference
    await act(async () => {
      vi.advanceTimersByTime(1500)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.advice).toBe("AI recipe advice mock result")
    expect(mockRunInference).toHaveBeenCalledTimes(1)
  })

  it("should use cache and not trigger runInference again for the same card combination", async () => {
    mockRunInference.mockResolvedValue("Cached advice")
    const cards = [
      { id: "1", name: "Card 1", prompt: "prompt 1", weight: 1.0 },
      { id: "2", name: "Card 2", prompt: "prompt 2", weight: 1.0 }
    ]

    const { result, rerender } = renderHook(
      ({ cardsList }) => useAiRecipeAdvice(cardsList),
      {
        initialProps: { cardsList: cards }
      }
    )

    await act(async () => {
      vi.advanceTimersByTime(1500)
    })

    expect(result.current.advice).toBe("Cached advice")
    expect(mockRunInference).toHaveBeenCalledTimes(1)

    // Clear call history of the mock
    mockRunInference.mockClear()

    // Change cards to 1 card (resets advice)
    rerender({ cardsList: [cards[0]] })
    expect(result.current.advice).toBeNull()

    // Change cards back to the same combination
    rerender({ cardsList: cards })

    await act(async () => {
      vi.advanceTimersByTime(1500)
    })

    // Should return cached result immediately and not run inference again
    expect(result.current.advice).toBe("Cached advice")
    expect(mockRunInference).not.toHaveBeenCalled()
  })

  it("should return fallback advice and set isFallback state when runInference fails", async () => {
    mockRunInference.mockRejectedValue(new Error("Inference failed"))
    const cards = [
      { id: "1", name: "Card 1", prompt: "prompt 1", weight: 1.0 },
      { id: "2", name: "Card 2", prompt: "prompt 2", weight: 1.0 }
    ]

    const { result } = renderHook(() => useAiRecipeAdvice(cards))

    await act(async () => {
      vi.advanceTimersByTime(1500)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.advice).not.toBeNull()
    expect(result.current.advice).toContain("Recipe")
    expect(result.current.isFallback).toBe(true)
    expect(result.current.isFallbackMode).toBe(true)
    expect(result.current.error).toBeNull()
  })
})

describe("recipe-heuristics coverage tests", () => {
  it("should test generateRecipeAdviceHeuristics in en and ja", () => {
    const cards = [
      {
        name: "Common Card",
        prompt: "neon style --ar 16:9",
        weight: 1.0,
        rarity: "Common",
        category: "Anime"
      },
      {
        name: "Legendary Card",
        prompt: "cyberpunk warrior --ar 4:3",
        weight: 1.5,
        rarity: "Legendary",
        category: "Cyberpunk"
      }
    ]

    const resEn = generateRecipeAdviceHeuristics(cards, "en")
    expect(resEn).toContain("Recipe Blending Advice")
    expect(resEn).toContain("Common Card")

    const resJa = generateRecipeAdviceHeuristics(cards, "ja")
    expect(resJa).toContain("自動生成された調合アドバイス")
  })

  it("should test generateStaticRecipeAdvice with sref, cref, and parameter conflicts", () => {
    const cards = [
      {
        name: "C1",
        promptSegments: [{ value: "--sref http://sref1 --v 6.0 --ar 16:9" }],
        weight: 1.0,
        category: "Anime"
      },
      {
        name: "C2",
        prompt: "--cref http://cref1 --v 5.2 --ar 4:3",
        weight: 1.2,
        category: "Fantasy"
      }
    ]

    const resEn = generateStaticRecipeAdvice(cards, "en")
    expect(resEn).toContain("Mixed References")
    expect(resEn).toContain("Model Conflict")
    expect(resEn).toContain("Aspect Ratio Conflict")

    const resJa = generateStaticRecipeAdvice(cards, "ja")
    expect(resJa).toContain("スタイルの混在警告")
    expect(resJa).toContain("モデルの競合")

    // Empty or short cards list
    expect(generateStaticRecipeAdvice([], "en")).toBe("")
  })

  it("should test generateStaticRecipeAdvice with same weight and other categories", () => {
    const cards = [
      { name: "C1", prompt: "photo realistic", weight: 1.0, category: "Photo" },
      { name: "C2", prompt: "magic wizard", weight: 1.0, category: "Magic" }
    ]
    const resEn = generateStaticRecipeAdvice(cards, "en")
    expect(resEn).toContain("same weight")

    const cardsEmptyCat = [
      { name: "C1", prompt: "something", weight: 1.0 },
      { name: "C2", prompt: "something else", weight: 1.0 }
    ]
    const resEnEmptyCat = generateStaticRecipeAdvice(cardsEmptyCat, "en")
    expect(resEnEmptyCat).toContain("highly detailed")
  })
})
