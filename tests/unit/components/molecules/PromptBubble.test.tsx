import { PromptBubble } from "@/components/molecules/PromptBubble"
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

describe("PromptBubble", () => {
  it("renders text segment correctly", () => {
    render(<PromptBubble segment={{ type: "text", value: "hello" }} />)
    expect(screen.getByText("hello")).toBeInTheDocument()
  })

  it("renders slot segment correctly", () => {
    render(
      <PromptBubble
        segment={{ type: "slot", name: "slot1", label: "Age", value: "" }}
      />
    )
    expect(screen.getByText("Age")).toBeInTheDocument()
    expect(screen.getByText("Slot")).toBeInTheDocument()
  })

  it("renders chip segment correctly", () => {
    render(
      <PromptBubble segment={{ type: "chip", cardId: "card1", kind: "Sref" }} />
    )
    expect(screen.getByText("Sref")).toBeInTheDocument()
    expect(screen.getByText("Card")).toBeInTheDocument()
  })

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn()
    render(
      <PromptBubble
        segment={{ type: "text", value: "click-me" }}
        onClick={handleClick}
      />
    )
    const bubble = screen.getByText("click-me")
    fireEvent.click(bubble)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("calls onRemove when remove button is clicked", () => {
    const handleRemove = vi.fn()
    const { container } = render(
      <PromptBubble
        segment={{ type: "text", value: "removable" }}
        onRemove={handleRemove}
      />
    )
    const removeBtn = container.querySelector("button")
    expect(removeBtn).toBeInTheDocument()
    fireEvent.click(removeBtn!)
    expect(handleRemove).toHaveBeenCalledTimes(1)
  })

  it("applies rarity tier styles correctly", () => {
    const { container } = render(
      <PromptBubble
        segment={{ type: "text", value: "rare-bubble" }}
        tier="Rare"
      />
    )
    const bubble = container.firstChild as HTMLElement
    expect(bubble.className).toContain("bg-blue-500")
  })

  it("shows To Slot when enableSlotAction is true and onClick is provided", () => {
    const handleClick = vi.fn()
    render(
      <PromptBubble
        segment={{ type: "text", value: "hello" }}
        onClick={handleClick}
        enableSlotAction={true}
      />
    )
    expect(screen.getByText("To Slot")).toBeInTheDocument()
  })

  it("does not show To Slot when enableSlotAction is false", () => {
    const handleClick = vi.fn()
    render(
      <PromptBubble
        segment={{ type: "text", value: "hello" }}
        onClick={handleClick}
        enableSlotAction={false}
      />
    )
    expect(screen.queryByText("To Slot")).not.toBeInTheDocument()
  })
})
