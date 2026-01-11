import { loadDefaultJapaneseParser } from "budoux"

const parser = loadDefaultJapaneseParser()

/**
 * プロンプトからキーワード（カード名やタグの候補）を抽出する
 * 1. カンマで分割
 * 2. 各要素をBudouXでさらに分割
 * 3. 不要な空白や記号をクリーンアップ
 */
export function extractKeywords(prompt: string): string[] {
  if (!prompt) return []

  // Midjourneyのパラメータ（--から始まるもの）を除去
  const cleanPrompt = prompt.replace(/--[a-z0-9-]+[^\r\n]*?(?=\s--|$|[\r\n])/g, "").trim()

  // 1. カンマで分割
  const segments = cleanPrompt.split(",").map((s) => s.trim()).filter(Boolean)

  const keywords: string[] = []
  const seen = new Set<string>()

  for (const segment of segments) {
    // 2. さらに句点で分割（英語などでBudouXが反応しにくい場合のため）
    const subSegments = segment.split(/[.!?;]+/).map((s) => s.trim()).filter(Boolean)

    for (const sub of subSegments) {
      // 3. BudouXで分割（日本語や長いフレーズ対策）
      const chunks = parser.parse(sub)

      for (const chunk of chunks) {
        const trimmed = chunk.trim().replace(/^[."':;!?,]+|[."':;!?,]+$/g, "")
        if (trimmed && trimmed.length > 1 && !seen.has(trimmed.toLowerCase())) {
          keywords.push(trimmed)
          seen.add(trimmed.toLowerCase())
        }
      }
    }
  }

  return keywords
}