import type { HistoryItem } from "../../../lib/db-schema";

export interface IProcessor {
  process(element: HTMLElement): void
}

export interface IExtractor {
  extract(element: HTMLElement): HistoryItem | null
}

export interface IActionHandler {
  handle(payload: any): Promise<void> | void | Promise<boolean>
}

export interface IService {
  start(): void
  stop(): void
}