import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Workbench } from "./Workbench";
import { useWorkbench } from "../../hooks/useWorkbench";
import { useEvolution } from "../../hooks/useEvolution";
import { db } from "../../lib/db";
import type { StyleCard } from "../../lib/db-schema";

vi.mock("../../hooks/useWorkbench", () => ({
  useWorkbench: vi.fn(),
}));

vi.mock("../../hooks/useEvolution", () => ({
  useEvolution: vi.fn(),
}));

vi.mock("../../lib/db", () => ({
  db: {
    styleCards: {
      add: vi.fn(),
      update: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
      toArray: vi.fn().mockResolvedValue([]),
    },
    categories: {
      toArray: vi.fn().mockResolvedValue([]),
    },
    transaction: vi.fn((mode, tables, cb) => cb()),
  },
}));

// Mock chrome API
global.chrome = {
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
} as any;

describe("Workbench", () => {
  const mockSetAlertType = vi.fn();
  const mockAddLog = vi.fn();

  const mockTargetCard: StyleCard = {
    id: "card-1",
    name: "Photo Template",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [
      { type: "text", value: "a photo of" },
      { type: "slot", label: "Subject", default: "dog" },
      { type: "text", value: "in" },
      { type: "slot", label: "Style", default: "sunset" },
    ],
    parameters: { ar: "16:9" },
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Rare",
    isFavorite: false,
    isPinned: true,
    usageCount: 5,
    tags: ["photo"],
    dominantColor: "#ff0000",
    thumbnailData: "data:image/png;base64,abc",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] },
  };

  const mockHandCard: StyleCard = {
    id: "card-hand-1",
    name: "cyberpunk cat",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [{ type: "text", value: "cyberpunk cat" }],
    parameters: {},
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Common",
    isFavorite: false,
    isPinned: true,
    usageCount: 0,
    tags: ["cat"],
    dominantColor: "#00ff00",
    thumbnailData: "",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useEvolution).mockReturnValue({
      canEvolve: vi.fn().mockReturnValue(false),
      evolveCard: vi.fn(),
      createVariation: vi.fn(),
      getNextTier: vi.fn().mockReturnValue("Epic"),
    });

    vi.mocked(chrome.tabs.query).mockResolvedValue([{ id: 1 }] as any);
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({ status: "success" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no cards in workbench", () => {
    vi.mocked(useWorkbench).mockReturnValue({
      workbenchCards: [],
      handCards: [],
      selectedCardIds: [],
      toggleCardSelection: vi.fn(),
      clearWorkbench: vi.fn(),
      mergedPrompt: "",
    });

    render(<Workbench setAlertType={mockSetAlertType} addLog={mockAddLog} />);
    expect(screen.getByText("Workbench is Empty")).toBeDefined();
  });

  it("renders card segments and slot variable inputs when card has slots", async () => {
    vi.mocked(useWorkbench).mockReturnValue({
      workbenchCards: [mockTargetCard],
      handCards: [mockHandCard],
      selectedCardIds: ["card-1"],
      toggleCardSelection: vi.fn(),
      clearWorkbench: vi.fn(),
      mergedPrompt: "",
    });

    render(<Workbench setAlertType={mockSetAlertType} addLog={mockAddLog} />);

    // Check headings and bubbles
    expect(screen.getByText("Slot Variables")).toBeDefined();
    expect(screen.getAllByText("Subject")).toBeDefined();
    expect(screen.getAllByText("Style")).toBeDefined();

    // Verify input fields are rendered with default values
    const subjectInput = screen.getByPlaceholderText("dog") as HTMLInputElement;
    const styleInput = screen.getByPlaceholderText("sunset") as HTMLInputElement;

    expect(subjectInput.value).toBe("dog");
    expect(styleInput.value).toBe("sunset");

    // First input should be focused automatically
    await waitFor(() => {
      expect(document.activeElement).toBe(subjectInput);
    });
  });

  it("replaces slot values in prompt and persists to history on injection success", async () => {
    vi.mocked(useWorkbench).mockReturnValue({
      workbenchCards: [mockTargetCard],
      handCards: [],
      selectedCardIds: ["card-1"],
      toggleCardSelection: vi.fn(),
      clearWorkbench: vi.fn(),
      mergedPrompt: "",
    });

    render(<Workbench setAlertType={mockSetAlertType} addLog={mockAddLog} />);

    const subjectInput = screen.getByPlaceholderText("dog") as HTMLInputElement;
    const styleInput = screen.getByPlaceholderText("sunset") as HTMLInputElement;

    // Modify values
    fireEvent.change(subjectInput, { target: { value: "neon tiger" } });
    fireEvent.change(styleInput, { target: { value: "neon rain" } });

    const injectButton = screen.getByText("Try on Midjourney");
    fireEvent.click(injectButton);

    await waitFor(() => {
      // Check message sent to Chrome contains resolved slots
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          type: "INJECT_PROMPT",
          prompt: "a photo of, neon tiger, in, neon rain --ar 16:9",
        })
      );
      // Check that usageCount was incremented
      expect(db.styleCards.update).toHaveBeenCalledWith("card-1", {
        usageCount: 6,
      });
    });

    // Check value is saved to localStorage history
    const history = JSON.parse(localStorage.getItem("style_atelier_slot_history") || "{}");
    expect(history.Subject).toContain("neon tiger");
    expect(history.Style).toContain("neon rain");
  });

  it("pins slot value directly to Hand when clicking pin button", async () => {
    vi.mocked(useWorkbench).mockReturnValue({
      workbenchCards: [mockTargetCard],
      handCards: [],
      selectedCardIds: ["card-1"],
      toggleCardSelection: vi.fn(),
      clearWorkbench: vi.fn(),
      mergedPrompt: "",
    });

    render(<Workbench setAlertType={mockSetAlertType} addLog={mockAddLog} />);

    const subjectInput = screen.getByPlaceholderText("dog") as HTMLInputElement;
    fireEvent.change(subjectInput, { target: { value: "steampunk dragon" } });

    // The pin button next to Subject input
    const pinButtons = screen.getAllByTitle("Pin to Hand");
    fireEvent.click(pinButtons[0]);

    await waitFor(() => {
      expect(db.styleCards.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "steampunk dragon",
          isPinned: true,
          isVariable: true,
          promptSegments: [{ type: "text", value: "steampunk dragon" }],
          tags: ["subject"],
        })
      );
      expect(mockAddLog).toHaveBeenCalledWith(
        expect.stringContaining('Pinned "steampunk dragon" to Hand')
      );
    });
  });

  it("allows filling slot variables from Hand cards", async () => {
    vi.mocked(useWorkbench).mockReturnValue({
      workbenchCards: [mockTargetCard],
      handCards: [mockHandCard],
      selectedCardIds: ["card-1"],
      toggleCardSelection: vi.fn(),
      clearWorkbench: vi.fn(),
      mergedPrompt: "",
    });

    render(<Workbench setAlertType={mockSetAlertType} addLog={mockAddLog} />);

    const subjectInput = screen.getByPlaceholderText("dog") as HTMLInputElement;
    expect(subjectInput.value).toBe("dog");

    // Click on Hand card button under Subject to fill it
    const fillButtons = screen.getAllByRole("button", { name: "cyberpunk cat" });
    fireEvent.click(fillButtons[0]);

    expect(subjectInput.value).toBe("cyberpunk cat");
  });

  it("displays 'Merge Stack' button when 2 or more cards are selected, opens modal on click", () => {
    vi.mocked(useWorkbench).mockReturnValue({
      workbenchCards: [mockTargetCard, mockHandCard],
      handCards: [mockHandCard],
      selectedCardIds: ["card-1", "card-hand-1"],
      toggleCardSelection: vi.fn(),
      clearWorkbench: vi.fn(),
      mergedPrompt: "",
    });

    render(<Workbench setAlertType={mockSetAlertType} addLog={mockAddLog} />);

    const mergeBtn = screen.getByRole("button", { name: /Merge Stack/i });
    expect(mergeBtn).toBeDefined();

    fireEvent.click(mergeBtn);

    expect(screen.getByText("Merge Card Stack")).toBeDefined();
    expect(screen.getAllByText("Photo Template")).toBeDefined();
    expect(screen.getAllByText("cyberpunk cat")).toBeDefined();
  });

  it("performs card merging correctly when Merge Stack is executed inside modal", async () => {
    const mockClearWorkbench = vi.fn();
    vi.mocked(useWorkbench).mockReturnValue({
      workbenchCards: [mockTargetCard, mockHandCard],
      handCards: [mockHandCard],
      selectedCardIds: ["card-1", "card-hand-1"],
      toggleCardSelection: vi.fn(),
      clearWorkbench: mockClearWorkbench,
      mergedPrompt: "",
    });

    render(<Workbench setAlertType={mockSetAlertType} addLog={mockAddLog} />);

    const mergeBtn = screen.getByRole("button", { name: /Merge Stack/i });
    fireEvent.click(mergeBtn);

    const modalMergeBtns = screen.getAllByRole("button", { name: /Merge Stack/i });
    fireEvent.click(modalMergeBtns[1]);

    await waitFor(() => {
      expect(db.styleCards.update).toHaveBeenCalledWith("card-1", expect.objectContaining({
        usageCount: 5,
      }));
      expect(db.styleCards.delete).toHaveBeenCalledWith("card-hand-1");
      expect(mockClearWorkbench).toHaveBeenCalled();
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('Fused cards into "Photo Template"'));
    });
  });
});
