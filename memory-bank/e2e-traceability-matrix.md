# E2E トレーサビリティマトリクス

このドキュメントはユーザージャーニーとPlaywright E2Eテストの対応状況をマッピングしたものです。

| ジャーニーID                    | ジャーニー名                                                                     | E2E カバレッジ                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **@J-MINT-EXPERT-01**           | エキスパートミント                                                               | ✔️ `tests\e2e\mint-expert.spec.ts`                                                                                                        |
| **@J-MINT-EASY-01**             | かんたんミント                                                                   | ✔️ `tests\e2e\easy-mode.spec.ts`                                                                                                          |
| **@J-ORG-EXPERT-01**            | カード管理（エキスパート）                                                       | ✔️ `tests\e2e\card-management.spec.ts`                                                                                                    |
| **@J-ORG-EXPERT-02**            | カテゴリ管理                                                                     | ✔️ `tests\e2e\categories.spec.ts`                                                                                                         |
| **@J-ORG-EASY-01**              | かんたんライブラリ                                                               | ✔️ `tests\e2e\easy-mode.spec.ts`                                                                                                          |
| **@J-ORG-COLOR-FILTER-01**      | カラーフィルター操作                                                             | ✔️ `tests\e2e\color-filter-scroll.spec.ts`                                                                                                |
| **@J-WB-EXPERT-01**             | ワークベンチ（エキスパート）                                                     | ✔️ `tests\e2e\workbench.spec.ts`                                                                                                          |
| **@J-WB-EXPERT-02**             | ドラッグ＆ドロップ操作                                                           | ✔️ `tests\e2e\drag-and-drop.spec.ts`                                                                                                      |
| **@J-WB-EXPERT-03**             | プロンプトインジェクション                                                       | ✔️ `tests\e2e\cauldron-affordance.spec.ts`<br>✔️ `tests\e2e\prompt-injection.spec.ts`                                                     |
| **@J-WB-EASY-01**               | かんたんワークベンチ                                                             | ✔️ `tests\e2e\easy-mode.spec.ts`                                                                                                          |
| **@J-IO-QR-OUT**                | QRエクスポート                                                                   | ✔️ `tests\e2e\data-io.spec.ts`                                                                                                            |
| **@J-IO-QR-IN**                 | QRインポート                                                                     | ✔️ `tests\e2e\data-io.spec.ts`                                                                                                            |
| **@J-IO-BACKUP**                | データバックアップ                                                               | ✔️ `tests\e2e\data-io.spec.ts`                                                                                                            |
| **@J-IO-RESTORE**               | データリストア                                                                   | ✔️ `tests\e2e\data-io.spec.ts`                                                                                                            |
| **@J-SYS-01**                   | 履歴表示                                                                         | ✔️ `tests\e2e\history-scroll.spec.ts`                                                                                                     |
| **@J-SYS-02**                   | エキスパートヘルプ                                                               | ✔️ `tests\e2e\expert-help.spec.ts`                                                                                                        |
| **@J-SYS-03**                   | Tipsバー                                                                         | ✔️ `tests\e2e\tips-bar.spec.ts`                                                                                                           |
| **@J-SYS-04**                   | 言語切り替え                                                                     | ✔️ `tests\e2e\i18n-missing-translations.spec.ts`<br>✔️ `tests\e2e\i18n-new-comprehensive.spec.ts`<br>✔️ `tests\e2e\manifest-i18n.spec.ts` |
| **@J-SET-01**                   | アプリ設定                                                                       | ✔️ `tests\e2e\settings.spec.ts`<br>✔️ `tests\e2e\webllm-resilience.spec.ts`                                                               |
| **@J-WB-EXPERT-04**             | スロット変数操作 (ポップオーバー & Dnd)                                          | ✔️ `tests\e2e\slot-ux-dnd.spec.ts`                                                                                                        |
| **@J-ORG-SEARCH-01**            | ライブラリ検索・フィルタ・スクロール                                             | ✔️ `tests\e2e\library-search-scroll.spec.ts`                                                                                              |
| **@J-WB-EXPERT-05**             | 手札バー（HandBar）の最小化・折りたたみとスクロール                              | ✔️ `tests\e2e\handbar-collapse.spec.ts`                                                                                                   |
| **@J-TUTORIAL-01**              | インタラクティブチュートリアル                                                   | ✔️ `tests\e2e\interactive-tutorial.spec.ts`                                                                                               |
| **@J-IO-MJ-DRAG-IN**            | Midjourney履歴ドラッグインポート & フィードバック                                | ✔️ `tests\e2e\drag-and-drop.spec.ts`                                                                                                      |
| **@J-MINT-COLOR-FALLBACK**      | カラー抽出失敗時のフォールバック                                                 | ✔️ `tests\e2e\mint-color-fallback.spec.ts`                                                                                                |
| **@J-ORG-VERSION-01**           | バージョン履歴管理                                                               | ✔️ `tests\e2e\card-management.spec.ts`                                                                                                    |
| **@J-WB-MIXING-WEIGHTS-01**     | 調合割合ウェイト調整                                                             | ✔️ `tests\e2e\atelier-ux-package.spec.ts`                                                                                                 |
| **@J-WB-PORTION-EXTRACT-01**    | 成分抽出とブレンド                                                               | ✔️ `tests\e2e\atelier-ux-package.spec.ts`                                                                                                 |
| **@J-IO-CSV**                   | CSVエクスポート                                                                  | ✔️ `tests\e2e\data-io.spec.ts`                                                                                                            |
| **@J-IO-MD**                    | Markdown ZIPエクスポート                                                         | ✔️ `tests\e2e\data-io.spec.ts`                                                                                                            |
| **@J-WB-ATELIER-EFFECTS-01**    | アトリエ釜と錬金演出                                                             | ✔️ `tests\e2e\workbench.spec.ts`                                                                                                          |
| **@J-ORG-FOLDER-01**            | フォルダ階層化管理（ドリルダウン・DnD移動）                                      | ✔️ `tests\e2e\categories.spec.ts`                                                                                                         |
| **@J-ORGAN-UX-PARAM-01**        | パラメータエイリアス・ガチャPick（無機質なパラメータの視覚化とセレンディピティ） | ✔️ `tests\e2e\parameter-alias-gacha.spec.ts`<br>✔️ `tests\e2e\parameter-alias-i18n.spec.ts`                                               |
| **@J-WB-MIXING-INTELLIGENT-01** | Midjourney sref/cref インテリジェントブレンド                                    | ✔️ `tests\e2e\sref-cref-blend.spec.ts`                                                                                                    |
| **@J-ORG-QUICK-SEND-01**        | クイックワークベンチ送信                                                         | ✔️ `tests\e2e\quick-send.spec.ts`                                                                                                         |
| **@J-ORG-SEMANTIC-SEARCH-01**   | セマンティック検索による自然言語フィルタリング                                   | ✔️ `tests\e2e\library-semantic-search.spec.ts`                                                                                            |
| **@J-WB-AI-ADVICE-01**          | AI調合アドバイス表示                                                             | ✔️ `tests\e2e\ai-recipe-advice.spec.ts`                                                                                                   |

## サマリー

- 全ジャーニー数: 37
- カバー済み: 37
- 未カバー: 0
