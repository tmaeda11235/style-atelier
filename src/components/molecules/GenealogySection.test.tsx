import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import type { StyleCard } from "../../lib/db-schema"
import { GenealogySection } from "./GenealogySection"

const mockCard: StyleCard = {
  id: "card-uuid-2",
  name: "Evolution Card",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  promptSegments: [],
  parameters: {},
  masking: { isSrefHidden: false, isPHidden: false },
  tier: "Common",
  isFavorite: false,
  usageCount: 0,
  tags: [],
  thumbnailData: "https://example.com/thumb.png",
  frameId: "default",
  genealogy: {
    generation: 2,
    parentIds: ["parent-uuid-1", "non-existent-parent"],
    mutationNote: "Mixed with watercolor style"
  }
}

const mockParentCard: StyleCard = {
  id: "parent-uuid-1",
  name: "Parent Neo Cat",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  promptSegments: [],
  parameters: {},
  masking: { isSrefHidden: false, isPHidden: false },
  tier: "Common",
  isFavorite: false,
  usageCount: 0,
  tags: [],
  thumbnailData: "https://example.com/parent-thumb.png",
  frameId: "default",
  genealogy: { generation: 1, parentIds: [] }
}

describe("GenealogySection", () => {
  it("renders genealogy details and triggers card selection on parent click", () => {
    const onCardSelect = vi.fn()
    const parents = [mockParentCard, null]

    render(
      <GenealogySection
        card={mockCard}
        parents={parents}
        onCardSelect={onCardSelect}
      />
    )

    expect(screen.getByText("Gen 2")).toBeDefined()
    expect(screen.getByText("Mixed with watercolor style")).toBeDefined()
    expect(screen.getByText("Parent Neo Cat")).toBeDefined()
    expect(screen.getByText("Deleted Card")).toBeDefined()

    fireEvent.click(screen.getByText("Parent Neo Cat"))
    expect(onCardSelect).toHaveBeenCalledWith("parent-uuid-1")
  })
})
