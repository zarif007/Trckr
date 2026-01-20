'use client'

import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'

interface BackgroundProps {
  mouseXSpring: any
  mouseYSpring: any
}

const Particle = ({ delay }: { delay: number }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  
  useEffect(() => {
    setPosition({
      x: Math.random() * 100,
      y: Math.random() * 100,
    })
  }, [])

  return (
    <motion.div
      className="absolute w-1 h-1 bg-primary/20 rounded-full"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
      animate={{
        y: [0, -40, 0],
        opacity: [0, 0.5, 0],
        scale: [1, 1.5, 1],
      }}
      transition={{
        duration: 10 + Math.random() * 20,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  )
}

export default function Background({ mouseXSpring, mouseYSpring }: BackgroundProps) {
  const [particles, setParticles] = useState<number[]>([])

  useEffect(() => {
    setParticles(Array.from({ length: 20 }, (_, i) => i))
  }, [])

  return (
    <>
      {/* Noise Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none z-10 opacity-[0.03] mix-blend-overlay">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      {/* Mouse Follow Glow */}
      <motion.div 
        className="fixed inset-0 pointer-events-none z-10 opacity-40"
        style={{
          background: useTransform(
            [mouseXSpring, mouseYSpring],
            ([x, y]) => `radial-gradient(600px circle at ${x}px ${y}px, rgba(139, 92, 246, 0.1), transparent 80%)`
          )
        }}
      />

      {/* Background Blobs and Particles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Floating Particles */}
        {particles.map((i) => (
          <Particle key={i} delay={i * 0.5} />
        ))}

        {/* Enhanced Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[130px] animate-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[130px] animate-glow-delayed" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-500/5 blur-[100px] animate-glow" />
      </div>

      {/* Grid Pattern */}
      <div className="fixed inset-0 bg-grid mask-radial opacity-15 pointer-events-none z-0" />
      
      {/* Subtle Scanlines */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.02]" 
           style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 3px, transparent 4px)', backgroundSize: '100% 4px' }} 
      />
    </>
  )
}
