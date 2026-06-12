import type { StyleCardMetadata } from "@/hooks/useLibraryData"
import {
  applyColorFilterMeta,
  applyModelFilter,
  applyTextSearch,
  calculateBreadcrumbs,
  compareByColor,
  filterAndSortMetaCards,
  getSortKey,
  sortCards
} from "@/lib/library-filter-utils"
import { describe, expect, it } from "vitest"

describe("library-filter-utils", () => {
  it("calculateBreadcrumbs", () => {
    const categories = [
      { id: "1", name: "Folder 1", parentId: null },
      { id: "2", name: "Folder 2", parentId: "1" }
    ]
    const bc = calculateBreadcrumbs("2", categories)
    expect(bc.length).toBe(3)
    expect(bc[0].name).toBe("Home")
    expect(bc[1].name).toBe("Folder 1")
    expect(bc[2].name).toBe("Folder 2")
  })

  it("applyModelFilter", () => {
    const cards: Partial<StyleCardMetadata>[] = [
      { id: "a", version: "6.0", niji: undefined },
      { id: "b", version: "5.2", niji: undefined },
      { id: "c", version: undefined, niji: "6" }
    ]
    const v6 = applyModelFilter(cards as StyleCardMetadata[], "V6")
    expect(v6.length).toBe(1)
    expect(v6[0].id).toBe("a")

    const niji6 = applyModelFilter(cards as StyleCardMetadata[], "Niji 6")
    expect(niji6.length).toBe(1)
    expect(niji6[0].id).toBe("c")
  })

  it("getSortKey", () => {
    const key = getSortKey("#FFFFFF")
    expect(key.isNeutral).toBe(true)
  })

  it("compareByColor", () => {
    const a = { dominantColor: "#FFFFFF" } as StyleCardMetadata
    const b = { dominantColor: "#FF0000" } as StyleCardMetadata
    // b is not neutral, a is neutral
    expect(compareByColor(a, b)).toBe(1)
  })

  it("sortCards", () => {
    const cards: Partial<StyleCardMetadata>[] = [
      { id: "a", createdAt: 100 },
      { id: "b", createdAt: 200 }
    ]
    const newest = sortCards(cards as StyleCardMetadata[], "newest")
    expect(newest[0].id).toBe("b")

    const oldest = sortCards(cards as StyleCardMetadata[], "oldest")
    expect(oldest[0].id).toBe("a")
  })

  it("applyColorFilterMeta", () => {
    const cards: Partial<StyleCardMetadata>[] = [
      { id: "a", dominantColor: "#FF0000" },
      { id: "b", dominantColor: "#00FF00" }
    ]
    const redCards = applyColorFilterMeta(
      cards as StyleCardMetadata[],
      "Red",
      null
    )
    expect(redCards.length).toBe(1)
    expect(redCards[0].id).toBe("a")
  })

  it("applyTextSearch", () => {
    const cards: Partial<StyleCardMetadata>[] = [{ id: "a" }, { id: "b" }]
    const mockIndex = {
      search: (q: string) => (q === "test" ? ["a"] : [])
    }
    const result = applyTextSearch(
      cards as StyleCardMetadata[],
      "test",
      mockIndex
    )
    expect(result.length).toBe(1)
    expect(result[0].id).toBe("a")
  })

  it("filterAndSortMetaCards returns correctly", () => {
    const cards: Partial<StyleCardMetadata>[] = [
      {
        id: "a",
        isVariable: false,
        tier: "Common",
        category: "f1",
        createdAt: 100
      }
    ]
    const result = filterAndSortMetaCards(
      cards as StyleCardMetadata[],
      "",
      null,
      "Common",
      "All",
      "All",
      "All",
      null,
      "newest",
      "f1"
    )
    expect(result.length).toBe(1)
  })
})
