import { act, renderHook } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LanguageProvider } from "../contexts/LanguageContext"
import { exportDatabase, importDatabase } from "../lib/backup-manager"
import { useLocalBackup } from "./useLocalBackup"

// Mock backup-manager
vi.mock("../lib/backup-manager", () => ({
  exportDatabase: vi.fn(),
  importDatabase: vi.fn()
}))

// Mock ConfirmContext
vi.mock("../contexts/ConfirmContext", () => ({
  ConfirmProvider: ({ children }: any) => children,
  useConfirm: () => vi.fn().mockResolvedValue(true)
}))

describe("useLocalBackup", () => {
  const addLog = vi.fn()
  const checkStorage = vi.fn()
  const showStatus = vi.fn()
  const fileInputRef = { current: null } as any

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <LanguageProvider>{children}</LanguageProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock")
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
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

  describe("handleLocalExport", () => {
    it("should export database successfully", async () => {
      vi.mocked(exportDatabase).mockResolvedValue('{"cards":[]}')
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

      await act(async () => {
        await result.current.handleLocalExport()
      })

      expect(exportDatabase).toHaveBeenCalled()
      expect(addLog).toHaveBeenCalledWith(
        "Database exported to local JSON file successfully."
      )
      expect(showStatus).toHaveBeenCalledWith(expect.any(String), "success")
    })

    it("should handle export error", async () => {
      vi.mocked(exportDatabase).mockRejectedValue(new Error("Export failed"))
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

      await act(async () => {
        await result.current.handleLocalExport()
      })

      expect(addLog).toHaveBeenCalledWith("Export failed: Export failed")
      expect(showStatus).toHaveBeenCalledWith(expect.any(String), "error")
    })
  })

  describe("handleLocalImport", () => {
    it("should do nothing if no file is selected", async () => {
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

      const event = { target: { files: null } } as any

      await act(async () => {
        await result.current.handleLocalImport(event)
      })

      expect(importDatabase).not.toHaveBeenCalled()
    })

    it("should read and import file successfully", async () => {
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

      const file = new File(['{"cards":[]}'], "backup.json", {
        type: "application/json"
      })
      const event = { target: { files: [file], value: "backup.json" } } as any

      // Mock FileReader
      const mockFileReader = {
        readAsText: vi.fn().mockImplementation(function (this: any) {
          if (this.onload) {
            this.onload({ target: { result: '{"cards":[]}' } })
          }
        }),
        onload: null,
        onerror: null
      }
      vi.stubGlobal(
        "FileReader",
        vi.fn().mockImplementation(function () {
          return mockFileReader
        })
      )

      await act(async () => {
        await result.current.handleLocalImport(event)
      })

      expect(importDatabase).toHaveBeenCalledWith('{"cards":[]}', "merge")
      expect(addLog).toHaveBeenCalledWith(
        "Database restored from local JSON file successfully."
      )
      expect(showStatus).toHaveBeenCalledWith(expect.any(String), "success")
      expect(checkStorage).toHaveBeenCalled()
      expect(event.target.value).toBe("")
    })

    it("should handle file reader error", async () => {
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

      const file = new File([""], "backup.json", { type: "application/json" })
      const event = { target: { files: [file], value: "backup.json" } } as any

      const mockFileReader = {
        readAsText: vi.fn().mockImplementation(function (this: any) {
          if (this.onerror) {
            this.onerror()
          }
        }),
        onload: null,
        onerror: null
      }
      vi.stubGlobal(
        "FileReader",
        vi.fn().mockImplementation(function () {
          return mockFileReader
        })
      )

      await act(async () => {
        await result.current.handleLocalImport(event)
      })

      expect(addLog).toHaveBeenCalledWith("Import failed: File reading error.")
      expect(showStatus).toHaveBeenCalledWith(expect.any(String), "error")
      expect(event.target.value).toBe("")
    })
  })
})
