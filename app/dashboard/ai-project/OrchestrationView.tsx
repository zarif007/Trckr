'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

type Question = {
 id: string
 label: string
 help?: string
 placeholder?: string
 type?: string
 options?: string[]
}

type SetupItem = {
 type: 'project' | 'module'
 name: string
 status: 'pending' | 'working' | 'done' | 'error'
 buildProgress?: string
}

type BuildItem = {
 name: string
 module?: string | null
 status: 'pending' | 'working' | 'done' | 'error'
 trackerId?: string
 buildProgress?: string
}

type ProjectPlan = {
 project: { name: string; description?: string }
 modules?: Array<{ name: string }>
 trackers: Array<{ name: string; module?: string | null }>
}

function formatAnswerDisplay(value: unknown): string {
 if (Array.isArray(value)) return value.map(String).join(', ')
 if (typeof value === 'boolean') return value ? 'Yes' : 'No'
 if (value == null) return ''
 return String(value)
}

function StreamingText({
 text,
 speed = 18,
 showCursor = false,
}: {
 text: string
 speed?: number
 showCursor?: boolean
}) {
 const [visible, setVisible] = React.useState(0)
 const textRef = React.useRef(text)
 const isStreaming = visible < text.length

 React.useEffect(() => {
 if (textRef.current !== text) {
 textRef.current = text
 setVisible((prev) => Math.min(prev, text.length))
 }
 }, [text])

 React.useEffect(() => {
 if (visible >= text.length) return
 const interval = setInterval(() => {
 setVisible((prev) => (prev >= text.length ? prev : prev + 1))
 }, speed)
 return () => clearInterval(interval)
 }, [text, visible, speed])

 return (
 <span>
 {text.slice(0, visible)}
 {showCursor && isStreaming && (
 <span className="inline-block w-[2px] h-4 ml-0.5 -mb-1 bg-current opacity-80 animate-pulse" />
 )}
 </span>
 )
}

interface OrchestrationViewProps {
 userPrompt: string
 stage: string
 answeredQuestions: Array<{ question: Question; answer: unknown }>
 currentQuestion: Question | null
 answers: Record<string, unknown>
 plan: ProjectPlan | null
 setupItems: SetupItem[]
 buildItems: BuildItem[]
 streamedPlan: unknown
 isQuestionsLoading: boolean
 isPlanLoading: boolean
 input: string
 onInputChange: (v: string) => void
 onSend: () => void
 onConfirmBuild: () => void
 onEditAnswers: () => void
 onRetryTracker: (index: number) => void
 onRetryPlan: () => void
 busy: boolean
 inputDisabled: boolean
 canSend: boolean
 projectId?: string
 planError?: Error | null
 questionsError?: Error | null
}

function formatPlanDraft(plan?: unknown): string {
 if (!plan || typeof plan !== 'object') return 'Designing your project and trackers...'
 const p = plan as { project?: { name?: string }; modules?: { name: string }[]; trackers?: { name: string }[] }
 const projectName = p.project?.name?.trim() || '...'
 const modules = p.modules?.map((m) => m.name).filter(Boolean) ?? []
 const trackers = p.trackers?.map((t) => t.name).filter(Boolean) ?? []
 return [
 'Designing your project...',
 `Project: ${projectName}`,
 `Modules: ${modules.length ? modules.join(', ') : '...'}`,
 'Trackers:',
 trackers.length ? trackers.map((n) => ` • ${n}`).join('\n') : ' • ...',
 ].join('\n')
}

function buildPlanSummary(plan: ProjectPlan): string {
 const modules = plan.modules?.length ? plan.modules.map((m) => m.name).join(', ') : 'None'
 const trackers = plan.trackers
 .map((t) => {
 const m = t.module ? ` (${t.module})` : ''
 return ` • ${t.name}${m}`
 })
 .join('\n')
 return [
 plan.project.name,
 plan.project.description ? `\n${plan.project.description}` : '',
 `\nModules: ${modules}`,
 '\nTrackers:',
 trackers,
 ].join('')
}

