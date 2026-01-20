'use client'

import { TrackerDisplay } from '@/app/components/tracker-display'

export default function Demo() {
  // Dummy data for student assignment tracker
  const demoData = {
    tabs: [
      { name: 'My Assignments', fieldName: 'assignments' },
      { name: 'Resources', fieldName: 'resources' }
    ],
    sections: [
      { name: 'Current Tasks', fieldName: 'current_tasks', tabId: 'assignments' },
      { name: 'Study Materials', fieldName: 'study_materials', tabId: 'resources' }
    ],
    grids: [
      { name: 'Assignment List', fieldName: 'assignment_list', type: 'table' as const, sectionId: 'current_tasks' },
      { name: 'By Status', fieldName: 'by_status', type: 'kanban' as const, sectionId: 'current_tasks' },
      { name: 'Books & Links', fieldName: 'books_links', type: 'table' as const, sectionId: 'study_materials' }
    ],
    fields: [
      // Assignment List fields (table)
      { name: 'Assignment', fieldName: 'assignment', type: 'string' as const, gridId: 'assignment_list' },
      { name: 'Course', fieldName: 'course', type: 'string' as const, gridId: 'assignment_list' },
      { name: 'Due Date', fieldName: 'due_date', type: 'date' as const, gridId: 'assignment_list' },
      { name: 'Priority', fieldName: 'priority', type: 'options' as const, gridId: 'assignment_list', options: ['High', 'Medium', 'Low'] },
      { name: 'Status', fieldName: 'status', type: 'options' as const, gridId: 'assignment_list', options: ['Not Started', 'In Progress', 'Completed'] },
      { name: 'Completed', fieldName: 'completed', type: 'boolean' as const, gridId: 'assignment_list' },
      // By Status fields (kanban)
      { name: 'Assignment', fieldName: 'assignment', type: 'string' as const, gridId: 'by_status' },
      { name: 'Course', fieldName: 'course', type: 'string' as const, gridId: 'by_status' },
      { name: 'Due Date', fieldName: 'due_date', type: 'date' as const, gridId: 'by_status' },
      { name: 'Status', fieldName: 'status', type: 'options' as const, gridId: 'by_status', options: ['Not Started', 'In Progress', 'Completed'] },
      // Study Materials fields
      { name: 'Title', fieldName: 'title', type: 'string' as const, gridId: 'books_links' },
      { name: 'Type', fieldName: 'type', type: 'options' as const, gridId: 'books_links', options: ['Book', 'Article', 'Video', 'Website'] },
      { name: 'Link', fieldName: 'link', type: 'string' as const, gridId: 'books_links' }
    ],
    examples: [
      {
        assignment: 'Essay on Climate Change',
        course: 'Environmental Science',
        due_date: '2026-01-25',
        priority: 'High',
        status: 'In Progress',
        completed: false,
        title: 'Climate Change Basics',
        type: 'Article',
        link: 'https://example.com/climate'
      },
      {
        assignment: 'Math Problem Set 5',
        course: 'Calculus II',
        due_date: '2026-01-22',
        priority: 'Medium',
        status: 'Not Started',
        completed: false,
        title: 'Calculus Textbook',
        type: 'Book',
        link: 'https://example.com/calc'
      },
      {
        assignment: 'Lab Report: Chemistry Experiment',
        course: 'Chemistry 101',
        due_date: '2026-01-28',
        priority: 'High',
        status: 'Not Started',
        completed: false,
        title: 'Chemistry Lab Guide',
        type: 'Video',
        link: 'https://example.com/chem'
      },
      {
        assignment: 'Reading Chapter 7-9',
        course: 'World History',
        due_date: '2026-01-20',
        priority: 'Low',
        status: 'Completed',
        completed: true,
        title: 'World History Encyclopedia',
        type: 'Website',
        link: 'https://example.com/history'
      }
    ],
    views: ['Table View', 'Kanban Board', 'Calendar View', 'Priority List']
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