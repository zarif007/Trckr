'use client'

import type { ReactNode } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MATH_OP_LABELS, STRING_OP_LABELS } from './ExprFlowNodes'
import type { ExprFlowOperator, LogicOp, MathOp, StringOp } from './expr-types'

interface ExprFlowPaletteProps {
  makeDragStart: (payload: object) => (event: React.DragEvent) => void
}

export function ExprFlowPalette({ makeDragStart }: ExprFlowPaletteProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <Database className="h-3 w-3" />Data
        </p>
        <div className="space-y-1.5">
          {[
            { label: 'Field', icon: <Database className="h-3.5 w-3.5 text-blue-500" />, color: 'blue', payload: { type: 'field' } },
            { label: 'Value', icon: <Type className="h-3.5 w-3.5 text-emerald-500" />, color: 'emerald', payload: { type: 'const' } },
            { label: 'Accumulator', icon: <Sigma className="h-3.5 w-3.5 text-cyan-500" />, color: 'cyan', payload: { type: 'accumulator' } },
          ].map((item) => (
            <div
              key={item.label}
              draggable
              onDragStart={makeDragStart(item.payload)}
              className={cn(
                'cursor-grab rounded-md border px-2.5 py-2 text-xs text-foreground/80 transition-all duration-150',
                'active:cursor-grabbing active:scale-[0.98] hover:shadow-sm flex items-center gap-2',
                item.color === 'blue' && 'border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 dark:border-blue-500/30 dark:bg-blue-500/10',
                item.color === 'emerald' && 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
                item.color === 'cyan' && 'border-cyan-200 bg-cyan-50/50 hover:bg-cyan-100/50 dark:border-cyan-500/30 dark:bg-cyan-500/10',
              )}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <Calculator className="h-3 w-3" />Operations
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { op: 'add' as const, icon: <Plus className="h-3.5 w-3.5 text-violet-500" /> },
              { op: 'sub' as const, icon: <Minus className="h-3.5 w-3.5 text-violet-500" /> },
              { op: 'mul' as const, icon: <X className="h-3.5 w-3.5 text-violet-500" /> },
              { op: 'div' as const, icon: <Divide className="h-3.5 w-3.5 text-violet-500" /> },
              { op: 'eq' as const, icon: <Equal className="h-3.5 w-3.5 text-violet-500" /> },
              { op: 'neq' as const, icon: <span className="text-[10px] font-bold text-violet-500">≠</span> },
              { op: 'gt' as const, icon: <span className="text-[10px] font-bold text-violet-500">&gt;</span> },
              { op: 'gte' as const, icon: <span className="text-[10px] font-bold text-violet-500">≥</span> },
              { op: 'lt' as const, icon: <span className="text-[10px] font-bold text-violet-500">&lt;</span> },
              { op: 'lte' as const, icon: <span className="text-[10px] font-bold text-violet-500">≤</span> },
            ] as { op: ExprFlowOperator; icon: ReactNode }[]
          ).map((item) => (
            <div
              key={item.op}
              draggable
              onDragStart={makeDragStart({ type: 'op', op: item.op })}
              className="cursor-grab rounded-md border border-violet-200 bg-violet-50/50 px-2 py-1.5 text-[11px] text-foreground/80 transition-all duration-150 active:cursor-grabbing active:scale-[0.98] hover:bg-violet-100/50 hover:shadow-sm flex items-center justify-center gap-1 dark:border-violet-500/30 dark:bg-violet-500/10 dark:hover:bg-violet-500/20"
            >
              {item.icon}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <GitBranch className="h-3 w-3" />Logic
        </p>
        <div className="space-y-1.5">
          {(
            [
              { label: 'If / Then / Else', logicOp: 'if' as const },
              { label: 'AND', logicOp: 'and' as const },
              { label: 'OR', logicOp: 'or' as const },
              { label: 'NOT', logicOp: 'not' as const },
            ] as { label: string; logicOp: LogicOp }[]
          ).map((item) => (
            <div
              key={item.logicOp}
              draggable
              onDragStart={makeDragStart({ type: 'logic', logicOp: item.logicOp })}
              className="cursor-grab rounded-md border border-indigo-200 bg-indigo-50/50 px-2.5 py-1.5 text-xs text-foreground/80 transition-all duration-150 active:cursor-grabbing active:scale-[0.98] hover:bg-indigo-100/50 hover:shadow-sm flex items-center gap-2 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20"
            >
              <GitBranch className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <FunctionSquare className="h-3 w-3" />Math
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { mathOp: 'abs' as const, label: 'Abs' },
              { mathOp: 'round' as const, label: 'Round' },
              { mathOp: 'floor' as const, label: 'Floor' },
              { mathOp: 'ceil' as const, label: 'Ceil' },
              { mathOp: 'mod' as const, label: 'Mod %' },
              { mathOp: 'pow' as const, label: 'Pow ^' },
              { mathOp: 'min' as const, label: 'Min' },
              { mathOp: 'max' as const, label: 'Max' },
              { mathOp: 'clamp' as const, label: 'Clamp' },
            ] as { label: string; mathOp: MathOp }[]
          ).map((item) => (
            <div
              key={item.mathOp}
              draggable
              onDragStart={makeDragStart({ type: 'math', mathOp: item.mathOp })}
              className="cursor-grab rounded-md border border-orange-200 bg-orange-50/50 px-2 py-1.5 text-[11px] text-foreground/80 transition-all duration-150 active:cursor-grabbing active:scale-[0.98] hover:bg-orange-100/50 hover:shadow-sm flex items-center justify-center gap-1 font-medium dark:border-orange-500/30 dark:bg-orange-500/10 dark:hover:bg-orange-500/20"
              title={MATH_OP_LABELS[item.mathOp]}
            >
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <CaseSensitive className="h-3 w-3" />String
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { stringOp: 'concat' as const, label: 'Concat' },
              { stringOp: 'length' as const, label: 'Length' },
              { stringOp: 'trim' as const, label: 'Trim' },
              { stringOp: 'toUpper' as const, label: 'Upper' },
              { stringOp: 'toLower' as const, label: 'Lower' },
              { stringOp: 'slice' as const, label: 'Slice' },
              { stringOp: 'includes' as const, label: 'Includes' },
              { stringOp: 'regex' as const, label: 'Regex' },
            ] as { label: string; stringOp: StringOp }[]
          ).map((item) => (
            <div
              key={item.stringOp}
              draggable
              onDragStart={makeDragStart({ type: 'string', stringOp: item.stringOp })}
              className="cursor-grab rounded-md border border-rose-200 bg-rose-50/50 px-2 py-1.5 text-[11px] text-foreground/80 transition-all duration-150 active:cursor-grabbing active:scale-[0.98] hover:bg-rose-100/50 hover:shadow-sm flex items-center justify-center gap-1 font-medium dark:border-rose-500/30 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"
              title={STRING_OP_LABELS[item.stringOp]}
            >
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
