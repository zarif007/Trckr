'use client'

import { TrackerDisplay } from '@/app/components/tracker-display'

export default function Demo() {
  // Dummy data for student assignment tracker
  const examples = [
    {
      assignment: 'Essay on Climate Change',
      course: 'Environmental Science',
      dueDate: '2026-01-25',
      priority: 'high',
      status: 'in_progress',
      completed: false,
      title: 'Climate Change Basics',
      type: 'article',
      link: 'https://example.com/climate',
    },
    {
      assignment: 'Math Problem Set 5',
      course: 'Calculus II',
      dueDate: '2026-01-22',
      priority: 'medium',
      status: 'not_started',
      completed: false,
      title: 'Calculus Textbook',
      type: 'book',
      link: 'https://example.com/calc',
    },
    {
      assignment: 'Lab Report: Chemistry Experiment',
      course: 'Chemistry 101',
      dueDate: '2026-01-28',
      priority: 'high',
      status: 'not_started',
      completed: false,
      title: 'Chemistry Lab Guide',
      type: 'video',
      link: 'https://example.com/chem',
    },
    {
      assignment: 'Reading Chapter 7-9',
      course: 'World History',
      dueDate: '2026-01-20',
      priority: 'low',
      status: 'completed',
      completed: true,
      title: 'World History Encyclopedia',
      type: 'website',
      link: 'https://example.com/history',
    },
  ]

  const demoData = {
    tabs: [
      { id: 'assignments', name: 'My Assignments', placeId: 1 },
      { id: 'resources', name: 'Resources', placeId: 2 },
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
        config: { optionTableId: 'priority_options' },
      },
      {
        id: 'status',
        dataType: 'options' as const,
        ui: { label: 'Status' },
        config: { optionTableId: 'status_options' },
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
        config: { optionTableId: 'status_options' },
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
        config: { optionTableId: 'resource_type_options' },
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
    ],
    optionTables: [
      {
        id: 'priority_options',
        options: [
          { id: 'high', label: 'High', value: 'high' },
          { id: 'medium', label: 'Medium', value: 'medium' },
          { id: 'low', label: 'Low', value: 'low' },
        ],
      },
      {
        id: 'status_options',
        options: [
          { id: 'not_started', label: 'Not Started', value: 'not_started' },
          { id: 'in_progress', label: 'In Progress', value: 'in_progress' },
          { id: 'completed', label: 'Completed', value: 'completed' },
        ],
      },
      {
        id: 'resource_type_options',
        options: [
          { id: 'book', label: 'Book', value: 'book' },
          { id: 'article', label: 'Article', value: 'article' },
          { id: 'video', label: 'Video', value: 'video' },
          { id: 'website', label: 'Website', value: 'website' },
        ],
      },
    ],
  }

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

        <TrackerDisplay {...demoData} />
      </div>
    </div>
  )
}
