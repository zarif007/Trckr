/**
 * Registry for dynamic option functions. Register by id and resolve options by id + context.
 */

import type { DynamicOptionsContext, DynamicOptionsFn, DynamicOption } from './types'

const registry = new Map<string, DynamicOptionsFn>()

/**
 * Register a dynamic options function by id. Overwrites existing id.
 */
export function registerDynamicOptionsFunction(
  id: string,
  fn: DynamicOptionsFn
): void {
  if (typeof id !== 'string' || !id.trim()) return
  registry.set(id, fn)
}

/**
 * Resolve options for a dynamic select/multiselect by function id.
 * Returns [] for unknown or missing functionId.
 */
export function getDynamicOptions(
  functionId: string,
  context: DynamicOptionsContext
): DynamicOption[] {
  if (!functionId || typeof functionId !== 'string') return []
  const fn = registry.get(functionId)
  if (!fn) return []
  return fn(context)
}

/**
 * Return all registered function ids (for validation / docs).
 */
export function getRegisteredDynamicOptionsIds(): string[] {
  return Array.from(registry.keys())
}
