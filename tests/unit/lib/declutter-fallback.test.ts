import { describe, expect, it } from "vitest"

import { declutterFallback } from "../../../src/lib/ai/declutter-fallback"

describe("declutterFallback", () => {
  it("should split prompt by commas and remove extra spaces", () => {
    const prompt = "a beautiful cyberpunk girl, in a neon alley, glowing lights"
    const result = declutterFallback(prompt)
    expect(result).toEqual([
      { type: "text", value: "a beautiful cyberpunk girl" },
      { type: "text", value: "in a neon alley" },
      { type: "text", value: "glowing lights" }
    ])
  })

  it("should remove Midjourney parameters and image URLs", () => {
    const prompt =
      "https://example.com/img.jpg a beautiful cyberpunk girl --ar 16:9 --style raw"
    const result = declutterFallback(prompt)
    expect(result).toEqual([
      { type: "text", value: "a beautiful cyberpunk girl" }
    ])
  })

  it("should support multiple delimiters including newlines, Japanese punctuation and semicolons", () => {
    const prompt =
      "cyberpunk girl\nneon lights; photorealistic、glowing eye。cool"
    const result = declutterFallback(prompt)
    expect(result).toEqual([
      { type: "text", value: "cyberpunk girl" },
      { type: "text", value: "neon lights" },
      { type: "text", value: "photorealistic" },
      { type: "text", value: "glowing eye" },
      { type: "text", value: "cool" }
    ])
  })

  it("should parse Midjourney weight specifier :: correctly", () => {
    const prompt = "cyberpunk girl::2, neon lights::0.5, photorealistic"
    const result = declutterFallback(prompt)
    expect(result).toEqual([
      { type: "text", value: "cyberpunk girl", weight: 2 },
      { type: "text", value: "neon lights", weight: 0.5 },
      { type: "text", value: "photorealistic" }
    ])
  })

  it("should remove duplicate segments case-insensitively", () => {
    const prompt = "cyberpunk girl, Cyberpunk Girl, Neon Lights"
    const result = declutterFallback(prompt)
    expect(result).toEqual([
      { type: "text", value: "cyberpunk girl" },
      { type: "text", value: "Neon Lights" }
    ])
  })

  it("should return fallback segment if all parts are cleaned out", () => {
    const prompt = "https://example.com/img.jpg --ar 16:9"
    const result = declutterFallback(prompt)
    expect(result).toEqual([
      { type: "text", value: "https://example.com/img.jpg --ar 16:9" }
    ])
  })

  it("should return empty array for empty inputs", () => {
    expect(declutterFallback("")).toEqual([])
    expect(declutterFallback("   ")).toEqual([])
  })
})
