import { describe, expect, it } from "vitest"

import type { PromptSegment } from "./db-schema"
import {
  buildMergedPromptString,
  buildPromptString,
  mergePromptSegments,
  mergeReferences,
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

  it("should format multiple sref URLs or p values separated by space", () => {
    const segments: PromptSegment[] = [{ type: "text", value: "cat" }]
    const params = {
      sref: ["url1", "url2"],
      cref: ["urlC1", "urlC2"],
      p: ["p1", "p2"]
    }
    const result = buildPromptString(segments, params)
    expect(result).toBe("cat --sref url1 url2 --cref urlC1 urlC2 --p p1 p2")
  })

  it("should correctly handle individual masking for all parameters", () => {
    const segments: PromptSegment[] = [{ type: "text", value: "cat" }]
    const params = {
      ar: "16:9",
      sref: ["urlS"],
      cref: ["urlC"],
      p: ["p1"],
      stylize: 100,
      chaos: 20,
      weird: 30,
      tile: true,
      raw: true,
      version: "6.0",
      niji: "6"
    }

    // Default maskedKeys should be empty, testing default parameter value
    expect(buildPromptString(segments, params)).toBe(
      "cat --ar 16:9 --sref urlS --cref urlC --p p1 --s 100 --c 20 --w 30 --tile --style raw --v 6.0 --niji 6"
    )

    // Individual mask tests
    expect(buildPromptString(segments, params, ["ar"])).toBe(
      "cat --sref urlS --cref urlC --p p1 --s 100 --c 20 --w 30 --tile --style raw --v 6.0 --niji 6"
    )
    expect(buildPromptString(segments, params, ["sref"])).toBe(
      "cat --ar 16:9 --cref urlC --p p1 --s 100 --c 20 --w 30 --tile --style raw --v 6.0 --niji 6"
    )
    expect(buildPromptString(segments, params, ["cref"])).toBe(
      "cat --ar 16:9 --sref urlS --p p1 --s 100 --c 20 --w 30 --tile --style raw --v 6.0 --niji 6"
    )
    expect(buildPromptString(segments, params, ["p"])).toBe(
      "cat --ar 16:9 --sref urlS --cref urlC --s 100 --c 20 --w 30 --tile --style raw --v 6.0 --niji 6"
    )
    expect(buildPromptString(segments, params, ["stylize"])).toBe(
      "cat --ar 16:9 --sref urlS --cref urlC --p p1 --c 20 --w 30 --tile --style raw --v 6.0 --niji 6"
    )
    expect(buildPromptString(segments, params, ["chaos"])).toBe(
      "cat --ar 16:9 --sref urlS --cref urlC --p p1 --s 100 --w 30 --tile --style raw --v 6.0 --niji 6"
    )
    expect(buildPromptString(segments, params, ["weird"])).toBe(
      "cat --ar 16:9 --sref urlS --cref urlC --p p1 --s 100 --c 20 --tile --style raw --v 6.0 --niji 6"
    )
    expect(buildPromptString(segments, params, ["tile"])).toBe(
      "cat --ar 16:9 --sref urlS --cref urlC --p p1 --s 100 --c 20 --w 30 --style raw --v 6.0 --niji 6"
    )
    expect(buildPromptString(segments, params, ["raw"])).toBe(
      "cat --ar 16:9 --sref urlS --cref urlC --p p1 --s 100 --c 20 --w 30 --tile --v 6.0 --niji 6"
    )
    expect(buildPromptString(segments, params, ["version"])).toBe(
      "cat --ar 16:9 --sref urlS --cref urlC --p p1 --s 100 --c 20 --w 30 --tile --style raw --niji 6"
    )
    expect(buildPromptString(segments, params, ["niji"])).toBe(
      "cat --ar 16:9 --sref urlS --cref urlC --p p1 --s 100 --c 20 --w 30 --tile --style raw --v 6.0"
    )
  })

  it("should handle empty or whitespace-only segments and chip segments properly without extra delimiters or spaces", () => {
    const segments: PromptSegment[] = [
      { type: "text", value: "  " },
      { type: "text", value: "cat" },
      { type: "chip", label: "color", default: "white" },
      { type: "text", value: "" },
      { type: "text", value: "dog" }
    ]
    const result = buildPromptString(segments, {})
    expect(result).toBe("cat, dog")
  })

  it("should normalize multiple consecutive whitespace characters into a single space", () => {
    const segments: PromptSegment[] = [
      { type: "text", value: "a   cute    cat" }
    ]
    const params = {
      imagePrompts: ["https://example.com/1.png", "https://example.com/2.png"],
      ar: "16:9"
    }
    const result = buildPromptString(segments, params)
    expect(result).toBe(
      "https://example.com/1.png https://example.com/2.png a cute cat --ar 16:9"
    )
  })

  it("should handle weight and cardWeight fallback logic correctly", () => {
    // 1. seg.weight is defined, cardWeight is defined -> seg.weight wins
    const segs1: PromptSegment[] = [{ type: "text", value: "cat", weight: 2.0 }]
    expect(buildPromptString(segs1, {}, [], 1.5)).toBe("cat::2")

    // 2. seg.weight is undefined, cardWeight is defined -> cardWeight is used
    const segs2: PromptSegment[] = [{ type: "text", value: "cat" }]
    expect(buildPromptString(segs2, {}, [], 1.5)).toBe("cat::1.5")

    // 3. seg.weight is defined, cardWeight is undefined -> seg.weight wins
    expect(buildPromptString(segs1, {}, [])).toBe("cat::2")

    // 4. seg.weight is 1.0, cardWeight is 1.5 -> seg.weight 1.0 wins (no weight suffix)
    const segs4: PromptSegment[] = [{ type: "text", value: "cat", weight: 1.0 }]
    expect(buildPromptString(segs4, {}, [], 1.5)).toBe("cat")

    // 5. slot segment with weight fallback
    const segs5: PromptSegment[] = [{ type: "slot", label: "color" }]
    expect(buildPromptString(segs5, {}, [], 1.5)).toBe("{{color}}::1.5")

    // 6. slot segment with own weight
    const segs6: PromptSegment[] = [
      { type: "slot", label: "color", weight: 0.5 }
    ]
    expect(buildPromptString(segs6, {}, [], 1.5)).toBe("{{color}}::0.5")

    // 7. slot segment with weight 1.0 (should not append ::1.0)
    const segs7: PromptSegment[] = [
      { type: "slot", label: "color", weight: 1.0 }
    ]
    expect(buildPromptString(segs7, {}, [], 1.5)).toBe("{{color}}")
  })

  it("should handle non-array string values for sref, cref, and p in buildPromptString", () => {
    const segments: PromptSegment[] = [{ type: "text", value: "cat" }]
    const params = {
      sref: "single-sref-url",
      cref: "single-cref-url",
      p: "single-p"
    }
    const result = buildPromptString(segments, params as any)
    expect(result).toBe(
      "cat --sref single-sref-url --cref single-cref-url --p single-p"
    )
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
    expect(promptSegments[0].type).toBe("text")
    expect(promptSegments[0].value).toBe("a majestic lion")
  })

  it("should not extract imagePrompts if they are not at the very beginning of the prompt", () => {
    const prompt = "a majestic lion https://s.mj.run/img1 --ar 16:9"
    const { promptSegments, parameters } = parsePrompt(prompt)

    expect(parameters).not.toHaveProperty("imagePrompts")
    expect(parameters.ar).toBe("16:9")
    // Due to the colon delimiter, the mid-prompt URL gets split at 'https:'
    expect(promptSegments).toHaveLength(2)
    expect(promptSegments[0].type).toBe("text")
    expect(promptSegments[0].value).toBe("a majestic lion https")
    expect(promptSegments[1].type).toBe("text")
    expect(promptSegments[1].value).toBe("//s.mj.run/img1")
  })

  it("should parse all standard parameters correctly", () => {
    const prompt =
      "test --sref url1 url2 --cref urlC1 --p p1 p2 p3 --s 250 --c 50 --w 150 --tile --style raw"
    const { parameters } = parsePrompt(prompt)

    expect(parameters.sref).toEqual(["url1", "url2"])
    expect(parameters.cref).toEqual(["urlC1"])
    expect(parameters.p).toEqual(["p1", "p2", "p3"])
    expect(parameters.stylize).toBe(250)
    expect(parameters.chaos).toBe(50)
    expect(parameters.weird).toBe(150)
    expect(parameters.tile).toBe(true)
    expect(parameters.raw).toBe(true)
  })

  it("should support aliases for parameters like stylize, chaos, weird, version", () => {
    const prompt = "test --stylize 300 --chaos 10 --weird 5 --version 5.1"
    const { parameters } = parsePrompt(prompt)

    expect(parameters.stylize).toBe(300)
    expect(parameters.chaos).toBe(10)
    expect(parameters.weird).toBe(5)
    expect(parameters.version).toBe("5.1")
  })

  it("should trim values and handle complex spacing for parameters", () => {
    const prompt = "test --ar   16:9   --p   p1     p2   "
    const { parameters } = parsePrompt(prompt)

    expect(parameters.ar).toBe("16:9")
    expect(parameters.p).toEqual(["p1", "p2"])
  })

  it("should not include imagePrompts parameter when no starting URLs are present", () => {
    const prompt = "a majestic lion --ar 16:9"
    const { parameters } = parsePrompt(prompt)
    expect(parameters).not.toHaveProperty("imagePrompts")
  })

  it("should filter out empty segments when delimiters are duplicated or at the ends", () => {
    const prompt = "、、cat、、dog、"
    const { promptSegments } = parsePrompt(prompt)
    expect(promptSegments).toHaveLength(2)
    expect(promptSegments[0].type).toBe("text")
    expect(promptSegments[0].value).toBe("cat")
    expect(promptSegments[1].type).toBe("text")
    expect(promptSegments[1].value).toBe("dog")
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

  it("should extract starting URLs with http protocol as imagePrompts", () => {
    const prompt = "http://example.com/img.png a majestic lion"
    const { promptSegments, parameters } = parsePrompt(prompt)
    expect(parameters.imagePrompts).toEqual(["http://example.com/img.png"])
    expect(promptSegments[0].value).toBe("a majestic lion")
  })

  it("should handle empty parameter values gracefully", () => {
    const prompt = "test --sref --cref --p"
    const { parameters } = parsePrompt(prompt)
    expect(parameters.sref).toEqual([])
    expect(parameters.cref).toEqual([])
    expect(parameters.p).toEqual([])
  })

  it("should handle standard parameters with extra whitespace and tabs", () => {
    const prompt = "test --sref \t url1 \t\t url2 \t --cref   urlC1   "
    const { parameters } = parsePrompt(prompt)
    expect(parameters.sref).toEqual(["url1", "url2"])
    expect(parameters.cref).toEqual(["urlC1"])
  })

  it("should only set raw parameter to true when style is raw", () => {
    const prompt1 = "test --style raw"
    const parsed1 = parsePrompt(prompt1)
    expect(parsed1.parameters.raw).toBe(true)

    const prompt2 = "test --style random"
    const parsed2 = parsePrompt(prompt2)
    expect(parsed2.parameters.raw).toBeUndefined()
  })

  it("should trim the prompt before parsing segments", () => {
    const prompt = "   a majestic lion   "
    const { promptSegments } = parsePrompt(prompt)
    expect(promptSegments).toHaveLength(1)
    expect(promptSegments[0].value).toBe("a majestic lion")
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

  it("should normalize case and trim spaces during merge to eliminate duplicates", () => {
    const segments: PromptSegment[] = [
      { type: "text", value: "  Cat  " },
      { type: "text", value: "cat" },
      { type: "text", value: "CAT" },
      { type: "text", value: "dog" },
      { type: "text", value: "  DOG  " }
    ]
    const result = mergePromptSegments(segments)
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe("  Cat  ") // The first occurrence is preserved as-is
    expect(result[1].value).toBe("dog")
  })

  it("should filter out empty or whitespace-only text segments during merge", () => {
    const segments: PromptSegment[] = [
      { type: "text", value: "" },
      { type: "text", value: "   " },
      { type: "text", value: "cat" }
    ]
    const result = mergePromptSegments(segments)
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe("cat")
  })

  it("should handle specific case mappings correctly (e.g. Greek sigma toLower vs toUpper)", () => {
    const segments: PromptSegment[] = [
      { type: "text", value: "σ" },
      { type: "text", value: "ς" }
    ]
    const result = mergePromptSegments(segments)
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe("σ")
    expect(result[1].value).toBe("ς")
  })
})

describe("mergeReferences", () => {
  it("should parse and merge references with default weights", () => {
    const list = [
      { items: ["url1", "url2"], cardWeight: 1.0 },
      { items: ["url2", "url3"], cardWeight: 1.0 }
    ]
    expect(mergeReferences(list)).toEqual(["url1", "url2::2", "url3"])
  })

  it("should multiply weights by card weights", () => {
    const list = [
      { items: ["url1::2", "url2"], cardWeight: 1.5 },
      { items: ["url2::0.5", "url3"], cardWeight: 0.5 }
    ]
    const result = mergeReferences(list)
    expect(result).toEqual(["url1::3", "url2::1.75", "url3::0.5"])
  })
})

describe("buildMergedPromptString", () => {
  it("should merge multiple cards correctly with sref weights", () => {
    const cards = [
      {
        promptSegments: [{ type: "text", value: "cat" }] as PromptSegment[],
        parameters: { sref: ["urlA"], ar: "16:9" },
        weight: 1.5
      },
      {
        promptSegments: [{ type: "text", value: "dog" }] as PromptSegment[],
        parameters: { sref: ["urlB"] },
        weight: 0.5
      }
    ]
    const result = buildMergedPromptString(cards)
    expect(result).toBe(
      "cat::1.5, dog::0.5 --ar 16:9 --sref urlA::1.5 urlB::0.5"
    )
  })
})
