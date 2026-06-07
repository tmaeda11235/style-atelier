import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "./db"
import { getStyleCardById } from "./style-card-store"

vi.mock("./db", () => {
  return {
    db: {
      styleCards: {
        get: vi.fn()
      }
    }
  }
})

describe("style-card-store", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getStyleCardById", () => {
    it("retrieves a style card by ID from the database", async () => {
      const mockCard = {
        id: "card-123",
        name: "Cyberpunk Glow",
        tier: "Legendary"
      }
      vi.mocked(db.styleCards.get).mockResolvedValue(mockCard as any)

      const result = await getStyleCardById("card-123")

      expect(db.styleCards.get).toHaveBeenCalledWith("card-123")
      expect(result).toEqual(mockCard)
    })

    it("returns undefined if style card is not found", async () => {
      vi.mocked(db.styleCards.get).mockResolvedValue(undefined)

      const result = await getStyleCardById("card-456")

      expect(db.styleCards.get).toHaveBeenCalledWith("card-456")
      expect(result).toBeUndefined()
    })
  })
})
