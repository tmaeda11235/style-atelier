export type Language = "en" | "ja"

export const i18nDict = {
  en: {
    welcome: {
      title: "Welcome to Style Atelier!",
      description:
        "Would you like to start the interactive guide to learn how to use it?",
      start: "Start Guide",
      skip: "Skip (You can start it later from the Guide button)"
    },
    onboarding: {
      quickGuide: "Quick Guide",
      back: "Back",
      next: "Next",
      letsStart: "Let's Start!",
      steps: [
        {
          title: "1. History to Panel",
          description:
            "Drag and drop any generated image from Midjourney directly into the History tab of the Side Panel to import it."
        },
        {
          title: "2. Mint Your Card",
          description:
            "Click the 'Mint' button on the imported history item to start crafting your custom Style Card."
        },
        {
          title: "3. Name Your Creation",
          description:
            "Enter a descriptive and unique title for your new card. This helps you identify and search for it later in your Library."
        },
        {
          title: "4. Parameter Slotting",
          description:
            "Select specific segments of your prompt text to convert them into editable 'Slots' (variables)."
        },
        {
          title: "5. Choose Rarity",
          description:
            "Assign a rarity tier to your card. Premium rarities feature stunning visual designs and holographic frames in the Library."
        },
        {
          title: "6. Add to Your Hand",
          description:
            "Simply click any Style Card in your Library. It will instantly move to your HandBar at the bottom of the screen."
        },
        {
          title: "7. Edit in Workbench",
          description:
            "Navigate to the Workbench tab to customize the variables of your cards, combine different styles, and generate final prompt strings."
        }
      ]
    },
    settings: {
      title: "Settings",
      languageLabel: "Language",
      languageDesc: "Switch the interface display language.",
      easyModeLabel: "Easy Mode",
      easyModeDesc:
        "Simplifies the UI by showing only the Library tab. You can return to Settings anytime via the gear icon.",
      easyModeToggleLabel: "Enable Easy Mode",
      easyModeToggleSub: "Hide tabs to focus on Style Card management",
      gdriveSyncLabel: "Google Drive Cloud Sync",
      gdriveSyncDesc:
        "Backup your local style cards and binders to Google Drive. Keep your decks safe and load them on other devices.",
      cloudBackupLabel: "Cloud Backup: ",
      loadingCloudBackup: "Fetching cloud backup info...",
      noCloudBackup: "No cloud backup file found",
      lastBackupLabel: "Last Local Backup: ",
      syncingText: "Syncing...",
      syncButtonText: "Sync with Google Drive",
      syncingStart: "Starting Google Drive sync...",
      syncingFetch: "Fetching data from Google Drive...",
      syncingProgress: "Downloading data",
      syncingMerge: "Merging data...",
      syncingPrepare: "Preparing sync data...",
      syncingUpload: "Uploading data...",
      syncSuccess: "Sync completed successfully",
      syncCancelled: "Sync cancelled by user",
      syncTimeout: "Sync timed out. Please check your network connection.",
      syncFailed: "Sync failed",
      restoreConfirmMsg:
        "Force recover database from Google Drive. This will completely overwrite all local data. Your current cards and configurations will be lost forever. This action cannot be undone. Are you sure?",
      restoreConfirmHeader: "[Cloud Backup Information]",
      restoreConfirmTime: "Modified Time: ",
      restoreConfirmSize: "Size: ",
      restoreBtnText: "Force Restore from Google Drive",
      restoreLoading: "Restoring from Google Drive...",
      restoreProgress: "Downloading data",
      restoreSuccess: "Force recovery completed successfully!",
      restoreFailed: "Force recovery failed",
      restoreCancelled: "Force recovery cancelled by user",
      googleDriveToggleLabel: "Enable Google Drive Sync",
      googleDriveToggleSub: "Activates backup and restore buttons",
      securityNote:
        "Credentials are never saved in the extension. They are only used for temporary access during backup and restore operations.",
      storageTitle: "Storage Management",
      storageDesc: "Check database usage and limit in the browser.",
      storageUsage: "Usage",
      storageLoading: "Loading storage info...",
      storageWarning90Title: "Warning: Low space (Over 90% used)",
      storageWarning90Desc:
        "Adding new cards or restoring may fail. Please clear history or delete unused cards.",
      storageWarning80Title: "Notice: Low space (Over 80% used)",
      storageWarning80Desc:
        "Consider clearing history or exporting a backup to free up space.",
      cleanupHistoryLabel: "Cleanup Prompt History",
      clearHistoryConfirm:
        "Are you sure you want to delete all prompt history? (Style Cards and Categories will not be deleted)",
      clearHistorySuccess: "Prompt history cleared successfully",
      clearHistoryFailed: "Failed to clear history",
      localBackupTitle: "Local File Backup (Offline)",
      localBackupDesc:
        "Export your style cards and binders to a local JSON file, or restore from a previously exported backup file. Perfect for offline migrations or keeping absolute privacy.",
      exportBtn: "Export JSON",
      importBtn: "Import JSON",
      importConfirm:
        "Restore (merge) data from local file. Conflicting data will resolve to the newer modification date. Proceed?",
      readingFile: "Reading file...",
      importSuccess: "Database restored from local JSON file successfully!",
      importFailed: "Import failed",
      privacyNote:
        "Data is processed entirely in the browser and local environment. It is never sent to any external server and works offline.",
      dangerZoneTitle: "Danger Zone",
      dangerZoneDesc:
        "Reset the database to its pristine state, or force recover database from Google Drive by overwriting local changes.",
      resetSuccess: "Database reset completed successfully.",
      expertFeaturesTitle: "Expert Features Configuration",
      expertFeaturesDesc:
        "Select which advanced features to enable in Expert Mode.",
      groupCardFeatures: "Card Features",
      groupOrganization: "Organization",
      groupWorkbench: "Workbench Features",
      featureStackLabel: "Card Stacking (Stack)",
      featureStackSub: "Merge pinned cards to create new cards",
      featureSlotLabel: "Prompt Slotting (Slot)",
      featureSlotSub: "Turn prompt segments into editable variables",
      featureRarityLabel: "Rarity Selection",
      featureRaritySub: "Assign and filter cards by rarity levels",
      featureTagsLabel: "Tagging Feature",
      featureTagsSub: "Add custom tags to cards for easy searching",
      featureCategoriesLabel: "Category Management",
      featureCategoriesSub: "Organize cards into customizable categories",
      featureMultiCardLabel: "Multi-card Usage",
      featureMultiCardSub: "Pin and mix multiple cards on the workbench",
      featureCardEditingLabel: "Card Editing",
      featureCardEditingSub:
        "Edit the name, prompt, and parameters of created cards",
      featureMultiImageLabel: "Multi-image Selection",
      featureMultiImageSub: "Select up to 4 images for the card thumbnail grid"
    },
    categoryManager: {
      selectCardIcon: "Select Card Icon",
      addCategory: "Add Category",
      manageCategories: "Manage Categories",
      editCategoryName: 'Edit "{name}"',
      clickToUseThumb:
        "Click on a Style Card below to use its thumbnail as the icon for this category.",
      noCardsFound: "No cards found in Library.",
      select: "Select",
      categoryName: "Category Name",
      placeholderName: "e.g. Cyberpunk, Retro",
      emojiIcon: "Emoji Icon",
      placeholderEmoji: "e.g. 🎨, 🛸",
      libraryIcon: "Library Icon",
      changeIcon: "Change Icon",
      selectImage: "Select Image",
      iconPreview: "Icon Preview",
      clearImage: "Clear Image",
      cancelEdit: "Cancel Edit",
      saveChanges: "Save Changes",
      cancel: "Cancel",
      createCategory: "Create Category",
      listDescription:
        "List of custom and system categories. Custom categories can be edited or deleted.",
      systemDefault: "System Default",
      editTooltip: "Edit Category",
      deleteTooltip: "Delete Category",
      confirmDelete:
        'Are you sure you want to delete the category "{name}"? All style cards in this category will be reassigned to "No Category".',
      logDeleted: 'Deleted category "{name}"',
      errDeleteFailed: "Failed to delete category. Please try again.",
      alertEnterName: "Please enter a category name.",
      alertAlreadyExists: "A category with this name already exists.",
      logUpdated: 'Updated category "{name}"',
      errUpdateFailed: "Failed to update category. Please try again.",
      logCreated: 'Created category "{name}"',
      errAddFailed: "Failed to add category. Please try again."
    }
  },
  ja: {
    welcome: {
      title: "Style Atelierへようこそ！",
      description:
        "実際に操作しながら使い方を覚える\nインタラクティブなガイドを開始しますか？",
      start: "ガイドを開始する",
      skip: "スキップ（あとでGuideボタンから開始できます）"
    },
    onboarding: {
      quickGuide: "クイックガイド",
      back: "戻る",
      next: "次へ",
      letsStart: "はじめる！",
      steps: [
        {
          title: "1. 履歴のインポート",
          description:
            "Midjourneyで生成された画像をサイドパネルの「History」タブにドラッグ＆ドロップすると、簡単にインポートできます。"
        },
        {
          title: "2. カードをミントする",
          description:
            "インポートされた履歴アイテムの「Mint」ボタンをクリックして、カスタムスタイルカードの作成を開始します。"
        },
        {
          title: "3. カード名を入力する",
          description:
            "カードにわかりやすくユニークな名前を付けます。これにより、ライブラリでの識別や検索が簡単になります。"
        },
        {
          title: "4. パラメーターのスロット化",
          description:
            "プロンプト内の特定のテキストを選択して、編集可能な「スロット」（変数）に変換します。"
        },
        {
          title: "5. レアリティの選択",
          description:
            "カードにレアリティを割り当てます。高レアリティのカードには、ライブラリで特別な視覚効果やフレームが適用されます。"
        },
        {
          title: "6. 手札に追加する",
          description:
            "ライブラリ内のスタイルカードをクリックするだけで、画面下部の手札バー（HandBar）に即座に追加されます。"
        },
        {
          title: "7. Workbenchで編集する",
          description:
            "Workbenchタブでカードの変数をカスタマイズし、複数のスタイルを組み合わせ、最終的なプロンプトを生成します。"
        }
      ]
    },
    settings: {
      title: "設定",
      languageLabel: "表示言語",
      languageDesc: "インターフェースの表示言語を切り替えます。",
      easyModeLabel: "かんたんモード (Easy Mode)",
      easyModeDesc:
        "UIをシンプルにし、Libraryタブのみを表示します。設定には右上の歯車アイコンからいつでも戻ることができます。",
      easyModeToggleLabel: "かんたんモードを有効にする",
      easyModeToggleSub: "不要なタブを非表示にし、操作ミスを防ぎます",
      gdriveSyncLabel: "Google Drive クラウド同期",
      gdriveSyncDesc:
        "ローカルのスタイルカードやバインダーをGoogle Driveにバックアップします。データを安全に保管し、他のデバイスで読み込むことができます。",
      cloudBackupLabel: "クラウド上のバックアップ: ",
      loadingCloudBackup: "クラウド情報を取得中...",
      noCloudBackup: "クラウド上のバックアップファイルが見つかりません",
      lastBackupLabel: "ローカル最終バックアップ: ",
      syncingText: "同期中...",
      syncButtonText: "Google Driveと同期 (Sync)",
      syncingStart: "Google Drive同期を開始中...",
      syncingFetch: "Google Driveからデータを取得中...",
      syncingProgress: "データをダウンロード中",
      syncingMerge: "データをマージ中...",
      syncingPrepare: "同期データを準備中...",
      syncingUpload: "データをアップロード中...",
      syncSuccess: "同期が完了しました",
      syncCancelled: "同期がキャンセルされました",
      syncTimeout:
        "同期がタイムアウトしました。ネットワーク接続を確認してください。",
      syncFailed: "同期に失敗しました",
      restoreConfirmMsg:
        "Google Driveからデータを強制リカバリ（ロード）し、現在のローカルデータを完全に削除してバックアップの内容で置き換えます。\n現在のローカルデータ（この端末で新規作成したカードも含む）はすべて失われます。この操作は取り消せません。本当によろしいですか？",
      restoreConfirmHeader: "【クラウド上のバックアップ情報】",
      restoreConfirmTime: "更新日時: ",
      restoreConfirmSize: "サイズ: ",
      restoreBtnText: "Google Driveから強制リカバリ",
      restoreLoading: "Google Driveから強制リカバリ中...",
      restoreProgress: "データをダウンロード中",
      restoreSuccess: "強制リカバリが完了しました！",
      restoreFailed: "強制リカバリに失敗しました",
      restoreCancelled: "強制リカバリがキャンセルされました",
      googleDriveToggleLabel: "Google Drive同期を有効にする",
      googleDriveToggleSub: "バックアップ・復元用のボタンが活性化します",
      securityNote:
        "認証情報は拡張機能には一切保存されません。バックアップ・復元操作時の一時的なアクセス（Google Drive内の自身が作成したバックアップファイル）にのみ使用されます。",
      storageTitle: "ストレージ管理",
      storageDesc:
        "ブラウザに保存されているデータの使用状況と上限を確認します。",
      storageUsage: "使用量",
      storageLoading: "ストレージ情報を取得中...",
      storageWarning90Title: "警告: 容量制限に近いです (使用率 90% 超)",
      storageWarning90Desc:
        "新規カードの追加や復元が失敗する恐れがあります。不要な履歴データをクリアするか、不要なカードを削除してください。",
      storageWarning80Title:
        "注意: 空き容量が少なくなっています (使用率 80% 超)",
      storageWarning80Desc:
        "容量に余裕を持たせるため、不要な履歴の削除や、外部バックアップのエクスポートをご検討ください。",
      cleanupHistoryLabel: "プロンプト履歴のクリーンアップ",
      clearHistoryConfirm:
        "プロンプト履歴データをすべて削除します。よろしいですか？\n(※作成したスタイルカードやカテゴリーは削除されません)",
      clearHistorySuccess: "履歴データを削除しました",
      clearHistoryFailed: "履歴データの削除に失敗しました",
      localBackupTitle: "ローカルバックアップ (オフライン)",
      localBackupDesc:
        "スタイルカードとバインダーのデータをローカルのJSONファイルにエクスポート、または過去にエクスポートしたバックアップファイルから復元します。オフラインでの移行や完全なプライバシー保護に最適です。",
      exportBtn: "JSONエクスポート",
      importBtn: "JSONインポート",
      importConfirm:
        "ローカルファイルからデータを復元（マージ）します。\n競合するデータは更新日時が新しい方が優先されますがよろしいですか？",
      readingFile: "ファイルを読み込み中...",
      importSuccess: "インポートが完了しました！",
      importFailed: "インポートに失敗しました",
      privacyNote:
        "データは完全にブラウザとローカル環境のみで処理されます。外部サーバーに送信されることはなく、完全なオフライン環境でも動作します。",
      dangerZoneTitle: "危険ゾーン",
      dangerZoneDesc:
        "データベースを初期状態にリセットするか、Google Driveからバックアップデータを読み込んでローカルの変更を上書きします。",
      resetSuccess: "データベースのリセットが完了しました。",
      expertFeaturesTitle: "エキスパート機能の個別設定",
      expertFeaturesDesc:
        "エキスパートモードで有効にする機能を個別に選択します。",
      groupCardFeatures: "カード機能",
      groupOrganization: "管理・整理機能",
      groupWorkbench: "ワークベンチ機能",
      featureStackLabel: "Stack（カード統合）",
      featureStackSub: "手札のカードを統合して新しいカードを作成します",
      featureSlotLabel: "Slot（変数穴あけ）",
      featureSlotSub: "プロンプト内の単語を変数化し、動的に入力します",
      featureRarityLabel: "レアリティ選択",
      featureRaritySub: "カードにレアリティ（SR, SSR等）を設定して管理します",
      featureTagsLabel: "タグ機能",
      featureTagsSub: "カードに任意のタグを付与して検索しやすくします",
      featureCategoriesLabel: "カテゴリ管理",
      featureCategoriesSub: "バインダー内のカードをカテゴリごとに分類します",
      featureMultiCardLabel: "複数カード同時使用",
      featureMultiCardSub: "手札に複数のカードを配置してプロンプトを合成します",
      featureCardEditingLabel: "カード編集機能",
      featureCardEditingSub:
        "作成済みのカード名やプロンプト内容を後から編集します",
      featureMultiImageLabel: "複数画像選択（サムネイル）",
      featureMultiImageSub: "カードに複数の画像を登録し、スライド表示します"
    },
    categoryManager: {
      selectCardIcon: "カードアイコンの選択",
      addCategory: "カテゴリ追加",
      manageCategories: "カテゴリ管理",
      editCategoryName: '"{name}" を編集',
      clickToUseThumb:
        "下のスタイルカードをクリックして、サムネイルをカテゴリのアイコンとして使用します。",
      noCardsFound: "ライブラリにカードが見つかりません。",
      select: "選択",
      categoryName: "カテゴリ名",
      placeholderName: "例: サイバーパンク、レトロ",
      emojiIcon: "絵文字アイコン",
      placeholderEmoji: "例: 🎨, 🛸",
      libraryIcon: "ライブラリ画像",
      changeIcon: "アイコン変更",
      selectImage: "画像を選択",
      iconPreview: "アイコンプレビュー",
      clearImage: "画像をクリア",
      cancelEdit: "編集をキャンセル",
      saveChanges: "変更を保存",
      cancel: "キャンセル",
      createCategory: "カテゴリを作成",
      listDescription:
        "カスタムおよびシステムカテゴリの一覧です。カスタムカテゴリは編集または削除できます。",
      systemDefault: "システムデフォルト",
      editTooltip: "カテゴリを編集",
      deleteTooltip: "カテゴリを削除",
      confirmDelete:
        'カテゴリ "{name}" を削除してもよろしいですか？このカテゴリ内のすべてのスタイルカードは「カテゴリなし」に再割り当てされます。',
      logDeleted: 'カテゴリ "{name}" を削除しました',
      errDeleteFailed: "カテゴリの削除に失敗しました。もう一度お試しください。",
      alertEnterName: "カテゴリ名を入力してください。",
      alertAlreadyExists: "この名前のカテゴリは既に存在します。",
      logUpdated: 'カテゴリ "{name}" を更新しました',
      errUpdateFailed: "カテゴリの更新に失敗しました。もう一度お試しください。",
      logCreated: 'カテゴリ "{name}" を作成しました',
      errAddFailed: "カテゴリの追加に失敗しました。もう一度お試しください。"
    }
  }
}
