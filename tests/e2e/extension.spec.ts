import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Style Atelier Sandbox E2E Tests", () => {
  test("should render Midjourney mock and Sidepanel side-by-side and inject prompt", async ({ page }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots");
    
    try {
      // 1. サンドボックス親ページを開く
      console.log("Navigating to sandbox page...");
      page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
      });
      page.on('pageerror', err => {
        console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`);
      });
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
      const skipButton = spFrame.locator("text=スキップ");
      if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("Welcome dialog detected, clicking skip...");
        await skipButton.click();
      }

      // 5. HandBarのモックカードをクリックしてWorkbenchに追加
      console.log("Adding mock card to Workbench from Hand...");
      const mockCardInHand = spFrame.locator("#handbar-root .cursor-pointer").first();
      await expect(mockCardInHand).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000); // Reactイベントリスナーのアタッチ待ち
      await mockCardInHand.click({ force: true });

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

      // 8. 視覚確認用のスクリーンショットを保存
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
});
