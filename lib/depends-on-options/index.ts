/**
 * Depends On options: Shared-tab section and Rules grid for configuring
 * conditional field behavior (hide/require/disable/set). Field options
 * come from dynamic-options (by function id).
 *
 * Import from @/lib/depends-on-options.
 */

export { SHARED_TAB_ID, DEPENDS_ON_OPTIONS_SECTION_ID, DEPENDS_ON_RULES_GRID } from './constants'
export type { DependsOnOptionGridsInput, DependsOnOptionGridsResult } from './types'
export { ensureDependsOnOptionGrids } from './ensure-grids'
export { rulesGridRowsToDependsOn } from './rules-to-depends-on'
