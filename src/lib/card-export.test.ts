import { unzipSync } from "fflate"
import { describe, expect, it } from "vitest"

import {
  exportStyleCardsToCSV,
  exportStyleCardsToMarkdownZip
} from "./card-export"
import type { CustomCategory, StyleCard } from "./db-schema"

describe("card-export", () => {
  const mockCategories: CustomCategory[] = [
    { id: "cat-1", name: "Cyberpunk", iconEmoji: "🛸", createdAt: 123 },
    { id: "cat-2", name: "Fantasy", iconEmoji: "🧝", createdAt: 456 }
  ]

  const mockCards: StyleCard[] = [
    {
      id: "card-1",
      name: "Neon Cat",
      createdAt: 1717800000000, // 2024-06-08T00:00:00.000Z
      updatedAt: 1717800000000,
      promptSegments: [
        { type: "text", value: "a cute cat in neon lights" },
        { type: "slot", label: "color", default: "blue" }
      ],
      parameters: {
        ar: "16:9",
        stylize: 250,
        sref: ["https://cdn.midjourney.com/sref1.png"]
      },
      masking: { isSrefHidden: false, isPHidden: false },
      tier: "Rare",
      isFavorite: true,
      usageCount: 5,
      tags: ["neon", "cyberpunk"],
      category: "cat-1",
      dominantColor: "#ff00ff",
      thumbnailData: "data:image/png;base64,mock",
      frameId: "holo",
      genealogy: { generation: 1, parentIds: [] }
    },
    {
      id: "card-2",
      name: "Elven Tree",
      createdAt: 1717803600000, // 2024-06-08T01:00:00.000Z
      updatedAt: 1717803600000,
      promptSegments: [
        { type: "text", value: "giant tree with glowing leaves" }
      ],
      parameters: {
        chaos: 20
      },
      masking: { isSrefHidden: false, isPHidden: false },
      tier: "Legendary",
      isFavorite: false,
      usageCount: 2,
      tags: ["nature", "fantasy"],
      category: "cat-2",
      dominantColor: "#00ff00",
      thumbnailData: "data:image/png;base64,mock2",
      frameId: "legendary",
      genealogy: { generation: 2, parentIds: ["card-0"] }
    }
  ]

  describe("exportStyleCardsToCSV", () => {
    it("should export style cards correctly to CSV", () => {
      const csv = exportStyleCardsToCSV(mockCards, mockCategories)
      const lines = csv.split("\n")

      // Header check
      expect(lines[0]).toBe(
        "ID,Name,Full Prompt,Aspect Ratio,Style Reference,Character Reference,Personalization,Image Prompts,Stylize,Chaos,Weird,Tile,Raw Style,Tier,Category,Tags,Favorite,Usage Count,Created At,Updated At"
      )

      // Card 1 row check
      expect(lines[1]).toContain('"card-1"')
      expect(lines[1]).toContain('"Neon Cat"')
      expect(lines[1]).toContain(
        '"a cute cat in neon lights, {{color}} --ar 16:9 --sref https://cdn.midjourney.com/sref1.png --s 250"'
      )
      expect(lines[1]).toContain('"16:9"')
      expect(lines[1]).toContain('"https://cdn.midjourney.com/sref1.png"')
      expect(lines[1]).toContain('"250"')
      expect(lines[1]).toContain('"Rare"')
      expect(lines[1]).toContain('"Cyberpunk"') // resolved category name
      expect(lines[1]).toContain('"neon, cyberpunk"')
      expect(lines[1]).toContain('"true"') // isFavorite
      expect(lines[1]).toContain('"5"') // usageCount

      // Card 2 row check
      expect(lines[2]).toContain('"card-2"')
      expect(lines[2]).toContain('"Elven Tree"')
      expect(lines[2]).toContain('"giant tree with glowing leaves --c 20"')
      expect(lines[2]).toContain('"Fantasy"') // resolved category name
      expect(lines[2]).toContain('"nature, fantasy"')
      expect(lines[2]).toContain('"false"') // isFavorite
      expect(lines[2]).toContain('"2"') // usageCount
    })
  })

  describe("exportStyleCardsToMarkdownZip", () => {
    it("should export style cards to a zip archive containing Markdown files", () => {
      const zipData = exportStyleCardsToMarkdownZip(mockCards, mockCategories)
      expect(zipData).toBeInstanceOf(Uint8Array)

      // Unzip and inspect files
      const unzipped = unzipSync(zipData)
      const fileNames = Object.keys(unzipped)

      expect(fileNames).toContain("Neon_Cat.md")
      expect(fileNames).toContain("Elven_Tree.md")

      // Check contents of Neon_Cat.md
      const textDecoder = new TextDecoder()
      const neonCatMd = textDecoder.decode(unzipped["Neon_Cat.md"])

      expect(neonCatMd).toContain('id: "card-1"')
      expect(neonCatMd).toContain('name: "Neon Cat"')
      expect(neonCatMd).toContain('tier: "Rare"')
      expect(neonCatMd).toContain('category: "Cyberpunk"')
      expect(neonCatMd).toContain('tags: ["neon", "cyberpunk"]')
      expect(neonCatMd).toContain("favorite: true")
      expect(neonCatMd).toContain("usageCount: 5")
      expect(neonCatMd).toContain('ar: "16:9"')
      expect(neonCatMd).toContain("stylize: 250")
      expect(neonCatMd).toContain(
        "a cute cat in neon lights, {{color}} --ar 16:9 --sref https://cdn.midjourney.com/sref1.png --s 250"
      )

      // Check contents of Elven_Tree.md
      const elvenTreeMd = textDecoder.decode(unzipped["Elven_Tree.md"])
      expect(elvenTreeMd).toContain('id: "card-2"')
      expect(elvenTreeMd).toContain('name: "Elven Tree"')
      expect(elvenTreeMd).toContain('category: "Fantasy"')
      expect(elvenTreeMd).toContain("giant tree with glowing leaves --c 20")
    })

    it("should handle duplicate card names gracefully by appending a suffix", () => {
      const duplicateCards: StyleCard[] = [
        { ...mockCards[0], id: "card-1a", name: "Neon Cat" },
        { ...mockCards[0], id: "card-1b", name: "Neon Cat" }
      ]

      const zipData = exportStyleCardsToMarkdownZip(
        duplicateCards,
        mockCategories
      )
      const unzipped = unzipSync(zipData)
      const fileNames = Object.keys(unzipped)

      expect(fileNames).toContain("Neon_Cat.md")
      expect(fileNames).toContain("Neon_Cat_(1).md")
    })
  })
})
