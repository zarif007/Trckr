#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const REQUIRED_FILES = [
  'docs/README.md',
  'docs/architecture/system-overview.md',
  'docs/architecture/module-boundaries.md',
  'docs/architecture/data-flow.md',
  'docs/architecture/placeholders.md',
  'docs/features/feature-catalog.md',
  'docs/api/http-endpoints.md',
  'docs/onboarding/quickstart.md',
  'docs/onboarding/first-pr-checklist.md',
  'docs/process/sop.md',
  'docs/_generated/file-map.md',
  'docs/_generated/route-map.md',
  'docs/_generated/module-map.md',
  'docs/_generated/docs-index.md',
]

function ensureRequiredFiles() {
  const missing = REQUIRED_FILES.filter((rel) => !fs.existsSync(path.join(ROOT, rel)))
  if (missing.length > 0) {
    console.error('Missing required docs files:')
    for (const file of missing) console.error(`- ${file}`)
    process.exit(1)
  }
}

function ensureFeaturePathsExist() {
  const catalogPath = path.join(ROOT, 'docs', 'features', 'feature-catalog.md')
  const content = fs.readFileSync(catalogPath, 'utf8')
  const matches = [...content.matchAll(/`([^`]+)`/g)]
  const uniquePaths = [...new Set(matches.map((m) => m[1]).filter((v) => v.includes('/')))]

  const missing = uniquePaths.filter((rel) => !fs.existsSync(path.join(ROOT, rel)))
  if (missing.length > 0) {
    console.error('Feature catalog contains missing paths:')
    for (const rel of missing) console.error(`- ${rel}`)
    process.exit(1)
  }
}

function runSyncCheck(scriptRelPath) {
  const abs = path.join(ROOT, scriptRelPath)
  const result = spawnSync(process.execPath, [abs, '--check'], {
    cwd: ROOT,
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function run() {
  ensureRequiredFiles()
  ensureFeaturePathsExist()
  runSyncCheck('scripts/docs/generate-file-map.mjs')
  runSyncCheck('scripts/docs/generate-route-map.mjs')
  runSyncCheck('scripts/docs/generate-docs-index.mjs')
  console.log('Docs coverage check passed.')
}

run()
