import { loadDefaultJapaneseParser } from "budoux"

const parser = loadDefaultJapaneseParser()

// Common English stopwords (function words) to be filtered out
const ENGLISH_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "with",
  "by",
  "for",
  "of",
  "to",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "am",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "they",
  "them",
  "their",
  "as",
  "at",
  "by",
  "for",
  "with",
  "about",
  "against",
  "between",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "to",
  "from",
  "up",
  "down",
  "in",
  "out",
  "on",
  "off",
  "over",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "s",
  "t",
  "can",
  "will",
  "just",
  "don",
  "should",
  "now"
])

/**
 * Checks if a string contains any Japanese characters (Hiragana, Katakana, or Kanji).
 */
const containsJapanese = (text: string): boolean => {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

/**
 * Clean starting URLs (image prompts) and Midjourney parameters.
 */
function cleanPromptText(prompt: string): string {
  let cleanPrompt = prompt.trim()

  // Remove image prompts (URLs at the beginning of the prompt)
  while (true) {
    const match = cleanPrompt.match(/^(https?:\/\/[^\s]+)/)
    if (!match) break
    cleanPrompt = cleanPrompt.substring(match[1].length).trim()
  }

  // Midjourneyのパラメータ（--から始まるもの）を除去
  return cleanPrompt
    .replace(/--[a-z0-9-]+[^\r\n]*?(?=\s--|$|[\r\n])/g, "")
    .trim()
}

/**
 * Remove leading and trailing punctuation and trim whitespace.
 */
function cleanWord(word: string): string {
  return word.trim().replace(/^[."':;!?,()]+|[."':;!?,()]+$/g, "")
}

/**
 * Process a sub-segment containing Japanese characters.
 */
function processJapaneseSegment(
  sub: string,
  seen: Set<string>,
  keywords: string[]
): void {
  const chunks = parser.parse(sub)
  for (const chunk of chunks) {
    const trimmed = cleanWord(chunk)
    if (trimmed && trimmed.length > 1 && !seen.has(trimmed.toLowerCase())) {
      keywords.push(trimmed)
      seen.add(trimmed.toLowerCase())
    }
  }
}

/**
 * Process a sub-segment containing English/foreign words.
 */
function processEnglishSegment(
  sub: string,
  seen: Set<string>,
  keywords: string[]
): void {
  const words = sub.split(/\s+/).map(cleanWord).filter(Boolean)
  const hasStopword = words.some((w) => ENGLISH_STOPWORDS.has(w.toLowerCase()))
  const isLong = words.length > 2

  if (hasStopword || isLong) {
    for (const word of words) {
      if (
        word &&
        word.length > 1 &&
        !ENGLISH_STOPWORDS.has(word.toLowerCase()) &&
        !seen.has(word.toLowerCase())
      ) {
        keywords.push(word)
        seen.add(word.toLowerCase())
      }
    }
  } else {
    const trimmed = cleanWord(sub)
    if (trimmed && trimmed.length > 1 && !seen.has(trimmed.toLowerCase())) {
      keywords.push(trimmed)
      seen.add(trimmed.toLowerCase())
    }
  }
}

/**
 * プロンプトからキーワード（カード名やタグの候補）を抽出する
 * 1. カンマで分割
 * 2. 各要素を言語に応じて適切に分割（日本語ならBudouX、英語ならスペース分割＋ストップワード除去）
 * 3. 不要な空白や記号をクリーンアップ
 */
export function extractKeywords(prompt: string): string[] {
  if (!prompt) return []

  const cleanPrompt = cleanPromptText(prompt)
  const segments = cleanPrompt
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const keywords: string[] = []
  const seen = new Set<string>()

  for (const segment of segments) {
    const subSegments = segment
      .split(/[.!?;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    for (const sub of subSegments) {
      if (containsJapanese(sub)) {
        processJapaneseSegment(sub, seen, keywords)
      } else {
        processEnglishSegment(sub, seen, keywords)
      }
    }
  }

  return keywords
}
