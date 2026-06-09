import { zipSync } from "fflate"

import type { CustomCategory, StyleCard } from "./db-schema"
import { buildPromptString } from "./prompt-utils"

// Helper to escape CSV values
function escapeCSVValue(val: string): string {
  if (val === null || val === undefined) return '""'
  const str = String(val)
  const escaped = str.replace(/"/g, '""')
  return `"${escaped}"`
}

function mapCardToCSVRow(
  card: StyleCard,
  categoryMap: Map<string, string>
): string[] {
  const fullPrompt = buildPromptString(card.promptSegments, card.parameters)
  const categoryName = card.category
    ? categoryMap.get(card.category) || card.category
    : ""

  return [
    card.id,
    card.name,
    fullPrompt,
    card.parameters.ar || "",
    (card.parameters.sref || []).join(" "),
    (card.parameters.cref || []).join(" "),
    (card.parameters.p || []).join(" "),
    (card.parameters.imagePrompts || []).join(" "),
    card.parameters.stylize !== undefined
      ? String(card.parameters.stylize)
      : "",
    card.parameters.chaos !== undefined ? String(card.parameters.chaos) : "",
    card.parameters.weird !== undefined ? String(card.parameters.weird) : "",
    card.parameters.tile ? "true" : "false",
    card.parameters.raw ? "true" : "false",
    card.tier,
    categoryName,
    card.tags.join(", "),
    card.isFavorite ? "true" : "false",
    String(card.usageCount),
    new Date(card.createdAt).toISOString(),
    new Date(card.updatedAt || card.createdAt).toISOString()
  ]
}

export function exportStyleCardsToCSV(
  cards: StyleCard[],
  categories: CustomCategory[]
): string {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const headers = [
    "ID",
    "Name",
    "Full Prompt",
    "Aspect Ratio",
    "Style Reference",
    "Character Reference",
    "Personalization",
    "Image Prompts",
    "Stylize",
    "Chaos",
    "Weird",
    "Tile",
    "Raw Style",
    "Tier",
    "Category",
    "Tags",
    "Favorite",
    "Usage Count",
    "Created At",
    "Updated At"
  ]

  const rows = cards.map((card) =>
    mapCardToCSVRow(card, categoryMap).map(escapeCSVValue).join(",")
  )

  return [headers.join(","), ...rows].join("\n")
}

function generateCardMarkdown(card: StyleCard, categoryName: string): string {
  const fullPrompt = buildPromptString(card.promptSegments, card.parameters)
  const frontmatter = [
    "---",
    `id: "${card.id}"`,
    `name: ${JSON.stringify(card.name)}`,
    `tier: "${card.tier}"`,
    `category: ${JSON.stringify(categoryName)}`,
    `tags: [${card.tags.map((t) => JSON.stringify(t)).join(", ")}]`,
    `favorite: ${card.isFavorite}`,
    `usageCount: ${card.usageCount}`,
    `createdAt: "${new Date(card.createdAt).toISOString()}"`,
    `updatedAt: "${new Date(card.updatedAt || card.createdAt).toISOString()}"`,
    "parameters:",
    `  ar: ${card.parameters.ar ? `"${card.parameters.ar}"` : "null"}`,
    `  sref: [${(card.parameters.sref || []).map((s) => `"${s}"`).join(", ")}]`,
    `  cref: [${(card.parameters.cref || []).map((c) => `"${c}"`).join(", ")}]`,
    `  p: [${(card.parameters.p || []).map((p) => `"${p}"`).join(", ")}]`,
    `  imagePrompts: [${(card.parameters.imagePrompts || []).map((i) => `"${i}"`).join(", ")}]`,
    `  stylize: ${card.parameters.stylize !== undefined ? card.parameters.stylize : "null"}`,
    `  chaos: ${card.parameters.chaos !== undefined ? card.parameters.chaos : "null"}`,
    `  weird: ${card.parameters.weird !== undefined ? card.parameters.weird : "null"}`,
    `  tile: ${!!card.parameters.tile}`,
    `  raw: ${!!card.parameters.raw}`,
    "---"
  ].join("\n")

  return `${frontmatter}\n\n# ${card.name}\n\n## Prompt\n\`\`\`text\n${fullPrompt}\n\`\`\`\n`
}

export function exportStyleCardsToMarkdownZip(
  cards: StyleCard[],
  categories: CustomCategory[]
): Uint8Array {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))
  const zipFiles: Record<string, Uint8Array> = {}
  const encoder = new TextEncoder()
  const nameCount: Record<string, number> = {}

  cards.forEach((card) => {
    const categoryName = card.category
      ? categoryMap.get(card.category) || card.category
      : ""
    const markdownContent = generateCardMarkdown(card, categoryName)

    const safeName = card.name.replace(/[\s/\\?%*:|"<>]/g, "_") || "style_card"
    let fileName = `${safeName}.md`
    if (nameCount[safeName] !== undefined) {
      nameCount[safeName]++
      fileName = `${safeName}_(${nameCount[safeName]}).md`
    } else {
      nameCount[safeName] = 0
    }

    zipFiles[fileName] = encoder.encode(markdownContent)
  })

  return zipSync(zipFiles)
}
