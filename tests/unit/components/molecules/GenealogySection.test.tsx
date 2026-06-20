import { GenealogySection } from "@/components/molecules/GenealogySection"
import { LanguageProvider } from "@/contexts/LanguageContext"
import type { StyleCard } from "@/shared/lib/db-schema"
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

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
  dominantColor: "#000000",
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
  dominantColor: "#000000",
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

  it("renders Japanese labels when LanguageProvider is set to ja", () => {
    const onCardSelect = vi.fn()
    const parents = [mockParentCard, null]
    localStorage.setItem("style-atelier-language", "ja")
    try {
      render(
        <LanguageProvider>
          <GenealogySection
            card={mockCard}
            parents={parents}
            onCardSelect={onCardSelect}
          />
        </LanguageProvider>
      )
      expect(screen.getByText("系統と進化")).toBeDefined()
      expect(screen.getByText("世代")).toBeDefined()
      expect(screen.getByText("Gen 2")).toBeDefined()
      expect(screen.getByText("変異メモ")).toBeDefined()
      expect(screen.getByText("親カード")).toBeDefined()
      expect(screen.getByText("削除されたカード")).toBeDefined()
    } finally {
      localStorage.removeItem("style-atelier-language")
    }
  })

  it("handles empty parentIds gracefully", () => {
    const cardWithoutParents = {
      ...mockCard,
      genealogy: { generation: 1, parentIds: [] }
    }
    const { container } = render(
      <GenealogySection card={cardWithoutParents} parents={[]} />
    )
    expect(screen.queryByText("Parent Cards")).toBeNull()
  })

  it("handles parent without thumbnailData", () => {
    const parentWithoutThumb = { ...mockParentCard, thumbnailData: undefined }
    render(
      <GenealogySection card={mockCard} parents={[parentWithoutThumb, null]} />
    )
    expect(screen.getByText("🎨")).toBeInTheDocument()
  })
})
