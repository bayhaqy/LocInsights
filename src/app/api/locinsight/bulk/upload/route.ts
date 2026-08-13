/**
 * File upload endpoint for bulk import (CSV / XLSX) with column validation.
 *
 * POST /api/locinsight/bulk/upload
 *   Form data:
 *     entity:    string          — one of: stores, malls, brands, competitors,
 *                                  kelurahan, pois, kabupaten, kecamatan
 *     file:      File            — .csv or .xlsx file
 *     columns:   string (opt)    — comma-separated list of expected column keys
 *                                  (used to validate file headers + filter rows)
 *
 * Best practices (Aug 2026):
 *   - Multipart form data (not base64) — efficient for large files
 *   - Strict column validation: if `columns` is provided, file headers MUST
 *     include all required fields + the listed columns. Extra columns are
 *     tolerated but flagged in the response.
 *   - Row limit: 5000 per upload
 *   - Per-row error reporting (row number + message)
 *   - Idempotent upsert (re-uploading same file is safe)
 *   - Returns: { success, created, updated, errors, error_count, warnings }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/auth-server'
import {
  ENTITY_CONFIG,
  bulkUpsert,
  validateImportColumns,
  filterRowsToColumns,
  normalizeRowKeys,
  parseCsv,
  parseXlsx,
  type EntityType,
} from '@/lib/bulk-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_ENTITIES = new Set<string>(Object.keys(ENTITY_CONFIG))
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  try {
    const form = await req.formData()
    const entity = form.get('entity') as string | null as EntityType | null
    const file = form.get('file') as File | null
    const columnsParam = form.get('columns') as string | null

    if (!entity || !VALID_ENTITIES.has(entity)) {
      return NextResponse.json(
        { success: false, error: `Invalid entity. Valid: ${Array.from(VALID_ENTITIES).join(', ')}` },
        { status: 400 },
      )
    }
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded. Please select a file.' },
        { status: 400 },
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Max 10 MB.` },
        { status: 400 },
      )
    }

    const fileName = file.name.toLowerCase()
    const isCsv = fileName.endsWith('.csv')
    const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
    if (!isCsv && !isXlsx) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file format. Please use .csv or .xlsx' },
        { status: 400 },
      )
    }

    // Parse file
    let rawRows: Record<string, any>[]
    let fileHeaders: string[]
    if (isCsv) {
      const text = await file.text()
      rawRows = parseCsv(text)
      fileHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : []
    } else {
      const buf = await file.arrayBuffer()
      rawRows = parseXlsx(buf)
      fileHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : []
    }

    if (rawRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File contains no data rows (only headers or empty).' },
        { status: 400 },
      )
    }
    if (rawRows.length > 5000) {
      return NextResponse.json(
        { success: false, error: `Too many rows: ${rawRows.length}. Max 5000 per upload.` },
        { status: 400 },
      )
    }

    // Normalize row keys (map labels → field keys)
    let rows = normalizeRowKeys(rawRows, entity)

    // Column validation (if `columns` param was provided)
    const expectedColumns = columnsParam
      ? columnsParam.split(',').map(s => s.trim()).filter(Boolean)
      : []
    const validation = expectedColumns.length > 0
      ? validateImportColumns(entity, fileHeaders, expectedColumns)
      : null

    // If validation fails (missing required columns), reject the upload
    if (validation && !validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Column validation failed. The uploaded file headers do not match the selected template.',
          errors: validation.errors,
          warnings: validation.warnings,
          missing: validation.missing,
          extra: validation.extra,
          file_headers: fileHeaders,
          expected_columns: expectedColumns,
        },
        { status: 400 },
      )
    }

    // Filter rows to only the selected columns (if validation passed / no columns specified)
    if (expectedColumns.length > 0) {
      rows = filterRowsToColumns(rows, entity, expectedColumns)
    }

    // Bulk upsert
    const result = await bulkUpsert(entity, rows)

    return NextResponse.json({
      success: true,
      entity,
      file_name: file.name,
      file_rows: rawRows.length,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
      error_count: result.errors.length,
      warnings: validation?.warnings || [],
      missing: validation?.missing || [],
      extra: validation?.extra || [],
      validated_columns: expectedColumns,
    })
  } catch (e: any) {
    console.error('bulk upload error:', e)
    return NextResponse.json({ success: false, error: e.message || 'Upload failed' }, { status: 500 })
  }
}
