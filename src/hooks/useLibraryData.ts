import { useLiveQuery } from "dexie-react-hooks"
import { Index } from "flexsearch"
import { useMemo } from "react"

import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"

export interface StyleCardMetadata {
  id: string
  name: string
  tags: string[]
  tier: StyleCard["tier"]
  category?: string
  dominantColor?: string
  createdAt: number
  usageCount: number
  isPinned: boolean
  isVariable: boolean
  sref: string[]
  promptSegments: StyleCard["promptSegments"]
  parameters: StyleCard["parameters"]
  masking: StyleCard["masking"]
  version?: string
  niji?: string
}

function buildFlexSearchIndex(
  allCardsMeta: StyleCardMetadata[],
  categories: { id: string; name: string }[]
): Index {
  const index = new Index({
    tokenize: "forward",
    resolution: 9
  })
  allCardsMeta.forEach((card) => {
    const catObj = categories.find((c) => c.id === card.category)
    const categoryName = catObj ? catObj.name.toLowerCase() : ""
    const searchText = [
      card.name,
      ...(card.tags || []),
      ...(card.sref || []),
      categoryName
    ]
      .join(" ")
      .toLowerCase()
    index.add(card.id, searchText)
  })
  return index
}

function extractAllSrefs(allCardsMeta: StyleCardMetadata[]): string[] {
  const srefs = new Set<string>()
  allCardsMeta.forEach((card) => {
    card.sref?.forEach((url) => srefs.add(url))
  })
  return Array.from(srefs)
}

export function useLibraryData() {
  const allCardsMeta = useLiveQuery(async () => {
    const cards = await db.getAllCards()
    return cards.map(
      (c): StyleCardMetadata => ({
        id: c.id,
        name: c.name,
        tags: c.tags || [],
        tier: c.tier,
        category: c.category,
        dominantColor: c.dominantColor,
        createdAt: c.createdAt,
        usageCount: c.usageCount || 0,
        isPinned: !!c.isPinned,
        isVariable: !!c.isVariable,
        sref: c.parameters?.sref || [],
        promptSegments: c.promptSegments,
        parameters: c.parameters,
        masking: c.masking,
        version: c.version || c.parameters?.version,
        niji: c.niji || c.parameters?.niji
      })
    )
  })

  const categories = useLiveQuery(() => db.getAllCategories()) || []

  const flexsearchIndex = useMemo(() => {
    if (!allCardsMeta) return null
    return buildFlexSearchIndex(allCardsMeta, categories as any)
  }, [allCardsMeta, categories])

  const allSrefs = useMemo(() => {
    if (!allCardsMeta) return []
    return extractAllSrefs(allCardsMeta)
  }, [allCardsMeta])

  return {
    allCardsMeta,
    categories,
    flexsearchIndex,
    allSrefs
  }
}
