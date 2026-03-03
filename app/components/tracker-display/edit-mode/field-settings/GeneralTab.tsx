'use client'

import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldWrapper } from '../../shared/FieldWrapper'
import { FIELD_FORM_INPUT_CLASS } from '@/lib/style-utils'
import type { TrackerFieldType } from '../../types'
import { GROUP_ORDER, sourceEntryId, sourceEntryLabel } from './constants'

export interface GeneralTabProps {
  gridId: string | null | undefined
  label: string
  setLabel: (v: string) => void
  placeholder: string
  setPlaceholder: (v: string) => void
  dataSourcesList: Array<{ type: 'manual' } | { type: 'calculation' } | { type: 'auto_populate'; fromPath: string }>
  resolvePathLabelFn: (path: string) => string
  isRequired: boolean
  setIsRequired: (v: boolean) => void
  dataType: TrackerFieldType
  setDataType: (v: TrackerFieldType) => void
  groupedTypes: Record<string, Array<{ value: string; label: string; group?: string }>>
  isNumeric: boolean
  isText: boolean
  min: string
  setMin: (v: string) => void
  max: string
  setMax: (v: string) => void
  minLength: string
  setMinLength: (v: string) => void
  maxLength: string
  setMaxLength: (v: string) => void
}

export function GeneralTab({
  gridId,
  label,
  setLabel,
  placeholder,
  setPlaceholder,
  dataSourcesList,
  resolvePathLabelFn,
  isRequired,
  setIsRequired,
  dataType,
  setDataType,
  groupedTypes,
  isNumeric,
  isText,
  min,
  setMin,
  max,
  setMax,
  minLength,
  setMinLength,
  maxLength,
  setMaxLength,
}: GeneralTabProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          Display
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label
              htmlFor="field-settings-label"
              className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
            >
              Label
            </label>
            <FieldWrapper>
              <Input
                id="field-settings-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={FIELD_FORM_INPUT_CLASS}
              />
            </FieldWrapper>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="field-settings-placeholder"
              className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
            >
              Placeholder
            </label>
            <FieldWrapper>
              <Input
                id="field-settings-placeholder"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                className={FIELD_FORM_INPUT_CLASS}
              />
            </FieldWrapper>
          </div>
        </div>
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-wide">
          <span className="bg-white dark:bg-background px-2 text-muted-foreground">Constraints</span>
        </div>
      </div>
      <div className="space-y-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          Getting Data from
        </p>
        {!gridId ? (
          <p className="text-xs text-muted-foreground">
            Place this field in a grid to see data sources and priority.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {dataSourcesList.map((entry) => (
                <div
                  key={sourceEntryId(entry)}
                  className="rounded-md border border-border/60 bg-muted/40 px-3 py-1 text-xs text-foreground/80"
                  title={sourceEntryId(entry)}
                >
                  {sourceEntryLabel(entry, resolvePathLabelFn)}
                </div>
              ))}
            </div>
            {dataSourcesList.length > 1 && (
              <p className="text-xs text-muted-foreground">
                Note: If multiple sources update this field, the last write wins.
              </p>
            )}
          </>
        )}
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id="field-settings-required"
            checked={isRequired}
            onCheckedChange={(v) => setIsRequired(Boolean(v))}
          />
          <label
            htmlFor="field-settings-required"
            className="text-sm font-medium cursor-pointer"
          >
            Required
          </label>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="field-settings-data-type"
            className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold block"
          >
            Data type
          </label>
          <FieldWrapper className="max-w-xs">
            <Select value={dataType} onValueChange={(v) => setDataType(v as TrackerFieldType)}>
              <SelectTrigger
                id="field-settings-data-type"
                className={FIELD_FORM_INPUT_CLASS}
              >
                <SelectValue />
              </SelectTrigger>
            <SelectContent>
              {GROUP_ORDER.map(
                (groupKey) =>
                  groupedTypes[groupKey]?.length > 0 && (
                    <SelectGroup key={groupKey}>
                      <SelectLabel className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                        {groupKey}
                      </SelectLabel>
                      {groupedTypes[groupKey].map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )
              )}
            </SelectContent>
          </Select>
          </FieldWrapper>
        </div>
        {isNumeric && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="field-settings-min"
                className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
              >
                Min
              </label>
              <FieldWrapper>
                <Input
                  id="field-settings-min"
                  type="number"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  className={FIELD_FORM_INPUT_CLASS}
                />
              </FieldWrapper>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="field-settings-max"
                className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
              >
                Max
              </label>
              <FieldWrapper>
                <Input
                  id="field-settings-max"
                  type="number"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  className={FIELD_FORM_INPUT_CLASS}
                />
              </FieldWrapper>
            </div>
          </div>
        )}
        {isText && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="field-settings-min-length"
                className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
              >
                Min length
              </label>
              <FieldWrapper>
                <Input
                  id="field-settings-min-length"
                  type="number"
                  value={minLength}
                  onChange={(e) => setMinLength(e.target.value)}
                  className={FIELD_FORM_INPUT_CLASS}
                />
              </FieldWrapper>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="field-settings-max-length"
                className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
              >
                Max length
              </label>
              <FieldWrapper>
                <Input
                  id="field-settings-max-length"
                  type="number"
                  value={maxLength}
                  onChange={(e) => setMaxLength(e.target.value)}
                  className={FIELD_FORM_INPUT_CLASS}
                />
              </FieldWrapper>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
