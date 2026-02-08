'use client'

import { useMemo } from 'react'
import { TrackerDisplay } from '@/app/components/tracker-display'

export default function Demo() {
  // Dummy data for student assignment tracker
  const examples = [
    {
      assignment: 'Essay on Climate Change',
      course: 'Environmental Science',
      dueDate: '2026-01-25',
      priority: 'High',
      status: 'In Progress',
      completed: false,
      title: 'Climate Change Basics',
      type: 'Article',
      link: 'https://example.com/climate',
    },
    {
      assignment: 'Math Problem Set 5',
      course: 'Calculus II',
      dueDate: '2026-01-22',
      priority: 'Medium',
      status: 'Not Started',
      completed: false,
      title: 'Calculus Textbook',
      type: 'Book',
      link: 'https://example.com/calc',
    },
    {
      assignment: 'Lab Report: Chemistry Experiment',
      course: 'Chemistry 101',
      dueDate: '2026-01-28',
      priority: 'High',
      status: 'Not Started',
      completed: false,
      title: 'Chemistry Lab Guide',
      type: 'Video',
      link: 'https://example.com/chem',
    },
    {
      assignment: 'Reading Chapter 7-9',
      course: 'World History',
      dueDate: '2026-01-20',
      priority: 'Low',
      status: 'Completed',
      completed: true,
      title: 'World History Encyclopedia',
      type: 'Website',
      link: 'https://example.com/history',
    },
  ]

  const demoData = {
    tabs: [
      { id: 'assignments', name: 'My Assignments', placeId: 1 },
      { id: 'resources', name: 'Resources', placeId: 2 },
      { id: 'shared_tab', name: 'Shared', placeId: 999, config: {} },
    ],
    sections: [
      {
        id: 'current_tasks',
        name: 'Current Tasks',
        tabId: 'assignments',
        placeId: 1,
      },
      {
        id: 'study_materials',
        name: 'Study Materials',
        tabId: 'resources',
        placeId: 1,
      },
      {
        id: 'option_lists_section',
        name: 'Option Lists',
        tabId: 'shared_tab',
        placeId: 1,
        config: {},
      },
    ],
    grids: [
      {
        id: 'assignment_list',
        name: 'Assignment List',
        type: 'table' as const,
        sectionId: 'current_tasks',
        placeId: 1,
        config: {},
      },
      {
        id: 'by_status',
        name: 'By Status',
        type: 'kanban' as const,
        sectionId: 'current_tasks',
        placeId: 2,
        config: { groupBy: 'kb_status' },
      },
      {
        id: 'books_links',
        name: 'Books & Links',
        type: 'table' as const,
        sectionId: 'study_materials',
        placeId: 1,
        config: {},
      },
      {
        id: 'priority_options_grid',
        name: 'Priority Options',
        type: 'table' as const,
        sectionId: 'option_lists_section',
        placeId: 1,
        config: {},
      },
      {
        id: 'status_options_grid',
        name: 'Status Options',
        type: 'table' as const,
        sectionId: 'option_lists_section',
        placeId: 2,
        config: {},
      },
      {
        id: 'resource_type_options_grid',
        name: 'Resource Type Options',
        type: 'table' as const,
        sectionId: 'option_lists_section',
        placeId: 3,
        config: {},
      },
    ],
    fields: [
      // Assignment Fields
      {
        id: 'assignment_name',
        dataType: 'string' as const,
        ui: { label: 'Assignment' },
      },
      {
        id: 'course_name',
        dataType: 'string' as const,
        ui: { label: 'Course' },
      },
      {
        id: 'due_date',
        dataType: 'date' as const,
        ui: { label: 'Due Date' },
      },
      {
        id: 'priority',
        dataType: 'options' as const,
        ui: { label: 'Priority' },
        config: {},
      },
      {
        id: 'status',
        dataType: 'options' as const,
        ui: { label: 'Status' },
        config: {},
      },
      {
        id: 'is_completed',
        dataType: 'boolean' as const,
        ui: { label: 'Completed' },
      },
      // Shared fields for Kanban (duplicated definitions for now as per plan/schema limitations)
      {
        id: 'kb_assignment',
        dataType: 'string' as const,
        ui: { label: 'Assignment' },
      },
      {
        id: 'kb_course',
        dataType: 'string' as const,
        ui: { label: 'Course' },
      },
      {
        id: 'kb_due_date',
        dataType: 'date' as const,
        ui: { label: 'Due Date' },
      },
      {
        id: 'kb_status',
        dataType: 'options' as const,
        ui: { label: 'Status' },
        config: {},
      },
      // Resource Fields
      {
        id: 'resource_title',
        dataType: 'string' as const,
        ui: { label: 'Title' },
      },
      {
        id: 'resource_type',
        dataType: 'options' as const,
        ui: { label: 'Type' },
        config: {},
      },
      {
        id: 'resource_link',
        dataType: 'link' as const,
        ui: { label: 'Link' },
      },
    ],
    layoutNodes: [
      { gridId: 'assignment_list', fieldId: 'assignment_name', order: 1 },
      { gridId: 'assignment_list', fieldId: 'course_name', order: 2 },
      { gridId: 'assignment_list', fieldId: 'due_date', order: 3 },
      { gridId: 'assignment_list', fieldId: 'priority', order: 4 },
      { gridId: 'assignment_list', fieldId: 'status', order: 5 },
      { gridId: 'assignment_list', fieldId: 'is_completed', order: 6 },
      { gridId: 'by_status', fieldId: 'kb_assignment', order: 1 },
      { gridId: 'by_status', fieldId: 'kb_course', order: 2 },
      { gridId: 'by_status', fieldId: 'kb_due_date', order: 3 },
      { gridId: 'by_status', fieldId: 'kb_status', order: 4 },
      { gridId: 'books_links', fieldId: 'resource_title', order: 1 },
      { gridId: 'books_links', fieldId: 'resource_type', order: 2 },
      { gridId: 'books_links', fieldId: 'resource_link', order: 3 },
      { gridId: 'priority_options_grid', fieldId: 'priority', order: 1 },
      { gridId: 'status_options_grid', fieldId: 'status', order: 1 },
      { gridId: 'resource_type_options_grid', fieldId: 'resource_type', order: 1 },
    ],
    bindings: {
      'assignment_list.priority': {
        optionsGrid: 'priority_options_grid',
        labelField: 'priority_options_grid.priority',
        fieldMappings: [{ from: 'priority_options_grid.priority', to: 'assignment_list.priority' }],
      },
      'assignment_list.status': {
        optionsGrid: 'status_options_grid',
        labelField: 'status_options_grid.status',
        fieldMappings: [{ from: 'status_options_grid.status', to: 'assignment_list.status' }],
      },
      'by_status.kb_status': {
        optionsGrid: 'status_options_grid',
        labelField: 'status_options_grid.status',
        fieldMappings: [{ from: 'status_options_grid.status', to: 'by_status.kb_status' }],
      },
      'books_links.resource_type': {
        optionsGrid: 'resource_type_options_grid',
        labelField: 'resource_type_options_grid.resource_type',
        fieldMappings: [{ from: 'resource_type_options_grid.resource_type', to: 'books_links.resource_type' }],
      },
    },
  }

  // Option grid fields for Shared tab (one field per option set; display = value)
  const optionFields = [
    { id: 'priority', dataType: 'string' as const, ui: { label: 'Priority' }, config: {} },
    { id: 'status', dataType: 'string' as const, ui: { label: 'Status' }, config: {} },
    { id: 'resource_type', dataType: 'string' as const, ui: { label: 'Resource Type' }, config: {} },
  ]
  const demoDataWithFields = {
    ...demoData,
    fields: [...demoData.fields, ...optionFields],
  }

  const initialGridData = useMemo(() => {
    const assignmentListRows = examples.map((e) => ({
      assignment_name: e.assignment,
      course_name: e.course,
      due_date: e.dueDate,
      priority: e.priority,
      status: e.status,
      is_completed: e.completed,
    }))
    const kanbanRows = examples.map((e) => ({
      kb_assignment: e.assignment,
      kb_course: e.course,
      kb_due_date: e.dueDate,
      kb_status: e.status,
    }))
    const booksLinksRows = examples.map((e) => ({
      resource_title: e.title,
      resource_type: e.type,
      resource_link: e.link,
    }))
    return {
      assignment_list: assignmentListRows,
      by_status: kanbanRows,
      books_links: booksLinksRows,
      priority_options_grid: [
        { priority: 'High' },
        { priority: 'Medium' },
        { priority: 'Low' },
      ],
      status_options_grid: [
        { status: 'Not Started' },
        { status: 'In Progress' },
        { status: 'Completed' },
      ],
      resource_type_options_grid: [
        { resource_type: 'Article' },
        { resource_type: 'Book' },
        { resource_type: 'Video' },
        { resource_type: 'Website' },
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
            The Experience
          </h3>
          <p className="text-muted-foreground text-sm font-medium">
            See how your tracker comes to life
          </p>
        </div>

        <TrackerDisplay {...demoDataWithFields} initialGridData={initialGridData} />
      </div>
    </div>
  )
}
