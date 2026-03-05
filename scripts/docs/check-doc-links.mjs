#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DOCS_DIR = path.join(ROOT, 'docs')
const EXCLUDED_SEGMENTS = new Set(['node_modules', '.git', '.next'])
const LINK_REGEX = /\[[^\]]*\]\(([^)]+)\)/g

function shouldSkip(relPath) {
  const normalized = relPath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts.some((part) => EXCLUDED_SEGMENTS.has(part))
}

function collectMarkdownFiles(absDir, relDir = 'docs') {
  const out = []
  const entries = fs
    .readdirSync(absDir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))

  for (const entry of entries) {
    const childAbs = path.join(absDir, entry.name)
    const childRel = path.join(relDir, entry.name)

    if (shouldSkip(childRel)) continue

    if (entry.isDirectory()) {
      out.push(...collectMarkdownFiles(childAbs, childRel))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(childAbs)
    }
  }

  return out
}

function normalizeLink(raw) {
  let link = raw.trim()
  if (!link) return null

  if (link.startsWith('<') && link.endsWith('>')) {
    link = link.slice(1, -1).trim()
  }

  // Remove optional title segment: "path \"title\""
  const firstSpace = link.indexOf(' ')
  if (firstSpace !== -1) {
    link = link.slice(0, firstSpace)
  }

  return link
}

function shouldIgnoreLink(link) {
  if (!link) return true
  if (link.startsWith('#')) return true
  if (link.startsWith('http://') || link.startsWith('https://')) return true
  if (link.startsWith('mailto:') || link.startsWith('tel:')) return true
  return false
}

function validateFileLinks(mdAbs) {
  const content = fs.readFileSync(mdAbs, 'utf8')
  const relFromRoot = path.relative(ROOT, mdAbs).replace(/\\/g, '/')
  const errors = []

  for (const match of content.matchAll(LINK_REGEX)) {
    const normalized = normalizeLink(match[1])
    if (!normalized || shouldIgnoreLink(normalized)) continue

    const [targetPath] = normalized.split('#')
    if (!targetPath) continue

    const resolved = path.resolve(path.dirname(mdAbs), targetPath)
    if (!fs.existsSync(resolved)) {
      errors.push(`- ${relFromRoot}: missing link target \`${normalized}\``)
    }
  }

  return errors
}

function run() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.error('Missing docs directory.')
    process.exit(1)
  }

  const markdownFiles = collectMarkdownFiles(DOCS_DIR)
  const errors = []

  for (const file of markdownFiles) {
    errors.push(...validateFileLinks(file))
  }

  if (errors.length > 0) {
    console.error('Broken markdown links found:')
    for (const error of errors) console.error(error)
    process.exit(1)
  }

  console.log('Docs link check passed.')
}

run()
