'use client'

import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  dynamicOptionFunctionSchema,
  getRegisteredDynamicOptionsIds,
  resolveDynamicOptions,
  type DynamicOptionFunctionDef,
  type DynamicOptionsDefinitions,
  type DynamicOptionsResolveInput,
  type DynamicOptionsResolveResult,
} from '@/lib/dynamic-options'
import type { TrackerDisplayProps } from '../../types'
import {
  createTemplateGraphFunction,
  ensureGraphFunction,
} from './dynamic-function-graph'
import { DynamicFunctionFlowBuilder } from './DynamicFunctionFlowBuilder'

interface DynamicOptionsBuilderProps {
  schema: TrackerDisplayProps
  fieldId: string
  functionId: string
  onFunctionIdChange: (next: string) => void
  argsText: string
  onArgsTextChange: (next: string) => void
  cacheTtlText: string
  onCacheTtlTextChange: (next: string) => void
  dynamicOptionsDraft: DynamicOptionsDefinitions
  onDynamicOptionsDraftChange: (next: DynamicOptionsDefinitions) => void
  onValidationStateChange?: (state: {
    canSave: boolean
    compileErrors: string[]
    previewError: string | null
  }) => void
}

function sanitizeFunctionId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

function parseJsonObject(input: string): Record<string, unknown> | null {
  if (!input.trim()) return {}
  try {
    const parsed = JSON.parse(input)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function parseJsonAny(input: string): unknown {
  if (!input.trim()) return undefined
  try {
    return JSON.parse(input)
  } catch {
    return undefined
  }
}

function toPrettyJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2)
}

const remoteResolve: NonNullable<DynamicOptionsResolveInput['remoteResolver']> = async (
  payload
): Promise<DynamicOptionsResolveResult> => {
  const response = await fetch('/api/dynamic-options/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to resolve dynamic options preview')
  }
  return data as DynamicOptionsResolveResult
}

