import type { StyleOverrides } from '@/app/components/tracker-display/types'

// ============================================================================
// Token → Tailwind class maps
// ============================================================================

const fontSizeMap: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}

/** Literal Tailwind classes for inputs (with ! so they override base styles). Used so JIT sees full class names. */
const fontSizeForInputMap: Record<string, string> = {
  xs: '!text-xs',
  sm: '!text-sm',
  base: '!text-base',
  lg: '!text-lg',
  xl: '!text-xl',
}

const fontWeightMap: Record<string, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
}

/** Literal classes for input override. */
const fontWeightForInputMap: Record<string, string> = {
  normal: '!font-normal',
  medium: '!font-medium',
  semibold: '!font-semibold',
  bold: '!font-bold',
}

/** Text (font) color for cells and inputs */
const textColorMap: Record<string, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-green-600 dark:text-green-400',
  red: 'text-red-600 dark:text-red-400',
  purple: 'text-purple-600 dark:text-purple-400',
  amber: 'text-amber-600 dark:text-amber-400',
  rose: 'text-rose-600 dark:text-rose-400',
}

/** Literal classes for input override. */
const textColorForInputMap: Record<string, string> = {
  default: '!text-foreground',
  muted: '!text-muted-foreground',
  primary: '!text-primary',
  blue: '!text-blue-600 dark:!text-blue-400',
  green: '!text-green-600 dark:!text-green-400',
  red: '!text-red-600 dark:!text-red-400',
  purple: '!text-purple-600 dark:!text-purple-400',
  amber: '!text-amber-600 dark:!text-amber-400',
  rose: '!text-rose-600 dark:!text-rose-400',
}

/** Default font size for table cells/inputs when no style override is set. Single source of truth. */
export const DEFAULT_INPUT_FONT_CLASS = 'text-[13px]'

// ============================================================================
// Density presets per component type
// ============================================================================

type ComponentType = 'table' | 'kanban' | 'div'

/** Cell padding classes per density */
const densityCellPadding: Record<string, Record<ComponentType, string>> = {
  compact: { table: 'px-2 py-1', kanban: 'p-2', div: 'p-2' },
  default: { table: 'px-4 py-2', kanban: 'p-4', div: 'p-4' },
  comfortable: { table: 'px-6 py-3', kanban: 'p-5', div: 'p-5' },
}

/** Header row height per density (table only) */
const densityHeaderHeight: Record<string, string> = {
  compact: 'h-7',
  default: 'h-9',
  comfortable: 'h-11',
}

// ============================================================================
// Accent colour maps
// ============================================================================

const accentBorderMap: Record<string, string> = {
  default: 'border-border/60',
  blue: 'border-blue-400/60',
  green: 'border-green-400/60',
  red: 'border-red-400/60',
  purple: 'border-purple-400/60',
  amber: 'border-amber-400/60',
  rose: 'border-rose-400/60',
}

/** Table/card background when accentColor is set (e.g. "add bg for table"). Strong enough to be visible in light and dark theme. */
const accentBgMap: Record<string, string> = {
  default: '',
  blue: 'bg-blue-50 dark:bg-blue-900/50',
  green: 'bg-green-50 dark:bg-green-900/50',
  red: 'bg-red-50 dark:bg-red-900/50',
  purple: 'bg-purple-50 dark:bg-purple-900/50',
  amber: 'bg-amber-50 dark:bg-amber-900/50',
  rose: 'bg-rose-50 dark:bg-rose-900/50',
}

const accentHeaderBgMap: Record<string, string> = {
  default: '',
  muted: 'bg-muted/40',
  accent: 'bg-accent/30',
  bold: 'bg-primary/10 text-primary',
}

const borderStyleMap: Record<string, string> = {
  none: 'border-0',
  default: 'border-[1.5px]',
  strong: 'border-2',
}

// ============================================================================
// Kanban-specific
// ============================================================================

const cardSizePaddingMap: Record<string, string> = {
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
}

// ============================================================================
// Resolved style classes returned to components
// ============================================================================

export interface ResolvedTableStyles {
  /** Font size class for cell text and inputs */
  fontSize: string
  /** Font weight class for cell text and inputs */
  fontWeight: string
  /** Text color class for cells and inputs */
  textColor: string
  /** Literal font size class for inputs (overrides base; use so Tailwind JIT sees full class). */
  fontSizeForInput: string
  /** Literal font weight class for inputs. */
  fontWeightForInput: string
  /** Literal text color class for inputs. */
  textColorForInput: string
  /** Cell padding class */
  cellPadding: string
  /** Header height class */
  headerHeight: string
  /** Outer border class */
  borderStyle: string
  /** Accent border colour class */
  accentBorder: string
  /** Table background class (from accentColor; use for wrapper/card bg) */
  tableBg: string
  /** Header background class */
  headerBg: string
  /** Whether to apply striped rows */
  stripedRows: boolean
  /** Header font size class */
  headerFontSize: string
}

