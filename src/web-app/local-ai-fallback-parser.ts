/**
 * Types and configurations for Local AI fallback.
 */

export interface InferenceMetrics {
  latencyMs: number
  tokensPerSec: number
  estimatedTokens: number
  vramBytes: number
}

export interface InferenceResult {
  result: string
  metrics: InferenceMetrics
}

export interface ModelInfo {
  filename: string
  url: string
  size: number
}

export const STANDARD_MODEL: ModelInfo = {
  filename: "gemma-4-E2B-it-web.litertlm",
  url: "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm",
  size: 2008432640
}

export const LIGHTWEIGHT_MODEL: ModelInfo = {
  filename: "qwen-0.5b-it-web.litertlm",
  url: "https://huggingface.co/litert-community/qwen2.5-0.5b-instruct-litert-lm/resolve/main/qwen2.5-0.5b-instruct-web.litertlm",
  size: 500000000
}

interface FallbackRule {
  keywords: string[]
  genreJa: string
  genreEn: string
  tags: string[]
  summaryJa: string
  summaryEn: string
}

const FALLBACK_RULES: FallbackRule[] = [
  {
    keywords: ["cyberpunk", "cyber"],
    genreJa: "サイバーパンク",
    genreEn: "Cyberpunk",
    tags: ["cyberpunk", "neon", "futuristic", "sci-fi"],
    summaryJa: "ネオンが輝く未来的でサイバーパンクなアートスタイル。",
    summaryEn: "A futuristic cyberpunk art style with vibrant neon lights."
  },
  {
    keywords: ["anime", "manga"],
    genreJa: "アニメ",
    genreEn: "Anime",
    tags: ["anime", "illustration", "cel-shading", "2d"],
    summaryJa: "鮮やかな色彩が特徴的な現代アニメ調のイラストスタイル。",
    summaryEn: "A modern anime-style illustration with vibrant colors."
  },
  {
    keywords: ["watercolor", "water-color"],
    genreJa: "水彩画",
    genreEn: "Watercolor",
    tags: ["watercolor", "painting", "artistic", "soft"],
    summaryJa: "柔らかい色調の繊細な水彩画スタイル。",
    summaryEn: "A delicate watercolor painting style with soft tones."
  },
  {
    keywords: ["photorealistic", "realistic", "photography"],
    genreJa: "写真・リアル",
    genreEn: "Photorealistic",
    tags: ["realistic", "photo", "hyper-detailed", "3d"],
    summaryJa: "現実感のある高精細な写真調のスタイル。",
    summaryEn:
      "A high-fidelity photorealistic style resembling real photography."
  },
  {
    keywords: ["fantasy", "magic"],
    genreJa: "ファンタジー",
    genreEn: "Fantasy",
    tags: ["fantasy", "magic", "mystical", "illustration"],
    summaryJa: "魔法や神秘的な要素に満ちた幻想的なファンタジースタイル。",
    summaryEn: "A mystical fantasy style filled with magical elements."
  }
]

/**
 * Static rule-based parser for Local AI fallback.
 * Extracts basic genre, tags, and summary from prompt in case of LLM inference failure.
 */
export function fallbackStaticParser(prompt: string): string {
  const isJa =
    typeof navigator !== "undefined" && navigator.language?.startsWith("ja")
  const normalized = prompt.toLowerCase()

  for (const rule of FALLBACK_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      return JSON.stringify({
        genre: isJa ? rule.genreJa : rule.genreEn,
        tags: rule.tags,
        summary: isJa ? rule.summaryJa : rule.summaryEn
      })
    }
  }

  return JSON.stringify({
    genre: isJa ? "デフォルト" : "Default",
    tags: ["style", "art"],
    summary: isJa
      ? "入力プロンプトに基づく汎用的なアートスタイル。"
      : "A general art style based on the input prompt."
  })
}

export function checkMemoryRestricted(): boolean {
  if (typeof navigator === "undefined") return false

  // iOS UA Check
  const ua = navigator.userAgent || ""
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

  // navigator.deviceMemory Check
  const deviceMemory = (navigator as any).deviceMemory
  if (deviceMemory !== undefined && deviceMemory < 4) {
    return true
  }

  if (isIOS) {
    return true
  }

  return false
}

export function getActiveModel(dynamicMemoryRestricted: boolean): ModelInfo {
  if (checkMemoryRestricted() || dynamicMemoryRestricted) {
    return LIGHTWEIGHT_MODEL
  }
  return STANDARD_MODEL
}
