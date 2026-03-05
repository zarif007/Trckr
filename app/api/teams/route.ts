import { NextResponse } from 'next/server'
import { getTeamService } from '@/lib/teams'

/**
 * GET /api/teams — list teams for the current user (mock data until auth is wired).
 * In production, resolve user from session and return teams from DB.
 */
export async function GET() {
  const service = getTeamService()
  const teams = await service.listTeamsForUser('user_1')
  return NextResponse.json(teams)
}
