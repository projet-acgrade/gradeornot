'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { Zap, Mail, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-body)' }}>
          <ArrowLeft size={16} /> Back
        </button>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #F5B731, #D4981A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} color="#0A0A0B" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: 2, color: '#E8E8EC' }}>GRADEORNOT</span>
          </div>

          {!sent ? (
            <>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, letterSpacing: 3, color: '#E8E8EC', margin: '0 0 8px' }}>SIGN IN</h1>
              <p style={{ fontSize: 14, color: '#666', margin: '0 0 32px', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
                Enter your email — we'll send you a magic link. No password needed.
              </p>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: '#111113', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Mail size={16} color="#555" />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#E8E8EC', fontSize: 15, fontFamily: 'var(--font-body)' }}
                  />
                </div>
              </div>
              <button onClick={handleLogin} disabled={loading || !email.trim()} style={{
                width: '100%', padding: '15px', borderRadius: 12,
                background: email.trim() ? 'linear-gradient(135deg, #F5B731, #D4981A)' : 'rgba(255,255,255,0.06)',
                border: 'none', color: email.trim() ? '#0A0A0B' : '#555',
                fontSize: 15, fontWeight: 700, cursor: email.trim() ? 'pointer' : 'default',
                fontFamily: 'var(--font-body)', transition: 'all 0.2s'
              }}>
                {loading ? 'Sending...' : 'Send magic link'}
              </button>
              {error && (
                <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#FC8181' }}>
                  {error}
                </div>
              )}
              <p style={{ marginTop: 24, fontSize: 12, color: '#555', textAlign: 'center', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                New users get 5 free scans. No credit card required.
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Mail size={28} color="#22C55E" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 3, color: '#E8E8EC', margin: '0 0 12px' }}>CHECK YOUR EMAIL</h2>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, fontFamily: 'var(--font-body)', marginBottom: 32 }}>
                We sent a magic link to <span style={{ color: '#F5B731' }}>{email}</span>.<br />
                Click it to sign in — no password needed.
              </p>
              <button onClick={() => setSent(false)} style={{
                padding: '12px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#888', fontSize: 13,
                cursor: 'pointer', fontFamily: 'var(--font-body)'
              }}>
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
