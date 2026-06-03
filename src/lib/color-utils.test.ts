import { describe, it, expect } from "vitest";
import { rgbToHsl, rgbToHex, getQuantizedColorName, analyzeImageColors, hexToRgb, hexToHsl, getColorNameFromHex } from "./color-utils";

describe("Color Utilities", () => {
  describe("rgbToHsl", () => {
    it("converts white correctly", () => {
      const [h, s, l] = rgbToHsl(255, 255, 255);
      expect(h).toBe(0);
      expect(s).toBe(0);
      expect(l).toBe(100);
    });

    it("converts black correctly", () => {
      const [h, s, l] = rgbToHsl(0, 0, 0);
      expect(h).toBe(0);
      expect(s).toBe(0);
      expect(l).toBe(0);
    });

    it("converts pure red correctly", () => {
      const [h, s, l] = rgbToHsl(255, 0, 0);
      expect(h).toBe(0);
      expect(s).toBe(100);
      expect(l).toBe(50);
    });

    it("converts green correctly", () => {
      const [h, s, l] = rgbToHsl(0, 255, 0);
      expect(h).toBe(120);
      expect(s).toBe(100);
      expect(l).toBe(50);
    });
  });

  describe("rgbToHex", () => {
    it("converts rgb to hex format", () => {
      expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
      expect(rgbToHex(0, 0, 0)).toBe("#000000");
      expect(rgbToHex(79, 70, 229)).toBe("#4f46e5");
    });
  });

  describe("getQuantizedColorName", () => {
    it("quantizes high lightness to White", () => {
      expect(getQuantizedColorName(0, 0, 95)).toBe("White");
    });

    it("quantizes low lightness to Black", () => {
      expect(getQuantizedColorName(0, 0, 5)).toBe("Black");
    });

    it("quantizes low saturation to Gray", () => {
      expect(getQuantizedColorName(120, 5, 50)).toBe("Gray");
    });

    it("quantizes brown colors", () => {
      expect(getQuantizedColorName(30, 40, 30)).toBe("Brown");
    });

    it("quantizes standard hues correctly", () => {
      expect(getQuantizedColorName(0, 100, 50)).toBe("Red");
      expect(getQuantizedColorName(30, 80, 50)).toBe("Orange");
      expect(getQuantizedColorName(60, 100, 50)).toBe("Yellow");
      expect(getQuantizedColorName(120, 100, 50)).toBe("Green");
      expect(getQuantizedColorName(180, 100, 50)).toBe("Cyan");
      expect(getQuantizedColorName(220, 100, 50)).toBe("Blue");
      expect(getQuantizedColorName(270, 100, 50)).toBe("Purple");
      expect(getQuantizedColorName(320, 100, 50)).toBe("Pink");
    });
  });

  describe("analyzeImageColors", () => {
    it("returns default/fallback values in Node test environment", async () => {
      const colors = await analyzeImageColors("http://example.com/test.png");
      expect(colors.dominantName).toBe("Blue");
      expect(colors.accentName).toBe("Orange");
      expect(colors.dominantHex).toBe("#4f46e5");
      expect(colors.accentHex).toBe("#f59e0b");
    });

    it("returns default/fallback values when image is placeholder asset", async () => {
      const colors1 = await analyzeImageColors("assets/icon.png");
      expect(colors1.dominantName).toBe("Blue");
      
      const colors2 = await analyzeImageColors("url:../../assets/icon.png");
      expect(colors2.dominantName).toBe("Blue");
    });
  });

  describe("hex helpers", () => {
    it("converts hex to rgb", () => {
      expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
      expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
      expect(hexToRgb("#ff0000")).toEqual([255, 0, 0]);
    });

    it("converts hex to hsl", () => {
      expect(hexToHsl("#ffffff")).toEqual([0, 0, 100]);
      expect(hexToHsl("#ff0000")).toEqual([0, 100, 50]);
    });

    it("gets color name from hex", () => {
      expect(getColorNameFromHex("#ff0000")).toBe("Red");
      expect(getColorNameFromHex("#0000ff")).toBe("Blue");
      expect(getColorNameFromHex("#ffffff")).toBe("White");
    });
  });
});
