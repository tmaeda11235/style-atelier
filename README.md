# Style Atelier (Midjourney Style Manager)

Style Atelier is a Chrome Extension designed to transform Midjourney prompt management from simple text storage into a "Trading Card Game (TCG)-like asset management" and "Atelier-like intuitive mixing" experience.

**"Turn your Prompts into Assets."**

---

## Features

- **TCG-style Asset Management**: Convert generated images into visual "Style Cards" with encapsulated prompt data and rarity tiers.
- **Binder & Deck Building**: Organize collections using virtual binders, custom categories, and decks.
- **Atelier Workspace**: An intuitive drag-and-drop workspace to mix and match styles to generate new creative prompts.
- **Local-First & Privacy-Focused**: No remote server storing your creative ideas. All data is saved locally in IndexedDB (via Dexie.js).
- **Google Drive Sync**: Securely backup and restore your collection via Google Drive integration.
- **Sharing**: Exchanging styles is made easy through Exif-embedded images or QR code scanning.

---

## Tech Stack

- **Core Framework**: [Plasmo](https://docs.plasmo.com/) (React 19 + TypeScript)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Local AI Engine**: [@mlc-ai/web-llm](https://webllm.mlc.ai/) (Gemma-2 2B model client-side execution)
- **Background Orchestration**: Chrome Extension Offscreen Documents & Web Workers
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Testing**: [Vitest](https://vitest.dev/) (Unit/Integration) & [Playwright](https://playwright.dev/) (E2E)

---

## Getting Started

### Prerequisites

- **Node.js** (LTS version recommended)
- **Google Chrome** (latest version)

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/tmaeda11235/style-atelier.git
   cd style-atelier
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the local development server:

```bash
npm run dev
```

This will compile the extension in development mode.

#### Loading the Extension into Chrome:

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the build directory: `<project-root>/build/chrome-mv3-dev`.

The popup, option pages, or side panels will auto-reload as you make changes to the source code.

#### Development Guidelines

For detailed guidelines on our collaborative development process (including Git Worktree setup, ESLint and i18n rules, and testing workflows), please refer to the [Development Guide](docs/DEVELOPMENT.md).

開発プロセス、Git Worktree のセットアップ、ESLint の行数・複雑度制限、多言語対応（i18n）ルール、テスト手順などの詳細なガイドラインについては、[開発ガイドライン](docs/DEVELOPMENT.md) を参照してください。

---

## Running Tests

### Unit Tests

Run unit tests with Vitest:

```bash
npm run test
```

For the Vitest UI dashboard:

```bash
npm run test:ui
```

### End-to-End Tests

Run integration/E2E tests using Playwright:

```bash
npm run test:e2e
```

---

## Production Build

Create a production-ready package:

```bash
npm run build
```

This output is saved to `build/chrome-mv3-prod`.

To bundle the production build into a `.zip` file for web store submission:

```bash
npm run package
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
