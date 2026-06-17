---
noteId: "c447daa0eeb511f0aa7a379a6036fa3e"
tags: []
---

# Product Context

## Vision

**"Turn your Prompts into Assets."**
Elevate Midjourney prompt management from a simple text notepad to a TCG-like asset management system and an intuitive "atelier" for mixing styles.

## The Problem

- **Prompt Chaos**: Managing complex prompts as text strings is difficult and uninspiring.
- **Reproducibility**: "How did I make that?" is a common question. Recovering exact styles is hard.
- **Asset Value**: Created styles are valuable but difficult to package, share, or brand.
- **Mobile Place Friction**: SNS (X/Discord等) からのモバイル流入率が85%以上にのぼる一方で、PC未所持によるブラウザ拡張機能インストール摩擦、オフライン時におけるコレクションの閲覧不可など、モバイル環境特有の深刻なペインが存在する。

## The Solution

Midjourney Style Manager is a "Local-First" and "Local AI-Powered" Chrome Extension and Mobile PWA that treats prompts as "Style Cards."

- **Minting**: Convert generated images into trading cards with encapsulated prompt data.
- **Organization**: Manage collections with binders, decks, and tiers.
- **Production**: A visual workspace to mix and match cards to generate new prompts.
- **Portable Showcase (Mobile PWA)**: 外出先で自慢のコレクションを閲覧できる「持ち歩けるアトリエ図鑑」を提供。A2HSによるローカル永続化、Web Share APIを用いたネイティブ共有によるバイラル化、WebRTC/一時キャッシュ同期によるPCとの認証不要のデバイス連携を実現する。
- **Local AI Engine**: Integrated with Gemma-2 2B (a lightweight model under 1GB) running entirely client-side. This enables intelligent style suggestions, dynamic prompt parsing, and offline assistance without sending any data to external servers.

## Target Audience

- **Primary**: Midjourney Power Users (Image Creators).
- **Needs**: Reproducibility, asset management, branding, and efficient workflow.

## User Experience Goals

1.  **Visual & Tangible**: Move away from text lists to visual cards and binders.
2.  **Gamified Ownership**: Satisfy the desire to collect and organize with rarity tiers and frames.
3.  **Fluid Workflow**: "Atelier" interface for intuitive prompt mixing (drag & drop).
4.  **Privacy First & Zero API Cost**: All data stays local, and the integrated Gemma-2 2B AI model runs completely on-device. No external servers or API keys are required, ensuring maximum privacy and zero operating costs.
