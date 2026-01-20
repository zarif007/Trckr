'use client'

import { motion, useSpring, useTransform } from 'framer-motion'

interface BackgroundProps {
  mouseXSpring: any
  mouseYSpring: any
}

export default function Background({ mouseXSpring, mouseYSpring }: BackgroundProps) {
  return (
    <>
      <motion.div 
        className="fixed inset-0 pointer-events-none z-10 opacity-50"
        style={{
          background: useTransform(
            [mouseXSpring, mouseYSpring],
            ([x, y]) => `radial-gradient(600px circle at ${x}px ${y}px, rgba(139, 92, 246, 0.08), transparent 80%)`
          )
        }}
      />

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[130px] animate-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[130px] animate-glow-delayed" />
      </div>

      <div className="fixed inset-0 bg-grid mask-radial opacity-20 pointer-events-none z-0" />
    </>
  )
}