export interface ResolvedKanbanStyles {
  fontSize: string
  fontWeight: string
  textColor: string
  cardPadding: string
  accentBorder: string
  borderStyle: string
  columnWidth: number
  /** Label font size */
  labelFontSize: string
}

export interface ResolvedDivStyles {
  fontSize: string
  fontWeight: string
  textColor: string
  fieldPadding: string
  accentBorder: string
  borderStyle: string
  /** Label font size */
  labelFontSize: string
}

// ============================================================================
// Resolver functions
// ============================================================================

/** Resolve semantic style tokens into Tailwind classes for a table view. */
export function resolveTableStyles(
  overrides?: StyleOverrides,
): ResolvedTableStyles {
  const o = overrides ?? {}
  const density = o.density ?? 'default'

  const fontSizeKey = o.fontSize ?? 'sm'
  const fontWeightKey = o.fontWeight ?? 'normal'
  const textColorKey = o.textColor ?? 'default'
  return {
    fontSize: fontSizeMap[fontSizeKey] ?? 'text-sm',
    fontWeight: fontWeightMap[fontWeightKey] ?? '',
    textColor: textColorMap[textColorKey] ?? textColorMap.default,
    fontSizeForInput: fontSizeForInputMap[fontSizeKey] ?? '!text-sm',
    fontWeightForInput: fontWeightForInputMap[fontWeightKey] ?? '!font-normal',
    textColorForInput: textColorForInputMap[textColorKey] ?? '!text-foreground',
    cellPadding:
      densityCellPadding[density]?.table ?? densityCellPadding.default.table,
    headerHeight:
      densityHeaderHeight[density] ?? densityHeaderHeight.default,
    borderStyle:
      borderStyleMap[o.borderStyle ?? 'default'] ?? borderStyleMap.default,
    accentBorder:
      accentBorderMap[o.accentColor ?? 'default'] ?? accentBorderMap.default,
    tableBg:
      accentBgMap[o.accentColor ?? 'default'] ?? accentBgMap.default,
    headerBg:
      accentHeaderBgMap[o.headerStyle ?? 'default'] ?? '',
    stripedRows: o.stripedRows ?? false,
    headerFontSize: fontSizeMap[fontSizeKey] ?? 'text-sm',
  }
}

/** Resolve semantic style tokens into Tailwind classes for a kanban view. */
export function resolveKanbanStyles(
  overrides?: StyleOverrides,
): ResolvedKanbanStyles {
  const o = overrides ?? {}
  const density = o.density ?? 'default'
  const cardSize = o.cardSize ?? 'md'

  return {
    fontSize: fontSizeMap[o.fontSize ?? 'sm'] ?? 'text-sm',
    fontWeight: fontWeightMap[o.fontWeight ?? 'normal'] ?? '',
    textColor: textColorMap[o.textColor ?? 'default'] ?? textColorMap.default,
    cardPadding:
      cardSizePaddingMap[cardSize] ?? cardSizePaddingMap.md,
    accentBorder:
      accentBorderMap[o.accentColor ?? 'default'] ?? accentBorderMap.default,
    borderStyle:
      borderStyleMap[o.borderStyle ?? 'default'] ?? borderStyleMap.default,
    columnWidth: o.columnWidth ?? 320,
    labelFontSize: fontSizeMap[o.fontSize ?? 'xs'] ?? 'text-xs',
  }
}

/** Resolve semantic style tokens into Tailwind classes for a div (form) view. */
export function resolveDivStyles(
  overrides?: StyleOverrides,
): ResolvedDivStyles {
  const o = overrides ?? {}
  const density = o.density ?? 'default'

  return {
    fontSize: fontSizeMap[o.fontSize ?? 'sm'] ?? 'text-sm',
    fontWeight: fontWeightMap[o.fontWeight ?? 'normal'] ?? '',
    textColor: textColorMap[o.textColor ?? 'default'] ?? textColorMap.default,
    fieldPadding:
      densityCellPadding[density]?.div ?? densityCellPadding.default.div,
    accentBorder:
      accentBorderMap[o.accentColor ?? 'default'] ?? accentBorderMap.default,
    borderStyle:
      borderStyleMap[o.borderStyle ?? 'default'] ?? borderStyleMap.default,
    labelFontSize: fontSizeMap[o.fontSize ?? 'sm'] ?? 'text-sm',
  }
}
