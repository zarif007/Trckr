/** Split "gridId.fieldId" into parts for API / prompt context. */
export function parseFieldPath(fieldPath: string): {
  gridId: string;
  fieldId: string;
} {
  const dotIndex = fieldPath.indexOf(".");
  if (dotIndex <= 0 || dotIndex === fieldPath.length - 1) {
    return { gridId: fieldPath, fieldId: "" };
  }
  return {
    gridId: fieldPath.slice(0, dotIndex),
    fieldId: fieldPath.slice(dotIndex + 1),
  };
}
