import { prisma } from '@/lib/db'
import type { CreateTrackerDataBody, UpdateTrackerDataBody } from './types'

/** Prisma include for author info on TrackerData queries. */
const authorInclude = {
 author: {
 select: { id: true, name: true, email: true },
 },
} as const

export async function createTrackerData(
 trackerSchemaId: string,
 userId: string,
 body: CreateTrackerDataBody
) {
 const tracker = await prisma.trackerSchema.findFirst({
 where: {
 id: trackerSchemaId,
 project: { userId },
 },
 })
 if (!tracker) return null

 return prisma.trackerData.create({
 data: {
 trackerSchemaId,
 label: typeof body.label === 'string' && body.label.trim() ? body.label.trim() : null,
 formStatus: typeof body.formStatus === 'string' ? body.formStatus : body.formStatus ?? null,
 data: body.data as object,
 branchName: body.branchName ?? 'main',
 authorId: body.authorId ?? null,
 basedOnId: body.basedOnId ?? null,
 },
 include: authorInclude,
 })
}

export async function listTrackerData(
 trackerSchemaId: string,
 userId: string,
 options: { limit?: number; offset?: number } = {}
) {
 const tracker = await prisma.trackerSchema.findFirst({
 where: {
 id: trackerSchemaId,
 project: { userId },
 },
 })
 if (!tracker) return null

 const limit = Math.min(Math.max(1, options.limit ?? 20), 100)
 const offset = Math.max(0, options.offset ?? 0)

 const [items, total] = await Promise.all([
 prisma.trackerData.findMany({
 where: { trackerSchemaId },
 orderBy: { updatedAt: 'desc' },
 take: limit,
 skip: offset,
 include: authorInclude,
 }),
 prisma.trackerData.count({ where: { trackerSchemaId } }),
 ])
 return { items, total }
}

export async function getTrackerData(id: string, userId: string) {
 const row = await prisma.trackerData.findFirst({
 where: { id },
 include: {
 trackerSchema: {
 select: { project: { select: { userId: true } } },
 },
 ...authorInclude,
 },
 })
 if (!row || row.trackerSchema.project.userId !== userId) return null
 const { trackerSchema, ...rest } = row
 void trackerSchema
 return rest
}

export async function updateTrackerData(
 id: string,
 userId: string,
 body: UpdateTrackerDataBody
) {
 const row = await prisma.trackerData.findFirst({
 where: { id },
 include: {
 trackerSchema: {
 select: { project: { select: { userId: true } } },
 },
 },
 })
 if (!row || row.trackerSchema.project.userId !== userId) return null

 const updateData: { label?: string | null; formStatus?: string | null; data?: object } = {}
 if (body.label !== undefined) {
 updateData.label =
 typeof body.label === 'string' && body.label.trim()
 ? body.label.trim()
 : null
 }
 if (body.formStatus !== undefined) {
 updateData.formStatus =
 typeof body.formStatus === 'string'
 ? body.formStatus
 : body.formStatus ?? null
 }
 if (body.data !== undefined) {
 updateData.data = body.data as object
 }
 if (Object.keys(updateData).length === 0) return row

 return prisma.trackerData.update({
 where: { id },
 data: updateData,
 include: authorInclude,
 })
}

/**
 * Upsert the single current data record for a non-VC, single-instance tracker.
 * If a TrackerData row already exists for this tracker, it is updated in-place.
 * If none exists, a new one is created. At most one record should ever exist.
 */
export async function upsertCurrentData(
 trackerSchemaId: string,
 userId: string,
 data: object,
 formStatus?: string | null,
) {
 const tracker = await prisma.trackerSchema.findFirst({
 where: {
 id: trackerSchemaId,
 project: { userId },
 },
 })
 if (!tracker) return null

 const existing = await prisma.trackerData.findFirst({
 where: { trackerSchemaId },
 orderBy: { updatedAt: 'desc' },
 })

 if (existing) {
 return prisma.trackerData.update({
 where: { id: existing.id },
 data: {
 data,
 authorId: userId,
 ...(formStatus !== undefined ? { formStatus: typeof formStatus === 'string' ? formStatus : null } : {}),
 },
 include: authorInclude,
 })
 }

 return prisma.trackerData.create({
 data: {
 trackerSchemaId,
 data,
 branchName: 'main',
 authorId: userId,
 ...(formStatus !== undefined ? { formStatus: typeof formStatus === 'string' ? formStatus : null } : {}),
 },
 include: authorInclude,
 })
}

export async function deleteTrackerData(id: string, userId: string) {
 const row = await prisma.trackerData.findFirst({
 where: { id },
 include: {
 trackerSchema: {
 select: { project: { select: { userId: true } } },
 },
 },
 })
 if (!row || row.trackerSchema.project.userId !== userId) return false

 await prisma.trackerData.delete({ where: { id } })
 return true
}
