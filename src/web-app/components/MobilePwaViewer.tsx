/* eslint-disable max-lines, max-lines-per-function */
import React, { useEffect } from "react"

import { initPwaViewer } from "../index"

interface MobilePwaViewerProps {
  onBackToLp: () => void
}

export const MobilePwaViewer: React.FC<MobilePwaViewerProps> = ({
  onBackToLp
}) => {
  useEffect(() => {
    document.body.classList.add("view-pwa")
    // Initialize Vanilla JS PWA Logic on mount
    initPwaViewer(onBackToLp)
    return () => {
      document.body.classList.remove("view-pwa")
    }
  }, [onBackToLp])

  return (
    <>
      <div className="phone-notch"></div>
      <div className="phone-frame main-container">
        {/* Header */}
        <header className="app-header">
          <h1 className="app-title">STYLE ATELIER</h1>
          <p className="app-subtitle" id="appSubtitle">
            Mobile Preview
          </p>
        </header>

        {/* Card */}
        <div className="card-perspective" id="cardContainer">
          <div className="card-inner">
            {/* Card Front */}
            <div className="card-front" id="cardFront">
              <div className="card-glow-overlay"></div>
              <div className="hologram-overlay"></div>
              <div className="card-header">
                <span className="card-title" id="cardTitleFront">
                  Loading...
                </span>
                <span className="card-badge">Style Card</span>
              </div>
              <div className="card-body">
                <div className="card-image-container" id="cardImageContainer">
                  {/* Dynamically populated */}
                </div>
              </div>
              <div className="card-footer">
                <span className="card-rarity" id="cardRarityFront">
                  UNKNOWN
                </span>
                <span className="card-badge" id="cardVersionFront">
                  v0.0.0
                </span>
              </div>
            </div>

            {/* Card Back */}
            <div className="card-back" id="cardBack">
              <div className="card-glow-overlay"></div>
              <div className="card-header">
                <span className="card-title" id="cardTitleBack">
                  Loading...
                </span>
                <span className="card-badge">PROMPT</span>
              </div>
              <div
                className="card-body"
                style={{
                  justifyContent: "flex-start",
                  alignItems: "stretch",
                  marginTop: "1rem",
                  overflowY: "auto",
                  maxHeight: "calc(100% - 80px)"
                }}>
                <div className="prompt-preview" id="promptText">
                  No prompt data loaded.
                </div>
                <div
                  className="parameter-badge-container"
                  id="parameterBadges"></div>
                <button className="action-btn action-btn-primary" id="copyBtn">
                  <svg
                    style={{ width: "20px", height: "20px" }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  プロンプトをコピー
                </button>
                <button
                  className="action-btn action-btn-secondary"
                  id="saveCloudBtn">
                  <svg
                    style={{ width: "20px", height: "20px" }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                    />
                  </svg>
                  クラウド保存（PCへ同期）
                </button>

                {/* AI Style Analysis Section */}
                <div
                  className="ai-analysis-section"
                  id="aiAnalysisSection"
                  style={{
                    marginTop: "1.5rem",
                    padding: "1rem",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column"
                  }}>
                  <h3
                    style={{
                      margin: "0 0 10px 0",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#a78bfa",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      width: "100%"
                    }}>
                    <svg
                      style={{
                        width: "16px",
                        height: "16px",
                        color: "#a78bfa"
                      }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904L9 21l-.813-5.096L3 15l5.096-.813L9 9l.813 5.096L15 15l-5.096.813zM19.071 4.929l-.707 3.536L14.828 9l3.536.707.707 3.536.707-3.536L24 9l-3.536-.707-.707-3.536zM9 4.929l-.707 3.536L4.828 9l3.536.707.707 3.536.707-3.536L14 9l-3.536-.707-.707-3.536z"
                      />
                    </svg>
                    <span>AI スタイル分析</span>
                    <span
                      id="aiModeBadge"
                      style={{
                        fontSize: "0.65rem",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: "rgba(59, 130, 246, 0.2)",
                        border: "1px solid rgba(59, 130, 246, 0.4)",
                        color: "#60a5fa",
                        fontWeight: "normal",
                        marginLeft: "auto",
                        display: "none"
                      }}>
                      標準モード
                    </span>
                  </h3>

                  {/* Download Button */}
                  <button
                    className="action-btn action-btn-ai"
                    id="aiDownloadBtn"
                    style={{ display: "none" }}>
                    モデルのダウンロード (約2GB)
                  </button>

                  {/* Progress State (Downloading or Initializing) */}
                  <div
                    className="ai-progress-container"
                    id="aiProgressContainer"
                    style={{
                      display: "none",
                      marginTop: "10px",
                      flexDirection: "column"
                    }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        marginBottom: "5px"
                      }}>
                      <span id="aiProgressText">モデルをダウンロード中...</span>
                      <span id="aiProgressPercent">0%</span>
                    </div>
                    <div
                      className="ai-progress-bar-bg"
                      style={{
                        width: "100%",
                        height: "6px",
                        background: "rgba(255,255,255,0.1)",
                        borderRadius: "3px",
                        overflow: "hidden"
                      }}>
                      <div
                        className="ai-progress-bar-fill"
                        id="aiProgressBarFill"
                        style={{
                          width: "0%",
                          height: "100%",
                          background:
                            "linear-gradient(90deg, #8b5cf6, #3b82f6)",
                          transition: "width 0.2s ease"
                        }}></div>
                    </div>
                    <div
                      id="aiDownloadStats"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.7rem",
                        color: "#64748b",
                        marginTop: "4px"
                      }}>
                      <span id="aiSpeed">0.0 MB/s</span>
                      <span id="aiEta">残り時間: --:--</span>
                    </div>
                  </div>

                  {/* Analyze Button */}
                  <button
                    className="action-btn action-btn-ai"
                    id="aiAnalyzeBtn"
                    style={{ display: "none" }}>
                    <svg
                      style={{
                        width: "16px",
                        height: "16px",
                        display: "inline-block",
                        verticalAlign: "middle",
                        marginRight: "4px"
                      }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                    スタイルを分析する
                  </button>

                  {/* Results Area */}
                  <div
                    className="ai-results-container"
                    id="aiResultsContainer"
                    style={{
                      display: "none",
                      marginTop: "12px",
                      gap: "8px",
                      flexDirection: "column"
                    }}>
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(139, 92, 246, 0.1)",
                        border: "1px solid rgba(139, 92, 246, 0.2)",
                        fontSize: "0.8rem",
                        display: "flex",
                        gap: "4px"
                      }}>
                      <span style={{ color: "#a78bfa", fontWeight: "bold" }}>
                        ジャンル:{" "}
                      </span>
                      <span
                        id="aiResultGenre"
                        style={{ color: "#f1f5f9", fontWeight: "600" }}>
                        --
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem" }}>
                      <span
                        style={{
                          color: "#94a3b8",
                          fontWeight: "bold",
                          display: "block",
                          marginBottom: "4px"
                        }}>
                        推奨タグ:
                      </span>
                      <div
                        id="aiResultTags"
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px"
                        }}></div>
                    </div>
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        fontSize: "0.8rem",
                        color: "#cbd5e1",
                        lineHeight: "1.4"
                      }}>
                      <span
                        style={{
                          color: "#94a3b8",
                          fontWeight: "bold",
                          display: "block",
                          marginBottom: "4px"
                        }}>
                        日本語要約:
                      </span>
                      "<span id="aiResultSummary">--</span>"
                    </div>
                    {/* VRAM/Latency Stats */}
                    <div
                      id="aiInferenceStats"
                      style={{
                        fontSize: "0.7rem",
                        color: "#64748b",
                        textAlign: "right",
                        marginTop: "4px"
                      }}>
                      Latency: <span id="aiLatency">0</span>ms | Speed:{" "}
                      <span id="aiSpeedTps">0</span> t/s
                    </div>
                  </div>

                  {/* Error State */}
                  <div
                    id="aiErrorAlert"
                    style={{
                      display: "none",
                      marginTop: "10px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      fontSize: "0.75rem",
                      color: "#f87171",
                      alignItems: "flex-start",
                      gap: "6px"
                    }}>
                    <svg
                      style={{
                        width: "16px",
                        height: "16px",
                        flexShrink: 0,
                        marginTop: "2px"
                      }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span id="aiErrorText">エラーが発生しました</span>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <span className="card-rarity" id="cardRarityBack">
                  UNKNOWN
                </span>
                <span className="card-badge" id="cardVersionBack">
                  v0.0.0
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* App Footer */}
        <footer className="app-footer">
          <a href="#" className="install-cta" id="installCta">
            製品紹介LPへ戻る
            <svg
              style={{ width: "14px", height: "14px" }}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
          </a>
        </footer>

        {/* Toast Notification */}
        <div className="toast" id="toast">
          <svg
            style={{ width: "16px", height: "16px", stroke: "#34d399" }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>コピーしました！</span>
        </div>
      </div>

      {/* A2HS Android/Chrome Install Dialog */}
      <div
        className="a2hs-dialog"
        id="androidInstallDialog"
        style={{ display: "none" }}>
        <div className="a2hs-content">
          <button
            className="a2hs-close-btn"
            id="androidCloseBtn"
            aria-label="閉じる">
            &times;
          </button>
          <div className="a2hs-icon-wrapper">
            <img
              src="/icon-192.png"
              alt="Style Atelier Icon"
              className="a2hs-app-icon"
            />
          </div>
          <h3 className="a2hs-title">Style Atelier をインストール</h3>
          <p className="a2hs-desc">
            ホーム画面に追加して、オフライン表示や高速起動など、より快適なアプリ体験をお楽しみください。
          </p>
          <button
            className="action-btn action-btn-primary"
            id="androidInstallBtn">
            インストールする
          </button>
          <button className="a2hs-dismiss-btn" id="androidDismissBtn">
            今回は見送る
          </button>
        </div>
      </div>

      {/* A2HS iOS/Safari Install Tooltip */}
      <div
        className="a2hs-ios-tooltip"
        id="iosInstallTooltip"
        style={{ display: "none" }}>
        <div className="a2hs-ios-content">
          <button
            className="a2hs-close-btn"
            id="iosCloseBtn"
            aria-label="閉じる">
            &times;
          </button>
          <div className="a2hs-ios-step">
            <span className="pp-step-num">1</span>
            <span>
              Safariの共有ボタン{" "}
              <span className="a2hs-safari-icon">
                <svg
                  style={{
                    width: "18px",
                    height: "18px",
                    display: "inline",
                    verticalAlign: "middle",
                    stroke: "#8b5cf6"
                  }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </span>{" "}
              をタップします。
            </span>
          </div>
          <div className="a2hs-ios-step">
            <span className="pp-step-num">2</span>
            <span>メニューから「ホーム画面に追加」を選択します。</span>
          </div>
        </div>
        <div className="a2hs-ios-arrow"></div>
      </div>
    </>
  )
}
