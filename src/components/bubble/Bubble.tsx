import React from 'react';
import type { PromptSegment } from '../../lib/db-schema';
import { cn } from '../../lib/utils';

interface BubbleProps {
  segment: PromptSegment;
  onClick: () => void;
}

export const Bubble: React.FC<BubbleProps> = ({ segment, onClick }) => {
  const bubbleClasses = cn(
    'px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors flex items-center gap-2',
    {
      'bg-slate-200 text-slate-800 hover:bg-slate-300': segment.type === 'text',
      'bg-blue-200 text-blue-800 hover:bg-blue-300': segment.type === 'slot',
      'bg-green-200 text-green-800 hover:bg-green-300': segment.type === 'chip',
    }
  );

  const renderContent = () => {
    switch (segment.type) {
      case 'text':
        return <span>{segment.value}</span>;
      case 'slot':
        return (
          <>
            <span>{segment.label}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded-full">Slot</span>
          </>
        );
      case 'chip':
        return (
          <>
            <span>{segment.kind}</span>
            <span className="text-xs bg-green-100 text-green-700 px-1 rounded-full">Chip</span>
          </>
        );
    }
  }

  return (
    <div className={bubbleClasses} onClick={onClick}>
      {renderContent()}
    </div>
  );
};