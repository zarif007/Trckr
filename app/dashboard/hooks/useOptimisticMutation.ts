'use client'

import { useCallback, useRef } from 'react'

export type UseOptimisticMutationOptions<TVariables> = {
  /** Applies optimistic UI update; returns a revert function used on error. */
  applyOptimistic: (variables: TVariables) => () => void
  /** The real API/side-effect. */
  mutation: (variables: TVariables) => Promise<void>
  /** Fallback when mutation fails; revert is already called before this. */
  onError?: (error: Error, revert: () => void) => void
  /** Number of retries before giving up and calling onError. Default 0. */
  retryCount?: number
}

/**
 * Runs an async mutation with an immediate optimistic update.
 * On failure: reverts, then calls onError. Optional retry before giving up.
 */
export function useOptimisticMutation<TVariables>({
  applyOptimistic,
  mutation,
  onError,
  retryCount = 0,
}: UseOptimisticMutationOptions<TVariables>) {
  const retriesLeftRef = useRef(0)

  const execute = useCallback(
    async (variables: TVariables): Promise<void> => {
      const revert = applyOptimistic(variables)
      retriesLeftRef.current = retryCount

      const run = async (): Promise<void> => {
        try {
          await mutation(variables)
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e))
          if (retriesLeftRef.current > 0) {
            retriesLeftRef.current -= 1
            return run()
          }
          revert()
          onError?.(err, revert)
        }
      }

      return run()
    },
    [applyOptimistic, mutation, onError, retryCount],
  )

  return { execute }
}
