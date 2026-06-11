import { describe, expect, it } from "vitest"

import type { PromptSegment } from "./db-schema"
import {
  buildMergedPromptString,
  mergeReferences
} from "./prompt-reference-utils"

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
