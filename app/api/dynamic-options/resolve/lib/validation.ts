import { z } from 'zod'
import { dynamicOptionsDefinitionsSchema } from '@/lib/dynamic-options'

const contextSchema = z
  .object({
    grids: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string().optional(),
            sectionId: z.string().optional(),
            config: z.record(z.string(), z.any()).optional(),
          })
          .passthrough()
      )
      .default([]),
    fields: z
      .array(
        z
          .object({
            id: z.string(),
            dataType: z.string(),
            ui: z
              .object({
                label: z.string().optional(),
                placeholder: z.string().optional(),
              })
              .partial()
              .optional(),
            config: z.record(z.string(), z.any()).optional().nullable(),
          })
          .passthrough()
      )
      .default([]),
    layoutNodes: z
      .array(
        z
          .object({
            gridId: z.string(),
            fieldId: z.string(),
          })
          .passthrough()
      )
      .optional(),
    sections: z
      .array(
        z
          .object({
            id: z.string(),
            tabId: z.string(),
          })
          .passthrough()
      )
      .optional(),
    dynamicOptions: dynamicOptionsDefinitionsSchema.optional(),
    gridData: z.record(z.string(), z.array(z.record(z.string(), z.any()))).optional(),
    runtime: z
      .object({
        currentGridId: z.string().optional(),
        currentFieldId: z.string().optional(),
        rowIndex: z.coerce.number().int().optional(),
        currentRow: z.record(z.string(), z.any()).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

const requestSchema = z
  .object({
    functionId: z.string().trim().min(1),
    args: z.record(z.string(), z.any()).optional(),
    context: contextSchema,
    runtime: z
      .object({
        currentGridId: z.string().optional(),
        currentFieldId: z.string().optional(),
        rowIndex: z.coerce.number().int().optional(),
        currentRow: z.record(z.string(), z.any()).optional(),
      })
      .strict()
      .optional(),
    forceRefresh: z.boolean().optional(),
    cacheTtlSecondsOverride: z.coerce.number().int().positive().optional(),
  })
  .strict()

export type ResolveDynamicOptionsRequest = z.infer<typeof requestSchema>

export function parseResolveDynamicOptionsRequest(body: unknown):
  | { ok: true; data: ResolveDynamicOptionsRequest }
  | { ok: false; error: string; status: number } {
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Invalid request body for dynamic options resolve',
      status: 400,
    }
  }
  return { ok: true, data: parsed.data }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unexpected error'
  }
}
