'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Brain,
  MessageCircle,
  FileEdit,
  Hammer,
  CheckCircle,
  Loader2,
  User,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AgentType = 'orchestrator' | 'planner' | 'builder'
type Phase = 'think' | 'ask' | 'discuss' | 'plan' | 'build'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'status'
  agentType?: AgentType
  phase?: Phase
  content: string
  tone?: 'info' | 'error' | 'success'
  stream?: boolean
  links?: Array<{ label: string; href: string }>
  actions?: Array<
    | { type: 'confirm-build' }
    | { type: 'edit-answers' }
    | { type: 'retry-tracker'; index: number }
    | { type: 'retry-plan' }
  >
}

type BuildItem = {
  name: string
  module?: string | null
  status: 'pending' | 'working' | 'done' | 'error'
  trackerId?: string
  error?: string
}

const PHASE_ICONS: Record<Phase, React.ComponentType<{ className?: string }>> = {
  think: Brain,
  ask: MessageCircle,
  discuss: User,
  plan: FileEdit,
  build: Hammer,
}

const AgentLabels: Record<AgentType, string> = {
  orchestrator: 'Orchestrator',
  planner: 'Planner',
  builder: 'Builder',
}

const PhaseLabels: Record<Phase, string> = {
  think: 'Think',
  ask: 'Ask',
  discuss: 'Discuss',
  plan: 'Plan',
  build: 'Build',
}

const AGENT_ACCENTS: Record<AgentType, string> = {
  orchestrator: 'border-l-violet-500 bg-violet-500/5',
  planner: 'border-l-amber-500 bg-amber-500/5',
  builder: 'border-l-emerald-500 bg-emerald-500/5',
}

const PIPELINE_STAGES: { key: Phase; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'think', label: 'Think', icon: Brain },
  { key: 'ask', label: 'Ask', icon: MessageCircle },
  { key: 'plan', label: 'Plan', icon: FileEdit },
  { key: 'build', label: 'Build', icon: Hammer },
]

function getPhaseFromMessage(message: ChatMessage): Phase {
  if (message.phase) return message.phase
  if (message.role === 'user') return 'discuss'
  if (message.agentType === 'orchestrator') return message.role === 'status' ? 'think' : 'ask'
  if (message.agentType === 'planner') return 'plan'
  if (message.agentType === 'builder') return 'build'
  if (message.role === 'assistant') return 'ask'
  return 'think'
}

function getAgentFromMessage(message: ChatMessage): AgentType | null {
  if (message.agentType) return message.agentType
  if (message.role === 'user') return null
  return 'orchestrator'
}

function getLatestStage(messages: ChatMessage[], stage: string): Phase {
  if (stage === 'building') return 'build'
  if (stage === 'confirm' || stage === 'planning') return 'plan'
  if (stage === 'asking') return 'ask'
  if (stage === 'idle' && messages.length > 0) return 'think'
  return 'think'
}

interface PipelineHeaderProps {
  currentStage: Phase
  stage: string
}

function PipelineHeader({ currentStage, stage }: PipelineHeaderProps) {
  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === currentStage)

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-muted/30 px-4 py-3">
      {PIPELINE_STAGES.map(({ key, label, icon: Icon }, idx) => {
        const isActive = key === currentStage
        const isPast = currentIdx > idx
        const isFuture = currentIdx < idx

        return (
          <div key={key} className="flex items-center gap-1 min-w-0">
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors',
                isActive && 'bg-background border border-border/60 shadow-sm',
                isPast && 'text-muted-foreground',
                isFuture && 'text-muted-foreground/60',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )}
              />
              <span className="text-xs font-semibold truncate">{label}</span>
            </div>
            {idx < PIPELINE_STAGES.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface PhaseCardProps {
  message: ChatMessage
  StreamingText: React.ComponentType<{ text: string; speed?: number; showCursor?: boolean }>
  onConfirmBuild: () => void
  onEditAnswers: () => void
  onRetryTracker: (index: number) => void
  onRetryPlan: () => void
  busy: boolean
}

function PhaseCard({
  message,
  StreamingText,
  onConfirmBuild,
  onEditAnswers,
  onRetryTracker,
  onRetryPlan,
  busy,
}: PhaseCardProps) {
  const phase = getPhaseFromMessage(message)
  const agent = getAgentFromMessage(message)
  const Icon = PHASE_ICONS[phase]
  const accent = agent ? AGENT_ACCENTS[agent] : 'border-l-muted-foreground/30 bg-muted/20'

  const isUser = message.role === 'user' || phase === 'discuss'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'rounded-xl border border-border/40 overflow-hidden',
        !isUser && 'border-l-4',
        !isUser && accent,
      )}
    >
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 bg-background/50">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            isUser ? 'bg-muted/60' : 'bg-background border border-border/40',
          )}
        >
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {agent ? AgentLabels[agent] : 'You'}
          </div>
          <div className="text-xs text-muted-foreground">{PhaseLabels[phase]}</div>
        </div>
      </div>

      <div
        className={cn(
          'px-4 py-3.5 text-sm leading-relaxed',
          isUser
            ? 'bg-foreground text-background'
            : message.tone === 'error'
              ? 'bg-destructive/5 text-destructive'
              : message.tone === 'success'
                ? 'bg-success/5 text-success'
                : 'bg-background/80',
        )}
      >
        {message.stream ? (
          <StreamingText text={message.content} showCursor={true} />
        ) : (
          <span className="whitespace-pre-wrap">{message.content}</span>
        )}

        {message.links?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  isUser
                    ? 'bg-background/20 text-background hover:bg-background/30'
                    : 'bg-foreground/10 text-foreground hover:bg-foreground/20',
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}

        {message.actions?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.actions.map((action, idx) => {
              if (action.type === 'confirm-build') {
                return (
                  <Button
                    key={`${message.id}-confirm-${idx}`}
                    size="sm"
                    className="rounded-lg"
                    onClick={onConfirmBuild}
                    disabled={busy}
                  >
                    Confirm & build
                  </Button>
                )
              }
              if (action.type === 'edit-answers') {
                return (
                  <Button
                    key={`${message.id}-edit-${idx}`}
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={onEditAnswers}
                    disabled={busy}
                  >
                    Edit answers
                  </Button>
                )
              }
              if (action.type === 'retry-tracker') {
                return (
                  <Button
                    key={`${message.id}-retry-${idx}`}
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => onRetryTracker(action.index)}
                    disabled={busy}
                  >
                    Retry
                  </Button>
                )
              }
              if (action.type === 'retry-plan') {
                return (
                  <Button
                    key={`${message.id}-retry-plan-${idx}`}
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={onRetryPlan}
                    disabled={busy}
                  >
                    Retry plan
                  </Button>
                )
              }
              return null
            })}
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}

