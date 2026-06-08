import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LanguageProvider } from "../../contexts/LanguageContext"
import { i18n } from "../../lib/i18n"
import { ConnectionAlert } from "./ConnectionAlert"

describe("ConnectionAlert Component", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  const renderWithLanguage = (ui: React.ReactElement, lang: "en" | "ja") => {
    localStorage.setItem("style-atelier-language", lang)
    i18n.changeLanguage(lang)
    return render(<LanguageProvider>{ui}</LanguageProvider>)
  }

  describe("English rendering", () => {
    it("renders disconnected alert in English", () => {
      renderWithLanguage(
        <ConnectionAlert type="disconnected" onRetry={() => {}} onDismiss={() => {}} />,
        "en"
      )
      expect(screen.getByText("Connection Lost")).toBeDefined()
      expect(
        screen.getByText(
          "The extension has lost connection to the page. This usually happens after an update or prolonged inactivity."
        )
      ).toBeDefined()
      expect(screen.getByRole("button", { name: "Reload Page" })).toBeDefined()
    })

    it("renders no_input alert in English", () => {
      renderWithLanguage(
        <ConnectionAlert type="no_input" onRetry={() => {}} onDismiss={() => {}} />,
        "en"
      )
      expect(screen.getByText("Input Not Found")).toBeDefined()
      expect(
        screen.getByText(
          /Could not find the chat input. Please ensure you are on the "Create" page or the Midjourney gallery details view./
        )
      ).toBeDefined()
      expect(screen.getByRole("button", { name: "Retry Connection" })).toBeDefined()
    })
  })

  describe("Japanese rendering", () => {
    it("renders disconnected alert in Japanese", () => {
      renderWithLanguage(
        <ConnectionAlert type="disconnected" onRetry={() => {}} onDismiss={() => {}} />,
        "ja"
      )
      expect(screen.getByText("接続が切断されました")).toBeDefined()
      expect(
        screen.getByText(
          "ページとの接続が失われました。これは拡張機能のアップデートや、長時間の無操作状態の後に発生することがあります。"
        )
      ).toBeDefined()
      expect(screen.getByRole("button", { name: "ページをリロード" })).toBeDefined()
    })

    it("renders no_input alert in Japanese", () => {
      renderWithLanguage(
        <ConnectionAlert type="no_input" onRetry={() => {}} onDismiss={() => {}} />,
        "ja"
      )
      expect(screen.getByText("入力エリアが見つかりません")).toBeDefined()
      expect(
        screen.getByText(
          "チャット入力エリアが見つかりませんでした。現在「Create」ページ、またはMidjourneyギャラリーの詳細表示画面を開いていることを確認してください。"
        )
      ).toBeDefined()
      expect(screen.getByRole("button", { name: "接続を再試行" })).toBeDefined()
    })
  })



  describe("Actions", () => {
    it("calls chrome.tabs.reload and onDismiss when clicking Reload Page", () => {
      const onDismiss = vi.fn()
      renderWithLanguage(
        <ConnectionAlert type="disconnected" onRetry={() => {}} onDismiss={onDismiss} />,
        "en"
      )

      const button = screen.getByRole("button", { name: "Reload Page" })
      fireEvent.click(button)

      expect(chrome.tabs.reload).toHaveBeenCalled()
      expect(onDismiss).toHaveBeenCalled()
    })

    it("calls onRetry when clicking Retry Connection", () => {
      const onRetry = vi.fn()
      renderWithLanguage(
        <ConnectionAlert type="no_input" onRetry={onRetry} onDismiss={() => {}} />,
        "en"
      )

      const button = screen.getByRole("button", { name: "Retry Connection" })
      fireEvent.click(button)

      expect(onRetry).toHaveBeenCalled()
    })

    it("calls onDismiss when clicking dismiss button", () => {
      const onDismiss = vi.fn()
      renderWithLanguage(
        <ConnectionAlert type="disconnected" onRetry={() => {}} onDismiss={onDismiss} />,
        "en"
      )

      const dismissButton = screen.getByRole("button", { name: "Dismiss" })
      fireEvent.click(dismissButton)

      expect(onDismiss).toHaveBeenCalled()
    })
  })
})
