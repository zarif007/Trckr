import {
  Zap,
  Target,
  BookOpen,
  CheckSquare,
  BarChart3,
  LineChart,
  Lightbulb,
} from 'lucide-react'

export const CONTINUE_PROMPT =
  'Continue and complete the response. If you were outputting a trackerPatch, finish the patch. Otherwise complete the full tracker: ensure tabs, sections, grids, fields, layoutNodes, and bindings (so that every options/multiselect field has a bindings entry pointing to master data) are all filled. Add any missing parts from where you left off.'

export const MAX_AUTO_CONTINUES = 3
export const MAX_VALIDATION_FIX_RETRIES = 2

export const suggestions = [
  {
    icon: Zap,
    title: 'Personal Fitness Logger',
    summary: 'Fitness log',
    desc: 'Track workouts, weights, and progress over time',
    query: 'Create a personal fitness tracker to log daily workouts, sets, reps, and body weight progress.',
    gradient: 'from-orange-500/20 to-red-500/20',
    iconColor: 'text-orange-500',
  },
  {
    icon: Target,
    title: 'Company Inventory',
    summary: 'Inventory',
    desc: 'Manage stock levels, suppliers, and SKU details',
    query: 'Build a company inventory system to track stock levels, supplier contacts, and warehouse locations.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-500',
  },
  {
    icon: BookOpen,
    title: 'Recipe Collection',
    summary: 'Recipe book',
    desc: 'Save favorite recipes with ingredients and cooking steps',
    query: 'Design a digital cookbook for saving recipes, including ingredient lists, difficulty ratings, and preparation time.',
    gradient: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-green-500',
  },
  {
    icon: CheckSquare,
    title: 'Project Task Manager',
    summary: 'Project tasks',
    desc: 'Stay organized with deadlines, priorities, and status',
    query: 'Create a project management tracker with task deadlines, priority levels, and kanban stages.',
    gradient: 'from-purple-500/20 to-pink-500/20',
    iconColor: 'text-purple-500',
  },
]

export const dataSuggestions = [
  {
    icon: BarChart3,
    title: 'Summary report',
    summary: 'Summary',
    desc: 'Get a high-level summary of what this tracker shows',
    query: 'Give me a concise summary of the key trends and insights from the data in this tracker.',
    gradient: 'from-sky-500/20 to-indigo-500/20',
    iconColor: 'text-sky-500',
  },
  {
    icon: LineChart,
    title: 'Trends & patterns',
    summary: 'Trends',
    desc: 'Find patterns, anomalies, or changes over time',
    query: 'Analyze this tracker data and highlight any important trends, spikes, or anomalies I should know about.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-500',
  },
  {
    icon: Lightbulb,
    title: 'Suggestions & next steps',
    summary: 'Suggestions',
    desc: 'Ask what to do next based on the data',
    query: 'Based on the data in this tracker, suggest next steps, improvements, or actions I should consider.',
    gradient: 'from-amber-500/20 to-rose-500/20',
    iconColor: 'text-amber-500',
  },
]
