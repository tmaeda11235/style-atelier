# Style Atelier Development Guide / 開発ガイドライン

Welcome! This guide documents the critical workflows, development constraints, and code patterns for **Style Atelier**. It is designed to ensure smooth co-creation between human developers and AI agents.

ようこそ！このガイドは、**Style Atelier** の開発ワークフロー、コーディング制約、およびデザインパターンをまとめたものです。人間とAIエージェントがスムーズに共同開発を進められるように設計されています。

---

## 1. Git Worktree Workflow (Critical) / Git Worktree ワークフロー（必須）

To avoid conflicts and maintain clean development environments, **always** use Git Worktree for each issue/PR. Do not work directly in the main checkout folder (`style-atelier`).

作業の衝突を避け、クリーンな開発環境を維持するため、IssueやPRごとに**必ず** Git Worktree を使用してください。メインのチェックアウトフォルダ（`style-atelier`）で直接作業を行わないでください。

### Creating a Worktree / Worktree の作成手順

1. Fetch the latest changes from origin / 最新の変更を取得:
   ```bash
   git fetch origin
   ```
2. Add a new worktree / 新しい Worktree の追加:
   ```bash
   git worktree add -b feature/<issue-no>-<desc> ../worktrees/<issue-no>-<desc> origin/main
   ```
3. Navigate to the new worktree and start working / 追加されたディレクトリへ移動して開発を開始:
   ```bash
   cd ../worktrees/<issue-no>-<desc>
   ```

### Cleaning Up after Merging / マージ後のクリーンアップ

Once the PR is merged, remove the worktree / PRがマージされたら、Worktree を削除します:

```bash
git worktree remove ../worktrees/<issue-no>-<desc>
git branch -d feature/<issue-no>-<desc>
```

---

## 2. ESLint Rules & Code Size Limits / ESLint ルールとコード行数制限

We enforce strict size limits to ensure maintainable and modular components.

コードの保守性とモジュール性を保つため、厳格な行数制限を設けています。

- **File Limit**: Max **300 lines** per file (excluding comments and blank lines).
  ファイル制限: 1ファイルあたり最大 **300行**（コメントと空行を除く）。
- **Function Limit**: Max **50 lines** per function.
  関数制限: 1関数あたり最大 **50行**。

### Design Principle: Separation of Concerns / 設計指針: 関心の分離

- **Custom Hooks**: Extract side effects, local state mutation, and business logic into custom hooks.
  副作用、ローカル状態の変更、ビジネスロジックはカスタムフックに抽出します。
- **Pure Presentation**: Keep UI components (e.g. Molecules) pure. They should only receive props and render elements. Do not make direct database queries inside UI components (do not import `src/lib/db.ts` directly).
  UIコンポーネント（Moleculesなど）はピュアに保ち、Propsの受け取りとレンダリングのみを行います。UIコンポーネント内で直接データベースクエリを実行しないでください（`src/lib/db.ts` を直接インポートしない）。

---

## 3. Auto-Syncing ESLint Exceptions / ESLint 例外リストの自動同期

If you refactor legacy code and resolve ESLint warnings, do not manually edit `eslint.config.mjs` exception/override rules. Use the auto-sync script instead.

レガシーコードのリファクタリングによりESLintの警告を解消した場合、`eslint.config.mjs` の例外（override）ルールを手動で編集しないでください。代わりに、自動同期スクリプトを実行します。

Run the sync script to optimize the whitelist/exception list / 同期スクリプトを実行して例外リストを最適化します:

```bash
node scratch/auto-sync-eslint.js
```

> [!IMPORTANT]
> The CI pipeline will reject PRs that expand ESLint exceptions. Only shrinking or syncing existing exceptions is allowed.
> CI パイプラインは ESLint の例外を増やす PR を却下します。例外の削減または既存例外の同期のみが許可されます。

---

## 4. Local Verification & Testing / ローカル検証とテスト

Before pushing your branch, ensure all tests pass locally.

ブランチをプッシュする前に、すべてのテストがローカルで通ることを確認してください。

- **Lint Check**:
  ```bash
  npm run lint
  ```
- **Unit & Integration Tests**:
  ```bash
  npm run test
  # Or with UI dashboard
  npm run test:ui
  ```
- **E2E Tests**:
  ```bash
  npm run test:e2e
  ```

> [!TIP]
> If you make any modifications to the User Experience (UX), you must run E2E tests and verify visual behaviors. Any new UX flows require corresponding E2E tests.
> UX（ユーザー体験）に変更を加えた場合は、E2Eテストを実行して表示挙動を確認してください。新しいUXフローには、対応するE2Eテストの追加が必須です。

---

## 5. Unified Push Command / プッシュ用コマンド

To simplify the check-in process, a unified `npm run push` command is available. This script automatically runs linters, updates test proofs, and pushes to origin.

チェックインプロセスを簡略化するため、統合された `npm run push` コマンドが用意されています。このスクリプトは、リンターの実行、テストエビデンスの更新、および origin へのプッシュを自動的に行います。

```bash
npm run push
```

---

## 6. Internationalization (i18n) Rules / 多言語化（i18n）コーディング規約

To prevent untranslated UI text, we enforce the `i18next/no-literal-string` ESLint rule. Additionally, translation keys must be completely synchronized between languages.

コードベース内での未翻訳テキストの混入を防ぐため、`i18next/no-literal-string` ESLint ルールを適用しています。また、言語間で翻訳キーが完全に同期している必要があります。

### Wrap User-Facing Text / ユーザー表示テキストの翻訳

Always wrap user-facing text using the `useTranslation` hook:
ユーザーに表示されるテキストは、必ず `useTranslation` フックを使用して翻訳してください。

```tsx
const { t } = useTranslation()
// ...
<span>{t('common.save')}</span>
```

### Exempting Attributes / 翻訳除外属性

Structural attributes such as `id`, `className`, `testId`, `data-testid`, `color`, `size`, `type` are automatically ignored. However, visual props like `title`, `placeholder`, or `label` must be localized:
`id`, `className`, `testId`, `data-testid`, `color`, `size`, `type` などの構造的な属性は自動的に翻訳除外対象となりますが、`title`, `placeholder`, `label` などの表示用属性に渡す文字列は翻訳が必要です。

```tsx
{/* Bad / 悪い例 */}
<input placeholder="Search prompts..." />

{/* Good / 良い例 */}
<input placeholder={t('library.searchPlaceholder')} />
```

### Bypassing Checks / 一時的なチェック回避

If a literal string is absolutely required (e.g. mock data in test files, specific debug constants), disable the line check:
テストファイルのモックデータやデバッグ用の定数など、どうしてもリテラル文字列が必要な場合は、以下のコメントでチェックを回避できます：

```tsx
const devUrl = "http://localhost:3000" // eslint-disable-line i18next/no-literal-string
```

### Translation Key Synchronization Check / 翻訳キーの同期検証

Our linter automatically runs `node scripts/check-i18n-keys.mjs` as part of `npm run lint`. This script ensures that all keys present in `src/locales/ja/translation.json` exist in `src/locales/en/translation.json` and vice versa. If there is a mismatch, the linter (and the CI pipeline) will fail.
リンター（`npm run lint`）を実行すると、自動的に `node scripts/check-i18n-keys.mjs` が実行されます。このスクリプトは、日本語（`ja/translation.json`）と英語（`en/translation.json`）の間でキーに差分がないかをチェックします。差分がある場合、リンターおよび CI パイプラインは失敗します。

