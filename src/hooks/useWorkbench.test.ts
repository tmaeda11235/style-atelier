import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWorkbench } from "./useWorkbench";
import { db } from "../lib/db";
import { renderHook, act } from "@testing-library/react";

let mockHandCards: any[] = [];
let mockDbCards: Record<string, any> = {};

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any) => {
    return mockHandCards;
  }
}));

vi.mock("../lib/db", () => ({
  db: {
    styleCards: {
      get: vi.fn().mockImplementation(async (id: string) => mockDbCards[id]),
      update: vi.fn().mockImplementation(async (id: string, updates: any) => {
        if (mockDbCards[id]) {
          Object.assign(mockDbCards[id], updates);
        }
        return 1;
      }),
      delete: vi.fn().mockImplementation(async (id: string) => {
        delete mockDbCards[id];
        return 1;
      }),
    }
  }
}));

describe("useWorkbench hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandCards = [];
    mockDbCards = {};
  });

  it("should return empty arrays and empty prompt initially when there are no cards", () => {
    const { result } = renderHook(() => useWorkbench());

    expect(result.current.handCards).toEqual([]);
    expect(result.current.workbenchCards).toEqual([]);
    expect(result.current.selectedCardIds).toEqual([]);
    expect(result.current.mergedPrompt).toBe("");
  });

  it("should return list of hand cards, workbench cards, and selected card IDs when cards are loaded", () => {
    const card1 = { id: "card-1", name: "Card 1", isPinned: true, promptSegments: [], parameters: {}, masking: {} };
    const card2 = { id: "card-2", name: "Card 2", isPinned: true, promptSegments: [], parameters: {}, masking: {} };
    mockHandCards = [card1, card2];

    const { result } = renderHook(() => useWorkbench());

    expect(result.current.handCards).toEqual([card1, card2]);
    expect(result.current.workbenchCards).toEqual([card1, card2]);
    expect(result.current.selectedCardIds).toEqual(["card-1", "card-2"]);
  });

  describe("toggleCardSelection", () => {
    it("should unpin a pinned normal card", async () => {
      const card = { id: "card-1", isPinned: true, isVariable: false, promptSegments: [], parameters: {}, masking: {} };
      mockDbCards["card-1"] = { ...card };
      mockHandCards = [mockDbCards["card-1"]];

      const { result } = renderHook(() => useWorkbench());

      await act(async () => {
        await result.current.toggleCardSelection("card-1");
      });

      expect(db.styleCards.update).toHaveBeenCalledWith("card-1", { isPinned: false });
      expect(mockDbCards["card-1"].isPinned).toBe(false);
    });

    it("should pin an unpinned normal card", async () => {
      const card = { id: "card-1", isPinned: false, isVariable: false, promptSegments: [], parameters: {}, masking: {} };
      mockDbCards["card-1"] = { ...card };

      const { result } = renderHook(() => useWorkbench());

      await act(async () => {
        await result.current.toggleCardSelection("card-1");
      });

      expect(db.styleCards.update).toHaveBeenCalledWith("card-1", { isPinned: true });
      expect(mockDbCards["card-1"].isPinned).toBe(true);
    });

    it("should delete a variable card instead of updating isPinned", async () => {
      const card = { id: "var-1", isPinned: true, isVariable: true, promptSegments: [], parameters: {}, masking: {} };
      mockDbCards["var-1"] = { ...card };
      mockHandCards = [mockDbCards["var-1"]];

      const { result } = renderHook(() => useWorkbench());

      await act(async () => {
        await result.current.toggleCardSelection("var-1");
      });

      expect(db.styleCards.delete).toHaveBeenCalledWith("var-1");
      expect(mockDbCards["var-1"]).toBeUndefined();
    });

    it("should do nothing if card is not found in db", async () => {
      const { result } = renderHook(() => useWorkbench());

      await act(async () => {
        await result.current.toggleCardSelection("non-existent");
      });

      expect(db.styleCards.update).not.toHaveBeenCalled();
      expect(db.styleCards.delete).not.toHaveBeenCalled();
    });
  });

  describe("clearWorkbench", () => {
    it("should unpin normal cards and delete variable cards", async () => {
      const normalCard = { id: "card-1", isPinned: true, isVariable: false, promptSegments: [], parameters: {}, masking: {} };
      const variableCard = { id: "var-1", isPinned: true, isVariable: true, promptSegments: [], parameters: {}, masking: {} };
      mockDbCards["card-1"] = { ...normalCard };
      mockDbCards["var-1"] = { ...variableCard };
      mockHandCards = [mockDbCards["card-1"], mockDbCards["var-1"]];

      const { result } = renderHook(() => useWorkbench());

      await act(async () => {
        await result.current.clearWorkbench();
      });

      expect(db.styleCards.update).toHaveBeenCalledWith("card-1", { isPinned: false });
      expect(db.styleCards.delete).toHaveBeenCalledWith("var-1");
      expect(mockDbCards["card-1"].isPinned).toBe(false);
      expect(mockDbCards["var-1"]).toBeUndefined();
    });

    it("should do nothing if handCards is falsy", async () => {
      // Set mockHandCards to null to simulate no live query result loaded yet
      mockHandCards = null as any;

      const { result } = renderHook(() => useWorkbench());

      await act(async () => {
        await result.current.clearWorkbench();
      });

      expect(db.styleCards.update).not.toHaveBeenCalled();
      expect(db.styleCards.delete).not.toHaveBeenCalled();
    });
  });

  describe("mergedPrompt", () => {
    it("should return empty string when hand cards are empty", () => {
      mockHandCards = [];
      const { result } = renderHook(() => useWorkbench());
      expect(result.current.mergedPrompt).toBe("");
    });

    it("should join multiple prompts with commas", () => {
      mockHandCards = [
        {
          id: "1",
          promptSegments: [{ type: "text", value: "cyberpunk city" }],
          parameters: { ar: "16:9" },
          masking: {}
        },
        {
          id: "2",
          promptSegments: [{ type: "text", value: "neon light" }],
          parameters: {},
          masking: {}
        }
      ];

      const { result } = renderHook(() => useWorkbench());
      expect(result.current.mergedPrompt).toBe("cyberpunk city --ar 16:9, neon light");
    });

    it("should apply masking correctly (hiding sref and p parameters)", () => {
      mockHandCards = [
        {
          id: "1",
          promptSegments: [{ type: "text", value: "synthwave style" }],
          parameters: { sref: ["sref-123"], p: ["p-code"], ar: "4:3" },
          masking: { isSrefHidden: true, isPHidden: false }
        },
        {
          id: "2",
          promptSegments: [{ type: "text", value: "retro future" }],
          parameters: { sref: ["sref-456"], p: ["p-another"], ar: "16:9" },
          masking: { isSrefHidden: false, isPHidden: true }
        },
        {
          id: "3",
          promptSegments: [{ type: "text", value: "vaporwave aesthetic" }],
          parameters: { sref: ["sref-789"], p: ["p-vapor"], ar: "1:1" },
          masking: { isSrefHidden: true, isPHidden: true }
        }
      ];

      const { result } = renderHook(() => useWorkbench());
      
      // Card 1: sref is hidden, p is shown -> should include "--ar 4:3 --p p-code"
      // Card 2: sref is shown, p is hidden -> should include "--ar 16:9 --sref sref-456"
      // Card 3: both are hidden -> should include only "--ar 1:1"
      expect(result.current.mergedPrompt).toBe(
        "synthwave style --ar 4:3 --p p-code, retro future --ar 16:9 --sref sref-456, vaporwave aesthetic --ar 1:1"
      );
    });
  });
});
