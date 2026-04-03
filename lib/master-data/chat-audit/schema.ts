import { z } from 'zod'

/**
 * Zod is the single source of truth for JSON persisted on `Message.masterDataBuildResult`
 * and for validating POST `/api/conversations/:id/messages` payloads.
 *
 * @see README.md in this folder for the end-to-end flow.
 */

const nonEmptyTrimmed = z.string().trim().min(1)

/** Canonical action shape (also produced by `applyMasterDataBindings`). */
export interface MasterDataBindingAction {
 type: 'create' | 'reuse'
 name: string
 trackerId: string
 key?: string
}

const masterDataBindingActionRowSchema = z.object({
 type: z.enum(['create', 'reuse']),
 name: nonEmptyTrimmed,
 trackerId: nonEmptyTrimmed,
 key: z.string().optional(),
})

function normalizeBindingAction(
 raw: z.infer<typeof masterDataBindingActionRowSchema>,
): MasterDataBindingAction {
 const key =
 raw.key != null && raw.key.trim() !== '' ? raw.key.trim() : undefined
 return {
 type: raw.type,
 name: raw.name,
 trackerId: raw.trackerId,
 ...(key !== undefined ? { key } : {}),
 }
}

export const masterDataBuildAuditSchema = z
 .object({
 actions: z.array(masterDataBindingActionRowSchema).min(1),
 createdTrackerIds: z.array(z.string()),
 })
 .transform((data) => ({
 createdTrackerIds: data.createdTrackerIds,
 actions: data.actions.map(normalizeBindingAction),
 }))

export type MasterDataBuildAudit = z.infer<typeof masterDataBuildAuditSchema>

/** Nested field on conversation message POST body (same as persisted audit). */
export const masterDataBuildResultBodySchema = masterDataBuildAuditSchema

export { masterDataBindingActionRowSchema as masterDataBindingActionSchema }

/**
 * Safe parse for DB/API JSON. Returns `undefined` if shape is wrong or `actions` is empty
 * so the UI never renders from partially corrupted data.
 */
export function parseMasterDataBuildAuditFromUnknown(raw: unknown): MasterDataBuildAudit | undefined {
 if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
 const o = raw as Record<string, unknown>
 const parsed = masterDataBuildAuditSchema.safeParse({
 actions: o.actions,
 createdTrackerIds: Array.isArray(o.createdTrackerIds) ? o.createdTrackerIds : [],
 })
 return parsed.success ? parsed.data : undefined
}
