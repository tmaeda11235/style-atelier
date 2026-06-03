import { describe, it, expect, vi, beforeEach } from "vitest"
import { useEvolution } from "./useEvolution"
import { db } from "../lib/db"

vi.mock("../lib/db", () => ({
  db: {
    styleCards: {
      get: vi.fn(),
      update: vi.fn(),
      add: vi.fn().mockResolvedValue("new-card-id"),
    },
  },
}))

describe("useEvolution hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should initialize associatedJobIds as empty array when creating variation", async () => {
    const { createVariation } = useEvolution()

    const parentCards = [
      {
        id: "parent-1",
        name: "Parent 1",
        promptSegments: [{ type: "text" as const, value: "parent prompt" }],
        parameters: {},
        masking: { isSrefHidden: false, isPHidden: false },
        tier: "Common" as const,
        tags: ["tag1"],
        dominantColor: "#ff0000",
        genealogy: { generation: 1, parentIds: [] },
      },
    ] as any[]

    const newCardId = await createVariation(parentCards, "Variation Name", "thumbnail-url")

    expect(db.styleCards.add).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Variation Name",
        associatedJobIds: [],
      })
    )
    expect(newCardId).toBeTypeOf("string")
  })
})
