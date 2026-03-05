#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const MAX_LINES = 1200
const TARGET_DIRS = [
  'app/tracker',
  'app/components/tracker-display',
  'lib/dynamic-options',
  'lib/binding',
  'lib/resolve-bindings',
]
const EXTENSIONS = new Set(['.ts', '.tsx'])
const EXCLUDED_PATH_PARTS = new Set(['node_modules', '.next', 'generated'])

function collectFiles(dirAbs) {
  const out = []
  const stack = [dirAbs]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!fs.existsSync(current)) continue
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const abs = path.join(current, entry.name)
      const rel = path.relative(ROOT, abs).replace(/\\/g, '/')
      const parts = rel.split('/')
      if (parts.some((part) => EXCLUDED_PATH_PARTS.has(part))) continue

      if (entry.isDirectory()) {
        stack.push(abs)
      } else if (EXTENSIONS.has(path.extname(entry.name))) {
        out.push(abs)
      }
    }
  }

  return out
}

function lineCount(abs) {
  const txt = fs.readFileSync(abs, 'utf8')
  if (!txt) return 0
  return txt.split(/\r?\n/).length
}

function run() {
  const failures = []

  for (const relDir of TARGET_DIRS) {
    const absDir = path.join(ROOT, relDir)
    for (const absFile of collectFiles(absDir)) {
      const lines = lineCount(absFile)
      if (lines > MAX_LINES) {
        failures.push({
          file: path.relative(ROOT, absFile).replace(/\\/g, '/'),
          lines,
        })
      }
    }
  }

  if (failures.length > 0) {
    console.error(`File size guard failed (max ${MAX_LINES} lines):`)
    for (const failure of failures) {
      console.error(`- ${failure.file}: ${failure.lines} lines`)
    }
    process.exit(1)
  }

  console.log(`File size guard passed (max ${MAX_LINES} lines).`)
}

run()
