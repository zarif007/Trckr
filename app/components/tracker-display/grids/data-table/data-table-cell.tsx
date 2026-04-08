import { Cell, Row, flexRender } from "@tanstack/react-table";
import { TableCell } from "@/components/ui/table";
import { DataTableInput } from "./data-table-input";
import { FieldMetadata, validateField } from "./utils";
import { cn } from "@/lib/utils";
import { DEFAULT_INPUT_FONT_CLASS } from "@/lib/field-input-classes";
import { applyFieldOverrides } from "@/lib/field-rules";
import type { FieldRuleOverride } from "@/lib/field-rules";
import {
  useCellValidation,
  getValidationDisplayState,
} from "@/lib/field-validation";

interface DataTableCellProps<TData> {
  cell: Cell<TData, any>;
  row: Row<TData>;
  fieldMetadata?: FieldMetadata;
  rowValues: Record<string, unknown>;
  rowOverrides?: Record<string, FieldRuleOverride>;
}

export function DataTableCell<TData>({
  cell,
  row,
  fieldMetadata,
  rowValues,
  rowOverrides,
}: DataTableCellProps<TData>) {
  const isSelect = cell.column.id === "select";
  const fieldInfo = fieldMetadata?.[cell.column.id];
  const meta = cell.getContext().table.options.meta as {
    updateData?: (rowIndex: number, columnId: string, value: any) => void;
    getFieldOverrides?: (
      rowIndex: number,
      fieldId: string,
    ) => FieldRuleOverride | undefined;
    editable?: boolean;
    gridId?: string;
  };
  const isEditable = meta?.editable !== false;
  const overrides =
    rowOverrides?.[cell.column.id] ??
    meta?.getFieldOverrides?.(row.index, cell.column.id);
  const effectiveConfig = fieldInfo
    ? applyFieldOverrides(
        fieldInfo.config as Record<string, unknown> | null | undefined,
        overrides,
      )
    : undefined;
  const isHidden = !!effectiveConfig?.isHidden;
  const isDisabled = !!effectiveConfig?.isDisabled;
  const overrideValue =
    overrides && "value" in overrides
      ? (overrides as { value?: unknown }).value
      : undefined;

  const cellValue = cell.getValue();
  const initialValue =
    overrideValue !== undefined ? overrideValue : cellValue;

  // Use centralized cell validation hook for state management
  const cellState = useCellValidation({ initialValue });

  // Sync with external value changes (from calculations or parent updates)
  const externalValue =
    overrideValue !== undefined ? overrideValue : cellValue;
  if (!Object.is(cellState.value, externalValue)) {
    cellState.syncFromExternal(externalValue);
  }

  const handleUpdate = (
    newValue: any,
    options?: { bindingUpdates?: Record<string, unknown> },
  ) => {
    cellState.setValue(newValue);
    meta?.updateData?.(row.index, cell.column.id, newValue);
    const bindingUpdates = options?.bindingUpdates ?? {};
    Object.entries(bindingUpdates).forEach(([fieldId, val]) =>
      meta?.updateData?.(row.index, fieldId, val),
    );
  };

  const validationResult = fieldInfo
    ? validateField({
        value: cellState.value,
        fieldId: cell.column.id,
        fieldType: fieldInfo.type,
        config: effectiveConfig,
        rules: fieldInfo.validations,
        rowValues,
      })
    : {
        error: null,
        warning: null,
        issues: [],
        hasError: false,
        hasWarning: false,
      };

  // Use centralized display state logic
  const { showError, showWarning } = getValidationDisplayState({
    result: validationResult,
    value: cellState.value,
    hasInteracted: cellState.dirty,
  });
  const isMultiselect =
    fieldInfo?.type === "multiselect" ||
    fieldInfo?.type === "dynamic_multiselect";
  const isFieldMappings = fieldInfo?.type === "field_mappings";
  const isTextareaType =
    fieldInfo?.type === "text" || fieldInfo?.type === "files";

  return (
    <TableCell
      style={{
        width: isSelect ? "44px" : undefined,
        minWidth: isSelect ? "44px" : "150px",
        ...(isMultiselect && { maxWidth: "150px" }),
      }}
      className={cn(
        "p-0 h-10 border-r border-border/50 last:border-r-0 relative group/cell transition-colors",
        !isSelect && "cursor-text hover:bg-muted/50 focus-within:bg-muted",
        (isMultiselect || isFieldMappings || isTextareaType) &&
          "overflow-hidden",
        showError && "ring-2 ring-destructive ring-inset",
        showWarning && "ring-2 ring-warning/50 ring-inset",
      )}
      title={
        showError
          ? validationResult.error!
          : showWarning
            ? validationResult.warning!
            : undefined
      }
    >
      {isSelect ? (
        <div className="flex items-center justify-center w-full h-full">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      ) : fieldInfo ? (
        isHidden ? null : (
          <div
            className={cn(
              (isMultiselect || isFieldMappings || isTextareaType) &&
                "min-w-0 overflow-hidden w-full",
              "h-full min-h-0",
            )}
          >
            <DataTableInput
              value={cellState.value}
              onChange={handleUpdate}
              type={fieldInfo.type}
              options={fieldInfo.options}
              config={effectiveConfig}
              disabled={
                !isEditable || isDisabled || overrideValue !== undefined
              }
              onAddOption={fieldInfo.onAddOption}
              optionsGridFields={fieldInfo.optionsGridFields}
              getBindingUpdatesFromRow={fieldInfo.getBindingUpdatesFromRow}
              optionsSourceLabel={fieldInfo.optionsGridName}
              compact
            />
          </div>
        )
      ) : (
        <div
          className={cn(
            "w-full h-full px-4 flex items-center text-foreground/90",
            DEFAULT_INPUT_FONT_CLASS,
          )}
        >
          <span className="truncate">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </span>
        </div>
      )}
    </TableCell>
  );
}
