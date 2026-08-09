/**
 * Hierarchical location picker endpoint.
 *
 * GET /api/locinsight/locations
 *   Returns the admin hierarchy for Bali:
 *     - provinces: [{code, name}]  (always 1: Bali)
 *     - kabupaten: [{code, name, type, lat, lng}]
 *     - kecamatan: [{code, name, kab_code, kab_name}]   (filtered by ?kab_code=)
 *     - kelurahan: [{code, name, kec_code, kec_name, kab_code, kab_name, lat, lng}]  (filtered by ?kec_code=)
 *
 * Used by the unified scraper UI for cascading dropdowns:
 *   Province → Kabupaten → Kecamatan → Kelurahan
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // cache for 1 hour (admin boundaries rarely change)

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const kabCode = sp.get('kab_code') || undefined
    const kecCode = sp.get('kec_code') || undefined

    // Parallel fetch — admin boundaries are independent
    const [provinces, kabupaten, kecamatan, kelurahan] = await Promise.all([
      prisma.province.findMany({
        where: { name: 'Bali' },
        select: { code: true, name: true, country: true },
        orderBy: { name: 'asc' },
      }),
      prisma.kabupaten.findMany({
        select: {
          code: true,
          name: true,
          type: true,
          province: true,
          lat: true,
          lng: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.kecamatan.findMany({
        where: kabCode ? { kabupaten_code: kabCode } : undefined,
        select: {
          code: true,
          name: true,
          kabupaten_code: true,
          lat: true,
          lng: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.kelurahan.findMany({
        where: kecCode ? { kec_code: kecCode } : undefined,
        select: {
          code: true,
          name: true,
          kec_code: true,
          kec_name: true,
          kab_code: true,
          kab_name: true,
          lat: true,
          lng: true,
        },
        orderBy: { name: 'asc' },
        take: 5000, // safety cap
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        provinces,
        kabupaten,
        kecamatan,
        kelurahan,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || 'Failed to load locations' },
      { status: 500 },
    )
  }
}
