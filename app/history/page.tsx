'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react'

interface Scan {
  id: string
  card_name: string
  game: string
  psa_grade_estimate: number
  raw_value: number
  recommendation: 'GRADE' | 'SKIP' | 'MAYBE'
  created_at: string
  full_analysis: { analysis: { rarity: string; setName: string } }
}

const VERDICT_COLOR = { GRADE: '#22C55E', SKIP: '#EF4444', MAYBE: '#F5B731' }
const VERDICT_ICON = { GRADE: TrendingUp, SKIP: TrendingDown, MAYBE: Minus }

export default function HistoryPage() {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchScans = async () => {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )
          const { data } = await supabase
            .from('scans')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
          setScans(data || [])
        } catch { setScans([]) }
      }
      setLoading(false)
    }
    fetchScans()
  }, [])

  const gradeCount = scans.filter(s => s.recommendation === 'GRADE').length
  const skipCount = scans.filter(s => s.recommendation === 'SKIP').length
  const avgGrade = scans.length ? (scans.reduce((a, s) => a + (s.psa_grade_estimate || 0), 0) / scans.length).toFixed(1) : '–'

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => router.push('/')} style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
          color: '#888', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-body)'
        }}>
          <ArrowLeft size={16} /> Home
        </button>
        <div style={{ height: 20, width: 1, background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555', letterSpacing: 1 }}>SCAN HISTORY</span>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, letterSpacing: 4, color: '#E8E8EC', margin: '0 0 8px' }}>YOUR SCANS</h1>
          <p style={{ color: '#555', fontSize: 14 }}>All cards you have analyzed with GradeOrNot</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { label: 'TOTAL SCANS', value: scans.length.toString(), color: undefined },
            { label: 'WORTH GRADING', value: gradeCount.toString(), color: '#22C55E' },
            { label: 'SKIP', value: skipCount.toString(), color: '#EF4444' },
            { label: 'AVG PSA EST.', value: avgGrade, color: '#F5B731' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '20px', borderRadius: 12, background: '#111113', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontFamily: 'var(--font-mono)', color: s.color || '#E8E8EC', fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#555', fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: 1 }}>LOADING...</div>
        ) : scans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Zap size={40} color="#333" style={{ margin: '0 auto 20px', display: 'block' }} />
            <p style={{ color: '#555', marginBottom: 24 }}>No scans yet. Analyze your first card!</p>
            <button onClick={() => router.push('/')} style={{
              padding: '12px 28px', borderRadius: 10,
              background: 'rgba(245,183,49,0.1)', border: '1px solid rgba(245,183,49,0.3)',
              color: '#F5B731', fontSize: 14, cursor: 'pointer'
            }}>
              Scan a card
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {scans.map((scan) => {
              const color = VERDICT_COLOR[scan.recommendation] || '#888'
              const Icon = VERDICT_ICON[scan.recommendation] || Minus
              const date = new Date(scan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              return (
                <div key={scan.id} style={{
                  padding: '20px 24px', borderRadius: 14, background: '#111113',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', gap: 20
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `rgba(${color === '#22C55E' ? '34,197,94' : color === '#EF4444' ? '239,68,68' : '245,183,49'},0.1)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Icon size={18} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#E8E8EC', fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {scan.card_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#555' }}>
                      {scan.game} · {scan.full_analysis?.analysis?.setName || 'Unknown set'} · {date}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 24, fontFamily: 'var(--font-mono)', color, fontWeight: 700, marginBottom: 2 }}>{scan.psa_grade_estimate}</div>
                    <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>PSA EST.</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                    <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: '#E8E8EC', fontWeight: 700 }}>${scan.raw_value}</div>
                    <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>RAW VALUE</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
