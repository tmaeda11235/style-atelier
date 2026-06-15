/**
 * Rule-based heuristic recipe advice when AI is not ready/available.
 * Analyzes cards statically and produces advice in Markdown.
 */
interface CardProps {
  id?: string
  name: string
  prompt?: string
  promptSegments?: { type: string; value: string; default?: string }[]
  weight?: number
  rarity?: string
  category?: string
}

function getVisualEffect(cardData: any[], isJa: boolean): string {
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

function getRecommendedWeights(cardData: any[], isJa: boolean): string {
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

function getSuggestedKeywords(cardData: any[], isJa: boolean): string {
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

function formatAdvice(
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

  const visualEffect = getVisualEffect(cardData, isJa)
  const recommendedWeights = getRecommendedWeights(cardData, isJa)
  const suggestedKeywords = getSuggestedKeywords(cardData, isJa)

  return formatAdvice(visualEffect, recommendedWeights, suggestedKeywords, isJa)
}
