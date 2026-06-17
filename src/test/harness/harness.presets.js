/* eslint-disable no-undef */

window.LiteRTPresets = {
  recipe: {
    system:
      "You are an expert Atelier alchemist. Analyze the given Midjourney prompt style cards and advise on visual harmony, blending ratio, and rendering parameters.",
    prompt:
      'Combine "Cyberpunk Glow" (dominant: neon blue, parameters: sref https://example.com/neon) with "Watercolor Rain" (dominant: watercolor pink). Suggest a prompt to blend them.'
  },
  midjourney: {
    system:
      "You are a creative prompt engineer. Generate an optimized Midjourney prompt by extracting aesthetic elements from style cards.",
    prompt:
      "Extract elements from: card_1 [neon, glitch art], card_2 [vintage photography]. Generate a new prompt."
  },
  qa: {
    system: "You are a helpful assistant.",
    prompt:
      "Explain what OPFS (Origin Private File System) is in 3 bullet points."
  },
  custom: { system: "", prompt: "" }
}
