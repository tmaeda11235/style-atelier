import { test, expect } from "../fixtures/extension-fixture";
import path from "path";
import fs from "fs";

test.describe("Style Atelier Extension E2E Tests", () => {
  test("should load the extension and render the sidepanel on the mock Midjourney page", async ({
    page,
    context,
    extensionId,
  }) => {
    // 1. midjourney.com のリクエストをローカルのリソースに差し替える設定
    await context.route("https://www.midjourney.com/**", async (route) => {
      const url = route.request().url();
      
      // 画像、フォント、メディアファイルを強制的にabortしてページ読み込みを高速化（レイアウト検証には不要なため）
      if (url.match(/\.(png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|otf|mp4|webm)$/) || url.includes("/fonts/")) {
        await route.abort();
        return;
      }
      
      if (url === "https://www.midjourney.com/" || url === "https://www.midjourney.com/imagine" || url.endsWith(".html")) {
        const mockHtmlPath = path.join(__dirname, "../fixtures/midjourney/index.html");
        await route.fulfill({
          path: mockHtmlPath,
          status: 200,
          contentType: "text/html",
        });
      } else if (url.includes("/index_files/")) {
        const urlObj = new URL(url);
        const fileName = path.basename(urlObj.pathname);
        
        // ディレクトリそのものや不要なクエリはスキップ
        if (fileName === "index_files" || !fileName.includes(".")) {
          await route.abort();
          return;
        }
        
        const decodedFileName = decodeURIComponent(fileName);
        let localFilePath = path.join(__dirname, "../fixtures/midjourney/index_files", decodedFileName);
        
        // 🌟 Windowsの文字化け対策フォールバック
        if (!fs.existsSync(localFilePath)) {
          if (decodedFileName.includes("api.js")) {
            localFilePath = path.join(__dirname, "../fixtures/midjourney/index_files/api.js.ダウンロード");
          } else if (decodedFileName.includes("clientSideEntry")) {
            localFilePath = path.join(__dirname, "../fixtures/midjourney/index_files/clientSideEntry-gnf8cfdk.js.ダウンロード");
          }
        }
        
        if (fs.existsSync(localFilePath)) {
          await route.fulfill({
            path: localFilePath,
          });
        } else {
          await route.abort();
        }
      } else {
        // 外部のトラッキングや分析用スクリプトなどは無視
        await route.abort();
      }
    });

    // 2. モックのMidjourneyページを開く（これによりContent Scriptがインジェクトされる）
    console.log("Navigating to mock Midjourney page...");
    await page.goto("https://www.midjourney.com/", { waitUntil: "domcontentloaded" });

    // テキストエリア（本物のMidjourney用のセレクター群）が存在し表示されていることを確認
    const textarea = page.locator('textarea, [role="textbox"], [data-testid="prompt-input"], [aria-label*="prompt"]').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });

    // 3. 拡張機能のサイドパネルページを個別のページとして開く
    console.log(`Opening extension sidepanel: chrome-extension://${extensionId}/sidepanel.html`);
    const sidepanelPage = await context.newPage();
    await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);

    // 🌟 重要: Midjourneyのタブをアクティブ状態（前面）にする
    // サイドパネルの chrome.tabs.query({ active: true, currentWindow: true }) が
    // Midjourneyのタブを検知できるようにします。
    console.log("Bringing Midjourney tab to front to activate target domain checking...");
    await page.bringToFront();

    const screenshotsDir = path.join(__dirname, "../../tests/screenshots");

    try {
      // 4. 初回起動ダイアログ（ウェルカムダイアログ）が表示されたらスキップする
      const skipButton = sidepanelPage.locator("text=スキップ");
      if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("Welcome dialog detected, clicking skip...");
        await skipButton.click();
      }

      // 5. ターゲットサイト判定（isTargetSite = true）が通り、サイドパネルが正常に表示されていることを確認
      // 非対象サイト用のビュー（NonTargetSiteView）が表示されていないこと
      const nonTargetView = sidepanelPage.locator("text=Midjourneyのページを開いてください");
      await expect(nonTargetView).not.toBeVisible({ timeout: 10000 });

      // サイドパネルのメインレイアウト（例: Workbench、History、Libraryタブボタンなど）が表示されていることを確認
      const workbenchTab = sidepanelPage.locator("button:has-text('Workbench')");
      const libraryTab = sidepanelPage.locator("button:has-text('Library')");
      const historyTab = sidepanelPage.locator("button:has-text('History')");

      // タブが正しく描画されているかチェック（レイアウト崩れの第一段階検証）
      await expect(workbenchTab).toBeVisible();
      await expect(libraryTab).toBeVisible();
      await expect(historyTab).toBeVisible();

      console.log("Successfully verified sidepanel buttons are visible and active!");

      // 6. スクリーンショットを撮影してレイアウト崩れを目視確認できるようにする
      await sidepanelPage.screenshot({
        path: path.join(screenshotsDir, "sidepanel-success.png"),
        fullPage: true,
      });
      console.log("Success screenshots saved.");
    } catch (error) {
      console.error("Test failed, taking failure screenshots...");
      await sidepanelPage.screenshot({
        path: path.join(screenshotsDir, "sidepanel-failure.png"),
        fullPage: true,
      });
      await page.screenshot({
        path: path.join(screenshotsDir, "midjourney-failure.png"),
        fullPage: true,
      });
      throw error;
    }
  });
});
