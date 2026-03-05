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

export function useFieldSettingsState({
  open,
  onOpenChange,
  fieldId,
  gridId,
  schema,
  onSchemaChange,
}: FieldSettingsDialogProps) {
  const field = useMemo(() => {
    if (!schema || !fieldId) return null
    return schema.fields.find((f) => f.id === fieldId) ?? null
  }, [schema, fieldId])

  const [label, setLabel] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [dataType, setDataType] = useState<TrackerFieldType>('string')
  const [isRequired, setIsRequired] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [isDisabled, setIsDisabled] = useState(false)
  const [defaultValue, setDefaultValue] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [minLength, setMinLength] = useState('')
  const [maxLength, setMaxLength] = useState('')
  const [rules, setRules] = useState<FieldValidationRule[]>([])
  const [calculationRule, setCalculationRule] = useState<FieldCalculationRule | null>(null)
  const [dependsOnRules, setDependsOnRules] = useState<DependsOnRuleForTarget[]>([])
  const [structureOpen, setStructureOpen] = useState(false)
  const [showJsonInStructure, setShowJsonInStructure] = useState(false)
  const [bindingEnabled, setBindingEnabled] = useState(false)
  const [bindingDraft, setBindingDraft] = useState<BindingDraft | null>(null)
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
    return validateBindingDraft(
      { ...bindingDraft, key: bindingKey },
      {
        existingKeys: new Set(Object.keys(schema?.bindings ?? {})),
        originalKey: bindingKey,
        gridFieldMap,
      }
    )
  }, [bindingEnabled, bindingDraft, bindingKey, schema?.bindings, gridFieldMap])

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

  const applyAutoMappings = useCallback(() => {
    if (!bindingDraft) return
    const existing = normalizeMappings(bindingDraft.fieldMappings)
    const suggestions = suggestFieldMappings({
      selectFieldPath: bindingKey,
      optionsGrid: bindingDraft.optionsGrid,
      labelField: bindingDraft.labelField,
      existingMappings: existing,
      gridFieldMap,
    })
    if (suggestions.length === 0) return
    setBindingDraftValue({ ...bindingDraft, fieldMappings: [...existing, ...suggestions] })
  }, [bindingDraft, bindingKey, gridFieldMap, setBindingDraftValue])

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
      min: toNumberOrUndefined(min),
      max: toNumberOrUndefined(max),
      minLength: toNumberOrUndefined(minLength),
      maxLength: toNumberOrUndefined(maxLength),
    }

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
      } else if (['number', 'currency', 'percentage'].includes(dataType)) {
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
        nextBindings[bindingKey] = {
          optionsGrid: bindingDraft.optionsGrid.trim(),
          labelField: bindingDraft.labelField.trim(),
          fieldMappings,
        }
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
    isRequired,
    isHidden,
    isDisabled,
    defaultValue,
    min,
    max,
    minLength,
    maxLength,
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
    () => ['number', 'currency', 'percentage'].includes(dataType),
    [dataType]
  )
  const isText = useMemo(
    () => ['string', 'text', 'link'].includes(dataType),
    [dataType]
  )
  const disableSave =
    (isBindable && bindingEnabled && bindingDraft && !bindingValidation.isValid) ||
    (isDynamicField && !dynamicBuilderState.canSave)

  const resolvePathLabelFn = useCallback(
    (path: string) => resolvePathLabel(path, schema?.grids ?? [], schema?.fields ?? []),
    [schema?.grids, schema?.fields]
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
    applyAutoMappings,
    handleSave,
    isBindable,
    isDynamicField,
    isNumeric,
    isText,
    disableSave,
    resolvePathLabelFn,
    bindingKey,
  }
}
