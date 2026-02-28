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
