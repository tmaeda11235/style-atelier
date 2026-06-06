# Midjourney モックHTML メンテナンスガイド

このディレクトリにある HTML およびアセットは、E2Eテスト環境（Sandbox）で使用される Midjourney ページのモックです。Midjourney側の仕様変更に追従してモックを更新する際は、以下の手順に従ってください。

---

## 1. モックHTMLの更新（保存手順）

1. ブラウザ（Chromeなど）で [Midjourney Create ページ](https://www.midjourney.com/imagine) にログインします。
2. ページ上の適当な場所を右クリックし、**「名前を付けて保存...」** を選択します。
3. 保存時の設定：
   - **ファイル名:** `index.html`
   - **ファイルの種類:** `ウェブページ、完全 (*.htm; *.html)`
4. 保存すると、`index.html` と `index_files` というアセットフォルダが生成されます。
5. 生成された `index.html` と `index_files` フォルダを、このディレクトリ（`tests/fixtures/midjourney/`）に上書き配置します。

---

## 2. 自動パッチスクリプトの実行

上書き配置した生のHTMLには、テスト環境での動作を阻害する外部接続（Cloudflare, Analytics 等）や変則的な拡張子が含まれています。
以下のコマンドを実行して、これらを一括で自動クリーンアップ・ローカル化します。

```bash
node tests/scripts/prepare-mock.js
```

### スクリプトが自動で行う処理：
- 日本語や特殊な拡張子（例: `.ダウンロード`）の自動リネーム ＆ HTML内のパス置換
- Cloudflare Turnstile, Cloudflare Challenge Platform, 不要な分析トラッキングタグの自動削除
- Google Fonts から参照されている `woff2` フォントファイルの自動ダウンロード ＆ CSS内URLのローカル相対パス化（ネットワーク遮断環境でのPlaywrightハングアップを防止）

---

## 3. MidjourneyのDOM仕様変更時の対応

Midjourney側の仕様変更によりプロンプトが注入できなくなった場合、以下のセレクタを確認・更新してください。

### ① プロンプト入力エリア (Textarea) のセレクタ
Content Script 側の [PromptInjector.ts](file:///c:/Users/oculus/Desktop/style-atelier/src/contents/domain/actions/PromptInjector.ts) 内で入力エリアを検出するために使用するセレクタです。

* **確認・修正対象ファイル:** `src/contents/domain/actions/PromptInjector.ts`
* **主なセレクタ候補 (2026年時点):**
  - `#prompt-textarea`
  - `[aria-label="Imagine a prompt"]`
  - `[aria-label="Prompt text"]`
  - `[data-testid="prompt-input"]`
  - `[role="textbox"]`
  - `div[contenteditable="true"]`
  - `textarea`

もしMidjourney側でこれらの属性が変更された場合は、最新のHTMLソースを確認し、新しいセレクタを `PromptInjector.ts` の `input` 選択ロジックに追加してください。

---

## 4. 注意事項
- `index.html` や `index_files/` などのアセットファイルは、個人の認証トークンやセンシティブな情報が含まれる可能性があるため、Git管理から除外（`.gitignore` に登録済み）されています。
- テスト実行前に必ず `node tests/scripts/prepare-mock.js` を実行し、アセットがローカルに正しくパッチされていることを確認してください。
