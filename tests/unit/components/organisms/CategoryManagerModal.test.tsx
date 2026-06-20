import { LanguageProvider } from "@/contexts/LanguageContext"
import { CategoryManagerModal } from "@/features/category-manager/components/CategoryManagerModal"
import { db } from "@/lib/db"
import {
  fireEvent,
  screen,
  render as tlRender,
  waitFor
} from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/contexts/ConfirmContext", () => ({
  useConfirm: () => (options: any) =>
    Promise.resolve(window.confirm(options.message))
}))

// Mock dexie-react-hooks
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any) => fn()
}))

const render = (ui: React.ReactElement, options?: any) => {
  return tlRender(<LanguageProvider>{ui}</LanguageProvider>, options)
}

describe("CategoryManagerModal", () => {
  const handleClose = vi.fn()
  const handleAddLog = vi.fn()

  let mockCategories: any[] = []
  let mockStyleCards: any[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    Object.defineProperty(window.navigator, "language", {
      value: "en-US",
      configurable: true,
      writable: true
    })

    mockCategories = [
      { id: "style", name: "Style", iconEmoji: "🎨" },
      {
        id: "cyberpunk",
        name: "Cyberpunk",
        iconEmoji: "🛸",
        createdAt: Date.now()
      }
    ]
    mockStyleCards = [
      {
        id: "card-1",
        name: "Cyber Cat",
        thumbnailData: "data:image/png;base64,123",
        isVariable: false,
        category: "cyberpunk"
      }
    ]

    vi.mocked(db.getAllCategories).mockImplementation(
      () => mockCategories as any
    )
    vi.mocked(db.getCategory).mockImplementation((id: string) =>
      Promise.resolve(mockCategories.find((c) => c.id === id))
    )
    vi.mocked(db.addCategory).mockImplementation((cat: any) => {
      mockCategories.push(cat)
      return Promise.resolve(cat.id)
    })
    vi.mocked(db.updateCategory).mockImplementation(
      (id: string, changes: any) => {
        mockCategories = mockCategories.map((c) =>
          c.id === id ? { ...c, ...changes } : c
        )
        return Promise.resolve(1)
      }
    )
    vi.mocked(db.deleteCategory).mockImplementation((id: string) => {
      mockCategories = mockCategories.filter((c) => c.id !== id)
      mockStyleCards.forEach((c) => {
        if (c.category === id) {
          delete c.category
        }
      })
      return Promise.resolve()
    })

    vi.mocked(db.getAllCards).mockImplementation(() => mockStyleCards as any)
  })

  it("renders correctly with default state tabs", () => {
    render(<CategoryManagerModal onClose={handleClose} addLog={handleAddLog} />)

    expect(screen.getByText("Add Category")).toBeDefined()
    expect(screen.getByText("Manage Categories")).toBeDefined()
    expect(screen.getByPlaceholderText("e.g. Cyberpunk, Retro")).toBeDefined()
    expect(screen.getByText("Create Category")).toBeDefined()
  })

  it("switches to Manage tab and shows custom and default categories", async () => {
    render(<CategoryManagerModal onClose={handleClose} addLog={handleAddLog} />)

    const manageTab = screen.getByText("Manage Categories")
    fireEvent.click(manageTab)

    expect(screen.getByText("Style")).toBeDefined()
    expect(screen.getByText("System Default")).toBeDefined()
    expect(screen.getByText("Cyberpunk")).toBeDefined()

    // Default categories do not have edit/delete buttons
    // We check that only one edit button exists (for the custom cyberpunk category)
    const editButtons = screen.queryAllByTitle("Edit Category")
    expect(editButtons.length).toBe(1)

    const deleteButtons = screen.queryAllByTitle("Delete Category")
    expect(deleteButtons.length).toBe(1)
  })

  it("allows creating a new custom category", async () => {
    render(<CategoryManagerModal onClose={handleClose} addLog={handleAddLog} />)

    const nameInput = screen.getByPlaceholderText("e.g. Cyberpunk, Retro")
    fireEvent.change(nameInput, { target: { value: "Retro Space" } })

    const emojiInput = screen.getByPlaceholderText("e.g. 🎨, 🛸")
    fireEvent.change(emojiInput, { target: { value: "🚀" } })

    const submitBtn = screen.getByText("Create Category")
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(db.addCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "retro-space",
          name: "Retro Space",
          iconEmoji: "🚀"
        })
      )
    })

    expect(handleAddLog).toHaveBeenCalledWith('Created category "Retro Space"')
  })

  it("allows creating a new category with a complex emoji (surrogate pairs and ZWJ)", async () => {
    render(<CategoryManagerModal onClose={handleClose} addLog={handleAddLog} />)

    const nameInput = screen.getByPlaceholderText("e.g. Cyberpunk, Retro")
    fireEvent.change(nameInput, { target: { value: "Mages" } })

    const emojiInput = screen.getByPlaceholderText("e.g. 🎨, 🛸")
    // Inputting a complex emoji "🧙‍♂️" (man mage) which has multiple code units/points
    fireEvent.change(emojiInput, { target: { value: "🧙‍♂️" } })

    const submitBtn = screen.getByText("Create Category")
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(db.addCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "mages",
          name: "Mages",
          iconEmoji: "🧙‍♂️"
        })
      )
    })

    expect(handleAddLog).toHaveBeenCalledWith('Created category "Mages"')
  })

  it("trims the input emoji to the first grapheme cluster", async () => {
    render(<CategoryManagerModal onClose={handleClose} addLog={handleAddLog} />)

    const nameInput = screen.getByPlaceholderText("e.g. Cyberpunk, Retro")
    fireEvent.change(nameInput, { target: { value: "Mixed" } })

    const emojiInput = screen.getByPlaceholderText(
      "e.g. 🎨, 🛸"
    ) as HTMLInputElement
    // Inputting multiple emojis: 🧙‍♂️ (first grapheme) and 🚀 (second grapheme)
    fireEvent.change(emojiInput, { target: { value: "🧙‍♂️🚀" } })

    // It should be trimmed to the first grapheme "🧙‍♂️"
    expect(emojiInput.value).toBe("🧙‍♂️")

    const submitBtn = screen.getByText("Create Category")
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(db.addCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "mixed",
          name: "Mixed",
          iconEmoji: "🧙‍♂️"
        })
      )
    })
  })

  it("allows editing an existing custom category", async () => {
    render(<CategoryManagerModal onClose={handleClose} addLog={handleAddLog} />)

    // Switch to manage tab
    fireEvent.click(screen.getByText("Manage Categories"))

    // Click edit on "Cyberpunk"
    const editBtn = screen.getByTitle("Edit Category")
    fireEvent.click(editBtn)

    // Verify it switched back to creation form with edit state
    expect(screen.getByText('Edit "Cyberpunk"')).toBeDefined()

    const nameInput = screen.getByDisplayValue("Cyberpunk")
    fireEvent.change(nameInput, { target: { value: "Neon Cyberpunk" } })

    const saveBtn = screen.getByText("Save Changes")
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(db.updateCategory).toHaveBeenCalledWith(
        "cyberpunk",
        expect.objectContaining({
          name: "Neon Cyberpunk",
          iconEmoji: "🛸"
        })
      )
    })

    expect(handleAddLog).toHaveBeenCalledWith(
      'Updated category "Neon Cyberpunk"'
    )
  })

  it("allows deleting an existing custom category and updates related style cards", async () => {
    vi.spyOn(window, "confirm").mockImplementation(() => true)

    render(<CategoryManagerModal onClose={handleClose} addLog={handleAddLog} />)

    // Switch to manage tab
    fireEvent.click(screen.getByText("Manage Categories"))

    // Style card has category "cyberpunk"
    expect(mockStyleCards[0].category).toBe("cyberpunk")

    // Click delete on "Cyberpunk"
    const deleteBtn = screen.getByTitle("Delete Category")
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(db.deleteCategory).toHaveBeenCalledWith("cyberpunk")
    })

    // Related style card category should be cleared
    expect(mockStyleCards[0].category).toBeUndefined()
    expect(handleAddLog).toHaveBeenCalledWith('Deleted category "Cyberpunk"')
  })
})
