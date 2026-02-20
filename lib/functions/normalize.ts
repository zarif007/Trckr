export function normalizeExprOp(op: string): string {
  switch (op) {
    case '=':
    case '==':
    case '===':
      return 'eq'
    case '!=':
    case '!==':
      return 'neq'
    case '>':
      return 'gt'
    case '>=':
      return 'gte'
    case '<':
      return 'lt'
    case '<=':
      return 'lte'
    default:
      return op
  }
}
