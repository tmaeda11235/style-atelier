import {
  cleanPromptBody,
  extractJobIdFromUrl,
  extractParameters,
  normalizeText
} from "@/lib/mj-parser"
import { describe, expect, it } from "vitest"

describe("mj-parser", () => {
  describe("extractJobIdFromUrl", () => {
    it("should extract job id from /jobs/ URL pattern", () => {
      const url =
        "https://www.midjourney.com/jobs/100cc076-ef20-46b4-8aeb-f7c294169800"
      expect(extractJobIdFromUrl(url)).toBe(
        "100cc076-ef20-46b4-8aeb-f7c294169800"
      )
    })

    it("should extract job id from cdn.midjourney.com URL pattern", () => {
      const url =
        "https://cdn.midjourney.com/100cc076-ef20-46b4-8aeb-f7c294169800/0_0.png"
      expect(extractJobIdFromUrl(url)).toBe(
        "100cc076-ef20-46b4-8aeb-f7c294169800"
      )
    })

    it("should return undefined if URL contains /jobs/ but no valid UUID", () => {
      const url = "https://www.midjourney.com/jobs/not-a-uuid"
      expect(extractJobIdFromUrl(url)).toBeUndefined()
    })

    it("should return undefined for unrelated URLs", () => {
      const url = "https://example.com/some/path"
      expect(extractJobIdFromUrl(url)).toBeUndefined()
    })
  })

  describe("extractParameters", () => {
    it("should extract simple parameters", () => {
      const text = "a futuristic city --ar 16:9 --v 6.0"
      expect(extractParameters(text)).toEqual(["--ar 16:9", "--v 6.0"])
    })

    it("should merge duplicate parameters", () => {
      const text = "a beautiful landscape --sref url1 --sref url2"
      expect(extractParameters(text)).toEqual(["--sref url1 url2"])
    })

    it("should ignore hyphens inside words (e.g. hyper-realistic)", () => {
      const text = "a hyper-realistic photo of a cat --ar 4:3"
      expect(extractParameters(text)).toEqual(["--ar 4:3"])
    })

    it("should handle standalone flags with no values", () => {
      const text = "render --fast --v 6"
      expect(extractParameters(text)).toEqual(["--fast", "--v 6"])
    })
  })

  describe("normalizeText", () => {
    it("should collapse multiple spaces and remove newlines", () => {
      const text = "  hello \n \n  world   \r test  "
      expect(normalizeText(text)).toBe("hello world test")
    })
  })

  describe("cleanPromptBody", () => {
    it("should remove buttons, anchors, images, hidden elements, and UI noise", () => {
      const container = document.createElement("div")
      container.innerHTML = `
        prompt text here
        <button>Click me</button>
        <a href="#">Link</a>
        <img src="test.jpg" />
        <span class="hidden">Hidden text</span>
        <div aria-hidden="true">Aria hidden</div>
        + use text
      `
      expect(cleanPromptBody(container)).toBe("prompt text here")
    })
  })
})
