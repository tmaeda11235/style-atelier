import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { ConfirmationDialog } from "./ConfirmationDialog"

describe("ConfirmationDialog", () => {
  it("does not render when closed", () => {
    const { container } = render(
      <ConfirmationDialog
        isOpen={false}
        message="Are you sure?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders content and handles buttons when open", () => {
    const mockOnConfirm = vi.fn()
    const mockOnCancel = vi.fn()

    render(
      <ConfirmationDialog
        isOpen={true}
        title="Delete Item"
        message="Are you sure?"
        confirmText="Yes"
        cancelText="No"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText("Delete Item")).toBeInTheDocument()
    expect(screen.getByText("Are you sure?")).toBeInTheDocument()

    const confirmBtn = screen.getByText("Yes")
    const cancelBtn = screen.getByText("No")

    fireEvent.click(confirmBtn)
    expect(mockOnConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(cancelBtn)
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it("handles escape key", () => {
    const mockOnCancel = vi.fn()

    render(
      <ConfirmationDialog
        isOpen={true}
        message="Confirm escape"
        onConfirm={() => {}}
        onCancel={mockOnCancel}
      />
    )

    fireEvent.keyDown(window, { key: "Escape" })
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it("handles clicking backdrop to cancel", () => {
    const mockOnCancel = vi.fn()

    const { container } = render(
      <ConfirmationDialog
        isOpen={true}
        message="Backdrop cancel"
        onConfirm={() => {}}
        onCancel={mockOnCancel}
      />
    )

    const backdrop = container.querySelector("#confirmation-dialog-backdrop")
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop!)
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })
})
