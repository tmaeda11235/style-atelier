
import React from 'react';
import type { BubbleData } from '../../lib/prompt-utils';
import { cn } from '../../lib/utils';

interface BubbleProps {
  bubble: BubbleData;
  onClick: () => void;
}

export const Bubble: React.FC<BubbleProps> = ({ bubble, onClick }) => {
  const bubbleClasses = cn(
    'px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors flex items-center gap-2',
    {
      'bg-slate-200 text-slate-800 hover:bg-slate-300': bubble.type === 'fixed',
      'bg-blue-200 text-blue-800 hover:bg-blue-300': bubble.type === 'slot',
    }
  );

  return (
    <div className={bubbleClasses} onClick={onClick}>
      <span>{bubble.text}</span>
      {bubble.type === 'slot' && (
        <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded-full">Slot</span>
      )}
    </div>
  );
};