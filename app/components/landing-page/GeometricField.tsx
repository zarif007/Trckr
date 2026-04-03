'use client'

import { cn } from '@/lib/utils'

type ShapeType = 'circle' | 'square' | 'plus' | 'triangle' | 'line'

interface ShapeDef {
 type: ShapeType
 top: string
 left?: string
 right?: string
 scale: number
 opacity: string
}

const shapes: ShapeDef[] = [
 { type: 'circle', top: '8%', left: '5%', scale: 1, opacity: 'opacity-[0.06]' },
 { type: 'plus', top: '14%', right: '10%', scale: 0.8, opacity: 'opacity-[0.05]' },
 { type: 'square', top: '42%', left: '3%', scale: 1.2, opacity: 'opacity-[0.04]' },
 { type: 'triangle', top: '58%', right: '4%', scale: 0.9, opacity: 'opacity-[0.05]' },
 { type: 'line', top: '28%', right: '14%', scale: 1, opacity: 'opacity-[0.05]' },
 { type: 'circle', top: '76%', left: '7%', scale: 0.7, opacity: 'opacity-[0.04]' },
 { type: 'plus', top: '88%', right: '7%', scale: 0.75, opacity: 'opacity-[0.05]' },
 { type: 'square', top: '6%', right: '26%', scale: 0.5, opacity: 'opacity-[0.03]' },
]

function ShapeSvg({ type }: { type: ShapeType }) {
 const cls = 'text-foreground'
 if (type === 'circle') {
 return (
 <svg className={cls} viewBox="0 0 12 12" fill="none">
 <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
 </svg>
 )
 }
 if (type === 'square') {
 return (
 <svg className={cls} viewBox="0 0 12 12" fill="none">
 <rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1" />
 </svg>
 )
 }
 if (type === 'plus') {
 return (
 <svg className={cls} viewBox="0 0 12 12" fill="none">
 <rect x="5" y="2" width="2" height="8" fill="currentColor" rx="0.5" />
 <rect x="2" y="5" width="8" height="2" fill="currentColor" rx="0.5" />
 </svg>
 )
 }
 if (type === 'triangle') {
 return (
 <svg className={cls} viewBox="0 0 12 12" fill="none">
 <polygon points="6,2 10,10 2,10" stroke="currentColor" strokeWidth="1" fill="none" />
 </svg>
 )
 }
 return (
 <svg className={cls} viewBox="0 0 24 4" fill="none">
 <rect x="0" y="1.5" width="24" height="1" fill="currentColor" rx="0.5" />
 </svg>
 )
}

export function GeometricField() {
 return (
 <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
 {shapes.map((s, i) => (
 <div
 key={i}
 className={`absolute ${s.opacity}`}
 style={{
 top: s.top,
 ...(s.left ? { left: s.left } : {}),
 ...(s.right ? { right: s.right } : {}),
 width: `${s.scale * 20}px`,
 height: `${s.scale * 20}px`,
 }}
 >
 <ShapeSvg type={s.type} />
 </div>
 ))}
 </div>
 )
}
