import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderCardToCanvas } from "./export-utils";
import type { StyleCard } from "./db-schema";
import { db } from "./db";

const originalImage = global.Image;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const originalGetContext = HTMLCanvasElement.prototype.getContext;

describe("export-utils", () => {
  let createdObjectURLs: string[] = [];

  beforeEach(() => {
    createdObjectURLs = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      const url = `blob:mock-url-${createdObjectURLs.length}`;
      createdObjectURLs.push(url);
      return url;
    });
    URL.revokeObjectURL = vi.fn();

    const mockContext = {
      fillRect: vi.fn(),
      stroke: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      save: vi.fn(),
      clip: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      drawImage: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 100 }),
    };

    HTMLCanvasElement.prototype.getContext = vi.fn((contextId) => {
      if (contextId === '2d') {
        return mockContext;
      }
      return null;
    }) as any;

    // Mock Image load process
    global.Image = class {
      src: string = "";
      crossOrigin: string = "";
      onload: (() => void) | null = null;
      onerror: ((err: any) => void) | null = null;

      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
    } as any;
  });

  afterEach(() => {
    global.Image = originalImage;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    vi.restoreAllMocks();
  });

  const baseCard: StyleCard = {
    id: "card-uuid",
    name: "Test Card",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [{ type: "text", value: "A beautiful landscape" }],
    parameters: { ar: "16:9" },
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Common",
    isFavorite: false,
    usageCount: 0,
    tags: [],
    dominantColor: "#123456",
    thumbnailData: "data:image/png;base64,mockbase64",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] },
  };

  it("should prioritize local thumbnailData and skip external CDN loading when only 1 thumbnail is needed", async () => {
    const spyGet = vi.spyOn(db.historyItems, "get").mockResolvedValue(undefined);
    
    const imageLoadSources: string[] = [];
    global.Image = class {
      _src: string = "";
      crossOrigin: string = "";
      onload: (() => void) | null = null;
      onerror: ((err: any) => void) | null = null;

      set src(val: string) {
        this._src = val;
        imageLoadSources.push(val);
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
      get src() {
        return this._src;
      }
    } as any;

    const card: StyleCard = {
      ...baseCard,
      thumbnailData: "data:image/png;base64,mockbase64",
      selectedThumbnails: ["https://cdn.midjourney.com/image.png"],
    };

    await renderCardToCanvas(card);

    expect(imageLoadSources).toContain("data:image/png;base64,mockbase64");
    expect(imageLoadSources).not.toContain("https://cdn.midjourney.com/image.png");
    expect(spyGet).not.toHaveBeenCalled();
  });

  it("should resolve cached localImageBlob from db.historyItems when grid layout is required and use Object URL", async () => {
    const mockBlob = new Blob(["mock"], { type: "image/png" });
    const spyGet = vi.spyOn(db.historyItems, "get").mockResolvedValue({
      id: "job-1",
      fullCommand: "",
      imageUrl: "https://cdn.midjourney.com/image1.png",
      localImageBlob: mockBlob,
      timestamp: Date.now(),
    });

    const imageLoadSources: string[] = [];
    global.Image = class {
      _src: string = "";
      crossOrigin: string = "";
      onload: (() => void) | null = null;
      onerror: ((err: any) => void) | null = null;

      set src(val: string) {
        this._src = val;
        imageLoadSources.push(val);
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
      get src() {
        return this._src;
      }
    } as any;

    const card: StyleCard = {
      ...baseCard,
      thumbnailData: "data:image/png;base64,mockbase64",
      selectedThumbnails: [
        "https://cdn.midjourney.com/image1.png",
        "https://cdn.midjourney.com/image2.png"
      ],
      associatedJobIds: ["job-1"],
    };

    await renderCardToCanvas(card);

    expect(imageLoadSources).toContain("blob:mock-url-0");
    expect(imageLoadSources).toContain("https://cdn.midjourney.com/image2.png");
    expect(spyGet).toHaveBeenCalledWith("job-1");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url-0");
  });
});
