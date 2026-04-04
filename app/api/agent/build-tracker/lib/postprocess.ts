import type { BuilderOutput } from "@/lib/agent/builder-schema";
import type { ToolCallEntry } from "@/lib/agent/tool-calls";
import { applyMasterDataBindings } from "@/lib/master-data/builder";
import type { MasterDataTrackerSpec } from "@/lib/schemas/multi-agent";
import {
  buildBindingsFromSchema,
  enrichBindingsFromSchema,
  isSelfBinding,
} from "@/lib/binding";
import {
  collectExprIntents,
  applyExprIntentResults,
  type ExprIntent,
} from "@/lib/expr-intents";
import { runGenerateExprIntent } from "@/app/api/agent/generate-expr/lib/run-intent";
import {
  validateTracker,
  autoFixBindings,
  type TrackerLike,
} from "@/lib/validate-tracker";
import { buildValidationContext } from "@/lib/validate-tracker/context";
import { validateValidationExprNode } from "@/lib/validate-tracker/validators/validations";
import { validateCalculationExprNode } from "@/lib/validate-tracker/validators/calculations";
import { normalizeMasterDataScope } from "@/lib/master-data-scope";
import { applyTrackerPatch } from "@/app/tracker/utils/mergeTracker";
import { extractFieldRefsFromExpr } from "@/lib/field-rules/extract-field-refs";
import { parsePath } from "@/lib/resolve-bindings";
import { isPlaceholderSourceId } from "@/lib/master-data/bindings";

export type PostProcessOptions = {
  masterDataScope: string;
  userId: string;
  projectId?: string | null;
  moduleId?: string | null;
  baseTracker?: Record<string, unknown> | null;
};

export type PostProcessResult = {
  output: BuilderOutput;
  toolCalls: ToolCallEntry[];
};

