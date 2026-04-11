/**
 * Temporary client-side row ids for optimistic inserts before `createRowOnServer` returns.
 * Prefix `__optimistic_` is conventional; a monotonic counter avoids collisions when many
 * rows are created in the same millisecond as `Date.now()`.
 */
let optimisticIdSeq = 0;

export function createOptimisticTempRowId(): string {
  return `__optimistic_${Date.now()}_${++optimisticIdSeq}`;
}
