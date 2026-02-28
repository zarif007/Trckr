import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { Instance } from '@prisma/client'

/**
 * POST /api/trackers
 * Save the current tracker schema to the database.
 * Body: { name?: string, schema: object }
 * Uses the user's first project or creates "My Project" if none exist.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: string; schema?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const schema = body.schema
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

  let project = await prisma.project.findFirst({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  })

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
