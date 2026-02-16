/**
 * Layout primitives: tokens, section bar, block wrapper, inline editable name.
 * Reusable across tracker display (edit and view mode).
 */

export * from './layout-tokens'
export { SectionBar } from './SectionBar'
export type { SectionBarProps } from './SectionBar'
export { ViewBlockWrapper } from './ViewBlockWrapper'
export { InlineEditableName } from './InlineEditableName'
export type { InlineEditableNameProps } from './InlineEditableName'
export { LabelWithBlockControls } from './LabelWithBlockControls'
export type { LabelWithBlockControlsProps } from './LabelWithBlockControls'
export { BlockControlsProvider, useBlockControls } from './block-controls-context'
export type { BlockControlsValue } from './block-controls-context'
