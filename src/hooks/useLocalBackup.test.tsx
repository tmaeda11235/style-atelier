import { renderHook } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ConfirmProvider } from "../contexts/ConfirmContext"
import { LanguageProvider } from "../contexts/LanguageContext"
import { useLocalBackup } from "./useLocalBackup"

// Mock google-drive library
vi.mock("../lib/google-drive", () => ({
  exportDatabase: vi.fn(),
  importDatabase: vi.fn()
}))

describe("useLocalBackup", () => {
  const addLog = vi.fn()
  const checkStorage = vi.fn()
  const showStatus = vi.fn()
  const fileInputRef = { current: null } as any

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <LanguageProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </LanguageProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should initialize hooks properly", () => {
    const { result } = renderHook(
      () =>
        useLocalBackup({
          addLog,
          checkStorage,
          showStatus,
          fileInputRef
        }),
      { wrapper }
    )
    expect(result.current.handleLocalExport).toBeDefined()
    expect(result.current.handleLocalImport).toBeDefined()
  })
})
