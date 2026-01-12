import { db } from "../lib/db";
import type { StyleCard, PromptSegment } from "../lib/db-schema";
import { UPGRADE_THRESHOLDS, RarityTier } from "../lib/rarity-config";
import { mergePromptSegments } from "../lib/prompt-utils";

export function useEvolution() {
  const getNextTier = (currentTier: RarityTier): RarityTier | null => {
    switch (currentTier) {
      case "Common":
        return "Rare";
      case "Rare":
        return "Epic";
      case "Epic":
        return "Legendary";
      default:
        return null;
    }
  };

  const canEvolve = (card: StyleCard): boolean => {
    const nextTier = getNextTier(card.tier);
    if (!nextTier) return false;
    const threshold = UPGRADE_THRESHOLDS[card.tier as keyof typeof UPGRADE_THRESHOLDS];
    return card.usageCount >= threshold;
  };

  const evolveCard = async (cardId: string) => {
    const card = await db.styleCards.get(cardId);
    if (!card) throw new Error("Card not found");
    if (!canEvolve(card)) throw new Error("Evolution requirements not met");

    const nextTier = getNextTier(card.tier);
    if (!nextTier) throw new Error("Already at maximum tier");

    await db.styleCards.update(cardId, {
      tier: nextTier,
      updatedAt: Date.now(),
      genealogy: {
        ...card.genealogy,
        mutationNote: `${card.genealogy.mutationNote || ""}\nEvolved from ${card.tier} to ${nextTier} at ${new Date().toLocaleString()}`.trim(),
      },
      // TODO: Add evolution animation flag if needed for UI
    });

    return nextTier;
  };

  const createVariation = async (parentCards: StyleCard[], variationName: string, thumbnailData: string): Promise<string> => {
    if (parentCards.length === 0) throw new Error("At least one parent card is required");

    const mainParent = parentCards[0];

    // プロンプトの統合（重複排除を適用）
    const allSegments = parentCards.flatMap(p => p.promptSegments);
    const mergedSegments = mergePromptSegments(allSegments);

    // パラメータの統合
    const mergedParams: StyleCard["parameters"] = { ...mainParent.parameters };
    parentCards.slice(1).forEach(parent => {
      // srefのマージ (最大5枚、最新優先)
      if (parent.parameters.sref) {
        const combinedSref = [...(parent.parameters.sref || []), ...(mergedParams.sref || [])];
        mergedParams.sref = Array.from(new Set(combinedSref)).slice(0, 5);
      }
      // crefのマージ (最新優先)
      if (parent.parameters.cref) {
        const combinedCref = [...(parent.parameters.cref || []), ...(mergedParams.cref || [])];
        mergedParams.cref = Array.from(new Set(combinedCref)).slice(0, 5);
      }
      // 他のパラメータも必要に応じてマージ
    });

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
      tags: Array.from(new Set(parentCards.flatMap(p => p.tags))),
      dominantColor: mainParent.dominantColor,
      thumbnailData,
      frameId: "default",
      genealogy: {
        generation: Math.max(...parentCards.map(p => p.genealogy.generation)) + 1,
        parentIds: parentCards.map(p => p.id),
        originCreatorId: mainParent.genealogy.originCreatorId,
        mutationNote: `Combined from ${parentCards.map(p => p.name).join(" and ")}`,
      },
    };

    await db.styleCards.add(newCard);
    return newCard.id;
  };

  return {
    canEvolve,
    evolveCard,
    createVariation,
    getNextTier,
  };
}