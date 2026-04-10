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
  gradeProbabilities?: { psa10: number; psa9: number; psa8: number; psa7: number }
  psaPopulation?: { total: number; byGrade: Record<string, number>; source: string } | null
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
        <div style={{ height: '100%', borderRadius: 4, background: color, width: animated ? `${(score / 10) * 100}%` : '0%', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </div>
    </div>
  )
}

function ProbabilityBar({ grade, probability, label, isReal }: GradeProbability & { isReal: boolean }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { setTimeout(() => setAnimated(true), 300) }, [])
  const isTop = probability >= 35
  const color = grade === 'PSA 10' ? '#22C55E' : grade === 'PSA 9' ? '#F5B731' : grade === 'PSA 8' ? '#888' : '#555'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color, fontWeight: 700 }}>{grade}</span>
          <span style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-body)' }}>{label}</span>
          {isReal && (
            <span style={{ fontSize: 9, color: '#22C55E', fontFamily: 'var(--font-mono)', padding: '1px 5px', borderRadius: 3, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>REAL</span>
          )}
        </div>
        <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: isTop ? color : '#666' }}>{probability}%</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, background: isTop ? color : 'rgba(255,255,255,0.15)', width: animated ? `${probability}%` : '0%', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </div>
    </div>
  )
}

export default function GradeAnalysis({ criteria, psaGrade, confidence, gradeProbabilities, psaPopulation }: GradeAnalysisProps) {
  const weightedScore =
    criteria.centering * 0.40 +
    criteria.surfaces * 0.30 +
    criteria.corners * 0.20 +
    criteria.edges * 0.10

  const isRealData = !!psaPopulation

  const probabilities: GradeProbability[] = gradeProbabilities ? [
    { grade: 'PSA 10', probability: gradeProbabilities.psa10, label: 'Gem Mint' },
    { grade: 'PSA 9', probability: gradeProbabilities.psa9, label: 'Mint' },
    { grade: 'PSA 8', probability: gradeProbabilities.psa8, label: 'Near Mint-Mint' },
    { grade: 'PSA 7 or less', probability: gradeProbabilities.psa7, label: 'Near Mint or lower' },
  ] : [
    { grade: 'PSA 10', probability: Math.round(psaGrade >= 9.5 ? 35 : psaGrade >= 9 ? 15 : 5), label: 'Gem Mint' },
    { grade: 'PSA 9', probability: Math.round(psaGrade >= 9 ? 45 : 25), label: 'Mint' },
    { grade: 'PSA 8', probability: 20, label: 'Near Mint-Mint' },
    { grade: 'PSA 7 or less', probability: Math.round(psaGrade >= 9 ? 10 : 35), label: 'Near Mint or lower' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Criteria scores */}
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

      {/* Grade probability */}
      <div style={{ padding: '20px', borderRadius: 14, background: '#111113', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>GRADE PROBABILITY</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isRealData && psaPopulation && (
              <span style={{ fontSize: 10, color: '#22C55E', fontFamily: 'var(--font-mono)' }}>
                {psaPopulation.total.toLocaleString()} cards graded
              </span>
            )}
            <div style={{ padding: '3px 8px', borderRadius: 20, background: isRealData ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isRealData ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
              <span style={{ fontSize: 10, color: isRealData ? '#22C55E' : '#555', fontFamily: 'var(--font-mono)' }}>
                {isRealData ? 'PSA POP REPORT' : 'ESTIMATED'}
              </span>
            </div>
          </div>
        </div>
        {probabilities.map((p) => (
          <ProbabilityBar key={p.grade} {...p} isReal={isRealData} />
        ))}
        <p style={{ fontSize: 10, color: '#333', marginTop: 16, lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
          {isRealData
            ? `Based on ${psaPopulation?.total.toLocaleString()} real PSA graded copies. Past population data does not guarantee future grade outcomes.`
            : 'Statistical estimates based on card condition analysis. No tool or grading service can guarantee a specific grade outcome. GradeOrNot provides decision support only.'}
        </p>
      </div>
    </div>
  )
}
