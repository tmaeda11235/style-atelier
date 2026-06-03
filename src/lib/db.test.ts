import { describe, it, expect, vi } from "vitest";
import { seedDefaultCategories, upgradeToVersion8 } from "./db";

describe("db utilities", () => {
  describe("upgradeToVersion8", () => {
    it("should initialize associatedJobIds for cards that lack it", async () => {
      let modifyCallback: ((card: any) => void) | null = null;
      const mockModify = vi.fn((cb) => {
        modifyCallback = cb;
        return Promise.resolve();
      });
      const mockToCollection = vi.fn().mockReturnValue({ modify: mockModify });
      const mockTable = vi.fn().mockReturnValue({ toCollection: mockToCollection });
      const mockTx = { table: mockTable } as any;

      await upgradeToVersion8(mockTx);

      expect(mockTable).toHaveBeenCalledWith("styleCards");
      expect(mockToCollection).toHaveBeenCalled();
      expect(mockModify).toHaveBeenCalled();
      expect(modifyCallback).toBeTypeOf("function");

      // Test case 1: card has jobId and no associatedJobIds
      const card1 = { jobId: "job-123" } as any;
      modifyCallback!(card1);
      expect(card1.associatedJobIds).toEqual(["job-123"]);

      // Test case 2: card has no jobId and no associatedJobIds
      const card2 = {} as any;
      modifyCallback!(card2);
      expect(card2.associatedJobIds).toEqual([]);

      // Test case 3: card already has associatedJobIds, should not be modified
      const card3 = { jobId: "job-123", associatedJobIds: ["job-abc"] } as any;
      modifyCallback!(card3);
      expect(card3.associatedJobIds).toEqual(["job-abc"]);
    });
  });

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
