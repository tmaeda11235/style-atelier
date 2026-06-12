import { TagEditor } from "@/components/molecules/TagEditor"
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

const mockT = {
  cardDetail: {
    tags: "Tags"
  },
  minting: {
    noTagsYet: "No tags added yet.",
    tagsPlaceholder: "Add new tag...",
    add: "Add"
  }
}

describe("TagEditor", () => {
  it("renders the list of tags and 'No tags added yet' when empty", () => {
    const { rerender } = render(
      <TagEditor
        tags={[]}
        newTagInput=""
        onNewTagInputChange={vi.fn()}
        onAddTag={vi.fn()}
        onRemoveTag={vi.fn()}
        t={mockT}
      />
    )
    expect(screen.getByText("No tags added yet.")).toBeDefined()

    rerender(
      <TagEditor
        tags={["tag1", "tag2"]}
        newTagInput=""
        onNewTagInputChange={vi.fn()}
        onAddTag={vi.fn()}
        onRemoveTag={vi.fn()}
        t={mockT}
      />
    )
    expect(screen.queryByText("No tags added yet.")).toBeNull()
    expect(screen.getByText("tag1")).toBeDefined()
    expect(screen.getByText("tag2")).toBeDefined()
  })

  it("calls onNewTagInputChange and onAddTag when input changes and form is submitted", () => {
    const mockOnInputChange = vi.fn()
    const mockOnAddTag = vi.fn((e) => e.preventDefault())

    render(
      <TagEditor
        tags={["tag1"]}
        newTagInput="tag2"
        onNewTagInputChange={mockOnInputChange}
        onAddTag={mockOnAddTag}
        onRemoveTag={vi.fn()}
        t={mockT}
      />
    )

    const input = screen.getByPlaceholderText(
      "Add new tag..."
    ) as HTMLInputElement

    fireEvent.change(input, { target: { value: "tag2-modified" } })
    expect(mockOnInputChange).toHaveBeenCalledWith("tag2-modified")

    fireEvent.submit(input)
    expect(mockOnAddTag).toHaveBeenCalled()
  })

  it("calls onRemoveTag when a tag is removed", () => {
    const mockOnRemoveTag = vi.fn()
    render(
      <TagEditor
        tags={["tag1", "tag2"]}
        newTagInput=""
        onNewTagInputChange={vi.fn()}
        onAddTag={vi.fn()}
        onRemoveTag={mockOnRemoveTag}
        t={mockT}
      />
    )

    const removeButton = screen.getByLabelText("Remove tag1")
    fireEvent.click(removeButton)

    expect(mockOnRemoveTag).toHaveBeenCalledWith("tag1")
  })
})
