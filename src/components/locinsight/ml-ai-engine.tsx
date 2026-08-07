'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Brain, Cpu, Target, Layers, TrendingUp, Sparkles, Activity, GitBranch, Database } from 'lucide-react'
import { toast } from 'sonner'

interface MLModel {
  id: string
  name: string
  version: string
  type: string
  algorithm: string
  description: string
  features: string
  hyperparameters: string
  metrics: string
  status: string
  trained_at: string
}

interface FeatureImportance {
  feature: string
  importance: number
  description: string
  source: string
}

interface Prediction {
  kelurahan_id: string
  kelurahan_name: string
  kab_name: string
  composite_score: number
  recommendation: string
  projected_monthly_revenue_juta: number
  estimated_daily_customers: number
  confidence: number
  top_driving_factors: { name: string; contribution: number }[]
}

interface Cluster {
  id: number
  name: string
  color: string
  count: number
  members: string[]
}

export function MLAIEngine() {
  const [models, setModels] = useState<MLModel[]>([])
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedModel, setSelectedModel] = useState('mdl_xgb_v2')
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    loadModels()
    loadFeatureImportance()
    loadClusters()
  }, [])

  useEffect(() => {
    loadPredictions(selectedModel)
  }, [selectedModel])

  async function loadModels() {
    setLoading('models')
    try {
      const res = await fetch('/api/locinsight/ml?action=models')
      const json = await res.json()
      if (json.success) setModels(json.data)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function loadFeatureImportance() {
    try {
      const res = await fetch('/api/locinsight/ml?action=feature_importance')
      const json = await res.json()
      if (json.success) setFeatureImportance(json.data)
    } catch {}
  }

  async function loadPredictions(modelId: string) {
    setLoading('predictions')
    try {
      const res = await fetch(`/api/locinsight/ml?action=predictions&model_id=${modelId}&limit=20`)
      const json = await res.json()
      if (json.success) setPredictions(json.data)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function loadClusters() {
    try {
      const res = await fetch('/api/locinsight/ml?action=clusters')
      const json = await res.json()
      if (json.success) setClusters(json.data.clusters)
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight flex items-center gap-2">
          <Brain className="w-6 h-6 text-[var(--brand-red)]" />
          ML / AI Engine
        </h2>
        <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
          Model registry, predictions, feature importance, and trade-area clustering — built on Aug 2026 best practices
        </p>
      </div>

      <Tabs defaultValue="models">
        <TabsList className="bg-[var(--brand-cream)]">
          <TabsTrigger value="models" className="text-[12px]">
            <Cpu className="w-3.5 h-3.5 mr-1.5" />
            Model Registry
          </TabsTrigger>
          <TabsTrigger value="predictions" className="text-[12px]">
            <Target className="w-3.5 h-3.5 mr-1.5" />
            Predictions
          </TabsTrigger>
          <TabsTrigger value="features" className="text-[12px]">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
            Feature Importance
          </TabsTrigger>
          <TabsTrigger value="clusters" className="text-[12px]">
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Trade-Area Clusters
          </TabsTrigger>
        </TabsList>

        {/* === Model Registry === */}
        <TabsContent value="models" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {models.map(m => (
              <Card key={m.id} className="card-premium">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <div className="w-9 h-9 rounded-md bg-[var(--brand-red)]/10 flex items-center justify-center flex-shrink-0">
                        <Cpu className="w-4 h-4 text-[var(--brand-red)]" />
                      </div>
                      <div>
                        <CardTitle className="text-[14px] text-[var(--brand-ink)] leading-tight">{m.name}</CardTitle>
                        <div className="text-[10.5px] text-[var(--brand-ink)]/50 mt-0.5">
                          {m.algorithm} · v{m.version}
                        </div>
                      </div>
                    </div>
                    <Badge variant={m.status === 'active' ? 'default' : 'secondary'} className="text-[9px] h-4">
                      {m.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-[11.5px] text-[var(--brand-ink)]/70 leading-relaxed">{m.description}</p>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/50 mb-1">Metrics</div>
                    <div className="grid grid-cols-4 gap-1 text-[10.5px]">
                      {(() => {
                        try {
                          const metrics = JSON.parse(m.metrics)
                          return Object.entries(metrics).slice(0, 4).map(([k, v]: any) => (
                            <div key={k} className="bg-[var(--brand-cream)] rounded p-1.5 text-center">
                              <div className="text-[9px] text-[var(--brand-ink)]/50 uppercase">{k}</div>
                              <div className="font-bold text-[var(--brand-red)]">{typeof v === 'number' ? v.toFixed(2) : String(v)}</div>
                            </div>
                          ))
                        } catch { return null }
                      })()}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/50 mb-1">Features ({JSON.parse(m.features || '[]').length})</div>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        try {
                          return JSON.parse(m.features).slice(0, 6).map((f: string) => (
                            <span key={f} className="text-[9.5px] px-1.5 py-0.5 rounded bg-[var(--brand-cream)] text-[var(--brand-ink)]/70">{f}</span>
                          ))
                        } catch { return null }
                      })()}
                      {JSON.parse(m.features || '[]').length > 6 && (
                        <span className="text-[9.5px] px-1.5 py-0.5 text-[var(--brand-ink)]/50">
                          +{JSON.parse(m.features || '[]').length - 6} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] text-[var(--brand-ink)]/50 pt-1 border-t border-[var(--brand-border)]">
                    Trained: {new Date(m.trained_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* === Predictions === */}
        <TabsContent value="predictions" className="space-y-3">
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                  Top Predictions
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="h-8 text-[12px] w-[260px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {models.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => loadPredictions(selectedModel)} className="h-8 text-[12px]">
                    <Activity className="w-3.5 h-3.5 mr-1.5" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading === 'predictions' ? (
                <div className="py-12 text-center text-[var(--brand-ink)]/40">Computing predictions…</div>
              ) : (
                <div className="space-y-2">
                  {predictions.map((p, i) => (
                    <div key={p.kelurahan_id} className="p-3 rounded-md border border-[var(--brand-border)] bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10.5px] font-mono text-[var(--brand-ink)]/40">#{i + 1}</span>
                            <div className="font-semibold text-[13px] text-[var(--brand-ink)]">{p.kelurahan_name}</div>
                            <Badge variant="outline" className="text-[9px] h-4">{p.kab_name}</Badge>
                          </div>
                          <div className="text-[10.5px] text-[var(--brand-ink)]/50 mt-0.5 ml-7">
                            Rec: <strong className="text-[var(--brand-red)]">{p.recommendation.replace('_', ' ')}</strong>
                            · Confidence: <strong>{(p.confidence * 100).toFixed(0)}%</strong>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[20px] font-bold text-[var(--brand-red)] num-tabular leading-tight">
                            {p.composite_score}
                          </div>
                          <div className="text-[9.5px] text-[var(--brand-ink)]/50 uppercase tracking-wider">Score</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
                        <div className="bg-[var(--brand-cream)] rounded p-2">
                          <div className="text-[9.5px] text-[var(--brand-ink)]/50 uppercase">Daily Cust.</div>
                          <div className="font-bold text-[var(--brand-ink)]">{p.estimated_daily_customers}</div>
                        </div>
                        <div className="bg-[var(--brand-cream)] rounded p-2">
                          <div className="text-[9.5px] text-[var(--brand-ink)]/50 uppercase">Monthly Rev</div>
                          <div className="font-bold text-[var(--brand-ink)]">Rp {p.projected_monthly_revenue_juta} jt</div>
                        </div>
                        <div className="bg-[var(--brand-cream)] rounded p-2">
                          <div className="text-[9.5px] text-[var(--brand-ink)]/50 uppercase">Confidence</div>
                          <div className="font-bold text-[var(--brand-ink)]">{(p.confidence * 100).toFixed(0)}%</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[9.5px] uppercase tracking-wider text-[var(--brand-ink)]/50">Top driving factors (SHAP-style)</div>
                        {p.top_driving_factors.map((f, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <div className="text-[11px] text-[var(--brand-ink)]/70 w-32 truncate">{f.name}</div>
                            <div className="flex-1 h-1.5 bg-[var(--brand-cream)] rounded overflow-hidden">
                              <div
                                className="h-full bg-[var(--brand-red)]"
                                style={{ width: `${(f.contribution / 30) * 100}%` }}
                              />
                            </div>
                            <div className="text-[10.5px] font-mono text-[var(--brand-ink)]/60 w-8 text-right">{f.contribution.toFixed(1)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Feature Importance === */}
        <TabsContent value="features" className="space-y-3">
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                Feature Importance (XGBoost + RF aggregated)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11.5px] text-[var(--brand-ink)]/60 mb-4">
                Shows which features most strongly drive the composite opportunity score. Useful for explaining predictions to business stakeholders.
              </p>
              <div className="space-y-2">
                {featureImportance.map(f => (
                  <div key={f.feature} className="flex items-center gap-3">
                    <div className="text-[12px] font-medium text-[var(--brand-ink)] w-44 truncate">{f.feature}</div>
                    <div className="flex-1 h-6 bg-[var(--brand-cream)] rounded overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--brand-red)] to-[#7A0A1A] flex items-center px-2"
                        style={{ width: `${(f.importance / 0.15) * 100}%` }}
                      >
                        <span className="text-[10px] font-bold text-white">{(f.importance * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="text-[10.5px] text-[var(--brand-ink)]/60 w-72 truncate" title={f.description}>
                      {f.description}
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4 flex-shrink-0">{f.source}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Clusters === */}
        <TabsContent value="clusters" className="space-y-3">
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                K-Means Trade-Area Archetypes (k=6)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11.5px] text-[var(--brand-ink)]/60 mb-4">
                Each kelurahan is assigned to one of 6 archetypes based on demographic, POI, and accessibility features. Use this for portfolio strategy and tier-based expansion.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {clusters.map(c => (
                  <div key={c.id} className="p-3 rounded-md border border-[var(--brand-border)] bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                        <div className="font-semibold text-[13px] text-[var(--brand-ink)]">{c.name}</div>
                      </div>
                      <Badge variant="secondary" className="text-[9.5px] h-4">{c.count} kel.</Badge>
                    </div>
                    <div className="text-[10.5px] text-[var(--brand-ink)]/60 mb-2">
                      Sample members:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {c.members.map((m, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-cream)] text-[var(--brand-ink)]/70">
                          {m}
                        </span>
                      ))}
                      {c.count > c.members.length && (
                        <span className="text-[10px] px-1.5 py-0.5 text-[var(--brand-ink)]/50">
                          +{c.count - c.members.length} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer info */}
      <Card className="card-premium bg-[var(--brand-cream)]">
        <CardContent className="py-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11.5px] text-[var(--brand-ink)]/70">
            <div className="flex items-start gap-2">
              <GitBranch className="w-3.5 h-3.5 mt-0.5 text-[var(--brand-red)]" />
              <div>
                <div className="font-semibold text-[var(--brand-ink)]">Model Versioning</div>
                <div className="text-[10.5px] text-[var(--brand-ink)]/60">MLflow-style registry, A/B testing ready</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 text-[var(--brand-red)]" />
              <div>
                <div className="font-semibold text-[var(--brand-ink)]">SHAP Explainability</div>
                <div className="text-[10.5px] text-[var(--brand-ink)]/60">Per-prediction factor contributions</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Database className="w-3.5 h-3.5 mt-0.5 text-[var(--brand-red)]" />
              <div>
                <div className="font-semibold text-[var(--brand-ink)]">Feature Store</div>
                <div className="text-[10.5px] text-[var(--brand-ink)]/60">BPS, OSM, MAP internal POS, mobile foot traffic</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
