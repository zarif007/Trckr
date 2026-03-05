#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const CHECKS = [
  { name: 'Docs Check', cmd: 'npm', args: ['run', 'docs:check'] },
  { name: 'Lint', cmd: 'npm', args: ['run', 'lint'] },
  { name: 'Typecheck', cmd: 'npm', args: ['run', 'typecheck'] },
  { name: 'Tests', cmd: 'npm', args: ['run', 'test:run'] },
  { name: 'Size Guard', cmd: 'npm', args: ['run', 'size:check'] },
]

function runCheck(step) {
  console.log(`\\n==> ${step.name}`)
  const result = spawnSync(step.cmd, step.args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function run() {
  for (const check of CHECKS) {
    runCheck(check)
  }
  console.log('\\nAll alignment checks passed.')
}

run()
