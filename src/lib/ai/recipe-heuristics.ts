/**
 * Rule-based heuristic recipe advice when AI is not ready/available.
 * Analyzes cards statically and produces advice in Markdown.
 */
interface CardProps {
  id?: string
  name: string
  prompt?: string
  promptSegments?: { type?: string; value?: string; default?: string }[]
  weight?: number
  rarity?: string
  category?: string
}

// ==========================================
// 1. generateRecipeAdviceHeuristics (from HEAD)
// ==========================================

function getVisualEffectHeuristics(cardData: any[], isJa: boolean): string {
  const c0 = cardData[0]
  const c1 = cardData[1]
  const hasDiffCategory =
    c0.category !== c1.category &&
    c0.category !== "General" &&
    c1.category !== "General"

  if (isJa) {
    const listNames = cardData.map((c) => `"${c.name}"`).join(", ")
    const desc = hasDiffCategory
      ? `- **${c0.category}**のスタイル構成と**${c1.category}**のテイストが融合し、独特なハイブリッドビジュアルを創出します。\n`
      : `- 両スタイルが持つテクスチャと構成要素が均一に重なり合い、調和のとれたアートワークに仕上がります。\n`
    return `**「${c0.name}」** と **「${c1.name}」** のブレンドによるシナジー効果が期待されます。\n${desc}- 各カードのプロンプト（${listNames}）の要素が重み付けに従って合成されます。`
  }

  const listNames = cardData.map((c) => `"${c.name}"`).join(", ")
  const desc = hasDiffCategory
    ? `- Merges the structural style of **${c0.category}** with the aesthetic vibes of **${c1.category}** to create a unique hybrid visual.\n`
    : `- The textures and composition of both styles overlay smoothly, resulting in a well-balanced artwork.\n`
  return `A creative synergy is expected by blending **"${c0.name}"** and **"${c1.name}"**.\n${desc}- Elements from ${listNames} will be integrated based on their respective weights.`
}

function getRecommendedWeightsHeuristics(cardData: any[], isJa: boolean): string {
  const weightSum = cardData.reduce((sum, c) => sum + (c.weight ?? 1.0), 0)
  const ratioStr = cardData
    .map((c) => `${Math.round(((c.weight ?? 1.0) / (weightSum || 1)) * 100)}%`)
    .join(" : ")

  if (isJa) {
    let lines = "全体のバランスをとるための推奨値です：\n"
    cardData.forEach((c) => {
      let suggestion = "1.0 (標準)"
      if (c.rarity === "Legendary" || c.rarity === "Epic") {
        suggestion = "1.2〜1.5 (特徴を際立たせるため高めに設定)"
      } else if (c.rarity === "Common") {
        suggestion = "0.8〜1.0 (ベースとしてなじませる)"
      }
      lines += `- **${c.name}**: ${suggestion} (現在設定: ${c.weight})\n`
    })
    lines += `> [!NOTE]\n> 全体の影響力の比率を ${ratioStr} にすると、両方の個性を均等に表現しやすくなります。`
    return lines
  }

  let lines = "Recommended values to balance the blend:\n"
  cardData.forEach((c) => {
    let suggestion = "1.0 (standard)"
    if (c.rarity === "Legendary" || c.rarity === "Epic") {
      suggestion = "1.2 - 1.5 (boosted to highlight its signature features)"
    } else if (c.rarity === "Common") {
      suggestion = "0.8 - 1.0 (balanced base)"
    }
    lines += `- **${c.name}**: ${suggestion} (Current: ${c.weight})\n`
  })
  lines += `> [!NOTE]\n> Target an influence ratio of ${ratioStr} to ensure both styles contribute clearly to the generation.`
  return lines
}

function getSuggestedKeywordsHeuristics(cardData: any[], isJa: boolean): string {
  const allWords = cardData
    .flatMap((c) => (c.prompt || "").split(/[\s,.:;]+/))
    .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length > 3)

  const stopWords = new Set([
    "style",
    "with",
    "from",
    "concept",
    "artstation",
    "trending",
    "detail",
    "highly",
    "quality",
    "photorealistic",
    "rendering",
    "hyperrealistic"
  ])
  const candidateKeywords = Array.from(new Set(allWords))
    .filter((w) => !stopWords.has(w))
    .slice(0, 4)

  if (candidateKeywords.length < 2) {
    candidateKeywords.push(
      "cinematic lighting",
      "octane render",
      "masterpiece",
      "8k resolution"
    )
  }

  const list = candidateKeywords.join(", ")

  if (isJa) {
    return `ブレンド効果を高めるための相乗効果のあるキーワードです：\n- **${list}**\nさらにビジュアルを洗練させたい場合は、全体のトーンを合わせるための修飾子（例: \`cinematic lighting\`, \`detailed textures\`）を追加してください。`
  }

  return `Keywords to reinforce and enrich the blending effect:\n- **${list}**\nTo further refine the visual direction, consider appending atmospheric modifiers such as \`cinematic lighting\` or \`detailed textures\` to align the overall style.`
}

function formatAdviceHeuristics(
  visualEffect: string,
  recommendedWeights: string,
  suggestedKeywords: string,
  isJa: boolean
): string {
  if (isJa) {
    return `### 💡 自動生成された調合アドバイス (軽量フォールバックモード)

#### 期待される視覚的効果
${visualEffect}

#### 推奨ウェイト比率
${recommendedWeights}

#### 追加キーワードの提案
${suggestedKeywords}

---
> [!TIP]
> ローカルAIモデルがダウンロードされ準備ができると、ニューラルネットワークによるさらに高度でコンテキストに応じたアドバイスを受けることができます。`
  }

  return `### 💡 Recipe Blending Advice (Light Fallback Mode)

#### Expected Visual Blending Effect
${visualEffect}

#### Recommended Weights
${recommendedWeights}

#### Suggested Keywords
${suggestedKeywords}

---
> [!TIP]
> Once the local AI model is downloaded and ready, you will receive more advanced, context-aware suggestions powered by the local neural network.`
}

export function generateRecipeAdviceHeuristics(
  cards: CardProps[],
  lang: string
): string {
  if (cards.length < 2) return ""

  const isJa = lang?.startsWith("ja")
  const cardData = cards.map((c) => ({
    name: c.name,
    prompt: c.promptSegments
      ? c.promptSegments.map((s) => s.value || s.default || "").join(" ")
      : c.prompt || "",
    weight: c.weight ?? 1.0,
    rarity: c.rarity || "Common",
    category: c.category || "General"
  }))

  const visualEffect = getVisualEffectHeuristics(cardData, isJa)
  const recommendedWeights = getRecommendedWeightsHeuristics(cardData, isJa)
  const suggestedKeywords = getSuggestedKeywordsHeuristics(cardData, isJa)

  return formatAdviceHeuristics(visualEffect, recommendedWeights, suggestedKeywords, isJa)
}

// ==========================================
// 2. generateStaticRecipeAdvice (from origin/main)
// ==========================================

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

function getRecommendedWeightsStatic(cards: Card[], isJa: boolean): string {
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

function getSuggestedKeywordsStatic(cards: Card[]): string[] {
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

  const weightsText = getRecommendedWeightsStatic(cards, isJa)

  const keywords = getSuggestedKeywordsStatic(cards)
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
