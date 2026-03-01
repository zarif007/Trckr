import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * GET /api/projects
 * Returns the current user's projects with their tracker schemas.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      trackerSchemas: {
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  return NextResponse.json(projects)
}

/**
 * POST /api/projects
 * Create a new project for the current user.
 * Body: { name?: string }
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    // Name is optional; fall back to default if no JSON body was sent.
  }

  const name =
    typeof body.name === 'string' && body.name.trim()
      ? body.name.trim()
      : 'Untitled project'

  const project = await prisma.project.create({
    data: {
      userId: session.user.id,
      name,
    },
  })

  return NextResponse.json(project, { status: 201 })
}
