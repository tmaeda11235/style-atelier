export interface IMJElementData {
  src: string
  prompt: string
  jobId?: string
  source: string
}

export interface IProcessor {
  process(element: HTMLElement): void
}

export interface IExtractor {
  extract(element: HTMLElement): IMJElementData | null
}

export interface IActionHandler {
  handle(payload: any): Promise<void> | void
}

export interface IService {
  start(): void
  stop(): void
}