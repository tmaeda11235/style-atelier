import { describe, expect, it } from 'vitest';
import type { StyleCard } from './db-schema';
import { compressCardData, decompressCardData, generateQRCodeUrl } from './qr-utils';

describe('qr-utils', () => {
  const mockCard: StyleCard = {
    id: 'test-uuid-1234',
    name: 'Neon Cyber Cat',
    createdAt: 1234567890,
    updatedAt: 1234567890,
    promptSegments: [
      { type: 'text', value: 'a beautiful neon cyber cat' },
      { type: 'slot', label: 'accessory', default: 'with glasses' },
    ],
    parameters: {
      ar: '16:9',
      sref: ['https://cdn.midjourney.com/sref-1.png'],
      stylize: 250,
      raw: true,
    },
    masking: {
      isSrefHidden: false,
      isPHidden: false,
    },
    tier: 'Rare',
    isFavorite: true,
    usageCount: 5,
    tags: ['cyberpunk', 'neon', 'cat'],
    dominantColor: '#FF00FF',
    accentColor: '#00FFFF',
    thumbnailData: 'data:image/png;base64,heavythumbnaildatablahblah',
    frameId: 'frame_holo_v1',
    genealogy: {
      generation: 1,
      parentIds: [],
    },
    images: ['https://cdn.midjourney.com/original-image.png'],
  };

  describe('compressCardData and decompressCardData', () => {
    it('should compress and decompress card data successfully, maintaining key fields', () => {
      const compressed = compressCardData(mockCard);
      expect(typeof compressed).toBe('string');
      expect(compressed.length).toBeGreaterThan(0);

      // Verify that heavy visual data is not in the compressed payload (it shouldn't contain the raw thumbnailData string)
      expect(compressed).not.toContain('heavythumbnaildatablahblah');

      const decompressed = decompressCardData(compressed);

      expect(decompressed.id).toBe(mockCard.id);
      expect(decompressed.name).toBe(mockCard.name);
      expect(decompressed.promptSegments).toEqual(mockCard.promptSegments);
      expect(decompressed.parameters).toEqual(mockCard.parameters);
      expect(decompressed.tier).toBe(mockCard.tier);
      expect(decompressed.frameId).toBe(mockCard.frameId);
      expect(decompressed.dominantColor).toBe(mockCard.dominantColor);
      expect(decompressed.accentColor).toBe(mockCard.accentColor);
      
      // Original image URL should be preserved in images and selectedThumbnails
      expect(decompressed.images).toEqual(['https://cdn.midjourney.com/original-image.png']);
      expect(decompressed.selectedThumbnails).toEqual(['https://cdn.midjourney.com/original-image.png']);
      
      // Stripped properties should not be defined
      expect(decompressed.thumbnailData).toBeUndefined();
    });

    it('should throw an error when decompressing invalid data', () => {
      expect(() => decompressCardData('invalid-base64-payload')).toThrow();
    });
  });

  describe('generateQRCodeUrl', () => {
    it('should generate a QR code data URL successfully', async () => {
      const compressed = compressCardData(mockCard);
      const qrDataUrl = await generateQRCodeUrl(compressed);

      expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });
});
