import React, { useState, useEffect, useRef } from "react";
import { useWorkbench } from "../../hooks/useWorkbench";
import { useEvolution } from "../../hooks/useEvolution";
import { CardThumbnail } from "../molecules/CardThumbnail";
import { RarityBadge } from "../atoms/RarityBadge";
import { Button } from "../atoms/Button";
import { Sparkles, X, Send, BookUp2, Pin, Layers } from "lucide-react";
import { buildPromptString, mergePromptSegments } from "../../lib/prompt-utils";
import { PromptBubbleEditor } from "./PromptBubbleEditor";
import { ParameterEditor } from "./ParameterEditor";
import { ConnectionAlert, type AlertType } from "../molecules/ConnectionAlert";
import { db } from "../../lib/db";

import type { PromptSegment } from "../../lib/db-schema";

interface WorkbenchProps {
  onStartVariationMinting?: (base: any) => void;
  addLog?: (msg: string) => void;
  setAlertType: (type: AlertType) => void;
}

export const Workbench: React.FC<WorkbenchProps> = ({ onStartVariationMinting, addLog, setAlertType }) => {
  const { workbenchCards, handCards, toggleCardSelection, clearWorkbench } = useWorkbench();
  const { canEvolve, evolveCard } = useEvolution();

  const [editedSegments, setEditedSegments] = useState<PromptSegment[]>([]);
  const [editedParams, setEditedParams] = useState<any>({});
  const [isInjecting, setIsInjecting] = useState(false);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [slotHistory, setSlotHistory] = useState<Record<string, string[]>>({});
  
  // States for merging stack/cards
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [baseCardId, setBaseCardId] = useState<string>("");
  const [consumeStates, setConsumeStates] = useState<Record<string, boolean>>({});

  const firstInputRef = useRef<HTMLInputElement>(null);

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

  // Synchronize merge state when cards in workbench change
  useEffect(() => {
    if (workbenchCards.length >= 2) {
      const currentOnWorkbench = workbenchCards.some(c => c.id === baseCardId);
      const defaultBase = currentOnWorkbench ? baseCardId : workbenchCards[0].id;
      setBaseCardId(defaultBase);

      setConsumeStates(prev => {
        const next = { ...prev };
        workbenchCards.forEach(c => {
          if (c.id === defaultBase) {
            delete next[c.id];
          } else if (next[c.id] === undefined) {
            next[c.id] = true;
          }
        });
        Object.keys(next).forEach(id => {
          if (!workbenchCards.some(c => c.id === id)) {
            delete next[id];
          }
        });
        return next;
      });
    } else {
      setBaseCardId("");
      setConsumeStates({});
    }
  }, [workbenchCardsDependency, baseCardId]);

  // Check connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        if (!activeTab?.id) return;

        // Simple PING to check if content script is alive
        await chrome.tabs.sendMessage(activeTab.id, { type: "PING" });
        setAlertType(null);
      } catch (err) {
        console.log("Connection check failed:", err);
        setAlertType("disconnected");
      }
    };

    checkConnection();
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

  // Auto-focus the first slot input
  useEffect(() => {
    const hasSlots = editedSegments.some(seg => seg.type === "slot");
    if (hasSlots) {
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [workbenchCardsDependency, editedSegments]);

  const handleSlotValueChange = (label: string, value: string) => {
    setSlotValues(prev => ({
      ...prev,
      [label]: value
    }));
  };

  const handlePinToHand = async (value: string, label: string) => {
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
      };

      await db.styleCards.add(newCard);
      addLog?.(`Pinned "${trimmed}" to Hand under tag "${label}"`);
    } catch (err) {
      console.error("Failed to pin card to Hand:", err);
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

  const handleSelectBaseCard = (cardId: string) => {
    setBaseCardId(cardId);
    setConsumeStates(prev => {
      const next = { ...prev };
      delete next[cardId];
      workbenchCards.forEach(c => {
        if (c.id !== cardId && next[c.id] === undefined) {
          next[c.id] = true;
        }
      });
      return next;
    });
  };

  const handleExecuteMerge = async () => {
    if (!baseCardId) return;
    const representative = workbenchCards.find(c => c.id === baseCardId);
    if (!representative) return;

    const materials = workbenchCards.filter(c => c.id !== baseCardId);
    const additionalUses = materials
      .filter(c => consumeStates[c.id])
      .reduce((sum, c) => sum + (c.usageCount || 0), 0);

    try {
      await db.transaction("rw", db.styleCards, async () => {
        const mergedImages = [...(representative.images || [])];
        if (representative.thumbnailData && !mergedImages.includes(representative.thumbnailData)) {
          mergedImages.push(representative.thumbnailData);
        }

        const mergedJobIds = [...(representative.associatedJobIds || [])];
        if (representative.jobId && !mergedJobIds.includes(representative.jobId)) {
          mergedJobIds.push(representative.jobId);
        }

        let extraUsageCount = 0;

        for (const mat of materials) {
          if (mat.images && mat.images.length > 0) {
            mat.images.forEach(img => {
              if (!mergedImages.includes(img)) mergedImages.push(img);
            });
          } else if (mat.thumbnailData && !mergedImages.includes(mat.thumbnailData)) {
            mergedImages.push(mat.thumbnailData);
          }

          if (mat.jobId && !mergedJobIds.includes(mat.jobId)) {
            mergedJobIds.push(mat.jobId);
          }
          if (mat.associatedJobIds && mat.associatedJobIds.length > 0) {
            mat.associatedJobIds.forEach(jid => {
              if (!mergedJobIds.includes(jid)) mergedJobIds.push(jid);
            });
          }

          const isConsumed = consumeStates[mat.id];
          if (isConsumed) {
            extraUsageCount += (mat.usageCount || 0);
            await db.styleCards.delete(mat.id);
          }
        }

        await db.styleCards.update(representative.id, {
          images: mergedImages,
          associatedJobIds: mergedJobIds,
          usageCount: (representative.usageCount || 0) + extraUsageCount,
          updatedAt: Date.now()
        });
      });

      addLog?.(`Fused cards into "${representative.name}". New usage count: ${(representative.usageCount || 0) + additionalUses}`);
      clearWorkbench();
      setIsMergeOpen(false);
    } catch (err) {
      console.error("Failed to merge style cards:", err);
      addLog?.("Error: Failed to merge style cards.");
    }
  };

  const baseCard = workbenchCards.find(c => c.id === baseCardId);
  const additionalUses = workbenchCards
    .filter(c => c.id !== baseCardId && consumeStates[c.id])
    .reduce((sum, c) => sum + (c.usageCount || 0), 0);
  const previewUsageCount = (baseCard?.usageCount || 0) + additionalUses;

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
          {workbenchCards.length >= 2 && (
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setIsMergeOpen(true)}
              className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-bold"
            >
              <Layers className="w-3.5 h-3.5" />
              Merge Stack
            </Button>
          )}
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

              {/* Slot Variables Inputs */}
              {slots.length > 0 && (
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
                              onChange={(e) => handleSlotValueChange(label, e.target.value)}
                              placeholder={slot.default || `Enter ${label}...`}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => handlePinToHand(currentValue, label)}
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
                                    onClick={() => handleSlotValueChange(label, resolvedText)}
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
                                <div key={hIdx} className="flex items-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSlotValueChange(label, val)}
                                    className="text-[10px] text-slate-600 hover:text-slate-800 transition-colors"
                                  >
                                    {val}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePinToHand(val, label)}
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
              )}

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
          <div className="text-center py-12 px-6 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
            <BookUp2 className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400 mb-1">Workbench is Empty</p>
            <p className="text-xs text-slate-300">Select cards from your Hand below.</p>
          </div>
        )}
      </div>

      {isMergeOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-500" />
                Merge Card Stack
              </h3>
              <Button variant="ghost" size="xs" onClick={() => setIsMergeOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Select one card to keep as the base recipe. Choose whether to consume the other cards to inherit their usage counts.
              </p>
              
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Representative Card (Choose 1)</h4>
                <div className="space-y-2">
                  {workbenchCards.map(c => {
                    const isBase = c.id === baseCardId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectBaseCard(c.id)}
                        className={`flex items-center gap-3 p-2 rounded-xl border-2 transition-all cursor-pointer ${
                          isBase 
                            ? "border-blue-500 bg-blue-50/50 shadow-sm" 
                            : "border-slate-100 hover:border-slate-200 bg-slate-50/30"
                        }`}
                      >
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border bg-white">
                          <img src={c.thumbnailData || "assets/icon.png"} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400">Uses: {c.usageCount || 0}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isBase ? "border-blue-500 bg-blue-500" : "border-slate-300 bg-white"}`}>
                          {isBase && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {workbenchCards.length > 1 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Material Cards Integration</h4>
                  <div className="space-y-2">
                    {workbenchCards.filter(c => c.id !== baseCardId).map(c => {
                      const isConsumed = consumeStates[c.id] ?? true;
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/20 gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border bg-white">
                              <img src={c.thumbnailData || "assets/icon.png"} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-600 truncate">{c.name}</p>
                              <p className="text-[9px] text-slate-400">Uses to transfer: {c.usageCount || 0}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setConsumeStates(prev => ({ ...prev, [c.id]: !isConsumed }))}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all border ${
                                isConsumed 
                                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" 
                                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {isConsumed ? "Consume" : "Keep"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {baseCard && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Base Card:</span>
                    <span className="font-semibold truncate max-w-[150px]">{baseCard.name}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Combined Images:</span>
                    <span className="font-semibold font-mono">
                      {workbenchCards.reduce((acc, c) => {
                        const urls = [...(c.images || [])];
                        if (c.thumbnailData) urls.push(c.thumbnailData);
                        urls.forEach(u => acc.add(u));
                        return acc;
                      }, new Set<string>()).size} images
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200 text-slate-700">
                    <span className="font-medium">Preview Usage Count:</span>
                    <div className="flex items-center gap-1 font-bold text-blue-600">
                      <span>{baseCard.usageCount || 0}</span>
                      {additionalUses > 0 && (
                        <>
                          <span className="text-[10px] text-slate-400 font-normal">+{additionalUses}</span>
                          <span>&rarr; {previewUsageCount}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsMergeOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleExecuteMerge}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 shadow-sm shadow-blue-200"
              >
                Merge Stack
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};