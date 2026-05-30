import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { CategoryManagerModal } from "./CategoryManagerModal"

describe("CategoryManagerModal", () => {
  it("renders correctly with default state", () => {
    const handleClose = vi.fn()
    const handleAddLog = vi.fn()

    render(
      <CategoryManagerModal
        onClose={handleClose}
        addLog={handleAddLog}
      />
    )

    expect(screen.getByText("Add Custom Category")).toBeDefined()
    expect(screen.getByPlaceholderText("e.g. Cyberpunk, Retro")).toBeDefined()
    expect(screen.getByText("Create Category")).toBeDefined()
  })
})
