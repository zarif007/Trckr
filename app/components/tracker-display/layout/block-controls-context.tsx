'use client'

import { createContext, useContext, type ReactNode } from 'react'

export interface BlockControlsValue {
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>
  onRemove: () => void
  onAddBlockClick?: () => void
  isSortable: boolean
  label: string
}

const BlockControlsContext = createContext<BlockControlsValue | null>(null)

export function BlockControlsProvider({
  value,
  children,
}: {
  value: BlockControlsValue
  children: ReactNode
}) {
  return (
    <BlockControlsContext.Provider value={value}>
      {children}
    </BlockControlsContext.Provider>
  )
}

export function useBlockControls(): BlockControlsValue | null {
  return useContext(BlockControlsContext)
}
