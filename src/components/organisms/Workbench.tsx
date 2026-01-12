import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../hooks/useWorkbench";
import { useEvolution } from "../../hooks/useEvolution";
import { CardThumbnail } from "../molecules/CardThumbnail";
import { RarityBadge } from "../atoms/RarityBadge";
import { Button } from "../atoms/Button";
import { Sparkles, FlaskConical, X, Send } from "lucide-react";
import { buildPromptString, mergePromptSegments } from "../../lib/prompt-utils";
import { PromptBubbleEditor } from "./PromptBubbleEditor";
import { ParameterEditor } from "./ParameterEditor";
import type { PromptSegment } from "../../lib/db-schema";

export const Workbench: React.FC = () => {
  const { workbenchCards, toggleCardSelection, clearWorkbench } = useWorkbench();
  const { canEvolve, evolveCard } = useEvolution();
  
  const [editedSegments, setEditedSegments] = useState<PromptSegment[]>([]);
  const [editedParams, setEditedParams] = useState<any>({});

  const isEvolutionMode = workbenchCards.length === 1;
  const isMixingMode = workbenchCards.length >= 2;
  const targetCard = workbenchCards[0];
  const canEvolveTarget = targetCard && canEvolve(targetCard);

  useEffect(() => {
    if (isMixingMode) {
      const allSegments = workbenchCards.flatMap((c) => c.promptSegments);
      const merged = mergePromptSegments(allSegments);
      setEditedSegments(merged);

      const mergedParams: any = { ...workbenchCards[0].parameters };
      workbenchCards.slice(1).forEach((parent) => {
        if (parent.parameters.sref) {
          const srefArray = Array.isArray(parent.parameters.sref) ? parent.parameters.sref : [parent.parameters.sref]
          mergedParams.sref = Array.from(new Set([...(mergedParams.sref || []), ...srefArray]))
        }
        if (parent.parameters.p) {
          const pArray = Array.isArray(parent.parameters.p) ? parent.parameters.p : [parent.parameters.p]
          mergedParams.p = Array.from(new Set([...(mergedParams.p || []), ...pArray]))
        }
      });

      setEditedParams(mergedParams);
    } else if (isEvolutionMode && targetCard) {
      setEditedSegments(targetCard.promptSegments);
      setEditedParams(targetCard.parameters);
    } else {
      setEditedSegments([]);
      setEditedParams({});
    }
  }, [workbenchCards, isMixingMode, isEvolutionMode, targetCard]);

  const handleInjectPrompt = () => {
    if (workbenchCards.length === 0) return;

    const fullPrompt = buildPromptString(editedSegments, editedParams);
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, {
          type: "INJECT_PROMPT",
          prompt: fullPrompt,
        });
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <FlaskConical className="w-5 h-5 text-blue-500" />
          Workbench
        </h2>
        {workbenchCards.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearWorkbench} className="text-slate-400 hover:text-slate-600">
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200 min-h-[160px]">
        {workbenchCards.map((card) => (
          <div key={card.id} className="relative group animate-in zoom-in-95 duration-200">
            <CardThumbnail imageUrl={card.thumbnailData} alt={card.name} tier={card.tier} className="w-full aspect-square" />
            <button
              onClick={() => toggleCardSelection(card.id)}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {workbenchCards.length < 2 && (
          <div className="border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center aspect-square text-slate-500 text-xs text-center p-2">
            Select cards from Hand
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {(isEvolutionMode || isMixingMode) && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                 <h3 className="text-sm font-bold text-slate-700">
                  {isEvolutionMode ? "Evolution" : "Variation Recipe"}
                </h3>
                {isEvolutionMode && targetCard && <RarityBadge tier={targetCard.tier} />}
              </div>

              <div className="bg-white">
                <PromptBubbleEditor
                  initialSegments={editedSegments}
                  onChange={setEditedSegments}
                  tier={isEvolutionMode ? targetCard?.tier : "Common"}
                />
              </div>

              <ParameterEditor parameters={editedParams} onChange={setEditedParams} />

              {isEvolutionMode && targetCard && (
                <div className="pt-2 border-t border-slate-100">
                   <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-slate-500">Usage Progress</span>
                    <span className="font-mono font-bold text-blue-600">{targetCard.usageCount} uses</span>
                  </div>
                  {canEvolveTarget ? (
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                      onClick={() => evolveCard(targetCard.id)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" /> Evolve to Next Tier
                    </Button>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic text-center">
                      Need more uses to evolve this card
                    </p>
                  )}
                </div>
              )}

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"
                onClick={handleInjectPrompt}
              >
                <Send className="w-4 h-4 mr-2" />
                Try on Midjourney
              </Button>
            </div>
          </div>
        )}

        {!isEvolutionMode && !isMixingMode && (
          <div className="text-center py-12 px-6 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
            <FlaskConical className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400 mb-1">Workbench is Empty</p>
            <p className="text-xs text-slate-300">Select cards from your Hand below.</p>
          </div>
        )}
      </div>
    </div>
  );
};