/** Default font size for table cells/inputs when no override is set. */
export const DEFAULT_INPUT_FONT_CLASS = "text-[13px]";

/**
 * Base class for inner field inputs (string, number, date trigger, select, etc.)
 * so div grid and form dialogs share the same look. Border/ring removed; wrapper provides border.
 */
export const FIELD_INNER_INPUT_BASE_CLASS =
  "border-0 bg-transparent dark:bg-transparent focus-visible:ring-0 focus-visible:border-0 rounded-sm";

/** Full class for form/dialog field inputs (e.g. field settings tabs). Use inside FieldWrapper. */
export const FIELD_FORM_INPUT_CLASS = `${FIELD_INNER_INPUT_BASE_CLASS} h-10 w-full min-w-0 px-3`;

