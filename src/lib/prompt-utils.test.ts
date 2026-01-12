import { describe, it, expect } from 'vitest';
import { buildPromptString, parsePrompt, mergePromptSegments } from './prompt-utils';
import type { PromptSegment, StyleCard } from './db-schema';

describe('buildPromptString', () => {
  const segments: PromptSegment[] = [{ type: 'text', value: 'a cat' }];
  const params: StyleCard['parameters'] = {
    sref: ['http://example.com/style.jpg'],
    p: 'abcdef',
    ar: '16:9',
  };

  it('should mask both sref and p', () => {
    const prompt = buildPromptString(segments, params, ['sref', 'p']);
    expect(prompt).toBe('a cat --ar 16:9');
  });

  it('should mask only sref', () => {
    const prompt = buildPromptString(segments, params, ['sref']);
    expect(prompt).toBe('a cat --ar 16:9 --p abcdef');
  });

  it('should mask only p', () => {
    const prompt = buildPromptString(segments, params, ['p']);
    expect(prompt).toBe('a cat --ar 16:9 --sref http://example.com/style.jpg');
  });

  it('should not mask any parameters', () => {
    const prompt = buildPromptString(segments, params, []);
    expect(prompt).toBe('a cat --ar 16:9 --sref http://example.com/style.jpg --p abcdef');
  });
});

describe('parsePrompt', () => {
  it('should parse --profile as an alias for --p', () => {
    const prompt = 'a cute cat --profile 12345';
    const { parameters } = parsePrompt(prompt);
    expect(parameters.p).toBe('12345');
  });

  it('should handle multiple spaces and complex values for --profile', () => {
    const prompt = 'a dog --profile  pcd78d7 owipony  --ar 16:9';
    const { parameters } = parsePrompt(prompt);
    expect(parameters.p).toBe('pcd78d7 owipony');
    expect(parameters.ar).toBe('16:9');
  });

  it('should handle Japanese delimiters', () => {
    const prompt = 'cat,dogbirdfish:ant;bee';
    const { promptSegments } = parsePrompt(prompt);
    expect(promptSegments).toHaveLength(6);
    expect(promptSegments.map(s => s.value)).toEqual(['cat', 'dog', 'bird', 'fish', 'ant', 'bee']);
  });

  it('should not split by space', () => {
    const prompt = 'a cute cat --ar 16:9';
    const { promptSegments } = parsePrompt(prompt);
    expect(promptSegments).toHaveLength(1);
    expect(promptSegments[0].value).toBe('a cute cat');
  });
});

describe('mergePromptSegments', () => {
  it('should remove duplicate text segments', () => {
    const segments: PromptSegment[] = [
      { type: 'text', value: 'a cat' },
      { type: 'text', value: 'a cat' },
      { type: 'text', value: 'A CAT ' },
      { type: 'text', value: 'a dog' },
    ];
    const merged = mergePromptSegments(segments);
    expect(merged).toHaveLength(2);
    expect(merged[0].value).toBe('a cat');
    expect(merged[1].value).toBe('a dog');
  });

  it('should keep non-text segments', () => {
    const segments: PromptSegment[] = [
      { type: 'text', value: 'a cat' },
      { type: 'slot', label: 'animal', id: '1' },
      { type: 'text', value: 'a cat' },
    ];
    const merged = mergePromptSegments(segments);
    expect(merged).toHaveLength(2);
    expect(merged[0].value).toBe('a cat');
    expect(merged[1].type).toBe('slot');
  });
});