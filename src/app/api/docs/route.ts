import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-static';

const DOCS_DIR = path.join(process.cwd(), 'docs');

export interface DocMeta {
  slug: string;
  title: string;
  category: string;
  order: number;
  last_updated: string;
  owner: string;
}

export interface DocFile extends DocMeta {
  content: string;
  excerpt: string;
}

/**
 * Parse YAML front-matter from a markdown file.
 * Returns { meta, content }.
 */
function parseFrontMatter(raw: string): { meta: Record<string, any>; content: string } {
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!fmMatch) {
    return { meta: {}, content: raw };
  }
  const fmText = fmMatch[1];
  const content = fmMatch[2];
  const meta: Record<string, any> = {};
  for (const line of fmText.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      const key = m[1];
      let val: any = m[2].trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      // Parse numbers
      if (/^\d+$/.test(val)) val = parseInt(val, 10);
      meta[key] = val;
    }
  }
  return { meta, content };
}

/**
 * Generate a URL-friendly slug from a filename.
 * e.g. "DATA_SOURCES.md" -> "data-sources"
 */
function slugify(filename: string): string {
  return filename
    .replace(/\.md$/i, '')
    .replace(/_/g, '-')
    .toLowerCase();
}

/**
 * Extract first paragraph as excerpt (for search/list previews).
 */
function extractExcerpt(content: string): string {
  // Strip markdown headers + blockquotes
  const cleaned = content
    .replace(/^#+\s+.*$/gm, '')
    .replace(/^>\s+.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\|.*\|/g, '')
    .trim();
  const firstPara = cleaned.split(/\n\n/)[0] || '';
  return firstPara.replace(/[#*`_~\[\]()]/g, '').trim().slice(0, 240);
}

async function readAllDocs(): Promise<DocFile[]> {
  let files: string[];
  try {
    files = await fs.readdir(DOCS_DIR);
  } catch {
    return [];
  }
  const mdFiles = files.filter(f => /\.md$/i.test(f));
  const docs: DocFile[] = [];
  for (const file of mdFiles) {
    const fullPath = path.join(DOCS_DIR, file);
    const raw = await fs.readFile(fullPath, 'utf8');
    const { meta, content } = parseFrontMatter(raw);
    const slug = slugify(file);
    docs.push({
      slug,
      title: meta.title || slug,
      category: meta.category || 'Documentation',
      order: meta.order ?? 99,
      last_updated: meta.last_updated || '',
      owner: meta.owner || '',
      content,
      excerpt: extractExcerpt(content),
    });
  }
  // Sort by order, then by title
  docs.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  return docs;
}

export async function GET() {
  try {
    const docs = await readAllDocs();
    // Return only metadata (no content) for the list endpoint
    const list: DocMeta[] = docs.map(d => ({
      slug: d.slug,
      title: d.title,
      category: d.category,
      order: d.order,
      last_updated: d.last_updated,
      owner: d.owner,
    }));
    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: null, error: err.message || 'Failed to list docs' },
      { status: 500 },
    );
  }
}