const SELF_SOURCE_ID = "ThisTracker";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function titleCaseFromId(value: string): string {
  return value
    .replace(/_tab$|_section$|_grid$/g, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function ensureDefaultTab(
  tabs: Array<{
    id: string;
    name?: string;
    placeId?: number;
    config?: Record<string, unknown>;
  }>,
) {
  if (tabs.length > 0) return tabs;
  return [{ id: "overview_tab", name: "Overview", placeId: 0, config: {} }];
}

function repairTrackerStructure(
  tracker: Record<string, unknown>,
): Record<string, unknown> {
  const tabs = Array.isArray(tracker.tabs) ? [...tracker.tabs] : [];
  const sections = Array.isArray(tracker.sections) ? [...tracker.sections] : [];
  const grids = Array.isArray(tracker.grids) ? [...tracker.grids] : [];

  const nextTabs = ensureDefaultTab(
    tabs.filter(
      (
        t,
      ): t is {
        id: string;
        name?: string;
        placeId?: number;
        config?: Record<string, unknown>;
      } =>
        t &&
        typeof t === "object" &&
        typeof (t as Record<string, unknown>).id === "string",
    ),
  );
  const nextSections = sections.filter(
    (
      s,
    ): s is {
      id: string;
      tabId?: string;
      name?: string;
      placeId?: number;
      config?: Record<string, unknown>;
    } =>
      s &&
      typeof s === "object" &&
      typeof (s as Record<string, unknown>).id === "string",
  );
  const nextGrids = grids.filter(
    (
      g,
    ): g is {
      id: string;
      sectionId?: string;
      name?: string;
      placeId?: number;
      config?: Record<string, unknown>;
    } =>
      g &&
      typeof g === "object" &&
      typeof (g as Record<string, unknown>).id === "string",
  );

  const tabIds = new Set(nextTabs.map((t) => t.id));
  const sectionIds = new Set(nextSections.map((s) => s.id));

  const ensureTab = (tabId: string) => {
    if (!tabId || tabIds.has(tabId)) return;
    const maxPlace = Math.max(0, ...nextTabs.map((t) => t.placeId ?? 0));
    nextTabs.push({
      id: tabId,
      name: titleCaseFromId(tabId),
      placeId: maxPlace + 1,
      config: {},
    });
    tabIds.add(tabId);
  };

  const pickTabForSection = (sectionId: string): string => {
    const candidate = sectionId.endsWith("_section")
      ? sectionId.replace(/_section$/, "_tab")
      : "";
    if (candidate && tabIds.has(candidate)) return candidate;
    if (tabIds.has("overview_tab")) return "overview_tab";
    return nextTabs[0]?.id ?? "overview_tab";
  };

  for (const section of nextSections) {
    const tabId = typeof section.tabId === "string" ? section.tabId : "";
    if (!tabId || !tabIds.has(tabId)) {
      const nextTabId = pickTabForSection(section.id);
      ensureTab(nextTabId);
      section.tabId = nextTabId;
    }
    if (!isPlainObject(section.config)) section.config = {};
    if (typeof section.placeId !== "number") {
      const maxPlace = Math.max(
        0,
        ...nextSections
          .filter((s) => s.tabId === section.tabId)
          .map((s) => s.placeId ?? 0),
      );
      section.placeId = maxPlace + 1;
    }
    sectionIds.add(section.id);
  }

  for (const grid of nextGrids) {
    const sectionId = typeof grid.sectionId === "string" ? grid.sectionId : "";
    if (!sectionId || !sectionIds.has(sectionId)) {
      const tabId = pickTabForSection(grid.sectionId ?? grid.id);
      ensureTab(tabId);
      const maxPlace = Math.max(
        0,
        ...nextSections
          .filter((s) => s.tabId === tabId)
          .map((s) => s.placeId ?? 0),
      );
      const newSectionId =
        sectionId || `${grid.id.replace(/_grid$/, "")}_section`;
      if (!sectionIds.has(newSectionId)) {
        nextSections.push({
          id: newSectionId,
          name: titleCaseFromId(newSectionId),
          tabId,
          placeId: maxPlace + 1,
          config: {},
        });
        sectionIds.add(newSectionId);
      }
      grid.sectionId = newSectionId;
    }
    if (!isPlainObject(grid.config)) grid.config = {};
  }

  return {
    ...tracker,
    tabs: nextTabs,
    sections: nextSections,
    grids: nextGrids,
  };
}

function applySelfBindingsPlaceholder(
  tracker: Record<string, unknown>,
): Record<string, unknown> {
  const bindingsRaw = isPlainObject(tracker.bindings) ? tracker.bindings : {};
  const bindings: Record<string, unknown> = { ...bindingsRaw };
  for (const [fieldPath, entry] of Object.entries(bindings)) {
    if (!isPlainObject(entry)) continue;
    const source = entry.optionsSourceSchemaId;
    if (typeof source === "string" && source.trim() !== "") continue;
    bindings[fieldPath] = { ...entry, optionsSourceSchemaId: SELF_SOURCE_ID };
  }
  return { ...tracker, bindings };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function coerceRules(
  raw: unknown,
): Record<string, Array<Record<string, unknown>>> {
  if (!isPlainObject(raw)) return {};
  const out: Record<string, Array<Record<string, unknown>>> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      out[key] = value.filter((v): v is Record<string, unknown> =>
        isPlainObject(v),
      );
      continue;
    }
    if (isPlainObject(value)) {
      out[key] = [value];
    }
  }
  return out;
}

function sanitizeTracker(
  tracker: Record<string, unknown>,
): Record<string, unknown> {
  const validations = coerceRules(tracker.validations);
  const calculationsRaw = isPlainObject(tracker.calculations)
    ? tracker.calculations
    : {};
  const calculations: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(calculationsRaw)) {
    if (isPlainObject(value)) calculations[key] = value;
  }
  const fieldRulesV2 = coerceRules(tracker.fieldRulesV2);

  // `buildValidationContext` only needs layout structure to compute `fieldPaths`.
  // Passing raw `validations/calculations` here breaks `TrackerLike` typing.
  const ctx = buildValidationContext({
    tabs: Array.isArray(tracker.tabs)
      ? (tracker.tabs as TrackerLike["tabs"])
      : [],
    sections: Array.isArray(tracker.sections)
      ? (tracker.sections as TrackerLike["sections"])
      : [],
    grids: Array.isArray(tracker.grids)
      ? (tracker.grids as TrackerLike["grids"])
      : [],
    fields: Array.isArray(tracker.fields)
      ? (tracker.fields as TrackerLike["fields"])
      : [],
    layoutNodes: Array.isArray(tracker.layoutNodes)
      ? (tracker.layoutNodes as TrackerLike["layoutNodes"])
      : [],
    bindings: {},
    validations: {},
    calculations: {},
    dynamicOptions: {},
  });

  const cleanedValidations: Record<string, Array<Record<string, unknown>>> = {};
  for (const [key, rules] of Object.entries(validations)) {
    if (!ctx.fieldPaths.has(key)) continue;
    const nextRules = rules.filter((rule) => {
      if (!isPlainObject(rule)) return false;
      if (typeof rule.type !== "string") return false;
      if (typeof rule._intent === "string") return false;
      if (rule.type !== "expr") return true;
      const expr = rule.expr;
      if (!isPlainObject(expr) || typeof expr.op !== "string") return false;
      const errors = validateValidationExprNode(
        expr as any,
        ctx,
        `validations.${key}.expr`,
      );
      return errors.length === 0;
    });
    if (nextRules.length) cleanedValidations[key] = nextRules;
  }

  const cleanedCalculations: Record<string, Record<string, unknown>> = {};
  for (const [key, rule] of Object.entries(calculations)) {
    if (!ctx.fieldPaths.has(key)) continue;
    if (!isPlainObject(rule) || typeof rule._intent === "string") continue;
    const expr = rule.expr;
    if (!isPlainObject(expr) || typeof expr.op !== "string") continue;
    const parsed = parsePath(key);
    if (!parsed.gridId) continue;
    const errors = validateCalculationExprNode(
      expr as any,
      ctx,
      parsed.gridId,
      `calculations.${key}.expr`,
    );
    if (errors.length === 0) cleanedCalculations[key] = rule;
  }

  const cleanedFieldRules: Record<string, Array<Record<string, unknown>>> = {};
  for (const [targetPath, rules] of Object.entries(fieldRulesV2)) {
    if (!ctx.fieldPaths.has(targetPath)) continue;
    const nextRules = rules.filter((rule) => {
      if (!isPlainObject(rule)) return false;
      const refs = [
        ...extractFieldRefsFromExpr(rule.condition as any),
        ...extractFieldRefsFromExpr(rule.outcome as any),
      ];
      return refs.every((ref) => ctx.fieldPaths.has(ref));
    });
    if (nextRules.length) cleanedFieldRules[targetPath] = nextRules;
  }

  return {
    ...tracker,
    validations: cleanedValidations,
    calculations: cleanedCalculations,
    fieldRulesV2: cleanedFieldRules,
  };
}

