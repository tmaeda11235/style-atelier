# E2E トレーサビリティマトリクス

このドキュメントはユーザージャーニーとPlaywright E2Eテストの対応状況をマッピングしたものです。

| ジャーニーID               | ジャーニー名                            | E2E カバレッジ                                                                                    |
| -------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **@J-MINT-EXPERT-01**      | エキスパートミント                      | ✔️ `tests\e2e\mint-expert.spec.ts`                                                                |
| **@J-MINT-EASY-01**        | かんたんミント                          | ✔️ `tests\e2e\easy-mode.spec.ts`                                                                  |
| **@J-ORG-EXPERT-01**       | カード管理（エキスパート）              | ✔️ `tests\e2e\card-management.spec.ts`                                                            |
| **@J-ORG-EXPERT-02**       | カテゴリ管理                            | ✔️ `tests\e2e\categories.spec.ts`                                                                 |
| **@J-ORG-EASY-01**         | かんたんライブラリ                      | ✔️ `tests\e2e\easy-mode.spec.ts`                                                                  |
| **@J-ORG-COLOR-FILTER-01** | カラーフィルター操作                    | ✔️ `tests\e2e\color-filter-scroll.spec.ts`                                                        |
| **@J-WB-EXPERT-01**        | ワークベンチ（エキスパート）            | ✔️ `tests\e2e\workbench.spec.ts`                                                                  |
| **@J-WB-EXPERT-02**        | ドラッグ＆ドロップ操作                  | ✔️ `tests\e2e\drag-and-drop.spec.ts`                                                              |
| **@J-WB-EXPERT-03**        | プロンプトインジェクション              | ✔️ `tests\e2e\prompt-injection.spec.ts`                                                           |
| **@J-WB-EASY-01**          | かんたんワークベンチ                    | ✔️ `tests\e2e\easy-mode.spec.ts`                                                                  |
| **@J-IO-QR-OUT**           | QRエクスポート                          | ✔️ `tests\e2e\data-io.spec.ts`                                                                    |
| **@J-IO-QR-IN**            | QRインポート                            | ✔️ `tests\e2e\data-io.spec.ts`                                                                    |
| **@J-IO-BACKUP**           | データバックアップ                      | ✔️ `tests\e2e\data-io.spec.ts`                                                                    |
| **@J-IO-RESTORE**          | データリストア                          | ✔️ `tests\e2e\data-io.spec.ts`                                                                    |
| **@J-SYS-01**              | 履歴表示                                | ✔️ `tests\e2e\history-scroll.spec.ts`                                                             |
| **@J-SYS-02**              | エキスパートヘルプ                      | ✔️ `tests\e2e\expert-help.spec.ts`                                                                |
| **@J-SYS-03**              | Tipsバー                                | ✔️ `tests\e2e\tips-bar.spec.ts`                                                                   |
| **@J-SYS-04**              | 言語切り替え                            | ✔️ `tests\e2e\i18n-missing-translations.spec.ts`<br>✔️ `tests\e2e\i18n-new-comprehensive.spec.ts` |
| **@J-SET-01**              | アプリ設定                              | ✔️ `tests\e2e\settings.spec.ts`                                                                   |
| **@J-WB-EXPERT-04**        | スロット変数操作 (ポップオーバー & Dnd) | ✔️ `tests\e2e\slot-ux-dnd.spec.ts`                                                                |
| **@J-WB-EXPERT-05**        | 手札バー（HandBar）の最小化・折りたたみ | ✔️ `tests\e2e\handbar-collapse.spec.ts`                                                           |
| **@J-TUTORIAL-01**         | インタラクティブチュートリアル          | ✔️ `tests\e2e\interactive-tutorial.spec.ts`                                                       |

## サマリー

- 全ジャーニー数: 22
- カバー済み: 22
- 未カバー: 0
