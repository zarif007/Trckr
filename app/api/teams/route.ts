import { NextResponse } from 'next/server'
import type { TeamWithMembers } from '@/lib/teams/types'

/**
 * GET /api/teams — list teams for the current user (mock data until auth is wired).
 * In production, resolve user from session and return teams from DB.
 */
export async function GET() {
  const mockTeams: TeamWithMembers[] = [
    {
      id: 'team_1',
      name: 'Acme Team',
      slug: 'acme',
      config: {},
      members: [
        {
          id: 'mem_1',
          teamId: 'team_1',
          userId: 'user_1',
          role: 'admin',
          pending: false,
          user: { id: 'user_1', email: 'you@example.com', name: 'You' },
        },
      ],
    },
  ]
  return NextResponse.json(mockTeams)
}
