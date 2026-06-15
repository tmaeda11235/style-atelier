/**
 * Regex-based fallback parser for prompt decluttering when local AI is unavailable.
 * Splits Midjourney prompts into clean, modular text segments.
 */
export function declutterPromptFallback(rawPromptText: string): string[] {
  if (!rawPromptText) return []

  // 1. Remove Midjourney parameters (e.g. --ar 16:9, --sref 12345, --v 6.0, etc.)
  // Matches --parameter followed by optional values
  let cleanPrompt = rawPromptText.replace(/--[a-zA-Z0-9]+(?:\s+[^-]+)?/g, "")

  // 2. Normalize whitespace
  cleanPrompt = cleanPrompt.replace(/\s+/g, " ").trim()

  // 3. Split by commas, double colons, or semicolons
  const separators = /,|::|;/
  const rawSegments = cleanPrompt.split(separators)

  // 4. Clean and filter segments
  const segments = rawSegments
    .map((seg) => seg.trim())
    .filter((seg) => {
      if (seg.length === 0) return false
      // Filter out pure numbers or single characters that don't add meaning
      if (/^[0-9]+$/.test(seg)) return false
      // Filter out common standalone filler words
      const lowercase = seg.toLowerCase()
      const fillers = new Set([
        "and",
        "with",
        "of",
        "in",
        "on",
        "at",
        "by",
        "for",
        "to",
        "a",
        "an",
        "the"
      ])
      if (fillers.has(lowercase)) return false
      return true
    })

  // 5. If everything got filtered out but there was original text, fall back to the cleaned prompt itself
  if (segments.length === 0 && cleanPrompt.length > 0) {
    return [cleanPrompt]
  }

  return segments
}
