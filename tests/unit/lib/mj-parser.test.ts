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

    it("should handle mixed case allowed host names", () => {
      const url =
        "https://CDN.Midjourney.Com/100cc076-ef20-46b4-8aeb-f7c294169800/0_0.png"
      expect(extractJobIdFromUrl(url)).toBe(
        "100cc076-ef20-46b4-8aeb-f7c294169800"
      )
    })

    it("should return undefined if url is not a valid URL (throws in URL parser)", () => {
      expect(extractJobIdFromUrl("http://[::1")).toBeUndefined()
      expect(extractJobIdFromUrl("not-a-valid-url")).toBeUndefined()
    })

    it("should return undefined if host is close but not cdn.midjourney.com", () => {
      const url =
        "https://other.midjourney.com/100cc076-ef20-46b4-8aeb-f7c294169800/0_0.png"
      expect(extractJobIdFromUrl(url)).toBeUndefined()
    })

    it("should return undefined if path is /jobs/ but does not match uuidPattern", () => {
      const url = "https://www.midjourney.com/jobs/12345"
      expect(extractJobIdFromUrl(url)).toBeUndefined()
    })

    it("should return undefined if host is cdn.midjourney.com but does not match uuidPattern", () => {
      const url = "https://cdn.midjourney.com/12345/0_0.png"
      expect(extractJobIdFromUrl(url)).toBeUndefined()
    })

    it("should return undefined if host is cdn.midjourney.com but does not contain a UUID path", () => {
      const url = "https://cdn.midjourney.com/invalid"
      expect(extractJobIdFromUrl(url)).toBeUndefined()
    })

    it("should return undefined for invalid URLs targeting cdn host with spoofed hostnames", () => {
      expect(
        extractJobIdFromUrl(
          "https://cdn.midjourney.com.attacker.com/100cc076-ef20-46b4-8aeb-f7c294169800/0_0.png"
        )
      ).toBeUndefined()
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

    it("should handle parameter values with spaces", () => {
      const text = "a futuristic city --ar   16:9 --v   6.0"
      expect(extractParameters(text)).toEqual(["--ar 16:9", "--v 6.0"])
    })

    it("should handle repetition removal with word boundary and case insensitivity", () => {
      const text = "--sref value sref"
      expect(extractParameters(text)).toEqual(["--sref value"])

      const textCase = "--sref value SREF"
      expect(extractParameters(textCase)).toEqual(["--sref value"])

      const textNoBoundary = "--sref value srefvalue"
      expect(extractParameters(textNoBoundary)).toEqual([
        "--sref value srefvalue"
      ])
    })

    it("should handle multiple duplicate standalone parameters", () => {
      const text = "render --fast --fast"
      expect(extractParameters(text)).toEqual(["--fast"])
    })

    it("should parse custom parameters with hyphens and numbers", () => {
      const text = "character --cref url1 --cw 100 --niji 6"
      expect(extractParameters(text)).toEqual([
        "--cref url1",
        "--cw 100",
        "--niji 6"
      ])
    })

    it("should handle parameters with excessive spaces around and inside keys/values", () => {
      const text = "  --ar   16:9   "
      expect(extractParameters(text)).toEqual(["--ar 16:9"])
    })

    it("should handle duplicate parameters with multiple spaces", () => {
      const text = "a futuristic city --sref   url1   --sref   url2"
      expect(extractParameters(text)).toEqual(["--sref url1 url2"])
    })

    it("should handle standalone parameter with trailing/leading spaces", () => {
      const text = "  --fast   "
      expect(extractParameters(text)).toEqual(["--fast"])
    })

    it("should handle boundary spacing and edge cases for value-less or short parameters", () => {
      // Standalone parameter with trailing tab/newline
      expect(extractParameters("render --fast \t\n")).toEqual(["--fast"])
      // Multiple duplicate parameters with trailing spaces
      expect(extractParameters("render --fast --fast \t ")).toEqual(["--fast"])
      // Short parameter key and value
      expect(extractParameters("test --a b")).toEqual(["--a b"])
      // Parameters with tab spacing between key and value
      expect(extractParameters("test --sref \t value")).toEqual([
        "--sref value"
      ])
    })
  })

  describe("normalizeText", () => {
    it("should collapse multiple spaces and remove newlines", () => {
      const text = "  hello \n \n  world   \r test  "
      expect(normalizeText(text)).toBe("hello world test")
    })

    it("should normalize multiple consecutive newlines and carriage returns to a single space", () => {
      const text = "hello\n\n\nworld\r\n\r\nback"
      expect(normalizeText(text)).toBe("hello world back")
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

    it("should remove each type of forbidden element individually", () => {
      const container1 = document.createElement("div")
      container1.innerHTML = "text <button>btn</button>"
      expect(cleanPromptBody(container1)).toBe("text")

      const container2 = document.createElement("div")
      container2.innerHTML = "text <a href='#'>link</a>"
      expect(cleanPromptBody(container2)).toBe("text")

      const container3 = document.createElement("div")
      container3.innerHTML = "text <img src='t.jpg'/>"
      expect(cleanPromptBody(container3)).toBe("text")

      const container4 = document.createElement("div")
      container4.innerHTML = "text <span class='hidden'>hide</span>"
      expect(cleanPromptBody(container4)).toBe("text")

      const container5 = document.createElement("div")
      container5.innerHTML = "text <span aria-hidden='true'>aria</span>"
      expect(cleanPromptBody(container5)).toBe("text")
    })

    it("should remove UI noise like '+ use text' case-insensitively with different spaces", () => {
      const container1 = document.createElement("div")
      container1.innerHTML = "prompt + use text"
      expect(cleanPromptBody(container1)).toBe("prompt")

      const container2 = document.createElement("div")
      container2.innerHTML = "prompt +  use text"
      expect(cleanPromptBody(container2)).toBe("prompt")

      const container3 = document.createElement("div")
      container3.innerHTML = "prompt +USE TEXT"
      expect(cleanPromptBody(container3)).toBe("prompt")
    })

    it("should return empty string when element has no text content", () => {
      const container = document.createElement("div")
      expect(cleanPromptBody(container)).toBe("")
    })

    it("should return empty string when element content consists only of buttons or hidden elements", () => {
      const container = document.createElement("div")
      container.innerHTML =
        "<button>Click me</button><span class='hidden'>Hidden</span>"
      expect(cleanPromptBody(container)).toBe("")
    })
  })
})
