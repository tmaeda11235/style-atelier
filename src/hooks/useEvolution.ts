import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import { mergePromptSegments } from "../lib/prompt-utils"
import { mergeReferences } from "../lib/prompt-reference-utils"
import { UPGRADE_THRESHOLDS, type RarityTier } from "../lib/rarity-config"

export function useEvolution() {
  const getNextTier = (currentTier: RarityTier): RarityTier | null => {
    switch (currentTier) {
      case "Common":
        return "Rare"
      case "Rare":
        return "Epic"
      case "Epic":
        return "Legendary"
      default:
        return null
    }
  }

  const canEvolve = (card: StyleCard): boolean => {
    const nextTier = getNextTier(card.tier)
    if (!nextTier) return false
    const threshold =
      UPGRADE_THRESHOLDS[card.tier as keyof typeof UPGRADE_THRESHOLDS]
    return card.usageCount >= threshold
  }

  const evolveCard = async (cardId: string) => {
    const card = await db.getCard(cardId)
    if (!card) throw new Error("Card not found")
    if (!canEvolve(card)) throw new Error("Evolution requirements not met")

    const nextTier = getNextTier(card.tier)
    if (!nextTier) throw new Error("Already at maximum tier")

    const currentGenealogy = card.genealogy || {
      generation: 1,
      parentIds: [],
      mutationNote: ""
    }
    await db.updateCard(cardId, {
      tier: nextTier,
      updatedAt: Date.now(),
      genealogy: {
        ...currentGenealogy,
        mutationNote:
          `${currentGenealogy.mutationNote || ""}\nEvolved from ${card.tier} to ${nextTier} at ${new Date().toLocaleString()}`.trim()
      }
    })

    return nextTier
  }

  const createVariation = async (
    parentCards: StyleCard[],
    variationName: string,
    thumbnailData: string
  ): Promise<string> => {
    if (parentCards.length === 0)
      throw new Error("At least one parent card is required")

    const mainParent = parentCards[0]

    // プロンプトの統合（重複排除を適用）
    const allSegments = parentCards.flatMap((p) => p.promptSegments)
    const mergedSegments = mergePromptSegments(allSegments)

    // パラメータの統合
    const mergedParams: StyleCard["parameters"] = { ...mainParent.parameters }

    // sref / cref のマージ (親カードの weight を加味)
    const srefList = parentCards
      .filter((p) => p.parameters.sref)
      .map((p) => ({ items: p.parameters.sref!, cardWeight: p.weight }))
    mergedParams.sref = mergeReferences(srefList).slice(0, 5)

    const crefList = parentCards
      .filter((p) => p.parameters.cref)
      .map((p) => ({ items: p.parameters.cref!, cardWeight: p.weight }))
    mergedParams.cref = mergeReferences(crefList).slice(0, 5)

    parentCards.slice(1).forEach((parent) => {
      // imagePromptsのマージ (最大5枚、最新優先)
      if (parent.parameters.imagePrompts) {
        const combinedIP = [
          ...(parent.parameters.imagePrompts || []),
          ...(mergedParams.imagePrompts || [])
        ]
        mergedParams.imagePrompts = Array.from(new Set(combinedIP)).slice(0, 5)
      }
      // 他のパラメータも必要に応じてマージ
    })

    const newCard: StyleCard = {
      id: crypto.randomUUID(),
      name: variationName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      promptSegments: mergedSegments,
      parameters: mergedParams,
      masking: { ...mainParent.masking },
      tier: "Common",
      isFavorite: false,
      isPinned: false,
      usageCount: 0,
      tags: Array.from(new Set(parentCards.flatMap((p) => p.tags))),
      dominantColor: mainParent.dominantColor,
      thumbnailData,
      frameId: "default",
      genealogy: {
        generation:
          Math.max(...parentCards.map((p) => p.genealogy.generation)) + 1,
        parentIds: parentCards.map((p) => p.id),
        originCreatorId: mainParent.genealogy.originCreatorId,
        mutationNote: `Combined from ${parentCards.map((p) => p.name).join(" and ")}`
      },
      associatedJobIds: []
    }

    await db.addCard(newCard)
    return newCard.id
  }

  return {
    canEvolve,
    evolveCard,
    createVariation,
    getNextTier
  }
}
