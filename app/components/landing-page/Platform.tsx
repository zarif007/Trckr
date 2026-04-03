'use client'

import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

const CAPABILITIES = [
 {
 section: 'BUILD',
 icon: '◆',
 title: 'Describe it in plain English.',
 body: 'One sentence is all it takes. Trckr generates tabs, fields, views, validations, and dropdown bindings — instantly. No forms, no schema, no setup screens.',
 proof: '01 · AI-generated from natural language',
 },
 {
 section: 'WORK',
 icon: '◇',
 title: 'Table, kanban, or form.',
 body: 'Switch views, drag rows, edit inline. Everything your team needs to stay on top of work — no matter how they like to track it.',
 proof: '02 · Live data, zero sync delay',
 },
 {
 section: 'INTELLIGENCE',
 icon: '△',
 title: 'Formulas, rules, and bindings — built visually.',
 body: 'Computed fields that update live. Conditional logic to show, require, or disable. Dropdowns backed by other trackers. Describe it — AI writes the formula.',
 proof: '04 · Zero SQL, zero exports',
 },
 {
 section: 'ANALYSIS',
 icon: '▣',
 title: 'Ask a question. Get a report.',
 body: 'Ask the AI analyst for summaries, charts, trends, and action items. Grounded entirely in your tracker data — no hallucination, no assumptions.',
 proof: '06 · Pipeline concentration detected',
 },
]

export default function Platform() {
 return (
 <section className="space-y-8 sm:space-y-10">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/20 tabular-nums">
 001
 </span>
 <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
 Capabilities
 </span>
 </div>
 <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
 One platform. Four surfaces.
 </h3>
 </div>
 <p className="text-sm text-muted-foreground/70 leading-relaxed max-w-sm sm:text-right">
 No code. No spreadsheet chaos. Describe it, and Trckr handles the rest.
 </p>
 </div>

 {/* Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border/20 rounded-sm overflow-hidden border">
 {CAPABILITIES.map((cap, i) => (
 <div
 key={cap.section}
 className={cn(
 'relative bg-background p-6 sm:p-7 group',
 theme.surface.background,
 'transition-colors duration-100 hover:bg-secondary/10'
 )}
 >
 {/* Corner number */}
 <span className="absolute top-4 right-5 text-[9px] font-mono text-muted-foreground/20 tabular-nums">
 {String(i + 1).padStart(2, '0')}
 </span>

 <div className="space-y-4">
 {/* Section label */}
 <div className="flex items-center gap-2.5">
 <span className="text-sm text-foreground/30" aria-hidden>
 {cap.icon}
 </span>
 <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
 {cap.section}
 </span>
 </div>

 {/* Title */}
 <h4 className="text-base sm:text-lg font-semibold text-foreground tracking-tight leading-tight">
 {cap.title}
 </h4>

 {/* Body */}
 <p className="text-sm text-muted-foreground/70 leading-relaxed max-w-lg">
 {cap.body}
 </p>

 {/* Proof line */}
 <div className="flex items-center gap-2 pt-1">
 <div className="h-px w-3 bg-border/40" />
 <span className="text-[10px] font-mono text-muted-foreground/40 tracking-wider">
 {cap.proof}
 </span>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Use case matrix */}
 <div className="space-y-3 pt-4">
 <div className="flex items-center gap-2">
 <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/20 tabular-nums">
 002
 </span>
 <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
 Common use cases
 </span>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
 {[
 'Sales pipeline',
 'Project tracker',
 'Inventory',
 'HR onboarding',
 'Client delivery',
 'Bug tracking',
 'Event planning',
 'Vendor contracts',
 'Time-off requests',
 'Sprint planning',
 ].map((uc) => (
 <div
 key={uc}
 className={cn(
 'flex items-center rounded border px-3 py-2',
 theme.border.subtle,
 theme.surface.secondarySubtle,
 )}
 >
 <div className="h-1 w-1 rounded-full bg-foreground/20 mr-2 shrink-0" />
 <span className="text-[11px] text-muted-foreground/65 leading-tight truncate">
 {uc}
 </span>
 </div>
 ))}
 </div>
 </div>
 </section>
 )
}
