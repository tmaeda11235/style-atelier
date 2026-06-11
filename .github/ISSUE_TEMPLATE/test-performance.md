---
name: CI Test Performance Issue
about: Report performance issues in CI test jobs
title: "CI テストジョブのパフォーマンス改善: Google Drive API トークン問題と画像読み込み失敗"
labels: ["performance", "ci"]
---

## タイトル
CI テストジョブのパフォーマンス改善: Google Drive API トークン問題と画像読み込み失敗

## 問題
GitHub Actions の E2E テストジョブ（Job ID: 80773195296）で、**最大49秒の実行時間ロス**が発生しています。

## 原因分析

### 1. **Google Drive API トークン期限切れによる連続リトライ** ⏱️ 最大49秒
- 複数回の 401 エラーが発生
- 毎回リトライされるため、大幅な遅延が生じている
- ログ出力:
  ```
  [HTTP ERROR] https://www.googleapis.com/drive/v3/files?... : 401
  [BROWSER CONSOLE] warning: Google Drive API returned 401. Stale token detected...
  ```

### 2. **テスト環境の画像ファイル（0_0_640_N.webp）の 404 エラー** ⏱️ 複数回リトライ
- ファイルが見つからないため、何度も失敗リトライが発生
- ログ出力:
  ```
  [HTTP ERROR] http://localhost:5173/tests/sandbox/index_files/0_0_640_N.webp: 404
  [REQUEST FAILED] ... net::ERR_ABORTED
  ```

### 3. **キャッシュ保存の競合**
- 別のジョブとキャッシュ作成で競合が発生
- ログ出力:
  ```
  Failed to save: Unable to reserve cache with key node-cache-Linux-x64-npm-...
  another job may be creating this cache.
  ```

## 対応案
- [ ] Google Drive API トークン管理の改善（キャッシュ戦略またはタイムアウト設定）
- [ ] テスト環境の画像ファイル構成の見直し（404エラーの原因調査）
- [ ] キャッシュ戦略の最適化（ジョブ並行実行時の競合回避）

## 参考情報
- Job ID: 80773195296
- Run ID: 27339751657
- ジョブ実行ログ URL: https://github.com/tmaeda11235/style-atelier/actions/runs/27339751657/job/80773195296
