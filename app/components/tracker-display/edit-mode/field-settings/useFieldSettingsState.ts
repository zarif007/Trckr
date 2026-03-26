'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import type { TrackerFieldConfig } from '../../types'
import type { FieldCalculationRule, FieldValidationRule } from '@/lib/functions/types'
import type { TrackerBindingEntry } from '@/lib/types/tracker-bindings'
import { FIELD_TYPE_LABELS, getCreatableFieldTypesWithLabels } from '../utils'
import type { TrackerFieldType } from '../../types'
import {
  buildGridFieldMap,
  buildOptionsGridOptions,
  buildFieldPathOptions,
  buildPathLabelMap,
  ensureValueMapping,
  normalizeMappings,
  resolvePathLabel,
  suggestFieldMappings,
  validateBindingDraft,
  type BindingDraft,
} from '../../bindings/bindings-utils'
import { parsePath } from '@/lib/resolve-bindings'
import type { DynamicOptionsDefinitions } from '@/lib/dynamic-options'
import type { DependsOnRuleForTarget } from '@/lib/depends-on'
import {
  defaultExpr,
  ensureRuleDefaults,
  toNumberOrUndefined,
  type FieldDataSource,
} from './constants'
import type { FieldSettingsDialogProps } from './types'
import { useEditMode } from '../context'
import type { TrackerDisplayProps } from '../../types'

