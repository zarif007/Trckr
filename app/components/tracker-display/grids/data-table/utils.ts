import {
  Type,
  Hash,
  Calendar,
  AlignLeft,
  CheckSquare,
  List,
  Tags,
  Link,
  DollarSign,
  Percent,
  Mail,
  Phone,
  Users,
  Files,
  Star,
  CircleDot,
} from "lucide-react";
import type {
  FieldCalculationRule,
  FieldValidationRule,
} from "@/lib/functions/types";
import type { TrackerFieldType } from "@/lib/tracker-field-types";

export type FieldType = TrackerFieldType;

export interface FieldConfig {
  isRequired?: boolean;
  isDisabled?: boolean;
  isHidden?: boolean;
  /** Optional visual prefix shown before the value (e.g. "$"). */
  prefix?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  numberDecimalPlaces?: number;
  numberStep?: number;
  dateFormat?: "iso" | "us" | "eu" | "long";
  ratingMax?: number;
  ratingAllowHalf?: boolean;
  personAllowMultiple?: boolean;
  filesMaxCount?: number;
  filesMaxSizeMb?: number;
  statusOptions?: string[];
}

/** Sanitize value to fit config (clamp numbers, truncate strings). Returns value unchanged if no config. */
export function sanitizeValue(
  value: unknown,
  type: FieldType,
  config?: FieldConfig | null,
): unknown {
  if (!config) return value;
  switch (type) {
    case "string":
    case "text": {
      const s = typeof value === "string" ? value : String(value ?? "");
      if (typeof config.maxLength === "number" && s.length > config.maxLength)
        return s.slice(0, config.maxLength);
      return s;
    }
    case "number":
    case "currency":
    case "percentage":
    case "rating": {
      if (value === "" || value === undefined || value === null) return value;
      const n = typeof value === "number" ? value : parseFloat(String(value));
      if (Number.isNaN(n)) return value;
      let out = n;
      if (typeof config.min === "number" && out < config.min) out = config.min;
      const maxValue =
        type === "rating" && typeof config.ratingMax === "number"
          ? config.ratingMax
          : config.max;
      if (typeof maxValue === "number" && out > maxValue) out = maxValue;
      if (typeof config.numberStep === "number" && config.numberStep > 0) {
        out = Math.round(out / config.numberStep) * config.numberStep;
      }
      if (
        typeof config.numberDecimalPlaces === "number" &&
        config.numberDecimalPlaces >= 0
      ) {
        out = Number(out.toFixed(config.numberDecimalPlaces));
      }
      return out;
    }
    case "status": {
      const normalized = String(value ?? "").trim();
      if (!normalized) return "";
      if (
        Array.isArray(config.statusOptions) &&
        config.statusOptions.length > 0
      ) {
        return config.statusOptions.includes(normalized) ? normalized : "";
      }
      return normalized;
    }
    case "files": {
      if (!Array.isArray(value)) return [];
      let files = value.map((entry) => String(entry).trim()).filter(Boolean);
      if (
        typeof config.filesMaxCount === "number" &&
        config.filesMaxCount > 0
      ) {
        files = files.slice(0, config.filesMaxCount);
      }
      return files;
    }
    case "person": {
      if (config.personAllowMultiple) {
        if (Array.isArray(value))
          return value.map((entry) => String(entry).trim()).filter(Boolean);
        const list = String(value ?? "")
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
        return list;
      }
      return String(value ?? "").trim();
    }
    default:
      return value;
  }
}

/** Field definition for the "Add option" form (one per column in the options grid). */
export interface OptionsGridFieldDef {
  id: string;
  label: string;
  type: FieldType;
  config?: FieldConfig;
  validations?: FieldValidationRule[];
  calculation?: FieldCalculationRule;
}

export interface LazyOptionsConfig {
  trackerId: string;
  gridId: string;
  labelField: string;
  valueField?: string;
  branchName?: string;
}

export interface FieldMetadata {
  [key: string]: {
    name: string;
    type: FieldType;
    options?: (string | { id: string; label: string })[];
    config?: FieldConfig;
    validations?: FieldValidationRule[];
    calculation?: FieldCalculationRule;
    /** Fields to show in the Add Option form (columns of the options grid). When set with onAddOption, dialog collects all values. */
    optionsGridFields?: OptionsGridFieldDef[];
    /** When set, select/multiselect shows "Add option". Pass full row (all option grid field values); returns the new option value for the select. */
    onAddOption?: (row: Record<string, unknown>) => string;
    /** When adding an option, compute binding updates from the new row (for auto-populate in Add Entry dialog). */
    getBindingUpdatesFromRow?: (
      row: Record<string, unknown>,
    ) => Record<string, unknown>;
    /** Name of the options grid/table (for empty state: "No data. From table: X"). */
    optionsGridName?: string;
    /** Lazy loading configuration for select fields with bindings (mutually exclusive with static options). */
    lazyOptions?: LazyOptionsConfig;
    /** Pre-selected values to always include in lazy loading (even if not in current page). */
    preSelectedValues?: string[];
  };
}

export { getValidationError, validateField } from "@/lib/field-validation";

export const getFieldIcon = (type: FieldType) => {
  switch (type) {
    case "string":
      return Type;
    case "number":
      return Hash;
    case "date":
      return Calendar;
    case "text":
      return AlignLeft;
    case "boolean":
      return CheckSquare;
    case "options":
    case "dynamic_select":
      return List;
    case "multiselect":
    case "dynamic_multiselect":
    case "field_mappings":
      return Tags;
    case "link":
    case "url":
      return Link;
    case "email":
      return Mail;
    case "phone":
      return Phone;
    case "person":
      return Users;
    case "files":
      return Files;
    case "rating":
      return Star;
    case "status":
      return CircleDot;
    case "currency":
      return DollarSign;
    case "percentage":
      return Percent;
    default:
      return Type;
  }
};
