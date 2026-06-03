import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../hooks/useWorkbench";
import { useEvolution } from "../../hooks/useEvolution";
import { CardThumbnail } from "../molecules/CardThumbnail";
import { RarityBadge } from "../atoms/RarityBadge";
import { Button } from "../atoms/Button";
import { Sparkles, X, Send, BookUp2, Layers } from "lucide-react";
import { buildPromptString, mergePromptSegments } from "../../lib/prompt-utils";
import { PromptBubbleEditor } from "./PromptBubbleEditor";
import { ParameterEditor } from "./ParameterEditor";
import { type AlertType } from "../molecules/ConnectionAlert";
import { db } from "../../lib/db";
import { MergeStackModal } from "./MergeStackModal";
import { SlotVariablesSection } from "./SlotVariablesSection";

import type { PromptSegment } from "../../lib/db-schema";

/**
 * Props for the Workbench component.
 */
interface WorkbenchProps {
  /** Callback triggered when a variation minting starts */
  onStartVariationMinting?: (base: any) => void;
  /** Callback to add log messages */
  addLog?: (msg: string) => void;
  /** Callback to set system alert type */
  setAlertType: (type: AlertType | null) => void;
}

/**
 * Workbench component acts as the main sandbox where users can blend multiple style cards,
 * evolve rare cards, fill slot variables, and inject prompts directly into Midjourney.
 */
