/**
 * Canonical pipeline rows for the marketing landing demo. Budget in the grid is
 * materialized in buildLandingDemoGridData as estHours × hourlyRate so report
 * query execution matches on-screen numbers.
 */
export type LandingPipelineSeedRow = {
 project: string
 owner: string
 team: string
 dueDate: string
 priority: 'High' | 'Medium' | 'Low'
 status: 'Not Started' | 'In Progress' | 'Blocked' | 'Completed'
 estHours: number
 hourlyRate: number
}

export const PIPELINE_DEMO_ROWS: LandingPipelineSeedRow[] = [
 {
 project: 'New onboarding flow',
 owner: 'Sara Chen',
 team: 'Product',
 dueDate: '2026-01-25',
 priority: 'High',
 status: 'In Progress',
 estHours: 120,
 hourlyRate: 85,
 },
 {
 project: 'Vendor consolidation',
 owner: 'David Okonkwo',
 team: 'Operations',
 dueDate: '2026-02-05',
 priority: 'Medium',
 status: 'Not Started',
 estHours: 40,
 hourlyRate: 95,
 },
 {
 project: 'Laptop refresh Q1',
 owner: 'Priya Nair',
 team: 'IT',
 dueDate: '2026-01-30',
 priority: 'High',
 status: 'Blocked',
 estHours: 60,
 hourlyRate: 90,
 },
 {
 project: 'Office move checklist',
 owner: 'Alex Rivera',
 team: 'People',
 dueDate: '2026-03-15',
 priority: 'Low',
 status: 'Completed',
 estHours: 24,
 hourlyRate: 75,
 },
 {
 project: 'API reliability sprint',
 owner: 'Jordan Lee',
 team: 'Engineering',
 dueDate: '2026-02-18',
 priority: 'High',
 status: 'In Progress',
 estHours: 80,
 hourlyRate: 110,
 },
 {
 project: 'SOC 2 evidence pack',
 owner: 'Morgan Blake',
 team: 'Security',
 dueDate: '2026-03-01',
 priority: 'Medium',
 status: 'In Progress',
 estHours: 56,
 hourlyRate: 125,
 },
 {
 project: 'CRM data hygiene',
 owner: 'Casey Nguyen',
 team: 'RevOps',
 dueDate: '2026-02-28',
 priority: 'Low',
 status: 'Not Started',
 estHours: 32,
 hourlyRate: 80,
 },
 {
 project: 'Customer research panels',
 owner: 'Riley Patel',
 team: 'Product',
 dueDate: '2026-03-08',
 priority: 'Medium',
 status: 'Blocked',
 estHours: 48,
 hourlyRate: 92,
 },
 {
 project: 'Benefits portal rollout',
 owner: 'Taylor Brooks',
 team: 'People',
 dueDate: '2026-04-10',
 priority: 'High',
 status: 'Not Started',
 estHours: 72,
 hourlyRate: 78,
 },
 {
 project: 'Data warehouse refactor',
 owner: 'Quinn Okafor',
 team: 'Engineering',
 dueDate: '2026-05-01',
 priority: 'Medium',
 status: 'In Progress',
 estHours: 140,
 hourlyRate: 105,
 },
]
