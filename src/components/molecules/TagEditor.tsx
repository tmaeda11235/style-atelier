import React, { useState } from "react";
import { Input } from "../atoms/Input";
import { Button } from "../atoms/Button";

/**
 * Props for the TagEditor component.
 */
export interface TagEditorProps {
  /** The array of current tag strings */
  tags: string[];
  /** Callback called with the updated list of tags when a tag is added or removed */
  onChange: (updatedTags: string[]) => void;
}

/**
 * TagEditor component manages card tags, displaying current tag chips
 * with deletion buttons and an input field to add new tags.
 */
export const TagEditor: React.FC<TagEditorProps> = ({ tags, onChange }) => {
  const [newTagInput, setNewTagInput] = useState("");

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-500 mb-1">Tags</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200"
          >
            {t}
            <button
              type="button"
              onClick={() => handleRemoveTag(t)}
              className="text-slate-400 hover:text-red-500 text-[10px]"
            >
              &times;
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-xs text-slate-400 italic">No tags added yet.</span>
        )}
      </div>
      <form onSubmit={handleAddTag} className="flex gap-2">
        <Input
          type="text"
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          placeholder="Add new tag..."
          className="text-xs py-1"
        />
        <Button type="submit" size="xs" variant="secondary">
          Add
        </Button>
      </form>
    </div>
  );
};
