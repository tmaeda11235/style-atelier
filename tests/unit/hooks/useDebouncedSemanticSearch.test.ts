import { useDebouncedSemanticSearch } from "@/hooks/useDebouncedSemanticSearch"
import { parseSemanticQuery } from "@/lib/ai-search-utils"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/ai-search-utils", () => ({
  parseSemanticQuery: vi.fn(),
  parseSemanticQueryFallback: vi.fn()
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" }
  })
}))

describe("useDebouncedSemanticSearch", () => {
  const categories = [
    { id: "cat-cyberpunk", name: "Cyberpunk" },
    { id: "cat-anime", name: "Anime" }
  ]
  const mockSetRarityFilter = vi.fn()
  const mockSetCategoryFilter = vi.fn()
  const mockSetColorFilter = vi.fn()
  const mockSetSearchTag = vi.fn()
  const t = { aiSearchError: "Error occurred" }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should map category name to category ID during search", async () => {
    vi.mocked(parseSemanticQuery).mockResolvedValue({
      rarity: "Legendary",
      category: "Cyberpunk",
      color: "Blue",
      query: "character"
    })

    const { result } = renderHook(() =>
      useDebouncedSemanticSearch({
        aiSearchQuery: "Legendary blue cyberpunk character",
        isAiSearch: true,
        categories,
        setRarityFilter: mockSetRarityFilter,
        setCategoryFilter: mockSetCategoryFilter,
        setColorFilter: mockSetColorFilter,
        setSearchTag: mockSetSearchTag,
        webLlmStatus: "ready",
        t
      })
    )

    // Fast-forward time for debounce timer (600ms)
    await act(async () => {
      vi.advanceTimersByTime(600)
    })

    expect(parseSemanticQuery).toHaveBeenCalledWith(
      "Legendary blue cyberpunk character",
      categories,
      "en"
    )

    // applyFilters should have been called, setting category to ID "cat-cyberpunk"
    expect(mockSetRarityFilter).toHaveBeenCalledWith("Legendary")
    expect(mockSetCategoryFilter).toHaveBeenCalledWith("cat-cyberpunk")
    expect(mockSetColorFilter).toHaveBeenCalledWith("Blue")
    expect(mockSetSearchTag).toHaveBeenCalledWith("character")

    expect(result.current.extractedFilters).toEqual({
      rarity: "Legendary",
      category: "Cyberpunk",
      color: "Blue",
      query: "character"
    })
  })

  it("should fallback to 'All' when category is not found in categories list", async () => {
    vi.mocked(parseSemanticQuery).mockResolvedValue({
      rarity: "All",
      category: "NonExistentCategory",
      color: "All",
      query: ""
    })

    renderHook(() =>
      useDebouncedSemanticSearch({
        aiSearchQuery: "NonExistentCategory",
        isAiSearch: true,
        categories,
        setRarityFilter: mockSetRarityFilter,
        setCategoryFilter: mockSetCategoryFilter,
        setColorFilter: mockSetColorFilter,
        setSearchTag: mockSetSearchTag,
        webLlmStatus: "ready",
        t
      })
    )

    await act(async () => {
      vi.advanceTimersByTime(600)
    })

    expect(mockSetCategoryFilter).toHaveBeenCalledWith("All")
  })
})