export const Workbench: React.FC<WorkbenchProps> = ({ onStartVariationMinting, addLog, setAlertType }) => {
  const { workbenchCards, handCards, toggleCardSelection, clearWorkbench } = useWorkbench();
  const { canEvolve, evolveCard } = useEvolution();

  const [editedSegments, setEditedSegments] = useState<PromptSegment[]>([]);
  const [editedParams, setEditedParams] = useState<any>({});
  const [isInjecting, setIsInjecting] = useState(false);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [slotHistory, setSlotHistory] = useState<Record<string, string[]>>({});


  const isEvolutionMode = workbenchCards.length === 1;
  const isMixingMode = workbenchCards.length >= 2;
  const targetCard = workbenchCards[0];
  const canEvolveTarget = targetCard && canEvolve(targetCard);

  const workbenchCardsDependency = workbenchCards.map(c => `${c.id}-${c.updatedAt || 0}`).join(",");

  // Load slot history from localStorage
  const loadSlotHistory = () => {
    try {
      const stored = localStorage.getItem("style_atelier_slot_history");
      if (stored) {
        setSlotHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load slot history:", e);
    }
  };

  useEffect(() => {
    loadSlotHistory();
  }, []);


  // Check connection on mount
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    let timerId: any = null;
    let isCancelled = false;

    const checkConnection = async () => {
      if (isCancelled) return;
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        if (isCancelled) return;
        if (!activeTab) {
          addLog?.("Check Connection: No active tab returned from query.");
          return;
        }
        if (!activeTab.id) {
          addLog?.(`Check Connection: Active tab has no ID. URL: ${activeTab.url}`);
          return;
        }

        // If the tab is still loading, wait and retry
        if (activeTab.status !== "complete") {
          addLog?.(`Check Connection: Tab is still loading (status: ${activeTab.status}). Retrying in 1s...`);
          timerId = setTimeout(checkConnection, 1000);
          return;
        }

        addLog?.(`Checking connection to Tab ${activeTab.id} (${activeTab.url})...`);
        // Simple PING to check if content script is alive
        const response = await chrome.tabs.sendMessage(activeTab.id, { type: "PING" });
        if (isCancelled) return;
        addLog?.(`Check Connection: Success! Ping response: ${JSON.stringify(response)}`);
        setAlertType(null);
      } catch (err: any) {
        if (isCancelled) return;
        console.log("Connection check failed:", err);
        addLog?.(`Connection check failed (attempt ${retryCount + 1}/${maxRetries}): ${err?.message || JSON.stringify(err)}`);
        
        if (retryCount < maxRetries) {
          retryCount++;
          timerId = setTimeout(checkConnection, 1500); // Wait 1.5s and retry
        } else {
          setAlertType("disconnected");
        }
      }
    };

    checkConnection();

    return () => {
      isCancelled = true;
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [workbenchCardsDependency]);

  // Load segments, parameters, and initialize slotValues when workbenchCards changes
  useEffect(() => {
    if (workbenchCards.length === 0) {
      setEditedSegments([]);
      setEditedParams({});
      setSlotValues({});
      return;
    }

    let nextSegments: PromptSegment[] = [];
    let nextParams: any = {};

    if (workbenchCards.length === 1) {
      const target = workbenchCards[0];
      nextSegments = target.promptSegments || [];
      nextParams = target.parameters || {};
    } else {
      const allSegments = workbenchCards.flatMap(p => p.promptSegments || []);
      nextSegments = mergePromptSegments(allSegments);
      
      const mainParent = workbenchCards[0];
      nextParams = { ...mainParent.parameters };
      workbenchCards.slice(1).forEach(parent => {
        if (parent.parameters?.sref) {
          const combinedSref = [...(parent.parameters.sref || []), ...(nextParams.sref || [])];
          nextParams.sref = Array.from(new Set(combinedSref)).slice(0, 5);
        }
        if (parent.parameters?.cref) {
          const combinedCref = [...(parent.parameters.cref || []), ...(nextParams.cref || [])];
          nextParams.cref = Array.from(new Set(combinedCref)).slice(0, 5);
        }
        if (parent.parameters?.imagePrompts) {
          const combinedIP = [...(parent.parameters.imagePrompts || []), ...(nextParams.imagePrompts || [])];
          nextParams.imagePrompts = Array.from(new Set(combinedIP)).slice(0, 5);
        }
      });
    }

    setEditedSegments(nextSegments);
    setEditedParams(nextParams);

    // Initialize slotValues based on nextSegments
    const initialSlotValues: Record<string, string> = {};
    nextSegments.forEach(seg => {
      if (seg.type === "slot") {
        initialSlotValues[seg.label] = seg.default || "";
      }
    });
    setSlotValues(initialSlotValues);
  }, [workbenchCardsDependency]);

  const handleSlotValueChange = (label: string, value: string) => {
    setSlotValues(prev => ({
      ...prev,
      [label]: value
    }));
  };

  const handleSendToWorkbench = async (value: string, label: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    try {
      const newCard = {
        id: crypto.randomUUID(),
        name: trimmed,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptSegments: [{ type: "text" as const, value: trimmed }],
        parameters: {},
        masking: { isSrefHidden: false, isPHidden: false },
        tier: "Common" as const,
        isFavorite: false,
        isPinned: true,
        usageCount: 0,
        tags: [label.toLowerCase()],
        dominantColor: "#cbd5e1",
        thumbnailData: "",
        frameId: "default",
        genealogy: {
          generation: 1,
          parentIds: [],
        },
        isVariable: true,
        associatedJobIds: [],
      };

      await db.styleCards.add(newCard);
      addLog?.(`Sent "${trimmed}" to Workbench under tag "${label}"`);
    } catch (err) {
      console.error("Failed to send card to Workbench:", err);
    }
  };

  const handleInjectPrompt = async () => {
    if (workbenchCards.length === 0) return;
    setIsInjecting(true);
    setAlertType(null);

    // Replace slot segments with their filled variable values
    const resolvedSegments = editedSegments.map(seg => {
      if (seg.type === "slot") {
        return {
          type: "text" as const,
          value: slotValues[seg.label] || seg.default || seg.label
        };
      }
      return seg;
    });

    const fullPrompt = buildPromptString(resolvedSegments, editedParams);

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab?.id) {
        throw new Error("No active tab found");
      }

      const response = await chrome.tabs.sendMessage(activeTab.id, {
        type: "INJECT_PROMPT",
        prompt: fullPrompt,
      });

      if (response && response.status === "error") {
        if (response.message && response.message.includes("Could not find chat input")) {
          setAlertType("no_input");
        } else {
          setAlertType("disconnected");
        }
      } else {
        addLog?.(`Prompt injected successfully!`);

        // Increment usage count for all cards in the Workbench
        workbenchCards.forEach((card) => {
          db.styleCards.update(card.id, { usageCount: (card.usageCount || 0) + 1 })
            .catch(err => console.error("Failed to update usage count on workbench inject:", err));
        });

        // Save slot values to history on success
        const existing = localStorage.getItem("style_atelier_slot_history");
        const history: Record<string, string[]> = existing ? JSON.parse(existing) : {};

        Object.entries(slotValues).forEach(([lbl, val]) => {
          const trimmedVal = val.trim();
          if (!trimmedVal) return;
          if (!history[lbl]) {
            history[lbl] = [];
          }
          history[lbl] = [trimmedVal, ...history[lbl].filter(v => v !== trimmedVal)].slice(0, 10);
        });

        localStorage.setItem("style_atelier_slot_history", JSON.stringify(history));
        loadSlotHistory();
      }
    } catch (err) {
      console.error("Injection failed:", err);
      setAlertType("disconnected");
    } finally {
      setIsInjecting(false);
    }
  };



  // Extract slots
  const slots = editedSegments.filter((seg): seg is { type: "slot"; label: string; default: string } => seg.type === "slot");

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <BookUp2 className="w-5 h-5 text-blue-500" />
          Workbench
        </h2>
        <div className="flex gap-2">
          {workbenchCards.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearWorkbench} className="text-slate-400 hover:text-slate-600">
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200 min-h-[160px]">
        {workbenchCards.map((card) => (
          <div key={card.id} className="relative group animate-in zoom-in-95 duration-200">
            <CardThumbnail imageUrl={card.thumbnailData} thumbnailImages={card.selectedThumbnails} alt={card.name} tier={card.tier} className="w-full aspect-square" />
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
            Add style cards to Workbench from Library
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

              {/* Slot Variables Section */}
              <SlotVariablesSection
                slots={slots}
                slotValues={slotValues}
                onSlotValueChange={handleSlotValueChange}
                slotHistory={slotHistory}
                handCards={handCards}
                onSendToWorkbench={handleSendToWorkbench}
              />

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
                disabled={isInjecting}
              >
                <Send className="w-4 h-4 mr-2" />
                {isInjecting ? "Injecting..." : "Try on Midjourney"}
              </Button>
            </div>
          </div>
        )}

        {!isEvolutionMode && !isMixingMode && (
          <div className="flex flex-col items-center justify-center py-10 px-6 bg-slate-50/50 rounded-xl border border-slate-200 border-dashed backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400 animate-pulse">
              <Layers className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Workbench は空です</h3>
            <p className="text-xs text-slate-500 max-w-[280px] leading-relaxed mb-6 text-center">
              Libraryタブからスタイルカードをピン留めして、スタイルの調合やカードの進化を開始しましょう。
            </p>

            <div className="w-full max-w-xs space-y-4 text-left border-t border-slate-200/60 pt-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">使い方ガイド</h4>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                  1
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-700">スタイルをピン留め</h5>
                  <p className="text-[10px] text-slate-500">Libraryからお気に入りのスタイルをWorkbenchへ送ります。</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center text-[10px] font-bold">
                  2
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-700">プロンプトを調合 / カードを進化</h5>
                  <p className="text-[10px] text-slate-500">2枚以上でブレンド、1枚ならプロンプトの調整や、使用回数に応じた進化が可能です。</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                  3
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-700">Midjourneyで生成</h5>
                  <p className="text-[10px] text-slate-500">「Try on Midjourney」ボタンでプロンプトをチャットへ直接送信します。</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};