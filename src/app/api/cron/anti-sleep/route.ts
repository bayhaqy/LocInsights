/**
 * Anti-Sleep Cron Endpoint
 *
 * Called by Vercel Cron every 15 minutes (see vercel.json).
 * Performs lightweight pings to:
 *   1. Supabase (SELECT 1) — prevents DB auto-pause on free tier
 *   2. Hugging Face ML Space /health — prevents Space auto-sleep
 *
 * Security: validates Vercel CRON secret header to prevent public abuse.
 *
 * Env vars required:
 *   - CRON_SECRET (set in Vercel) — shared secret for cron auth
 *   - NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY — service role key (server-side only)
 *   - ML_API_URL — Hugging Face Space URL (optional)
 *   - ML_API_TOKEN — Bearer token for ML API (optional)
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    timestamp: new Date().toISOString(),
    supabase: "skipped" as string,
    ml_api: "skipped" as string,
  };

  // 1. Ping Supabase (SELECT 1 via REST)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/merge_staging_store`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(8000),
      });
      // 400 = auth OK, function needs args = connectivity OK
      // 401 = auth failed
      results.supabase = r.status === 400 ? "ok" : `error_http_${r.status}`;
    } catch (e) {
      results.supabase = `error: ${(e as Error).message.slice(0, 80)}`;
    }
  }

  // 2. Ping Hugging Face ML Space /health
  const mlApiUrl = process.env.ML_API_URL;
  const mlApiToken = process.env.ML_API_TOKEN;
  if (mlApiUrl) {
    try {
      const r = await fetch(`${mlApiUrl.replace(/\/$/, "")}/health`, {
        method: "GET",
        headers: mlApiToken ? { "X-LocInsight-Token": mlApiToken } : {},
        signal: AbortSignal.timeout(8000),
      });
      results.ml_api = r.ok ? "ok" : `error_http_${r.status}`;
    } catch (e) {
      results.ml_api = `error: ${(e as Error).message.slice(0, 80)}`;
    }
  }

  console.log("[cron/anti-sleep]", results);
  return NextResponse.json({ ok: true, ...results });
}