export function useFieldSettingsState({
  open,
  onOpenChange,
  fieldId,
  gridId,
  schema,
  onSchemaChange,
}: FieldSettingsDialogProps) {
  const { projectId: ctxProjectId, trackerSchemaId: ctxTrackerSchemaId } = useEditMode()
  const field = useMemo(() => {
    if (!schema || !fieldId) return null
    return schema.fields.find((f) => f.id === fieldId) ?? null
  }, [schema, fieldId])

  const [label, setLabel] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [prefix, setPrefix] = useState('')
  const [dataType, setDataType] = useState<TrackerFieldType>('string')
  const [isRequired, setIsRequired] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [isDisabled, setIsDisabled] = useState(false)
  const [defaultValue, setDefaultValue] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [minLength, setMinLength] = useState('')
  const [maxLength, setMaxLength] = useState('')
  const [numberDecimalPlaces, setNumberDecimalPlaces] = useState('')
  const [numberStep, setNumberStep] = useState('')
  const [dateFormat, setDateFormat] = useState<'iso' | 'us' | 'eu' | 'long'>('long')
  const [ratingMax, setRatingMax] = useState('')
  const [ratingAllowHalf, setRatingAllowHalf] = useState(false)
  const [personAllowMultiple, setPersonAllowMultiple] = useState(false)
  const [filesMaxCount, setFilesMaxCount] = useState('')
  const [filesMaxSizeMb, setFilesMaxSizeMb] = useState('')
  const [statusOptionsText, setStatusOptionsText] = useState('')
  const [rules, setRules] = useState<FieldValidationRule[]>([])
  const [calculationRule, setCalculationRule] = useState<FieldCalculationRule | null>(null)
  const [dependsOnRules, setDependsOnRules] = useState<DependsOnRuleForTarget[]>([])
  const [structureOpen, setStructureOpen] = useState(false)
  const [showJsonInStructure, setShowJsonInStructure] = useState(false)
  const [bindingEnabled, setBindingEnabled] = useState(false)
  const [bindingDraft, setBindingDraft] = useState<BindingDraft | null>(null)
  const [siblingTrackers, setSiblingTrackers] = useState<Array<{ id: string; name: string | null }>>(
    []
  )
  const [siblingsLoading, setSiblingsLoading] = useState(false)
  const [sourceSchema, setSourceSchema] = useState<TrackerDisplayProps | null>(null)
  const [sourceSchemaLoading, setSourceSchemaLoading] = useState(false)
  const [dynamicOptionsDraft, setDynamicOptionsDraft] = useState<DynamicOptionsDefinitions>({})
  const [dynamicFunctionId, setDynamicFunctionId] = useState('')
  const [dynamicOptionsArgsText, setDynamicOptionsArgsText] = useState('')
  const [dynamicCacheTtlText, setDynamicCacheTtlText] = useState('')
  const [dynamicConfigError, setDynamicConfigError] = useState<string | null>(null)
  const [dynamicBuilderState, setDynamicBuilderState] = useState<{
    canSave: boolean
    compileErrors: string[]
    previewError: string | null
  }>({
    canSave: false,
    compileErrors: ['Run preview to validate the dynamic function'],
    previewError: null,
  })

  const bindingKey = useMemo(() => {
    if (!gridId || !field) return ''
    return `${gridId}.${field.id}`
  }, [gridId, field])

  const isBindable = dataType === 'options' || dataType === 'multiselect'
  const isDynamicField = dataType === 'dynamic_select' || dataType === 'dynamic_multiselect'

  const gridFieldMap = useMemo(
    () => buildGridFieldMap(schema?.layoutNodes ?? []),
    [schema?.layoutNodes]
  )

  const pathLabelMap = useMemo(
    () => buildPathLabelMap(schema?.layoutNodes ?? [], schema?.grids ?? [], schema?.fields ?? []),
    [schema?.layoutNodes, schema?.grids, schema?.fields]
  )

  const optionsGridOptions = useMemo(
    () => buildOptionsGridOptions(schema?.grids ?? []),
    [schema?.grids]
  )

  const allGridOptions = useMemo(
    () =>
      (schema?.grids ?? [])
        .map((g) => ({ value: g.id, label: g.name ?? g.id }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [schema?.grids]
  )

  const allFieldPathOptions = useMemo(
    () => buildFieldPathOptions(schema?.layoutNodes ?? [], schema?.grids ?? [], schema?.fields ?? []),
    [schema?.layoutNodes, schema?.grids, schema?.fields]
  )

  const availableFields = useMemo(() => {
    if (!schema) return []
    const fieldsById = new Map(schema.fields.map((f) => [f.id, f]))
    const pathOptions = buildFieldPathOptions(
      schema.layoutNodes ?? [],
      schema.grids ?? [],
      schema.fields ?? [],
    )
    return pathOptions.map((opt) => {
      const { fieldId: rawFieldId } = parsePath(opt.value)
      const fieldRef = rawFieldId ? fieldsById.get(rawFieldId) : undefined
      return {
        fieldId: opt.value,
        label: opt.label,
        dataType: fieldRef?.dataType,
      }
    })
  }, [schema])

  const defaultBindingDraft = useCallback((): BindingDraft => {
    return {
      key: bindingKey,
      optionsSourceSchemaId: undefined,
      optionsGrid: '',
      labelField: '',
      fieldMappings: [],
    }
  }, [bindingKey])

  const getGridFieldOptions = useCallback(
    (gridIdValue?: string | null) => {
      if (!gridIdValue) return []
      const fieldIds = gridFieldMap.get(gridIdValue)
      if (!fieldIds || fieldIds.size === 0) return []
      const options = Array.from(fieldIds).map((fieldIdValue) => {
        const path = `${gridIdValue}.${fieldIdValue}`
        return {
          value: path,
          label:
            pathLabelMap.get(path) ??
            resolvePathLabel(path, schema?.grids ?? [], schema?.fields ?? []),
        }
      })
      return options.sort((a, b) => a.label.localeCompare(b.label))
    },
    [gridFieldMap, pathLabelMap, schema?.grids, schema?.fields]
  )

  const sourceGridFieldMap = useMemo(
    () => buildGridFieldMap(sourceSchema?.layoutNodes ?? []),
    [sourceSchema?.layoutNodes]
  )

  const sourcePathLabelMap = useMemo(
    () =>
      buildPathLabelMap(
        sourceSchema?.layoutNodes ?? [],
        sourceSchema?.grids ?? [],
        sourceSchema?.fields ?? []
      ),
    [sourceSchema?.layoutNodes, sourceSchema?.grids, sourceSchema?.fields]
  )

  const getBindingSourceGridFieldOptions = useCallback(
    (gridIdValue?: string | null) => {
      if (!gridIdValue) return []
      const sid = bindingDraft?.optionsSourceSchemaId?.trim()
      const map = sid ? sourceGridFieldMap : gridFieldMap
      const grids = sid ? sourceSchema?.grids ?? [] : schema?.grids ?? []
      const fields = sid ? sourceSchema?.fields ?? [] : schema?.fields ?? []
      const labels = sid ? sourcePathLabelMap : pathLabelMap
      const fieldIds = map.get(gridIdValue)
      if (!fieldIds || fieldIds.size === 0) return []
      const options = Array.from(fieldIds).map((fieldIdValue) => {
        const path = `${gridIdValue}.${fieldIdValue}`
        return {
          value: path,
          label: labels.get(path) ?? resolvePathLabel(path, grids, fields),
        }
      })
      return options.sort((a, b) => a.label.localeCompare(b.label))
    },
    [
      bindingDraft?.optionsSourceSchemaId,
      sourceGridFieldMap,
      gridFieldMap,
      sourceSchema?.grids,
      sourceSchema?.fields,
      schema?.grids,
      schema?.fields,
      sourcePathLabelMap,
      pathLabelMap,
    ]
  )

  useEffect(() => {
    if (!open || !ctxProjectId?.trim() || !isBindable) {
      if (!open) setSiblingTrackers([])
      return
    }
    let cancelled = false
      ; (async () => {
        setSiblingsLoading(true)
        try {
          const res = await fetch(`/api/projects/${encodeURIComponent(ctxProjectId)}/trackers`)
          if (!res.ok) {
            if (!cancelled) setSiblingTrackers([])
            return
          }
          const data = (await res.json()) as { items?: Array<{ id: string; name: string | null }> }
          if (!cancelled) setSiblingTrackers(Array.isArray(data.items) ? data.items : [])
        } catch {
          if (!cancelled) setSiblingTrackers([])
        } finally {
          if (!cancelled) setSiblingsLoading(false)
        }
      })()
    return () => {
      cancelled = true
    }
  }, [open, ctxProjectId, isBindable])

  useEffect(() => {
    if (!open) {
      setSourceSchema(null)
      setSourceSchemaLoading(false)
      return
    }
    const sid = bindingDraft?.optionsSourceSchemaId?.trim()
    if (!sid) {
      setSourceSchema(null)
      setSourceSchemaLoading(false)
      return
    }
    let cancelled = false
    setSourceSchemaLoading(true)
      ; (async () => {
        try {
          const res = await fetch(`/api/trackers/${encodeURIComponent(sid)}`)
          if (!res.ok) {
            if (!cancelled) setSourceSchema(null)
            return
          }
          const data = (await res.json()) as { schema?: TrackerDisplayProps }
          if (!cancelled) setSourceSchema((data.schema ?? null) as TrackerDisplayProps | null)
        } catch {
          if (!cancelled) setSourceSchema(null)
        } finally {
          if (!cancelled) setSourceSchemaLoading(false)
        }
      })()
    return () => {
      cancelled = true
    }
  }, [open, bindingDraft?.optionsSourceSchemaId])

  useEffect(() => {
    if (isBindable) return
    setBindingEnabled(false)
    setBindingDraft(null)
  }, [isBindable])

  useEffect(() => {
    if (dataType === 'dynamic_select' || dataType === 'dynamic_multiselect') return
    setDynamicFunctionId('')
    setDynamicOptionsArgsText('')
    setDynamicCacheTtlText('')
    setDynamicConfigError(null)
    setDynamicBuilderState({
      canSave: false,
      compileErrors: ['Run preview to validate the dynamic function'],
      previewError: null,
    })
  }, [dataType])

  useEffect(() => {
    if (!open || !field) return
    setLabel(field.ui.label ?? '')
    setPlaceholder(field.ui.placeholder ?? '')
    setPrefix(typeof field.config?.prefix === 'string' ? field.config.prefix : '')
    setDataType(field.dataType)
    setIsRequired(Boolean(field.config?.isRequired))
    setIsHidden(Boolean(field.config?.isHidden))
    setIsDisabled(Boolean(field.config?.isDisabled))
    const rawDefault = field.config?.defaultValue
    if (rawDefault === undefined || rawDefault === null) {
      setDefaultValue('')
    } else if (typeof rawDefault === 'object') {
      try {
        setDefaultValue(JSON.stringify(rawDefault))
      } catch {
        setDefaultValue(String(rawDefault))
      }
    } else {
      setDefaultValue(String(rawDefault))
    }
    setMin(field.config?.min != null ? String(field.config.min) : '')
    setMax(field.config?.max != null ? String(field.config.max) : '')
    setMinLength(field.config?.minLength != null ? String(field.config.minLength) : '')
    setMaxLength(field.config?.maxLength != null ? String(field.config.maxLength) : '')
    setNumberDecimalPlaces(
      field.config?.numberDecimalPlaces != null ? String(field.config.numberDecimalPlaces) : ''
    )
    setNumberStep(field.config?.numberStep != null ? String(field.config.numberStep) : '')
    const savedDateFormat = field.config?.dateFormat
    setDateFormat(
      savedDateFormat === 'iso' || savedDateFormat === 'us' || savedDateFormat === 'eu' || savedDateFormat === 'long'
        ? savedDateFormat
        : 'long'
    )
    setRatingMax(field.config?.ratingMax != null ? String(field.config.ratingMax) : '')
    setRatingAllowHalf(Boolean(field.config?.ratingAllowHalf))
    setPersonAllowMultiple(Boolean(field.config?.personAllowMultiple))
    setFilesMaxCount(field.config?.filesMaxCount != null ? String(field.config.filesMaxCount) : '')
    setFilesMaxSizeMb(field.config?.filesMaxSizeMb != null ? String(field.config.filesMaxSizeMb) : '')
    setStatusOptionsText(Array.isArray(field.config?.statusOptions) ? field.config.statusOptions.join('\n') : '')

    const validationKey = gridId ? `${gridId}.${field.id}` : ''
    const nextRules = (schema?.validations?.[validationKey] ?? []).map(ensureRuleDefaults)
    setRules(nextRules)
    const nextCalculation = validationKey ? (schema?.calculations?.[validationKey] ?? null) : null
    const nextDependsOn =
      validationKey && schema?.dependsOnByTarget?.[validationKey]
        ? schema.dependsOnByTarget[validationKey]
        : validationKey && Array.isArray(schema?.dependsOn)
          ? schema.dependsOn
            .filter((r) => r?.targets?.includes(validationKey))
            .map((r) => ({
              source: r.source,
              operator: r.operator,
              value: r.value,
              action: r.action,
              set: r.set,
              priority: r.priority,
            }))
          : []
    setDependsOnRules(nextDependsOn)
    setCalculationRule(nextCalculation && nextCalculation.expr ? nextCalculation : null)
    setStructureOpen(false)
    setShowJsonInStructure(false)
    const isBindableField = field.dataType === 'options' || field.dataType === 'multiselect'
    if (isBindableField && bindingKey) {
      const existingBinding = schema?.bindings?.[bindingKey] as TrackerBindingEntry | undefined
      if (existingBinding) {
        setBindingEnabled(true)
        setBindingDraft({
          key: bindingKey,
          optionsSourceSchemaId: existingBinding.optionsSourceSchemaId?.trim() || undefined,
          optionsGrid: existingBinding.optionsGrid ?? '',
          labelField: existingBinding.labelField ?? '',
          fieldMappings: Array.isArray(existingBinding.fieldMappings)
            ? [...existingBinding.fieldMappings]
            : [],
        })
      } else {
        setBindingEnabled(false)
        setBindingDraft(defaultBindingDraft())
      }
    } else {
      setBindingEnabled(false)
      setBindingDraft(null)
    }
    setDynamicOptionsDraft((schema?.dynamicOptions as DynamicOptionsDefinitions | undefined) ?? {})
    setDynamicFunctionId(
      (field.config as { dynamicOptionsFunction?: string } | undefined)?.dynamicOptionsFunction ?? ''
    )
    const dynamicArgs = (field.config as { dynamicOptionsArgs?: Record<string, unknown> } | undefined)
      ?.dynamicOptionsArgs
    setDynamicOptionsArgsText(dynamicArgs ? JSON.stringify(dynamicArgs, null, 2) : '')
    const dynamicTtl = (field.config as { dynamicOptionsCacheTtlSeconds?: number } | undefined)
      ?.dynamicOptionsCacheTtlSeconds
    setDynamicCacheTtlText(
      typeof dynamicTtl === 'number' && Number.isFinite(dynamicTtl) ? String(dynamicTtl) : ''
    )
    setDynamicConfigError(null)
    setDynamicBuilderState({
      canSave: false,
      compileErrors: ['Run preview to validate the dynamic function'],
      previewError: null,
    })
  }, [open, field, schema, gridId, bindingKey, defaultBindingDraft])

  const bindingValidation = useMemo(() => {
    if (!bindingEnabled || !bindingDraft) return { isValid: true, errors: {} as Record<string, string> }
    const sid = bindingDraft.optionsSourceSchemaId?.trim()
    return validateBindingDraft(
      { ...bindingDraft, key: bindingKey },
      {
        existingKeys: new Set(Object.keys(schema?.bindings ?? {})),
        originalKey: bindingKey,
        gridFieldMap,
        sourceGridFieldMap:
          sid && sourceGridFieldMap.size > 0 ? sourceGridFieldMap : undefined,
      }
    )
  }, [
    bindingEnabled,
    bindingDraft,
    bindingKey,
    schema?.bindings,
    gridFieldMap,
    sourceGridFieldMap,
  ])

  const autoPopulateSources = useMemo(() => {
    if (!gridId || !field?.id) return []
    const targetPath = `${gridId}.${field.id}`
    const sources = new Set<string>()
    for (const entry of Object.values(schema?.bindings ?? {})) {
      if (!entry || typeof entry !== 'object') continue
      const mappings = (entry as TrackerBindingEntry).fieldMappings ?? []
      for (const mapping of mappings) {
        if (!mapping || typeof mapping !== 'object') continue
        if (mapping.to === targetPath && typeof mapping.from === 'string') {
          sources.add(mapping.from)
        }
      }
    }
    return Array.from(sources)
  }, [schema?.bindings, gridId, field?.id])

  const validationKey = useMemo(() => (gridId && field ? `${gridId}.${field.id}` : ''), [gridId, field])
  const hasCalculation = Boolean(validationKey && schema?.calculations?.[validationKey]?.expr)
  const dataSourcesList = useMemo((): FieldDataSource[] => {
    const list: FieldDataSource[] = [{ type: 'manual' }]
    if (hasCalculation) list.push({ type: 'calculation' })
    for (const fromPath of autoPopulateSources) {
      list.push({ type: 'auto_populate', fromPath })
    }
    return list
  }, [hasCalculation, autoPopulateSources])

  const typeOptions = useMemo(() => {
    const options = getCreatableFieldTypesWithLabels()
    if (field && !options.some((o) => o.value === field.dataType)) {
      return [
        { value: field.dataType, label: FIELD_TYPE_LABELS[field.dataType] ?? field.dataType, group: 'Other' as const },
        ...options,
      ]
    }
    return options
  }, [field])

  const groupedTypes = useMemo(
    () =>
      typeOptions.reduce<Record<string, typeof typeOptions>>((acc, opt) => {
        const g = opt.group ?? 'Other'
        if (!acc[g]) acc[g] = []
        acc[g].push(opt)
        return acc
      }, {}),
    [typeOptions]
  )

  const updateRule = useCallback((index: number, nextRule: FieldValidationRule) => {
    setRules((prev) => prev.map((r, i) => (i === index ? ensureRuleDefaults(nextRule) : r)))
  }, [])

  const setBindingDraftValue = useCallback((next: BindingDraft) => {
    setBindingDraft(next)
  }, [])

  const applyBindingSourcePick = useCallback(
    (pick: { optionsSourceSchemaId?: string; optionsGrid: string; labelField: string }) => {
      setBindingDraft((prev) => {
        if (!prev) return prev
        const nextSource = pick.optionsSourceSchemaId?.trim() || undefined
        const prevSource = prev.optionsSourceSchemaId?.trim() || undefined
        const gridOrSourceChanged =
          pick.optionsGrid !== prev.optionsGrid || nextSource !== prevSource
        const baseMappings = gridOrSourceChanged ? [] : prev.fieldMappings
        let next: BindingDraft = {
          ...prev,
          optionsSourceSchemaId: nextSource,
          optionsGrid: pick.optionsGrid,
          labelField: pick.labelField,
          fieldMappings: baseMappings,
        }
        const lf = pick.labelField.trim()
        if (lf && bindingKey) {
          next = {
            ...next,
            fieldMappings: ensureValueMapping(normalizeMappings(next.fieldMappings), lf, bindingKey),
          }
        }
        return next
      })
    },
    [bindingKey]
  )

  const applyAutoMappings = useCallback(() => {
    if (!bindingDraft) return
    const existing = normalizeMappings(bindingDraft.fieldMappings)
    const sid = bindingDraft.optionsSourceSchemaId?.trim()
    const suggestions = suggestFieldMappings({
      selectFieldPath: bindingKey,
      optionsGrid: bindingDraft.optionsGrid,
      labelField: bindingDraft.labelField,
      existingMappings: existing,
      gridFieldMap,
      optionsGridFieldMap: sid && sourceGridFieldMap.size > 0 ? sourceGridFieldMap : undefined,
    })
    if (suggestions.length === 0) return
    setBindingDraftValue({ ...bindingDraft, fieldMappings: [...existing, ...suggestions] })
  }, [bindingDraft, bindingKey, gridFieldMap, sourceGridFieldMap, setBindingDraftValue])

  const handleRuleTypeChange = useCallback((index: number, nextType: FieldValidationRule['type']) => {
    setRules((prev) => {
      const next = [...prev]
      const current = prev[index]
      const message = current?.message
      if (nextType === 'expr') {
        next[index] = { type: 'expr', expr: defaultExpr, message }
      } else if (nextType === 'required') {
        next[index] = { type: 'required', message }
      } else {
        next[index] = { type: nextType, value: 0, message }
      }
      return next.map(ensureRuleDefaults)
    })
  }, [])

  const handleSave = useCallback(() => {
    if (!field || !schema || !onSchemaChange) return
    setDynamicConfigError(null)
    const nextConfig: TrackerFieldConfig = {
      ...(field.config ?? {}),
      isRequired,
      isHidden,
      isDisabled,
      prefix: prefix.trim() || undefined,
      min: toNumberOrUndefined(min),
      max: toNumberOrUndefined(max),
      minLength: toNumberOrUndefined(minLength),
      maxLength: toNumberOrUndefined(maxLength),
      numberDecimalPlaces: toNumberOrUndefined(numberDecimalPlaces),
      numberStep: toNumberOrUndefined(numberStep),
      dateFormat,
      ratingMax: toNumberOrUndefined(ratingMax),
      ratingAllowHalf,
      personAllowMultiple,
      filesMaxCount: toNumberOrUndefined(filesMaxCount),
      filesMaxSizeMb: toNumberOrUndefined(filesMaxSizeMb),
    }
    const normalizedStatusOptions = statusOptionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    nextConfig.statusOptions = normalizedStatusOptions.length > 0 ? normalizedStatusOptions : undefined

    const trimmedDefault = defaultValue.trim()
    if (trimmedDefault === '') {
      nextConfig.defaultValue = undefined
    } else {
      if (dataType === 'boolean') {
        if (trimmedDefault === 'true' || trimmedDefault === 'false') {
          nextConfig.defaultValue = trimmedDefault === 'true'
        } else {
          nextConfig.defaultValue = undefined
        }
      } else if (['number', 'currency', 'percentage', 'rating'].includes(dataType)) {
        const n = Number(trimmedDefault)
        nextConfig.defaultValue = Number.isFinite(n) ? n : undefined
      } else {
        nextConfig.defaultValue = trimmedDefault
      }
    }
    if (isDynamicField) {
      if (!dynamicBuilderState.canSave) {
        setDynamicConfigError(
          dynamicBuilderState.previewError ??
          dynamicBuilderState.compileErrors[0] ??
          'Dynamic function must be valid and previewed before saving.'
        )
        return
      }
      nextConfig.dynamicOptionsFunction = dynamicFunctionId.trim() || undefined
      if (dynamicOptionsArgsText.trim()) {
        try {
          const parsed = JSON.parse(dynamicOptionsArgsText)
          if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            setDynamicConfigError('Dynamic args must be a JSON object.')
            return
          }
          nextConfig.dynamicOptionsArgs = parsed as Record<string, unknown>
        } catch {
          setDynamicConfigError('Dynamic args JSON is invalid.')
          return
        }
      } else {
        nextConfig.dynamicOptionsArgs = undefined
      }
      const parsedTtl = dynamicCacheTtlText.trim() === '' ? undefined : Number(dynamicCacheTtlText)
      if (parsedTtl !== undefined) {
        if (!Number.isFinite(parsedTtl) || parsedTtl <= 0) {
          setDynamicConfigError('Cache TTL must be a positive number.')
          return
        }
        nextConfig.dynamicOptionsCacheTtlSeconds = parsedTtl
      } else {
        nextConfig.dynamicOptionsCacheTtlSeconds = undefined
      }
    } else {
      nextConfig.dynamicOptionsFunction = undefined
      nextConfig.dynamicOptionsArgs = undefined
      nextConfig.dynamicOptionsCacheTtlSeconds = undefined
    }

    Object.keys(nextConfig).forEach((key) => {
      if (nextConfig[key as keyof TrackerFieldConfig] === undefined) {
        delete nextConfig[key as keyof TrackerFieldConfig]
      }
    })

    const nextFields = schema.fields.map((f) =>
      f.id === field.id
        ? {
          ...f,
          dataType,
          ui: { ...f.ui, label: label.trim() || f.ui.label, placeholder: placeholder || undefined },
          config: nextConfig,
        }
        : f
    )

    const vKey = gridId ? `${gridId}.${field.id}` : ''
    const nextValidations = { ...(schema.validations ?? {}) }
    if (vKey) {
      if (rules.length > 0) {
        nextValidations[vKey] = rules
      } else {
        delete nextValidations[vKey]
      }
    }
    const nextCalculations = { ...(schema.calculations ?? {}) }
    if (vKey) {
      if (calculationRule?.expr) {
        nextCalculations[vKey] = calculationRule
      } else {
        delete nextCalculations[vKey]
      }
    }

    const nextBindings = { ...(schema.bindings ?? {}) }
    if (bindingKey) {
      if (!isBindable) {
        delete nextBindings[bindingKey]
      } else if (!bindingEnabled) {
        delete nextBindings[bindingKey]
      } else if (bindingDraft) {
        let fieldMappings = normalizeMappings(bindingDraft.fieldMappings)
        fieldMappings = ensureValueMapping(fieldMappings, bindingDraft.labelField, bindingKey)
        const entry: TrackerBindingEntry = {
          optionsGrid: bindingDraft.optionsGrid.trim(),
          labelField: bindingDraft.labelField.trim(),
          fieldMappings,
        }
        const src = bindingDraft.optionsSourceSchemaId?.trim()
        if (src) entry.optionsSourceSchemaId = src
        nextBindings[bindingKey] = entry
      }
    }

    const nextDependsOnByTarget = { ...(schema.dependsOnByTarget ?? {}) }
    if (vKey) {
      const validDependsOnRules = dependsOnRules.filter((r) => r.source?.trim())
      if (validDependsOnRules.length > 0) {
        nextDependsOnByTarget[vKey] = validDependsOnRules
      } else {
        delete nextDependsOnByTarget[vKey]
      }
    }

    onSchemaChange({
      ...schema,
      fields: nextFields,
      validations: Object.keys(nextValidations).length > 0 ? nextValidations : undefined,
      calculations: Object.keys(nextCalculations).length > 0 ? nextCalculations : undefined,
      bindings: nextBindings,
      dependsOnByTarget: Object.keys(nextDependsOnByTarget).length > 0 ? nextDependsOnByTarget : undefined,
      dynamicOptions: dynamicOptionsDraft,
    })

    onOpenChange(false)
  }, [
    field,
    schema,
    onSchemaChange,
    onOpenChange,
    gridId,
    bindingKey,
    dataType,
    label,
    placeholder,
    prefix,
    isRequired,
    isHidden,
    isDisabled,
    defaultValue,
    min,
    max,
    minLength,
    maxLength,
    numberDecimalPlaces,
    numberStep,
    dateFormat,
    ratingMax,
    ratingAllowHalf,
    personAllowMultiple,
    filesMaxCount,
    filesMaxSizeMb,
    statusOptionsText,
    rules,
    calculationRule,
    dependsOnRules,
    bindingEnabled,
    bindingDraft,
    isBindable,
    isDynamicField,
    dynamicBuilderState,
    dynamicFunctionId,
    dynamicOptionsArgsText,
    dynamicCacheTtlText,
    dynamicOptionsDraft,
  ])

  const isNumeric = useMemo(
    () => ['number', 'currency', 'percentage', 'rating'].includes(dataType),
    [dataType]
  )
  const isText = useMemo(
    () => ['string', 'text', 'link', 'email', 'phone', 'url'].includes(dataType),
    [dataType]
  )
  const foreignBindingIncomplete =
    isBindable &&
    bindingEnabled &&
    Boolean(bindingDraft?.optionsSourceSchemaId?.trim()) &&
    (sourceSchemaLoading || !sourceSchema)

  const disableSave =
    (isBindable && bindingEnabled && bindingDraft && !bindingValidation.isValid) ||
    foreignBindingIncomplete ||
    (isDynamicField && !dynamicBuilderState.canSave)

  const resolvePathLabelFn = useCallback(
    (path: string) => resolvePathLabel(path, schema?.grids ?? [], schema?.fields ?? []),
    [schema?.grids, schema?.fields]
  )

  const resolveBindingFromPathLabelFn = useCallback(
    (path: string) => {
      const sid = bindingDraft?.optionsSourceSchemaId?.trim()
      if (sid && sourceSchema) {
        return resolvePathLabel(path, sourceSchema.grids ?? [], sourceSchema.fields ?? [])
      }
      return resolvePathLabel(path, schema?.grids ?? [], schema?.fields ?? [])
    },
    [bindingDraft?.optionsSourceSchemaId, sourceSchema, schema?.grids, schema?.fields]
  )

  /** Data sources card: show linked tracker id for foreign auto-populate, e.g. `Suppliers.students_grid → student_name`. */
  const resolveAutoPopulateFromPathLabelFn = useCallback(
    (fromPath: string) => {
      const inner = resolvePathLabel(fromPath, schema?.grids ?? [], schema?.fields ?? [])
      const targetPath = gridId && field?.id ? `${gridId}.${field.id}` : ''
      if (!targetPath) return inner

      let sourceBinding: TrackerBindingEntry | undefined
      for (const raw of Object.values(schema?.bindings ?? {})) {
        if (!raw || typeof raw !== 'object') continue
        const b = raw as TrackerBindingEntry
        const hit = (b.fieldMappings ?? []).some(
          (m) => m.from === fromPath && m.to === targetPath
        )
        if (hit) {
          sourceBinding = b
          break
        }
      }

      const sid = sourceBinding?.optionsSourceSchemaId?.trim()
      const selfId = ctxTrackerSchemaId?.trim()
      if (!sid || (selfId && sid === selfId)) {
        return inner
      }

      const trackerTitle =
        siblingTrackers.find((t) => t.id === sid)?.name?.trim() || 'Linked tracker'
      const { gridId: optGridId, fieldId: optFieldId } = parsePath(fromPath)
      const pathPart =
        optGridId && optFieldId ? `${optGridId} → ${optFieldId}` : fromPath
      return `${trackerTitle}.${pathPart}`
    },
    [
      schema?.bindings,
      schema?.grids,
      schema?.fields,
      gridId,
      field?.id,
      ctxTrackerSchemaId,
      siblingTrackers,
    ]
  )

  return {
    field,
    schema,
    gridId,
    open,
    onOpenChange,
    label,
    setLabel,
    placeholder,
    setPlaceholder,
    prefix,
    setPrefix,
    dataType,
    setDataType,
    isRequired,
    setIsRequired,
    isHidden,
    setIsHidden,
    isDisabled,
    setIsDisabled,
    defaultValue,
    setDefaultValue,
    min,
    setMin,
    max,
    setMax,
    minLength,
    setMinLength,
    maxLength,
    setMaxLength,
    numberDecimalPlaces,
    setNumberDecimalPlaces,
    numberStep,
    setNumberStep,
    dateFormat,
    setDateFormat,
    ratingMax,
    setRatingMax,
    ratingAllowHalf,
    setRatingAllowHalf,
    personAllowMultiple,
    setPersonAllowMultiple,
    filesMaxCount,
    setFilesMaxCount,
    filesMaxSizeMb,
    setFilesMaxSizeMb,
    statusOptionsText,
    setStatusOptionsText,
    rules,
    setRules,
    updateRule,
    handleRuleTypeChange,
    calculationRule,
    setCalculationRule,
    dependsOnRules,
    setDependsOnRules,
    structureOpen,
    setStructureOpen,
    showJsonInStructure,
    setShowJsonInStructure,
    bindingEnabled,
    setBindingEnabled,
    bindingDraft,
    setBindingDraftValue,
    bindingValidation,
    defaultBindingDraft,
    dynamicOptionsDraft,
    setDynamicOptionsDraft,
    dynamicFunctionId,
    setDynamicFunctionId,
    dynamicOptionsArgsText,
    setDynamicOptionsArgsText,
    dynamicCacheTtlText,
    setDynamicCacheTtlText,
    dynamicConfigError,
    setDynamicConfigError,
    dynamicBuilderState,
    setDynamicBuilderState,
    availableFields,
    validationKey,
    hasCalculation,
    dataSourcesList,
    typeOptions,
    groupedTypes,
    gridFieldMap,
    pathLabelMap,
    optionsGridOptions,
    allGridOptions,
    allFieldPathOptions,
    getGridFieldOptions,
    getBindingSourceGridFieldOptions,
    applyBindingSourcePick,
    applyAutoMappings,
    handleSave,
    isBindable,
    isDynamicField,
    isNumeric,
    isText,
    disableSave,
    resolvePathLabelFn,
    resolveBindingFromPathLabelFn,
    resolveAutoPopulateFromPathLabelFn,
    bindingKey,
    siblingTrackers,
    siblingsLoading,
    sourceSchema,
    sourceSchemaLoading,
    projectIdForBindings: ctxProjectId ?? null,
    currentTrackerSchemaId: ctxTrackerSchemaId ?? null,
    currentTrackerName: schema?.name ?? null,
  }
}