interface BuildPhaseItemProps {
  item: BuildItem
  onRetry: () => void
}

function BuildPhaseItem({ item, onRetry }: BuildPhaseItemProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors',
        item.status === 'pending' && 'border-border/40 bg-muted/20 text-muted-foreground',
        item.status === 'working' && 'border-amber-500/40 bg-amber-500/10 text-foreground',
        item.status === 'done' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        item.status === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {item.status === 'pending' && (
          <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground shrink-0" />
        )}
        {item.status === 'working' && (
          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-amber-600" />
        )}
        {item.status === 'done' && (
          <CheckCircle className="h-4 w-4 shrink-0" />
        )}
        {item.status === 'error' && (
          <div className="h-2.5 w-2.5 rounded-full bg-destructive shrink-0" />
        )}
        <span className="font-medium truncate">{item.name}</span>
        {item.module && (
          <span className="text-xs text-muted-foreground truncate">({item.module})</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {item.status === 'done' && item.trackerId && (
          <Link
            href={`/tracker/${item.trackerId}`}
            className="text-xs font-semibold underline underline-offset-2 hover:no-underline"
          >
            Open
          </Link>
        )}
        {item.status === 'error' && (
          <Button size="sm" variant="outline" className="rounded-lg h-7" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}

interface AgentTimelineProps {
  messages: ChatMessage[]
  buildItems: BuildItem[]
  StreamingText: React.ComponentType<{ text: string; speed?: number; showCursor?: boolean }>
  onConfirmBuild: () => void
  onEditAnswers: () => void
  onRetryTracker: (index: number) => void
  onRetryPlan: () => void
  busy: boolean
  stage: string
}

export function AgentTimeline({
  messages,
  buildItems,
  StreamingText,
  onConfirmBuild,
  onEditAnswers,
  onRetryTracker,
  onRetryPlan,
  busy,
  stage,
}: AgentTimelineProps) {
  const showBuildPhase = stage === 'building' && buildItems.length > 0
  const currentStage = getLatestStage(messages, stage)

  return (
    <div className="space-y-6">
      <PipelineHeader currentStage={currentStage} stage={stage} />

      <div className="space-y-4">
        {messages.map((message) => (
          <PhaseCard
            key={message.id}
            message={message}
            StreamingText={StreamingText}
            onConfirmBuild={onConfirmBuild}
            onEditAnswers={onEditAnswers}
            onRetryTracker={onRetryTracker}
            onRetryPlan={onRetryPlan}
            busy={busy}
          />
        ))}

        {showBuildPhase && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border-l-4 border-l-emerald-500 border border-border/40 bg-emerald-500/5 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 bg-background/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border border-border/40">
                <Hammer className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">Builder</div>
                <div className="text-xs text-muted-foreground">Build</div>
              </div>
            </div>

            <div className="p-4 space-y-2">
              {buildItems.map((item, idx) => (
                <BuildPhaseItem
                  key={item.name}
                  item={item}
                  onRetry={() => onRetryTracker(idx)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
