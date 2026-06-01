import React, { useEffect, useRef } from "react";
import { Pin } from "lucide-react";
import { Button } from "../atoms/Button";
import { buildPromptString } from "../../lib/prompt-utils";
import type { StyleCard } from "../../lib/db-schema";

/**
 * Props for the SlotVariablesSection component.
 */
export interface SlotVariablesSectionProps {
  /** The list of slot variables extracted from current segments */
  slots: { label: string; default: string }[];
  /** Current values mapped by slot label */
  slotValues: Record<string, string>;
  /** Callback triggered when a slot's value changes */
  onSlotValueChange: (label: string, value: string) => void;
  /** Current historical values mapped by slot label */
  slotHistory: Record<string, string[]>;
  /** List of cards currently in the Hand for quick-filling values */
  handCards: StyleCard[];
  /** Callback triggered to pin a slot value as a new card in the Hand */
  onPinToHand: (value: string, label: string) => Promise<void>;
}

/**
 * SlotVariablesSection renders input fields for slot variables (prompts with holes),
 * allowing users to fill variables from Hand cards, see recent history, and pin values back.
 */
export const SlotVariablesSection: React.FC<SlotVariablesSectionProps> = ({
  slots,
  slotValues,
  onSlotValueChange,
  slotHistory,
  handCards,
  onPinToHand,
}) => {
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the first slot input when the slot list changes
  useEffect(() => {
    if (slots.length > 0) {
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [slots]);

  if (slots.length === 0) return null;

  return (
    <div className="bg-white p-3 border border-slate-200 rounded-lg space-y-3">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
        Slot Variables
      </h4>
      <div className="space-y-3">
        {slots.map((slot, index) => {
          const label = slot.label;
          const currentValue = slotValues[label] ?? "";
          const historyList = slotHistory[label] || [];

          return (
            <div key={`${label}-${index}`} className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                {label}
              </label>
              <div className="flex gap-2 items-center">
                <input
                  ref={index === 0 ? firstInputRef : null}
                  type="text"
                  value={currentValue}
                  onChange={(e) => onSlotValueChange(label, e.target.value)}
                  placeholder={slot.default || `Enter ${label}...`}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => onPinToHand(currentValue, label)}
                  title="Pin to Hand"
                  className="text-slate-400 hover:text-blue-500"
                >
                  <Pin className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Quick selection from Hand cards */}
              {handCards.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                  <span className="text-[10px] text-slate-400">Fill from Hand:</span>
                  {handCards.map((hc) => {
                    const resolvedText = buildPromptString(hc.promptSegments, hc.parameters);
                    return (
                      <button
                        key={hc.id}
                        type="button"
                        onClick={() => onSlotValueChange(label, resolvedText)}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition-colors"
                      >
                        {hc.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Historical Values list */}
              {historyList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                  <span className="text-[10px] text-slate-400">Recent:</span>
                  {historyList.map((val, hIdx) => (
                    <div
                      key={hIdx}
                      className="flex items-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 gap-1"
                    >
                      <button
                        type="button"
                        onClick={() => onSlotValueChange(label, val)}
                        className="text-[10px] text-slate-600 hover:text-slate-800 transition-colors"
                      >
                        {val}
                      </button>
                      <button
                        type="button"
                        onClick={() => onPinToHand(val, label)}
                        title="Pin this value to Hand"
                        className="text-slate-400 hover:text-blue-500"
                      >
                        <Pin className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
