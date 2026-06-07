# ADR 001: Migrate slotHistory from localStorage to IndexedDB

## Status

Accepted

## Context

Previously, the historical inputs for slot variables (`slotHistory`) were stored in the browser's `localStorage` under the key `style-atelier-slot-history`.
This design had several limitations:

1. `localStorage` lacks transactional safety and has low storage limits (around 5MB), which can easily be exceeded as users save many slot values.
2. The Google Drive backup/restore and auto-sync features only serialize and sync data from the local IndexedDB. Consequently, the user's slot input history was excluded from backups and would be lost if they cleared browser data or switched devices.

## Decision

We decided to migrate the `slotHistory` table to IndexedDB.

- **Database Schema**: Upgraded the Dexie database schema to version 11, adding `slotHistory` as a key-value store (mapping a slot label to its input history values).
- **Migration Script**: Implemented a migration hook in `db-setup.ts` that automatically reads legacy history from `localStorage` on first launch, seeds it into IndexedDB, and safely deletes the legacy key.
- **Repository Integration**: Added helper methods `getAllSlotHistory` and `saveSlotHistory` inside the central database utility `src/lib/db.ts` to enforce layer boundaries and prevent direct database calls in UI components.
- **Backup/Sync Integration**: Included `slotHistory` in backup payloads and restore operations (`backup-manager.ts`), enabling full cloud auto-sync coverage for slot histories.

## Consequences

- **Cloud Sync**: Slot history is now automatically backed up and synced via Google Drive.
- **UX Stability**: Input history is protected from browser cache eviction policies affecting `localStorage`.
- **Architectural Purity**: Clean separation between UI layers and database logic.
