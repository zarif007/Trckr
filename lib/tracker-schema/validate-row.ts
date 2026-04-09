/**
 * Row data validation against tracker field definitions.
 *
 * Dynamically builds a validator from field metadata and checks
 * the GridRow `data` JSONB before writes. Uses an LRU cache to
 * avoid rebuilding validators on every call.
 */

type FieldDef = {
  slug: string;
  dataType: string;
  config?: unknown;
};

type LayoutDef = {
  gridId: string;
  fieldId: string;
};

export interface RowValidationError {
  fieldSlug: string;
  message: string;
}

export interface RowValidationResult {
  valid: boolean;
  errors: RowValidationError[];
}

type CompiledValidator = {
  fieldSlugs: Set<string>;
  validators: Map<string, (value: unknown) => string | null>;
};

const validatorCache = new Map<string, { version: number; validator: CompiledValidator }>();
const MAX_CACHE_SIZE = 200;

function evictOldestIfNeeded(): void {
  if (validatorCache.size <= MAX_CACHE_SIZE) return;
  const firstKey = validatorCache.keys().next().value;
  if (firstKey) validatorCache.delete(firstKey);
}

function buildFieldValidator(dataType: string): (value: unknown) => string | null {
  switch (dataType) {
    case "number":
    case "currency":
    case "percent":
      return (value) => {
        if (value === null || value === undefined || value === "") return null;
        if (typeof value === "number") return null;
        if (typeof value === "string" && !isNaN(Number(value))) return null;
        return `Expected a number, got ${typeof value}`;
      };

    case "date":
    case "datetime":
      return (value) => {
        if (value === null || value === undefined || value === "") return null;
        if (typeof value === "string" && !isNaN(Date.parse(value))) return null;
        if (typeof value === "number") return null;
        return `Expected a date string, got ${typeof value}`;
      };

    case "boolean":
    case "checkbox":
      return (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === "boolean") return null;
        if (value === "true" || value === "false") return null;
        if (value === 0 || value === 1) return null;
        return `Expected a boolean, got ${typeof value}`;
      };

    case "select":
    case "multi-select":
      return (value) => {
        if (value === null || value === undefined || value === "") return null;
        if (typeof value === "string") return null;
        if (Array.isArray(value)) return null;
        return `Expected a string or array, got ${typeof value}`;
      };

    case "json":
    case "object":
      return (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === "object") return null;
        if (typeof value === "string") {
          try { JSON.parse(value); return null; } catch { return "Expected valid JSON"; }
        }
        return `Expected an object, got ${typeof value}`;
      };

    default:
      return () => null;
  }
}

function compileValidator(
  fields: FieldDef[],
  layouts: LayoutDef[],
  gridId: string,
): CompiledValidator {
  const fieldsBySlug = new Map(fields.map((f) => [f.slug, f]));
  const fieldSlugs = new Set<string>();
  const validators = new Map<string, (value: unknown) => string | null>();

  for (const ln of layouts) {
    if (ln.gridId !== gridId) continue;
    const field = fieldsBySlug.get(ln.fieldId);
    if (!field) continue;
    fieldSlugs.add(field.slug);
    validators.set(field.slug, buildFieldValidator(field.dataType));
  }

  return { fieldSlugs, validators };
}

export function getCompiledValidator(
  trackerId: string,
  gridId: string,
  schemaVersion: number,
  fields: FieldDef[],
  layouts: LayoutDef[],
): CompiledValidator {
  const cacheKey = `${trackerId}:${gridId}`;
  const cached = validatorCache.get(cacheKey);
  if (cached && cached.version === schemaVersion) {
    return cached.validator;
  }

  const validator = compileValidator(fields, layouts, gridId);
  evictOldestIfNeeded();
  validatorCache.set(cacheKey, { version: schemaVersion, validator });
  return validator;
}

export function validateRowData(
  data: Record<string, unknown>,
  validator: CompiledValidator,
): RowValidationResult {
  const errors: RowValidationError[] = [];

  for (const [slug, validate] of validator.validators) {
    const value = data[slug];
    const error = validate(value);
    if (error) {
      errors.push({ fieldSlug: slug, message: error });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function clearValidatorCache(): void {
  validatorCache.clear();
}
