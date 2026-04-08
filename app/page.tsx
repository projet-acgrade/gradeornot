'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, TrendingUp, Shield, ChevronRight, Camera, LogOut, User } from 'lucide-react'
import CardScanner from './components/CardScanner'
import CardSuggestions from './components/CardSuggestions'
import { supabase } from './lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface CardSuggestion {
  cardName: string
  setName: string
  year: string
  rarity: string
  language: string
  confidence: number
  estimatedRawValue: number
}

interface Profile {
  scan_credits: number
  total_scans: number
}

const FREE_SCANS_LIMIT = 5
const LOCAL_SCANS_KEY = 'gradeornot_free_scans'

export default function Home() {
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string; preview: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<CardSuggestion[]>([])
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [freeScansUsed, setFreeScansUsed] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const used = parseInt(localStorage.getItem(LOCAL_SCANS_KEY) || '0')
    setFreeScansUsed(used)

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) fetchProfile(data.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('scan_credits, total_scans').eq('id', userId).single()
    if (data) setProfile(data)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const handleImageReady = (base64: string, mimeType: string, preview: string) => {
    setImageData({ base64, mimeType, preview })
    setError(null)
    setSuggestions([])
  }

  const getRemainingScans = () => {
    if (user && profile) return profile.scan_credits
    return FREE_SCANS_LIMIT - freeScansUsed
  }

  const handleAnalyze = async (overrideCard?: CardSuggestion) => {
    if (!imageData) return

    // Vérif crédits
    if (user && profile && profile.scan_credits <= 0) {
      setError('No scans left. Purchase more credits in your dashboard.')
      return
    }
    if (!user && freeScansUsed >= FREE_SCANS_LIMIT) {
      setError('You have used your 5 free scans. Sign in to get more.')
      return
    }

    setUploading(true)
    setError(null)
    setSuggestions([])

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData.base64,
          mimeType: imageData.mimeType,
          overrideCard,
          userId: user?.id,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Analysis failed')
      }

      const data = await res.json()

      if (data.suggestions && data.suggestions.length > 1) {
        setSuggestions(data.suggestions)
        setUploading(false)
        return
      }

      // Incrémente les compteurs
      if (!user) {
        const newCount = freeScansUsed + 1
        localStorage.setItem(LOCAL_SCANS_KEY, newCount.toString())
        setFreeScansUsed(newCount)
      } else if (profile) {
        setProfile({ ...profile, scan_credits: profile.scan_credits - 1, total_scans: profile.total_scans + 1 })
      }

      sessionStorage.setItem('gradeornot_result', JSON.stringify({ ...data, imagePreview: imageData.preview }))
      router.push('/results')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setUploading(false)
    }
  }

  const handleSelectSuggestion = (suggestion: CardSuggestion) => {
    setSuggestions([])
    handleAnalyze(suggestion)
  }

  const handleManualSearch = async (query: string) => {
    if (!query.trim() || !imageData) return
    setSuggestions([])
    setUploading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData.base64, mimeType: imageData.mimeType, manualSearch: query, userId: user?.id }),
      })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      sessionStorage.setItem('gradeornot_result', JSON.stringify({ ...data, imagePreview: imageData.preview }))
      router.push('/results')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setUploading(false)
    }
  }

  const remaining = getRemainingScans()

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #F5B731, #D4981A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="#0A0A0B" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 2, color: '#E8E8EC' }}>GRADEORNOT</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: remaining > 2 ? 'rgba(245,183,49,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${remaining > 2 ? 'rgba(245,183,49,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
            <Zap size={12} color={remaining > 2 ? '#F5B731' : '#EF4444'} />
            <span style={{ fontSize: 12, color: remaining > 2 ? '#F5B731' : '#EF4444', fontFamily: 'var(--font-mono)' }}>
              {remaining} scan{remaining !== 1 ? 's' : ''} left
            </span>
          </div>

          {user ? (
            <>
              <a href="/dashboard" style={{ fontSize: 13, color: '#888', textDecoration: 'none', fontFamily: 'var(--font-body)' }}>Dashboard</a>
              <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#888', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                <LogOut size={13} /> Sign out
              </button>
            </>
          ) : (
            <button onClick={() => router.push('/login')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'rgba(245,183,49,0.1)', border: '1px solid rgba(245,183,49,0.3)', color: '#F5B731', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
              <User size={13} /> Sign in
            </button>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: 'rgba(245,183,49,0.08)', border: '1px solid rgba(245,183,49,0.2)', marginBottom: 28 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5B731' }} />
            <span style={{ fontSize: 12, color: '#F5B731', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>REAL ROI · REAL DATA · NO GUESSWORK</span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(56px, 9vw, 96px)', letterSpacing: 4, lineHeight: 0.95, marginBottom: 24, background: 'linear-gradient(160deg, #FFFFFF 40%, #888 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            GRADE<br />
            <span style={{ background: 'linear-gradient(135deg, #FFD580 0%, #F5B731 50%, #D4981A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OR NOT.</span>
          </h1>

          <p style={{ fontSize: 18, color: '#888', maxWidth: 520, margin: '0 auto', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
            Scan your TCG card. Get the exact grading cost, estimated grade, market value, and a clear verdict — before you spend a cent.
          </p>
        </div>

        <div style={{ maxWidth: 560, margin: '0 auto 80px' }}>
          <CardScanner onImageReady={handleImageReady} />

          {imageData && !uploading && suggestions.length === 0 && (
            <button onClick={() => handleAnalyze()} disabled={remaining <= 0} style={{
              marginTop: 16, width: '100%', padding: '16px', borderRadius: 12,
              background: remaining > 0 ? 'linear-gradient(135deg, #F5B731, #D4981A)' : 'rgba(255,255,255,0.06)',
              border: 'none', color: remaining > 0 ? '#0A0A0B' : '#555', fontSize: 15, fontWeight: 700,
              cursor: remaining > 0 ? 'pointer' : 'default', fontFamily: 'var(--font-body)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              <Zap size={18} /> Analyze this card
            </button>
          )}

          {uploading && (
            <div style={{ marginTop: 16, padding: '20px', borderRadius: 12, background: '#111113', border: '1px solid rgba(245,183,49,0.2)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#F5B731', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <Zap size={16} color="#F5B731" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#F5B731', margin: '0 0 2px', letterSpacing: 1 }}>ANALYZING CARD</p>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Identifying · Checking condition · Fetching prices...</p>
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <CardSuggestions suggestions={suggestions} onSelect={handleSelectSuggestion} onManualSearch={handleManualSearch} />
          )}

          {error && (
            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#FC8181', fontFamily: 'var(--font-body)' }}>
              {error}
              {!user && freeScansUsed >= FREE_SCANS_LIMIT && (
                <button onClick={() => router.push('/login')} style={{ display: 'block', marginTop: 10, padding: '8px 16px', borderRadius: 8, background: 'rgba(245,183,49,0.15)', border: '1px solid rgba(245,183,49,0.3)', color: '#F5B731', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Sign in to continue →
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { icon: <Camera size={14} />, text: 'Camera & photo scan' },
            { icon: <TrendingUp size={14} />, text: 'Live TCGPlayer prices' },
            { icon: <Shield size={14} />, text: 'PSA · BGS · CGC costs' },
            { icon: <ChevronRight size={14} />, text: 'Instant ROI verdict' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 40, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: '#888', fontFamily: 'var(--font-body)' }}>
              <span style={{ color: '#F5B731' }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
