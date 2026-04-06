'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ExternalLink, Clock, Package, Shield, ChevronDown, ChevronUp } from 'lucide-react'

interface Tier {
  name: string
  turnaround: string
  cost: number
  shippingTotal: number
  gradedValue: number
  profit: number
  roi: number
  worthIt: boolean
}

interface GradingService {
  name: string
  url: string
  logo: string
  tiers: Tier[]
  bestTier: Tier
}

interface Analysis {
  cardName: string
  game: string
  setName: string
  year: string
  rarity: string
  language: string
  condition: {
    overall: string
    centering: string
    surfaces: string
    corners: string
    edges: string
  }
  estimatedPSAGrade: number
  gradeConfidence: string
  estimatedRawValue: number
  estimatedGradedValue: { PSA10: number; PSA9: number; PSA8: number }
  gradingRecommendation: 'GRADE' | 'SKIP' | 'MAYBE'
  recommendationReason: string
  keyIssues: string[]
}

interface ResultData {
  analysis: Analysis
  gradingAnalysis: Record<string, GradingService>
  imagePreview: string
}

const VERDICT_CONFIG = {
  GRADE: { label: 'GRADE IT', color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', icon: TrendingUp },
  SKIP: { label: 'SKIP IT', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: TrendingDown },
  MAYBE: { label: 'BORDERLINE', color: '#F5B731', bg: 'rgba(245,183,49,0.1)', border: 'rgba(245,183,49,0.3)', icon: Minus },
}

function GradeBar({ value }: { value: number }) {
  const pct = (value / 10) * 100
  const color = value >= 9 ? '#22C55E' : value >= 7 ? '#F5B731' : '#EF4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color, minWidth: 28 }}>{value}</span>
    </div>
  )
}

