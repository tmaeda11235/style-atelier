import { WebDataExtractor } from "@/contents/_domain/extractors/WebDataExtractor"
import { describe, expect, it } from "vitest"

describe("WebDataExtractor", () => {
  const extractor = new WebDataExtractor()

  it("should extract simple prompt and jobId from standard anchor element structure", () => {
    // Setup a mock DOM layout
    const container = document.createElement("div")
    container.className = "absolute"
    container.innerHTML = `
      <div class="overflow-clip">
        <div class="relative group/promptText">
          <div class="break-word">A majestic golden lion, sunrise</div>
        </div>
        <div class="flex">
          <button title="Image aspect ratio">--ar 16:9</button>
          <button title="Style Reference">--sref 12345</button>
        </div>
      </div>
      <a href="https://www.midjourney.com/jobs/88888888-4444-4444-4444-121212121212?index=0">
        <img id="test-img" src="https://cdn.midjourney.com/88888888-4444-4444-4444-121212121212/0_0.png" />
      </a>
    `
    document.body.appendChild(container)
    const img = document.getElementById("test-img") as HTMLImageElement

    const result = extractor.extract(img)

    expect(result).not.toBeNull()
    expect(result?.id).toBe("88888888-4444-4444-4444-121212121212")
    expect(result?.fullCommand).toBe(
      "A majestic golden lion, sunrise --ar 16:9 --sref 12345"
    )
    expect(result?.imageUrl).toBe(
      "https://cdn.midjourney.com/88888888-4444-4444-4444-121212121212/0_0.png"
    )

    // Cleanup
    document.body.removeChild(container)
  })

  it("should extract image prompts, image srefs, and crefs from button elements and merge them into the prompt", () => {
    const container = document.createElement("div")
    container.className = "absolute"
    container.innerHTML = `
      <div class="overflow-clip">
        <div class="relative group/promptText">
          <div class="break-word">A cute anime girl holding a mug</div>
        </div>
        <div class="mr-2 empty:hidden flex">
          <button type="button" title="Image Prompt">
            <img alt="https://s.mj.run/image_prompt_url" src="https://s.mj.run/image_prompt_url?thumb=true" />
          </button>
          <button type="button" title="Style Reference (--sref)">
            <img alt="https://s.mj.run/sref_url" src="https://s.mj.run/sref_url?thumb=true" />
          </button>
          <button type="button" title="Character Reference (--cref)">
            <img alt="https://s.mj.run/cref_url" src="https://s.mj.run/cref_url?thumb=true" />
          </button>
        </div>
        <div class="flex">
          <button title="Image aspect ratio">--ar 1:1</button>
          <button title="Style Reference">--sref 99999</button>
        </div>
      </div>
      <a href="https://www.midjourney.com/jobs/99999999-9999-9999-9999-999999999999">
        <img id="test-img-2" src="https://cdn.midjourney.com/99999999-9999-9999-9999-999999999999/0_0.png" />
      </a>
    `
    document.body.appendChild(container)
    const img = document.getElementById("test-img-2") as HTMLImageElement

    const result = extractor.extract(img)

    expect(result).not.toBeNull()
    expect(result?.id).toBe("99999999-9999-9999-9999-999999999999")
    // Image prompt prepended, sref URLs merged, cref appended
    expect(result?.fullCommand).toBe(
      "https://s.mj.run/image_prompt_url A cute anime girl holding a mug --ar 1:1 --sref 99999 https://s.mj.run/sref_url --cref https://s.mj.run/cref_url"
    )

    document.body.removeChild(container)
  })

  it("should fall back to sibling anchor job links and use main image URL when dragging a reference image button", () => {
    const container = document.createElement("div")
    container.className = "absolute"
    container.innerHTML = `
      <div class="overflow-clip">
        <div class="relative group/promptText">
          <div class="break-word">A scenic landscape, mountains</div>
        </div>
        <div class="mr-2 empty:hidden flex">
          <button type="button" title="Style Reference (--sref)">
            <img id="dragged-sref-img" alt="https://s.mj.run/sref_url_2" src="https://s.mj.run/sref_url_2?thumb=true" />
          </button>
        </div>
        <div class="flex">
          <button title="Image aspect ratio">--ar 16:9</button>
        </div>
      </div>
      <a href="https://www.midjourney.com/jobs/11111111-2222-3333-4444-555555555555">
        <img src="https://cdn.midjourney.com/11111111-2222-3333-4444-555555555555/0_0.png" />
      </a>
    `
    document.body.appendChild(container)
    const srefImg = document.getElementById(
      "dragged-sref-img"
    ) as HTMLImageElement

    const result = extractor.extract(srefImg)

    expect(result).not.toBeNull()
    expect(result?.id).toBe("11111111-2222-3333-4444-555555555555")
    expect(result?.fullCommand).toBe(
      "A scenic landscape, mountains --ar 16:9 --sref https://s.mj.run/sref_url_2"
    )
    // imageUrl should be the main image URL from the sibling job link
    expect(result?.imageUrl).toBe(
      "https://cdn.midjourney.com/11111111-2222-3333-4444-555555555555/0_0.png"
    )

    document.body.removeChild(container)
  })

  it("should extract jobId from data-job-id attribute on the image itself or its parent", () => {
    const container = document.createElement("div")
    container.setAttribute(
      "data-job-id",
      "22222222-3333-4444-5555-666666666666"
    )
    container.innerHTML = `
      <div class="overflow-clip">
        <div class="relative group/promptText">
          <div class="break-word">A neon cyberpunk alleyway</div>
        </div>
      </div>
      <img id="test-img-data-attr" src="https://cdn.midjourney.com/placeholder.png" />
    `
    document.body.appendChild(container)
    const img = document.getElementById(
      "test-img-data-attr"
    ) as HTMLImageElement

    const result = extractor.extract(img)

    expect(result).not.toBeNull()
    expect(result?.id).toBe("22222222-3333-4444-5555-666666666666")
    expect(result?.fullCommand).toBe("A neon cyberpunk alleyway")

    document.body.removeChild(container)
  })

  it("should extract jobId from a wider modal/overlay container even when sibling containers do not wrap the image directly", () => {
    const modal = document.createElement("div")
    modal.className = "fixed bg-white"
    modal.innerHTML = `
      <div class="image-wrapper">
        <img id="test-img-modal-fallback" src="https://cdn.midjourney.com/placeholder.png" />
      </div>
      <div class="sidebar">
        <div class="overflow-clip">
          <div class="relative group/promptText">
            <div class="break-word">A futuristic space station orbiting Mars</div>
          </div>
        </div>
        <a href="https://www.midjourney.com/jobs/77777777-8888-9999-aaaa-bbbbbbbbbbbb">Job Details Link</a>
      </div>
    `
    document.body.appendChild(modal)
    const img = document.getElementById(
      "test-img-modal-fallback"
    ) as HTMLImageElement

    const result = extractor.extract(img)

    expect(result).not.toBeNull()
    expect(result?.id).toBe("77777777-8888-9999-aaaa-bbbbbbbbbbbb")
    expect(result?.fullCommand).toBe("A futuristic space station orbiting Mars")

    document.body.removeChild(modal)
  })
})
