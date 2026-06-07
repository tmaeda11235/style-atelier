import React, { createContext, useContext, useRef, useState } from "react"

import { ConfirmationDialog } from "../components/molecules/ConfirmationDialog"

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "primary" | "danger"
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({ message: "" })
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = (opt: ConfirmOptions) => {
    setOptions(opt)
    setIsOpen(true)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }

  const handleConfirm = () => {
    setIsOpen(false)
    if (resolveRef.current) {
      resolveRef.current(true)
      resolveRef.current = null
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
    if (resolveRef.current) {
      resolveRef.current(false)
      resolveRef.current = null
    }
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmationDialog
        isOpen={isOpen}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        variant={options.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider")
  }
  return context.confirm
}
