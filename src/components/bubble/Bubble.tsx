import React from 'react';
import type { PromptSegment } from '../../lib/db-schema';
import { cn } from '../../lib/utils';
import { RARITY_CONFIG, RarityTier } from '../../lib/rarity-config';

interface BubbleProps {
  segment: PromptSegment;
  onClick: () => void;
  tier?: RarityTier;
}

export const Bubble: React.FC<BubbleProps> = ({ segment, onClick, tier }) => {
  const rarityConfig = tier ? RARITY_CONFIG[tier] : null;

  const bubbleClasses = cn(
    'px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors flex items-center gap-2 border-2',
    {
      'bg-slate-200 text-slate-800 hover:bg-slate-300 border-transparent': segment.type === 'text' && !rarityConfig,
      'bg-blue-200 text-blue-800 hover:bg-blue-300 border-transparent': segment.type === 'slot' && !rarityConfig,
      'bg-green-200 text-green-800 hover:bg-green-300 border-transparent': segment.type === 'chip' && !rarityConfig,
      [rarityConfig?.borderClass || '']: !!rarityConfig,
      [rarityConfig?.glowClass || '']: !!rarityConfig,
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