import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DOCS_DIR = path.join(process.cwd(), 'docs');

function parseFrontMatter(raw: string): { meta: Record<string, any>; content: string } {
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!fmMatch) return { meta: {}, content: raw };
  const fmText = fmMatch[1];
  const content = fmMatch[2];
  const meta: Record<string, any> = {};
  for (const line of fmText.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      let val: any = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (/^\d+$/.test(val)) val = parseInt(val, 10);
      meta[m[1]] = val;
    }
  }
  return { meta, content };
}

function deslugify(slug: string): string {
  // Convert "data-sources" → "DATA_SOURCES.md"
  return slug.replace(/-/g, '_').toUpperCase() + '.md';
}

function extractExcerpt(content: string): string {
  const cleaned = content
    .replace(/^#+\s+.*$/gm, '')
    .replace(/^>\s+.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\|.*\|/g, '')
    .trim();
  return (cleaned.split(/\n\n/)[0] || '').replace(/[#*`_~\[\]()]/g, '').trim().slice(0, 240);
}

async function readDoc(slug: string) {
  // Try multiple filename variants to find the right file
  const candidates = [
    deslugify(slug),                         // DATA_SOURCES.md
    slug + '.md',                            // data-sources.md
    slug.replace(/-/g, '_') + '.md',         // data_sources.md
    slug.replace(/-/g, '_').toUpperCase() + '.md',
    slug.toUpperCase().replace(/-/g, '_') + '.md',
  ];
  for (const fname of candidates) {
    const fullPath = path.join(DOCS_DIR, fname);
    try {
      const raw = await fs.readFile(fullPath, 'utf8');
      return { raw, filename: fname };
    } catch {
      // try next
    }
  }
  // Case-insensitive glob fallback
  try {
    const allFiles = await fs.readdir(DOCS_DIR);
    const match = allFiles.find(f => f.toLowerCase() === slug.replace(/-/g, '_').toLowerCase() + '.md');
    if (match) {
      const raw = await fs.readFile(path.join(DOCS_DIR, match), 'utf8');
      return { raw, filename: match };
    }
  } catch {
    // ignore
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const found = await readDoc(slug);
  if (!found) {
    return NextResponse.json(
      { success: false, data: null, error: `Doc '${slug}' not found` },
      { status: 404 },
    );
  }
  const { raw, filename } = found;
  const { meta, content } = parseFrontMatter(raw);

  // Generate TOC from H2 + H3 headings
  const toc: { level: number; text: string; anchor: string }[] = [];
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  let m;
  while ((m = headingRegex.exec(content)) !== null) {
    const level = m[1].length;
    const text = m[2].replace(/[`*_~]/g, '').trim();
    const anchor = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    toc.push({ level, text, anchor });
  }

  return NextResponse.json({
    success: true,
    data: {
      slug,
      filename,
      title: meta.title || slug,
      category: meta.category || 'Documentation',
      order: meta.order ?? 99,
      last_updated: meta.last_updated || '',
      owner: meta.owner || '',
      content,
      excerpt: extractExcerpt(content),
      toc,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const newContent: string = body.content;
    if (typeof newContent !== 'string' || !newContent.trim()) {
      return NextResponse.json(
        { success: false, data: null, error: 'Missing content' },
        { status: 400 },
      );
    }

    const found = await readDoc(slug);
    if (!found) {
      return NextResponse.json(
        { success: false, data: null, error: `Doc '${slug}' not found` },
        { status: 404 },
      );
    }

    // Preserve front-matter, only replace body content
    const { meta } = parseFrontMatter(found.raw);
    const updatedLast = new Date().toISOString().slice(0, 10);
    meta.last_updated = updatedLast;

    const fmLines = ['---'];
    for (const [k, v] of Object.entries(meta)) {
      fmLines.push(`${k}: ${v}`);
    }
    fmLines.push('---', '');

    const newRaw = fmLines.join('\n') + newContent.trimStart() + '\n';
    const fullPath = path.join(DOCS_DIR, found.filename);

    // ⚠️ Vercel's serverless filesystem is READ-ONLY (except /tmp).
    // fs.writeFile will throw EACCES/EROFS in production. We catch this
    // and return a clear error to the client (which previously caused
    // "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
    // because the uncaught error produced an empty 500 body).
    try {
      await fs.writeFile(fullPath, newRaw, 'utf8');
    } catch (writeErr: any) {
      const isReadOnly = writeErr?.code === 'EACCES' || writeErr?.code === 'EROFS' || writeErr?.code === 'EPERM';
      return NextResponse.json({
        success: false,
        data: null,
        error: isReadOnly
          ? 'Documentation editing is not available in the deployed environment (filesystem is read-only on Vercel). Edit the file locally and push to Git, or run the app in dev mode.'
          : `Failed to write file: ${writeErr?.message || 'unknown error'}`,
        code: writeErr?.code,
      }, { status: isReadOnly ? 403 : 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        slug,
        filename: found.filename,
        last_updated: updatedLast,
        bytes: newRaw.length,
      },
    });
  } catch (e: any) {
    console.error('[docs PUT] error:', e);
    return NextResponse.json(
      { success: false, data: null, error: e?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
