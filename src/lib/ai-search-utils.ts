import { runInferenceHelper } from "../hooks/webLlmUtils"

export interface SemanticFilterResult {
  rarity: string // "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "All"
  category: string // string or "All"
  color: string // "Red" | "Orange" | "Yellow" | "Green" | "Blue" | "Purple" | "Pink" | "Brown" | "White" | "Black" | "Gray" | "All"
  query: string // remaining query
}

export async function parseSemanticQuery(
  userQuery: string,
  categories: { id: string; name: string }[]
): Promise<SemanticFilterResult> {
  const categoryNames = categories.map((c) => c.name).join(", ")

  const systemPrompt = `You are a style search query parser. Your task is to extract filter values from the user query.
Available Rarities: Common, Uncommon, Rare, Epic, Legendary, All
Available Colors: Red, Orange, Yellow, Green, Blue, Purple, Pink, Brown, White, Black, Gray, All
Available Categories: ${categoryNames || "None"}

Analyze the user query and extract:
1. rarity: The rarity mentioned. Choose exactly from the Available Rarities list, or "All" if none is specified.
   Translate rarities from other languages if needed (e.g., Japanese "コモン" -> "Common", "アンコモン" -> "Uncommon", "レア" -> "Rare", "エピック" -> "Epic", "レジェンダリー" or "伝説" -> "Legendary").
2. color: The color mentioned. Choose exactly from the Available Colors list, or "All" if none is specified.
   Translate colors from other languages if needed (e.g., Japanese "赤" -> "Red", "青" -> "Blue", "黄" -> "Yellow", "緑" -> "Green", "紫" -> "Purple", "黒" -> "Black", "白" -> "White").
3. category: Check if the query refers to any of the available categories: [${categoryNames}]. If there is a close match, choose that exact category name. Otherwise, return "All".
4. query: The semantic core search term remaining (e.g., if user says "Legendary anime style with blue eyes", the filters are rarity: Legendary, color: Blue, and the core search term is "anime style with eyes"). Translate the query keyword to English if it's in Japanese, or keep it simple.

You MUST respond ONLY with a valid JSON object. Do not include markdown block formatting (like \`\`\`json). Do not include any explanations or extra characters.
Example output: {"rarity": "Legendary", "color": "Blue", "category": "All", "query": "anime"}
`

  try {
    const rawResult = await runInferenceHelper(userQuery, systemPrompt, 0.1)

    // Clean up potential markdown formatting in response
    let cleanJson = rawResult.trim()
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.substring(7)
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.substring(3)
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3)
    }
    cleanJson = cleanJson.trim()

    const parsed = JSON.parse(cleanJson)
    return {
      rarity: parsed.rarity || "All",
      category: parsed.category || "All",
      color: parsed.color || "All",
      query: parsed.query || ""
    }
  } catch (err) {
    console.error("Semantic query parsing failed:", err)
    throw err
  }
}
