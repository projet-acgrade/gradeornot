'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ExternalLink, Clock, Package, Shield, ChevronDown, ChevronUp, Database, BarChart2 } from 'lucide-react'
import GradeAnalysis from '../components/GradeAnalysis'
import MarketDataComponent from '../components/MarketData'
import ExportPDF from '../components/ExportPDF'
import ROICalculator from '../components/ROICalculator'
import DecisionEngine from '../components/DecisionEngine'

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
  condition: { overall: string; centering: string; surfaces: string; corners: string; edges: string }
  criteriaScores: { centering: number; surfaces: number; corners: number; edges: number }
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
  decisionScore?: number
  decisionConfidence?: number
  decisionRules?: { id: string; label: string; passed: boolean; value: string; weight: number; detail: string }[]
}

interface ResultData {
  analysis: Analysis
  gradingAnalysis: Record<string, GradingService>
  imagePreview: string
}

const VERDICT = {
  GRADE: { label: 'SEND IT', sub: 'Grading is worth it', color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', icon: TrendingUp, emoji: '🟢' },
  SKIP: { label: 'SKIP IT', sub: 'Not worth grading', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', icon: TrendingDown, emoji: '🔴' },
  MAYBE: { label: 'BORDERLINE', sub: 'Marginal ROI — your call', color: '#F5B731', bg: 'rgba(245,183,49,0.08)', border: 'rgba(245,183,49,0.25)', icon: Minus, emoji: '🟡' },
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 12 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '16px 20px', background: open ? 'rgba(255,255,255,0.03)' : '#111113',
        border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: 2, color: open ? '#E8E8EC' : '#666' }}>{title}</span>
        {open ? <ChevronUp size={14} color="#555" /> : <ChevronDown size={14} color="#555" />}
      </button>
      {open && <div style={{ background: '#0D0D0F', padding: '20px' }}>{children}</div>}
    </div>
  )
}

