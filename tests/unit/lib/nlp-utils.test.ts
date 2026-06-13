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
})