function buildBindingToolCalls(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): ToolCallEntry[] {
  const calls: ToolCallEntry[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  let i = 0;
  for (const key of keys) {
    const prev = before[key];
    const next = after[key];
    if (!next) continue;
    const prevSig = stableStringify(prev);
    const nextSig = stableStringify(next);
    if (prevSig === nextSig) continue;
    const nextEntry = isPlainObject(next) ? next : {};
    const optionsGrid =
      typeof nextEntry.optionsGrid === "string" ? nextEntry.optionsGrid : "";
    const labelField =
      typeof nextEntry.labelField === "string" ? nextEntry.labelField : "";
    const sourceId =
      typeof nextEntry.optionsSourceSchemaId === "string"
        ? nextEntry.optionsSourceSchemaId
        : "";
    const sourceLabel =
      isSelfBinding(sourceId)
        ? "local"
        : sourceId
          ? `source ${sourceId}`
          : "local";
    calls.push({
      id: `binding-${i++}`,
      fieldPath: key,
      purpose: "binding",
      description: `Bind ${key} → ${optionsGrid} (${labelField}) [${sourceLabel}]`,
      status: "done",
    });
  }
  return calls;
}

async function resolveExprIntentsServer(tracker: TrackerLike): Promise<{
  tracker: TrackerLike;
  toolCalls: ToolCallEntry[];
  errors: string[];
}> {
  const intents = collectExprIntents(tracker);
  if (intents.length === 0) return { tracker, toolCalls: [], errors: [] };

  const ctx = buildValidationContext(tracker);
  const toolCalls: ToolCallEntry[] = intents.map((intent, i) => ({
    id: `expr-${i}`,
    fieldPath: intent.fieldPath,
    purpose: intent.purpose,
    description: intent.description,
    status: "pending",
  }));

  const isExprNodeLike = (value: unknown): value is { op: string } =>
    isPlainObject(value) && typeof value.op === "string";

  const buildStrictPrompt = (prompt: string) =>
    [
      "STRICT MODE: Use only these operators:",
      "const, field, add, mul, sub, div, mod, pow, eq, neq, gt, gte, lt, lte, and, or, not, if, regex, sum, accumulate, count, min, max, concat, clamp, slice, abs, round, floor, ceil, length, trim, toUpper, toLower, includes.",
      "Do not invent operators.",
      prompt,
    ].join("\n");

  const validateIntentExpr = (intent: ExprIntent, expr: unknown): string[] => {
    if (!isExprNodeLike(expr)) return ["expr must be a valid expression node"];
    if (intent.purpose === "validation") {
      return validateValidationExprNode(
        expr as any,
        ctx,
        `validations.${intent.fieldPath}.expr`,
      );
    }
    const parsed = parsePath(intent.fieldPath);
    if (!parsed.gridId) return ["invalid calculation field path"];
    return validateCalculationExprNode(
      expr as any,
      ctx,
      parsed.gridId,
      `calculations.${intent.fieldPath}.expr`,
    );
  };

  const resolved: Array<{ intent: ExprIntent; expr: unknown }> = [];
  const dropped: Array<{ intent: ExprIntent; error: string }> = [];

  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i];
    toolCalls[i] = { ...toolCalls[i], status: "running" };

    let exprResult: unknown | null = null;
    let errors: string[] = [];

    try {
      const result = await runGenerateExprIntent({
        prompt: intent.description,
        fieldPath: intent.fieldPath,
        purpose: intent.purpose,
        currentTracker: tracker,
      });
      exprResult = result.expr;
      errors = validateIntentExpr(intent, result.expr);
    } catch (err) {
      errors = [err instanceof Error ? err.message : String(err)];
    }

    if (errors.length > 0) {
      try {
        const retry = await runGenerateExprIntent({
          prompt: buildStrictPrompt(intent.description),
          fieldPath: intent.fieldPath,
          purpose: intent.purpose,
          currentTracker: tracker,
        });
        exprResult = retry.expr;
        errors = validateIntentExpr(intent, retry.expr);
      } catch (err) {
        errors = [err instanceof Error ? err.message : String(err)];
      }
    }

    if (errors.length > 0 || exprResult == null) {
      const message = errors.join("; ") || "Expression generation failed";
      toolCalls[i] = { ...toolCalls[i], status: "error", error: message };
      dropped.push({ intent, error: message });
      continue;
    }

    toolCalls[i] = { ...toolCalls[i], status: "done", result: exprResult };
    resolved.push({ intent, expr: exprResult });
  }

  let nextTracker = applyExprIntentResults(
    tracker,
    resolved.map(({ intent, expr }) => ({ intent, expr })),
  );

  if (dropped.length > 0) {
    const validations = { ...(nextTracker.validations ?? {}) };
    for (const { intent } of dropped) {
      if (intent.purpose !== "validation") continue;
      const rules = Array.isArray(validations[intent.fieldPath])
        ? [...validations[intent.fieldPath]]
        : [];
      const filtered = rules.filter(
        (rule) => (rule as any)?._intent !== intent.description,
      );
      if (filtered.length > 0) {
        validations[intent.fieldPath] = filtered;
      } else {
        delete validations[intent.fieldPath];
      }
    }
    const calculations = {
      ...((
        nextTracker as TrackerLike & { calculations?: Record<string, unknown> }
      ).calculations ?? {}),
    };
    for (const { intent } of dropped) {
      if (intent.purpose !== "calculation") continue;
      const entry = calculations[intent.fieldPath];
      if (isPlainObject(entry) && entry._intent === intent.description) {
        delete calculations[intent.fieldPath];
      }
    }
    nextTracker = { ...nextTracker, validations, calculations } as TrackerLike;
  }

  const errors = dropped.map((d) => `Expression generation failed: ${d.error}`);
  return { tracker: nextTracker as TrackerLike, toolCalls, errors };
}

