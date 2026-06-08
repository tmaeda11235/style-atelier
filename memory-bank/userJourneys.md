# ユーザージャーニー定義

※このドキュメントは `userJourneys.json` から自動生成されています。手動で編集しないでください。

## グローバルジャーニーマップ（画面遷移図）

各ユーザージャーニー間の遷移（ナビゲーション）関係を示します。

```mermaid
stateDiagram-v2
  _J_MINT_EXPERT_01 : エキスパートミント
  _J_MINT_EASY_01 : かんたんミント
  _J_ORG_EXPERT_01 : カード管理（エキスパート）
  _J_ORG_EXPERT_02 : カテゴリ管理
  _J_ORG_EASY_01 : かんたんライブラリ
  _J_WB_EXPERT_01 : ワークベンチ（エキスパート）
  _J_WB_EXPERT_02 : ドラッグ＆ドロップ操作
  _J_WB_EXPERT_03 : プロンプトインジェクション
  _J_WB_EASY_01 : かんたんワークベンチ
  _J_IO_QR_OUT : QRエクスポート
  _J_IO_QR_IN : QRインポート
  _J_IO_BACKUP : データバックアップ
  _J_IO_RESTORE : データリストア
  _J_SYS_01 : 履歴表示
  _J_SYS_02 : エキスパートヘルプ
  _J_SYS_03 : Tipsバー
  _J_SYS_04 : 言語切り替え
  _J_SET_01 : アプリ設定
  _J_WB_EXPERT_04 : スロット変数操作 (ポップオーバー & Dnd)
  _J_TUTORIAL_01 : インタラクティブチュートリアル
  _J_MINT_EXPERT_01 --> _J_ORG_EXPERT_01
  _J_MINT_EXPERT_01 --> _J_WB_EXPERT_01
  _J_MINT_EASY_01 --> _J_ORG_EASY_01
  _J_MINT_EASY_01 --> _J_WB_EASY_01
  _J_ORG_EXPERT_01 --> _J_ORG_EXPERT_02
  _J_ORG_EXPERT_01 --> _J_WB_EXPERT_01
  _J_ORG_EXPERT_01 --> _J_IO_QR_OUT
  _J_ORG_EXPERT_02 --> _J_ORG_EXPERT_01
  _J_ORG_EASY_01 --> _J_WB_EASY_01
  _J_WB_EXPERT_01 --> _J_WB_EXPERT_02
  _J_WB_EXPERT_01 --> _J_WB_EXPERT_03
  _J_WB_EXPERT_01 --> _J_WB_EXPERT_04
  _J_WB_EXPERT_02 --> _J_WB_EXPERT_01
  _J_WB_EXPERT_03 --> _J_MINT_EXPERT_01
  _J_WB_EASY_01 --> _J_WB_EXPERT_01
  _J_IO_QR_IN --> _J_ORG_EXPERT_01
  _J_IO_QR_IN --> _J_ORG_EASY_01
  _J_IO_BACKUP --> _J_SET_01
  _J_IO_RESTORE --> _J_ORG_EXPERT_01
  _J_SYS_01 --> _J_WB_EXPERT_01
  _J_SYS_02 --> _J_WB_EXPERT_01
  _J_SYS_02 --> _J_ORG_EXPERT_01
  _J_SYS_04 --> _J_SET_01
  _J_SET_01 --> _J_IO_BACKUP
  _J_SET_01 --> _J_IO_RESTORE
  _J_SET_01 --> _J_SYS_04
  _J_WB_EXPERT_04 --> _J_WB_EXPERT_01
  _J_TUTORIAL_01 --> _J_MINT_EXPERT_01
  _J_TUTORIAL_01 --> _J_WB_EXPERT_01
```

## 個別ジャーニーのフロー詳細

### @J-MINT-EXPERT-01: エキスパートミント

エキスパートモードで画像からスタイルカードを作成する

```mermaid
flowchart TD
  S1["画像上のMintボタン押下"]
  S2["プロンプト解析"]
  S1 --> S2
  S3["カード保存"]
  S2 --> S3
```

### @J-MINT-EASY-01: かんたんミント

かんたんモードで画像からスタイルカードを作成する

```mermaid
flowchart TD
  S1["画像上のMintボタン押下"]
  S2["簡易保存"]
  S1 --> S2
```

### @J-ORG-EXPERT-01: カード管理（エキスパート）

エキスパート向けカード管理（編集・削除）

```mermaid
flowchart TD
  S1["ライブラリを開く"]
  S2["カード選択"]
  S1 --> S2
  S3["編集・削除実行"]
  S2 --> S3
```

### @J-ORG-EXPERT-02: カテゴリ管理

カテゴリの作成と割り当て

```mermaid
flowchart TD
  S1["カテゴリ管理モーダルを開く"]
  S2["新規カテゴリ作成"]
  S1 --> S2
  S3["カードに割り当て"]
  S2 --> S3
```

