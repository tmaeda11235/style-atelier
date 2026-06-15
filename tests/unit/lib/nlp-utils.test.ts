import { extractKeywords } from "@/lib/nlp-utils"
import { describe, expect, it } from "vitest"

describe("extractKeywords", () => {
  // 1. Basic English & Japanese validation with toEqual
  it("should extract keywords from English prompt using strict assertion", () => {
    const prompt = "A cute cat, cinematic lighting, 8k --ar 16:9"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["cute", "cat", "cinematic lighting", "8k"])
  })

  it("should extract keywords from Japanese prompt using BudouX with strict assertion", () => {
    const prompt = "夕焼けの都会を歩く少女, 街灯が輝く, アニメスタイル"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual([
      "夕焼けの",
      "都会を",
      "歩く",
      "少女",
      "街灯が",
      "輝く",
      "アニメスタイル"
    ])
  })

  // 2. Edge Cases and Input Sanitization
  it("should handle empty, null-like, or whitespace-only inputs", () => {
    expect(extractKeywords("")).toEqual([])
    expect(extractKeywords("   ")).toEqual([])
    expect(extractKeywords(",,,,")).toEqual([])
    expect(extractKeywords("   ,   ,   ")).toEqual([])
    expect(extractKeywords(undefined as any)).toEqual([])
    expect(extractKeywords(null as any)).toEqual([])
  })

  it("should ignore punctuation-only segments or single character words", () => {
    expect(extractKeywords("a, i, x, ab, !?")).toEqual(["ab"])
  })

  it("should remove leading/trailing punctuation from words", () => {
    expect(extractKeywords("(hello), [world]!, ;test:")).toEqual([
      "hello",
      "[world]",
      "test"
    ])
  })

  // 3. URLs and Midjourney Parameters
  it("should clean leading URLs and Midjourney parameters", () => {
    const prompt =
      "https://s.mj.run/abc https://s.mj.run/def A majestic lion, sunset --ar 16:9 --v 6.0 --style raw --chaos 50"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["majestic", "lion", "sunset"])
  })

  it("should not clean URLs that are not at the very beginning", () => {
    const prompt = "A majestic lion, https://s.mj.run/abc, sunset"
    const keywords = extractKeywords(prompt)
    // URLs in the middle are split by period '.' in the extractKeywords regex split(/[.!?;]+/)
    // So "https://s.mj.run/abc" becomes "https://s", "mj", "run/abc"
    expect(keywords).toEqual([
      "majestic",
      "lion",
      "https://s",
      "mj",
      "run/abc",
      "sunset"
    ])
  })

  it("should handle Midjourney parameters with text arguments", () => {
    const prompt = "cyberpunk ninja --no cats dog --ar 16:9"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["cyberpunk ninja"])
  })

  // 4. Case Sensitivity, Duplicates & Stopwords
  it("should filter out English stopwords case-insensitively", () => {
    const prompt = "THE cat, Is A cute dog, under An umbrella"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["cat", "cute", "dog", "umbrella"])
  })

  it("should prevent duplicate keywords case-insensitively", () => {
    const prompt = "cyberpunk, CYBERPUNK, Cyberpunk, CYBERpunk"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["cyberpunk"])
  })

  it("should handle duplicate checks across different segments and case changes", () => {
    const prompt = "Neon Lighting, neon lighting, NEON LIGHTING"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["Neon Lighting"])
  })

  // 5. English Segment Routing and Branch Coverage (processEnglishSegment)
  it("should route to individual word processing when segment has stopwords or is long", () => {
    expect(extractKeywords("cute and cat")).toEqual(["cute", "cat"])
    expect(extractKeywords("red green blue")).toEqual(["red", "green", "blue"])
  })

  it("should route to whole segment processing when segment has no stopwords and is short", () => {
    expect(extractKeywords("neon lighting")).toEqual(["neon lighting"])
  })

  // Kill mutants in processEnglishSegment then branch (length filter & case-insensitive duplicates)
  it("should filter out single character words and check duplicates case-insensitively in the then branch", () => {
    const prompt = "cute and x cat CUTE"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["cute", "cat"])
  })

  // Kill mutants in processEnglishSegment else branch:
  it("should correctly handle duplicate checks in the else branch of processEnglishSegment", () => {
    const prompt = "cute and cat, CUTE"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["cute", "cat"])
  })

  // 6. Sentence Splitting (split by . ! ? ;)
  it("should split segments by sentence punctuation", () => {
    const prompt = "Hello world! This is a test; it works. Cool?"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["Hello world", "test", "works", "Cool"])
  })

  // 7. Mixed Japanese and English prompt
  it("should handle mixed Japanese and English prompts correctly", () => {
    const prompt = "夕焼けの都会, cinematic lighting, アニメスタイル"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual([
      "夕焼けの",
      "都会",
      "cinematic lighting",
      "アニメスタイル"
    ])
  })

  // 8. Trimming & Empty Filtering validations (kills segments/subSegments map & filter mutants)
  it("should strictly trim segments and filter out empty segments/subsegments", () => {
    const prompt = "  cat  , ,   dog   ! ! ?   mouse  .  "
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["cat", "dog", "mouse"])
  })

  // 9. Additional targeted tests to kill newly found survivors
  it("should handle multiple continuous spaces in English segments and process them via the else branch", () => {
    // "cute   cat" has multiple spaces, but split(/\s+/) maps to ["cute", "cat"] (length 2, no stopwords).
    // It should route to the else branch and return ["cute   cat"].
    // If filter(Boolean) or split(/\s+/) is modified, it might route to the then branch and return ["cute", "cat"].
    const prompt = "cute   cat"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["cute   cat"])
  })

  it("should handle repeating punctuation marks and filter out intermediate empty subsegments", () => {
    // "Hello... world" split by /[.!?;]+/ -> ["Hello", "world"]
    // "Hello... world" split by /[.!?;]/ (mutant) -> ["Hello", "", "", "world"]
    // The filter(Boolean) must correctly remove empty strings.
    const prompt = "Hello... world!!!, test"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["Hello", "world", "test"])
  })

  it("should prevent duplicate keywords in Japanese segments case-insensitively", () => {
    const prompt = "都会の少女\u3001森の少女"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["都会の", "少女", "森の"])
  })

  // 10. Kill targeted mutants for nlp-utils
  it("should filter out Japanese chunks of length 1 or less (BudouX parsing boundary)", () => {
    // "と" is length 1 and should be filtered out by trimmed.length > 1.
    // "少女" is length 2 and should be kept.
    const prompt = "と、少女"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["少女"])
  })

  it("should eliminate duplicate English words within Japanese segments case-insensitively", () => {
    // "都会のiPhone、都会のiphone" -> containsJapanese is true for both segments.
    // The English words "iPhone" and "iphone" are parsed as separate chunks.
    // Duplicate check must be case-insensitive, returning only "iPhone" once.
    const prompt = "都会のiPhone、都会のiphone"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["都会の", "iPhone"])
  })

  it("should route to else branch and preserve the whole segment even when intermediate words become empty after cleaning", () => {
    // "cute : cat" has words ["cute", ":", "cat"].
    // After cleanWord, it becomes ["cute", "", "cat"].
    // filter(Boolean) makes it ["cute", "cat"] (length 2, no stopwords), routing to else branch -> returns ["cute : cat"].
    // If filter(Boolean) is mutated (removed), length remains 3, routing to then branch -> returns ["cute", "cat"].
    const prompt = "cute : cat"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["cute : cat"])
  })

  // 11. Kill more surviving mutants in cleanPromptText and cleanWord
  it("should clean leading URLs even when there are leading spaces", () => {
    // If the initial trim() is removed from cleanPromptText, the URL will not match ^https? and won't be cleaned.
    const prompt = "  https://s.mj.run/abc  majestic lion"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["majestic lion"])
  })

  it("should clean leading HTTP URLs in addition to HTTPS URLs", () => {
    // If https? is mutated to https, http URLs will not be cleaned.
    const prompt = "http://s.mj.run/abc majestic lion"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["majestic lion"])
  })

  it("should not stop parameter cleaning at a non-spaced double-hyphen unless mutated", () => {
    // If \s in (?=\s--|$|[\r\n]) is mutated to \S, it will match the non-spaced "-- majestic lion" boundary,
    // causing parameter removal to stop early and leak the remaining un-parsed parameter.
    const prompt = "cute cat --ar 16:9-- majestic lion"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["cute cat"])
  })

  it("should remove multiple nested leading and trailing punctuation from words", () => {
    // If + is mutated/removed from cleanWord's regex, only a single punctuation mark is removed, leaving "(hello)".
    const prompt = "((hello))"
    const keywords = extractKeywords(prompt)
    expect(keywords).toEqual(["hello"])
  })
})
