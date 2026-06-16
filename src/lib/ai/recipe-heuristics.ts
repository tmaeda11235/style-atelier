interface Card {
  id?: string
  name: string
  prompt?: string
  promptSegments?: { value?: string; default?: string }[]
  weight?: number
  category?: string
}

function getCardPromptText(card: Card): string {
  if (card.promptSegments) {
    return card.promptSegments.map((s) => s.value || s.default || "").join(" ")
  }
  return card.prompt || ""
}

function checkSrefCref(cards: Card[], isJa: boolean): string {
  let hasSref = false
  let hasCref = false
  cards.forEach((c) => {
    const text = getCardPromptText(c).toLowerCase()
    if (text.includes("--sref")) hasSref = true
    if (text.includes("--cref")) hasCref = true
  })

  if (hasSref && hasCref) {
    return isJa
      ? "- **スタイルの混在警告**: `--sref`（スタイル）と `--cref`（キャラクター）が混在しています。キャラクターとスタイルの影響を分離するため、`--cw`（キャラクターウェイト）を低めに設定することをお勧めします。\n"
      : "- **Mixed References**: Both `--sref` (style) and `--cref` (character) are present. Consider lowering `--cw` (character weight) to balance character details and style influence.\n"
  }
  return ""
}

function checkParamConflicts(cards: Card[], isJa: boolean): string {
  const models: string[] = []
  const aspectRatios: string[] = []

  cards.forEach((c) => {
    const text = getCardPromptText(c)
    const vMatch = text.match(/--(v|niji)\s+([0-9a-zA-Z.]+)/i)
    if (vMatch) models.push(vMatch[0].toLowerCase())
    const arMatch = text.match(/--ar\s+(\d+:\d+)/i)
    if (arMatch) aspectRatios.push(arMatch[1])
  })

  let advice = ""
  const uniqueModels = Array.from(new Set(models))
  const uniqueArs = Array.from(new Set(aspectRatios))

  if (uniqueModels.length > 1) {
    advice += isJa
      ? "- **モデルの競合**: 異なるモデルバージョン（" +
        uniqueModels.join(", ") +
        "）が検出されました。生成時はどれか1つのモデルに統一してください。\n"
      : "- **Model Conflict**: Multiple model versions (" +
        uniqueModels.join(", ") +
        ") detected. Unify them under one model parameter when generating.\n"
  }
  if (uniqueArs.length > 1) {
    advice += isJa
      ? "- **アスペクト比の競合**: 異なるアスペクト比（" +
        uniqueArs.join(", ") +
        "）が検出されました。レイアウト崩れを防ぐため、アスペクト比を統一してください。\n"
      : "- **Aspect Ratio Conflict**: Conflicting aspect ratios (" +
        uniqueArs.join(", ") +
        ") detected. Unify them under a single `--ar`.\n"
  }
  return advice
}

function getRecommendedWeights(cards: Card[], isJa: boolean): string {
  const weights = cards.map((c) => c.weight ?? 1.0)
  const allEqual = weights.every((w) => w === weights[0])

  if (allEqual) {
    return isJa
      ? "すべてのカードが同じウェイト（" +
          weights[0] +
          "）に設定されています。均等なブレンド効果が期待されます。"
      : "All cards are set to the same weight (" +
          weights[0] +
          "). An even blending effect is expected."
  }

  const weightDetails = cards
    .map((c) => `${c.name}: ${c.weight ?? 1.0}`)
    .join(", ")
  return isJa
    ? `現在の比率は [${weightDetails}] です。ウェイトが大きいカードの特徴がより強く表現されます。バランスを調整するには比率を 1:1 に近づけてください。`
    : `Current ratios are [${weightDetails}]. The card with the higher weight will dominate. Adjust closer to 1:1 to balance.`
}

function getSuggestedKeywords(cards: Card[]): string[] {
  const keywords: string[] = []
  const categories = Array.from(
    new Set(cards.map((c) => c.category?.toLowerCase() || ""))
  )

  categories.forEach((cat) => {
    if (cat.includes("anime") || cat.includes("manga")) {
      keywords.push("anime style", "key visual", "vibrant colors")
    } else if (cat.includes("cyberpunk") || cat.includes("synthwave")) {
      keywords.push(
        "neon lighting",
        "cyberpunk aesthetic",
        "detailed retrofuturism"
      )
    } else if (cat.includes("photo") || cat.includes("realism")) {
      keywords.push("cinematic lighting", "photorealistic 8k", "depth of field")
    } else if (cat.includes("fantasy") || cat.includes("magic")) {
      keywords.push("ethereal glow", "fantasy concept art", "intricate details")
    }
  })

  if (keywords.length === 0) {
    keywords.push("highly detailed", "sharp focus", "soft lighting")
  }
  return Array.from(new Set(keywords))
}

export function generateStaticRecipeAdvice(
  cards: Card[],
  lang: string
): string {
  if (cards.length < 2) return ""
  const isJa = lang?.startsWith("ja")

  const effectIntro = isJa
    ? `- **基本ブレンド**: [${cards.map((c) => c.name).join(", ")}] の調合。`
    : `- **Basic Blend**: Blending [${cards.map((c) => c.name).join(", ")}].`

  const srefCrefAlert = checkSrefCref(cards, isJa)
  const conflictAlert = checkParamConflicts(cards, isJa)

  const visualEffect = effectIntro + "\n" + srefCrefAlert + conflictAlert

  const weightsText = getRecommendedWeights(cards, isJa)

  const keywords = getSuggestedKeywords(cards)
  const keywordsText = keywords.map((k) => `\`${k}\``).join(", ")

  if (isJa) {
    return `### 💡 レシピ調合アドバイス（簡易モード）

- **期待される視覚的効果**:
  ${visualEffect.trim()}
- **推奨ウェイト比率**:
  ${weightsText}
- **追加キーワードの提案**:
  ${keywordsText} をプロンプトの最後に追加して効果を高めることができます。`
  }

  return `### 💡 Blend Recipe Advice (Light Mode)

- **Expected Visual Blending Effect**:
  ${visualEffect.trim()}
- **Recommended Weights**:
  ${weightsText}
- **Suggested Keywords**:
  You can append ${keywordsText} to the end of the prompt to enhance the results.`
}
