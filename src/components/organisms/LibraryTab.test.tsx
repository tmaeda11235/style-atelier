import { fireEvent, screen, render as tlRender } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LanguageProvider } from "../../contexts/LanguageContext"
import { SettingsProvider } from "../../contexts/SettingsContext"
import { TutorialProvider } from "../../contexts/TutorialContext"
import { useLibrary } from "../../hooks/useLibrary"
import type { StyleCard } from "../../lib/db-schema"
import { LibraryTab } from "./LibraryTab"

const render = (ui: React.ReactElement, options?: any) => {
  return tlRender(
    <LanguageProvider>
      <SettingsProvider>{ui}</SettingsProvider>
    </LanguageProvider>,
    options
  )
}

vi.mock("../../hooks/useLibrary", () => ({
  useLibrary: vi.fn()
}))

const mockCards: StyleCard[] = [
  {
    id: "card-1",
    name: "Golden Dragon",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [{ type: "text", value: "a golden dragon" }],
    parameters: {},
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Legendary",
    isFavorite: false,
    isPinned: false,
    usageCount: 12,
    tags: ["fantasy", "gold"],
    dominantColor: "#d4af37",
    thumbnailData: "data:image/png;base64,123",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] }
  }
]

describe("LibraryTab", () => {
  const mockOpenDetailCard = vi.fn()
  const mockAddLog = vi.fn()
  const mockSetAlertType = vi.fn()

  const defaultProps = {
    addLog: mockAddLog,
    setAlertType: mockSetAlertType,
    onOpenDetailCard: mockOpenDetailCard
  }

  const mockTogglePin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem("style-atelier-language", "ja")
    vi.mocked(useLibrary).mockReturnValue({
      styleCards: mockCards,
      handleCardClick: vi.fn(),
      togglePin: mockTogglePin,
      searchTag: "",
      setSearchTag: vi.fn(),
      rarityFilter: "All",
      setRarityFilter: vi.fn(),
      categoryFilter: "All",
      setCategoryFilter: vi.fn(),
      colorFilter: "All",
      setColorFilter: vi.fn(),
      sortBy: "newest",
      setSortBy: vi.fn(),
      allSrefs: [],
      categories: [],
      allCards: mockCards,
      hasMore: false,
      loadMore: vi.fn(),
      totalMatchedCount: 1
    })
  })

  it("renders search field, filters, and cards", () => {
    render(
      <TutorialProvider>
        <LibraryTab {...defaultProps} />
      </TutorialProvider>
    )
    expect(
      screen.getByPlaceholderText("タグ、名前、srefで検索...")
    ).toBeDefined()
    expect(screen.getByText("Golden Dragon")).toBeDefined()
  })

  it("triggers togglePin when clicking the card itself", () => {
    render(
      <TutorialProvider>
        <LibraryTab {...defaultProps} />
      </TutorialProvider>
    )
    const cardElement = screen.getByText("Golden Dragon").closest(".group")
    expect(cardElement).toBeDefined()

    fireEvent.click(cardElement!)
    expect(mockTogglePin).toHaveBeenCalledWith(mockCards[0], expect.any(Object))
  })

  it("triggers onOpenDetailCard when clicking the edit button on the card", () => {
    render(
      <TutorialProvider>
        <LibraryTab {...defaultProps} />
      </TutorialProvider>
    )
    const editBtn = screen.getByTestId("edit-card-button")
    expect(editBtn).toBeDefined()

    fireEvent.click(editBtn)
    expect(mockOpenDetailCard).toHaveBeenCalledWith(mockCards[0])
    expect(mockTogglePin).not.toHaveBeenCalled()
  })

  it("opens ShareCardModal when clicking the share button on the card", () => {
    render(
      <TutorialProvider>
        <LibraryTab {...defaultProps} />
      </TutorialProvider>
    )
    const shareBtn = screen.getByTestId("share-card-button")
    expect(shareBtn).toBeDefined()

    // Initially modal is not in document
    expect(screen.queryByText("スタイルカードの共有")).toBeNull()

    // Click share button
    fireEvent.click(shareBtn)

    // Modal should now be in the document
    expect(screen.getByText("スタイルカードの共有")).toBeDefined()
    expect(screen.getByText("専用画像ページを開く")).toBeDefined()
  })

  it("renders color filters and handles color filter click", () => {
    const mockSetColorFilter = vi.fn()
    vi.mocked(useLibrary).mockReturnValue({
      styleCards: mockCards,
      handleCardClick: vi.fn(),
      togglePin: mockTogglePin,
      searchTag: "",
      setSearchTag: vi.fn(),
      rarityFilter: "All",
      setRarityFilter: vi.fn(),
      categoryFilter: "All",
      setCategoryFilter: vi.fn(),
      colorFilter: "All",
      setColorFilter: mockSetColorFilter,
      sortBy: "newest",
      setSortBy: vi.fn(),
      allSrefs: [],
      categories: [],
      allCards: mockCards,
      hasMore: false,
      loadMore: vi.fn(),
      totalMatchedCount: 1
    })

    render(
      <TutorialProvider>
        <LibraryTab {...defaultProps} />
      </TutorialProvider>
    )

    expect(screen.getByText("カラー:")).toBeDefined()

    const redButton = screen.getByTitle("レッド")
    expect(redButton).toBeDefined()
    fireEvent.click(redButton)
    expect(mockSetColorFilter).toHaveBeenCalledWith("Red")
  })

  it("renders empty state when there are no cards in the library", () => {
    vi.mocked(useLibrary).mockReturnValue({
      styleCards: [],
      handleCardClick: vi.fn(),
      togglePin: mockTogglePin,
      searchTag: "",
      setSearchTag: vi.fn(),
      rarityFilter: "All",
      setRarityFilter: vi.fn(),
      categoryFilter: "All",
      setCategoryFilter: vi.fn(),
      colorFilter: "All",
      setColorFilter: vi.fn(),
      sortBy: "newest",
      setSortBy: vi.fn(),
      allSrefs: [],
      categories: [],
      allCards: [],
      hasMore: false,
      loadMore: vi.fn(),
      totalMatchedCount: 0
    })

    render(
      <TutorialProvider>
        <LibraryTab {...defaultProps} />
      </TutorialProvider>
    )
    expect(screen.getByText("スタイルカードがありません")).toBeDefined()
    expect(
      screen.getByText(/Historyタブから画像をドラッグ＆ドロップ/)
    ).toBeDefined()
  })

  it("renders empty state when search filters return no cards and allows clearing filters", () => {
    const mockSetSearchTag = vi.fn()
    const mockSetRarityFilter = vi.fn()
    const mockSetCategoryFilter = vi.fn()

    vi.mocked(useLibrary).mockReturnValue({
      styleCards: [],
      handleCardClick: vi.fn(),
      togglePin: mockTogglePin,
      searchTag: "NonExistentTag",
      setSearchTag: mockSetSearchTag,
      rarityFilter: "All",
      setRarityFilter: mockSetRarityFilter,
      categoryFilter: "All",
      setCategoryFilter: mockSetCategoryFilter,
      colorFilter: "All",
      setColorFilter: vi.fn(),
      sortBy: "newest",
      setSortBy: vi.fn(),
      allSrefs: [],
      categories: [],
      allCards: mockCards,
      hasMore: false,
      loadMore: vi.fn(),
      totalMatchedCount: 0
    })

    render(
      <TutorialProvider>
        <LibraryTab {...defaultProps} />
      </TutorialProvider>
    )
    expect(screen.getByText("カードが見つかりません")).toBeDefined()
    expect(
      screen.getByText(/検索キーワードやフィルターの条件を変更するか/)
    ).toBeDefined()

    const clearButton = screen.getByRole("button", {
      name: "フィルターをクリア"
    })
    expect(clearButton).toBeDefined()
    fireEvent.click(clearButton)

    expect(mockSetSearchTag).toHaveBeenCalledWith("")
    expect(mockSetRarityFilter).toHaveBeenCalledWith("All")
    expect(mockSetCategoryFilter).toHaveBeenCalledWith("All")
  })

  it("renders Show More button when hasMore is true and triggers loadMore on click", () => {
    const mockLoadMore = vi.fn()
    vi.mocked(useLibrary).mockReturnValue({
      styleCards: mockCards,
      handleCardClick: vi.fn(),
      togglePin: mockTogglePin,
      searchTag: "",
      setSearchTag: vi.fn(),
      rarityFilter: "All",
      setRarityFilter: vi.fn(),
      categoryFilter: "All",
      setCategoryFilter: vi.fn(),
      colorFilter: "All",
      setColorFilter: vi.fn(),
      sortBy: "newest",
      setSortBy: vi.fn(),
      allSrefs: [],
      categories: [],
      allCards: mockCards,
      hasMore: true,
      loadMore: mockLoadMore,
      totalMatchedCount: 1
    })

    render(
      <TutorialProvider>
        <LibraryTab {...defaultProps} />
      </TutorialProvider>
    )

    const showMoreBtn = screen.getByTestId("show-more-button")
    expect(showMoreBtn).toBeDefined()
    expect(showMoreBtn.textContent).toContain("もっと見る")

    fireEvent.click(showMoreBtn)
    expect(mockLoadMore).toHaveBeenCalled()
  })
})
