/**
 * File upload endpoint for bulk import.
 *
 * POST /api/locinsight/bulk/upload
 *   Form data:
 *     - entity: 'stores' | 'malls' | ...
 *     - file: CSV or XLSX file
 *
 * Returns: { success, created, updated, errors, error_count }
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  ENTITY_CONFIG,
  bulkUpsert,
  parseCsv,
  parseXlsx,
  normalizeRowKeys,
  type EntityType,
} from '@/lib/bulk-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_ENTITIES = new Set<string>(Object.keys(ENTITY_CONFIG))

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const entity = String(form.get('entity') || '') as EntityType
    const file = form.get('file') as File | null

    if (!entity || !VALID_ENTITIES.has(entity)) {
      return NextResponse.json(
        { success: false, error: `Invalid entity. Valid: ${Array.from(VALID_ENTITIES).join(', ')}` },
        { status: 400 },
      )
    }
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
    }

    const filename = file.name.toLowerCase()
    const isCsv = filename.endsWith('.csv')
    const isXlsx = filename.endsWith('.xlsx') || filename.endsWith('.xls')
    if (!isCsv && !isXlsx) {
      return NextResponse.json(
        { success: false, error: 'File must be .csv or .xlsx' },
        { status: 400 },
      )
    }

    // Size check: 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: `File too large: ${(file.size/1024/1024).toFixed(1)} MB. Max 10 MB.` },
        { status: 400 },
      )
    }

    const buf = await file.arrayBuffer()
    let rows: Record<string, any>[] = []
    if (isCsv) {
      const text = new TextDecoder('utf-8').decode(buf)
      rows = parseCsv(text)
    } else {
      rows = parseXlsx(buf)
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'File contains no data rows' }, { status: 400 })
    }
    if (rows.length > 5000) {
      return NextResponse.json(
        { success: false, error: `Too many rows: ${rows.length}. Max 5000.` },
        { status: 400 },
      )
    }

    const normalized = normalizeRowKeys(rows, entity)
    const result = await bulkUpsert(entity, normalized)

    return NextResponse.json({
      success: true,
      entity,
      filename: file.name,
      total: rows.length,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
      error_count: result.errors.length,
    })
  } catch (e: any) {
    console.error('bulk upload error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
