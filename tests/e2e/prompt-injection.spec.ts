import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Style Atelier Sandbox E2E Tests - Prompt Injection", () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`);
    });
    page.on('requestfailed', request => {
      console.error(`[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText}`);
    });
    page.on('response', response => {
      if (response.status() >= 400) {
        console.error(`[HTTP ERROR] ${response.url()}: ${response.status()}`);
      }
    });
  });

  test("should render Midjourney mock and Sidepanel side-by-side and inject prompt", async ({ page }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots");
    
    try {
      // 1. サンドボックス親ページを開く
      console.log("Navigating to sandbox page...");
      await page.goto("/tests/sandbox/index.html");

      // 2. 左側 iframe (Midjourney) と 右側 iframe (サイドパネル) の取得
      const mjFrame = page.frameLocator("#midjourney-frame");
      const spFrame = page.frameLocator("#sidepanel-frame");

      // 3. Midjourney モック内のテキストエリアが表示されるのを待つ
      console.log("Waiting for Midjourney mock inputs...");
      const textarea = mjFrame.locator('textarea, [role="textbox"], [data-testid="prompt-input"], [aria-label*="prompt"]').first();
      await expect(textarea).toBeVisible({ timeout: 15000 });

      // 4. サイドパネルのウェルカムダイアログの「スキップ」ボタンがあればクリック
      console.log("Checking for welcome dialog...");
      const skipButton = spFrame.locator("#welcome-skip-btn");
      if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("Welcome dialog detected, clicking skip...");
        await skipButton.click();
      }

      // 5. HandBarの2枚目のカード（anime slot template）を削除し、1枚目のカードだけにする
      console.log("Removing mock-card-2 from Workbench...");
      const secondCard = spFrame.locator("#handbar-root .cursor-pointer").nth(1);
      await expect(secondCard).toBeVisible({ timeout: 10000 });
      await secondCard.hover();
      const deleteBtn = secondCard.locator("button").last();
      await deleteBtn.click();

      // 6. サイドパネルの「Workbench」タブへ切り替え
      console.log("Switching to Workbench tab in Sidepanel...");
      const workbenchTabButton = spFrame.locator("button:has-text('Workbench')");
      await expect(workbenchTabButton).toBeVisible({ timeout: 10000 });
      await workbenchTabButton.click();

      // 7. 「Workbench」の入力エリアにテキストを入力してプロンプトを追加
      console.log("Adding prompt segments in Sidepanel...");
      const promptInput = spFrame.locator("input.bg-transparent").first();
      await expect(promptInput).toBeVisible({ timeout: 10000 });
      await promptInput.fill("a cyberpunk ninja cat");
      await promptInput.press("Enter");

      // 8. 「Try on Midjourney」ボタンをクリックして注入を実行
      console.log("Clicking 'Try on Midjourney' button...");
      const injectButton = spFrame.locator("button:has-text('Try on Midjourney')");
      await expect(injectButton).toBeVisible();
      await injectButton.click();

      // 9. Midjourney側のテキストエリアにプロンプトが正しく注入されたか検証
      console.log("Verifying prompt injection in Midjourney mock...");
      await expect(textarea).toHaveValue(
        "neon-lit cyberpunk aesthetic, a cyberpunk ninja cat --sref https://midjourney.com/mock-sref",
        { timeout: 10000 }
      );
      console.log("Prompt injection successfully verified!");

      // 10. 視覚確認用のスクリーンショットを保存
      await page.screenshot({
        path: path.join(screenshotsDir, "side-by-side-success.png"),
      });
      console.log(`Success screenshot saved to tests/screenshots/side-by-side-success.png`);
    } catch (error) {
      console.error("Test failed, taking failure screenshot...");
      try {
        await page.screenshot({
          path: path.join(screenshotsDir, "side-by-side-failure.png"),
        });
      } catch (err) {
        console.error("Failed to capture failure screenshot:", err);
      }
      throw error;
    }
  });

  test("should correctly extract image prompts and image srefs from mock DOM", async ({ page }) => {
    console.log("Navigating to sandbox page for extraction test...");
    await page.goto("/tests/sandbox/index.html");

    const mjFrame = page.frameLocator("#midjourney-frame");

    // Wait for Midjourney mock images to render
    console.log("Waiting for Midjourney mock images to render...");
    const mockImage = mjFrame.locator("#pageScroll img").first();
    await expect(mockImage).toBeVisible({ timeout: 15000 });

    // Evaluate extractor inside midjourney-frame context
    console.log("Evaluating WebDataExtractor on the image prompt row...");
    const result = await mjFrame.locator("body").evaluate(() => {
      // Find the first post image
      const img = document.querySelector("#pageScroll img") as HTMLImageElement;
      if (!img) return null;
      
      // Get the exposed extractor from window
      const extractor = (window as any)._extractor;
      if (!extractor) return { error: "Extractor not found on window" };

      // Call extract and return the result
      return extractor.extract(img);
    });

    console.log("Extracted result:", result);
    expect(result).not.toBeNull();
    expect(result.id).toBe("c8e0e10b-9a6f-4bd9-ab6c-d4252c60febb");
    expect(result.fullCommand).toContain("https://s.mj.run/fOawY_NXKRY");
    expect(result.fullCommand).toContain("超高層ビルを見上げた景色");
    expect(result.fullCommand).toContain("カードが大量に重ねられて輝いている");
    console.log("Extraction test passed successfully!");
  });

  test("should correctly extract Job ID, prompt, and image source from pattern2.html sandbox variant", async ({ page }) => {
    console.log("Navigating to sandbox page with pattern2 variant...");
    await page.goto("/tests/sandbox/index.html?variant=pattern2.html");

    const mjFrame = page.frameLocator("#midjourney-frame");

    // Wait for Midjourney mock images to render
    console.log("Waiting for Midjourney mock images to render...");
    const mockImage = mjFrame.locator("img[src*='0_1.jpeg']");
    await expect(mockImage).toBeVisible({ timeout: 15000 });

    // Evaluate extractor inside midjourney-frame context
    console.log("Evaluating WebDataExtractor on the pattern2 image...");
    const result = await mjFrame.locator("body").evaluate(() => {
      const img = document.querySelector("img[src*='0_1.jpeg']") as HTMLImageElement;
      if (!img) return null;
      
      const extractor = (window as any)._extractor;
      if (!extractor) return { error: "Extractor not found on window" };

      return extractor.extract(img);
    });

    console.log("Extracted result from pattern2:", result);
    expect(result).not.toBeNull();
    expect(result.id).toBe("100cc076-ef20-46b4-8aeb-f7c294169800");
    expect(result.fullCommand).toContain("俊足の怪人");
    expect(result.fullCommand).toContain("聖歌隊の行進");
    expect(result.imageUrl).toContain("0_1.jpeg");
    console.log("pattern2 variant extraction test passed successfully!");
  });
});