### @J-ORG-EASY-01: かんたんライブラリ

かんたんモードのライブラリ（カード閲覧・選択）

```mermaid
flowchart TD
  S1["ライブラリを開く"]
  S2["カードを見る"]
  S1 --> S2
```

### @J-WB-EXPERT-01: ワークベンチ（エキスパート）

エキスパートモードでプロンプトを構築する

```mermaid
flowchart TD
  S1["Workbenchを開く"]
  S2["カードを選ぶ"]
  S1 --> S2
  S3["プロンプトをマージ"]
  S2 --> S3
```

### @J-WB-EXPERT-02: ドラッグ＆ドロップ操作

ドラッグ＆ドロップでカードを配置する

```mermaid
flowchart TD
  S1["カードをドラッグ"]
  S2["Handエリアにドロップ"]
  S1 --> S2
  S3["順序入れ替え"]
  S2 --> S3
```

### @J-WB-EXPERT-03: プロンプトインジェクション

Midjourneyへのプロンプトインジェクション

```mermaid
flowchart TD
  S1["Injectボタン押下"]
  S2["Discordの入力欄にテキスト反映"]
  S1 --> S2
```

### @J-WB-EASY-01: かんたんワークベンチ

かんたんモードでプロンプトを合成する

```mermaid
flowchart TD
  S1["Workbenchを開く"]
  S2["ベースカードを選ぶ"]
  S1 --> S2
  S3["ワンクリック合成"]
  S2 --> S3
```

### @J-IO-QR-OUT: QRエクスポート

スタイルカードをQRコードとして出力する

```mermaid
flowchart TD
  S1["カード詳細を開く"]
  S2["Share as QR押下"]
  S1 --> S2
  S3["QRコード表示"]
  S2 --> S3
```

### @J-IO-QR-IN: QRインポート

QRコードを読み取ってカードをインポートする

```mermaid
flowchart TD
  S1["Import via QR選択"]
  S2["QRスキャン"]
  S1 --> S2
  S3["カード保存"]
  S2 --> S3
```

### @J-IO-BACKUP: データバックアップ

アプリケーションデータのバックアップエクスポート

```mermaid
flowchart TD
  S1["Settingsを開く"]
  S2["Backupボタン押下"]
  S1 --> S2
  S3["ZIPファイル保存"]
  S2 --> S3
```

### @J-IO-RESTORE: データリストア

バックアップデータからのリストア

```mermaid
flowchart TD
  S1["Settingsを開く"]
  S2["Restoreボタン押下"]
  S1 --> S2
  S3["ファイル選択"]
  S2 --> S3
  S4["データ復元"]
  S3 --> S4
```

### @J-SYS-01: 履歴表示

履歴（History）の閲覧とスクロール

```mermaid
flowchart TD
  S1["Historyパネルを開く"]
  S2["無限スクロール"]
  S1 --> S2
  S3["過去のプロンプト再利用"]
  S2 --> S3
```

### @J-SYS-02: エキスパートヘルプ

エキスパート向けヘルプツールチップの確認

```mermaid
flowchart TD
  S1["?アイコンにホバー"]
  S2["ツールチップ表示"]
  S1 --> S2
  S3["仕様の確認"]
  S2 --> S3
```

### @J-SYS-03: Tipsバー

使い方Tipsバーの操作

```mermaid
flowchart TD
  S1["画面下部のTipsバーを見る"]
  S2["次へボタン押下"]
  S1 --> S2
  S3["非表示にする"]
  S2 --> S3
```

### @J-SYS-04: 言語切り替え

多言語（i18n）切り替えと表示

```mermaid
flowchart TD
  S1["言語設定を変更"]
  S2["UIテキストの再描画"]
  S1 --> S2
```

### @J-SET-01: アプリ設定

アプリケーション設定の変更

```mermaid
flowchart TD
  S1["Settingsパネルを開く"]
  S2["トグル変更"]
  S1 --> S2
  S3["保存"]
  S2 --> S3
```

### @J-WB-EXPERT-04: スロット変数操作 (ポップオーバー & Dnd)

スロット変数エリアでのサジェスト選択およびカードのドラッグ＆ドロップ適用

```mermaid
flowchart TD
  S1["スロット入力フィールドフォーカス"]
  S2["ポップオーバーサジェスト選択"]
  S1 --> S2
  S3["カードをスロットにドラッグ＆ドロップ"]
  S2 --> S3
```

### @J-TUTORIAL-01: インタラクティブチュートリアル

新規ユーザー向けのインタラクティブチュートリアル（オンボーディング）の実行

```mermaid
flowchart TD
  S1["「チュートリアルを開始する」ボタン押下"]
  S2["ステップ進行（ドラッグ＆ドロップ、Mintボタンクリック、保存など）"]
  S1 --> S2
  S3["チュートリアル完了"]
  S2 --> S3
```
