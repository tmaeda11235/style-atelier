import { LibraryTab } from "@/components/organisms/LibraryTab"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { SettingsProvider } from "@/contexts/SettingsContext"
import { TutorialProvider } from "@/contexts/TutorialContext"
import { useLibrary } from "@/hooks/useLibrary"
import type { StyleCard } from "@/lib/db-schema"
import { fireEvent, screen, render as tlRender } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const render = (ui: React.ReactElement, options?: any) => {
  return tlRender(
    <LanguageProvider>
      <SettingsProvider>{ui}</SettingsProvider>
    </LanguageProvider>,
    options
  )
}

vi.mock("@/hooks/useLibrary", () => ({
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

const defaultMockReturnValue = {
  styleCards: mockCards,
  handleCardClick: vi.fn(),
  togglePin: vi.fn(),
  searchTag: "",
  setSearchTag: vi.fn(),
  rarityFilter: "All",
  setRarityFilter: vi.fn(),
  modelFilter: "All",
  setModelFilter: vi.fn(),
  categoryFilter: "All",
  setCategoryFilter: vi.fn(),
  colorFilter: "All",
  setColorFilter: vi.fn(),
  colorHueFilter: null as [number, number] | null,
  setColorHueFilter: vi.fn(),
  sortBy: "newest",
  setSortBy: vi.fn(),
  allSrefs: [],
  categories: [],
  allCards: mockCards,
  hasMore: false,
  loadMore: vi.fn(),
  totalMatchedCount: 1,
  currentFolderId: null as string | null,
  setCurrentFolderId: vi.fn(),
  breadcrumbs: [{ id: null as string | null, name: "Home" }],
  currentSubfolders: [] as any[],
  moveCardToCategory: vi.fn()
}

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
      ...defaultMockReturnValue,
      togglePin: mockTogglePin
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
      ...defaultMockReturnValue,
      togglePin: mockTogglePin,
      setColorFilter: mockSetColorFilter
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
      ...defaultMockReturnValue,
      styleCards: [],
      allCards: [],
      togglePin: mockTogglePin,
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
    const mockSetModelFilter = vi.fn()
    const mockSetCategoryFilter = vi.fn()

    vi.mocked(useLibrary).mockReturnValue({
      ...defaultMockReturnValue,
      styleCards: [],
      searchTag: "NonExistentTag",
      setSearchTag: mockSetSearchTag,
      rarityFilter: "All",
      setRarityFilter: mockSetRarityFilter,
      modelFilter: "All",
      setModelFilter: mockSetModelFilter,
      categoryFilter: "All",
      setCategoryFilter: mockSetCategoryFilter,
      togglePin: mockTogglePin,
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
    expect(mockSetModelFilter).toHaveBeenCalledWith("All")
    expect(mockSetCategoryFilter).toHaveBeenCalledWith("All")
  })

  it("renders Show More button when hasMore is true and triggers loadMore on click", () => {
    const mockLoadMore = vi.fn()
    vi.mocked(useLibrary).mockReturnValue({
      ...defaultMockReturnValue,
      hasMore: true,
      loadMore: mockLoadMore,
      togglePin: mockTogglePin
    })

    render(
      <TutorialProvider>
        <LibraryTab {...defaultProps} />
      </TutorialProvider>
    )

    const showMoreBtn = screen.getByTestId("show-more-button")
    expect(showMoreBtn).toBeDefined()
    expect(showMoreBtn.textContent).toContain("さらに読み込む")

    fireEvent.click(showMoreBtn)
    expect(mockLoadMore).toHaveBeenCalled()
  })

  it("renders model version filters and handles model filter click", () => {
    const mockSetModelFilter = vi.fn()
    vi.mocked(useLibrary).mockReturnValue({
      ...defaultMockReturnValue,
      togglePin: mockTogglePin,
      modelFilter: "All",
      setModelFilter: mockSetModelFilter
    })

    render(
      <TutorialProvider>
        <LibraryTab {...defaultProps} />
      </TutorialProvider>
    )

    expect(screen.getByText("モデル:")).toBeDefined()

    const v6Button = screen.getByTestId("model-filter-V6")
    expect(v6Button).toBeDefined()
    fireEvent.click(v6Button)
    expect(mockSetModelFilter).toHaveBeenCalledWith("V6")
  })

  it("forces high contrast text style when current category has coverImageUrl", () => {
    const mockCategory = {
      id: "cat-1",
      name: "Custom Category",
      coverImageUrl: "data:image/png;base64,cover",
      theme: ""
    }
    vi.mocked(useLibrary).mockReturnValue({
      ...defaultMockReturnValue,
      categories: [mockCategory],
      currentFolderId: "cat-1",
      togglePin: mockTogglePin
    })

    render(
      <TutorialProvider>
        <LibraryTab {...defaultProps} />
      </TutorialProvider>
    )

    const titleElement = screen.getByRole("heading", {
      level: 2,
      name: "Custom Category"
    })
    expect(titleElement.className).toContain("text-white")
    expect(titleElement.className).toContain("drop-shadow")

    const subtitleElement = screen.getByText("binder")
    expect(subtitleElement.className).toContain("text-white/70")
    expect(subtitleElement.className).not.toContain("opacity-60")
  })
})
