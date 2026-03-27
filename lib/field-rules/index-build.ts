/**
 * Builds the field rules index: rules by source, by target, and by grid id.
 * Enriches each rule with parsed paths and a compiled compare function.
 */

import type { FieldPath } from '@/lib/types/tracker-bindings'
import { parsePath } from '@/lib/resolve-bindings'
import type {
  FieldRules,
  FieldRuleIndex,
  EnrichedFieldRule,
  ParsedPath,
} from './types'
import { compileCompare } from './compare'

export function buildFieldRuleIndex(
  rules: FieldRules | undefined
): FieldRuleIndex {
  const rulesBySource = new Map<string, EnrichedFieldRule[]>()
  const rulesByTarget = new Map<string, EnrichedFieldRule[]>()
  const rulesByGridId = new Map<string, EnrichedFieldRule[]>()

  if (!rules || rules.length === 0) {
    return { rulesBySource, rulesByTarget, rulesByGridId }
  }

  for (const rule of rules) {
    if (!rule?.source || !Array.isArray(rule.targets) || rule.targets.length === 0)
      continue

    const parsedSource = parsePath(rule.source as FieldPath)
    const sourceGridId = parsedSource.gridId
    const sourceFieldId = parsedSource.fieldId
    if (!sourceGridId || !sourceFieldId) continue

    const parsedTargets: ParsedPath[] = []
    for (const target of rule.targets) {
      const p = parsePath(target)
      if (p.gridId && p.fieldId)
        parsedTargets.push({ tabId: null, gridId: p.gridId, fieldId: p.fieldId })
    }
    if (parsedTargets.length === 0) continue

    const enriched: EnrichedFieldRule = {
      ...rule,
      _parsedSource: { tabId: null, gridId: sourceGridId, fieldId: sourceFieldId },
      _parsedTargets: parsedTargets,
      _compare: compileCompare(rule.operator, rule.value),
    }

    const listS = rulesBySource.get(rule.source) ?? []
    listS.push(enriched)
    rulesBySource.set(rule.source, listS)

    for (const target of rule.targets) {
      const listT = rulesByTarget.get(target) ?? []
      listT.push(enriched)
      rulesByTarget.set(target, listT)
    }
    for (const { gridId } of parsedTargets) {
      const listG = rulesByGridId.get(gridId) ?? []
      if (!listG.includes(enriched)) listG.push(enriched)
      rulesByGridId.set(gridId, listG)
    }
  }

  return { rulesBySource, rulesByTarget, rulesByGridId }
}
