/**
 * scripts/seed-docs.ts — migrate filesystem docs to DB
 *
 * Reads the original markdown files from /docs/*.md and updates the matching
 * `Doc` rows in the database with the real content (replacing placeholders).
 *
 * Idempotent: safe to re-run — uses upsert by slug.
 *
 * Mapping table (filename → slug):
 *   TECHNICAL.md       → technical
 *   CALCULATIONS.md    → calculations
 *   ARCHITECTURE.md    → architecture
 *   CHANGELOG.md       → changelog
 *   SCRAPER.md         → scraper
 *   API_REFERENCE.md   → api-reference
 *   DEPLOYMENT.md      → deployment
 *   DATA_MODEL.md      → data-model
 *   DATA_SOURCES.md    → data-sources
 *   DATA_DICTIONARY.md → data-dictionary
 *   USER_GUIDE.md      → user-guide
 *
 * Run: bun run scripts/seed-docs.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join, basename, extname } from 'path'

const prisma = new PrismaClient()

const DOCS_DIR = join(process.cwd(), 'docs')

// filename (without extension) → slug
const FILENAME_TO_SLUG: Record<string, string> = {
  TECHNICAL: 'technical',
  CALCULATIONS: 'calculations',
  ARCHITECTURE: 'architecture',
  CHANGELOG: 'changelog',
  SCRAPER: 'scraper',
  API_REFERENCE: 'api-reference',
  DEPLOYMENT: 'deployment',
  DATA_MODEL: 'data-model',
  DATA_SOURCES: 'data-sources',
  DATA_DICTIONARY: 'data-dictionary',
  USER_GUIDE: 'user-guide',
}

// Default category per slug (used when no front-matter category found)
const DEFAULT_CATEGORY: Record<string, string> = {
  technical: 'Technical',
  calculations: 'Technical',
  architecture: 'Technical',
  changelog: 'Meta',
  scraper: 'Technical',
  'api-reference': 'Technical',
  deployment: 'Technical',
  'data-model': 'Technical',
  'data-sources': 'Technical',
  'data-dictionary': 'Technical',
  'user-guide': 'User',
}

// Default owner per slug
const DEFAULT_OWNER: Record<string, string> = {
  technical: 'Data Team',
  calculations: 'Data Team',
  architecture: 'Engineering',
  changelog: 'Release Manager',
  scraper: 'Data Team',
  'api-reference': 'Engineering',
  deployment: 'DevOps',
  'data-model': 'Data Team',
  'data-sources': 'Data Team',
  'data-dictionary': 'Data Team',
  'user-guide': 'Product',
}

// Default order per slug
const DEFAULT_ORDER: Record<string, number> = {
  architecture: 10,
  'data-model': 20,
  'data-sources': 30,
  'data-dictionary': 40,
  calculations: 50,
  scraper: 60,
  'api-reference': 70,
  deployment: 80,
  technical: 90,
  'user-guide': 100,
  changelog: 110,
}

interface ParsedDoc {
  slug: string
  title: string
  category: string
  owner: string
  order: number
  content: string
}

/**
 * Extract the first H1 title from the markdown.
 * Falls back to the slug title-cased if no H1 found.
 */
