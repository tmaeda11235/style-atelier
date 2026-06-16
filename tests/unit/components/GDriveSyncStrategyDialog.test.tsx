import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { GDriveSyncStrategyDialog } from "../../../src/components/molecules/GDriveSyncStrategyDialog"

describe("GDriveSyncStrategyDialog", () => {
  const mockT = {
    syncWarningTitle: "Sync Strategy Needed",
    syncWarningMessage: "Conflict detected between local and cloud data.",
    strategyLabel: "Select Strategy:",
    strategyMergeLabel: "Merge",
    strategyMergeDesc: "Merge local and cloud decks.",
    strategyLocalOverwriteLabel: "Local Overwrite",
    strategyLocalOverwriteDesc: "Overwrite cloud with local data.",
    strategyCloudOverwriteLabel: "Cloud Overwrite",
    strategyCloudOverwriteDesc: "Overwrite local with cloud data.",
    syncConfirmBtn: "Confirm Sync",
    cancelBtn: "Cancel"
  }

  const defaultProps = {
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    t: mockT
  }

  it("should render null when isOpen is false", () => {
    const { container } = render(
      <GDriveSyncStrategyDialog {...defaultProps} isOpen={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("should render dialog content when isOpen is true", () => {
    render(<GDriveSyncStrategyDialog {...defaultProps} />)

    expect(screen.getByText("Sync Strategy Needed")).toBeInTheDocument()
    expect(
      screen.getByText("Conflict detected between local and cloud data.")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Merge")).toBeInTheDocument()
    expect(screen.getByLabelText("Local Overwrite")).toBeInTheDocument()
    expect(screen.getByLabelText("Cloud Overwrite")).toBeInTheDocument()
    expect(screen.getByText("Confirm Sync")).toBeInTheDocument()
    expect(screen.getByText("Cancel")).toBeInTheDocument()
  })

  it("should select strategy and trigger onConfirm with chosen strategy", () => {
    const onConfirmMock = vi.fn()
    render(
      <GDriveSyncStrategyDialog {...defaultProps} onConfirm={onConfirmMock} />
    )

    // Default strategy should be "merge"
    const confirmBtn = screen.getByText("Confirm Sync")
    fireEvent.click(confirmBtn)
    expect(onConfirmMock).toHaveBeenCalledWith("merge")

    // Select "local-overwrite" strategy
    const localOption = screen.getByLabelText("Local Overwrite")
    fireEvent.click(localOption)
    fireEvent.click(confirmBtn)
    expect(onConfirmMock).toHaveBeenCalledWith("local-overwrite")

    // Select "cloud-overwrite" strategy
    const cloudOption = screen.getByLabelText("Cloud Overwrite")
    fireEvent.click(cloudOption)
    fireEvent.click(confirmBtn)
    expect(onConfirmMock).toHaveBeenCalledWith("cloud-overwrite")
  })

  it("should call onCancel when Cancel button is clicked", () => {
    const onCancelMock = vi.fn()
    render(
      <GDriveSyncStrategyDialog {...defaultProps} onCancel={onCancelMock} />
    )

    const cancelBtn = screen.getByText("Cancel")
    fireEvent.click(cancelBtn)
    expect(onCancelMock).toHaveBeenCalled()
  })

  it("should call onCancel when backdrop is clicked, but not when modal container is clicked", () => {
    const onCancelMock = vi.fn()
    const { container } = render(
      <GDriveSyncStrategyDialog {...defaultProps} onCancel={onCancelMock} />
    )

    // Backdrop click
    const backdrop = container.querySelector("#sync-strategy-dialog-backdrop")
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop!)
    expect(onCancelMock).toHaveBeenCalled()

    onCancelMock.mockClear()

    // Container click (should not close due to stopPropagation)
    const modalContainer = container.querySelector(
      "#sync-strategy-dialog-container"
    )
    expect(modalContainer).toBeInTheDocument()
    fireEvent.click(modalContainer!)
    expect(onCancelMock).not.toHaveBeenCalled()
  })

  it("should handle Escape keydown event to cancel the dialog", () => {
    const onCancelMock = vi.fn()
    render(
      <GDriveSyncStrategyDialog {...defaultProps} onCancel={onCancelMock} />
    )

    fireEvent.keyDown(window, { key: "Escape" })
    expect(onCancelMock).toHaveBeenCalled()
  })
})
