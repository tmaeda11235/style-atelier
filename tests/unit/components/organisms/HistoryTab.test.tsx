import { HistoryTab } from "@/components/organisms/HistoryTab"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { useHistory } from "@/hooks/useHistory"
import type { HistoryItem } from "@/shared/lib/db-schema"
import { render, screen } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/hooks/useHistory", () => ({
  useHistory: vi.fn()
}))

const mockHistoryItems: HistoryItem[] = [
  {
    id: "item-1",
    fullCommand: "a majestic golden castle",
    imageUrl: "data:image/png;base64,123",
    timestamp: Date.now(),
    srefs: ["https://midjourney.com/sref1"],
    crefs: [],
    imagePrompts: [],
    promptSegments: [],
    parameters: {},
    dominantColor: "#000000"
  }
]

describe("HistoryTab", () => {
  const mockStartMinting = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem("style-atelier-language", "ja")
  })

  it("renders empty container while loading", () => {
    vi.mocked(useHistory).mockReturnValue({
      historyItems: undefined,
      loadMore: vi.fn(),
      hasMore: false,
      updateHistoryItem: vi.fn()
    })

    const { container } = render(
      <LanguageProvider>
        <HistoryTab onStartMinting={mockStartMinting} />
      </LanguageProvider>
    )
    expect(container.firstChild).not.toBeNull()
    const dropZone = container.querySelector(
      '[data-tutorial="history-drop-zone"]'
    )
    expect(dropZone).toBeDefined()
    expect(dropZone?.childNodes.length).toBe(0)
  })

  it("renders empty state when there are no history items", () => {
    vi.mocked(useHistory).mockReturnValue({
      historyItems: [],
      loadMore: vi.fn(),
      hasMore: false,
      updateHistoryItem: vi.fn()
    })

    render(
      <LanguageProvider>
        <HistoryTab onStartMinting={mockStartMinting} />
      </LanguageProvider>
    )
    expect(screen.getByText("履歴がありません")).toBeDefined()
    expect(
      screen.getByText(/Midjourneyのプロンプト入力エリアから画像/)
    ).toBeDefined()
    expect(screen.getByRole("link", { name: "Midjourneyを開く" })).toBeDefined()
  })

  it("renders history items when they exist", () => {
    vi.mocked(useHistory).mockReturnValue({
      historyItems: mockHistoryItems,
      loadMore: vi.fn(),
      hasMore: false,
      updateHistoryItem: vi.fn()
    })

    render(
      <LanguageProvider>
        <HistoryTab onStartMinting={mockStartMinting} />
      </LanguageProvider>
    )
    expect(screen.getByText("a majestic golden castle")).toBeDefined()
  })
})
