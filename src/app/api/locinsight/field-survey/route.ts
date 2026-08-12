/**
 * Field Survey — Phase 3.
 *
 * POST /api/locinsight/field-survey — submit a new survey from the PWA
 * GET  /api/locinsight/field-survey — list surveys (admin review)
 * PATCH /api/locinsight/field-survey — update review status
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

import { requireAuth, requireSuperadmin } from '@/lib/auth-server'
export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const sp = req.nextUrl.searchParams
    const status = sp.get('status') || undefined
    const limit = Math.min(200, Number(sp.get('limit') || 100))

    const where = status ? { review_status: status as any } : {}
    const surveys = await prisma.fieldSurvey.findMany({
      where,
      orderBy: { submitted_at: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      success: true,
      count: surveys.length,
      data: surveys,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // POST is used by field surveyors (separate PWA at /survey) to submit
  // survey data. Surveyors only need to be authenticated (any role), not
  // superadmin. The PATCH endpoint (review status update) is admin-only.
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const {
      kelurahan_id, kelurahan_name,
      lat, lng, accuracy_m,
      surveyor_name, survey_type,
      brand_name, brand_category,
      outlet_name, address,
      is_in_mall, mall_name,
      condition, estimated_size_m2,
      foot_traffic_observation,
      notes, photo_urls,
    } = body

    if (!surveyor_name || lat == null || lng == null) {
      return NextResponse.json({
        success: false,
        error: 'surveyor_name, lat, lng are required',
      }, { status: 400 })
    }

    const survey = await prisma.fieldSurvey.create({
      data: {
        kelurahan_id: kelurahan_id || null,
        kelurahan_name: kelurahan_name || '',
        lat: Number(lat),
        lng: Number(lng),
        accuracy_m: accuracy_m ? Number(accuracy_m) : null,
        surveyor_name,
        survey_type: survey_type || 'site_visit',
        brand_name: brand_name || null,
        brand_category: brand_category || '',
        outlet_name: outlet_name || '',
        address: address || '',
        is_in_mall: !!is_in_mall,
        mall_name: mall_name || '',
        condition: condition || null,
        estimated_size_m2: estimated_size_m2 ? Number(estimated_size_m2) : null,
        foot_traffic_observation: foot_traffic_observation || null,
        notes: notes || '',
        photo_urls: JSON.stringify(photo_urls || []),
        review_status: 'pending',
      },
    })

    return NextResponse.json({ success: true, id: survey.id })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const { id, review_status, reviewer_notes } = body
    if (!id || !review_status) {
      return NextResponse.json({ success: false, error: 'id and review_status are required' }, { status: 400 })
    }
    const validStatuses = ['pending', 'approved', 'rejected', 'imported']
    if (!validStatuses.includes(review_status)) {
      return NextResponse.json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
    }

    // If approved → optionally import as a competitor or store record
    if (review_status === 'imported') {
      const survey = await prisma.fieldSurvey.findUnique({ where: { id } })
      if (survey && survey.brand_name) {
        // Validate brand_category against competitor_category_enum
        const validCompetitorCategories = ['convenience_store', 'fast_food', 'coffee', 'fashion', 'beauty', 'supermarket', 'pharmacy', 'department_store', 'sports', 'other']
        const validatedCategory = survey.brand_category && validCompetitorCategories.includes(survey.brand_category) ? survey.brand_category : 'other'
        // Add as a competitor store (assuming it's a non-MAP brand observed in the field)
        await prisma.competitorStore.create({
          data: {
            brand_name: survey.brand_name,
            brand_category: validatedCategory as any,
            name: survey.outlet_name || survey.brand_name,
            lat: survey.lat,
            lng: survey.lng,
            kec: '',
            kab: '',
            city: survey.kelurahan_name || '',
            address: survey.address || '',
            is_in_mall: survey.is_in_mall,
            mall_name: survey.mall_name || null,
            source: 'osm' as any,
            source_url: `field_survey:${survey.surveyor_name}:${survey.submitted_at.toISOString()}`,
          },
        })
      }
    }

    const updated = await prisma.fieldSurvey.update({
      where: { id },
      data: {
        review_status,
        reviewer_notes: reviewer_notes || '',
        reviewed_at: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