function extractTitle(markdown: string, slug: string): string {
  const match = markdown.match(/^#\s+(.+?)\s*$/m)
  if (match) return match[1].trim()
  // Title-case the slug as fallback
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Strip the first H1 from the markdown (we display the title separately in the UI).
 */
function stripFirstH1(markdown: string): string {
  return markdown.replace(/^#\s+.+\r?\n?/m, '').trim()
}

/**
 * Extract category from front-matter (YAML) if present.
 * Front-matter format: ---\ncategory: X\n---\n...
 */
function extractCategoryFromFrontMatter(markdown: string): string | null {
  const fm = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  if (!fm) return null
  const catMatch = fm[1].match(/^category:\s*(.+?)\s*$/m)
  return catMatch ? catMatch[1].replace(/^["']|["']$/g, '').trim() : null
}

async function main() {
  console.log('════════════════════════════════════════════════════════')
  console.log('  LocInsights — Docs Seeder (filesystem → DB)')
  console.log('════════════════════════════════════════════════════════')
  console.log(`  Docs dir: ${DOCS_DIR}`)
  console.log('')

  if (!existsSync(DOCS_DIR)) {
    console.error(`  ✗ Docs directory not found: ${DOCS_DIR}`)
    process.exit(1)
  }

  // List markdown files in docs dir
  const mdFiles = readdirSync(DOCS_DIR)
    .filter(f => extname(f).toLowerCase() === '.md')
    .map(f => basename(f, extname(f)))
    .filter(name => FILENAME_TO_SLUG[name])

  if (mdFiles.length === 0) {
    console.warn('  ! No markdown files matching the expected naming convention found in /docs.')
    console.warn('    Expected one of: ' + Object.keys(FILENAME_TO_SLUG).join(', '))
  }

  console.log(`  Found ${mdFiles.length} markdown file(s):`)
  for (const name of mdFiles) {
    console.log(`    • ${name}.md → ${FILENAME_TO_SLUG[name]}`)
  }
  console.log('')

  const parsed: ParsedDoc[] = []
  for (const name of mdFiles) {
    const slug = FILENAME_TO_SLUG[name]
    const filePath = join(DOCS_DIR, `${name}.md`)
    let raw = readFileSync(filePath, 'utf8')

    // Strip front-matter
    const fmCategory = extractCategoryFromFrontMatter(raw)
    raw = raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')

    const title = extractTitle(raw, slug)
    const content = stripFirstH1(raw)
    const category = fmCategory || DEFAULT_CATEGORY[slug] || 'Technical'
    const owner = DEFAULT_OWNER[slug] || 'Data Team'
    const order = DEFAULT_ORDER[slug] || 100

    parsed.push({ slug, title, category, owner, order, content })
  }

  // Upsert each doc
  let inserted = 0
  let updated = 0
  for (const doc of parsed) {
    const existing = await prisma.doc.findUnique({ where: { slug: doc.slug } })
    if (existing) {
      await prisma.doc.update({
        where: { slug: doc.slug },
        data: {
          title: doc.title,
          category: doc.category,
          owner: doc.owner,
          order: doc.order,
          content: doc.content,
          last_updated: new Date(),
          is_published: true,
          // Preserve existing tenant_id (system docs remain NULL)
        },
      })
      updated++
      console.log(`  ✓ Updated: ${doc.slug} (${doc.title}) — ${doc.content.length} chars`)
    } else {
      await prisma.doc.create({
        data: {
          slug: doc.slug,
          title: doc.title,
          category: doc.category,
          owner: doc.owner,
          order: doc.order,
          content: doc.content,
          tenant_id: null, // system doc
          is_published: true,
          last_updated: new Date(),
        },
      })
      inserted++
      console.log(`  + Created: ${doc.slug} (${doc.title}) — ${doc.content.length} chars`)
    }
  }

  console.log('')
  console.log('──────────────────────────────────────────────────────')
  console.log(`  Done. ${inserted} inserted, ${updated} updated (of ${parsed.length} total).`)

  // Final verification — list all docs in DB
  const allDocs = await prisma.doc.findMany({
    select: { slug: true, title: true, category: true, content: true, order: true, tenant_id: true },
    orderBy: { order: 'asc' },
  })
  console.log('')
  console.log(`  Docs in DB now: ${allDocs.length}`)
  for (const d of allDocs) {
    const isSystem = d.tenant_id === null ? 'system' : `tenant:${d.tenant_id}`
    console.log(`    ${String(d.order).padStart(3)} | ${d.slug.padEnd(18)} | ${d.category.padEnd(10)} | ${isSystem.padEnd(15)} | ${String(d.content.length).padStart(6)} chars | ${d.title}`)
  }
  console.log('──────────────────────────────────────────────────────')
}

main()
  .catch(e => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
