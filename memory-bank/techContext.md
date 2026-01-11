# Tech Context

## Technology Stack
- **Framework**: [Plasmo](https://docs.plasmo.com/) (React + TypeScript) - Specialized for Chrome Extensions.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) - Lightweight and scalable state management.
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) / [Tailwind CSS](https://tailwindcss.com/) - For modern, accessible styling.
- **Local Database**: [Dexie.js](https://dexie.org/) - Wrapper for IndexedDB.

## Key Libraries
- **Image Processing**: Canvas API (Native).
- **Metadata/Exif**: `piexifjs` - For embedding/extracting JSON in images.
- **QR Codes**: `jsQR` - For scanning/generating QR codes on cards.
- **Search**: `FlexSearch.js` - High-performance client-side search.

## Development Environment
- **Node.js**: LTS version recommended.
- **Package Manager**: pnpm (preferred) or npm.
- **Browser**: Google Chrome (Latest).

## Constraints
- **Manifest V3**: Strict security policies (no remote code execution).
- **Storage Limits**: IndexedDB limits vary by device, but generally sufficient for metadata + thumbnails. Full images should be external references or carefully cached.