function ServiceCard({ service }: { service: GradingService }) {
  const best = service.bestTier
  return (
    <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: '#111113', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, color: '#E8E8EC' }}>{service.logo}</div>
            <div style={{ fontSize: 11, color: '#555' }}>{service.name}</div>
          </div>
          <a href={service.url} target="_blank" rel="noopener noreferrer" style={{ color: '#F5B731', opacity: 0.6 }}>
            <ExternalLink size={13} />
          </a>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(245,183,49,0.05)', border: '1px solid rgba(245,183,49,0.12)' }}>
          <div style={{ fontSize: 9, color: '#F5B731', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>BEST TIER</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8E8EC', marginBottom: 2 }}>{best.name}</div>
              <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#666' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={9} /> {best.turnaround}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Package size={9} /> +${best.shippingTotal}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: best.worthIt ? '#22C55E' : '#F5B731', fontWeight: 700 }}>${best.cost}</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'COST', value: `$${best.cost + best.shippingTotal}` },
          { label: 'VALUE', value: `$${best.gradedValue}` },
          { label: 'PROFIT', value: `${best.profit >= 0 ? '+' : ''}$${best.profit}`, color: best.profit > 0 ? '#22C55E' : '#EF4444' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 9, color: '#444', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: s.color || '#E8E8EC', fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>
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
  const v = VERDICT[analysis.gradingRecommendation]
  const VIcon = v.icon
  const displayImage = analysis.cardImage || imagePreview

  // Calcul ROI rapide pour le hero
  const bestService = Object.values(gradingAnalysis)[0]
  const best = bestService?.bestTier
  const quickROI = best ? best.roi : 0
  const quickProfit = best ? best.profit : 0
  const breakEven = best ? Math.round((best.cost + best.shippingTotal + analysis.estimatedRawValue) / (1 - 0.1325)) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B' }}>
      <style>{`
        .res-grid { display: grid; grid-template-columns: 180px 1fr; gap: 20px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .svc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
        @media (max-width: 640px) {
          .res-grid { grid-template-columns: 1fr !important; }
          .kpi-grid { grid-template-columns: 1fr 1fr !important; }
          .svc-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: '#0A0A0B', zIndex: 50 }}>
        <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ height: 14, width: 1, background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555', letterSpacing: 1 }}>ANALYSIS REPORT</span>
        {analysis.realPriceFound && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <Database size={9} color="#22C55E" />
            <span style={{ fontSize: 9, color: '#22C55E', fontFamily: 'var(--font-mono)' }}>LIVE · {analysis.priceSource}</span>
          </div>
        )}
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 20px 80px' }}>

        {/* ═══ HERO VERDICT ═══ */}
        <div style={{
          padding: '28px 24px', borderRadius: 20, marginBottom: 16,
          background: v.bg, border: `2px solid ${v.border}`,
          display: 'flex', alignItems: 'center', gap: 20
        }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `rgba(${v.color === '#22C55E' ? '34,197,94' : v.color === '#EF4444' ? '239,68,68' : '245,183,49'},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <VIcon size={28} color={v.color} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 2, marginBottom: 4 }}>VERDICT</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 6vw, 48px)', color: v.color, letterSpacing: 4, lineHeight: 1, marginBottom: 6 }}>{v.label}</div>
            <p style={{ fontSize: 13, color: '#888', margin: 0, lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>{analysis.recommendationReason}</p>
          </div>
        </div>

        {/* ═══ DECISION ENGINE ═══ */}
        {analysis.decisionRules && analysis.decisionRules.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Section title="WHY THIS VERDICT" defaultOpen={true}>
              <DecisionEngine
                score={analysis.decisionScore || 0}
                confidence={analysis.decisionConfidence || 0}
                rules={analysis.decisionRules}
                verdict={analysis.gradingRecommendation}
              />
            </Section>
          </div>
        )}

        {/* ═══ 3 KPIs CLÉS ═══ */}
        <div className="kpi-grid" style={{ marginBottom: 16 }}>
          {[
            { label: 'NET PROFIT', value: `${quickProfit >= 0 ? '+' : ''}$${quickProfit}`, sub: 'after all costs', color: quickProfit >= 0 ? '#22C55E' : '#EF4444', big: true },
            { label: 'ROI', value: `${quickROI >= 0 ? '+' : ''}${quickROI}%`, sub: 'return on investment', color: quickROI >= 0 ? '#F5B731' : '#EF4444', big: true },
            { label: 'BREAK-EVEN', value: `$${breakEven}`, sub: 'min. sale price', color: '#888', big: false },
          ].map((k, i) => (
            <div key={i} style={{ padding: '16px', borderRadius: 14, background: '#111113', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#444', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: k.big ? 28 : 22, fontFamily: 'var(--font-mono)', color: k.color, fontWeight: 700, marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 10, color: '#444', fontFamily: 'var(--font-body)' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ═══ CARD + INFO ═══ */}
        <div className="res-grid" style={{ marginBottom: 16 }}>
          <div>
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(245,183,49,0.15)', background: '#111113' }}>
              <img src={displayImage} alt={analysis.cardName} style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 260 }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: '#F5B731', fontFamily: 'var(--font-mono)', letterSpacing: 2, marginBottom: 4 }}>
                {analysis.game.toUpperCase()} · {analysis.rarity}
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 4vw, 32px)', letterSpacing: 2, color: '#E8E8EC', margin: '0 0 4px', lineHeight: 1 }}>
                {analysis.cardName}
              </h1>
              <div style={{ fontSize: 12, color: '#555' }}>
                {[analysis.setName, analysis.setNumber, analysis.year, analysis.version, analysis.language].filter(Boolean).join(' · ')}
              </div>
            </div>

            {/* PSA Grade */}
            <div style={{ padding: '14px', borderRadius: 12, background: '#111113', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 2 }}>EST. PSA GRADE</div>
                  <div style={{ fontSize: 40, fontFamily: 'var(--font-mono)', color: analysis.estimatedPSAGrade >= 9 ? '#22C55E' : '#F5B731', lineHeight: 1, fontWeight: 700 }}>
                    {analysis.estimatedPSAGrade}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 4 }}>RAW VALUE</div>
                  <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: '#E8E8EC', fontWeight: 700 }}>${analysis.estimatedRawValue}</div>
                </div>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ width: `${(analysis.estimatedPSAGrade / 10) * 100}%`, height: '100%', background: analysis.estimatedPSAGrade >= 9 ? '#22C55E' : '#F5B731', borderRadius: 2 }} />
              </div>
            </div>

            {/* Graded values */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'PSA 10', value: `$${analysis.estimatedGradedValue.PSA10}` },
                { label: 'PSA 9', value: `$${analysis.estimatedGradedValue.PSA9}` },
                { label: 'PSA 8', value: `$${analysis.estimatedGradedValue.PSA8}` },
              ].map((v, i) => (
                <div key={i} style={{ padding: '10px', borderRadius: 10, textAlign: 'center', background: '#111113', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 9, color: '#444', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{v.label}</div>
                  <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', color: '#E8E8EC', fontWeight: 700 }}>{v.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ SECTIONS EN ACCORDÉON ═══ */}

        <Section title="ROI CALCULATOR" defaultOpen={true}>
          {analysis.criteriaScores && (
            <ROICalculator
              cardName={analysis.cardName}
              rawValue={analysis.estimatedRawValue}
              gradedValues={analysis.estimatedGradedValue}
              psaGrade={analysis.estimatedPSAGrade}
              gradeProbabilities={analysis.gradeProbabilities || {
                psa10: Math.round(analysis.estimatedPSAGrade >= 9.5 ? 35 : analysis.estimatedPSAGrade >= 9 ? 15 : 5),
                psa9: Math.round(analysis.estimatedPSAGrade >= 9 ? 45 : 25),
                psa8: 20,
                psa7: 15,
              }}
            />
          )}
        </Section>

        <Section title="GRADING SERVICES">
          <div className="svc-grid">
            {Object.values(gradingAnalysis).map(service => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>
        </Section>

        <Section title="VISUAL GRADE ANALYSIS">
          {analysis.criteriaScores && (
            <GradeAnalysis
              criteria={analysis.criteriaScores}
              psaGrade={analysis.estimatedPSAGrade}
              confidence={analysis.gradeConfidence}
              gradeProbabilities={analysis.gradeProbabilities}
              psaPopulation={analysis.psaPopulation}
            />
          )}
          {analysis.keyIssues && analysis.keyIssues.length > 0 && (
            <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div style={{ fontSize: 10, color: '#EF4444', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>KEY ISSUES DETECTED</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {analysis.keyIssues.map((issue, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#FC8181' }}>{issue}</span>
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section title="MARKET DATA">
          <MarketDataComponent cardName={analysis.cardName} game={analysis.game} setName={analysis.setName} />
        </Section>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 24 }}>
          <ExportPDF analysis={analysis} gradingAnalysis={gradingAnalysis} imagePreview={imagePreview} />
          <button onClick={() => { sessionStorage.clear(); router.push('/') }} style={{
            padding: '11px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', color: '#666', fontSize: 13,
            cursor: 'pointer', fontFamily: 'var(--font-body)'
          }}>
            Scan another card
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: '#333', marginTop: 24, lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
          Grade probabilities are statistical estimates. No tool or grading service can guarantee a specific grade outcome. GradeOrNot provides decision support only.
        </p>
      </div>
    </div>
  )
}