function validateBindingIntegrity(tracker: TrackerLike): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const bindings = isPlainObject(tracker.bindings) ? tracker.bindings : {};
  const grids = Array.isArray(tracker.grids) ? tracker.grids : [];
  const gridIds = new Set(
    grids
      .filter((g) => isPlainObject(g) && typeof g.id === "string")
      .map((g) => g.id as string),
  );

  for (const [fieldPath, entry] of Object.entries(bindings)) {
    if (!isPlainObject(entry)) {
      warnings.push(`Binding at "${fieldPath}" is not a valid object`);
      continue;
    }

    const sourceId =
      typeof entry.optionsSourceSchemaId === "string"
        ? entry.optionsSourceSchemaId
        : "";

    // Empty sourceId is valid for local cross-grid bindings (optionsGrid points to a
    // primary data grid within this same tracker). Foreign MD bindings must have a real ID.
    if (!sourceId.trim()) {
      const optGridId =
        typeof entry.optionsGrid === "string" ? entry.optionsGrid.trim() : "";
      if (optGridId && gridIds.has(optGridId)) {
        continue; // local cross-grid binding — no source ID needed
      }
      errors.push(`Binding "${fieldPath}" has no optionsSourceSchemaId`);
      continue;
    }

    // Placeholder that survived the pipeline = something went wrong
    if (isPlaceholderSourceId(sourceId)) {
      errors.push(
        `Binding "${fieldPath}" still has a placeholder source ID "${sourceId}"`,
      );
      continue;
    }

    // ThisTracker / __self__ are valid for intra-tracker bindings — skip further checks
    if (isSelfBinding(sourceId)) {
      const optionsGrid =
        typeof entry.optionsGrid === "string" ? entry.optionsGrid : "";
      if (optionsGrid && !gridIds.has(optionsGrid)) {
        errors.push(
          `Binding "${fieldPath}" references non-existent grid "${optionsGrid}"`,
        );
      }
      continue;
    }

    // Foreign master data binding should have optionsGrid and labelField
    const optionsGrid =
      typeof entry.optionsGrid === "string" ? entry.optionsGrid : "";
    const labelField =
      typeof entry.labelField === "string" ? entry.labelField : "";

    if (!optionsGrid.trim()) {
      warnings.push(
        `Binding "${fieldPath}" has foreign source but no optionsGrid`,
      );
    }
    if (!labelField.trim()) {
      warnings.push(
        `Binding "${fieldPath}" has foreign source but no labelField`,
      );
    }
  }

  return { errors, warnings };
}