function ConditionBadge({ label, value }: { label: string; value: string }) {
  const isGood = ['Perfect', 'Good', 'Clean', 'Sharp', 'Mint', 'Near Mint'].some(g => value.includes(g))
  const color = isGood ? '#22C55E' : '#F5B731'
  return (
    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ fontSize: 10, color: '#666', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13, color, fontFamily: 'var(--font-body)', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function ServiceCard({ service }: { service: GradingService }) {
  const [expanded, setExpanded] = useState(false)
  const best = service.bestTier
  return (
    <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: '#111113', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 2, color: '#E8E8EC' }}>{service.logo}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{service.name}</div>
          </div>
          <a href={service.url} target="_blank" rel="noopener noreferrer" style={{ color: '#F5B731', opacity: 0.7 }}>
            <ExternalLink size={14} />
          </a>
        </div>
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(245,183,49,0.06)', border: '1px solid rgba(245,183,49,0.15)' }}>
          <div style={{ fontSize: 11, color: '#F5B731', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>RECOMMENDED TIER</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#E8E8EC', marginBottom: 2 }}>{best.name}</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#888' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {best.turnaround}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Package size={11} /> +${best.shippingTotal} ship</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: best.worthIt ? '#22C55E' : '#F5B731', fontWeight: 700 }}>${best.cost}</div>
              <div style={{ fontSize: 11, color: '#666' }}>grading fee</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          { label: 'TOTAL COST', value: `$${best.cost + best.shippingTotal}`, color: undefined },
          { label: 'GRADED VALUE', value: `$${best.gradedValue}`, color: undefined },
          { label: 'NET PROFIT', value: `${best.profit >= 0 ? '+' : ''}$${best.profit}`, color: best.profit > 0 ? '#22C55E' : '#EF4444' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 0.5, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: s.color || '#E8E8EC', fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>
      <button onClick={() => setExpanded(!expanded)} style={{
        width: '100%', padding: '12px 24px', background: 'rgba(255,255,255,0.03)',
        border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)',
        color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
      }}>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? 'Hide' : 'Show all'} tiers
      </button>
      {expanded && (
        <div style={{ padding: '0 24px 20px' }}>
          {service.tiers.map((tier, i) => (
            <div key={i} style={{
              padding: '12px 0', borderBottom: i < service.tiers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: 13, color: '#E8E8EC', fontWeight: 500 }}>{tier.name}</div>
                <div style={{ fontSize: 11, color: '#555' }}>{tier.turnaround}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', color: '#E8E8EC' }}>${tier.cost}</div>
                <div style={{ fontSize: 11, color: tier.worthIt ? '#22C55E' : '#EF4444' }}>
                  {tier.profit >= 0 ? '+' : ''}${tier.profit} profit
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ResultsPage() {
  const [data, setData] = useState<ResultData | null>(null)
  const router = useRouter()

  useEffect(() => {
    const stored = sessionStorage.getItem('gradeornot_result')
    if (!stored) { router.push('/'); return }
    setData(JSON.parse(stored))
  }, [router])

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', color: '#F5B731', fontSize: 13, letterSpacing: 1 }}>LOADING...</div>
    </div>
  )

  const { analysis, gradingAnalysis, imagePreview } = data
  const verdict = VERDICT_CONFIG[analysis.gradingRecommendation]
  const VerdictIcon = verdict.icon

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => router.push('/')} style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
          color: '#888', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-body)'
        }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ height: 20, width: 1, background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555', letterSpacing: 1 }}>ANALYSIS REPORT</span>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 32, marginBottom: 48 }}>
          <div>
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(245,183,49,0.2)', background: '#111113' }}>
              <img src={imagePreview} alt={analysis.cardName} style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 320 }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: '#F5B731', fontFamily: 'var(--font-mono)', letterSpacing: 2, marginBottom: 8 }}>
                {analysis.game.toUpperCase()} · {analysis.rarity}
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, letterSpacing: 3, color: '#E8E8EC', margin: '0 0 6px', lineHeight: 1 }}>
                {analysis.cardName}
              </h1>
              <div style={{ fontSize: 14, color: '#666' }}>
                {analysis.setName}{analysis.year ? ` · ${analysis.year}` : ''} · {analysis.language}
              </div>
            </div>
            <div style={{ padding: '20px', borderRadius: 16, background: '#111113', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 4 }}>EST. PSA GRADE</div>
                  <div style={{ fontSize: 48, fontFamily: 'var(--font-mono)', color: analysis.estimatedPSAGrade >= 9 ? '#22C55E' : '#F5B731', lineHeight: 1, fontWeight: 700 }}>
                    {analysis.estimatedPSAGrade}
                  </div>
                </div>
                <div style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(245,183,49,0.1)', border: '1px solid rgba(245,183,49,0.2)', fontSize: 12, color: '#F5B731', fontFamily: 'var(--font-mono)' }}>
                  {analysis.gradeConfidence}
                </div>
              </div>
              <GradeBar value={analysis.estimatedPSAGrade} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'RAW VALUE', value: `$${analysis.estimatedRawValue}` },
                { label: 'PSA 10', value: `$${analysis.estimatedGradedValue.PSA10}` },
                { label: 'PSA 9', value: `$${analysis.estimatedGradedValue.PSA9}` },
              ].map((v, i) => (
                <div key={i} style={{ padding: '16px', borderRadius: 12, background: '#111113', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>{v.label}</div>
                  <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: '#E8E8EC', fontWeight: 700 }}>{v.value}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '24px', borderRadius: 16, background: verdict.bg, border: `2px solid ${verdict.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `rgba(${verdict.color === '#22C55E' ? '34,197,94' : verdict.color === '#EF4444' ? '239,68,68' : '245,183,49'},0.15)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <VerdictIcon size={20} color={verdict.color} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#666', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 2 }}>VERDICT</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: verdict.color, letterSpacing: 3 }}>{verdict.label}</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: '#B0B0B8', margin: 0, lineHeight: 1.5 }}>{analysis.recommendationReason}</p>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: 3, color: '#E8E8EC', marginBottom: 20 }}>CONDITION BREAKDOWN</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            <ConditionBadge label="Overall" value={analysis.condition.overall} />
            <ConditionBadge label="Centering" value={analysis.condition.centering} />
            <ConditionBadge label="Surfaces" value={analysis.condition.surfaces} />
            <ConditionBadge label="Corners" value={analysis.condition.corners} />
            <ConditionBadge label="Edges" value={analysis.condition.edges} />
          </div>
          {analysis.keyIssues && analysis.keyIssues.length > 0 && (
            <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div style={{ fontSize: 11, color: '#EF4444', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>KEY ISSUES DETECTED</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {analysis.keyIssues.map((issue, i) => (
                  <span key={i} style={{ fontSize: 13, padding: '4px 12px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#FC8181' }}>{issue}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: 3, color: '#E8E8EC', margin: 0 }}>GRADING SERVICES</h2>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555', fontFamily: 'var(--font-mono)' }}>
              <Shield size={12} /> REAL COSTS INCLUDED
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {Object.values(gradingAnalysis).map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 64, textAlign: 'center' }}>
          <button onClick={() => { sessionStorage.clear(); router.push('/') }} style={{
            padding: '16px 40px', borderRadius: 12,
            background: 'rgba(245,183,49,0.08)', border: '1px solid rgba(245,183,49,0.3)',
            color: '#F5B731', fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500
          }}>
            Scan another card
          </button>
        </div>
      </div>
    </div>
  )
}
