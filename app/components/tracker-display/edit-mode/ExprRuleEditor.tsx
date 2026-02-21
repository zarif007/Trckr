'use client'

import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Maximize2 } from 'lucide-react'
import type { ExprNode } from '@/lib/functions/types'
import { exprSchema, normalizeExprNode } from '@/lib/schemas/expr'
import { ExprFlowBuilder } from './ExprFlowBuilder'
import type { AvailableField } from './expr-types'
import type { TrackerDisplayProps } from '../types'

interface ExprRuleEditorProps {
  expr: ExprNode
  gridId: string
  fieldId: string
  availableFields: AvailableField[]
  currentTracker?: TrackerDisplayProps
  onChange: (expr: ExprNode) => void
}

export function ExprRuleEditor({
  expr,
  gridId,
  fieldId,
  availableFields,
  currentTracker,
  onChange,
}: ExprRuleEditorProps) {
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [visualDialogOpen, setVisualDialogOpen] = useState(false)

  const trackerPayload = useMemo(() => {
    if (!currentTracker) return null
    return {
      fields: currentTracker.fields ?? [],
      layoutNodes: currentTracker.layoutNodes ?? [],
    }
  }, [currentTracker])

  useEffect(() => {
    setJsonDraft(JSON.stringify(expr, null, 2))
    setJsonError(null)
  }, [expr])

  const fieldSummary = useMemo(() => {
    if (!availableFields.length) return 'No fields found in this grid.'
    return availableFields.map((f) => f.label).join(', ')
  }, [availableFields])

  const applyExpr = (next: ExprNode) => {
    const normalized = normalizeExprNode(next)
    onChange(normalized)
  }

  const handleJsonBlur = () => {
    try {
      const parsed = JSON.parse(jsonDraft)
      const validated = exprSchema.safeParse(parsed)
      if (!validated.success) {
        setJsonError('Invalid expression JSON')
        return
      }
      applyExpr(validated.data)
      setJsonError(null)
    } catch {
      setJsonError('Invalid JSON')
    }
  }

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) {
      setAiError('Enter a prompt to generate an expression.')
      return
    }
    if (!gridId || !fieldId) {
      setAiError('Missing grid or field context for generation.')
      return
    }
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/generate-expr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          gridId,
          fieldId,
          currentTracker: trackerPayload,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAiError(data?.error ?? 'Failed to generate expression.')
        return
      }
      if (!data?.expr) {
        setAiError('No expression returned.')
        return
      }
      applyExpr(data.expr as ExprNode)
    } catch {
      setAiError('Failed to reach the generation API.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase">
          Custom expression
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Validation passes when the expression returns true. Use JSON, AI, or the visual builder.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => applyExpr({ op: 'const', value: true })}
          className="h-8 text-xs"
        >
          Always valid
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => applyExpr({ op: 'const', value: false })}
          className="h-8 text-xs"
        >
          Always invalid
        </Button>
      </div>
      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="visual">Visual</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="ai">AI prompt</TabsTrigger>
        </TabsList>
        <TabsContent value="visual" className="mt-4">
          <ExprFlowBuilder
            expr={expr}
            availableFields={availableFields}
            onChange={applyExpr}
            headerAction={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setVisualDialogOpen(true)}
                className="border border-foreground/20 bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
              >
                <Maximize2 />
                <span className="sr-only">Expand visual builder</span>
              </Button>
            }
          />
          <Dialog open={visualDialogOpen} onOpenChange={setVisualDialogOpen}>
            <DialogContent className="w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-w-none max-h-none sm:max-w-none p-4 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-base">Visual expression builder</DialogTitle>
              </DialogHeader>
              <ExprFlowBuilder
                expr={expr}
                availableFields={availableFields}
                onChange={applyExpr}
                flowHeightClassName="h-[calc(100vh-16rem)] min-h-[420px]"
              />
            </DialogContent>
          </Dialog>
        </TabsContent>
        <TabsContent value="json" className="mt-4 space-y-2">
          <Textarea
            value={jsonDraft}
            onChange={(e) => setJsonDraft(e.target.value)}
            onBlur={handleJsonBlur}
            className="font-mono text-xs min-h-[140px] rounded-lg border-border/60 bg-muted/20"
            aria-invalid={Boolean(jsonError)}
          />
          {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
        </TabsContent>
        <TabsContent value="ai" className="mt-4 space-y-3">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Prompt
            </label>
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. total must be greater than subtotal + tax"
              className="text-xs min-h-[90px]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Available fields
            </label>
            <Input value={fieldSummary} readOnly className="text-xs" />
          </div>
          {aiError && <p className="text-xs text-destructive">{aiError}</p>}
          <Button type="button" size="sm" onClick={handleGenerate} disabled={aiLoading}>
            {aiLoading ? 'Generating...' : 'Generate expression'}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
