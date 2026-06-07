import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "./db"
import {
  addStyleCard,
  deleteStyleCard,
  getAllCategories,
  getAllStyleCards,
  getPinnedStyleCards,
  getStyleCardById,
  updateStyleCard
} from "./style-card-store"

vi.mock("./db", () => {
  return {
    db: {
      getCard: vi.fn(),
      getAllCards: vi.fn(),
      getPinnedCards: vi.fn(),
      getAllCategories: vi.fn(),
      addCard: vi.fn(),
      updateCard: vi.fn(),
      deleteCard: vi.fn()
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
      vi.mocked(db.getCard).mockResolvedValue(mockCard as any)

      const result = await getStyleCardById("card-123")

      expect(db.getCard).toHaveBeenCalledWith("card-123")
      expect(result).toEqual(mockCard)
    })

    it("returns undefined if style card is not found", async () => {
      vi.mocked(db.getCard).mockResolvedValue(undefined)

      const result = await getStyleCardById("card-456")

      expect(db.getCard).toHaveBeenCalledWith("card-456")
      expect(result).toBeUndefined()
    })
  })

  describe("getAllStyleCards", () => {
    it("retrieves all cards from the database", async () => {
      const mockCards = [{ id: "card-1" }, { id: "card-2" }]
      vi.mocked(db.getAllCards).mockResolvedValue(mockCards as any)

      const result = await getAllStyleCards()

      expect(db.getAllCards).toHaveBeenCalled()
      expect(result).toEqual(mockCards)
    })
  })

  describe("getPinnedStyleCards", () => {
    it("retrieves pinned cards from the database", async () => {
      const mockCards = [{ id: "card-1", isPinned: true }]
      vi.mocked(db.getPinnedCards).mockResolvedValue(mockCards as any)

      const result = await getPinnedStyleCards()

      expect(db.getPinnedCards).toHaveBeenCalled()
      expect(result).toEqual(mockCards)
    })
  })

  describe("getAllCategories", () => {
    it("retrieves all categories from the database", async () => {
      const mockCategories = [{ id: "cat-1", name: "Style" }]
      vi.mocked(db.getAllCategories).mockResolvedValue(mockCategories as any)

      const result = await getAllCategories()

      expect(db.getAllCategories).toHaveBeenCalled()
      expect(result).toEqual(mockCategories)
    })
  })

  describe("addStyleCard", () => {
    it("adds a style card and returns the id", async () => {
      const mockCard = { id: "card-1", name: "Test" } as any
      vi.mocked(db.addCard).mockResolvedValue("card-1")

      const result = await addStyleCard(mockCard)

      expect(db.addCard).toHaveBeenCalledWith(mockCard)
      expect(result).toBe("card-1")
    })
  })

  describe("updateStyleCard", () => {
    it("updates a style card and returns number of updated records", async () => {
      vi.mocked(db.updateCard).mockResolvedValue(1)

      const result = await updateStyleCard("card-1", { name: "Updated" })

      expect(db.updateCard).toHaveBeenCalledWith("card-1", { name: "Updated" })
      expect(result).toBe(1)
    })
  })

  describe("deleteStyleCard", () => {
    it("deletes a style card", async () => {
      vi.mocked(db.deleteCard).mockResolvedValue(undefined)

      await deleteStyleCard("card-1")

      expect(db.deleteCard).toHaveBeenCalledWith("card-1")
    })
  })
})
