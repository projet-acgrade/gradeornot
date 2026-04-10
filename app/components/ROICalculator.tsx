'use client'
import { useState, useEffect } from 'react'
import { Calculator, ChevronDown, ChevronUp, Info } from 'lucide-react'

interface ROICalculatorProps {
  cardName: string
  rawValue: number
  gradedValues: { PSA10: number; PSA9: number; PSA8: number }
  psaGrade: number
  gradeProbabilities: { psa10: number; psa9: number; psa8: number; psa7: number }
}

interface Costs {
  purchasePrice: number
  gradingFee: number
  shippingToGrader: number
  shippingFromGrader: number
  insurance: number
  sellingFee: number
  sellingPlatform: 'ebay' | 'tcgplayer' | 'custom'
  customFeePercent: number
}

const PLATFORM_FEES = {
  ebay: 13.25,
  tcgplayer: 10.25,
  custom: 0,
}

const GRADING_SERVICES = {
  PSA: { value: 50, express: 150, regular: 50, economy: 25 },
  BGS: { value: 40, express: 100, regular: 40, economy: 22 },
  CGC: { value: 25, express: 50, regular: 25, economy: 12 },
}

function Slider({ label, value, min, max, step, onChange, prefix = '$', suffix = '' }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; prefix?: string; suffix?: string
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#888', fontFamily: 'var(--font-body)' }}>{label}</span>
        <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: '#F5B731', fontWeight: 700 }}>
          {prefix}{value.toFixed(2)}{suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#F5B731' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: '#444', fontFamily: 'var(--font-mono)' }}>{prefix}{min}</span>
        <span style={{ fontSize: 10, color: '#444', fontFamily: 'var(--font-mono)' }}>{prefix}{max}</span>
      </div>
    </div>
  )
}

