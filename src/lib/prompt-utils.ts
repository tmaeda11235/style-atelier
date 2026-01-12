import type { PromptSegment, StyleCard } from "./db-schema";

const PARAM_REGEX = /--([a-z0-9-]+)\s*([^--]*)/g;

export const parsePrompt = (fullCommand: string): { promptSegments: PromptSegment[], parameters: StyleCard['parameters'] } => {
  const parameters: StyleCard['parameters'] = {};
  let promptText = fullCommand;

  const matches = [...fullCommand.matchAll(PARAM_REGEX)];
  matches.forEach(match => {
    const key = match[1].trim();
    const value = match[2] ? match[2].trim() : '';
    promptText = promptText.replace(match[0], '');

    switch (key) {
      case 'ar':
        parameters.ar = value;
        break;
      case 'sref':
        parameters.sref = value.split(/\s+/);
        break;
      case 'cref':
        parameters.cref = value.split(/\s+/);
        break;
      case 'p':
      case 'profile':
        parameters.p = value;
        break;
      case 'stylize':
      case 's':
        parameters.stylize = parseInt(value, 10);
        break;
      case 'chaos':
      case 'c':
        parameters.chaos = parseInt(value, 10);
        break;
      case 'weird':
      case 'w':
        parameters.weird = parseInt(value, 10);
        break;
      case 'tile':
        parameters.tile = true;
        break;
      case 'style':
        if (value === 'raw') {
          parameters.raw = true;
        }
        break;
    }
  });

  const delimiters = /[,. :;]+/
  const promptSegments: PromptSegment[] = promptText
    .split(delimiters)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(value => ({ type: 'text', value }));
  
  return { promptSegments, parameters };
};

export const buildPromptString = (segments: PromptSegment[], params: StyleCard['parameters'], maskedKeys: (keyof StyleCard['parameters'])[] = []): string => {
  const segmentString = segments
    .map(seg => {
      switch (seg.type) {
        case 'text':
          return seg.value;
        case 'slot':
          return `{{${seg.label}}}`;
        case 'chip':
          return ``;
      }
    })
    .filter(val => !!val && val.trim() !== '')
    .join(', ');

  const paramParts: string[] = [];
  if (params.ar && !maskedKeys.includes('ar')) paramParts.push(`--ar ${params.ar}`);
  if (params.sref?.length && !maskedKeys.includes('sref')) paramParts.push(`--sref ${params.sref.join(' ')}`);
  if (params.cref?.length && !maskedKeys.includes('cref')) paramParts.push(`--cref ${params.cref.join(' ')}`);
  if (params.p && !maskedKeys.includes('p')) paramParts.push(`--p ${params.p}`);
  if (params.stylize !== undefined && !maskedKeys.includes('stylize')) paramParts.push(`--s ${params.stylize}`);
  if (params.chaos !== undefined && !maskedKeys.includes('chaos')) paramParts.push(`--c ${params.chaos}`);
  if (params.weird !== undefined && !maskedKeys.includes('weird')) paramParts.push(`--w ${params.weird}`);
  if (params.tile && !maskedKeys.includes('tile')) paramParts.push('--tile');
  if (params.raw && !maskedKeys.includes('raw')) paramParts.push('--style raw');
  
  return `${segmentString} ${paramParts.join(' ')}`.trim();
};

export const mergePromptSegments = (allSegments: PromptSegment[]): PromptSegment[] => {
  const seen = new Set<string>();
  const merged: PromptSegment[] = [];

  allSegments.forEach(seg => {
    if (seg.type === 'text') {
      const normalized = seg.value.toLowerCase().trim();
      if (!seen.has(normalized) && normalized.length > 0) {
        seen.add(normalized);
        merged.push(seg);
      }
    } else {
      // For slots/chips, we might want different logic later, but for now just include them
      merged.push(seg);
    }
  });

  return merged;
};