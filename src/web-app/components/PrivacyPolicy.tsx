/* eslint-disable max-lines, max-lines-per-function */
import React, { useEffect, useState } from "react"

import "../styles/privacy.css"

interface PrivacyPolicyProps {
  onBack: () => void
  onTryPwa: () => void
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
  onBack,
  onTryPwa
}) => {
  const [lang, setLang] = useState<"ja" | "en">("ja")

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("pref-lang")
      if (savedLang === "ja" || savedLang === "en") {
        setLang(savedLang)
      } else {
        const browserLang = navigator.language
        if (browserLang && !browserLang.startsWith("ja")) {
          setLang("en")
        }
      }
    } catch {
      /* ignore */
    }
  }, [])

  const handleLangChange = (newLang: "ja" | "en") => {
    setLang(newLang)
    try {
      localStorage.setItem("pref-lang", newLang)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="pp-body">
      <div className="pp-container">
        <header className="pp-header">
          <div
            className="pp-logo"
            onClick={onBack}
            style={{ cursor: "pointer" }}
            id="btn-back-to-lp">
            <span className="pp-logo-icon">🌌</span>
            <span className="pp-logo-text">Style Atelier</span>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div className="pp-lang-switcher">
              <button
                id="btn-ja"
                className={`pp-lang-btn ${lang === "ja" ? "active" : ""}`}
                onClick={() => handleLangChange("ja")}>
                日本語
              </button>
              <button
                id="btn-en"
                className={`pp-lang-btn ${lang === "en" ? "active" : ""}`}
                onClick={() => handleLangChange("en")}>
                English
              </button>
            </div>
            <button
              onClick={onTryPwa}
              style={{
                border: "none",
                background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: "9999px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
              id="btn-privacy-try-pwa">
              PWA 📱
            </button>
          </div>
        </header>

        <main className="pp-main">
          {lang === "ja" ? (
            <div className="lang-ja">
              <h1 className="pp-title-h1">プライバシーポリシー</h1>
              <p className="pp-subtitle">最終更新日: 2026年6月7日</p>

              <section className="pp-section">
                <div className="pp-section-badge">Concept</div>
                <h2 className="pp-title-h2">1. プライバシーに関する基本理念</h2>
                <p className="pp-p">
                  Style
                  Atelier（以下「本拡張機能」）は、ユーザーが作成するクリエイティブなプロンプトやスタイル情報はユーザー自身の貴重な資産であると考えています。そのため、本拡張機能は設計段階から
                  <strong>
                    「ローカルファースト」かつ「プライバシー重視」
                  </strong>
                  のサーバーレス・アプリケーションとして構築されています。
                </p>
              </section>

              <section className="pp-section">
                <div className="pp-section-badge">Data Collection</div>
                <h2 className="pp-title-h2">2. 個人情報の収集・送信について</h2>
                <div className="pp-callout">
                  <p>
                    本拡張機能は、ユーザーを特定できる個人情報（PII）や作成されたプロンプトデータを収集・保存・外部サーバーへ送信することは一切ありません。
                  </p>
                </div>
                <p className="pp-p">
                  すべてのデータはユーザーの管理下に置かれ、外部のデータベースや開発者サーバーに蓄積されることはありません。以下のような情報はすべてローカルに完結します：
                </p>
                <ul className="pp-ul">
                  <li className="pp-li">
                    作成・保存したスタイルカードのメタデータおよび画像
                  </li>
                  <li className="pp-li">
                    プロンプトの履歴およびお気に入り設定
                  </li>
                  <li className="pp-li">
                    バインダー、デッキ、カテゴリの設定情報
                  </li>
                </ul>
              </section>

              <section className="pp-section">
                <div className="pp-section-badge">Security</div>
                <h2 className="pp-title-h2">
                  3. Google Drive同期と認証情報の取り扱い
                </h2>
                <p className="pp-p">
                  ユーザーがデータバックアップのための「Google
                  Drive連携」を有効化した場合のみ、Google Drive API（
                  <code>drive.file</code>{" "}
                  スコープ）への通信が発生します。この際の認証情報は以下のように厳格に処理されます：
                </p>
                <ul className="pp-ul">
                  <li className="pp-li">
                    <strong>一時的なメモリ内処理</strong>：認証には Chrome
                    のネイティブ Identity API を使用した安全な Google OAuth2
                    フローが利用されます。
                  </li>
                  <li className="pp-li">
                    <strong>即時破棄</strong>
                    ：処理中に一時的に発生するアクセス権限やトークンなどの認証情報は、同期・復元処理が終わった後に直ちに破棄され、アプリ内に残ることはありません。
                  </li>
                  <li className="pp-li">
                    <strong>外部保存の排除</strong>
                    ：これらの認証情報は本拡張機能のローカルストレージに永続化されることも、開発者サーバーや第三者に送信されることもありません。
                  </li>
                </ul>
              </section>

              <section className="pp-section">
                <div className="pp-section-badge">Permissions</div>
                <h2 className="pp-title-h2">
                  4. 権限（パーミッション）の使用目的
                </h2>
                <p className="pp-p">
                  本拡張機能が正常に機能するために要求する各権限の目的は以下の通りです：
                </p>
                <ul className="pp-ul">
                  <li className="pp-li">
                    <strong>activeTab</strong>
                    ：現在表示しているMidjourneyまたはDiscordのタブから、プロンプトデータを読み込んでカードを作成（ミント）するために使用されます。このデータ処理も完全にブラウザ内で完結します。
                  </li>
                  <li className="pp-li">
                    <strong>identity</strong>：Google Drive
                    バックアップ機能での一時的な認証処理にのみ使用されます。
                  </li>
                  <li className="pp-li">
                    <strong>
                      ホスト権限（midjourney.com / discord.com等）
                    </strong>
                    ：Midjourneyの生成画面やDiscord上のテキストを検出するためのもので、通信はユーザーのローカルマシン内のみで行われます。
                  </li>
                </ul>
              </section>

              <section className="pp-section">
                <div className="pp-section-badge">Storage</div>
                <h2 className="pp-title-h2">5. データの削除とオフライン動作</h2>
                <p className="pp-p">
                  本拡張機能はオフラインでも完全に動作します。本拡張機能をアンインストールするか、ブラウザのストレージデータをクリアすると、ローカル（IndexedDB）に保存されているすべてのスタイルデータおよび履歴は完全に削除されます。
                </p>
              </section>

              <section className="pp-section">
                <div className="pp-section-badge">Contact</div>
                <h2 className="pp-title-h2">6. お問い合わせ</h2>
                <p className="pp-p">
                  本ポリシーやプライバシーに関するご質問、不具合報告、フィードバックは、GitHubのリポジトリのIssueにて受け付けております。
                  <br />
                  <span className="pp-link" onClick={onBack}>
                    Style Atelier LPへ戻る
                  </span>{" "}
                  または{" "}
                  <a
                    href="https://github.com/tmaeda11235/style-atelier"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pp-link">
                    Style Atelier GitHub Repository
                  </a>
                </p>
              </section>
            </div>
          ) : (
            <div className="lang-en">
              <h1 className="pp-title-h1">Privacy Policy</h1>
              <p className="pp-subtitle">Last Updated: June 7, 2026</p>

              <section className="pp-section">
                <div className="pp-section-badge">Concept</div>
                <h2 className="pp-title-h2">1. Core Privacy Philosophy</h2>
                <p className="pp-p">
                  We believe that your creative prompts and style designs are
                  your valuable intellectual assets. Therefore,{" "}
                  <strong>Style Atelier</strong> (the "Extension") is designed
                  from the ground up as a{" "}
                  <strong>"Local-First" and "Privacy-Focused"</strong>{" "}
                  serverless application.
                </p>
              </section>

              <section className="pp-section">
                <div className="pp-section-badge">Data Collection</div>
                <h2 className="pp-title-h2">2. No Personal Data Collection</h2>
                <div className="pp-callout">
                  <p>
                    This extension does NOT collect, store, or transmit any
                    personally identifiable information (PII) or your prompt
                    designs to any external servers.
                  </p>
                </div>
                <p className="pp-p">
                  All data remains fully under your control and is stored
                  locally in your browser. The following data is processed and
                  saved offline inside your local environment:
                </p>
                <ul className="pp-ul">
                  <li className="pp-li">
                    Metadata and images of minted Style Cards
                  </li>
                  <li className="pp-li">
                    Prompt generation history and favorites
                  </li>
                  <li className="pp-li">
                    Binder, deck, and custom category configurations
                  </li>
                </ul>
              </section>

              <section className="pp-section">
                <div className="pp-section-badge">Security</div>
                <h2 className="pp-title-h2">
                  3. Google Drive Sync & Transient Credentials
                </h2>
                <p className="pp-p">
                  Communication with the Google Drive API (
                  <code>drive.file</code> scope) only occurs when you explicitly
                  enable the "Google Drive Sync" feature to backup or restore
                  your library. Authentication credentials are handled under
                  strict security guidelines:
                </p>
                <ul className="pp-ul">
                  <li className="pp-li">
                    <strong>In-Memory Processing</strong>: Authentication is
                    performed via Chrome's native Identity API using a secure
                    Google OAuth2 flow.
                  </li>
                  <li className="pp-li">
                    <strong>Immediate Destruction</strong>: Any access tokens or
                    credentials generated during sync/restore are transient,
                    processed in memory, and **discarded immediately** after
                    completion.
                  </li>
                  <li className="pp-li">
                    <strong>No Persistent Storage</strong>: Credentials are
                    never saved to local persistent storage
                    (localStorage/IndexedDB) within the extension, nor sent to
                    developer-managed servers or third parties.
                  </li>
                </ul>
              </section>

              <section className="pp-section">
                <div className="pp-section-badge">Permissions</div>
                <h2 className="pp-title-h2">4. Use of Extension Permissions</h2>
                <p className="pp-p">
                  The Extension requests the following permissions for specific
                  functionality:
                </p>
                <ul className="pp-ul">
                  <li className="pp-li">
                    <strong>activeTab</strong>: Used exclusively to parse prompt
                    strings from the active Midjourney or Discord tab when you
                    click to mint a card. This parsing happens entirely locally.
                  </li>
                  <li className="pp-li">
                    <strong>identity</strong>: Used only for temporary
                    authentication with Google Drive for backup operations.
                  </li>
                  <li className="pp-li">
                    <strong>
                      Host Permissions (midjourney.com / discord.com)
                    </strong>
                    : Used to detect Midjourney grid images and prompts within
                    the specified websites locally. No remote tracking occurs.
                  </li>
                </ul>
              </section>

              <section className="pp-section">
                <div className="pp-section-badge">Storage</div>
                <h2 className="pp-title-h2">
                  5. Data Deletion & Offline Operation
                </h2>
                <p className="pp-p">
                  The Extension works completely offline. Uninstalling the
                  Extension or clearing browser data will permanently remove all
                  style cards, prompts, and settings saved in your IndexedDB.
                </p>
              </section>

              <section className="pp-section">
                <div className="pp-section-badge">Contact</div>
                <h2 className="pp-title-h2">6. Contact & Feedback</h2>
                <p className="pp-p">
                  For inquiries, issue reporting, or feedback regarding our
                  privacy practices, please visit our GitHub repository:
                  <br />
                  <span className="pp-link" onClick={onBack}>
                    Back to Style Atelier LP
                  </span>{" "}
                  or{" "}
                  <a
                    href="https://github.com/tmaeda11235/style-atelier"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pp-link">
                    Style Atelier GitHub Repository
                  </a>
                </p>
              </section>
            </div>
          )}
        </main>

        <footer className="pp-footer">
          <p>&copy; 2026 Style Atelier. All Rights Reserved.</p>
        </footer>
      </div>
    </div>
  )
}
