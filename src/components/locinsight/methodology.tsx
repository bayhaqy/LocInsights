'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Layers, Network, BookOpen, ArrowRight } from 'lucide-react'

/**
 * Methodology page — focused purely on the scoring framework & math.
 *
 * Project overview, data sources, capabilities, references, and tech stack
 * have been moved to the About page (per user request).
 */
export function Methodology() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
          Methodology
        </h2>
        <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
          Composite scoring formula · Huff Gravity Model · Gradient-Boosted Regression
        </p>
      </div>

      <Card className="card-premium bg-[var(--brand-cream)]">
        <CardContent className="p-3 flex items-center gap-2 text-[12px] text-[var(--brand-ink)]/70">
          <BookOpen className="w-4 h-4 text-[var(--brand-red)] flex-shrink-0" />
          <span>
            Looking for project overview, data sources, or research references? See the <strong>About</strong> page.
          </span>
        </CardContent>
      </Card>

      {/* Composite Score formula */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--brand-red)]" />
            Composite Score Formula (0-100)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-[13px] text-[var(--brand-ink)]/85 leading-relaxed">
            The composite score combines six weighted factors into a single 0–100 site-quality score.
            Weights are tunable in the A/B Simulator page so analysts can stress-test strategic assumptions.
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
        </CardContent>
      </Card>

      {/* Huff Model */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Network className="w-4 h-4 text-[var(--brand-red)]" />
            Huff Gravity Model — Market Share & Revenue Projection
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
            Gradient-Boosted Regression (Friedman 2001)
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
