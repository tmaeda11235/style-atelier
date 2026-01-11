import { describe, it, expect } from "vitest"
import { extractKeywords } from "./nlp-utils"

describe("extractKeywords", () => {
  it("should extract keywords from English prompt", () => {
    const prompt = "A cute cat, cinematic lighting, 8k --ar 16:9"
    const keywords = extractKeywords(prompt)
    expect(keywords).toContain("A cute cat")
    expect(keywords).toContain("cinematic lighting")
    expect(keywords).toContain("8k")
    expect(keywords).not.toContain("--ar 16:9")
  })

  it("should extract keywords from Japanese prompt using BudouX", () => {
    const prompt = "夕焼けの都会を歩く少女, 街灯が輝く, アニメスタイル"
    const keywords = extractKeywords(prompt)
    // BudouX might split "夕焼けの都会を歩く少女" into smaller chunks
    expect(keywords.length).toBeGreaterThan(3)
    expect(keywords).toContain("夕焼けの")
    expect(keywords).toContain("都会を")
    expect(keywords).toContain("アニメスタイル")
  })

  it("should remove punctuation from keywords", () => {
    const prompt = "Hello world! This is a test. --v 6.0"
    const keywords = extractKeywords(prompt)
    expect(keywords).toContain("Hello world")
    expect(keywords).toContain("This is a test")
  })

  it("should handle empty or null prompt", () => {
    expect(extractKeywords("")).toEqual([])
  })
})