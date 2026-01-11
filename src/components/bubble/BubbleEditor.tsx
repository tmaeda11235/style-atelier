import React, { useState, useEffect } from 'react';

import { Bubble } from './Bubble';
import type { PromptSegment } from '../../lib/db-schema';

interface BubbleEditorProps {
  initialSegments: PromptSegment[];
  onChange?: (segments: PromptSegment[]) => void;
}

export const BubbleEditor: React.FC<BubbleEditorProps> = ({ initialSegments, onChange }) => {
  const [segments, setSegments] = useState<PromptSegment[]>(initialSegments);

  useEffect(() => {
    if (onChange) {
      onChange(segments);
    }
  }, [segments, onChange]);

  const handleBubbleClick = (index: number) => {
    setSegments(segments.map((seg, i) => {
      if (i === index) {
        if (seg.type === 'text') {
          return { type: 'slot', label: seg.value, default: seg.value };
        }
        if (seg.type === 'slot') {
          return { type: 'text', value: seg.label };
        }
      }
      return seg;
    }));
  }

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-slate-100 rounded-lg">
      {segments.map((segment, index) => (
        <Bubble key={index} segment={segment} onClick={() => handleBubbleClick(index)} />
      ))}
    </div>
  );
};