export function DynamicOptionsBuilder({
  schema,
  fieldId,
  functionId,
  onFunctionIdChange,
  argsText,
  onArgsTextChange,
  cacheTtlText,
  onCacheTtlTextChange,
  dynamicOptionsDraft,
  onDynamicOptionsDraftChange,
  onValidationStateChange,
}: DynamicOptionsBuilderProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'json' | 'ai'>('visual')
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const [aiPrompt, setAiPrompt] = useState('')
  const [aiSampleResponse, setAiSampleResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [preview, setPreview] = useState<DynamicOptionsResolveResult | null>(null)

  const [flowValidation, setFlowValidation] = useState<{ valid: boolean; errors: string[] }>({
    valid: false,
    errors: ['Graph is not validated yet'],
  })

  const functions = useMemo(
    () => dynamicOptionsDraft.functions ?? {},
    [dynamicOptionsDraft.functions]
  )
  const connectors = useMemo(
    () => dynamicOptionsDraft.connectors ?? {},
    [dynamicOptionsDraft.connectors]
  )

  const builtInIds = useMemo(() => getRegisteredDynamicOptionsIds(), [])
  const myFunctionsList = useMemo(
    () => Object.values(functions).sort((a, b) => a.name.localeCompare(b.name)),
    [functions]
  )

  const isBuiltIn = Boolean(functionId && builtInIds.includes(functionId))
  const currentFunction = useMemo(
    () => (functionId && functions[functionId] ? functions[functionId] : undefined),
    [functions, functionId]
  )
  const isMyFunction = Boolean(currentFunction)

  useEffect(() => {
    if (!currentFunction) {
      setJsonDraft('')
      return
    }
    setJsonDraft(toPrettyJson(currentFunction))
  }, [currentFunction])

  const canSave = Boolean(
    !functionId ||
      isBuiltIn ||
      (isMyFunction && flowValidation.valid && preview && !previewError)
  )

  useEffect(() => {
    onValidationStateChange?.({
      canSave,
      compileErrors: flowValidation.errors,
      previewError,
    })
  }, [canSave, flowValidation.errors, onValidationStateChange, previewError])

  const updateDraft = (next: DynamicOptionsDefinitions) => {
    onDynamicOptionsDraftChange({
      functions: next.functions ?? {},
      connectors: next.connectors ?? {},
    })
  }

  const upsertFunction = (nextFn: DynamicOptionFunctionDef, previousId?: string) => {
    const nextFunctions = { ...(dynamicOptionsDraft.functions ?? {}) }
    if (previousId && previousId !== nextFn.id) {
      delete nextFunctions[previousId]
    }
    nextFunctions[nextFn.id] = nextFn
    updateDraft({
      ...dynamicOptionsDraft,
      functions: nextFunctions,
    })
    onFunctionIdChange(nextFn.id)
    setPreview(null)
    setPreviewError(null)
  }

  const deleteFunction = (id: string) => {
    const nextFunctions = { ...(dynamicOptionsDraft.functions ?? {}) }
    delete nextFunctions[id]
    updateDraft({
      ...dynamicOptionsDraft,
      functions: nextFunctions,
    })
    const fallbackId = Object.keys(nextFunctions)[0] ?? ''
    onFunctionIdChange(fallbackId)
    setPreview(null)
  }

  const addFunction = () => {
    const suggestedId =
      sanitizeFunctionId(functionId || `${fieldId}_options`) ||
      `${fieldId}_options`
    const suggestedName = `${fieldId.replace(/_/g, ' ')} options`
    const templateFn = createTemplateGraphFunction(
      suggestedId,
      suggestedName,
      schema,
      'grid_values',
      connectors,
    )
    upsertFunction(templateFn)
    setFlowValidation({ valid: false, errors: ['Run preview to confirm function output'] })
  }

  useEffect(() => {
    if (activeTab !== 'visual') return
    if (!currentFunction || currentFunction.engine === 'graph_v1') return
    const converted = ensureGraphFunction(currentFunction, schema, connectors)
    upsertFunction(converted, currentFunction.id)
  }, [activeTab, connectors, currentFunction, schema])

  const graphFunction = useMemo(
    () => (currentFunction && currentFunction.engine === 'graph_v1' ? currentFunction : null),
    [currentFunction]
  )

  const refreshPreview = async (forceRefresh = false) => {
    if (!functionId) {
      setPreviewError('Choose or create a function first.')
      return
    }

    let parsedArgs: Record<string, unknown> = {}
    if (argsText.trim()) {
      const parsed = parseJsonObject(argsText)
      if (!parsed) {
        setPreviewError('Args must be a valid JSON object.')
        return
      }
      parsedArgs = parsed
    }

    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const ttlOverride = cacheTtlText.trim() ? Number(cacheTtlText) : undefined
      const result = await resolveDynamicOptions({
        functionId,
        context: {
          grids: schema.grids,
          fields: schema.fields,
          layoutNodes: schema.layoutNodes,
          sections: schema.sections,
          dynamicOptions: dynamicOptionsDraft,
          gridData: schema.initialGridData,
        },
        runtime: {
          currentGridId: schema.grids[0]?.id,
          currentFieldId: fieldId,
          rowIndex: 0,
          currentRow: schema.initialGridData?.[schema.grids[0]?.id ?? '']?.[0] ?? {},
        },
        args: parsedArgs,
        forceRefresh,
        cacheTtlSecondsOverride: Number.isFinite(ttlOverride) ? ttlOverride : undefined,
        remoteResolver: remoteResolve,
      })
      setPreview(result)
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to refresh preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const generateWithAi = async () => {
    if (!aiPrompt.trim()) {
      setAiError('Enter a prompt first.')
      return
    }

    const aiFunctionId = sanitizeFunctionId(functionId || `${fieldId}_options`)
    if (!aiFunctionId) {
      setAiError('Function id is required.')
      return
    }

    setAiLoading(true)
    setAiError(null)
    try {
      const response = await fetch('/api/generate-dynamic-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          functionId: aiFunctionId,
          functionName: currentFunction?.name || `${fieldId.replace(/_/g, ' ')} options`,
          currentTracker: {
            tabs: schema.tabs,
            sections: schema.sections,
            grids: schema.grids,
            fields: schema.fields,
            layoutNodes: schema.layoutNodes,
            dynamicOptions: dynamicOptionsDraft,
          },
          sampleResponse: parseJsonAny(aiSampleResponse),
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setAiError(data?.error ?? 'Failed to generate dynamic function')
        return
      }

      const validated = dynamicOptionFunctionSchema.safeParse(data?.function)
      if (!validated.success) {
        setAiError('AI returned invalid function output')
        return
      }

      const graphFirst =
        validated.data.engine === 'graph_v1'
          ? validated.data
          : ensureGraphFunction(validated.data, schema, connectors)

      upsertFunction(graphFirst)
      setActiveTab('visual')
      setFlowValidation({ valid: false, errors: ['Run preview to confirm function output'] })
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  const applyJsonDraft = () => {
    const parsed = parseJsonAny(jsonDraft)
    const validated = dynamicOptionFunctionSchema.safeParse(parsed)
    if (!validated.success) {
      setJsonError('Invalid function JSON.')
      return
    }
    const previousId = currentFunction?.id
    upsertFunction(validated.data, previousId)
    setJsonError(null)
    setFlowValidation({ valid: false, errors: ['Run preview to confirm function output'] })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          Option source
        </p>
        <p className="text-xs text-muted-foreground">
          Choose a built-in source, one of your functions, or add a new function. The selected source supplies options for this field.
        </p>

        <div className="space-y-2">
          <span className="text-xs font-medium text-foreground/80">Built-in</span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={!functionId ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                onFunctionIdChange('')
                setPreview(null)
                setPreviewError(null)
              }}
            >
              None
            </Button>
            {builtInIds.map((id) => (
              <Button
                key={id}
                type="button"
                variant={functionId === id ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  onFunctionIdChange(id)
                  setPreview(null)
                  setPreviewError(null)
                }}
              >
                {id.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Add it later */}
        {/* <div className="space-y-2">
          <span className="text-xs font-medium text-foreground/80">My functions</span>
          {myFunctionsList.length === 0 ? (
            <p className="text-xs text-muted-foreground">No custom functions yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {myFunctionsList.map((fn) => (
                <div key={fn.id} className="flex items-center gap-1 rounded-md border border-border/60 bg-background/80 overflow-hidden">
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-left text-xs font-medium ${functionId === fn.id ? 'bg-primary/15 text-primary' : 'text-foreground/90 hover:bg-muted/50'}`}
                    onClick={() => {
                      onFunctionIdChange(fn.id)
                      setPreview(null)
                      setPreviewError(null)
                    }}
                  >
                    {fn.name}
                  </button>
                  {functionId === fn.id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => deleteFunction(fn.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addFunction}>
            Add function
          </Button>
        </div> */}

        {/* {(isBuiltIn || isMyFunction) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/50">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground/90">Args JSON</label>
              <Input
                value={argsText}
                onChange={(e) => onArgsTextChange(e.target.value)}
                placeholder='{"country":"US"}'
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground/90">Cache TTL (sec)</label>
              <Input
                value={cacheTtlText}
                onChange={(e) => onCacheTtlTextChange(e.target.value)}
                placeholder="300"
              />
            </div>
          </div>
        )} */}
      </div>

      {/* {currentFunction && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="visual">Visual graph</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="ai">AI prompt</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="mt-4 space-y-4">
            {graphFunction ? (
              <DynamicFunctionFlowBuilder
                value={graphFunction}
                grids={schema.grids.map((g) => ({ id: g.id, name: g.name }))}
                connectors={connectors}
                onChange={(nextGraph) =>
                  upsertFunction(
                    {
                      ...graphFunction,
                      graph: nextGraph,
                    },
                    currentFunction.id
                  )
                }
                onValidationChange={setFlowValidation}
                availableFields={schema.fields.map((f) => ({
                  fieldId: f.id,
                  label: f.ui?.label ?? f.id,
                }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Converting function to graph editor...</p>
            )}
          </TabsContent>

          <TabsContent value="json" className="mt-4 space-y-3">
            <Textarea
              value={jsonDraft}
              onChange={(e) => setJsonDraft(e.target.value)}
              className="min-h-[300px] font-mono text-xs"
            />
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={applyJsonDraft}>Apply JSON</Button>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="mt-4 space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground/90">Prompt</label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Example: Fetch all currencies from my countries API and use code as label/value"
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground/90">Sample response JSON (optional)</label>
              <Textarea
                value={aiSampleResponse}
                onChange={(e) => setAiSampleResponse(e.target.value)}
                placeholder='{"items":[{"code":"USD"}]}'
                className="min-h-[100px] font-mono text-xs"
              />
            </div>
            {aiError && <p className="text-xs text-destructive">{aiError}</p>}
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={generateWithAi} disabled={aiLoading}>
                {aiLoading ? 'Generating...' : 'Generate graph'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Live preview</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => refreshPreview(false)} disabled={previewLoading}>
              Refresh
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => refreshPreview(true)} disabled={previewLoading}>
              Force refresh
            </Button>
          </div>
        </div>

        {!preview && !previewError && (
          <p className="text-xs text-muted-foreground">Run preview at least once before saving.</p>
        )}
        {previewError && <p className="text-xs text-destructive">{previewError}</p>}

        {preview && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              fromCache: {String(preview.meta.fromCache)} · fetchedAt: {preview.meta.fetchedAt} · duration: {preview.meta.durationMs}ms
            </p>
            {preview.warnings && preview.warnings.length > 0 && (
              <div className="space-y-1">
                {preview.warnings.map((warning, index) => (
                  <p key={index} className="text-xs text-amber-600">• {warning}</p>
                ))}
              </div>
            )}
            <div className="rounded border border-border/50 bg-background/70 p-2 max-h-[180px] overflow-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify(preview.options.slice(0, 20), null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div> */}

      {!canSave && isMyFunction && (
        <p className="text-xs text-amber-600">
          Save is blocked until graph validation passes and preview resolves successfully.
        </p>
      )}
    </div>
  )
}
