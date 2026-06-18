/* eslint-disable max-lines-per-function */
import React from "react"

import "../styles/landing.css"

interface LandingPageProps {
  onTryPwa: () => void
  onViewPrivacy: () => void
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onTryPwa,
  onViewPrivacy
}) => {
  return (
    <div className="lp-body">
      <div className="lp-container">
        <header className="lp-header">
          <div className="lp-logo">
            <img
              src="/icon-192.png"
              alt="Style Atelier Logo"
              className="lp-logo-icon"
            />
            <span className="lp-logo-text">Style Atelier</span>
          </div>
          <button className="lp-cta-btn" onClick={onTryPwa} id="btn-try-pwa">
            モバイルPWAを試す 📱
          </button>
        </header>

        <main className="lp-main">
          <div className="lp-hero">
            <img
              src="/icon-192.png"
              alt="Style Atelier Logo"
              className="lp-hero-logo"
            />
            <div>
              <h1 className="lp-title-h1">Style Atelier</h1>
              <p className="lp-subtitle">
                ローカルファーストなプロンプト管理拡張機能
              </p>
            </div>
          </div>

          <section className="lp-section">
            <div className="lp-section-badge">Overview</div>
            <h2 className="lp-title-h2">アプリケーションの概要</h2>
            <div className="lp-callout">
              <p>
                本拡張機能は、Google Drive
                APIを利用してプロンプトやスタイルのデータの保存・同期を行うChrome拡張機能です。
              </p>
            </div>
            <p className="lp-p">
              Style
              Atelierは、Midjourneyなどで使用するクリエイティブなプロンプトを整理・管理するためのローカルファーストなツールです。ユーザーは自身のGoogle
              Driveアカウントを連携することで、複数のデバイス間でプロンプトデータを安全に同期およびバックアップすることができます。
            </p>
          </section>

          <section className="lp-section">
            <div className="lp-section-badge">Links</div>
            <h2 className="lp-title-h2">リンク</h2>
            <div className="lp-links">
              <span
                className="lp-link"
                onClick={onViewPrivacy}
                id="link-privacy">
                📄 プライバシーポリシー
              </span>
              <a
                href="https://github.com/tmaeda11235/style-atelier"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-link">
                💻 GitHub リポジトリ
              </a>
            </div>
          </section>

          <section className="lp-section">
            <div className="lp-section-badge">Contact</div>
            <h2 className="lp-title-h2">開発者・お問い合わせ</h2>
            <p className="lp-p">
              本アプリケーションに関するご質問、フィードバック、または不具合の報告は、以下のGitHubリポジトリのIssueにて受け付けております。
            </p>
            <p className="lp-p">
              <a
                href="https://github.com/tmaeda11235/style-atelier/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-link">
                Style Atelier Issues (GitHub)
              </a>
            </p>
          </section>
        </main>

        <footer className="lp-footer">
          <p>&copy; 2026 Style Atelier. All Rights Reserved.</p>
        </footer>
      </div>
    </div>
  )
}
