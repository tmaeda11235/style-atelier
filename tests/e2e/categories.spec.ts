import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Custom Categories", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
    page.on("requestfailed", (request) => {
      console.error(
        `[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText}`
      )
    })
    page.on("response", (response) => {
      if (response.status() >= 400) {
        console.error(`[HTTP ERROR] ${response.url()}: ${response.status()}`)
      }
    })
  })

  test("should allow creating, editing, and deleting a custom category in Library tab", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    page.on("console", (msg) => {
      console.log(`[CATEGORY TEST CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[CATEGORY TEST ERROR] ${err.message}\n${err.stack}`)
    })

    try {
      console.log("1. Navigating to sandbox page...")
      await page.goto("/tests/sandbox/index.html")

      const spFrame = page.frameLocator("#sidepanel-frame")

      // 1. ウェルカムダイアログの「スキップ」ボタンがあればクリック
      console.log("2. Checking for welcome dialog...")
      const skipButton = spFrame.locator("#welcome-skip-btn")
      if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("Clicking skip button...")
        await skipButton.click()
        await page.waitForTimeout(500)
      }

      // 2. Libraryタブに切り替え
      console.log("3. Switching to Library tab...")
      const libraryTabButton = spFrame.locator("button:has-text('Library')")
      await expect(libraryTabButton).toBeVisible({ timeout: 15000 })
      await libraryTabButton.click()
      await page.waitForTimeout(1000) // Wait for Dexie queries to load style cards and categories

      // 3. タグボタン（Manage Categories）をクリックしてモーダルを開く
      console.log("4. Opening category modal...")
      const addCategoryBtn = spFrame.locator(
        "button[title='Manage Categories']"
      )
      await expect(addCategoryBtn).toBeVisible({ timeout: 15000 })
      await addCategoryBtn.click()
      await page.waitForTimeout(500)

      // 4. モーダルの入力フィールドに入力してカスタムカテゴリを作成
      console.log("5. Creating new category...")
      const nameInput = spFrame.locator(
        "input[placeholder='e.g. Cyberpunk, Retro']"
      )
      await expect(nameInput).toBeVisible({ timeout: 10000 })
      await nameInput.fill("E2E Category")

      const emojiInput = spFrame.locator("input[placeholder='e.g. 🎨, 🛸']")
      await emojiInput.fill("👾")

      const submitBtn = spFrame.locator("button:has-text('Create Category')")
      await submitBtn.click()
      await page.waitForTimeout(1000) // Wait for category to be added to IndexedDB and UI to update

      // 5. 新しいカテゴリフィルターボタンがLibraryタブに追加されたか確認
      console.log("6. Verifying category filter button added...")
      const newCategoryFilterBtn = spFrame.locator(
        "button:has-text('E2E Category')"
      )
      await expect(newCategoryFilterBtn).toBeVisible({ timeout: 15000 })

      // 6. 再び "+" ボタンをクリックして管理モーダルを開く
      console.log("7. Re-opening category modal...")
      await addCategoryBtn.click()
      await page.waitForTimeout(500)

      // 7. 「Manage Categories」タブに切り替え
      console.log("8. Switching to Manage Categories tab...")
      const manageTabBtn = spFrame.locator(
        "button:has-text('Manage Categories')"
      )
      await expect(manageTabBtn).toBeVisible({ timeout: 10000 })
      await manageTabBtn.click()
      await page.waitForTimeout(1000) // Wait for categories list to load

      // 8. 作成したカスタムカテゴリが表示されているか確認
      console.log("9. Verifying category row exists...")
      const categoryRow = spFrame
        .locator("p", { hasText: "E2E Category" })
        .first()
      await expect(categoryRow).toBeVisible({ timeout: 10000 })

      // 9. 編集ボタンをクリックして編集画面へ
      console.log("10. Clicking Edit Category button...")
      const editBtn = spFrame
        .getByRole("button", { name: "Edit Category" })
        .first()
      await expect(editBtn).toBeVisible({ timeout: 10000 })
      await editBtn.click()
      await page.waitForTimeout(500)

      // 10. 名前の変更と保存
      console.log("11. Changing name and saving...")
      await nameInput.fill("E2E Category Edited")
      const saveBtn = spFrame.locator("button:has-text('Save Changes')")
      await saveBtn.click()
      await page.waitForTimeout(1000) // Wait for DB write and UI update

      // 11. 変更したカテゴリ名がフィルター行に表示されているか確認
      console.log("12. Verifying edited category filter button...")
      const editedCategoryFilterBtn = spFrame.locator(
        "button:has-text('E2E Category Edited')"
      )
      await expect(editedCategoryFilterBtn).toBeVisible({ timeout: 15000 })

      // 12. 削除する (モーダルは既に開いていてManage tabになっているので、そのまま削除を実行できる)
      console.log("13. Clicking Delete Category button...")
      const deleteBtn = spFrame
        .getByRole("button", { name: "Delete Category" })
        .first()
      await expect(deleteBtn).toBeVisible({ timeout: 10000 })
      await deleteBtn.click()
      await page.waitForTimeout(500)

      // 13. カスタム確認ダイアログの操作
      console.log("14. Handling custom confirmation dialog...")
      const confirmOkBtn = spFrame.locator("#confirm-dialog-ok-btn")
      await expect(confirmOkBtn).toBeVisible({ timeout: 10000 })
      await confirmOkBtn.click()
      await page.waitForTimeout(1000)

      // 14. モーダルを閉じる
      console.log("15. Closing category modal...")
      const closeBtn = spFrame.getByRole("button", { name: "Close" }).first()
      await expect(closeBtn).toBeVisible({ timeout: 10000 })
      await closeBtn.click()
      await page.waitForTimeout(500)

      // 14. フィルター行からカテゴリが消えたことを確認
      console.log("16. Verifying category filter is deleted...")
      await expect(editedCategoryFilterBtn).not.toBeVisible({ timeout: 15000 })

      console.log("Custom category E2E test passed successfully!")

      // スクリーンショット保存
      await page.screenshot({
        path: path.join(screenshotsDir, "custom-category-success.png")
      })
    } catch (error) {
      console.error(
        "Custom category E2E test failed, capturing failure screenshot..."
      )
      await page.screenshot({
        path: path.join(screenshotsDir, "custom-category-failure.png")
      })
      throw error
    }
  })
})
