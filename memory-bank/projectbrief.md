# Project Brief

## Project Overview

Midjourney Style Manager ("style-atelier") is a Chrome Extension designed to transform Midjourney prompt management from simple text storage into a "Trading Card Game (TCG)-like asset management" and "Atelier-like intuitive mixing" experience.

## Core Requirements

- **Platform**: Chrome Extension (Manifest V3, Side Panel API).
- **Architecture**: Serverless, Local-First, Privacy-Focused.
- **Key Metaphor**: "Turn your Prompts into Assets."
- **Data Handling**: Images as "Database" (Memento Pattern).

## Project Goals

- **Asset Management**: Mint prompts into "Style Cards" with visual indexing.
- **Organization**: TCG-style binder and deck building.
- **Production**: Fluid, atelier-like prompt mixing and generation.
- **Sharing**: Secure and easy sharing via QR codes or metadata-embedded images.

## Roadmap

1.  **Phase 1: MVP (The Core)**
    - Technical verification (Plasmo + Side Panel).
    - Basic Minting, History, Listing.
    - IndexedDB integration.
2.  **Phase 2: The TCG Update (Value Add)**
    - Bubble UI, Tier System.
    - Visual Indexing, Deck Building.
3.  **Phase 3: The Economy Update & Mobile Standalone PWA (Monetization & Expansion)**
    - Frame designs, Licensing logic.
    - Mobile PWA Expansion (詳細は [docs/mobile-pwa-roadmap.md](file:///c:/Users/oculus/Desktop/style-atelier/docs/mobile-pwa-roadmap.md) を参照):
      - **Phase 1: Foundation & Offline Storage (基礎・オフライン化)**: Web App Manifest, Service Workerによるキャッシュ, iOS/AndroidのA2HS, OPFSによる画像キャッシュ。
      - **Phase 2: Zero-Friction Hybrid Sync & Touch UX (同期摩擦解消とUI最適化)**: Google Drive OAuth Standaloneリダイレクト問題へのポップアップ対応, WebRTCによるP2Pローカル同期, 暗号化中間キャッシュ同期, タッチ・フリック操作に最適化したSocial Binder UI。
      - **Phase 3: Resilient Mobile AI Inference & Mobile Mint (モバイルAI・高レジリエンス)**: Web Worker内でのLiteRT-LM推論, デバイス特性(RAM/WebGPU)の事前検知, クラウド(Gemini API)への自動フォールバック推論, OPFSによる大容量モデル of キャッシュストレージ管理。
