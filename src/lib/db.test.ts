import { describe, it, expect, vi } from "vitest";
import { seedDefaultCategories } from "./db";

describe("db utilities", () => {
  describe("seedDefaultCategories", () => {
    it("should call bulkAdd on the categories table with the default categories", async () => {
      const mockCategories = {
        bulkAdd: vi.fn().mockResolvedValue(undefined),
      };
      const mockDb = {
        categories: mockCategories,
      } as any;

      await seedDefaultCategories(mockDb);

      expect(mockCategories.bulkAdd).toHaveBeenCalled();
      const calls = mockCategories.bulkAdd.mock.calls;
      const categoriesPassed = calls[0][0];
      expect(categoriesPassed).toHaveLength(7);
      expect(categoriesPassed[0]).toMatchObject({
        id: "style",
        name: "Style",
        iconEmoji: "🎨",
      });
      expect(categoriesPassed[1]).toMatchObject({
        id: "character",
        name: "Character",
        iconEmoji: "👤",
      });
      expect(categoriesPassed[0].createdAt).toBeTypeOf("number");
    });
  });
});
