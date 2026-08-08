/**
 * ML Train — Phase 3.
 *
 * POST /api/locinsight/ml/train
 *   body: { n_estimators?, max_depth?, learning_rate?, min_samples_split?, subsample? }
 *   returns: { run_id, model_id, metrics, history, feature_importance }
 *
 * Runs a real gradient-boosted regression training, persists the model JSON,
 * and records the run in the TrainingRun table for audit history.
 *
 * GET /api/locinsight/ml/train — list previous training runs
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { trainGBR, computeFeatureImportance, type GBRModel } from '@/lib/ml/gbr'
import { buildTrainingDataset, FEATURE_NAMES } from '@/lib/ml/dataset'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MODEL_DIR = path.join(process.cwd(), 'prisma', 'ml-models')
const MODEL_PATH = path.join(MODEL_DIR, 'gbr-revenue-bali-v1.json')

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const config = {
      n_estimators: body.n_estimators ?? 80,
      max_depth: body.max_depth ?? 3,
      learning_rate: body.learning_rate ?? 0.1,
      min_samples_split: body.min_samples_split ?? 8,
      subsample: body.subsample ?? 1.0,
      noise_seed: body.noise_seed ?? Date.now() % 100000,
    }

    const startTime = Date.now()

    // Build dataset
    const rows = buildTrainingDataset(config.noise_seed)
    const X = rows.map(r => r.X)
    const y = rows.map(r => r.y)

    // Train
    const { model, history } = trainGBR(X, y, [...FEATURE_NAMES], config)
    const featureImportance = computeFeatureImportance(model)

    // Persist model JSON
    await fs.mkdir(MODEL_DIR, { recursive: true })
    await fs.writeFile(MODEL_PATH, JSON.stringify(model, null, 2), 'utf-8')

    const trainDuration = Date.now() - startTime

    // Record training run
    const trainingRun = await prisma.trainingRun.create({
      data: {
        model_id: 'mdl_gbr_revenue_v1',
        model_name: 'GBR Revenue Predictor v1',
        algorithm: 'gbr_regressor',
        status: 'completed',
        dataset_size: rows.length,
        features: JSON.stringify(model.feature_names),
        hyperparameters: JSON.stringify({
          n_estimators: model.n_estimators,
          max_depth: model.max_depth,
          learning_rate: model.learning_rate,
          min_samples_split: config.min_samples_split,
          subsample: config.subsample,
          noise_seed: config.noise_seed,
        }),
        metrics: JSON.stringify(model.training_metrics),
        feature_importance: JSON.stringify(featureImportance),
        model_artifact_url: MODEL_PATH,
        train_duration_ms: trainDuration,
        finished_at: new Date(),
      },
    })

    // Upsert MLModel (so the ML Engine UI can show it as the active model)
    await prisma.mLModel.upsert({
      where: { id: 'mdl_gbr_revenue_v1' },
      create: {
        id: 'mdl_gbr_revenue_v1',
        name: 'GBR Revenue Predictor v1',
        version: 'v1.0',
        type: 'revenue_forecast',
        algorithm: 'gbr_regressor',
        description: `Pure-TypeScript Gradient-Boosted Regression (Friedman 2001). Trained on ${rows.length} (kelurahan × brand) synthetic samples with log-normal noise (sigma=0.35). Replaces the heuristic revenue projection with learned model.`,
        features: JSON.stringify(model.feature_names),
        hyperparameters: JSON.stringify({
          n_estimators: model.n_estimators,
          max_depth: model.max_depth,
          learning_rate: model.learning_rate,
        }),
        metrics: JSON.stringify(model.training_metrics),
        status: 'active',
        trained_at: new Date(),
      },
      update: {
        version: `v1.${trainingRun.id.slice(-4)}`,
        description: `Pure-TypeScript Gradient-Boosted Regression (Friedman 2001). Trained on ${rows.length} (kelurahan × brand) synthetic samples with log-normal noise (sigma=0.35). Replaces the heuristic revenue projection with learned model.`,
        features: JSON.stringify(model.feature_names),
        hyperparameters: JSON.stringify({
          n_estimators: model.n_estimators,
          max_depth: model.max_depth,
          learning_rate: model.learning_rate,
        }),
        metrics: JSON.stringify(model.training_metrics),
        status: 'active',
        trained_at: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      run_id: trainingRun.id,
      model_id: 'mdl_gbr_revenue_v1',
      dataset_size: rows.length,
      train_duration_ms: trainDuration,
      metrics: model.training_metrics,
      feature_importance: featureImportance.slice(0, 10),
      history_sample: history.filter((_, i) => i % 10 === 0 || i === history.length - 1),
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/**
 * GET /api/locinsight/ml/train — list previous training runs
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const limit = Math.min(50, Number(sp.get('limit') || 20))
    const runs = await prisma.trainingRun.findMany({
      orderBy: { started_at: 'desc' },
      take: limit,
    })
    return NextResponse.json({
      success: true,
      count: runs.length,
      data: runs.map(r => ({
        id: r.id,
        model_name: r.model_name,
        algorithm: r.algorithm,
        status: r.status,
        dataset_size: r.dataset_size,
        metrics: JSON.parse((r.metrics as string) || '{}'),
        train_duration_ms: r.train_duration_ms,
        started_at: r.started_at,
        finished_at: r.finished_at,
        feature_importance: JSON.parse((r.feature_importance as string) || '[]').slice(0, 5),
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
