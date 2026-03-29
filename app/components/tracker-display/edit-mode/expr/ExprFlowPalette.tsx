'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  Calculator,
  CaseSensitive,
  Database,
  Divide,
  Equal,
  FunctionSquare,
  GitBranch,
  Minus,
  Plus,
  Sigma,
  Type,
  X,
  Search,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { MATH_OP_LABELS, STRING_OP_LABELS } from './ExprFlowNodes'
import type { ExprFlowOperator, LogicOp, MathOp, StringOp } from './expr-types'

interface ExprFlowPaletteProps {
  makeDragStart: (payload: object) => (event: React.DragEvent) => void
}

interface PaletteItem {
  label: string
  icon: ReactNode
  color: string
  payload: object
  category: string
  searchTerms: string[]
}

export function ExprFlowPalette({ makeDragStart }: ExprFlowPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Data', 'Operations', 'Logic', 'Math', 'String'])
  )

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const allItems: PaletteItem[] = [
    // Data
    { label: 'Field', icon: <Database className="h-3.5 w-3.5 text-blue-500" />, color: 'blue', payload: { type: 'field' }, category: 'Data', searchTerms: ['field', 'database', 'variable'] },
    { label: 'Value', icon: <Type className="h-3.5 w-3.5 text-emerald-500" />, color: 'emerald', payload: { type: 'const' }, category: 'Data', searchTerms: ['value', 'const', 'constant', 'number', 'text'] },
    { label: 'Accumulator', icon: <Sigma className="h-3.5 w-3.5 text-cyan-500" />, color: 'cyan', payload: { type: 'accumulator' }, category: 'Data', searchTerms: ['accumulator', 'sum', 'total', 'aggregate'] },
    // Logic
    { label: 'If / Then / Else', icon: <GitBranch className="h-3.5 w-3.5 text-indigo-500" />, color: 'indigo', payload: { type: 'logic', logicOp: 'if' }, category: 'Logic', searchTerms: ['if', 'then', 'else', 'conditional', 'branch'] },
    { label: 'AND', icon: <GitBranch className="h-3.5 w-3.5 text-indigo-500" />, color: 'indigo', payload: { type: 'logic', logicOp: 'and' }, category: 'Logic', searchTerms: ['and', 'all', 'both', 'conjunction'] },
    { label: 'OR', icon: <GitBranch className="h-3.5 w-3.5 text-indigo-500" />, color: 'indigo', payload: { type: 'logic', logicOp: 'or' }, category: 'Logic', searchTerms: ['or', 'any', 'either', 'disjunction'] },
    { label: 'NOT', icon: <GitBranch className="h-3.5 w-3.5 text-indigo-500" />, color: 'indigo', payload: { type: 'logic', logicOp: 'not' }, category: 'Logic', searchTerms: ['not', 'negate', 'invert', 'opposite'] },
  ]

  const operationItems: PaletteItem[] = [
    { label: '+', icon: <Plus className="h-3.5 w-3.5 text-violet-500" />, color: 'violet', payload: { type: 'op', op: 'add' }, category: 'Operations', searchTerms: ['add', 'plus', 'sum'] },
    { label: '−', icon: <Minus className="h-3.5 w-3.5 text-violet-500" />, color: 'violet', payload: { type: 'op', op: 'sub' }, category: 'Operations', searchTerms: ['subtract', 'minus', 'sub'] },
    { label: '×', icon: <X className="h-3.5 w-3.5 text-violet-500" />, color: 'violet', payload: { type: 'op', op: 'mul' }, category: 'Operations', searchTerms: ['multiply', 'times', 'mul'] },
    { label: '÷', icon: <Divide className="h-3.5 w-3.5 text-violet-500" />, color: 'violet', payload: { type: 'op', op: 'div' }, category: 'Operations', searchTerms: ['divide', 'div'] },
    { label: '=', icon: <Equal className="h-3.5 w-3.5 text-violet-500" />, color: 'violet', payload: { type: 'op', op: 'eq' }, category: 'Operations', searchTerms: ['equals', 'equal', 'eq', 'compare'] },
    { label: '≠', icon: <span className="text-[10px] font-bold text-violet-500">≠</span>, color: 'violet', payload: { type: 'op', op: 'neq' }, category: 'Operations', searchTerms: ['not equal', 'neq', 'different'] },
    { label: '>', icon: <span className="text-[10px] font-bold text-violet-500">&gt;</span>, color: 'violet', payload: { type: 'op', op: 'gt' }, category: 'Operations', searchTerms: ['greater', 'gt', 'more than'] },
    { label: '≥', icon: <span className="text-[10px] font-bold text-violet-500">≥</span>, color: 'violet', payload: { type: 'op', op: 'gte' }, category: 'Operations', searchTerms: ['greater or equal', 'gte', 'at least'] },
    { label: '<', icon: <span className="text-[10px] font-bold text-violet-500">&lt;</span>, color: 'violet', payload: { type: 'op', op: 'lt' }, category: 'Operations', searchTerms: ['less', 'lt', 'less than'] },
    { label: '≤', icon: <span className="text-[10px] font-bold text-violet-500">≤</span>, color: 'violet', payload: { type: 'op', op: 'lte' }, category: 'Operations', searchTerms: ['less or equal', 'lte', 'at most'] },
  ]

  const mathItems: PaletteItem[] = [
    { label: 'Abs', icon: <FunctionSquare className="h-3.5 w-3.5 text-orange-500" />, color: 'orange', payload: { type: 'math', mathOp: 'abs' }, category: 'Math', searchTerms: ['absolute', 'abs', 'value'] },
    { label: 'Round', icon: <FunctionSquare className="h-3.5 w-3.5 text-orange-500" />, color: 'orange', payload: { type: 'math', mathOp: 'round' }, category: 'Math', searchTerms: ['round', 'nearest'] },
    { label: 'Floor', icon: <FunctionSquare className="h-3.5 w-3.5 text-orange-500" />, color: 'orange', payload: { type: 'math', mathOp: 'floor' }, category: 'Math', searchTerms: ['floor', 'down', 'round down'] },
    { label: 'Ceil', icon: <FunctionSquare className="h-3.5 w-3.5 text-orange-500" />, color: 'orange', payload: { type: 'math', mathOp: 'ceil' }, category: 'Math', searchTerms: ['ceil', 'ceiling', 'round up'] },
    { label: 'Mod', icon: <FunctionSquare className="h-3.5 w-3.5 text-orange-500" />, color: 'orange', payload: { type: 'math', mathOp: 'mod' }, category: 'Math', searchTerms: ['modulo', 'mod', 'remainder'] },
    { label: 'Pow', icon: <FunctionSquare className="h-3.5 w-3.5 text-orange-500" />, color: 'orange', payload: { type: 'math', mathOp: 'pow' }, category: 'Math', searchTerms: ['power', 'pow', 'exponent'] },
    { label: 'Min', icon: <FunctionSquare className="h-3.5 w-3.5 text-orange-500" />, color: 'orange', payload: { type: 'math', mathOp: 'min' }, category: 'Math', searchTerms: ['minimum', 'min', 'smallest'] },
    { label: 'Max', icon: <FunctionSquare className="h-3.5 w-3.5 text-orange-500" />, color: 'orange', payload: { type: 'math', mathOp: 'max' }, category: 'Math', searchTerms: ['maximum', 'max', 'largest'] },
    { label: 'Clamp', icon: <FunctionSquare className="h-3.5 w-3.5 text-orange-500" />, color: 'orange', payload: { type: 'math', mathOp: 'clamp' }, category: 'Math', searchTerms: ['clamp', 'constrain', 'limit'] },
  ]

  const stringItems: PaletteItem[] = [
    { label: 'Concat', icon: <CaseSensitive className="h-3.5 w-3.5 text-rose-500" />, color: 'rose', payload: { type: 'string', stringOp: 'concat' }, category: 'String', searchTerms: ['concat', 'join', 'combine'] },
    { label: 'Length', icon: <CaseSensitive className="h-3.5 w-3.5 text-rose-500" />, color: 'rose', payload: { type: 'string', stringOp: 'length' }, category: 'String', searchTerms: ['length', 'size', 'count', 'chars'] },
    { label: 'Trim', icon: <CaseSensitive className="h-3.5 w-3.5 text-rose-500" />, color: 'rose', payload: { type: 'string', stringOp: 'trim' }, category: 'String', searchTerms: ['trim', 'strip', 'whitespace'] },
    { label: 'Upper', icon: <CaseSensitive className="h-3.5 w-3.5 text-rose-500" />, color: 'rose', payload: { type: 'string', stringOp: 'toUpper' }, category: 'String', searchTerms: ['uppercase', 'upper', 'caps'] },
    { label: 'Lower', icon: <CaseSensitive className="h-3.5 w-3.5 text-rose-500" />, color: 'rose', payload: { type: 'string', stringOp: 'toLower' }, category: 'String', searchTerms: ['lowercase', 'lower', 'small'] },
    { label: 'Slice', icon: <CaseSensitive className="h-3.5 w-3.5 text-rose-500" />, color: 'rose', payload: { type: 'string', stringOp: 'slice' }, category: 'String', searchTerms: ['slice', 'substring', 'part'] },
    { label: 'Includes', icon: <CaseSensitive className="h-3.5 w-3.5 text-rose-500" />, color: 'rose', payload: { type: 'string', stringOp: 'includes' }, category: 'String', searchTerms: ['includes', 'contains', 'find'] },
    { label: 'Regex', icon: <CaseSensitive className="h-3.5 w-3.5 text-rose-500" />, color: 'rose', payload: { type: 'string', stringOp: 'regex' }, category: 'String', searchTerms: ['regex', 'pattern', 'match'] },
  ]

  const items = [...allItems, ...operationItems, ...mathItems, ...stringItems]

  const filteredItems = searchQuery.trim()
    ? items.filter((item) =>
        item.searchTerms.some((term) => term.includes(searchQuery.toLowerCase())) ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items

  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, PaletteItem[]>
  )

  const categoryOrder = ['Data', 'Operations', 'Logic', 'Math', 'String']
  const orderedCategories = categoryOrder.filter((cat) => groupedItems[cat])

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Search Box */}
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-xs"
          title="Search for nodes by name (e.g. 'field', 'add', 'if')"
        />
      </div>

      {/* Palette Items */}
      <div
        className="overflow-y-auto flex-1 space-y-2.5 pr-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--foreground) / 0.2) transparent' }}
      >
        {orderedCategories.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-center text-xs text-muted-foreground">
            <div>
              <p className="font-medium mb-1">No nodes found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          </div>
        ) : (
          orderedCategories.map((category) => (
            <div key={category}>
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center gap-1 px-1 py-1 hover:bg-muted/50 rounded transition-colors"
              >
                {expandedCategories.has(category) ? (
                  <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
                ) : (
                  <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
                )}
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
                  {category}
                </p>
              </button>

              {expandedCategories.has(category) && (
                <>
                  {/* Operations: icon-only chips in a flex wrap */}
                  {category === 'Operations' && (
                    <div className="flex flex-wrap gap-1">
                      {groupedItems[category].map((item) => (
                    <div
                      key={item.label}
                      draggable
                      onDragStart={makeDragStart(item.payload)}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-md border cursor-grab transition-all duration-150',
                        'active:cursor-grabbing active:scale-[0.95] hover:shadow-sm',
                        item.color === 'violet' && 'border-violet-200 bg-violet-50/60 hover:bg-violet-100/70 dark:border-violet-500/30 dark:bg-violet-500/10 dark:hover:bg-violet-500/20',
                      )}
                      title={item.label}
                    >
                      <div className="flex items-center justify-center text-[11px]">
                        {item.icon}
                      </div>
                    </div>
                  ))}
                </div>
              )}

                  {/* All other categories: single-column with label + icon */}
                  {category !== 'Operations' && (
                    <div className="space-y-1">
                      {groupedItems[category].map((item) => (
                        <div
                          key={item.label}
                          draggable
                          onDragStart={makeDragStart(item.payload)}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-grab text-xs font-medium transition-all duration-150',
                            'active:cursor-grabbing active:scale-[0.97] hover:shadow-sm',
                            item.color === 'blue' && 'border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 dark:border-blue-500/30 dark:bg-blue-500/10 dark:hover:bg-blue-500/20',
                            item.color === 'emerald' && 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20',
                            item.color === 'cyan' && 'border-cyan-200 bg-cyan-50/60 hover:bg-cyan-100/70 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20',
                            item.color === 'indigo' && 'border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20',
                            item.color === 'orange' && 'border-orange-200 bg-orange-50/60 hover:bg-orange-100/70 dark:border-orange-500/30 dark:bg-orange-500/10 dark:hover:bg-orange-500/20',
                            item.color === 'rose' && 'border-rose-200 bg-rose-50/60 hover:bg-rose-100/70 dark:border-rose-500/30 dark:bg-rose-500/10 dark:hover:bg-rose-500/20',
                          )}
                        >
                          <div className="flex-shrink-0">
                            {item.icon}
                          </div>
                          <span className="text-foreground/80 truncate">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
