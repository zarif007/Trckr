'use client'

import { useCallback } from 'react'

import { consumeInsightNdjsonStream, type PhaseStreamEventSubset } from '@/app/insights/lib/ndjson-timeline'

export type NdjsonPostStreamResult =
  | { ok: true; response: Response }
  | { ok: false; errorMessage: string }

/**
 * POST helper: reads an NDJSON body and routes lines to phase updates, final payload, or error.
 * Caller handles HTTP status and non-stream error bodies before calling `consumeNdjsonFromResponse`.
 * See `lib/insights/README.md`.
 */
export function useNdjsonPostStream() {
  const post = useCallback(async (url: string, init: RequestInit): Promise<Response> => {
    return fetch(url, init)
  }, [])

  const consumeNdjsonFromResponse = useCallback(
    async (params: {
      response: Response
      onPhaseEvent: (ev: PhaseStreamEventSubset) => void
      onFinal: (payload: unknown) => void
      onStreamError: (message: string) => void
    }): Promise<void> => {
      const body = params.response.body
      if (!body) return
      await consumeInsightNdjsonStream({
        body,
        onPhaseEvent: params.onPhaseEvent,
        onFinal: params.onFinal,
        onStreamError: params.onStreamError,
      })
    },
    [],
  )

  return { post, consumeNdjsonFromResponse }
}
