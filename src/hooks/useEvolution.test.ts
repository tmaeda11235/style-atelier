import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../lib/db"
import { useEvolution } from "./useEvolution"

let mockDbCards: Record<string, any> = {}

vi.mock("../lib/db", () => ({
  db: {
    getCard: vi.fn().mockImplementation(async (id: string) => mockDbCards[id]),
    updateCard: vi.fn().mockImplementation(async (id: string, updates: any) => {
      if (mockDbCards[id]) {
        Object.assign(mockDbCards[id], updates)
      }
      return 1
    }),
    addCard: vi.fn().mockImplementation(async (card: any) => {
      mockDbCards[card.id] = card
      return card.id
    })
  }
}))

describe("useEvolution hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbCards = {}
  })

  describe("getNextTier", () => {
    it("should map tiers correctly", () => {
      const { getNextTier } = useEvolution()
      expect(getNextTier("Common")).toBe("Rare")
      expect(getNextTier("Rare")).toBe("Epic")
      expect(getNextTier("Epic")).toBe("Legendary")
      expect(getNextTier("Legendary")).toBeNull()
      expect(getNextTier("other" as any)).toBeNull()
    })
  })

  describe("canEvolve", () => {
    it("should return false if card has no next tier", () => {
      const { canEvolve } = useEvolution()
      const card = { tier: "Legendary", usageCount: 100 } as any
      expect(canEvolve(card)).toBe(false)
    })

    it("should return false if card usageCount is below threshold", () => {
      const { canEvolve } = useEvolution()
      const card = { tier: "Common", usageCount: 2 } as any // Threshold is 5
      expect(canEvolve(card)).toBe(false)
    })

    it("should return true if card usageCount is equal to or greater than threshold", () => {
      const { canEvolve } = useEvolution()
      const cardCommon = { tier: "Common", usageCount: 5 } as any // Threshold is 5
      const cardRare = { tier: "Rare", usageCount: 15 } as any // Threshold is 15
      expect(canEvolve(cardCommon)).toBe(true)
      expect(canEvolve(cardRare)).toBe(true)
    })
  })

  describe("evolveCard", () => {
    it("should throw error if card is not found", async () => {
      const { evolveCard } = useEvolution()
      await expect(evolveCard("non-existent")).rejects.toThrow("Card not found")
    })

    it("should throw error if card cannot evolve", async () => {
      const { evolveCard } = useEvolution()
      mockDbCards["card-1"] = { id: "card-1", tier: "Common", usageCount: 2 }
      await expect(evolveCard("card-1")).rejects.toThrow(
        "Evolution requirements not met"
      )
    })

    it("should throw error if card is already at maximum tier", async () => {
      const { evolveCard } = useEvolution()
      mockDbCards["card-1"] = {
        id: "card-1",
        tier: "Legendary",
        usageCount: 100
      }
      await expect(evolveCard("card-1")).rejects.toThrow(
        "Evolution requirements not met"
      )
    })

    it("should evolve card successfully and update DB (with existing genealogy)", async () => {
      const { evolveCard } = useEvolution()
      mockDbCards["card-1"] = {
        id: "card-1",
        tier: "Common",
        usageCount: 5,
        genealogy: {
          generation: 2,
          parentIds: ["parent-a"],
          mutationNote: "Initial note"
        }
      }

      const nextTier = await evolveCard("card-1")
      expect(nextTier).toBe("Rare")
      expect(db.updateCard).toHaveBeenCalledWith(
        "card-1",
        expect.objectContaining({
          tier: "Rare",
          genealogy: expect.objectContaining({
            generation: 2,
            parentIds: ["parent-a"],
            mutationNote: expect.stringContaining("Evolved from Common to Rare")
          })
        })
      )
    })

    it("should evolve card successfully and update DB (without existing genealogy)", async () => {
      const { evolveCard } = useEvolution()
      mockDbCards["card-1"] = {
        id: "card-1",
        tier: "Common",
        usageCount: 5
      }

      const nextTier = await evolveCard("card-1")
      expect(nextTier).toBe("Rare")
      expect(db.updateCard).toHaveBeenCalledWith(
        "card-1",
        expect.objectContaining({
          tier: "Rare",
          genealogy: expect.objectContaining({
            generation: 1,
            parentIds: [],
            mutationNote: expect.stringContaining("Evolved from Common to Rare")
          })
        })
      )
    })
  })

  describe("createVariation", () => {
    it("should throw error if parent cards are empty", async () => {
      const { createVariation } = useEvolution()
      await expect(createVariation([], "Var", "thumb")).rejects.toThrow(
        "At least one parent card is required"
      )
    })

    it("should merge parents tags, parameters, and prompts correctly", async () => {
      const { createVariation } = useEvolution()

      const parent1 = {
        id: "p-1",
        name: "Parent 1",
        tier: "Common",
        promptSegments: [{ type: "text", value: "cyberpunk" }],
        parameters: {
          sref: ["sref-1", "sref-2"],
          cref: ["cref-1"],
          imagePrompts: ["ip-1"],
          ar: "16:9"
        },
        masking: { isSrefHidden: true },
        tags: ["futuristic", "cool"],
        dominantColor: "#00ff00",
        genealogy: { generation: 2, originCreatorId: "creator-1" }
      } as any

      const parent2 = {
        id: "p-2",
        name: "Parent 2",
        tier: "Rare",
        promptSegments: [{ type: "text", value: "synthwave" }],
        parameters: {
          sref: ["sref-2", "sref-3"],
          cref: ["cref-2"],
          imagePrompts: ["ip-2"]
        },
        tags: ["retro", "cool"],
        genealogy: { generation: 4, originCreatorId: "creator-2" }
      } as any

      const newCardId = await createVariation(
        [parent1, parent2],
        "Evolved Var",
        "thumbnail-data"
      )

      expect(newCardId).toBeTypeOf("string")
      expect(db.addCard).toHaveBeenCalledWith(
        expect.objectContaining({
          id: newCardId,
          name: "Evolved Var",
          thumbnailData: "thumbnail-data",
          tier: "Common",
          promptSegments: [
            { type: "text", value: "cyberpunk" },
            { type: "text", value: "synthwave" }
          ],
          parameters: expect.objectContaining({
            sref: ["sref-2", "sref-3", "sref-1"], // merges and keeps unique
            cref: ["cref-2", "cref-1"],
            imagePrompts: ["ip-2", "ip-1"],
            ar: "16:9"
          }),
          tags: ["futuristic", "cool", "retro"], // deduplicated
          dominantColor: "#00ff00",
          genealogy: {
            generation: 5, // Math.max(2, 4) + 1
            parentIds: ["p-1", "p-2"],
            originCreatorId: "creator-1",
            mutationNote: "Combined from Parent 1 and Parent 2"
          },
          associatedJobIds: []
        })
      )
    })

    it("should cap sref, cref, and imagePrompts at 5 items", async () => {
      const { createVariation } = useEvolution()

      const parent1 = {
        id: "p-1",
        name: "P1",
        tier: "Common",
        promptSegments: [],
        parameters: {
          sref: ["1", "2", "3", "4"]
        },
        genealogy: { generation: 1 }
      } as any

      const parent2 = {
        id: "p-2",
        name: "P2",
        tier: "Common",
        promptSegments: [],
        parameters: {
          sref: ["5", "6", "7"]
        },
        genealogy: { generation: 1 }
      } as any

      await createVariation([parent1, parent2], "Cap Var", "thumb")

      expect(db.addCard).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            sref: ["5", "6", "7", "1", "2"] // merged and capped at 5
          })
        })
      )
    })
  })
})
