'use client'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface DecisionRule {
  id: string
  label: string
  passed: boolean
  value: string
  weight: number
  detail: string
}

interface DecisionEngineProps {
  rules: DecisionRule[]
  verdict: 'GRADE' | 'SKIP' | 'MAYBE'
}

export default function DecisionEngine({ rules, verdict }: DecisionEngineProps) {
  const verdictColor = verdict === 'GRADE' ? '#22C55E' : verdict === 'SKIP' ? '#EF4444' : '#F5B731'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Règles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rules.map(rule => (
          <div key={rule.id} style={{
            padding: '14px 16px', borderRadius: 12,
            background: rule.passed ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)',
            border: `1px solid ${rule.passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              {rule.passed
                ? <CheckCircle size={15} color="#22C55E" />
                : <XCircle size={15} color="#EF4444" />
              }
              <span style={{ fontSize: 13, color: '#E8E8EC', fontFamily: 'var(--font-body)', fontWeight: 500, flex: 1 }}>{rule.label}</span>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: rule.passed ? '#22C55E' : '#EF4444', fontWeight: 700 }}>{rule.value}</span>
              <span style={{ fontSize: 10, color: '#444', fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }}>{rule.weight}pts</span>
            </div>
            <p style={{ fontSize: 11, color: '#666', margin: 0, paddingLeft: 25, lineHeight: 1.4, fontFamily: 'var(--font-body)' }}>
              {rule.detail}
            </p>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={11} color="#444" />
          <span style={{ fontSize: 10, color: '#444', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
            Decision based on ROI thresholds, grade probability, and market data. Grade outcomes cannot be guaranteed by any tool or grading service.
          </span>
        </div>
      </div>
    </div>
  )
}
