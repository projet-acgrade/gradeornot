'use client'
import { useEffect, useState } from 'react'

interface CriteriaScore {
  centering: number
  surfaces: number
  corners: number
  edges: number
}

interface GradeProbability {
  grade: string
  probability: number
  label: string
}

interface GradeAnalysisProps {
  criteria: CriteriaScore
  psaGrade: number
  confidence: number
}

function ScoreBar({ label, score, weight }: { label: string; score: number; weight: string }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { setTimeout(() => setAnimated(true), 100) }, [])
  const color = score >= 8.5 ? '#22C55E' : score >= 7 ? '#F5B731' : '#EF4444'
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#E8E8EC', fontFamily: 'var(--font-body)', fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }}>{weight}</span>
        </div>
        <span style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color, fontWeight: 700 }}>{score.toFixed(1)}</span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4, background: color,
          width: animated ? `${(score / 10) * 100}%` : '0%',
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        }} />
      </div>
    </div>
  )
}

function ProbabilityBar({ grade, probability, label }: GradeProbability) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { setTimeout(() => setAnimated(true), 300) }, [])
  const isTop = probability >= 40
  const color = grade === 'PSA 10' ? '#22C55E' : grade === 'PSA 9' ? '#F5B731' : grade === 'PSA 8' ? '#888' : '#555'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color, fontWeight: 700 }}>{grade}</span>
          <span style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-body)' }}>{label}</span>
        </div>
        <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: isTop ? color : '#666' }}>{probability}%</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: isTop ? color : 'rgba(255,255,255,0.15)',
          width: animated ? `${probability}%` : '0%',
          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
        }} />
      </div>
    </div>
  )
}

export default function GradeAnalysis({ criteria, psaGrade, confidence }: GradeAnalysisProps) {
  const weightedScore =
    criteria.centering * 0.40 +
    criteria.surfaces * 0.30 +
    criteria.corners * 0.20 +
    criteria.edges * 0.10

  const generateProbabilities = (score: number, conf: number): GradeProbability[] => {
    const spread = conf < 60 ? 1.5 : conf < 80 ? 1.0 : 0.6
    const raw = {
      'PSA 10': Math.max(0, Math.min(95, (score - 9.0) / spread * 80 + (conf / 100) * 20)),
      'PSA 9': Math.max(0, Math.min(90, 40 - Math.abs(score - 8.5) * 20)),
      'PSA 8': Math.max(0, Math.min(80, 30 - Math.abs(score - 7.5) * 15)),
      'PSA 7 or less': Math.max(0, 100 - score * 8),
    }
    const total = Object.values(raw).reduce((a, b) => a + b, 0)
    return [
      { grade: 'PSA 10', probability: Math.round((raw['PSA 10'] / total) * 100), label: 'Gem Mint' },
      { grade: 'PSA 9', probability: Math.round((raw['PSA 9'] / total) * 100), label: 'Mint' },
      { grade: 'PSA 8', probability: Math.round((raw['PSA 8'] / total) * 100), label: 'Near Mint-Mint' },
      { grade: 'PSA 7 or less', probability: Math.round((raw['PSA 7 or less'] / total) * 100), label: 'Near Mint or lower' },
    ]
  }

  const probabilities = generateProbabilities(psaGrade, confidence)
  const confidenceColor = confidence >= 80 ? '#22C55E' : confidence >= 60 ? '#F5B731' : '#EF4444'
  const confidenceLabel = confidence >= 80 ? 'HIGH' : confidence >= 60 ? 'MEDIUM' : 'LOW'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ padding: '16px 20px', borderRadius: 14, background: '#111113', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>SCAN CONFIDENCE</div>
          <div style={{ padding: '4px 10px', borderRadius: 20, background: `rgba(${confidenceColor === '#22C55E' ? '34,197,94' : confidenceColor === '#F5B731' ? '245,183,49' : '239,68,68'},0.1)`, border: `1px solid rgba(${confidenceColor === '#22C55E' ? '34,197,94' : confidenceColor === '#F5B731' ? '245,183,49' : '239,68,68'},0.3)` }}>
            <span style={{ fontSize: 11, color: confidenceColor, fontFamily: 'var(--font-mono)' }}>{confidenceLabel}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${confidence}%`, background: confidenceColor, borderRadius: 4, transition: 'width 0.8s ease' }} />
          </div>
          <span style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: confidenceColor, fontWeight: 700, minWidth: 40 }}>{confidence}%</span>
        </div>
        {confidence < 70 && (
          <p style={{ fontSize: 12, color: '#666', marginTop: 10, fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
            Low confidence — try a closer, better-lit photo for more accurate results.
          </p>
        )}
      </div>

      <div style={{ padding: '20px', borderRadius: 14, background: '#111113', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 20 }}>CRITERIA SCORES — PSA WEIGHTED</div>
        <ScoreBar label="Centering" score={criteria.centering} weight="40%" />
        <ScoreBar label="Surfaces" score={criteria.surfaces} weight="30%" />
        <ScoreBar label="Corners" score={criteria.corners} weight="20%" />
        <ScoreBar label="Edges" score={criteria.edges} weight="10%" />
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#555', fontFamily: 'var(--font-mono)' }}>WEIGHTED SCORE</span>
          <span style={{ fontSize: 24, fontFamily: 'var(--font-mono)', color: weightedScore >= 9 ? '#22C55E' : '#F5B731', fontWeight: 700 }}>{weightedScore.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ padding: '20px', borderRadius: 14, background: '#111113', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 20 }}>GRADE PROBABILITY DISTRIBUTION</div>
        {probabilities.map((p) => (
          <ProbabilityBar key={p.grade} {...p} />
        ))}
      </div>
    </div>
  )
}
