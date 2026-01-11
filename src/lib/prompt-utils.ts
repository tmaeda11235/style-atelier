
export type BubbleType = 'fixed' | 'slot';

export interface BubbleData {
  id: string;
  text: string;
  type: BubbleType;
}

export const splitPromptToBubbles = (prompt: string): BubbleData[] => {
  if (!prompt) return [];

  // Regex to find {{slot}} style placeholders
  const slotRegex = /\{\{([^}]+)\}\}/g;
  const parts: { text: string; type: BubbleType }[] = [];
  let lastIndex = 0;
  let match;

  // Find all slots and add them and the text in between
  while ((match = slotRegex.exec(prompt)) !== null) {
    // Add text before the slot
    if (match.index > lastIndex) {
      parts.push({ text: prompt.substring(lastIndex, match.index), type: 'fixed' });
    }
    // Add the slot itself
    parts.push({ text: match[1], type: 'slot' });
    lastIndex = slotRegex.lastIndex;
  }

  // Add any remaining text after the last slot
  if (lastIndex < prompt.length) {
    parts.push({ text: prompt.substring(lastIndex), type: 'fixed' });
  }

  // Now, split the 'fixed' parts into smaller bubbles
  const finalBubbles: BubbleData[] = [];
  parts.forEach(part => {
    if (part.type === 'slot') {
      finalBubbles.push({ ...part, id: crypto.randomUUID() });
    } else {
      const paramRegex = /--(\w+)\s+([^--]+)/g;
      const params: {text: string, start: number, end: number}[] = [];
      let paramMatch;
      while ((paramMatch = paramRegex.exec(part.text)) !== null) {
        params.push({
          text: paramMatch[0].trim(),
          start: paramMatch.index,
          end: paramRegex.lastIndex
        });
      }

      let lastIdx = 0;
      for (const p of params) {
        const textBefore = part.text.substring(lastIdx, p.start);
        finalBubbles.push(...textBefore.split(/,|\n/).map(t => t.trim()).filter(t => t.length > 0).map(t => ({ text: t, type: 'fixed', id: crypto.randomUUID() })));
        finalBubbles.push({ text: p.text, type: 'fixed', id: crypto.randomUUID() });
        lastIdx = p.end;
      }
      const textAfter = part.text.substring(lastIdx);
      finalBubbles.push(...textAfter.split(/,|\n/).map(t => t.trim()).filter(t => t.length > 0).map(t => ({ text: t, type: 'fixed', id: crypto.randomUUID() })));
    }
  });


  return finalBubbles;
};

export const joinBubblesToPrompt = (bubbles: BubbleData[]): string => {
  const mainPromptParts: string[] = [];
  const paramParts: string[] = [];

  bubbles.forEach(bubble => {
    const text = bubble.type === 'slot' ? `{{${bubble.text}}}` : bubble.text;
    if (text.startsWith('--')) {
      paramParts.push(text);
    } else {
      mainPromptParts.push(text);
    }
  });

  const mainPrompt = mainPromptParts.join(', ');
  const params = paramParts.join(' ');

  return `${mainPrompt} ${params}`.trim();
};