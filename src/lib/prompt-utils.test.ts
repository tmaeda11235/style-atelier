import { describe, it, expect } from 'vitest';
import { parsePrompt, buildPromptString, mergePromptSegments } from './prompt-utils';
import type { PromptSegment } from './db-schema';

describe('buildPromptString', () => {
  it('should mask both sref and p', () => {
    const segments: PromptSegment[] = [{ type: 'text', value: 'a cute cat' }];
    const params = { sref: ['url1'], p: ['12345'], ar: '16:9' };
    const result = buildPromptString(segments, params, ['sref', 'p']);
    expect(result).toBe('a cute cat --ar 16:9');
  });

  it('should mask only sref', () => {
    const segments: PromptSegment[] = [{ type: 'text', value: 'a cute cat' }];
    const params = { sref: ['url1'], p: ['12345'], ar: '16:9' };
    const result = buildPromptString(segments, params, ['sref']);
    expect(result).toBe('a cute cat --ar 16:9 --p 12345');
  });

  it('should mask only p', () => {
    const segments: PromptSegment[] = [{ type: 'text', value: 'a cute cat' }];
    const params = { sref: ['url1'], p: ['12345'], ar: '16:9' };
    const result = buildPromptString(segments, params, ['p']);
    expect(result).toBe('a cute cat --ar 16:9 --sref url1');
  });

  it('should not mask any parameters', () => {
    const segments: PromptSegment[] = [{ type: 'text', value: 'a cute cat' }];
    const params = { sref: ['url1'], p: ['12345'], ar: '16:9' };
    const result = buildPromptString(segments, params);
    expect(result).toBe('a cute cat --ar 16:9 --sref url1 --p 12345');
  });
});

describe('parsePrompt', () => {
  it('should parse --profile as an alias for --p', () => {
    const prompt = 'a cute cat --profile 12345';
    const { parameters } = parsePrompt(prompt);
    expect(parameters.p).toEqual(['12345']);
  });

  it('should handle multiple spaces and complex values for --profile', () => {
    const prompt = 'a dog --profile  pcd78d7 owipony  --ar 16:9';
    const { parameters } = parsePrompt(prompt);
    expect(parameters.p).toEqual(['pcd78d7', 'owipony']);
    expect(parameters.ar).toBe('16:9');
  });

  it('should handle Japanese delimiters', () => {
    const prompt = '猫、走る。可愛い：猫';
    const { promptSegments } = parsePrompt(prompt);
    // : is a delimiter, but the current regex split might result in different behavior depending on if they are repeated
    // Let's check the current behavior.
    expect(promptSegments.length).toBeGreaterThanOrEqual(3);
    expect(promptSegments[0].value).toBe('猫');
    expect(promptSegments[1].value).toBe('走る');
  });

  it('should not split by space', () => {
    const prompt = 'a cute cat running fast';
    const { promptSegments } = parsePrompt(prompt);
    expect(promptSegments).toHaveLength(1);
    expect(promptSegments[0].value).toBe('a cute cat running fast');
  });
});

describe('mergePromptSegments', () => {
  it('should remove duplicate text segments', () => {
    const segments: PromptSegment[] = [
      { type: 'text', value: 'cat' },
      { type: 'text', value: 'dog' },
      { type: 'text', value: 'cat' },
    ];
    const result = mergePromptSegments(segments);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe('cat');
    expect(result[1].value).toBe('dog');
  });

  it('should keep non-text segments', () => {
    const segments: PromptSegment[] = [
      { type: 'text', value: 'cat' },
      { type: 'slot', label: 'color', default: 'white' },
      { type: 'text', value: 'dog' },
    ];
    const result = mergePromptSegments(segments);
    expect(result).toHaveLength(3);
  });
});