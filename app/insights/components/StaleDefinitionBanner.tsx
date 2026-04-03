'use client'

type StaleDefinitionBannerProps = {
 variant: 'report' | 'analysis'
}

export function StaleDefinitionBanner({ variant }: StaleDefinitionBannerProps) {
 const copy =
 variant === 'report'
 ? {
 body: (
 <>
 The tracker schema changed since this report was generated. Run <strong>Regenerate</strong> to
 rebuild the recipe (intent, query, formatter).
 </>
 ),
 }
 : {
 body: (
 <>
 The tracker schema changed since this analysis was generated. Run <strong>Regenerate</strong> to
 rebuild the plan and narrative.
 </>
 ),
 }

 return (
 <div className="mb-4 rounded-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
 {copy.body}
 </div>
 )
}
