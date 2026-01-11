import { describe, it, expect } from 'vitest';
import { RARITY_CONFIG } from './rarity-config';

describe('Rarity Config', () => {
  it('should have all required tiers', () => {
    expect(RARITY_CONFIG).toHaveProperty('Common');
    expect(RARITY_CONFIG).toHaveProperty('Rare');
    expect(RARITY_CONFIG).toHaveProperty('Epic');
    expect(RARITY_CONFIG).toHaveProperty('Legendary');
  });

  it('should have correct visual properties for Legendary', () => {
    const legendary = RARITY_CONFIG.Legendary;
    expect(legendary.bgClass).toContain('bg-yellow-500');
    expect(legendary.glowClass).toContain('shadow-');
    expect(legendary.glowClass).toContain('animate-pulse');
  });
});