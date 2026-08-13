/**
 * LocInsights API route handlers — shared helpers
 */
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
// Re-use the cached Prisma client from db.ts — creating a fresh PrismaClient
// per import (as before) caused connection-pool exhaustion on Vercel.
import { db } from './db'
export { db }

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function paginate<T>(
  model: any,
  req: NextRequest,
  opts: {
    where?: any
    include?: any
    orderBy?: any
    search?: { fields: string[]; term: string | null }
  } = {}
): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams
  const page = Math.max(1, Number(sp.get('page') || 1))
  const pageSize = Math.min(200, Math.max(1, Number(sp.get('page_size') || 50)))
  const skip = (page - 1) * pageSize

  let where: any = opts.where || {}
  if (opts.search?.term && opts.search.fields.length > 0) {
    where.OR = opts.search.fields.map((f: string) => ({
      [f]: { contains: opts.search!.term },
    }))
  }

  const [data, total] = await Promise.all([
    model.findMany({ where, include: opts.include, orderBy: opts.orderBy, skip, take: pageSize }),
    model.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

/**
 * Standard error handler for API routes
 */
export function handleError(e: any) {
  console.error('API error:', e)
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Duplicate entry — a record with this ID already exists' },
        { status: 409 }
      )
    }
    if (e.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }
  }
  return NextResponse.json(
    { success: false, error: e.message || 'Internal server error' },
    { status: 500 }
  )
}
