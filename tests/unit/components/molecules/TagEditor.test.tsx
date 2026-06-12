import { TagEditor } from "@/components/molecules/TagEditor"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

describe("TagEditor", () => {
  it("renders the list of tags and 'No tags added yet' when empty", () => {
    const { rerender } = render(<TagEditor tags={[]} onChange={vi.fn()} />)
    expect(screen.getByText("No tags added yet.")).toBeDefined()

    rerender(<TagEditor tags={["tag1", "tag2"]} onChange={vi.fn()} />)
    expect(screen.queryByText("No tags added yet.")).toBeNull()
    expect(screen.getByText("tag1")).toBeDefined()
    expect(screen.getByText("tag2")).toBeDefined()
  })

  it("calls onChange when a tag is added", () => {
    const mockOnChange = vi.fn()
    render(<TagEditor tags={["tag1"]} onChange={mockOnChange} />)

    const input = screen.getByPlaceholderText(
      "Add new tag..."
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: "tag2" } })
    fireEvent.submit(input)

    expect(mockOnChange).toHaveBeenCalledWith(["tag1", "tag2"])
  })

  it("calls onChange when a tag is removed", () => {
    const mockOnChange = vi.fn()
    render(<TagEditor tags={["tag1", "tag2"]} onChange={mockOnChange} />)

    const removeButtons = screen.getAllByText("×")
    fireEvent.click(removeButtons[0]) // remove "tag1"

    expect(mockOnChange).toHaveBeenCalledWith(["tag2"])
  })
})
