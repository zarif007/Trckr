'use client'

import { useState } from 'react'
import { Calculator, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RuleCardShell, RuleEmptyState } from '../shared'
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
 trackerSchemaId?: string | null
}

export function CalculationsTab({
 gridId,
 schema,
 field,
 calculationRule,
 setCalculationRule,
 availableFields,
 trackerSchemaId,
}: CalculationsTabProps) {
 const [expanded, setExpanded] = useState(true)
 const fieldLabel = field.ui?.label ?? field.id

 if (!gridId) {
 return (
 <RuleEmptyState
 icon={<Calculator className="h-5 w-5 text-muted-foreground" />}
 title="Grid required"
 description="Place this field in a grid to configure calculations."
 />
 )
 }

 if (!calculationRule) {
 return (
 <RuleEmptyState
 icon={<Calculator className="h-5 w-5 text-muted-foreground" />}
 title="No calculation"
 description="Add one expression to compute this field's value automatically."
 action={{
 label: 'Add calculation',
 onClick: () => setCalculationRule({ expr: defaultCalculationExpr } as FieldCalculationRule),
 }}
 />
 )
 }

 const icon = (
 <div className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-primary/10 shrink-0">
 <Calculator className="h-3 w-3 text-primary" />
 </div>
 )

 const badges = (
 <>
 <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0 bg-primary/10 border-primary/20 text-primary">
 Calculation
 </Badge>
 <span className="text-[11px] text-muted-foreground truncate">{fieldLabel}</span>
 </>
 )

 const actions = (
 <Button
 variant="ghost"
 size="icon"
 className="h-6 w-6 text-muted-foreground hover:text-destructive"
 onClick={() => setCalculationRule(null)}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 )

 return (
 <RuleCardShell
 icon={icon}
 badges={badges}
 actions={actions}
 expanded={expanded}
 onToggle={() => setExpanded((v) => !v)}
 >
 <ExprRuleEditor
 mode="calculation"
 expr={calculationRule.expr}
 gridId={gridId}
 fieldId={field.id}
 availableFields={availableFields}
 currentTracker={schema}
 trackerSchemaId={trackerSchemaId}
 onChange={(nextExpr) => setCalculationRule({ expr: nextExpr })}
 />
 </RuleCardShell>
 )
}