export default function ROICalculator({ cardName, rawValue, gradedValues, psaGrade, gradeProbabilities }: ROICalculatorProps) {
  const [expanded, setExpanded] = useState(true)
  const [selectedService, setSelectedService] = useState<'PSA' | 'BGS' | 'CGC'>('PSA')
  const [costs, setCosts] = useState<Costs>({
    purchasePrice: rawValue,
    gradingFee: 50,
    shippingToGrader: 20,
    shippingFromGrader: 20,
    insurance: Math.round(rawValue * 0.015 * 100) / 100,
    sellingFee: 13.25,
    sellingPlatform: 'ebay',
    customFeePercent: 0,
  })

  useEffect(() => {
    setCosts(c => ({
      ...c,
      purchasePrice: rawValue,
      insurance: Math.round(rawValue * 0.015 * 100) / 100,
    }))
  }, [rawValue])

  const updatePlatform = (platform: 'ebay' | 'tcgplayer' | 'custom') => {
    setCosts(c => ({
      ...c,
      sellingPlatform: platform,
      sellingFee: platform === 'custom' ? c.customFeePercent : PLATFORM_FEES[platform],
    }))
  }

  const updateService = (service: 'PSA' | 'BGS' | 'CGC') => {
    setSelectedService(service)
    setCosts(c => ({ ...c, gradingFee: GRADING_SERVICES[service].regular }))
  }

  // Total costs
  const totalCosts = costs.purchasePrice + costs.gradingFee + costs.shippingToGrader + costs.shippingFromGrader + costs.insurance

  // Expected value = weighted average by grade probability
  const expectedGradedValue =
    (gradedValues.PSA10 * gradeProbabilities.psa10 / 100) +
    (gradedValues.PSA9 * gradeProbabilities.psa9 / 100) +
    (gradedValues.PSA8 * gradeProbabilities.psa8 / 100) +
    (rawValue * 0.9 * gradeProbabilities.psa7 / 100) // PSA 7 ou moins = valeur brute × 0.9

  // Net proceeds after selling fee
  const netProceeds = (sellingValue: number) => sellingValue * (1 - costs.sellingFee / 100)

  // Expected net proceeds
  const expectedNetProceeds = netProceeds(expectedGradedValue)

  // Net profit
  const netProfit = expectedNetProceeds - totalCosts
  const roi = totalCosts > 0 ? ((netProfit / totalCosts) * 100) : 0

  // Break-even = minimum sale price to not lose money
  const breakEven = totalCosts / (1 - costs.sellingFee / 100)

  // Per grade profit
  const gradeResults = [
    { grade: 'PSA 10', value: gradedValues.PSA10, prob: gradeProbabilities.psa10 },
    { grade: 'PSA 9', value: gradedValues.PSA9, prob: gradeProbabilities.psa9 },
    { grade: 'PSA 8', value: gradedValues.PSA8, prob: gradeProbabilities.psa8 },
    { grade: 'PSA 7-', value: Math.round(rawValue * 0.9), prob: gradeProbabilities.psa7 },
  ].map(g => ({
    ...g,
    netProceeds: netProceeds(g.value),
    profit: netProceeds(g.value) - totalCosts,
    roi: ((netProceeds(g.value) - totalCosts) / totalCosts) * 100,
  }))

  const profitColor = netProfit >= 0 ? '#22C55E' : '#EF4444'

  return (
    <div style={{ borderRadius: 16, border: '1px solid rgba(245,183,49,0.2)', background: '#111113', overflow: 'hidden' }}>

      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} style={{
        width: '100%', padding: '20px 24px', background: 'none', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,183,49,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calculator size={18} color="#F5B731" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, color: '#E8E8EC' }}>ROI CALCULATOR</div>
            <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-body)' }}>Customize all costs · Real net profit</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontFamily: 'var(--font-mono)', color: profitColor, fontWeight: 700 }}>
              {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(0)}
            </div>
            <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-mono)' }}>{roi.toFixed(1)}% ROI</div>
          </div>
          {expanded ? <ChevronUp size={16} color="#555" /> : <ChevronDown size={16} color="#555" />}
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Quick results */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, padding: '20px 24px 0' }}>
            {[
              { label: 'TOTAL INVESTED', value: `$${totalCosts.toFixed(0)}`, color: '#E8E8EC' },
              { label: 'EXPECTED VALUE', value: `$${expectedGradedValue.toFixed(0)}`, color: '#F5B731' },
              { label: 'NET PROFIT', value: `${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(0)}`, color: profitColor },
              { label: 'BREAK-EVEN', value: `$${breakEven.toFixed(0)}`, color: '#888' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color: s.color, fontWeight: 700 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

            {/* Left: Costs */}
            <div style={{ padding: '20px 24px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 20 }}>CUSTOMIZE COSTS</div>

              {/* Grading service */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-body)', marginBottom: 10 }}>Grading service</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['PSA', 'BGS', 'CGC'] as const).map(s => (
                    <button key={s} onClick={() => updateService(s)} style={{
                      flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                      background: selectedService === s ? 'rgba(245,183,49,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${selectedService === s ? 'rgba(245,183,49,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: selectedService === s ? '#F5B731' : '#666',
                      fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700
                    }}>{s}</button>
                  ))}
                </div>
              </div>

              <Slider label="Purchase price" value={costs.purchasePrice} min={0} max={Math.max(500, rawValue * 3)} step={1} onChange={v => setCosts(c => ({ ...c, purchasePrice: v }))} />
              <Slider label="Grading fee" value={costs.gradingFee} min={0} max={500} step={1} onChange={v => setCosts(c => ({ ...c, gradingFee: v }))} />
              <Slider label="Shipping to grader" value={costs.shippingToGrader} min={0} max={100} step={1} onChange={v => setCosts(c => ({ ...c, shippingToGrader: v }))} />
              <Slider label="Shipping from grader" value={costs.shippingFromGrader} min={0} max={100} step={1} onChange={v => setCosts(c => ({ ...c, shippingFromGrader: v }))} />
              <Slider label="Insurance" value={costs.insurance} min={0} max={100} step={0.5} onChange={v => setCosts(c => ({ ...c, insurance: v }))} />

              {/* Selling platform */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-body)', marginBottom: 10 }}>Selling platform</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { id: 'ebay', label: 'eBay', fee: '13.25%' },
                    { id: 'tcgplayer', label: 'TCGPlayer', fee: '10.25%' },
                    { id: 'custom', label: 'Custom', fee: '' },
                  ].map(p => (
                    <button key={p.id} onClick={() => updatePlatform(p.id as 'ebay' | 'tcgplayer' | 'custom')} style={{
                      padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                      background: costs.sellingPlatform === p.id ? 'rgba(245,183,49,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${costs.sellingPlatform === p.id ? 'rgba(245,183,49,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: costs.sellingPlatform === p.id ? '#F5B731' : '#666',
                      fontSize: 12, fontFamily: 'var(--font-body)'
                    }}>
                      {p.label} {p.fee && <span style={{ fontSize: 10, opacity: 0.7 }}>{p.fee}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {costs.sellingPlatform === 'custom' && (
                <Slider label="Custom selling fee" value={costs.customFeePercent} min={0} max={30} step={0.5}
                  onChange={v => setCosts(c => ({ ...c, customFeePercent: v, sellingFee: v }))} prefix="" suffix="%" />
              )}
            </div>

            {/* Right: Results by grade */}
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 20 }}>PROFIT BY GRADE</div>

              {gradeResults.map((g, i) => {
                const isPositive = g.profit >= 0
                const color = isPositive ? '#22C55E' : '#EF4444'
                return (
                  <div key={i} style={{ marginBottom: 16, padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: '#E8E8EC', fontWeight: 700 }}>{g.grade}</span>
                        <span style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{g.prob}%</span>
                      </div>
                      <span style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color, fontWeight: 700 }}>
                        {isPositive ? '+' : ''}${g.profit.toFixed(0)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#555', fontFamily: 'var(--font-body)' }}>
                      <span>Sale: ${g.value} → net ${g.netProceeds.toFixed(0)}</span>
                      <span style={{ color: isPositive ? '#22C55E' : '#EF4444' }}>{g.roi.toFixed(0)}% ROI</span>
                    </div>
                    <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${g.prob}%`, background: color, borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}

              {/* Break-even info */}
              <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Info size={12} color="#555" />
                  <span style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>BREAK-EVEN PRICE</span>
                </div>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: '#888', fontWeight: 700, marginBottom: 2 }}>${breakEven.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: '#444', fontFamily: 'var(--font-body)' }}>
                  Minimum sale price to cover all costs including {costs.sellingFee}% platform fee
                </div>
              </div>

              {/* Disclaimer */}
              <p style={{ fontSize: 10, color: '#333', marginTop: 16, lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
                Grade probabilities are statistical estimates. No tool or grading service can guarantee a specific grade outcome. GradeOrNot provides decision support, not grading guarantees.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
