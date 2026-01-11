
import React, { useState, useEffect } from 'react';

import { Bubble } from './Bubble';
import { type BubbleData, splitPromptToBubbles } from '../../lib/prompt-utils';

interface BubbleEditorProps {
  initialPrompt: string;
  onChange?: (bubbles: BubbleData[]) => void;
}

export const BubbleEditor: React.FC<BubbleEditorProps> = ({ initialPrompt, onChange }) => {
  const [bubbles, setBubbles] = useState<BubbleData[]>(splitPromptToBubbles(initialPrompt));

  useEffect(() => {
    if (onChange) {
      onChange(bubbles);
    }
  }, [bubbles, onChange]);

  const handleBubbleClick = (id: string) => {
      console.log('Bubble clicked:', id);
      setBubbles(bubbles.map(b => {
          if (b.id === id) {
              return {...b, type: b.type === 'fixed' ? 'slot' : 'fixed'}
          }
          return b;
      }))
  }

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-slate-100 rounded-lg">
      {bubbles.map(bubble => (
        <Bubble key={bubble.id} bubble={bubble} onClick={() => handleBubbleClick(bubble.id)} />
      ))}
    </div>
  );
};