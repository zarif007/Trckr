'use client'

import { useMemo } from 'react'
import { TrackerDisplay } from '@/app/components/tracker-display'

export default function Demo() {
  // Dummy data for a small-team project pipeline
  const examples = [
    {
      project: 'New onboarding flow',
      owner: 'Sara',
      team: 'Product',
      dueDate: '2026-01-25',
      priority: 'High',
      status: 'In Progress',
    },
    {
      project: 'Vendor consolidation',
      owner: 'David',
      team: 'Operations',
      dueDate: '2026-02-05',
      priority: 'Medium',
      status: 'Not Started',
    },
    {
      project: 'Laptop refresh Q1',
      owner: 'Priya',
      team: 'IT',
      dueDate: '2026-01-30',
      priority: 'High',
      status: 'Blocked',
    },
    {
      project: 'Office move checklist',
      owner: 'Alex',
      team: 'People',
      dueDate: '2026-03-15',
      priority: 'Low',
      status: 'Completed',
    },
  ]

  const demoData = {
    tabs: [
      { id: 'projects_tab', name: 'Projects', placeId: 1 },
      { id: 'shared_tab', name: 'Option Lists', placeId: 999, config: {} },
    ],
    sections: [
      {
        id: 'projects_section',
        name: 'Project pipeline',
        tabId: 'projects_tab',
        placeId: 1,
      },
      {
        id: 'options_section',
        name: 'Option Lists',
        tabId: 'shared_tab',
        placeId: 1,
        config: {},
      },
    ],
    grids: [
      {
        id: 'project_list',
        name: 'Projects',
        type: 'table' as const,
        sectionId: 'projects_section',
        placeId: 1,
        config: {},
      },
      {
        id: 'projects_by_status',
        name: 'By status',
        type: 'kanban' as const,
        sectionId: 'projects_section',
        placeId: 2,
        config: { groupBy: 'kb_status' },
      },
      {
        id: 'priority_options_grid',
        name: 'Priority Options',
        type: 'table' as const,
        sectionId: 'options_section',
        placeId: 1,
        config: {},
      },
      {
        id: 'status_options_grid',
        name: 'Status Options',
        type: 'table' as const,
        sectionId: 'options_section',
        placeId: 2,
        config: {},
      },
    ],
    fields: [
      // Project table fields
      {
        id: 'project_name',
        dataType: 'string' as const,
        ui: { label: 'Project' },
      },
      {
        id: 'project_owner',
        dataType: 'string' as const,
        ui: { label: 'Owner' },
      },
      {
        id: 'project_team',
        dataType: 'string' as const,
        ui: { label: 'Team' },
      },
      {
        id: 'project_due_date',
        dataType: 'date' as const,
        ui: { label: 'Due date' },
      },
      {
        id: 'project_priority',
        dataType: 'options' as const,
        ui: { label: 'Priority' },
        config: {},
      },
      {
        id: 'project_status',
        dataType: 'options' as const,
        ui: { label: 'Status' },
        config: {},
      },
      // Kanban fields (duplicated for current schema limitations)
      {
        id: 'kb_project_name',
        dataType: 'string' as const,
        ui: { label: 'Project' },
      },
      {
        id: 'kb_project_owner',
        dataType: 'string' as const,
        ui: { label: 'Owner' },
      },
      {
        id: 'kb_project_due_date',
        dataType: 'date' as const,
        ui: { label: 'Due date' },
      },
      {
        id: 'kb_status',
        dataType: 'options' as const,
        ui: { label: 'Status' },
        config: {},
      },
      // Dedicated option fields for option grids (distinct from select fields)
      {
        id: 'project_priority_option',
        dataType: 'string' as const,
        ui: { label: 'Priority' },
        config: {},
      },
      {
        id: 'project_status_option',
        dataType: 'string' as const,
        ui: { label: 'Status' },
        config: {},
      },
    ],
    layoutNodes: [
      // Table layout
      { gridId: 'project_list', fieldId: 'project_name', order: 1 },
      { gridId: 'project_list', fieldId: 'project_owner', order: 2 },
      { gridId: 'project_list', fieldId: 'project_team', order: 3 },
      { gridId: 'project_list', fieldId: 'project_due_date', order: 4 },
      { gridId: 'project_list', fieldId: 'project_priority', order: 5 },
      { gridId: 'project_list', fieldId: 'project_status', order: 6 },
      // Kanban layout
      { gridId: 'projects_by_status', fieldId: 'kb_project_name', order: 1 },
      { gridId: 'projects_by_status', fieldId: 'kb_project_owner', order: 2 },
      { gridId: 'projects_by_status', fieldId: 'kb_project_due_date', order: 3 },
      { gridId: 'projects_by_status', fieldId: 'kb_status', order: 4 },
      // Option grids (use dedicated option fields, not the select field ids)
      { gridId: 'priority_options_grid', fieldId: 'project_priority_option', order: 1 },
      { gridId: 'status_options_grid', fieldId: 'project_status_option', order: 1 },
    ],
    bindings: {
      'project_list.project_priority': {
        optionsGrid: 'priority_options_grid',
        labelField: 'priority_options_grid.project_priority_option',
        fieldMappings: [{ from: 'priority_options_grid.project_priority_option', to: 'project_list.project_priority' }],
      },
      'project_list.project_status': {
        optionsGrid: 'status_options_grid',
        labelField: 'status_options_grid.project_status_option',
        fieldMappings: [{ from: 'status_options_grid.project_status_option', to: 'project_list.project_status' }],
      },
      'projects_by_status.kb_status': {
        optionsGrid: 'status_options_grid',
        labelField: 'status_options_grid.project_status_option',
        fieldMappings: [{ from: 'status_options_grid.project_status_option', to: 'projects_by_status.kb_status' }],
      },
    },
  }

  const initialGridData = useMemo(() => {
    const projectListRows = examples.map((e) => ({
      project_name: e.project,
      project_owner: e.owner,
      project_team: e.team,
      project_due_date: e.dueDate,
      project_priority: e.priority,
      project_status: e.status,
    }))

    const kanbanRows = examples.map((e) => ({
      kb_project_name: e.project,
      kb_project_owner: e.owner,
      kb_project_due_date: e.dueDate,
      kb_status: e.status,
    }))

    return {
      project_list: projectListRows,
      projects_by_status: kanbanRows,
      priority_options_grid: [
        { project_priority_option: 'High' },
        { project_priority_option: 'Medium' },
        { project_priority_option: 'Low' },
      ],
      status_options_grid: [
        { project_status_option: 'Not Started' },
        { project_status_option: 'In Progress' },
        { project_status_option: 'Blocked' },
        { project_status_option: 'Completed' },
      ],
    }
  }, [])

  return (
    <div
      id="demo"
      className="mt-8 p-8 rounded-3xl bg-secondary/30 border border-border/50 hover:bg-secondary/40 transition-all"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold tracking-tight text-foreground">
            See it in action
          </h3>
          <p className="text-muted-foreground text-sm font-medium">
            A project pipeline for a 10–20 person team—built and ready to use in seconds.
          </p>
        </div>

        <TrackerDisplay {...demoData} initialGridData={initialGridData} />
      </div>
    </div>
  )
}
