'use client'

import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  isHidden: boolean
  setIsHidden: (v: boolean) => void
  isDisabled: boolean
  setIsDisabled: (v: boolean) => void
  defaultValue: string
  setDefaultValue: (v: string) => void
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
  isHidden,
  setIsHidden,
  isDisabled,
  setIsDisabled,
  defaultValue,
  setDefaultValue,
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
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Display
          </CardTitle>
          <CardDescription className="text-xs">
            Control how this field is labeled in the UI.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Behavior
          </CardTitle>
          <CardDescription className="text-xs">
            Control whether this field is required, hidden, or read-only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
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
              <p className="text-[11px] text-muted-foreground">
                Show an asterisk and validate that a value is provided.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="field-settings-hidden"
                  checked={isHidden}
                  onCheckedChange={(v) => setIsHidden(Boolean(v))}
                />
                <label
                  htmlFor="field-settings-hidden"
                  className="text-sm font-medium cursor-pointer"
                >
                  Hidden
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Hide this field from forms and grid views.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="field-settings-disabled"
                  checked={isDisabled}
                  onCheckedChange={(v) => setIsDisabled(Boolean(v))}
                />
                <label
                  htmlFor="field-settings-disabled"
                  className="text-sm font-medium cursor-pointer"
                >
                  Disabled
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Keep the field visible but make it read-only.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Default value
          </CardTitle>
          <CardDescription className="text-xs">
            Optional value to pre-fill when creating a new row.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <label
              htmlFor="field-settings-default-value"
              className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
            >
              Default value
            </label>
            <FieldWrapper>
              <Input
                id="field-settings-default-value"
                type={isNumeric ? 'number' : 'text'}
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder={
                  dataType === 'boolean'
                    ? 'true, false, or leave blank'
                    : isNumeric
                      ? 'Enter a number or leave blank'
                      : 'Leave blank for no default'
                }
                className={FIELD_FORM_INPUT_CLASS}
              />
            </FieldWrapper>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Data type & constraints
          </CardTitle>
          <CardDescription className="text-xs">
            Choose how this field stores data and any limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Data sources
          </CardTitle>
          <CardDescription className="text-xs">
            See where values for this field can come from.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                <p className="mt-2 text-xs text-muted-foreground">
                  If multiple sources update this field, the last write wins.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
