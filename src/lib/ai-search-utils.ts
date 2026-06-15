import { runInferenceHelper } from "../hooks/webLlmUtils"

export interface SemanticFilterResult {
  rarity: string // "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "All"
  category: string // string or "All"
  color: string // "Red" | "Orange" | "Yellow" | "Green" | "Blue" | "Purple" | "Pink" | "Brown" | "White" | "Black" | "Gray" | "All"
  query: string // remaining query
}

export function getSystemPrompt(
  categoryNames: string,
  language?: string
): string {
  if (language === "ja") {
    return `あなたはスタイル検索クエリの解析器です。ユーザーの検索クエリからフィルター値を抽出するのが役目です。
利用可能なレアリティ: Common, Uncommon, Rare, Epic, Legendary, All
利用可能なカラー: Red, Orange, Yellow, Green, Blue, Purple, Pink, Brown, White, Black, Gray, All
利用可能なカテゴリ: ${categoryNames || "None"}

ユーザーのクエリを分析し、以下を抽出してください：
1. rarity: クエリ中で言及されているレアリティ。上記の「利用可能なレアリティ」リストから正確に選択してください。言及がない場合は "All" を指定します。
   日本語の表現から英語のレアリティ名に変換してください（例：「コモン」-> "Common"、「アンコモン」-> "Uncommon"、「レア」-> "Rare"、「エピック」-> "Epic"、「レジェンダリー」または「伝説」-> "Legendary"）。
2. color: クエリ中で言及されている色。上記の「利用可能なカラー」リストから正確に選択してください。言及がない場合は "All" を指定します。
   日本語の表現から英語の色名に変換してください（例：「赤」または「赤い」-> "Red"、「青」または「青い」-> "Blue"、「黄」または「黄色い」-> "Yellow"、「緑」または「緑の」-> "Green"、「紫」または「紫の」-> "Purple"、「黒」または「黒い」-> "Black"、「白」または「白い」-> "White"）。
3. category: クエリが利用可能なカテゴリ [${categoryNames}] のいずれかに言及しているか確認してください。近いものがあれば、その正確なカテゴリ名を選択します。なければ "All" を返します。
4. query: フィルターとして抽出した残りの検索キーワード（コア検索語）。日本語のキーワードは英語に翻訳するか、あるいはそのままシンプルな英語・ローマ字に変換してください（例：ユーザーが「伝説の青い目のアニメ風のカード」と入力した場合、レアリティは "Legendary"、色は "Blue"、残りのキーワードは "anime style" とします）。

回答は必ず有効なJSONオブジェクト単体のみにしてください。Markdownのコードブロック（\`\`\`jsonなど）や説明、余分な文字は一切含めないでください。

入力クエリ例: 「伝説の青い目のサイバーパンク」
出力例: {"rarity": "Legendary", "color": "Blue", "category": "All", "query": "cyberpunk"}

入力クエリ例: 「アンコモンの赤いアニメ風のカード」
出力例: {"rarity": "Uncommon", "color": "Red", "category": "All", "query": "anime style"}
`
  }

  return `You are a style search query parser. Your task is to extract filter values from the user query.
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
}

export async function parseSemanticQuery(
  userQuery: string,
  categories: { id: string; name: string }[],
  language?: string
): Promise<SemanticFilterResult> {
  const categoryNames = categories.map((c) => c.name).join(", ")
  const systemPrompt = getSystemPrompt(categoryNames, language)

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
