'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ExternalLink, Clock, Package, Shield, ChevronDown, ChevronUp, Database } from 'lucide-react'
import GradeAnalysis from '../components/GradeAnalysis'
import MarketDataComponent from '../components/MarketData'
import ExportPDF from '../components/ExportPDF'
import ROICalculator from '../components/ROICalculator'

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
  version: string
  setNumber: string
  condition: {
    overall: string
    centering: string
    surfaces: string
    corners: string
    edges: string
  }
  criteriaScores: {
    centering: number
    surfaces: number
    corners: number
    edges: number
  }
  estimatedPSAGrade: number
  gradeConfidence: number
  estimatedRawValue: number
  estimatedGradedValue: { PSA10: number; PSA9: number; PSA8: number }
  gradingRecommendation: 'GRADE' | 'SKIP' | 'MAYBE'
  recommendationReason: string
  keyIssues: string[]
  realPriceFound: boolean
  priceSource: string
  realPriceData: { low: number | null; mid: number | null; high: number | null; market: number | null } | null
  cardImage: string | null
  gradeProbabilities?: { psa10: number; psa9: number; psa8: number; psa7: number }
  psaPopulation?: { total: number; byGrade: Record<string, number>; source: string } | null
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

function ServiceCard({ service }: { service: GradingService }) {
  const [expanded, setExpanded] = useState(false)
  const best = service.bestTier
  return (
    <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: '#111113', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: '#E8E8EC' }}>{service.logo}</div>
            <div style={{ fontSize: 11, color: '#666' }}>{service.name}</div>
          </div>
          <a href={service.url} target="_blank" rel="noopener noreferrer" style={{ color: '#F5B731', opacity: 0.7 }}>
            <ExternalLink size={14} />
          </a>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,183,49,0.06)', border: '1px solid rgba(245,183,49,0.15)' }}>
          <div style={{ fontSize: 10, color: '#F5B731', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>RECOMMENDED TIER</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#E8E8EC', marginBottom: 2 }}>{best.name}</div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#888' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {best.turnaround}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Package size={10} /> +${best.shippingTotal}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontFamily: 'var(--font-mono)', color: best.worthIt ? '#22C55E' : '#F5B731', fontWeight: 700 }}>${best.cost}</div>
              <div style={{ fontSize: 10, color: '#666' }}>grading fee</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'TOTAL COST', value: `$${best.cost + best.shippingTotal}`, color: undefined },
          { label: 'GRADED VALUE', value: `$${best.gradedValue}`, color: undefined },
          { label: 'NET PROFIT', value: `${best.profit >= 0 ? '+' : ''}$${best.profit}`, color: best.profit > 0 ? '#22C55E' : '#EF4444' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color: s.color || '#E8E8EC', fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>
      <button onClick={() => setExpanded(!expanded)} style={{
        width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)',
        border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)',
        color: '#666', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
      }}>
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        {expanded ? 'Hide' : 'Show all'} tiers
      </button>
      {expanded && (
        <div style={{ padding: '0 20px 16px' }}>
          {service.tiers.map((tier, i) => (
            <div key={i} style={{
              padding: '10px 0', borderBottom: i < service.tiers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: 13, color: '#E8E8EC', fontWeight: 500 }}>{tier.name}</div>
                <div style={{ fontSize: 11, color: '#555' }}>{tier.turnaround}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: '#E8E8EC' }}>${tier.cost}</div>
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
  const displayImage = analysis.cardImage || imagePreview

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B' }}>
      <style>{`
        .results-grid { display: grid; grid-template-columns: 220px 1fr; gap: 24px; }
        .values-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .condition-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
        @media (max-width: 640px) {
          .results-grid { grid-template-columns: 1fr !important; }
          .values-grid { grid-template-columns: 1fr 1fr !important; }
          .services-grid { grid-template-columns: 1fr !important; }
          .condition-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <nav style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: '#0A0A0B', zIndex: 50 }}>
        <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>
          <ArrowLeft size={15} /> Back
        </button>
        <div style={{ height: 16, width: 1, background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555', letterSpacing: 1 }}>ANALYSIS REPORT</span>
        {analysis.realPriceFound && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <Database size={10} color="#22C55E" />
            <span style={{ fontSize: 10, color: '#22C55E', fontFamily: 'var(--font-mono)' }}>LIVE · {analysis.priceSource}</span>
          </div>
        )}
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px 80px' }}>

        {/* Card + Info */}
        <div className="results-grid" style={{ marginBottom: 32 }}>
          <div>
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(245,183,49,0.2)', background: '#111113', marginBottom: 12 }}>
              <img src={displayImage} alt={analysis.cardName} style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 300 }} />
            </div>
            {analysis.realPriceFound && analysis.realPriceData && (
              <div style={{ padding: '12px 14px', borderRadius: 12, background: '#111113', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 9, color: '#22C55E', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>LIVE MARKET</div>
                {[
                  { label: 'Low', value: analysis.realPriceData.low },
                  { label: 'Mid', value: analysis.realPriceData.mid },
                  { label: 'Market', value: analysis.realPriceData.market },
                  { label: 'High', value: analysis.realPriceData.high },
                ].filter(p => p.value).map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={{ fontSize: 11, color: '#555' }}>{p.label}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#E8E8EC' }}>${p.value!.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#F5B731', fontFamily: 'var(--font-mono)', letterSpacing: 2, marginBottom: 6 }}>
                {analysis.game.toUpperCase()} · {analysis.rarity}
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 5vw, 40px)', letterSpacing: 2, color: '#E8E8EC', margin: '0 0 4px', lineHeight: 1 }}>
                {analysis.cardName}
              </h1>
              <div style={{ fontSize: 13, color: '#666' }}>
                {[analysis.setName, analysis.setNumber, analysis.year, analysis.version, analysis.language].filter(Boolean).join(' · ')}
              </div>
            </div>

            {/* Grade */}
            <div style={{ padding: '16px', borderRadius: 14, background: '#111113', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 4 }}>EST. PSA GRADE</div>
                  <div style={{ fontSize: 42, fontFamily: 'var(--font-mono)', color: analysis.estimatedPSAGrade >= 9 ? '#22C55E' : '#F5B731', lineHeight: 1, fontWeight: 700 }}>
                    {analysis.estimatedPSAGrade}
                  </div>
                </div>

              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(analysis.estimatedPSAGrade / 10) * 100}%`, height: '100%', background: analysis.estimatedPSAGrade >= 9 ? '#22C55E' : '#F5B731', borderRadius: 3 }} />
              </div>
            </div>

            {/* Values */}
            <div className="values-grid">
              {[
                { label: analysis.realPriceFound ? 'MARKET PRICE' : 'RAW VALUE', value: `$${analysis.estimatedRawValue}`, highlight: analysis.realPriceFound },
                { label: 'PSA 10 EST.', value: `$${analysis.estimatedGradedValue.PSA10}`, highlight: false },
                { label: 'PSA 9 EST.', value: `$${analysis.estimatedGradedValue.PSA9}`, highlight: false },
              ].map((v, i) => (
                <div key={i} style={{ padding: '12px', borderRadius: 10, textAlign: 'center', background: '#111113', border: v.highlight ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 9, color: v.highlight ? '#22C55E' : '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 4 }}>{v.label}</div>
                  <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: '#E8E8EC', fontWeight: 700 }}>{v.value}</div>
                </div>
              ))}
            </div>

            {/* Verdict */}
            <div style={{ padding: '20px', borderRadius: 14, background: verdict.bg, border: `2px solid ${verdict.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `rgba(${verdict.color === '#22C55E' ? '34,197,94' : verdict.color === '#EF4444' ? '239,68,68' : '245,183,49'},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <VerdictIcon size={18} color={verdict.color} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#666', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 2 }}>VERDICT</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: verdict.color, letterSpacing: 3 }}>{verdict.label}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#B0B0B8', margin: 0, lineHeight: 1.5 }}>{analysis.recommendationReason}</p>
            </div>
          </div>
        </div>

        {/* ROI Calculator — coeur de l app */}
        {analysis.criteriaScores && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3, color: '#E8E8EC', marginBottom: 20 }}>ROI CALCULATOR</h2>
            <ROICalculator
              cardName={analysis.cardName}
              rawValue={analysis.estimatedRawValue}
              gradedValues={analysis.estimatedGradedValue}
              psaGrade={analysis.estimatedPSAGrade}
              gradeProbabilities={analysis.gradeProbabilities || {
                psa10: Math.round((analysis.estimatedPSAGrade >= 9.5 ? 35 : analysis.estimatedPSAGrade >= 9 ? 15 : 5)),
                psa9: Math.round((analysis.estimatedPSAGrade >= 9 ? 45 : 25)),
                psa8: 20,
                psa7: 15,
              }}
            />
          </div>
        )}

        {/* Visual Grade Analysis */}
        {analysis.criteriaScores && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3, color: '#E8E8EC', marginBottom: 20 }}>VISUAL GRADE ANALYSIS</h2>
            <GradeAnalysis
              criteria={analysis.criteriaScores}
              psaGrade={analysis.estimatedPSAGrade}
              confidence={analysis.gradeConfidence}
              gradeProbabilities={analysis.gradeProbabilities}
              psaPopulation={analysis.psaPopulation}
            />
          </div>
        )}

        {/* Key issues */}
        {analysis.keyIssues && analysis.keyIssues.length > 0 && (
          <div style={{ marginBottom: 32, padding: '14px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ fontSize: 10, color: '#EF4444', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>KEY ISSUES DETECTED</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {analysis.keyIssues.map((issue, i) => (
                <span key={i} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#FC8181' }}>{issue}</span>
              ))}
            </div>
          </div>
        )}

        {/* Market Data */}
        {analysis.cardName && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3, color: '#E8E8EC', marginBottom: 20 }}>MARKET DATA</h2>
            <MarketDataComponent cardName={analysis.cardName} game={analysis.game} setName={analysis.setName} />
          </div>
        )}

        {/* Grading services */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3, color: '#E8E8EC', margin: 0 }}>GRADING SERVICES</h2>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#555', fontFamily: 'var(--font-mono)' }}>
              <Shield size={11} /> REAL COSTS
            </div>
          </div>
          <div className="services-grid">
            {Object.values(gradingAnalysis).map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <ExportPDF analysis={analysis} gradingAnalysis={gradingAnalysis} imagePreview={imagePreview} />
          <button onClick={() => { sessionStorage.clear(); router.push('/') }} style={{
            padding: '12px 28px', borderRadius: 12,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#888', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)'
          }}>
            Scan another card
          </button>
        </div>

        {/* Disclaimer */}
        <p style={{ textAlign: 'center', fontSize: 11, color: '#444', marginTop: 32, lineHeight: 1.5, fontFamily: 'var(--font-body)', maxWidth: 560, margin: '32px auto 0' }}>
          Grade probabilities are statistical estimates. No tool, expert, or grading service can guarantee a specific grade outcome. GradeOrNot provides decision support, not grading guarantees.
        </p>
      </div>
    </div>
  )
}
