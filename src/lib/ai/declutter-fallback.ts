import type { PromptSegment } from "../db-schema"

/**
 * プロンプトから不要なパラメータと画像を削除する
 */
function cleanPromptText(rawPrompt: string): string {
  // 1. パラメータの除去 (--ar 16:9, --style raw など)
  const clean = rawPrompt.replace(/--[a-z0-9-]+\s*([^--]*)/gi, "")
  // 2. 画像プロンプト（URL）の除去
  return clean.replace(/https?:\/\/[^\s]+/gi, "")
}

/**
 * 個々のセグメントテキストを :: でパースして segments 配列に追加する
 */
function parseAndAddParts(
  segWithColons: string,
  segments: PromptSegment[]
): void {
  const parts = segWithColons.split("::")

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim()
    if (!part) continue

    const numValue = Number(part)
    if (!isNaN(numValue) && i > 0 && segments.length > 0) {
      segments[segments.length - 1].weight = numValue
    } else {
      segments.push({
        type: "text",
        value: part
      })
    }
  }
}

/**
 * プロンプトをセグメントに分割し、重みを設定する
 */
function splitIntoSegments(cleanPrompt: string): PromptSegment[] {
  const doubleColonPlaceholder = "__DBL_CLN__"
  const tempPrompt = cleanPrompt.replace(/::/g, doubleColonPlaceholder)

  // 区切り文字：`,`, `、`, `。`, `;`, `\n`, `\r`, `:` で分割
  const delimiterRegex = /[,、。;\n\r:]+/
  const rawSegments = tempPrompt.split(delimiterRegex)

  const segments: PromptSegment[] = []

  for (const rawSeg of rawSegments) {
    const trimmed = rawSeg.trim()
    if (!trimmed) continue

    const segWithColons = trimmed.replace(
      new RegExp(doubleColonPlaceholder, "g"),
      "::"
    )
    parseAndAddParts(segWithColons, segments)
  }

  return segments
}

/**
 * AIによるプロンプト整理（De-cluttering）が使えない場合用の、
 * 正規表現/ルールベースの軽量フォールバック処理。
 */
export function declutterFallback(rawPrompt: string): PromptSegment[] {
  if (!rawPrompt || !rawPrompt.trim()) {
    return []
  }

  const cleaned = cleanPromptText(rawPrompt)
  const segments = splitIntoSegments(cleaned)

  // 重複除去
  const seen = new Set<string>()
  const uniqueSegments = segments.filter((seg) => {
    const normalized = seg.value.toLowerCase()
    if (seen.has(normalized)) {
      return false
    }
    seen.add(normalized)
    return true
  })

  // セーフガード：結果が空の場合は元のプロンプトをそのまま返す
  if (uniqueSegments.length === 0) {
    const fallbackText = rawPrompt.replace(/\s+/g, " ").trim()
    if (fallbackText) {
      uniqueSegments.push({ type: "text", value: fallbackText })
    }
  }

  return uniqueSegments
}
