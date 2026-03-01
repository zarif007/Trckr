import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { Instance } from '@prisma/client'
import { createEmptyTrackerSchema } from '@/app/components/tracker-display/tracker-editor/constants'

/**
 * POST /api/trackers
 * Create a tracker in the database.
 * Body: { name?: string, schema?: object, new?: boolean, projectId?: string }
 * - If new: true, creates a new tracker: use body.schema if valid, else empty schema; no schema required.
 * - Otherwise requires schema. Uses projectId if provided and valid, else user's first project or creates "My Project".
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: string; schema?: unknown; new?: boolean; projectId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const isNew = body.new === true
  const schemaFromBody = body.schema
  const schema =
    isNew
      ? (typeof schemaFromBody === 'object' && schemaFromBody !== null
          ? (schemaFromBody as object)
          : (createEmptyTrackerSchema() as object))
      : schemaFromBody

  if (schema === undefined || typeof schema !== 'object' || schema === null) {
    return NextResponse.json(
      { error: 'Missing or invalid schema' },
      { status: 400 }
    )
  }

  const name =
    typeof body.name === 'string' && body.name.trim()
      ? body.name.trim()
      : 'Untitled tracker'

  let project: { id: string } | null = null
  if (typeof body.projectId === 'string' && body.projectId.trim()) {
    project = await prisma.project.findFirst({
      where: { id: body.projectId.trim(), userId: session.user.id },
    })
  }
  if (!project) {
    project = await prisma.project.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
    })
  }
  if (!project) {
    project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name: 'My Project',
      },
    })
  }

  const tracker = await prisma.trackerSchema.create({
    data: {
      projectId: project.id,
      name,
      instance: Instance.SINGLE,
      schema: schema as object,
    },
  })

  return NextResponse.json(tracker)
}
