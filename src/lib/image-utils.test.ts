import { describe, it, expect } from "vitest";
import { createThumbnailDataUrl } from "./image-utils";

describe("Image Utilities", () => {
  describe("createThumbnailDataUrl", () => {
    it("returns dummy base64 in test environment for remote URL", async () => {
      const dataUrl = await createThumbnailDataUrl("https://example.com/image.png");
      expect(dataUrl).toContain("data:image/png;base64,");
    });

    it("returns dummy base64 in test environment for empty string", async () => {
      const dataUrl = await createThumbnailDataUrl("");
      expect(dataUrl).toContain("data:image/png;base64,");
    });

    it("returns original placeholder asset path when assets/icon.png is passed", async () => {
      const dataUrl = await createThumbnailDataUrl("assets/icon.png");
      expect(dataUrl).toBe("assets/icon.png");
    });

    it("returns original placeholder asset path when url: prefix is passed", async () => {
      const dataUrl = await createThumbnailDataUrl("url:../../assets/icon.png");
      expect(dataUrl).toBe("url:../../assets/icon.png");
    });
  });
});
