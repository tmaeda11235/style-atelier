import { EasyModeSection } from "@/components/organisms/EasyModeSection"
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

// Mock translations
const mockT = {
  easyModeLabel: "Easy Mode",
  easyModeDesc: "Simplifies the user interface.",
  activeStatus: "Active",
  easyModeToggleLabel: "Enable Easy Mode",
  easyModeToggleSub: "Toggle layout",
  backToLibrary: "Back to Library",
  expertFeaturesTitle: "Expert Features",
  expertFeaturesDesc: "Advanced features description",
  groupCardFeatures: "Card Features",
  featureRarityLabel: "Rarity Badge",
  featureRaritySub: "Show rarity",
  featureTagsLabel: "Tags",
  featureTagsSub: "Show tags",
  featureCardEditingLabel: "Card Editing",
  featureCardEditingSub: "Allow editing",
  groupOrganization: "Organization",
  featureCategoriesLabel: "Categories",
  featureCategoriesSub: "Manage categories",
  featureStackLabel: "Card Stack",
  featureStackSub: "Merge cards",
  groupWorkbench: "Workbench",
  featureSlotLabel: "Variables Slot",
  featureSlotSub: "Use slots",
  featureMultiCardLabel: "Multi Card Selection",
  featureMultiCardSub: "Select multiple cards",
  featureMultiImageLabel: "Multi Image blended",
  featureMultiImageSub: "Blend images"
}

describe("EasyModeSection", () => {
  it("renders InterfaceModeToggle and shows active status when Easy Mode is active", () => {
    const toggleEasyModeMock = vi.fn()
    const updateExpertFeatureMock = vi.fn()
    const navigateMock = vi.fn()

    render(
      <EasyModeSection
        currentEasyMode={true}
        currentToggleEasyMode={toggleEasyModeMock}
        expertFeatures={{}}
        updateExpertFeature={updateExpertFeatureMock}
        t={mockT}
        onNavigateToLibrary={navigateMock}
      />
    )

    // Verify Easy Mode elements are present
    expect(screen.getByText("Easy Mode")).toBeDefined()
    expect(screen.getByText("Active")).toBeDefined()
    expect(screen.getByText("Enable Easy Mode")).toBeDefined()
    expect(screen.getByText(/Back to Library/)).toBeDefined()

    // Expert features section should not be rendered in Easy Mode
    expect(screen.queryByText("Expert Features")).toBeNull()

    // Clicking Easy Mode toggle btn
    const toggleBtn = screen.getByRole("button", { name: "" }) // Switch button
    fireEvent.click(toggleBtn)
    expect(toggleEasyModeMock).toHaveBeenCalledWith(false)

    // Clicking back to library btn
    const backBtn = screen.getByText(/Back to Library/)
    fireEvent.click(backBtn)
    expect(navigateMock).toHaveBeenCalled()
  })

  it("renders Expert Features list and triggers changes when Easy Mode is inactive", () => {
    const toggleEasyModeMock = vi.fn()
    const updateExpertFeatureMock = vi.fn()
    const expertFeatures = {
      rarity: true,
      tags: false,
      cardEditing: true,
      categories: false,
      stack: true,
      slot: false,
      multiCard: true,
      multiImage: false
    }

    render(
      <EasyModeSection
        currentEasyMode={false}
        currentToggleEasyMode={toggleEasyModeMock}
        expertFeatures={expertFeatures}
        updateExpertFeature={updateExpertFeatureMock}
        t={mockT}
      />
    )

    // Easy Mode active status badge and back button should not be present
    expect(screen.queryByText("Active")).toBeNull()
    expect(screen.queryByText("Back to Library")).toBeNull()

    // Expert features section must be visible
    expect(screen.getByText("Expert Features")).toBeDefined()
    expect(screen.getByText("Card Features")).toBeDefined()
    expect(screen.getByText("Organization")).toBeDefined()
    expect(screen.getByText("Workbench")).toBeDefined()

    // Check individual items
    expect(screen.getByText("Rarity Badge")).toBeDefined()
    expect(screen.getByText("Tags")).toBeDefined()

    // Check custom toggle action (e.g. rarity)
    const rarityToggle = document.getElementById("expert-feature-rarity-btn")
    expect(rarityToggle).not.toBeNull()
    if (rarityToggle) {
      fireEvent.click(rarityToggle)
      expect(updateExpertFeatureMock).toHaveBeenCalledWith("rarity", false)
    }

    // Check tag toggle action
    const tagsToggle = document.getElementById("expert-feature-tags-btn")
    expect(tagsToggle).not.toBeNull()
    if (tagsToggle) {
      fireEvent.click(tagsToggle)
      expect(updateExpertFeatureMock).toHaveBeenCalledWith("tags", true)
    }
  })
})
