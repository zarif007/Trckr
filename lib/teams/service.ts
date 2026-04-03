import type { TeamWithMembers } from './types'

export interface TeamService {
 listTeamsForUser(userId: string): Promise<TeamWithMembers[]>
}

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

class MockTeamService implements TeamService {
 async listTeamsForUser(userId: string): Promise<TeamWithMembers[]> {
 void userId
 return mockTeams
 }
}

const mockTeamService = new MockTeamService()

export function getTeamService(): TeamService {
 return mockTeamService
}