function materializeTracker(
  output: BuilderOutput,
  baseTracker?: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (output.tracker && isPlainObject(output.tracker)) {
    return output.tracker as Record<string, unknown>;
  }
  if (output.trackerPatch && baseTracker && isPlainObject(baseTracker)) {
    return applyTrackerPatch(
      baseTracker as any,
      output.trackerPatch as any,
    ) as unknown as Record<string, unknown>;
  }
  return null;
}

export async function postProcessBuilderOutput(
  output: BuilderOutput,
  options: PostProcessOptions,
): Promise<PostProcessResult> {
  const rawScope = normalizeMasterDataScope(options.masterDataScope);
  const scope =
    rawScope && rawScope !== "tracker" && !options.projectId
      ? "tracker"
      : rawScope ?? "tracker";
  const baseTracker = options.baseTracker ?? null;
  const materialized = materializeTracker(output, baseTracker);
  if (!materialized) {
    throw new Error("Builder produced no tracker or trackerPatch.");
  }

  let tracker: Record<string, unknown> = {
    ...materialized,
    masterDataScope: scope,
  };
  tracker = repairTrackerStructure(tracker);

  const beforeBindings = isPlainObject(tracker.bindings)
    ? { ...(tracker.bindings as Record<string, unknown>) }
    : {};

  let masterDataToolCalls: ToolCallEntry[] = [];

  if (scope === "tracker") {
    const built = buildBindingsFromSchema(tracker as TrackerLike);
    const enriched = built
      ? enrichBindingsFromSchema(built as TrackerLike)
      : built;
    tracker = (enriched as Record<string, unknown>) ?? tracker;
  } else {
    if (!options.projectId) {
      throw new Error("Missing project context for master data resolution.");
    }
    const mdResult = await applyMasterDataBindings({
      tracker,
      scope,
      masterDataTrackers: (output.masterDataTrackers ??
        []) as MasterDataTrackerSpec[],
      projectId: options.projectId,
      moduleId: options.moduleId,
      userId: options.userId,
    });
    tracker = mdResult.tracker as Record<string, unknown>;
    masterDataToolCalls = mdResult.actions.map((action, idx) => ({
      id: `md-${idx}`,
      purpose:
        action.type === "create" ? "master-data-create" : "master-data-lookup",
      description: `${action.type === "create" ? "Create" : "Reuse"} master data: ${action.name}${action.key ? ` (${action.key})` : ""} [${action.trackerId}]`,
      status: "done",
    }));
  }

  tracker = autoFixBindings(tracker as TrackerLike) as Record<string, unknown>;
  if (scope === "tracker") {
    tracker = applySelfBindingsPlaceholder(tracker);
  }

  const afterBindings = isPlainObject(tracker.bindings)
    ? (tracker.bindings as Record<string, unknown>)
    : {};
  const bindingToolCalls = buildBindingToolCalls(beforeBindings, afterBindings);

  const exprResult = await resolveExprIntentsServer(tracker as TrackerLike);
  tracker = sanitizeTracker(exprResult.tracker as Record<string, unknown>);

  // Validate binding integrity: catch unresolved placeholders and broken references
  // before they reach the user
  const bindingIntegrity = validateBindingIntegrity(tracker as TrackerLike);
  if (bindingIntegrity.errors.length > 0) {
    throw new Error(
      `Binding integrity check failed: ${bindingIntegrity.errors.join("; ")}`,
    );
  }

  const validation = validateTracker(tracker as TrackerLike);
  if (!validation.valid) {
    throw new Error("Schema validation failed.");
  }

  const toolCalls: ToolCallEntry[] = [
    ...masterDataToolCalls,
    ...bindingToolCalls,
    ...exprResult.toolCalls,
  ];

  return {
    output: { tracker } as BuilderOutput,
    toolCalls,
  };
}
