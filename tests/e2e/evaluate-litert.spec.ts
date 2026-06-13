import path from "path"
import { expect, test } from "@playwright/test"

test.use({
  launchOptions: {
    args: [
      "--enable-unsafe-webgpu",
      "--enable-features=Vulkan",
      "--use-angle=vulkan",
      "--use-vulkan=swiftshader",
      "--enable-webgpu-developer-features"
    ]
  }
})

test.describe("LiteRT-LM Interactive Sandbox Evaluation", () => {
  test("Load Gemma4 E2B 68M and Parse Queries", async ({ page }) => {
    test.setTimeout(120000)
    page.on("console", (msg) => console.log("Browser:", msg.text()))
    // 1. Navigate to the local sandbox.html
    const sandboxPath = `file://${path.resolve(__dirname, "../../scratch/sandbox.html")}`
    console.log(`Navigating to ${sandboxPath}...`)
    await page.goto(sandboxPath)

    // 2. Wait for the engine to initialize
    console.log(
      "Waiting for LiteRT-LM engine to initialize (downloading/loading model)..."
    )
    // This could take a while since it downloads 68MB
    await page.waitForFunction(
      () => window.__SANDBOX_READY__ === true,
      undefined,
      { timeout: 120000 }
    )
    console.log("Engine is READY!")

    // 3. Define test prompts
    const testPrompts = [
      "I want a red casual top.",
      "Show me epic shoes for running.",
      "Blue jeans, common rarity."
    ]

    // 4. Execute prompts and log results
    for (const prompt of testPrompts) {
      console.log(`\nEvaluating Prompt: "${prompt}"`)

      // Execute the globally exposed runQuery function
      const result = await page.evaluate(async (p) => {
        return await window.runQuery(p)
      }, prompt)

      console.log("Response:")
      console.log(result)
      console.log("-".repeat(40))
    }

    // Keep it alive briefly to let us read output if needed
    await page.waitForTimeout(1000)
  })
})
