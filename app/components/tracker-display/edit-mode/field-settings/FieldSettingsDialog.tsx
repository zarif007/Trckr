'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Settings2, ShieldCheck, Sigma, ArrowRight, Wand2, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFieldSettingsState } from './useFieldSettingsState'
import type { FieldSettingsDialogProps } from './types'
import { GeneralTab } from './GeneralTab'
import { BindingsTab } from './BindingsTab'
import { CalculationsTab } from './CalculationsTab'
import { DependsOnTab } from './DependsOnTab'
import { ValidationsTab } from './ValidationsTab'
import { DynamicOptionsBuilder } from '../dynamic-options'

export function FieldSettingsDialog(props: FieldSettingsDialogProps) {
  const { defaultTab = 'general', allowedTabs, trackerSchemaId } = props
  const state = useFieldSettingsState(props)
  const {
    open,
    onOpenChange,
    field,
    schema,
    gridId,
    handleSave,
    disableSave,
    rules,
    calculationRule,
    dependsOnRules,
    isBindable,
    isDynamicField,
    bindingEnabled,
  } = state

  const resolvedAllowedTabs =
    allowedTabs && allowedTabs.length > 0
      ? allowedTabs
      : ([
          'general',
          'validations',
          'calculations',
          'dependsOn',
          'bindings',
          'dynamicOptions',
        ] as const)

  const initialTab = resolvedAllowedTabs.includes(defaultTab)
    ? defaultTab
    : resolvedAllowedTabs[0]

  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    if (open) setActiveTab(initialTab)
  }, [open, initialTab, field?.id, gridId])

  if (!open || !field || !schema || !props.onSchemaChange) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col sm:max-w-[720px] p-0 gap-0 overflow-hidden"
      >
        <div className="shrink-0 border-b border-border/40 px-4 py-3 pr-12">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-sm font-medium text-foreground flex items-baseline gap-2 min-w-0">
              <span className="truncate">{field.ui.label || 'Untitled Field'}</span>
              <span className="text-[11px] text-muted-foreground font-mono shrink-0">{field.id}</span>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(v) =>
              setActiveTab(
                v as
                  | 'general'
                  | 'validations'
                  | 'calculations'
                  | 'dependsOn'
                  | 'bindings'
                  | 'dynamicOptions'
              )
            }
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="shrink-0 border-b border-border/50 px-4 py-2 bg-muted/10">
              <TabsList className="w-full h-8">
                {resolvedAllowedTabs.includes('general') && (
                  <TabsTrigger value="general" className="gap-1.5 text-xs">
                    <Settings2 className="h-3.5 w-3.5" />
                    <span>General</span>
                  </TabsTrigger>
                )}
                {resolvedAllowedTabs.includes('validations') && (
                  <TabsTrigger value="validations" className="gap-1.5 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Validations</span>
                    {rules.length > 0 && (
                      <span className="ml-1 h-4 min-w-[16px] px-1 rounded-full text-[10px] font-medium bg-muted text-muted-foreground flex items-center justify-center">
                        {rules.length}
                      </span>
                    )}
                  </TabsTrigger>
                )}
                {resolvedAllowedTabs.includes('calculations') && (
                  <TabsTrigger value="calculations" className="gap-1.5 text-xs">
                    <Sigma className="h-3.5 w-3.5" />
                    <span>Calculations</span>
                    {calculationRule && (
                      <span className="ml-1 h-4 min-w-[16px] px-1 rounded-full text-[10px] font-medium bg-success/15 text-success flex items-center justify-center">
                        1
                      </span>
                    )}
                  </TabsTrigger>
                )}
                {resolvedAllowedTabs.includes('dependsOn') && gridId && field && (
                  <TabsTrigger value="dependsOn" className="gap-1.5 text-xs">
                    <Link2 className="h-3.5 w-3.5" />
                    <span>Depends on</span>
                    {dependsOnRules.length > 0 && (
                      <span className="ml-1 h-4 min-w-[16px] px-1 rounded-full text-[10px] font-medium bg-muted text-muted-foreground flex items-center justify-center">
                        {dependsOnRules.length}
                      </span>
                    )}
                  </TabsTrigger>
                )}
                {resolvedAllowedTabs.includes('bindings') && isBindable && (
                  <TabsTrigger value="bindings" className="gap-1.5 text-xs">
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>Bindings</span>
                    {bindingEnabled && (
                      <span className="ml-1 h-4 min-w-[16px] px-1 rounded-full text-[10px] font-medium bg-success/15 text-success flex items-center justify-center">
                        1
                      </span>
                    )}
                  </TabsTrigger>
                )}
                {resolvedAllowedTabs.includes('dynamicOptions') && isDynamicField && (
                  <TabsTrigger value="dynamicOptions" className="gap-1.5 text-xs">
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>Dynamic</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-4 space-y-4">
                {resolvedAllowedTabs.includes('general') && (
                  <TabsContent value="general" className="mt-0 space-y-5">
                  <GeneralTab
                    gridId={gridId}
                    label={state.label}
                    setLabel={state.setLabel}
                    placeholder={state.placeholder}
                    setPlaceholder={state.setPlaceholder}
                    prefix={state.prefix}
                    setPrefix={state.setPrefix}
                    dataSourcesList={state.dataSourcesList}
                    resolvePathLabelFn={state.resolvePathLabelFn}
                    isRequired={state.isRequired}
                    setIsRequired={state.setIsRequired}
                    isHidden={state.isHidden}
                    setIsHidden={state.setIsHidden}
                    isDisabled={state.isDisabled}
                    setIsDisabled={state.setIsDisabled}
                    defaultValue={state.defaultValue}
                    setDefaultValue={state.setDefaultValue}
                    dataType={state.dataType}
                    setDataType={state.setDataType}
                    groupedTypes={state.groupedTypes}
                    isNumeric={state.isNumeric}
                    isText={state.isText}
                    min={state.min}
                    setMin={state.setMin}
                    max={state.max}
                    setMax={state.setMax}
                    minLength={state.minLength}
                    setMinLength={state.setMinLength}
                    maxLength={state.maxLength}
                    setMaxLength={state.setMaxLength}
                    numberDecimalPlaces={state.numberDecimalPlaces}
                    setNumberDecimalPlaces={state.setNumberDecimalPlaces}
                    numberStep={state.numberStep}
                    setNumberStep={state.setNumberStep}
                    dateFormat={state.dateFormat}
                    setDateFormat={state.setDateFormat}
                    ratingMax={state.ratingMax}
                    setRatingMax={state.setRatingMax}
                    ratingAllowHalf={state.ratingAllowHalf}
                    setRatingAllowHalf={state.setRatingAllowHalf}
                    personAllowMultiple={state.personAllowMultiple}
                    setPersonAllowMultiple={state.setPersonAllowMultiple}
                    filesMaxCount={state.filesMaxCount}
                    setFilesMaxCount={state.setFilesMaxCount}
                    filesMaxSizeMb={state.filesMaxSizeMb}
                    setFilesMaxSizeMb={state.setFilesMaxSizeMb}
                    statusOptionsText={state.statusOptionsText}
                    setStatusOptionsText={state.setStatusOptionsText}
                  />
                  </TabsContent>
                )}

                {resolvedAllowedTabs.includes('bindings') && isBindable && (
                  <TabsContent value="bindings" className="mt-5 space-y-5">
                    <BindingsTab
                      gridId={gridId}
                      schema={schema}
                      bindingKey={state.bindingKey}
                      resolvePathLabelFn={state.resolvePathLabelFn}
                      resolveBindingFromPathLabelFn={state.resolveBindingFromPathLabelFn}
                      bindingEnabled={state.bindingEnabled}
                      setBindingEnabled={state.setBindingEnabled}
                      bindingDraft={state.bindingDraft}
                      setBindingDraftValue={state.setBindingDraftValue}
                      defaultBindingDraft={state.defaultBindingDraft}
                      bindingValidation={state.bindingValidation}
                      getGridFieldOptions={state.getGridFieldOptions}
                      getBindingSourceGridFieldOptions={state.getBindingSourceGridFieldOptions}
                      allFieldPathOptions={state.allFieldPathOptions}
                      applyAutoMappings={state.applyAutoMappings}
                      applyBindingSourcePick={state.applyBindingSourcePick}
                      projectIdForBindings={state.projectIdForBindings}
                      currentTrackerSchemaId={state.currentTrackerSchemaId}
                      currentTrackerName={state.currentTrackerName}
                      siblingTrackers={state.siblingTrackers}
                      siblingsLoading={state.siblingsLoading}
                      sourceSchema={state.sourceSchema}
                      sourceSchemaLoading={state.sourceSchemaLoading}
                    />
                  </TabsContent>
                )}

                {resolvedAllowedTabs.includes('dynamicOptions') && isDynamicField && (
                  <TabsContent value="dynamicOptions" className="mt-5 space-y-5">
                    <DynamicOptionsBuilder
                      schema={schema}
                      fieldId={field.id}
                      functionId={state.dynamicFunctionId}
                      onFunctionIdChange={state.setDynamicFunctionId}
                      argsText={state.dynamicOptionsArgsText}
                      onArgsTextChange={state.setDynamicOptionsArgsText}
                      cacheTtlText={state.dynamicCacheTtlText}
                      onCacheTtlTextChange={state.setDynamicCacheTtlText}
                      dynamicOptionsDraft={state.dynamicOptionsDraft}
                      onDynamicOptionsDraftChange={state.setDynamicOptionsDraft}
                      onValidationStateChange={state.setDynamicBuilderState}
                      trackerSchemaId={trackerSchemaId ?? undefined}
                    />
                    {state.dynamicConfigError && (
                      <p className="text-xs text-destructive">{state.dynamicConfigError}</p>
                    )}
                  </TabsContent>
                )}

                {resolvedAllowedTabs.includes('calculations') && (
                  <TabsContent value="calculations" className="mt-5 space-y-5">
                  <CalculationsTab
                    gridId={gridId}
                    schema={schema}
                    field={field}
                    calculationRule={state.calculationRule}
                    setCalculationRule={state.setCalculationRule}
                    availableFields={state.availableFields}
                    trackerSchemaId={trackerSchemaId ?? undefined}
                  />
                  </TabsContent>
                )}

                {resolvedAllowedTabs.includes('dependsOn') && gridId && field && (
                  <TabsContent value="dependsOn" className="mt-5 space-y-5">
                    <DependsOnTab
                      gridId={gridId}
                      field={field}
                      dependsOnRules={state.dependsOnRules}
                      setDependsOnRules={state.setDependsOnRules}
                      allFieldPathOptions={state.allFieldPathOptions}
                      pathLabelMap={state.pathLabelMap}
                      resolvePathLabelFn={state.resolvePathLabelFn}
                    />
                  </TabsContent>
                )}

                {resolvedAllowedTabs.includes('validations') && (
                  <TabsContent value="validations" className="mt-5 space-y-5">
                  <ValidationsTab
                    gridId={gridId}
                    schema={schema}
                    field={field}
                    rules={state.rules}
                    setRules={state.setRules}
                    updateRule={state.updateRule}
                    handleRuleTypeChange={state.handleRuleTypeChange}
                    availableFields={state.availableFields}
                    structureOpen={state.structureOpen}
                    setStructureOpen={state.setStructureOpen}
                    showJsonInStructure={state.showJsonInStructure}
                    setShowJsonInStructure={state.setShowJsonInStructure}
                    trackerSchemaId={trackerSchemaId ?? undefined}
                  />
                  </TabsContent>
                )}
              </div>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="shrink-0 flex-row justify-end gap-2 px-4 py-3 border-t border-border/50 bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8"
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="h-8" disabled={disableSave ?? false}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
