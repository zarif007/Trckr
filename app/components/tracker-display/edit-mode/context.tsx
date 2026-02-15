'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { TrackerDisplayProps } from '../types'

export interface EditModeContextValue {
  /** Whether layout editing is active. */
  editMode: boolean
  /** Current schema (only set when editMode is true). Used to produce updated schema on change. */
  schema: TrackerDisplayProps | undefined
  /** Call with full updated schema when user adds/removes/reorders. */
  onSchemaChange: ((schema: TrackerDisplayProps) => void) | undefined
}

const EditModeContext = createContext<EditModeContextValue>({
  editMode: false,
  schema: undefined,
  onSchemaChange: undefined,
})

export interface EditModeProviderProps {
  editMode: boolean
  schema: TrackerDisplayProps | undefined
  onSchemaChange: ((schema: TrackerDisplayProps) => void) | undefined
  children: ReactNode
}

/** Provides edit mode state to grid components. Wrap tracker content when editMode is used. */
export function EditModeProvider({
  editMode,
  schema,
  onSchemaChange,
  children,
}: EditModeProviderProps) {
  const value = useMemo<EditModeContextValue>(
    () => ({ editMode: !!editMode, schema, onSchemaChange }),
    [editMode, schema, onSchemaChange]
  )
  return (
    <EditModeContext.Provider value={value}>
      {children}
    </EditModeContext.Provider>
  )
}

export function useEditMode(): EditModeContextValue {
  return useContext(EditModeContext)
}

/** True when edit mode is active and schema/onSchemaChange are available. */
export function useCanEditLayout(): boolean {
  const { editMode, schema, onSchemaChange } = useEditMode()
  return editMode === true && !!schema && !!onSchemaChange
}
