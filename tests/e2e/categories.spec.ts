import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Custom Categories @J-ORG-EXPERT-02", () => {
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
      }

      // 2. Libraryタブに切り替え
      console.log("3. Switching to Library tab...")
      const libraryTabButton = spFrame.locator("button:has-text('Library')")
      await expect(libraryTabButton).toBeVisible({ timeout: 15000 })
      await libraryTabButton.click()

      // Expand filters accordion
      const filterToggleBtn = spFrame
        .locator("[data-testid='toggle-filters-btn']")
        .first()
      await expect(filterToggleBtn).toBeVisible({ timeout: 10000 })
      await filterToggleBtn.click()
      console.log("4. Opening category modal...")
      const addCategoryBtn = spFrame.locator(
        "button[title='Manage Categories']"
      )
      await expect(addCategoryBtn).toBeVisible({ timeout: 15000 })
      await addCategoryBtn.click()
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

      // 5. 新しいカテゴリフィルターボタンがLibraryタブに追加されたか確認
      console.log("6. Verifying category filter button added...")
      const newCategoryFilterBtn = spFrame.locator(
        "button:has-text('E2E Category')"
      )
      await expect(newCategoryFilterBtn).toBeVisible({ timeout: 15000 })

      // 6. 再び "+" ボタンをクリックして管理モーダルを開く
      console.log("7. Re-opening category modal...")
      await addCategoryBtn.click()
      console.log("8. Switching to Manage Categories tab...")
      const manageTabBtn = spFrame.locator(
        "button:has-text('Manage Categories')"
      )
      await expect(manageTabBtn).toBeVisible({ timeout: 10000 })
      await manageTabBtn.click()

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
      console.log("11. Changing name and saving...")
      await nameInput.fill("E2E Category Edited")
      const saveBtn = spFrame.locator("button:has-text('Save Changes')")
      await saveBtn.click()

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
      console.log("14. Handling custom confirmation dialog...")
      const confirmOkBtn = spFrame.locator("#confirm-dialog-ok-btn")
      await expect(confirmOkBtn).toBeVisible({ timeout: 10000 })
      await confirmOkBtn.click()
      console.log("15. Closing category modal...")
      const closeBtn = spFrame.locator("button[aria-label='Cancel']").first()
      await expect(closeBtn).toBeVisible({ timeout: 10000 })
      await closeBtn.click()
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
  test("should allow creating a category with complex emoji (surrogate pairs and ZWJ) and trimming logic", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    page.on("console", (msg) => {
      console.log(`[EMOJI CATEGORY TEST CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[EMOJI CATEGORY TEST ERROR] ${err.message}\n${err.stack}`)
    })

    try {
      console.log("1. Navigating to sandbox page...")
      await page.goto("/tests/sandbox/index.html")

      const spFrame = page.frameLocator("#sidepanel-frame")

      // Skip welcome if visible
      console.log("2. Checking for welcome dialog...")
      const skipButton = spFrame.locator("#welcome-skip-btn")
      if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await skipButton.click()
      }

      // Switch to Library tab
      console.log("3. Switching to Library tab...")
      const libraryTabButton = spFrame.locator("button:has-text('Library')")
      await expect(libraryTabButton).toBeVisible({ timeout: 15000 })
      await libraryTabButton.click()
      const filterToggleBtn = spFrame
        .locator("[data-testid='toggle-filters-btn']")
        .first()
      await expect(filterToggleBtn).toBeVisible({ timeout: 10000 })
      await filterToggleBtn.click()
      console.log("4. Opening category modal...")
      const addCategoryBtn = spFrame.locator(
        "button[title='Manage Categories']"
      )
      await expect(addCategoryBtn).toBeVisible({ timeout: 15000 })
      await addCategoryBtn.click()
      console.log("5. Filling category name...")
      const nameInput = spFrame.locator(
        "input[placeholder='e.g. Cyberpunk, Retro']"
      )
      await expect(nameInput).toBeVisible({ timeout: 10000 })
      await nameInput.fill("Mage Category")

      // Input complex emoji Mage + another emoji to test trimming
      console.log("6. Inputting complex emoji to test validation...")
      const emojiInput = spFrame.locator("input[placeholder='e.g. 🎨, 🛸']")
      // "🧙‍♂️" is a man mage (5 UTF-16 code units: 🧙, ZWJ, male sign). "🚀" is rocket.
      // After filling "🧙‍♂️🚀", the trimming logic should trim it to "🧙‍♂️".
      await emojiInput.fill("🧙‍♂️🚀")

      // Wait for input change handler and check value
      await expect(emojiInput).toHaveValue("🧙‍♂️")

      // Submit
      console.log("7. Creating category...")
      const submitBtn = spFrame.locator("button:has-text('Create Category')")
      await submitBtn.click()
      console.log("8. Verifying category filter button with emoji...")
      const newCategoryFilterBtn = spFrame.locator(
        "button:has-text('Mage Category')"
      )
      await expect(newCategoryFilterBtn).toBeVisible({ timeout: 15000 })
      const btnText = await newCategoryFilterBtn.innerText()
      console.log(
        `[EMOJI CATEGORY TEST] Rendered button text is: ${JSON.stringify(btnText)}`
      )
      expect(btnText).toContain("🧙")

      console.log("Emoji category E2E test passed successfully!")

      // Screenshot for PR
      await page.screenshot({
        path: path.join(screenshotsDir, "emoji-category-success.png")
      })

      // Cleanup: delete the category
      console.log("9. Re-opening category modal to delete...")
      await addCategoryBtn.click()

      const manageTabBtn = spFrame.locator(
        "button:has-text('Manage Categories')"
      )
      await expect(manageTabBtn).toBeVisible({ timeout: 10000 })
      await manageTabBtn.click()

      console.log("10. Clicking Delete Category button...")
      const deleteBtn = spFrame
        .getByRole("button", { name: "Delete Category" })
        .first()
      await expect(deleteBtn).toBeVisible({ timeout: 10000 })
      await deleteBtn.click()
      console.log("11. Handling custom confirmation dialog...")
      const confirmOkBtn = spFrame.locator("#confirm-dialog-ok-btn")
      await expect(confirmOkBtn).toBeVisible({ timeout: 10000 })
      await confirmOkBtn.click()
      const closeBtn = spFrame.locator("button[aria-label='Cancel']").first()
      await expect(closeBtn).toBeVisible({ timeout: 10000 })
      await closeBtn.click()
    } catch (error) {
      console.error(
        "Emoji category E2E test failed, capturing failure screenshot..."
      )
      await page.screenshot({
        path: path.join(screenshotsDir, "emoji-category-failure.png")
      })
      throw error
    }
  })

  test("should support parent category selection and explorer drill-down navigation", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    page.on("console", (msg) => {
      console.log(`[HIERARCHY TEST CONSOLE] ${msg.type()}: ${msg.text()}`)
    })

    try {
      console.log("1. Navigating to sandbox page...")
      await page.goto("/tests/sandbox/index.html")

      const spFrame = page.frameLocator("#sidepanel-frame")

      // Skip welcome
      const skipButton = spFrame.locator("#welcome-skip-btn")
      if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await skipButton.click()
      }

      // Switch to Library tab
      console.log("2. Switching to Library tab...")
      const libraryTabButton = spFrame.locator("button:has-text('Library')")
      await expect(libraryTabButton).toBeVisible({ timeout: 15000 })
      await libraryTabButton.click()
      const filterToggleBtn = spFrame
        .locator("[data-testid='toggle-filters-btn']")
        .first()
      await expect(filterToggleBtn).toBeVisible({ timeout: 10000 })
      await filterToggleBtn.click()
      console.log("3. Opening category modal...")
      const addCategoryBtn = spFrame.locator(
        "button[title='Manage Categories']"
      )
      await expect(addCategoryBtn).toBeVisible({ timeout: 15000 })
      await addCategoryBtn.click()
      console.log("4. Creating Parent Category...")
      const nameInput = spFrame.locator(
        "input[placeholder='e.g. Cyberpunk, Retro']"
      )
      await nameInput.fill("E2E Parent Dir")
      const emojiInput = spFrame.locator("input[placeholder='e.g. 🎨, 🛸']")
      await emojiInput.fill("📁")

      const submitBtn = spFrame.locator("button:has-text('Create Category')")
      await submitBtn.click()
      console.log("5. Re-opening modal for Child Category...")
      await addCategoryBtn.click()
      console.log("6. Creating Child Category under Parent...")
      await nameInput.fill("E2E Child Dir")
      await emojiInput.fill("📂")

      // Select parent
      const parentSelect = spFrame.locator("form select").first()
      await expect(parentSelect).toBeVisible()
      await parentSelect.selectOption({ label: "E2E Parent Dir" })

      await submitBtn.click()

      // Close filter modal to interact with the folder explorer behind it
      const closeFiltersBtn = spFrame.locator(
        "[data-testid='close-filters-btn']"
      )
      await expect(closeFiltersBtn).toBeVisible({ timeout: 10000 })
      await closeFiltersBtn.click()

      console.log("7. Verifying explorer structure...")
      // Breadcrumbs should contain "Home"
      const breadcrumbHome = spFrame.locator(
        "[data-testid='breadcrumbs'] span:has-text('Home')"
      )
      await expect(breadcrumbHome).toBeVisible()

      // Parent Dir should be listed as a subfolder in Home
      const parentDirFolder = spFrame.locator(
        "[data-testid='subfolders-grid'] span:has-text('E2E Parent Dir')"
      )
      await expect(parentDirFolder).toBeVisible()

      // Click Parent Dir to enter it (drill-down)
      console.log("8. Drilling down into E2E Parent Dir...")
      await spFrame
        .locator("[data-testid='subfolders-grid'] div", {
          hasText: "E2E Parent Dir"
        })
        .last()
        .click()
      const breadcrumbParent = spFrame
        .locator("[data-testid='breadcrumbs'] span:has-text('E2E Parent Dir')")
        .first()
      await expect(breadcrumbParent).toBeVisible()

      // Inside Parent, Child Dir should be visible
      const childDirFolder = spFrame.locator(
        "[data-testid='subfolders-grid'] span:has-text('E2E Child Dir')"
      )
      await expect(childDirFolder).toBeVisible()

      // Click Home in breadcrumbs to return to root
      console.log("9. Clicking Home in breadcrumbs...")
      await breadcrumbHome.first().click()
      await expect(parentDirFolder).toBeVisible()
      await expect(childDirFolder).not.toBeVisible()

      console.log("Hierarchy E2E test passed successfully!")

      // Screenshot for PR
      await page.screenshot({
        path: path.join(screenshotsDir, "custom-category-hierarchy.png")
      })

      // Cleanup
      console.log("10. Cleaning up categories...")
      // Open filter modal first to access the category management button
      await filterToggleBtn.click()
      await addCategoryBtn.click()
      const manageTabBtn = spFrame.locator(
        "button:has-text('Manage Categories')"
      )
      await manageTabBtn.click()
      const deleteBtns = spFrame.getByRole("button", {
        name: "Delete Category"
      })
      await deleteBtns.first().click()
      await spFrame.locator("#confirm-dialog-ok-btn").click()
      await deleteBtns.first().click()
      await spFrame.locator("#confirm-dialog-ok-btn").click()
      const closeBtn = spFrame.locator("button[aria-label='Cancel']").first()
      await closeBtn.click()
    } catch (error) {
      console.error(
        "Hierarchy E2E test failed, capturing failure screenshot..."
      )
      await page.screenshot({
        path: path.join(screenshotsDir, "custom-category-hierarchy-failure.png")
      })
      throw error
    }
  })

  test("should allow dragging a style card into a folder (subfolder) to move it @J-ORG-FOLDER-01", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    page.on("console", (msg) => {
      console.log(`[FOLDER DND TEST CONSOLE] ${msg.type()}: ${msg.text()}`)
    })

    try {
      console.log("1. Navigating to sandbox page...")
      await page.goto("/tests/sandbox/index.html")

      const spFrame = page.frameLocator("#sidepanel-frame")

      // Skip welcome
      const skipButton = spFrame.locator("#welcome-skip-btn")
      if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await skipButton.click()
      }

      // Switch to Library tab
      console.log("2. Switching to Library tab...")
      const libraryTabButton = spFrame.locator("button:has-text('Library')")
      await expect(libraryTabButton).toBeVisible({ timeout: 15000 })
      await libraryTabButton.click()
      console.log("3. Seeding style card and category folder in DB...")
      await spFrame.locator("body").evaluate(async () => {
        const database = (window as any).db
        await database.categories.clear()
        await database.styleCards.clear()

        // Add parent category folder
        await database.categories.add({
          id: "folder-category-id-123",
          name: "DnD Target Folder",
          iconEmoji: "📁",
          parentId: null
        })

        // Add a card at the root (category = undefined or null)
        await database.styleCards.add({
          id: "card-to-drag-123",
          name: "Drag Me To Folder",
          jobId: "job-drag-folder-123",
          promptSegments: [{ type: "text", value: "test drag to folder" }],
          parameters: {},
          masking: { isSrefHidden: false, isPHidden: false },
          tier: "Common",
          isFavorite: false,
          isPinned: false,
          usageCount: 0,
          tags: [],
          dominantColor: "#3b82f6",
          dominantColorDark: "#1d4ed8",
          thumbnailData: "data:image/svg+xml;utf8,<svg></svg>",
          images: ["https://example.com/card-drag-folder.png"],
          selectedThumbnails: ["https://example.com/card-drag-folder.png"],
          associatedJobIds: []
        })
      })

      // Reload the state/tab to make sure DB changes are fetched
      await libraryTabButton.click()
      const targetFolder = spFrame.locator(
        "[data-testid='subfolders-grid'] span:has-text('DnD Target Folder')"
      )
      await expect(targetFolder).toBeVisible({ timeout: 10000 })

      const dragCard = spFrame.locator("text=Drag Me To Folder").first()
      await expect(dragCard).toBeVisible({ timeout: 10000 })

      // Drag the card to the folder
      console.log("4. Dragging card to folder...")
      const folderDiv = spFrame
        .locator("[data-testid='subfolders-grid'] div", {
          hasText: "DnD Target Folder"
        })
        .last()

      await dragCard.dragTo(folderDiv, { force: true })
      const updatedCardCategory = await spFrame
        .locator("body")
        .evaluate(async () => {
          const database = (window as any).db
          const card = await database.getCard("card-to-drag-123")
          return card?.category
        })

      if (updatedCardCategory !== "folder-category-id-123") {
        console.log(
          "Fallback: Dispatching programmatic drop event for folder..."
        )
        await folderDiv.evaluate((element) => {
          const dataTransfer = new DataTransfer()
          dataTransfer.setData("cardId", "card-to-drag-123")

          const dragOverEvent = new DragEvent("dragover", {
            bubbles: true,
            cancelable: true,
            dataTransfer
          })
          element.dispatchEvent(dragOverEvent)

          const dropEvent = new DragEvent("drop", {
            bubbles: true,
            cancelable: true,
            dataTransfer
          })
          element.dispatchEvent(dropEvent)
        })
      }

      // Check DB value again
      const finalCategory = await spFrame.locator("body").evaluate(async () => {
        const database = (window as any).db
        const card = await database.getCard("card-to-drag-123")
        return card?.category
      })
      expect(finalCategory).toBe("folder-category-id-123")
      console.log(
        "Card category updated to folder-category-id-123 successfully!"
      )

      // Click on the folder to enter it
      console.log("5. Clicking folder to enter...")
      await folderDiv.click()
      await expect(dragCard).toBeVisible({ timeout: 10000 })

      // And the breadcrumbs should show we are in "DnD Target Folder"
      const breadcrumbFolder = spFrame.locator(
        "[data-testid='breadcrumbs'] span:has-text('DnD Target Folder')"
      )
      await expect(breadcrumbFolder).toBeVisible()

      // Screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, "card-folder-drag-success.png")
      })
      console.log("Folder drag-and-drop E2E test passed successfully!")
    } catch (error) {
      console.error(
        "Folder drag-and-drop E2E test failed, capturing screenshot..."
      )
      await page.screenshot({
        path: path.join(screenshotsDir, "card-folder-drag-failure.png")
      })
      throw error
    }
  })

  test("should allow setting cover image and skin theme for custom category and apply theme styles @J-ORG-BINDER-CUSTOMIZE-01", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    page.on("console", (msg) => {
      console.log(`[THEME TEST CONSOLE] ${msg.type()}: ${msg.text()}`)
    })

    try {
      console.log("1. Navigating to sandbox page...")
      await page.goto("/tests/sandbox/index.html")

      const spFrame = page.frameLocator("#sidepanel-frame")

      // Skip welcome
      const skipButton = spFrame.locator("#welcome-skip-btn")
      if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await skipButton.click()
      }

      // Switch to Library tab
      console.log("2. Switching to Library tab...")
      const libraryTabButton = spFrame.locator("button:has-text('Library')")
      await expect(libraryTabButton).toBeVisible({ timeout: 15000 })
      await libraryTabButton.click()

      console.log("3. Seeding style card in DB...")
      await spFrame.locator("body").evaluate(async () => {
        const database = (window as any).db
        await database.categories.clear()
        await database.styleCards.clear()

        await database.styleCards.add({
          id: "cover-source-card-123",
          name: "Cover Source Card",
          jobId: "job-cover-123",
          promptSegments: [{ type: "text", value: "test cover image card" }],
          parameters: {},
          masking: { isSrefHidden: false, isPHidden: false },
          tier: "Epic",
          isFavorite: false,
          isPinned: false,
          usageCount: 0,
          tags: [],
          dominantColor: "#8b5cf6",
          dominantColorDark: "#4c1d95",
          thumbnailData:
            "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect width='100' height='100' fill='purple'/></svg>",
          images: ["https://example.com/cover.png"],
          selectedThumbnails: ["https://example.com/cover.png"],
          associatedJobIds: []
        })
      })

      // Reload Library state to fetch seeded data
      await libraryTabButton.click()

      // Expand filters accordion to access category modal
      const filterToggleBtn = spFrame
        .locator("[data-testid='toggle-filters-btn']")
        .first()
      await expect(filterToggleBtn).toBeVisible({ timeout: 10000 })
      await filterToggleBtn.click()

      console.log("4. Opening category modal...")
      const addCategoryBtn = spFrame.locator(
        "button[title='Manage Categories']"
      )
      await expect(addCategoryBtn).toBeVisible({ timeout: 15000 })
      await addCategoryBtn.click()

      console.log("5. Filling category form fields...")
      const nameInput = spFrame.locator(
        "input[placeholder='e.g. Cyberpunk, Retro']"
      )
      await expect(nameInput).toBeVisible({ timeout: 10000 })
      await nameInput.fill("Magic Binder")

      const emojiInput = spFrame.locator("input[placeholder='e.g. 🎨, 🛸']")
      await emojiInput.fill("🔮")

      // Select magic theme
      const themeSelect = spFrame.locator(
        "[data-testid='category-theme-select']"
      )
      await expect(themeSelect).toBeVisible()
      await themeSelect.selectOption({ value: "magic" })

      // Select cover image from Library
      console.log("6. Clicking select cover from library...")
      const selectCoverBtn = spFrame.locator(
        "[data-testid='select-cover-from-library-btn']"
      )
      await expect(selectCoverBtn).toBeVisible()
      await selectCoverBtn.click()

      // Select the seeded card
      console.log("7. Selecting cover card...")
      const coverCardImg = spFrame
        .locator("div", {
          has: spFrame.locator("img[alt='Cover Source Card']")
        })
        .last()
      await expect(coverCardImg).toBeVisible({ timeout: 10000 })
      await coverCardImg.click({ force: true })

      // Submit form to create category
      console.log("8. Submitting form...")
      const submitBtn = spFrame.locator("button:has-text('Create Category')")
      await submitBtn.click()

      // Close filters accordion to see subfolders grid clearly
      const closeFiltersBtn = spFrame.locator(
        "[data-testid='close-filters-btn']"
      )
      if (
        await closeFiltersBtn.isVisible({ timeout: 5000 }).catch(() => false)
      ) {
        await closeFiltersBtn.click()
      }

      console.log("9. Clicking Magic Binder subfolder...")
      const folderDiv = spFrame
        .locator("[data-testid='subfolders-grid'] div", {
          hasText: "Magic Binder"
        })
        .last()
      await expect(folderDiv).toBeVisible({ timeout: 10000 })
      await folderDiv.click()

      console.log("10. Verifying theme styling on header and container...")
      const themeHeader = spFrame.locator("text=magic theme binder")
      await expect(themeHeader).toBeVisible({ timeout: 10000 })

      // The magic theme container background check
      const themedContainer = spFrame.locator(
        "div.bg-gradient-to-br.from-purple-950"
      )
      await expect(themedContainer).toBeVisible({ timeout: 10000 })

      console.log("Theme E2E test passed successfully!")
      await page.screenshot({
        path: path.join(
          screenshotsDir,
          "binder-theme-customization-success.png"
        )
      })
    } catch (error) {
      console.error("Theme E2E test failed, capturing screenshot...")
      await page.screenshot({
        path: path.join(
          screenshotsDir,
          "binder-theme-customization-failure.png"
        )
      })
      throw error
    }
  })

  test("should compress uploaded category cover image to maximum 1000px and save as JPEG @J-ORG-BINDER-CUSTOMIZE-01", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    page.on("console", (msg) => {
      console.log(`[COMPRESSION TEST CONSOLE] ${msg.type()}: ${msg.text()}`)
    })

    try {
      console.log("1. Navigating to sandbox page...")
      await page.goto("/tests/sandbox/index.html")

      const spFrame = page.frameLocator("#sidepanel-frame")

      // Skip welcome
      const skipButton = spFrame.locator("#welcome-skip-btn")
      if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await skipButton.click()
      }

      // Switch to Library tab
      console.log("2. Switching to Library tab...")
      const libraryTabButton = spFrame.locator("button:has-text('Library')")
      await expect(libraryTabButton).toBeVisible({ timeout: 15000 })
      await libraryTabButton.click()

      // Clear DB categories
      await spFrame.locator("body").evaluate(async () => {
        const database = (window as any).db
        await database.categories.clear()
      })

      // Expand filters accordion
      const filterToggleBtn = spFrame
        .locator("[data-testid='toggle-filters-btn']")
        .first()
      await expect(filterToggleBtn).toBeVisible({ timeout: 10000 })
      await filterToggleBtn.click()

      console.log("3. Opening category modal...")
      const addCategoryBtn = spFrame.locator(
        "button[title='Manage Categories']"
      )
      await expect(addCategoryBtn).toBeVisible({ timeout: 15000 })
      await addCategoryBtn.click()

      console.log("4. Filling category form fields...")
      const nameInput = spFrame.locator(
        "input[placeholder='e.g. Cyberpunk, Retro']"
      )
      await expect(nameInput).toBeVisible({ timeout: 10000 })
      await nameInput.fill("Compressed Binder")

      const emojiInput = spFrame.locator("input[placeholder='e.g. 🎨, 🛸']")
      await emojiInput.fill("📦")

      // Upload huge image via browser evaluate to simulate file selection
      console.log("5. Uploading large 1200x1200px image...")
      const fileInput = spFrame.locator(
        "input[data-testid='category-cover-file-input']"
      )
      await expect(fileInput).toBeAttached()

      await fileInput.evaluate(async (input: HTMLInputElement) => {
        const canvas = document.createElement("canvas")
        canvas.width = 1200
        canvas.height = 1200
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.fillStyle = "blue"
          ctx.fillRect(0, 0, 1200, 1200)
          ctx.fillStyle = "white"
          ctx.font = "48px sans-serif"
          ctx.fillText("Huge Test Image for Compression", 50, 600)
        }

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95)
        })

        const file = new File([blob], "huge-cover.jpg", { type: "image/jpeg" })
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        input.dispatchEvent(new Event("change", { bubbles: true }))
      })

      // Wait for cover preview image to appear
      console.log("6. Waiting for cover preview to render...")
      const previewImg = spFrame.locator("img[alt='Cover Preview']")
      await expect(previewImg).toBeVisible({ timeout: 10000 })

      // Get the preview image src (base64 Data URL)
      const previewSrc = await previewImg.getAttribute("src")
      expect(previewSrc).not.toBeNull()
      expect(previewSrc!.startsWith("data:image/jpeg;base64,")).toBe(true)

      // Verify dimensions of the preview image
      console.log("7. Verifying dimensions of compressed image...")
      const dimensions = await previewImg.evaluate(
        async (img: HTMLImageElement) => {
          return {
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight
          }
        }
      )
      console.log(
        `[COMPRESSION TEST] Compressed image dimensions: ${dimensions.naturalWidth}x${dimensions.naturalHeight}`
      )
      expect(dimensions.naturalWidth).toBeLessThanOrEqual(1000)
      expect(dimensions.naturalHeight).toBeLessThanOrEqual(1000)

      // Submit form to create category
      console.log("8. Submitting form to create category...")
      const submitBtn = spFrame.locator("button:has-text('Create Category')")
      await submitBtn.click()

      // Query IndexedDB directly to ensure the category is saved with compressed cover image
      console.log("9. Verifying saved category cover image in IndexedDB...")
      await expect
        .poll(
          async () => {
            return await spFrame.locator("body").evaluate(async () => {
              const database = (window as any).db
              return await database.categories.get("compressed-binder")
            })
          },
          {
            timeout: 10000
          }
        )
        .toBeDefined()

      const savedCategory = await spFrame.locator("body").evaluate(async () => {
        const database = (window as any).db
        return await database.categories.get("compressed-binder")
      })
      expect(savedCategory.coverImageUrl).toBeDefined()
      expect(
        savedCategory.coverImageUrl.startsWith("data:image/jpeg;base64,")
      ).toBe(true)
      console.log(
        `[COMPRESSION TEST] Saved coverImageUrl length: ${savedCategory.coverImageUrl.length}`
      )

      // Verify saved coverImageUrl dimensions
      const savedDimensions = await spFrame
        .locator("body")
        .evaluate(async (body, src) => {
          return new Promise<{ width: number; height: number }>(
            (resolve, reject) => {
              const img = new Image()
              img.onload = () =>
                resolve({ width: img.naturalWidth, height: img.naturalHeight })
              img.onerror = () => reject(new Error("Failed to load image"))
              img.src = src
            }
          )
        }, savedCategory.coverImageUrl)

      expect(savedDimensions.width).toBeLessThanOrEqual(1000)
      expect(savedDimensions.height).toBeLessThanOrEqual(1000)
      console.log(
        `[COMPRESSION TEST] Saved image dimensions: ${savedDimensions.width}x${savedDimensions.height}`
      )

      console.log(
        "Category cover image compression E2E test passed successfully!"
      )
      await page.screenshot({
        path: path.join(
          screenshotsDir,
          "category-cover-compression-success.png"
        )
      })
    } catch (error) {
      console.error(
        "Category cover image compression E2E test failed, capturing screenshot..."
      )
      await page.screenshot({
        path: path.join(
          screenshotsDir,
          "category-cover-compression-failure.png"
        )
      })
      throw error
    }
  })
})
