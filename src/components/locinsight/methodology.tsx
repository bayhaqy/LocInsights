'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Layers, Network, BookOpen, ArrowRight, Database, GitBranch, Target } from 'lucide-react'

/**
 * Methodology page — the actual methods, formulas, and models used to produce
 * the results (composite score, market share, revenue projection).
 *
 * Project overview, data sources, tech stack, and capabilities live on the
 * About page (per user request — no duplication).
 */
export function Methodology() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
          Methodology
        </h2>
        <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
          How LocInsight produces opportunity scores, market share estimates, and revenue projections
        </p>
      </div>

      <Card className="card-premium bg-[var(--brand-cream)]">
        <CardContent className="p-3 flex items-center gap-2 text-[12px] text-[var(--brand-ink)]/70">
          <BookOpen className="w-4 h-4 text-[var(--brand-red)] flex-shrink-0" />
          <span>
            Looking for project overview, data sources, or tech stack? See the <strong>About</strong> page.
          </span>
        </CardContent>
      </Card>

      {/* Methodology Overview / Pipeline */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[var(--brand-red)]" />
            Methodology Overview — End-to-End Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <p className="text-[13px] text-[var(--brand-ink)]/85 leading-relaxed">
            LocInsight's methodology follows a 4-step pipeline that transforms raw public data into actionable
            expansion recommendations. Each step is transparent and auditable — every score can be traced back
            to its source data and the formula that produced it.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <PipelineStep
              step="1"
              title="Data Collection"
              desc="Ingest from BPS (demographics), OpenStreetMap (POIs, competitors, stores), GADM (boundaries), and MAP/MAA brand directory. All records tagged with source provenance."
            />
            <PipelineStep
              step="2"
              title="Feature Engineering"
              desc="Compute 10 canonical features per kelurahan: competitor density (1km/3km), POI density, mall distance, income/tourist/transport indices, population density, coastal flag, mall flag."
            />
            <PipelineStep
              step="3"
              title="Multi-Model Scoring"
              desc="Composite Weighted Scoring (0-100) for site quality + Huff Gravity Model for market share + GBR for revenue. Models run independently and cross-validate each other."
            />
            <PipelineStep
              step="4"
              title="Ranking & Recommendation"
              desc="Kelurahan ranked by composite score. Classified into High Priority (≥70), Priority (55-69), Monitor (40-54), Avoid (<40). SHAP contributions explain why."
            />
          </div>
        </CardContent>
      </Card>

      {/* Composite Score formula */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--brand-red)]" />
            Step 3a: Composite Score Formula (0-100)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-[13px] text-[var(--brand-ink)]/85 leading-relaxed">
            The composite score combines six weighted factors into a single 0–100 site-quality score.
            Weights are tunable in the A/B Simulator page so analysts can stress-test strategic assumptions.
            Each factor is normalized to a 0–100 sub-score before weighting, so no single factor dominates
            due to scale differences.
          </p>

          <div className="bg-[var(--brand-ink)] text-white p-4 rounded-md font-mono text-[11px] leading-relaxed overflow-x-auto">
            <div className="text-white/60">{'// Composite Score (0-100)'}</div>
            <div>composite_score =</div>
            <div className="pl-4">0.30 × MarketPotential +      <span className="text-[#FFB3B3]">{'// population, density, income'}</span></div>
            <div className="pl-4">0.15 × Accessibility +         <span className="text-[#FFB3B3]">{'// transit, road density'}</span></div>
            <div className="pl-4">0.20 × FootTraffic +           <span className="text-[#FFB3B3]">{'// mall proximity, POI, tourist'}</span></div>
            <div className="pl-4">0.15 × Competition +           <span className="text-[#FFB3B3]">{'// same-brand cannibalization'}</span></div>
            <div className="pl-4">0.10 × Socioeconomic +        <span className="text-[#FFB3B3]">{'// income-brand fit, HDI'}</span></div>
            <div className="pl-4">0.10 × NetworkSynergy         <span className="text-[#FFB3B3]">{'// cluster effect'}</span></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <FactorCard name="Market Potential" weight="30%" desc="Population × 1.4 (trade area catchment), density, parent kabupaten GDRP per capita. Tourist multiplier for coastal + high tourist_index areas." />
            <FactorCard name="Accessibility" weight="15%" desc="Road density proxy via urban_index, transit hub proximity (airport, port, terminal). Capital city bonus +15." />
            <FactorCard name="Foot Traffic" weight="20%" desc="Nearest mall distance (decay: 0 at 5km+), POI density (tourist attraction + beach + hotel cluster + office + university), tourist index." />
            <FactorCard name="Competition" weight="15%" desc="Same-brand within 2km: 1 store → -60pts, 2+ stores → -100pts (cannibalization). Other brand density: -5pts per store (saturation)." />
            <FactorCard name="Socioeconomic" weight="10%" desc="Brand price-segment vs local income_index match (luxury needs ≥60, mass works anywhere). Tourist area bonus +15." />
            <FactorCard name="Network Synergy" weight="10%" desc="Other MAP stores within 5km: +12pts each (cluster effect). Mall co-location bonus +25 if within 1km." />
          </div>

          <div className="mt-3 p-3 bg-[var(--brand-cream)] rounded-md text-[11.5px] text-[var(--brand-ink)]/80">
            <strong>Recommendation thresholds:</strong> High Priority = score ≥ 70 · Priority = 55–69 · Monitor = 40–54 · Avoid = &lt; 40.
            These thresholds are calibrated to Bali's current market and can be adjusted in the A/B Simulator.
          </div>
        </CardContent>
      </Card>

      {/* Feature Engineering */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Database className="w-4 h-4 text-[var(--brand-red)]" />
            Step 2: Feature Engineering — 10 Canonical Features
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-[13px] text-[var(--brand-ink)]/85 leading-relaxed">
            Each kelurahan is enriched with 10 spatial features computed from the raw data. These features feed
            into both the composite score (as sub-factor inputs) and the GBR model (as training features).
            All distances use Haversine formula; densities use 1km and 3km radius buffers.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11.5px]">
            <FeatureRow name="competitor_density_1km" desc="Count of competitor stores within 1km radius" />
            <FeatureRow name="competitor_density_3km" desc="Count of competitor stores within 3km radius" />
            <FeatureRow name="poi_density_1km" desc="Count of POIs (tourist, beach, temple, hotel) within 1km" />
            <FeatureRow name="mall_distance_m" desc="Haversine distance to nearest mall (meters)" />
            <FeatureRow name="income_index" desc="BPS-derived income index (0-100, kabupaten-level GDRP proxy)" />
            <FeatureRow name="population_density" desc="Population / area_km² (kelurahan-level from BPS 2024)" />
            <FeatureRow name="tourist_index" desc="Tourist intensity (hotel count + attraction density, 0-100)" />
            <FeatureRow name="transport_index" desc="Transit accessibility (airport/port/terminal proximity, 0-100)" />
            <FeatureRow name="is_coastal" desc="Boolean: kelurahan borders coastline (tourist multiplier)" />
            <FeatureRow name="is_in_mall" desc="Boolean: candidate site is inside a shopping mall" />
          </div>
        </CardContent>
      </Card>

      {/* Huff Model */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Network className="w-4 h-4 text-[var(--brand-red)]" />
            Step 3b: Huff Gravity Model — Market Share & Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <p className="text-[13px] text-[var(--brand-ink)]/85 leading-relaxed">
            The Huff Model (Huff 1964, validated by MIT 2021 with transactional data) computes the probability
            that a customer in zone <em>i</em> chooses store <em>j</em>, based on the store's attractiveness
            and the distance to it. The denominator sums over all competing stores (including MAA's own), so
            adding a new store naturally cannibalizes nearby ones — the model captures this automatically.
          </p>

          <div className="bg-[var(--brand-ink)] text-white p-4 rounded-md font-mono text-[11px] leading-relaxed overflow-x-auto">
            <div className="text-white/60">{'// Huff Gravity Model'}</div>
            <div>P(customer at zone i visits store j) =</div>
            <div className="pl-4">A_j / d_ij^λ</div>
            <div className="pl-4">─────────────────────</div>
            <div className="pl-4">Σ_k (A_k / d_ik^λ)</div>
            <div className="mt-3 text-white/60">{'// Where:'}</div>
            <div>A_j = Attractiveness of store j</div>
            <div className="pl-4">= store_size_m² × brand_strength × format_factor × freshness</div>
            <div>d_ij = distance zone i → store j (km, Haversine proxy)</div>
            <div>λ = distance decay (F&B: 1.5, sports: 2.0, fashion: 1.9, dept store: 2.2)</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="bg-[var(--brand-cream)] p-3 rounded-md">
              <div className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 font-medium mb-1">Attractiveness</div>
              <div className="text-[12px] text-[var(--brand-ink)]/85">
                Store size × brand strength (0.6–0.95) × format factor (Starbucks +25%, Sogo +20%, multi-brand sports +15%).
              </div>
            </div>
            <div className="bg-[var(--brand-cream)] p-3 rounded-md">
              <div className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 font-medium mb-1">Revenue Projection</div>
              <div className="text-[12px] text-[var(--brand-ink)]/85">
                daily_customers = trade_area_pop × conversion_rate × market_share × tourist_multiplier<br />
                monthly_revenue = daily_customers × avg_ticket_size × 30
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GBR */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-[var(--brand-red)]" />
            Step 3c: Gradient-Boosted Regression (Friedman 2001)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-[13px] text-[var(--brand-ink)]/85 leading-relaxed">
            For revenue prediction, LocInsight trains a Gradient-Boosted Regression (GBR) tree ensemble
            (Friedman 2001) on historical site features. GBR builds trees sequentially, where each new
            tree corrects the residual errors of the ensemble so far. This makes it extremely effective
            for capturing non-linear relationships and interactions between features (e.g. competitor
            density matters more in low-income areas than in tourist hubs).
          </p>
          <p className="text-[13px] text-[var(--brand-ink)]/85 leading-relaxed">
            The model runs in-browser via Pyodide (Python compiled to WebAssembly) inside a HuggingFace Space,
            so no data leaves the client. Analysts can retrain on the fly with custom hyperparameters and
            immediately see the impact on revenue projections.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[var(--brand-cream)] p-3 rounded-md">
              <div className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 font-medium mb-1">Hyperparameters (default)</div>
              <div className="text-[12px] text-[var(--brand-ink)]/85 font-mono">
                n_estimators = 80<br />
                max_depth = 3<br />
                learning_rate = 0.1<br />
                subsample = 0.8<br />
                loss = mse
              </div>
            </div>
            <div className="bg-[var(--brand-cream)] p-3 rounded-md">
              <div className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 font-medium mb-1">Per-prediction explanation</div>
              <div className="text-[12px] text-[var(--brand-ink)]/85">
                Each prediction includes SHAP-style tree-path contributions per feature, so analysts can see
                <em> why</em> the model scored a site the way it did. Top-5 contributing features are surfaced
                in the Deep Analysis page.
              </div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-[var(--brand-cream)] rounded-md text-[11.5px] text-[var(--brand-ink)]/80">
            <strong>10 canonical features:</strong> competitor_density_1km, competitor_density_3km,
            poi_density_1km, mall_distance_m, income_index, population_density, tourist_index,
            transport_index, is_coastal, is_in_mall.
          </div>
        </CardContent>
      </Card>

      {/* Validation & Limitations */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--brand-red)]" />
            Step 4: Validation, Limitations & Continuous Improvement
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-[13px] text-[var(--brand-ink)]/85 leading-relaxed">
            The methodology is designed for transparency and iterability. Every score can be decomposed into
            its contributing factors, and every recommendation carries a confidence indicator based on data
            completeness and model agreement.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[var(--brand-cream)] p-3 rounded-md">
              <div className="text-[12px] font-bold text-[var(--brand-ink)] mb-1">Model Cross-Validation</div>
              <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">
                Composite score and GBR revenue prediction are computed independently. When both agree on a
                High Priority site, confidence is high. Divergence flags sites needing manual review.
              </div>
            </div>
            <div className="bg-[var(--brand-cream)] p-3 rounded-md">
              <div className="text-[12px] font-bold text-[var(--brand-ink)] mb-1">Data Freshness</div>
              <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">
                Competitor and POI data refreshed daily via OSM Overpass cron. BPS demographics updated annually.
                Staleness indicator shown per record in Data Manager.
              </div>
            </div>
            <div className="bg-[var(--brand-cream)] p-3 rounded-md">
              <div className="text-[12px] font-bold text-[var(--brand-ink)] mb-1">Known Limitations</div>
              <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">
                Trade area uses Haversine distance (not road network). Tourist index is a proxy from hotel/attraction
                density. GBR trained on synthetic data until real store-performance data is available.
              </div>
            </div>
            <div className="bg-[var(--brand-cream)] p-3 rounded-md">
              <div className="text-[12px] font-bold text-[var(--brand-ink)] mb-1">A/B Weight Tuning</div>
              <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">
                Analysts can tune all 6 composite weights live and compare rankings before/after. This enables
                strategic scenario testing (e.g. "what if we prioritize foot traffic over income?").
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PipelineStep({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="border border-[var(--brand-border)] rounded-md p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-6 h-6 rounded-full bg-[var(--brand-red)] text-white text-[11px] font-bold flex items-center justify-center">{step}</span>
        <span className="text-[12px] font-bold text-[var(--brand-ink)]">{title}</span>
      </div>
      <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">{desc}</div>
    </div>
  )
}

function FactorCard({ name, weight, desc }: { name: string; weight: string; desc: string }) {
  return (
    <div className="bg-[var(--brand-cream)] rounded-md p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-bold text-[var(--brand-ink)]">{name}</span>
        <span className="text-[11px] font-bold text-[var(--brand-red)] num-tabular">{weight}</span>
      </div>
      <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">{desc}</div>
    </div>
  )
}

function FeatureRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 py-1 border-b border-[var(--brand-border)]/50">
      <code className="text-[11px] text-[var(--brand-red)] font-mono flex-shrink-0 min-w-[180px]">{name}</code>
      <span className="text-[11px] text-[var(--brand-ink)]/70">{desc}</span>
    </div>
  )
}
