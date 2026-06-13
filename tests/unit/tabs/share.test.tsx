import { exportCardAsImage, renderCardToCanvas } from "@/lib/export-utils"
import { getStyleCardById } from "@/lib/style-card-store"
import SharePage from "@/tabs/share"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock style-card-store
vi.mock("@/lib/style-card-store", () => ({
  getStyleCardById: vi.fn()
}))

// Mock export-utils
vi.mock("@/lib/export-utils", () => ({
  renderCardToCanvas: vi.fn(),
  exportCardAsImage: vi.fn()
}))

describe("SharePage i18n and functionality", () => {
  const mockCard = {
    id: "card-123",
    name: "Cyberpunk Samurai",
    tier: "LEGENDARY",
    category: "Sci-Fi",
    promptSegments: [
      { value: "/imagine prompt:" },
      { value: "cyberpunk samurai --ar 16:9" }
    ]
  }

  const originalNavigator = window.navigator
  const originalGlobalNavigator = (global as any).navigator
  let capturedErrors: any[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    capturedErrors = []

    // Capture console errors
    vi.spyOn(console, "error").mockImplementation((...args) => {
      capturedErrors.push(
        args.map((arg) => (arg instanceof Error ? arg.message : String(arg)))
      )
    })

    // Mock window.location
    delete (window as any).location
    window.location = {
      search: "?id=card-123"
    } as any

    // Mock HTMLCanvasElement.toDataURL and toBlob
    const mockCanvas = {
      toDataURL: vi.fn().mockReturnValue("data:image/png;base64,mockImage"),
      toBlob: vi.fn().mockImplementation((callback) => {
        callback(new Blob(["mock-blob-data"], { type: "image/png" }))
      })
    }
    vi.mocked(renderCardToCanvas).mockResolvedValue(mockCanvas as any)

    // Mock window.close
    window.close = vi.fn()

    // Mock ClipboardItem (using standard function so it can be instantiated with 'new')
    const mockClipboardItem = function (this: any, data: any) {
      this.data = data
    }
    ;(window as any).ClipboardItem = mockClipboardItem
    ;(global as any).ClipboardItem = mockClipboardItem
  })

  afterEach(() => {
    Object.defineProperty(window, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true
    })
    Object.defineProperty(global, "navigator", {
      value: originalGlobalNavigator,
      configurable: true,
      writable: true
    })
    vi.restoreAllMocks()
  })

  const setLanguageAndClipboard = (lang: string) => {
    const mockClipboard = {
      write: vi.fn().mockResolvedValue(undefined)
    }
    const mockNav = {
      language: lang,
      clipboard: mockClipboard,
      userAgent: "mock-agent"
    }

    Object.defineProperty(window, "navigator", {
      value: mockNav,
      configurable: true,
      writable: true
    })
    Object.defineProperty(global, "navigator", {
      value: mockNav,
      configurable: true,
      writable: true
    })

    return mockClipboard
  }

  it("renders Japanese strings when navigator.language is ja", async () => {
    setLanguageAndClipboard("ja-JP")
    vi.mocked(getStyleCardById).mockResolvedValue(mockCard as any)

    render(<SharePage />)

    // Check loading text in Japanese
    expect(screen.getByText("スタイルカードを読み込み中...")).toBeDefined()

    // Wait for card to load
    await waitFor(() => {
      expect(screen.getByText("Cyberpunk Samurai")).toBeDefined()
    })

    // Check Japanese strings
    expect(screen.getByText("スタイルの詳細")).toBeDefined()
    expect(screen.getByText("カテゴリ: Sci-Fi")).toBeDefined()
    expect(screen.getByText("共有オプション")).toBeDefined()
    expect(screen.getByText("画像をコピー")).toBeDefined()
    expect(screen.getByText("PNGをダウンロード")).toBeDefined()
    expect(screen.getByText(/ヒント: コピーしたカード画像は/)).toBeDefined()
    expect(screen.getByText("スタイルの仕様")).toBeDefined()
    expect(screen.getByText("プロンプトセグメントのプレビュー")).toBeDefined()
    expect(screen.getByText("生成カードプレビュー")).toBeDefined()
  })

  it("renders English strings when navigator.language is en", async () => {
    setLanguageAndClipboard("en-US")
    vi.mocked(getStyleCardById).mockResolvedValue(mockCard as any)

    render(<SharePage />)

    // Check loading text in English
    expect(screen.getByText("Loading Style Card...")).toBeDefined()

    // Wait for card to load
    await waitFor(() => {
      expect(screen.getByText("Cyberpunk Samurai")).toBeDefined()
    })

    // Check English strings
    expect(screen.getByText("Style Details")).toBeDefined()
    expect(screen.getByText("Category: Sci-Fi")).toBeDefined()
    expect(screen.getByText("Sharing Options")).toBeDefined()
    expect(screen.getByText("Copy Image")).toBeDefined()
    expect(screen.getByText("Download PNG")).toBeDefined()
    expect(
      screen.getByText(/Tip: You can paste the copied card image/)
    ).toBeDefined()
    expect(screen.getByText("Style Specifications")).toBeDefined()
    expect(screen.getByText("Prompt Segment Preview")).toBeDefined()
    expect(screen.getByText("Generated Card View")).toBeDefined()
  })

  it("displays Japanese error when load fails and navigator.language is ja", async () => {
    setLanguageAndClipboard("ja-JP")
    vi.mocked(getStyleCardById).mockResolvedValue(null) // style card not found

    render(<SharePage />)

    await waitFor(() => {
      expect(screen.getByText("カード読み込みエラー")).toBeDefined()
      expect(
        screen.getByText("データベース内にスタイルカードが見つかりません。")
      ).toBeDefined()
      expect(screen.getByText("ウィンドウを閉じる")).toBeDefined()
    })
  })

  it("displays English error when load fails and navigator.language is en", async () => {
    setLanguageAndClipboard("en-US")
    vi.mocked(getStyleCardById).mockResolvedValue(null) // style card not found

    render(<SharePage />)

    await waitFor(() => {
      expect(screen.getByText("Error Loading Card")).toBeDefined()
      expect(
        screen.getByText("Style card not found in database.")
      ).toBeDefined()
      expect(screen.getByText("Close Window")).toBeDefined()
    })
  })

  it("handles copy to clipboard and shows success message in Japanese", async () => {
    const mockClipboard = setLanguageAndClipboard("ja-JP")
    vi.mocked(getStyleCardById).mockResolvedValue(mockCard as any)

    render(<SharePage />)

    await waitFor(() => {
      expect(screen.getByText("Cyberpunk Samurai")).toBeDefined()
    })

    const copyBtn = screen.getByText("画像をコピー")
    fireEvent.click(copyBtn)

    await waitFor(() => {
      if (capturedErrors.length > 0) {
        throw new Error(
          "Captured Errors: " +
            capturedErrors.map((e) => e.join(" | ")).join("\n")
        )
      }
      expect(mockClipboard.write).toHaveBeenCalled()
      expect(
        screen.getByText(
          "カード画像をクリップボードにコピーしました！DiscordやX等に貼り付けられます。"
        )
      ).toBeDefined()
    })
  })

  it("handles copy to clipboard and shows success message in English", async () => {
    const mockClipboard = setLanguageAndClipboard("en-US")
    vi.mocked(getStyleCardById).mockResolvedValue(mockCard as any)

    render(<SharePage />)

    await waitFor(() => {
      expect(screen.getByText("Cyberpunk Samurai")).toBeDefined()
    })

    const copyBtn = screen.getByText("Copy Image")
    fireEvent.click(copyBtn)

    await waitFor(() => {
      if (capturedErrors.length > 0) {
        throw new Error(
          "Captured Errors: " +
            capturedErrors.map((e) => e.join(" | ")).join("\n")
        )
      }
      expect(mockClipboard.write).toHaveBeenCalled()
      expect(
        screen.getByText(
          "Copied card image to clipboard! You can now paste it into Discord, X, etc."
        )
      ).toBeDefined()
    })
  })

  it("handles download PNG in Japanese", async () => {
    setLanguageAndClipboard("ja-JP")
    vi.mocked(getStyleCardById).mockResolvedValue(mockCard as any)
    vi.mocked(exportCardAsImage).mockResolvedValue(undefined)

    render(<SharePage />)

    await waitFor(() => {
      expect(screen.getByText("Cyberpunk Samurai")).toBeDefined()
    })

    const downloadBtn = screen.getByText("PNGをダウンロード")
    fireEvent.click(downloadBtn)

    await waitFor(() => {
      expect(exportCardAsImage).toHaveBeenCalledWith(
        mockCard,
        expect.any(Object)
      )
      expect(screen.getByText("ダウンロードを開始しました！")).toBeDefined()
    })
  })

  it("handles download PNG in English", async () => {
    setLanguageAndClipboard("en-US")
    vi.mocked(getStyleCardById).mockResolvedValue(mockCard as any)
    vi.mocked(exportCardAsImage).mockResolvedValue(undefined)

    render(<SharePage />)

    await waitFor(() => {
      expect(screen.getByText("Cyberpunk Samurai")).toBeDefined()
    })

    const downloadBtn = screen.getByText("Download PNG")
    fireEvent.click(downloadBtn)

    await waitFor(() => {
      expect(exportCardAsImage).toHaveBeenCalledWith(
        mockCard,
        expect.any(Object)
      )
      expect(screen.getByText("Download started successfully!")).toBeDefined()
    })
  })
})
