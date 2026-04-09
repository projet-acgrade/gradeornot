'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { Zap, ArrowLeft, CreditCard, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface Profile {
  scan_credits: number
  total_scans: number
  email: string
}

interface Transaction {
  id: string
  created_at: string
  credits_added: number
  amount: number
  pack: string
}

const PACKS = [
  { id: 'starter', name: 'STARTER', credits: 10, price: 4.99, perScan: 0.50, color: '#888', popular: false },
  { id: 'pro', name: 'PRO', credits: 25, price: 9.99, perScan: 0.40, color: '#F5B731', popular: true },
  { id: 'vault', name: 'VAULT', credits: 60, price: 19.99, perScan: 0.33, color: '#22C55E', popular: false },
]

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      const credits = params.get('credits')
      setSuccessMessage(`${credits} scan credits added to your account!`)
      window.history.replaceState({}, '', '/dashboard')
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      fetchProfile(data.user.id)
      fetchTransactions(data.user.id)
    })
  }, [router])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('scan_credits, total_scans, email').eq('id', userId).single()
    if (data) setProfile(data)
    setLoading(false)
  }

  const fetchTransactions = async (userId: string) => {
    const { data } = await supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
    if (data) setTransactions(data)
  }

  const handleCheckout = async (packId: string) => {
    if (!user) return
    setCheckoutLoading(packId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: packId, userId: user.id, userEmail: user.email }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setCheckoutLoading(null)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', color: '#F5B731', fontSize: 13, letterSpacing: 1 }}>LOADING...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-body)' }}>
            <ArrowLeft size={16} /> Home
          </button>
          <div style={{ height: 20, width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555', letterSpacing: 1 }}>DASHBOARD</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: 'rgba(245,183,49,0.08)', border: '1px solid rgba(245,183,49,0.2)' }}>
          <Zap size={12} color="#F5B731" />
          <span style={{ fontSize: 13, color: '#F5B731', fontFamily: 'var(--font-mono)' }}>{profile?.scan_credits || 0} scans left</span>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px 80px' }}>

        {successMessage && (
          <div style={{ marginBottom: 32, padding: '16px 20px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle size={18} color="#22C55E" />
            <span style={{ fontSize: 14, color: '#22C55E', fontFamily: 'var(--font-body)' }}>{successMessage}</span>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 48 }}>
          {[
            { label: 'SCANS REMAINING', value: profile?.scan_credits || 0, color: '#F5B731', icon: <Zap size={16} color="#F5B731" /> },
            { label: 'TOTAL SCANS', value: profile?.total_scans || 0, color: '#E8E8EC', icon: <TrendingUp size={16} color="#555" /> },
            { label: 'ACCOUNT', value: user?.email?.split('@')[0] || '—', color: '#E8E8EC', icon: <CreditCard size={16} color="#555" />, small: true },
          ].map((s, i) => (
            <div key={i} style={{ padding: '20px', borderRadius: 14, background: '#111113', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>{s.label}</div>
                {s.icon}
              </div>
              <div style={{ fontSize: s.small ? 18 : 32, fontFamily: s.small ? 'var(--font-body)' : 'var(--font-mono)', color: s.color, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Packs */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 3, color: '#E8E8EC', marginBottom: 24 }}>BUY CREDITS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 48 }}>
          {PACKS.map((pack) => (
            <div key={pack.id} style={{
              borderRadius: 16, border: `1px solid ${pack.popular ? 'rgba(245,183,49,0.4)' : 'rgba(255,255,255,0.08)'}`,
              background: pack.popular ? 'rgba(245,183,49,0.04)' : '#111113',
              overflow: 'hidden', position: 'relative'
            }}>
              {pack.popular && (
                <div style={{ padding: '6px', textAlign: 'center', background: 'rgba(245,183,49,0.15)', borderBottom: '1px solid rgba(245,183,49,0.2)' }}>
                  <span style={{ fontSize: 10, color: '#F5B731', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>MOST POPULAR</span>
                </div>
              )}
              <div style={{ padding: '24px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 3, color: pack.color, marginBottom: 4 }}>{pack.name}</div>
                <div style={{ fontSize: 36, fontFamily: 'var(--font-mono)', color: '#E8E8EC', fontWeight: 700, marginBottom: 4 }}>${pack.price}</div>
                <div style={{ fontSize: 13, color: '#555', marginBottom: 20, fontFamily: 'var(--font-body)' }}>${pack.perScan.toFixed(2)} per scan</div>
                <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 20, textAlign: 'center' }}>
                  <span style={{ fontSize: 24, fontFamily: 'var(--font-mono)', color: '#E8E8EC', fontWeight: 700 }}>{pack.credits}</span>
                  <span style={{ fontSize: 13, color: '#666', marginLeft: 8, fontFamily: 'var(--font-body)' }}>scan credits</span>
                </div>
                <button onClick={() => handleCheckout(pack.id)} disabled={checkoutLoading === pack.id} style={{
                  width: '100%', padding: '13px', borderRadius: 10,
                  background: pack.popular ? 'linear-gradient(135deg, #F5B731, #D4981A)' : 'rgba(255,255,255,0.06)',
                  border: pack.popular ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  color: pack.popular ? '#0A0A0B' : '#E8E8EC',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)'
                }}>
                  {checkoutLoading === pack.id ? 'Loading...' : 'Buy now'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Transactions */}
        {transactions.length > 0 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: 3, color: '#E8E8EC', marginBottom: 20 }}>PURCHASE HISTORY</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transactions.map((t) => (
                <div key={t.id} style={{ padding: '16px 20px', borderRadius: 12, background: '#111113', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245,183,49,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={16} color="#F5B731" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, color: '#E8E8EC', fontWeight: 500, fontFamily: 'var(--font-body)', textTransform: 'capitalize' }}>{t.pack} pack</div>
                      <div style={{ fontSize: 12, color: '#555', fontFamily: 'var(--font-body)' }}>
                        <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />
                        {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', color: '#22C55E', fontWeight: 700 }}>+{t.credits_added} credits</div>
                    <div style={{ fontSize: 12, color: '#555' }}>${t.amount.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
