import { WorkbenchEmptyState } from "@/components/organisms/WorkbenchEmptyState"
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

describe("WorkbenchEmptyState", () => {
  const mockT = {
    emptyTitle: "Your Workbench is Empty",
    emptyDesc:
      "Begin creating a style by selecting a slot from the layout panel",
    guideTitle: "Quick Start Guide",
    step1Title: "Select a Slot",
    step1Desc: "Pick one of the active layout slots to target.",
    step2Title: "Add Style Cards",
    step2Desc:
      "Browse your Library and click cards to place them into the Workbench.",
    step3Title: "Blend & Try",
    step3Desc:
      "Arrange slots, refine values, and trigger a blend on Midjourney."
  }

  it("renders with default props and text content", () => {
    render(<WorkbenchEmptyState t={mockT} />)

    expect(screen.getByText("Your Workbench is Empty")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Begin creating a style by selecting a slot from the layout panel"
      )
    ).toBeInTheDocument()
    expect(screen.getByText("Quick Start Guide")).toBeInTheDocument()
    expect(screen.getByText("Select a Slot")).toBeInTheDocument()
    expect(screen.getByText("Add Style Cards")).toBeInTheDocument()
    expect(screen.getByText("Blend & Try")).toBeInTheDocument()

    const emptyStateElement = screen.getByTestId("workbench-empty-state")
    expect(emptyStateElement).toHaveClass("border-slate-200")
  })

  it("handles drag over events", () => {
    const setIsDragOver = vi.fn()
    render(<WorkbenchEmptyState t={mockT} setIsDragOver={setIsDragOver} />)

    const emptyStateElement = screen.getByTestId("workbench-empty-state")
    fireEvent.dragOver(emptyStateElement)

    expect(setIsDragOver).toHaveBeenCalledWith(true)
  })

  it("handles drag leave events", () => {
    const setIsDragOver = vi.fn()
    render(<WorkbenchEmptyState t={mockT} setIsDragOver={setIsDragOver} />)

    const emptyStateElement = screen.getByTestId("workbench-empty-state")
    fireEvent.dragLeave(emptyStateElement)

    expect(setIsDragOver).toHaveBeenCalledWith(false)
  })

  it("handles drop events", () => {
    const setIsDragOver = vi.fn()
    const onDrop = vi.fn()
    render(
      <WorkbenchEmptyState
        t={mockT}
        setIsDragOver={setIsDragOver}
        onDrop={onDrop}
      />
    )

    const emptyStateElement = screen.getByTestId("workbench-empty-state")
    fireEvent.drop(emptyStateElement)

    expect(setIsDragOver).toHaveBeenCalledWith(false)
    expect(onDrop).toHaveBeenCalled()
  })

  it("applies active styles when isDragOver is true", () => {
    render(<WorkbenchEmptyState t={mockT} isDragOver={true} />)

    const emptyStateElement = screen.getByTestId("workbench-empty-state")
    expect(emptyStateElement).toHaveClass("border-blue-400")
    expect(emptyStateElement).toHaveClass(
      "shadow-[0_0_20px_rgba(59,130,246,0.25)]"
    )
  })
})
