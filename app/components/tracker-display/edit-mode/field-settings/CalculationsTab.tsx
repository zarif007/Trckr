'use client'

import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import type { FieldCalculationRule } from '@/lib/functions/types'
import type { TrackerDisplayProps, TrackerField } from '../../types'
import { ExprRuleEditor } from '../expr'
import { defaultCalculationExpr } from './constants'

export interface CalculationsTabProps {
  gridId: string | null | undefined
  schema: TrackerDisplayProps | undefined
  field: TrackerField
  calculationRule: FieldCalculationRule | null
  setCalculationRule: React.Dispatch<React.SetStateAction<FieldCalculationRule | null>>
  availableFields: Array<{ fieldId: string; label: string; dataType?: string }>
}

export function CalculationsTab({
  gridId,
  schema,
  field,
  calculationRule,
  setCalculationRule,
  availableFields,
}: CalculationsTabProps) {
  if (!gridId) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-8 px-4 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Place this field in a grid to configure calculations.
        </p>
      </div>
    )
  }
  if (!calculationRule) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-8 px-4 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          No calculation configured. Add one expression to compute this field value.
        </p>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setCalculationRule({ expr: defaultCalculationExpr } as FieldCalculationRule)}
        >
          <Plus className="h-4 w-4" />
          Add calculation
        </Button>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <ExprRuleEditor
        mode="calculation"
        expr={calculationRule.expr}
        gridId={gridId}
        fieldId={field.id}
        availableFields={availableFields}
        currentTracker={schema}
        onChange={(nextExpr) => setCalculationRule({ expr: nextExpr })}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => setCalculationRule(null)}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Remove calculation
        </Button>
      </div>
    </div>
  )
}
