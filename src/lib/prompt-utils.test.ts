import { describe, expect, it } from "vitest"

import type { PromptSegment } from "./db-schema"
import {
  buildPromptString,
  mergePromptSegments,
  parsePrompt
} from "./prompt-utils"

describe("buildPromptString", () => {
  it("should mask both sref and p", () => {
    const segments: PromptSegment[] = [{ type: "text", value: "a cute cat" }]
    const params = { sref: ["url1"], p: ["12345"], ar: "16:9" }
    const result = buildPromptString(segments, params, ["sref", "p"])
    expect(result).toBe("a cute cat --ar 16:9")
  })

  it("should mask only sref", () => {
    const segments: PromptSegment[] = [{ type: "text", value: "a cute cat" }]
    const params = { sref: ["url1"], p: ["12345"], ar: "16:9" }
    const result = buildPromptString(segments, params, ["sref"])
    expect(result).toBe("a cute cat --ar 16:9 --p 12345")
  })

  it("should mask only p", () => {
    const segments: PromptSegment[] = [{ type: "text", value: "a cute cat" }]
    const params = { sref: ["url1"], p: ["12345"], ar: "16:9" }
    const result = buildPromptString(segments, params, ["p"])
    expect(result).toBe("a cute cat --ar 16:9 --sref url1")
  })

  it("should not mask any parameters", () => {
    const segments: PromptSegment[] = [{ type: "text", value: "a cute cat" }]
    const params = { sref: ["url1"], p: ["12345"], ar: "16:9" }
    const result = buildPromptString(segments, params)
    expect(result).toBe("a cute cat --ar 16:9 --sref url1 --p 12345")
  })

  it("should include and support masking imagePrompts", () => {
    const segments: PromptSegment[] = [{ type: "text", value: "a cute cat" }]
    const params = {
      imagePrompts: [
        "https://example.com/img1.png",
        "https://example.com/img2.png"
      ],
      ar: "16:9"
    }

    const unmasked = buildPromptString(segments, params)
    expect(unmasked).toBe(
      "https://example.com/img1.png https://example.com/img2.png a cute cat --ar 16:9"
    )

    const masked = buildPromptString(segments, params, ["imagePrompts"])
    expect(masked).toBe("a cute cat --ar 16:9")
  })

  it("should include and support masking version and niji", () => {
    const segments: PromptSegment[] = [{ type: "text", value: "a cute cat" }]
    const params = { version: "6.0", niji: "6", ar: "16:9" }

    const unmasked = buildPromptString(segments, params)
    expect(unmasked).toBe("a cute cat --ar 16:9 --v 6.0 --niji 6")

    const masked = buildPromptString(segments, params, ["version", "niji"])
    expect(masked).toBe("a cute cat --ar 16:9")
  })
})

describe("parsePrompt", () => {
  it("should extract starting URLs as imagePrompts and keep them out of text segments", () => {
    const prompt =
      "https://s.mj.run/img1 https://s.mj.run/img2 a majestic lion --ar 16:9"
    const { promptSegments, parameters } = parsePrompt(prompt)

    expect(parameters.imagePrompts).toEqual([
      "https://s.mj.run/img1",
      "https://s.mj.run/img2"
    ])
    expect(parameters.ar).toBe("16:9")
    expect(promptSegments).toHaveLength(1)
    expect(promptSegments[0].value).toBe("a majestic lion")
  })

  it("should parse --profile as an alias for --p", () => {
    const prompt = "a cute cat --profile 12345"
    const { parameters } = parsePrompt(prompt)
    expect(parameters.p).toEqual(["12345"])
  })

  it("should handle multiple spaces and complex values for --profile", () => {
    const prompt = "a dog --profile  pcd78d7 owipony  --ar 16:9"
    const { parameters } = parsePrompt(prompt)
    expect(parameters.p).toEqual(["pcd78d7", "owipony"])
    expect(parameters.ar).toBe("16:9")
  })

  it("should handle Japanese delimiters", () => {
    const prompt = "猫、走る。可愛い：猫"
    const { promptSegments } = parsePrompt(prompt)
    // : is a delimiter, but the current regex split might result in different behavior depending on if they are repeated
    // Let's check the current behavior.
    expect(promptSegments.length).toBeGreaterThanOrEqual(3)
    expect(promptSegments[0].value).toBe("猫")
    expect(promptSegments[1].value).toBe("走る")
  })

  it("should parse --v, --version and --niji parameters", () => {
    const prompt2 = "a cute cat --v 6.0"
    const parsed2 = parsePrompt(prompt2)
    expect(parsed2.parameters.version).toBe("6.0")

    const prompt3 = "a cute cat --version 5.2"
    const parsed3 = parsePrompt(prompt3)
    expect(parsed3.parameters.version).toBe("5.2")

    const prompt4 = "a cute cat --niji 6"
    const parsed4 = parsePrompt(prompt4)
    expect(parsed4.parameters.niji).toBe("6")
  })

  it("should not split by space", () => {
    const prompt = "a cute cat running fast"
    const { promptSegments } = parsePrompt(prompt)
    expect(promptSegments).toHaveLength(1)
    expect(promptSegments[0].value).toBe("a cute cat running fast")
  })
})

describe("mergePromptSegments", () => {
  it("should remove duplicate text segments", () => {
    const segments: PromptSegment[] = [
      { type: "text", value: "cat" },
      { type: "text", value: "dog" },
      { type: "text", value: "cat" }
    ]
    const result = mergePromptSegments(segments)
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe("cat")
    expect(result[1].value).toBe("dog")
  })

  it("should keep non-text segments", () => {
    const segments: PromptSegment[] = [
      { type: "text", value: "cat" },
      { type: "slot", label: "color", default: "white" },
      { type: "text", value: "dog" }
    ]
    const result = mergePromptSegments(segments)
    expect(result).toHaveLength(3)
  })
})
