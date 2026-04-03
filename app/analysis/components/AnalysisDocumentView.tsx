'use client'

import { useMemo } from 'react'
import Markdown from 'react-markdown'

import type { AnalysisDocumentV1 } from '@/lib/analysis/analysis-schemas'

import { AnalysisBlockChart } from './AnalysisBlockChart'

export type AnalysisDocumentHeader = {
 title: string
 /** ISO timestamp from definition.readyAt when persisted; null if unknown */
 asOfIso: string | null
 projectName: string | null
 moduleName: string | null
 trackerName: string | null
}

function formatAsOf(iso: string | null): string | null {
 if (!iso) return null
 const d = new Date(iso)
 if (Number.isNaN(d.getTime())) return null
 return d.toLocaleString(undefined, {
 dateStyle: 'long',
 timeStyle: 'short',
 })
}

function metaLine(parts: (string | null | undefined)[]): string {
 return parts.filter(Boolean).join(' · ')
}

export function AnalysisDocumentView({
 document: doc,
 header,
}: {
 document: AnalysisDocumentV1
 header: AnalysisDocumentHeader
}) {
 const asOf = useMemo(() => formatAsOf(header.asOfIso), [header.asOfIso])
 const fallbackAsOf = useMemo(
 () =>
 new Date().toLocaleString(undefined, {
 dateStyle: 'long',
 timeStyle: 'short',
 }),
 [],
 )
 const contextMeta = metaLine([header.projectName, header.moduleName, header.trackerName])

 return (
 <article className="print:bg-background">
 <header className="border-b border-border/80 px-5 py-6 sm:px-8 sm:py-8">
 <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
 Analysis brief
 </p>
 <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
 {header.title}
 </h1>
 <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
 <span className="tabular-nums">As of {asOf ?? fallbackAsOf}</span>
 {contextMeta ? (
 <>
 <span className="text-border" aria-hidden>
 ·
 </span>
 <span>{contextMeta}</span>
 </>
 ) : null}
 </p>
 </header>

 <div className="space-y-0 divide-y divide-border/60">
 {doc.blocks.map((block, index) => {
 const n = index + 1
 const kicker = `Section ${String(n).padStart(2, '0')}`
 const hasChart =
 Boolean(block.chartSpec && block.chartData && block.chartData.length > 0)

 return (
 <section
 key={block.sectionId}
 className="break-inside-avoid px-5 py-7 sm:px-8 print:break-inside-avoid"
 >
 <div className="mb-4 flex flex-col gap-1 border-l-2 border-primary/50 pl-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
 <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
 {kicker}
 </p>
 {block.title ? (
 <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
 {block.title}
 </h2>
 ) : null}
 </div>

 <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-relaxed prose-p:text-foreground/90">
 <Markdown>{block.markdown}</Markdown>
 </div>

 {hasChart && block.chartSpec && block.chartData ? (
 <figure className="mt-6 overflow-hidden rounded-sm border border-border/70 bg-gradient-to-b from-muted/30 to-background p-4 dark:from-muted/15 sm:p-5">
 {block.title ? (
 <figcaption className="mb-3 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
 Figure — {block.title}
 </figcaption>
 ) : null}
 <div className="[&_.recharts-wrapper]:mx-auto">
 <AnalysisBlockChart spec={block.chartSpec} data={block.chartData} />
 </div>
 </figure>
 ) : null}

 <p className="mt-6 border-t border-border/50 pt-4 text-[11px] leading-relaxed text-muted-foreground">
 <span className="font-semibold uppercase tracking-wider text-foreground/70">
 Sources
 </span>
 <span className="mx-2 text-border">|</span>
 <span className="tabular-nums">{block.sources}</span>
 </p>
 </section>
 )
 })}
 </div>
 </article>
 )
}
