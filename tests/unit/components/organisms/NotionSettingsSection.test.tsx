import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { NotionSettingsSection } from "../../../../src/features/settings/components/NotionSettingsSection"
import * as notionClient from "../../../../src/lib/notion/client"

let mockIsPremium = true
const mockOpenUpgradeModal = vi.fn()

vi.mock("../../../../src/contexts/LicenseContext", () => ({
  useLicense: () => ({
    isPremium: mockIsPremium,
    openUpgradeModal: mockOpenUpgradeModal
  })
}))

vi.mock("../../../../src/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      lang: "ja"
    }
  })
}))

describe("NotionSettingsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsPremium = true
  })

  it("loads and displays saved credentials on mount", async () => {
    vi.spyOn(notionClient, "getNotionCredentials").mockResolvedValue({
      apiKey: "secret_saved_api_key",
      databaseId: "saved_database_id"
    })

    render(<NotionSettingsSection />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Notion API/)).toHaveValue(
        "secret_saved_api_key"
      )
      expect(screen.getByLabelText(/データベース ID/)).toHaveValue(
        "saved_database_id"
      )
    })
  })

  it("handles non-premium state by disabling inputs and showing upgrade banner", () => {
    mockIsPremium = false
    vi.spyOn(notionClient, "getNotionCredentials").mockResolvedValue(null)

    render(<NotionSettingsSection />)

    // Check alert banner is shown
    expect(
      screen.getByText(/Premium Pro ライセンスが必要です/)
    ).toBeInTheDocument()

    // Inputs should be disabled
    const apiKeyInput = screen.getByLabelText(/Notion API/)
    const dbIdInput = screen.getByLabelText(/データベース ID/)
    const testBtn = screen.getByRole("button", { name: "接続確認テスト" })
    const saveBtn = screen.getByRole("button", { name: "設定を保存" })

    expect(apiKeyInput).toBeDisabled()
    expect(dbIdInput).toBeDisabled()
    expect(testBtn).toBeDisabled()
    expect(saveBtn).toBeDisabled()

    // Click upgrade button
    const upgradeBtn = screen.getByRole("button", { name: "アップグレード" })
    fireEvent.click(upgradeBtn)
    expect(mockOpenUpgradeModal).toHaveBeenCalledWith("notionSync")
  })

  it("allows testing connection and shows success feedback", async () => {
    vi.spyOn(notionClient, "getNotionCredentials").mockResolvedValue(null)
    const validateSpy = vi
      .spyOn(notionClient, "validateNotionConnection")
      .mockResolvedValue(true)

    render(<NotionSettingsSection />)

    const apiKeyInput = screen.getByLabelText(/Notion API/)
    const dbIdInput = screen.getByLabelText(/データベース ID/)
    const testBtn = screen.getByRole("button", { name: "接続確認テスト" })

    fireEvent.change(apiKeyInput, { target: { value: "secret_new_key" } })
    fireEvent.change(dbIdInput, { target: { value: "new_db_id" } })

    fireEvent.click(testBtn)

    await waitFor(() => {
      expect(validateSpy).toHaveBeenCalledWith({
        apiKey: "secret_new_key",
        databaseId: "new_db_id"
      })
      expect(screen.getByText(/接続確認に成功しました/)).toBeInTheDocument()
    })
  })

  it("allows testing connection and shows error feedback on failure", async () => {
    vi.spyOn(notionClient, "getNotionCredentials").mockResolvedValue(null)
    const validateSpy = vi
      .spyOn(notionClient, "validateNotionConnection")
      .mockResolvedValue(false)

    render(<NotionSettingsSection />)

    const apiKeyInput = screen.getByLabelText(/Notion API/)
    const dbIdInput = screen.getByLabelText(/データベース ID/)
    const testBtn = screen.getByRole("button", { name: "接続確認テスト" })

    fireEvent.change(apiKeyInput, { target: { value: "secret_invalid_key" } })
    fireEvent.change(dbIdInput, { target: { value: "invalid_db_id" } })

    fireEvent.click(testBtn)

    await waitFor(() => {
      expect(validateSpy).toHaveBeenCalled()
      expect(screen.getByText(/接続に失敗しました/)).toBeInTheDocument()
    })
  })

  it("saves settings when Save button is clicked", async () => {
    vi.spyOn(notionClient, "getNotionCredentials").mockResolvedValue(null)
    const saveSpy = vi
      .spyOn(notionClient, "saveNotionCredentials")
      .mockResolvedValue(undefined)

    render(<NotionSettingsSection />)

    const apiKeyInput = screen.getByLabelText(/Notion API/)
    const dbIdInput = screen.getByLabelText(/データベース ID/)
    const saveBtn = screen.getByRole("button", { name: "設定を保存" })

    fireEvent.change(apiKeyInput, { target: { value: "secret_input_key" } })
    fireEvent.change(dbIdInput, { target: { value: "input_db_id" } })

    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith({
        apiKey: "secret_input_key",
        databaseId: "input_db_id"
      })
      expect(screen.getByText(/連携設定を保存しました/)).toBeInTheDocument()
    })
  })
})
