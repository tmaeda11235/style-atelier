import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { DeleteConfirmModal } from "./DeleteConfirmModal"

describe("DeleteConfirmModal", () => {
  it("does not render when closed", () => {
    render(
      <DeleteConfirmModal
        isOpen={false}
        cardName="Test Card"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.queryByTestId("delete-confirm-modal")).toBeNull()
  })

  it("renders card name and buttons when open", () => {
    const onClose = vi.fn()
    const onConfirm = vi.fn()

    render(
      <DeleteConfirmModal
        isOpen={true}
        cardName="Test Card"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    )

    expect(screen.getByTestId("delete-confirm-modal")).toBeDefined()
    expect(screen.getByText(/Test Card/)).toBeDefined()

    fireEvent.click(screen.getByTestId("delete-confirm-cancel-button"))
    expect(onClose).toHaveBeenCalled()

    fireEvent.click(screen.getByTestId("delete-confirm-ok-button"))
    expect(onConfirm).toHaveBeenCalled()
  })
})
