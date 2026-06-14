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
