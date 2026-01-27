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
      { id: 'assignment_list', key: 'assignmentList', name: 'Assignment List', type: 'table' as const, sectionId: 'current_tasks' },
      { id: 'by_status', key: 'byStatus', name: 'By Status', type: 'kanban' as const, sectionId: 'current_tasks', config: { groupBy: 'kb_status' } },
      { id: 'books_links', key: 'booksLinks', name: 'Books & Links', type: 'table' as const, sectionId: 'study_materials' }
    ],
    fields: [
      // Assignment List fields (table)
      { id: 'assignment_name', key: 'assignment', dataType: 'string' as const, gridId: 'assignment_list', ui: { label: 'Assignment' } },
      { id: 'course_name', key: 'course', dataType: 'string' as const, gridId: 'assignment_list', ui: { label: 'Course' } },
      { id: 'due_date', key: 'dueDate', dataType: 'date' as const, gridId: 'assignment_list', ui: { label: 'Due Date' } },
      { id: 'priority', key: 'priority', dataType: 'options' as const, gridId: 'assignment_list', ui: { label: 'Priority' }, config: { options: [{ id: 'high', label: 'High' }, { id: 'medium', label: 'Medium' }, { id: 'low', label: 'Low' }] } },
      { id: 'status', key: 'status', dataType: 'options' as const, gridId: 'assignment_list', ui: { label: 'Status' }, config: { options: [{ id: 'not_started', label: 'Not Started' }, { id: 'in_progress', label: 'In Progress' }, { id: 'completed', label: 'Completed' }] } },
      { id: 'is_completed', key: 'completed', dataType: 'boolean' as const, gridId: 'assignment_list', ui: { label: 'Completed' } },
      // By Status fields (kanban)
      { id: 'kb_assignment', key: 'assignment', dataType: 'string' as const, gridId: 'by_status', ui: { label: 'Assignment' } },
      { id: 'kb_course', key: 'course', dataType: 'string' as const, gridId: 'by_status', ui: { label: 'Course' } },
      { id: 'kb_due_date', key: 'dueDate', dataType: 'date' as const, gridId: 'by_status', ui: { label: 'Due Date' } },
      { id: 'kb_status', key: 'status', dataType: 'options' as const, gridId: 'by_status', ui: { label: 'Status' }, config: { options: [{ id: 'not_started', label: 'Not Started' }, { id: 'in_progress', label: 'In Progress' }, { id: 'completed', label: 'Completed' }] } },
      // Study Materials fields
      { id: 'resource_title', key: 'title', dataType: 'string' as const, gridId: 'books_links', ui: { label: 'Title' } },
      { id: 'resource_type', key: 'type', dataType: 'options' as const, gridId: 'books_links', ui: { label: 'Type' }, config: { options: [{ id: 'book', label: 'Book' }, { id: 'article', label: 'Article' }, { id: 'video', label: 'Video' }, { id: 'website', label: 'Website' }] } },
      { id: 'resource_link', key: 'link', dataType: 'string' as const, gridId: 'books_links', ui: { label: 'Link' } }
    ],
    examples: [
      {
        assignment: 'Essay on Climate Change',
        course: 'Environmental Science',
        dueDate: '2026-01-25',
        priority: 'high',
        status: 'in_progress',
        completed: false,
        title: 'Climate Change Basics',
        type: 'article',
        link: 'https://example.com/climate'
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
        link: 'https://example.com/calc'
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
        link: 'https://example.com/chem'
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