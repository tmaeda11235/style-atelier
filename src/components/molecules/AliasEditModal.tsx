import { Edit3, X } from "lucide-react"
import React, { useState } from "react"

import type { ParameterAlias, ParameterFolder } from "../../lib/db-schema"

interface AliasEditModalProps {
  editingValue: string
  onClose: () => void
  typeAliases: ParameterAlias[]
  parameterType: "p" | "sref" | "cref" | "imagePrompts"
  folders: ParameterFolder[]
  addFolder: (
    folder: Omit<ParameterFolder, "id" | "createdAt"> & { id?: string }
  ) => Promise<string>
  saveAlias: (
    alias: Omit<ParameterAlias, "id" | "createdAt" | "updatedAt"> & {
      id?: string
    }
  ) => Promise<void>
  deleteAlias: (id: string) => Promise<void>
}

const ModalHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
      Edit Parameter Alias
    </h4>
    <button
      onClick={onClose}
      className="text-slate-400 hover:text-slate-600"
      type="button">
      <X className="w-4 h-4" />
    </button>
  </div>
)

interface FolderSelectProps {
  folders: ParameterFolder[]
  selectedFolderId: string | undefined
  setSelectedFolderId: (id: string | undefined) => void
  newFolderNameInput: string
  setNewFolderNameInput: (name: string) => void
}

const FolderSelect: React.FC<FolderSelectProps> = ({
  folders,
  selectedFolderId,
  setSelectedFolderId,
  newFolderNameInput,
  setNewFolderNameInput
}) => {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFolderId(e.target.value || undefined)
    if (e.target.value !== "__new__") {
      setNewFolderNameInput("")
    }
  }

  return (
    <div className="space-y-1">
      <label className="text-[9px] font-bold text-slate-400 uppercase">
        Folder / Category
      </label>
      <select
        value={selectedFolderId || ""}
        onChange={handleSelectChange}
        className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white font-semibold">
        <option value="">(No Folder)</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
        <option value="__new__">+ Create New Folder...</option>
      </select>
      {selectedFolderId === "__new__" && (
        <input
          type="text"
          value={newFolderNameInput}
          onChange={(e) => setNewFolderNameInput(e.target.value)}
          placeholder="Enter new folder name"
          className="w-full text-xs border border-slate-200 rounded p-1.5 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
        />
      )}
    </div>
  )
}

interface AliasEditFormProps {
  editingValue: string
  aliasNameInput: string
  setAliasNameInput: (val: string) => void
  folders: ParameterFolder[]
  selectedFolderId: string | undefined
  setSelectedFolderId: (id: string | undefined) => void
  newFolderNameInput: string
  setNewFolderNameInput: (name: string) => void
}

const AliasEditForm: React.FC<AliasEditFormProps> = ({
  editingValue,
  aliasNameInput,
  setAliasNameInput,
  folders,
  selectedFolderId,
  setSelectedFolderId,
  newFolderNameInput,
  setNewFolderNameInput
}) => {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-400 uppercase">
          Parameter Value
        </label>
        <div className="text-xs font-mono text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 truncate">
          {editingValue}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-400 uppercase">
          Alias Name
        </label>
        <input
          type="text"
          value={aliasNameInput}
          onChange={(e) => setAliasNameInput(e.target.value)}
          placeholder="My Custom Style"
          className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
        />
      </div>

      <FolderSelect
        folders={folders}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={setSelectedFolderId}
        newFolderNameInput={newFolderNameInput}
        setNewFolderNameInput={setNewFolderNameInput}
      />
    </div>
  )
}

interface ModalActionsProps {
  onDelete: () => void
  onSave: () => void
}

const ModalActions: React.FC<ModalActionsProps> = ({ onDelete, onSave }) => (
  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
    <button
      onClick={onDelete}
      className="px-2.5 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50 rounded-md border border-red-100 transition-colors"
      type="button">
      Delete
    </button>
    <button
      onClick={onSave}
      className="px-3 py-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
      type="button">
      Save
    </button>
  </div>
)

const useAliasEdit = (props: AliasEditModalProps) => {
  const {
    editingValue,
    typeAliases,
    addFolder,
    saveAlias,
    deleteAlias,
    onClose,
    parameterType
  } = props
  const existing = typeAliases.find((a) => a.value === editingValue)

  const [aliasNameInput, setAliasNameInput] = useState(
    existing ? existing.alias || (existing as any).name : ""
  )
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(
    existing ? existing.folderId : undefined
  )
  const [newFolderNameInput, setNewFolderNameInput] = useState("")

  const handleDelete = async () => {
    if (existing) await deleteAlias(existing.id)
    onClose()
  }

  const handleSave = async () => {
    let folderId = selectedFolderId
    if (selectedFolderId === "__new__" && newFolderNameInput.trim()) {
      folderId = await addFolder({ name: newFolderNameInput.trim() })
    }
    await saveAlias({
      id: existing?.id,
      alias: aliasNameInput.trim() || editingValue,
      value: editingValue,
      paramType: parameterType as any,
      folderId: folderId === "__new__" ? undefined : folderId
    })
    onClose()
  }

  return {
    aliasNameInput,
    setAliasNameInput,
    selectedFolderId,
    setSelectedFolderId,
    newFolderNameInput,
    setNewFolderNameInput,
    handleDelete,
    handleSave
  }
}

export const AliasEditModal: React.FC<AliasEditModalProps> = (props) => {
  const { editingValue, onClose, folders } = props
  const {
    aliasNameInput,
    setAliasNameInput,
    selectedFolderId,
    setSelectedFolderId,
    newFolderNameInput,
    setNewFolderNameInput,
    handleDelete,
    handleSave
  } = useAliasEdit(props)

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-xl p-4 w-80 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-slate-700">
        <ModalHeader onClose={onClose} />
        <AliasEditForm
          editingValue={editingValue}
          aliasNameInput={aliasNameInput}
          setAliasNameInput={setAliasNameInput}
          folders={folders}
          selectedFolderId={selectedFolderId}
          setSelectedFolderId={setSelectedFolderId}
          newFolderNameInput={newFolderNameInput}
          setNewFolderNameInput={setNewFolderNameInput}
        />
        <ModalActions onDelete={handleDelete} onSave={handleSave} />
      </div>
    </div>
  )
}