export function OrchestrationView({
 userPrompt,
 stage,
 answeredQuestions,
 currentQuestion,
 answers,
 plan,
 setupItems,
 buildItems,
 streamedPlan,
 isQuestionsLoading,
 isPlanLoading,
 input,
 onInputChange,
 onSend,
 onConfirmBuild,
 onEditAnswers,
 onRetryTracker,
 onRetryPlan,
 busy,
 inputDisabled,
 canSend,
 projectId,
 planError,
 questionsError,
}: OrchestrationViewProps) {
 const endRef = React.useRef<HTMLDivElement>(null)

 React.useEffect(() => {
 endRef.current?.scrollIntoView({ behavior: 'smooth' })
 }, [stage, answeredQuestions, currentQuestion, plan, setupItems, buildItems, streamedPlan])

 const answeredCount = Object.keys(answers).length
 const hasQuestionsToShow = answeredQuestions.length > 0 || currentQuestion != null
 const isPreparingQuestion = isQuestionsLoading && !currentQuestion

 return (
 <div className="space-y-6">
 {/* User request - shown once, absorbed into the flow */}
 <div
 className={cn(
 'border bg-muted/30 px-4 py-3',
 theme.radius.md,
 theme.border.verySubtle
 )}
 >
 <div className="text-xs font-medium text-muted-foreground mb-1">Your request</div>
 <p className="text-sm text-foreground">{userPrompt}</p>
 </div>

 {/* Single agent stream - one continuous block */}
 <div
 className={cn(
 'overflow-hidden border bg-background',
 theme.radius.md,
 theme.border.verySubtle
 )}
 >
 <div
 className={cn(
 'border-b bg-muted/20 px-4 py-2.5',
 theme.border.verySubtle
 )}
 >
 <div className="flex items-center gap-2">
 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
 <span className="text-xs font-medium text-muted-foreground">
 {isQuestionsLoading && 'Analyzing...'}
 {isPlanLoading && 'Designing...'}
 {stage === 'asking' && !isQuestionsLoading && 'Gathering details'}
 {stage === 'confirm' && 'Plan ready'}
 {stage === 'building' && 'Building'}
 {!isQuestionsLoading && !isPlanLoading && stage === 'planning' && 'Designing...'}
 </span>
 </div>
 </div>

 <div className="p-4 space-y-4 text-sm leading-relaxed">
 {/* Preparing question - static message, no partial streaming */}
 {isPreparingQuestion && (
 <div className="text-foreground/90">
 {answeredQuestions.length > 0 ? 'Preparing your next question...' : 'Preparing your question...'}
 </div>
 )}

 {/* Asking - answered Q&A + current question with inline input */}
 {stage === 'asking' && hasQuestionsToShow && (
 <div className="space-y-4">
 <p className="text-foreground/90">
 To design your project, I need a few details:
 </p>

 {answeredQuestions.map(({ question: q, answer }, idx) => (
 <div key={q.id} className="flex flex-col gap-1">
 <div className="text-foreground/80">
 {idx + 1}. {q.label}
 </div>
 <div
 className={cn(
 'border-l-2 pl-4 font-medium text-foreground',
 theme.border.verySubtle
 )}
 >
 → {formatAnswerDisplay(answer)}
 </div>
 </div>
 ))}

 {currentQuestion && (
 <div className="space-y-2">
 <div className="text-foreground/80">
 {answeredQuestions.length + 1}. {currentQuestion.label}
 {currentQuestion.help && (
 <span className="block text-xs text-muted-foreground mt-0.5">
 {currentQuestion.help}
 </span>
 )}
 </div>
 <div className="flex gap-2 items-end">
 <Textarea
 value={input}
 onChange={(e) => onInputChange(e.target.value)}
 placeholder={currentQuestion.placeholder ?? 'Your answer...'}
 className="min-h-[80px] max-h-[200px] flex-1 resize-y text-sm"
 onKeyDown={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault()
 onSend()
 }
 }}
 disabled={inputDisabled}
 rows={3}
 />
 <Button
 onClick={onSend}
 disabled={!canSend}
 className="shrink-0 h-10 w-10"
 size="icon"
 >
 {busy ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : (
 <ArrowUp className="h-4 w-4" />
 )}
 </Button>
 </div>
 </div>
 )}
 </div>
 )}

 {/* Planning - streamed plan draft */}
 {isPlanLoading && (
 <div className="text-foreground/90 whitespace-pre-wrap font-mono text-xs">
 <StreamingText text={formatPlanDraft(streamedPlan)} showCursor={true} />
 </div>
 )}

 {/* Plan ready - confirm */}
 {stage === 'confirm' && plan && (
 <div className="space-y-4">
 <div className="whitespace-pre-wrap text-foreground/90">{buildPlanSummary(plan)}</div>
 <div className="flex flex-wrap gap-2 pt-2">
 <Button
 onClick={onConfirmBuild}
 disabled={busy}
 className={theme.radius.md}
 >
 Build
 </Button>
 <Button
 onClick={onEditAnswers}
 variant="outline"
 disabled={busy}
 className={theme.radius.md}
 >
 Edit answers
 </Button>
 </div>
 </div>
 )}

 {/* Building */}
 {stage === 'building' && (setupItems.length > 0 || buildItems.length > 0) && (
 <div className="space-y-4">
 {setupItems.length > 0 && (
 <div className="space-y-2">
 <p className="text-foreground/80">Setting up project and modules:</p>
 {setupItems.map((item) => (
 <div
 key={item.type === 'project' ? 'project' : `module-${item.name}`}
 className={cn(
 'flex flex-col gap-1 border px-3 py-2.5 text-sm',
 theme.radius.md,
 item.status === 'pending' &&
 cn(theme.border.verySubtle, 'bg-muted/20 text-muted-foreground'),
 item.status === 'working' && 'border-amber-500/40 bg-amber-500/10',
 item.status === 'done' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
 item.status === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive',
 )}
 >
 <div className="flex items-center gap-2 min-w-0">
 {item.status === 'pending' && (
 <div className="h-2 w-2 rounded-full bg-muted-foreground shrink-0" />
 )}
 {item.status === 'working' && (
 <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
 )}
 {item.status === 'done' && <CheckCircle className="h-4 w-4 shrink-0" />}
 {item.status === 'error' && (
 <div className="h-2 w-2 rounded-full bg-destructive shrink-0" />
 )}
 <span className="font-medium truncate">
 {item.type === 'project' ? `Project: ${item.name}` : item.name}
 </span>
 </div>
 {item.status === 'working' && item.buildProgress && (
 <div className="text-xs text-muted-foreground pl-5 truncate">
 {item.buildProgress}
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 {buildItems.length > 0 && (
 <div className="space-y-2">
 <p className="text-foreground/80">Creating your trackers:</p>
 {buildItems.map((item, idx) => (
 <div
 key={item.name}
 className={cn(
 'flex flex-col gap-1 border px-3 py-2.5 text-sm',
 theme.radius.md,
 item.status === 'pending' &&
 cn(theme.border.verySubtle, 'bg-muted/20 text-muted-foreground'),
 item.status === 'working' && 'border-amber-500/40 bg-amber-500/10',
 item.status === 'done' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
 item.status === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive',
 )}
 >
 <div className="flex items-center justify-between gap-3">
 <div className="flex items-center gap-2 min-w-0">
 {item.status === 'pending' && (
 <div className="h-2 w-2 rounded-full bg-muted-foreground shrink-0" />
 )}
 {item.status === 'working' && (
 <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
 )}
 {item.status === 'done' && <CheckCircle className="h-4 w-4 shrink-0" />}
 {item.status === 'error' && (
 <div className="h-2 w-2 rounded-full bg-destructive shrink-0" />
 )}
 <span className="font-medium truncate">{item.name}</span>
 </div>
 {item.status === 'done' && item.trackerId && (
 <Link
 href={`/tracker/${item.trackerId}`}
 className="text-xs font-semibold underline shrink-0"
 >
 Open
 </Link>
 )}
 {item.status === 'error' && (
 <Button size="sm" variant="ghost" onClick={() => onRetryTracker(idx)} className="shrink-0">
 Retry
 </Button>
 )}
 </div>
 {item.status === 'working' && item.buildProgress && (
 <div className="text-xs text-muted-foreground pl-5 truncate">
 {item.buildProgress}
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 {!busy && projectId && (
 <Button asChild className={cn('mt-2', theme.radius.md)}>
 <Link href={`/project/${projectId}`}>Go to project</Link>
 </Button>
 )}
 </div>
 )}

 {/* Plan error - retry */}
 {planError && answeredCount > 0 && (
 <div className="space-y-2">
 <p className="text-destructive">Could not generate a plan. Please try again.</p>
 <Button
 onClick={onRetryPlan}
 variant="outline"
 size="sm"
 className={theme.radius.md}
 >
 Retry plan
 </Button>
 </div>
 )}

 {/* Questions error - retry */}
 {questionsError && (
 <div className="space-y-2">
 <p className="text-destructive">Could not generate questions. Please try again.</p>
 </div>
 )}
 </div>
 </div>

 <div ref={endRef} />
 </div>
 )
}
