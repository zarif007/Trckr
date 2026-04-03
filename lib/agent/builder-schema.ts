/**
 * Zod schema for the Builder Agent's output.
 * This is multiAgentSchema without the "manager" field — the builder only produces
 * tracker/trackerPatch/masterDataTrackers.
 */

import { z } from 'zod'

import { trackerSchema } from '@/lib/schemas/tracker'
import { trackerPatchSchema } from '@/lib/schemas/multi-agent'

const masterDataTrackerSpec = z
 .object({
 key: z.string().describe('Stable key for bindings (e.g. "student", "supplier")'),
 name: z.string().describe('Master data tracker name (e.g. "Student")'),
 labelFieldId: z.string().describe('Field id used for select display/value'),
 schema: trackerSchema.describe('Full tracker schema for this master data tracker'),
 })
 .passthrough()

export const builderOutputSchema = z
 .object({
 tracker: trackerSchema.optional(),
 trackerPatch: trackerPatchSchema.optional(),
 masterDataTrackers: z.array(masterDataTrackerSpec).optional(),
 })
 .passthrough()

export type BuilderOutput = z.infer<typeof builderOutputSchema>
