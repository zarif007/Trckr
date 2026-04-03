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
 prefix: string
 setPrefix: (v: string) => void
 dataSourcesList: Array<{ type: 'manual' } | { type: 'calculation' } | { type: 'auto_populate'; fromPath: string }>
 resolvePathLabelFn: (path: string) => string
 /** Foreign auto-populate: prefix with linked tracker name (see useFieldSettingsState). */
 resolveAutoPopulateFromPathLabelFn: (fromPath: string) => string
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
 numberDecimalPlaces: string
 setNumberDecimalPlaces: (v: string) => void
 numberStep: string
 setNumberStep: (v: string) => void
 dateFormat: 'iso' | 'us' | 'eu' | 'long'
 setDateFormat: (v: 'iso' | 'us' | 'eu' | 'long') => void
 ratingMax: string
 setRatingMax: (v: string) => void
 ratingAllowHalf: boolean
 setRatingAllowHalf: (v: boolean) => void
 personAllowMultiple: boolean
 setPersonAllowMultiple: (v: boolean) => void
 filesMaxCount: string
 setFilesMaxCount: (v: string) => void
 filesMaxSizeMb: string
 setFilesMaxSizeMb: (v: string) => void
 statusOptionsText: string
 setStatusOptionsText: (v: string) => void
}

export function GeneralTab({
 gridId,
 label,
 setLabel,
 placeholder,
 setPlaceholder,
 prefix,
 setPrefix,
 dataSourcesList,
 resolvePathLabelFn,
 resolveAutoPopulateFromPathLabelFn,
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
 <div className="mt-4 max-w-xs space-y-2">
 <label
 htmlFor="field-settings-prefix"
 className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
 >
 Prefix
 </label>
 <FieldWrapper>
 <Input
 id="field-settings-prefix"
 value={prefix}
 onChange={(e) => setPrefix(e.target.value)}
 className={FIELD_FORM_INPUT_CLASS}
 placeholder="e.g. $"
 />
 </FieldWrapper>
 <p className="text-[11px] text-muted-foreground">
 Shown before the value in inputs and display (e.g. currency symbol).
 </p>
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
 : dataType === 'email'
 ? 'e.g. jane@example.com'
 : dataType === 'phone'
 ? 'e.g. +1 555 123 4567'
 : dataType === 'url' || dataType === 'link'
 ? 'e.g. https://example.com'
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

 {isNumeric && (
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label
 htmlFor="field-settings-decimals"
 className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
 >
 Decimal places
 </label>
 <FieldWrapper>
 <Input
 id="field-settings-decimals"
 type="number"
 min={0}
 value={numberDecimalPlaces}
 onChange={(e) => setNumberDecimalPlaces(e.target.value)}
 className={FIELD_FORM_INPUT_CLASS}
 />
 </FieldWrapper>
 </div>
 <div className="space-y-2">
 <label
 htmlFor="field-settings-step"
 className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
 >
 Step
 </label>
 <FieldWrapper>
 <Input
 id="field-settings-step"
 type="number"
 min={0}
 value={numberStep}
 onChange={(e) => setNumberStep(e.target.value)}
 className={FIELD_FORM_INPUT_CLASS}
 />
 </FieldWrapper>
 </div>
 </div>
 )}

 {dataType === 'date' && (
 <div className="space-y-2 max-w-xs">
 <label
 htmlFor="field-settings-date-format"
 className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
 >
 Date format
 </label>
 <FieldWrapper>
 <Select
 value={dateFormat}
 onValueChange={(v) => setDateFormat(v as 'iso' | 'us' | 'eu' | 'long')}
 >
 <SelectTrigger id="field-settings-date-format" className={FIELD_FORM_INPUT_CLASS}>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="long">Long (Jan 31, 2026)</SelectItem>
 <SelectItem value="us">US (01/31/2026)</SelectItem>
 <SelectItem value="eu">EU (31/01/2026)</SelectItem>
 <SelectItem value="iso">ISO (2026-01-31)</SelectItem>
 </SelectContent>
 </Select>
 </FieldWrapper>
 </div>
 )}

 {dataType === 'rating' && (
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
 <div className="space-y-2">
 <label
 htmlFor="field-settings-rating-max"
 className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
 >
 Max rating
 </label>
 <FieldWrapper>
 <Input
 id="field-settings-rating-max"
 type="number"
 min={1}
 value={ratingMax}
 onChange={(e) => setRatingMax(e.target.value)}
 className={FIELD_FORM_INPUT_CLASS}
 />
 </FieldWrapper>
 </div>
 <div className="space-y-1.5 self-end pb-1">
 <div className="flex items-center gap-3">
 <Checkbox
 id="field-settings-rating-half"
 checked={ratingAllowHalf}
 onCheckedChange={(v) => setRatingAllowHalf(Boolean(v))}
 />
 <label htmlFor="field-settings-rating-half" className="text-sm font-medium cursor-pointer">
 Allow half steps
 </label>
 </div>
 </div>
 </div>
 )}

 {dataType === 'person' && (
 <div className="space-y-1.5">
 <div className="flex items-center gap-3">
 <Checkbox
 id="field-settings-person-multi"
 checked={personAllowMultiple}
 onCheckedChange={(v) => setPersonAllowMultiple(Boolean(v))}
 />
 <label htmlFor="field-settings-person-multi" className="text-sm font-medium cursor-pointer">
 Allow multiple people
 </label>
 </div>
 </div>
 )}

 {dataType === 'files' && (
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label
 htmlFor="field-settings-files-max-count"
 className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
 >
 Max files
 </label>
 <FieldWrapper>
 <Input
 id="field-settings-files-max-count"
 type="number"
 min={1}
 value={filesMaxCount}
 onChange={(e) => setFilesMaxCount(e.target.value)}
 className={FIELD_FORM_INPUT_CLASS}
 />
 </FieldWrapper>
 </div>
 <div className="space-y-2">
 <label
 htmlFor="field-settings-files-max-size"
 className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
 >
 Max size (MB)
 </label>
 <FieldWrapper>
 <Input
 id="field-settings-files-max-size"
 type="number"
 min={1}
 value={filesMaxSizeMb}
 onChange={(e) => setFilesMaxSizeMb(e.target.value)}
 className={FIELD_FORM_INPUT_CLASS}
 />
 </FieldWrapper>
 </div>
 </div>
 )}

 {dataType === 'status' && (
 <div className="space-y-2">
 <label
 htmlFor="field-settings-status-options"
 className="text-xs font-semibold tracking-wide text-foreground/90 leading-none uppercase"
 >
 Status options (one per line)
 </label>
 <FieldWrapper>
 <textarea
 id="field-settings-status-options"
 value={statusOptionsText}
 onChange={(e) => setStatusOptionsText(e.target.value)}
 className={`${FIELD_FORM_INPUT_CLASS} min-h-[96px]`}
 />
 </FieldWrapper>
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
 className="rounded-sm border border-border/60 bg-muted/40 px-3 py-1 text-xs text-foreground/80"
 title={sourceEntryId(entry)}
 >
 {sourceEntryLabel(entry, resolvePathLabelFn, resolveAutoPopulateFromPathLabelFn)}
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
