'use client'
import { useEffect, useState } from 'react'

const STEPS = [
  { id: 1, label: 'Scanning card visual', sub: 'Detecting borders, surfaces, corners & edges...', duration: 2000 },
  { id: 2, label: 'Identifying card', sub: 'Matching against TCG database — name, set, version...', duration: 2500 },
  { id: 3, label: 'Grading analysis', sub: 'Applying PSA/BGS criteria — centering, surfaces, corners, edges...', duration: 3000 },
  { id: 4, label: 'Fetching market prices', sub: 'Pulling live data from TCGPlayer, Scryfall, PriceCharting...', duration: 2000 },
  { id: 5, label: 'Calculating ROI', sub: 'Computing grading costs, shipping, platform fees & net profit...', duration: 1500 },
  { id: 6, label: 'Generating report', sub: 'Compiling your full investment analysis...', duration: 1000 },
]

export default function AnalyzingLoader() {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [stepProgress, setStepProgress] = useState(0)

  useEffect(() => {
    let totalElapsed = 0
    const totalDuration = STEPS.reduce((a, s) => a + s.duration, 0)
    let stepIndex = 0
    let stepElapsed = 0
    
    const interval = setInterval(() => {
      totalElapsed += 50
      stepElapsed += 50

      // Progress global
      setProgress(Math.min((totalElapsed / totalDuration) * 100, 95))

      // Progress dans le step actuel
      if (stepIndex < STEPS.length) {
        const stepDuration = STEPS[stepIndex].duration
        setStepProgress(Math.min((stepElapsed / stepDuration) * 100, 100))

        if (stepElapsed >= stepDuration) {
          stepIndex++
          stepElapsed = 0
          setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
          setStepProgress(0)
        }
      }
    }, 50)

    return () => clearInterval(interval)
  }, [])

  const step = STEPS[currentStep]

  return (
    <div style={{
      marginTop: 16, padding: '28px 24px', borderRadius: 16,
      background: '#111113', border: '1px solid rgba(245,183,49,0.2)',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Animated background */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        background: 'repeating-linear-gradient(45deg, #F5B731 0px, #F5B731 1px, transparent 1px, transparent 20px)',
        animation: 'bgscroll 3s linear infinite',
      }} />
      <style>{`
        @keyframes bgscroll { from { background-position: 0 0; } to { background-position: 40px 40px; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, position: 'relative' }}>
        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid rgba(245,183,49,0.2)'
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#F5B731',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{
            position: 'absolute', inset: 4, borderRadius: '50%',
            border: '1px solid transparent',
            borderTopColor: 'rgba(245,183,49,0.4)',
            animation: 'spin 1.5s linear infinite reverse'
          }} />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 16
          }}>⚡</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, color: '#E8E8EC', marginBottom: 2 }}>
            ANALYZING CARD
          </div>
          <div style={{ fontSize: 12, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
            STEP {currentStep + 1} OF {STEPS.length}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 20, color: '#F5B731', fontWeight: 700 }}>
          {Math.round(progress)}%
        </div>
      </div>

      {/* Global progress bar */}
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: 'linear-gradient(90deg, #D4981A, #F5B731, #FFD580)',
          width: `${progress}%`,
          transition: 'width 0.05s linear',
          boxShadow: '0 0 8px rgba(245,183,49,0.6)'
        }} />
      </div>

      {/* Current step */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F5B731', animation: 'pulse 1s ease-in-out infinite' }} />
          <span style={{ fontSize: 14, color: '#E8E8EC', fontFamily: 'var(--font-body)', fontWeight: 500 }}>{step.label}</span>
        </div>
        <div style={{ fontSize: 12, color: '#666', fontFamily: 'var(--font-body)', paddingLeft: 18, marginBottom: 10 }}>
          {step.sub}
        </div>
        {/* Step progress bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden', marginLeft: 18 }}>
          <div style={{
            height: '100%', borderRadius: 2, background: 'rgba(245,183,49,0.5)',
            width: `${stepProgress}%`, transition: 'width 0.05s linear'
          }} />
        </div>
      </div>

      {/* Steps list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {STEPS.map((s, i) => {
          const done = i < currentStep
          const active = i === currentStep
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: done ? 0.5 : active ? 1 : 0.25 }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                background: done ? 'rgba(34,197,94,0.2)' : active ? 'rgba(245,183,49,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${done ? 'rgba(34,197,94,0.4)' : active ? 'rgba(245,183,49,0.4)' : 'rgba(255,255,255,0.08)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9
              }}>
                {done ? '✓' : s.id}
              </div>
              <span style={{ fontSize: 12, color: done ? '#22C55E' : active ? '#F5B731' : '#555', fontFamily: 'var(--font-body)' }}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
