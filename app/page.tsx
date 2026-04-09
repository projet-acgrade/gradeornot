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
  username: string
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
  const [welcomeToast, setWelcomeToast] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const used = parseInt(localStorage.getItem(LOCAL_SCANS_KEY) || '0')
      setFreeScansUsed(used)
      const params = new URLSearchParams(window.location.search)
      if (params.get('welcome') === 'true') {
        setWelcomeToast(true)
        window.history.replaceState({}, '', '/')
        setTimeout(() => setWelcomeToast(false), 4000)
      }
    }
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
    const { data } = await supabase.from('profiles').select('scan_credits, total_scans, username').eq('id', userId).single()
    if (data) setProfile(data)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setMenuOpen(false)
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
        body: JSON.stringify({ image: imageData.base64, mimeType: imageData.mimeType, overrideCard, userId: user?.id }),
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
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slide-down { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .nav-link { font-size: 13px; color: #888; text-decoration: none; font-family: var(--font-body); }
        .nav-link:hover { color: #E8E8EC; }
        @media (max-width: 640px) {
          .hero-title { font-size: 64px !important; }
          .hero-subtitle { font-size: 15px !important; }
          .feature-pills { display: none !important; }
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 641px) {
          .mobile-menu-btn { display: none !important; }
          .mobile-menu { display: none !important; }
        }
      `}</style>

      {/* Welcome toast */}
      {welcomeToast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 1000,
          padding: '16px 24px', borderRadius: 14,
          background: '#111113', border: '1px solid rgba(34,197,94,0.4)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Zap size={18} color="#22C55E" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E8E8EC', fontFamily: 'var(--font-body)', marginBottom: 2 }}>
              Welcome, {profile?.username || 'Trainer'} !
            </div>
            <div style={{ fontSize: 12, color: '#666', fontFamily: 'var(--font-body)' }}>
              You have {profile?.scan_credits || 5} free scans ready.
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, background: '#0A0A0B', zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #F5B731, #D4981A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="#0A0A0B" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: '#E8E8EC' }}>GRADEORNOT</span>
        </div>

        {/* Credits badge - toujours visible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: remaining > 2 ? 'rgba(245,183,49,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${remaining > 2 ? 'rgba(245,183,49,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
            <Zap size={11} color={remaining > 2 ? '#F5B731' : '#EF4444'} />
            <span style={{ fontSize: 12, color: remaining > 2 ? '#F5B731' : '#EF4444', fontFamily: 'var(--font-mono)' }}>
              {remaining}
            </span>
          </div>

          {/* Desktop nav */}
          <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user ? (
              <>
                <a href="/portfolio" className="nav-link">Portfolio</a>
                <a href="/dashboard" className="nav-link">Dashboard</a>
                <a href="/profile" className="nav-link">Profile</a>
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

          {/* Mobile hamburger */}
          <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)} style={{
            display: 'none', flexDirection: 'column', gap: 4, background: 'none',
            border: 'none', cursor: 'pointer', padding: 6
          }}>
            <div style={{ width: 20, height: 2, background: menuOpen ? '#F5B731' : '#888', borderRadius: 1, transition: 'all 0.2s' }} />
            <div style={{ width: 20, height: 2, background: menuOpen ? '#F5B731' : '#888', borderRadius: 1, transition: 'all 0.2s' }} />
            <div style={{ width: 20, height: 2, background: menuOpen ? '#F5B731' : '#888', borderRadius: 1, transition: 'all 0.2s' }} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu" style={{
          background: '#111113', borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4,
          animation: 'slide-down 0.2s ease'
        }}>
          {user ? (
            <>
              <a href="/portfolio" style={{ padding: '12px 0', color: '#E8E8EC', textDecoration: 'none', fontSize: 15, fontFamily: 'var(--font-body)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Portfolio</a>
              <a href="/dashboard" style={{ padding: '12px 0', color: '#E8E8EC', textDecoration: 'none', fontSize: 15, fontFamily: 'var(--font-body)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Dashboard</a>
              <a href="/profile" style={{ padding: '12px 0', color: '#E8E8EC', textDecoration: 'none', fontSize: 15, fontFamily: 'var(--font-body)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Profile</a>
              <button onClick={handleSignOut} style={{ padding: '12px 0', color: '#EF4444', background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left' }}>Sign out</button>
            </>
          ) : (
            <button onClick={() => { router.push('/login'); setMenuOpen(false) }} style={{ padding: '12px 0', color: '#F5B731', background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left' }}>Sign in</button>
          )}
        </div>
      )}

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 20px 40px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: 'rgba(245,183,49,0.08)', border: '1px solid rgba(245,183,49,0.2)', marginBottom: 24 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5B731' }} />
            <span style={{ fontSize: 11, color: '#F5B731', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>REAL ROI · REAL DATA · NO GUESSWORK</span>
          </div>

          <h1 className="hero-title" style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(64px, 15vw, 96px)',
            letterSpacing: 4, lineHeight: 0.95, marginBottom: 20,
            background: 'linear-gradient(160deg, #FFFFFF 40%, #888 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
          }}>
            GRADE<br />
            <span style={{ background: 'linear-gradient(135deg, #FFD580 0%, #F5B731 50%, #D4981A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OR NOT.</span>
          </h1>

          <p className="hero-subtitle" style={{ fontSize: 16, color: '#888', maxWidth: 440, margin: '0 auto', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
            Scan your TCG card. Get the exact grading cost, estimated grade, market value, and a clear verdict.
          </p>
        </div>

        {/* Scanner */}
        <CardScanner onImageReady={handleImageReady} />

        {imageData && !uploading && suggestions.length === 0 && (
          <button onClick={() => handleAnalyze()} disabled={remaining <= 0} style={{
            marginTop: 16, width: '100%', padding: '18px', borderRadius: 14,
            background: remaining > 0 ? 'linear-gradient(135deg, #F5B731, #D4981A)' : 'rgba(255,255,255,0.06)',
            border: 'none', color: remaining > 0 ? '#0A0A0B' : '#555', fontSize: 16, fontWeight: 700,
            cursor: remaining > 0 ? 'pointer' : 'default', fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
            <Zap size={18} /> Analyze this card
          </button>
        )}

        {uploading && (
          <div style={{ marginTop: 16, padding: '20px', borderRadius: 14, background: '#111113', border: '1px solid rgba(245,183,49,0.2)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#F5B731', animation: 'spin 1s linear infinite' }} />
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
          <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#FC8181', fontFamily: 'var(--font-body)' }}>
            {error}
            {!user && freeScansUsed >= FREE_SCANS_LIMIT && (
              <button onClick={() => router.push('/login')} style={{ display: 'block', marginTop: 10, padding: '8px 16px', borderRadius: 8, background: 'rgba(245,183,49,0.15)', border: '1px solid rgba(245,183,49,0.3)', color: '#F5B731', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Sign in to continue →
              </button>
            )}
          </div>
        )}

        {/* Feature pills */}
        <div className="feature-pills" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 40, marginTop: 40, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { icon: <Camera size={13} />, text: 'Camera scan' },
            { icon: <TrendingUp size={13} />, text: 'Live prices' },
            { icon: <Shield size={13} />, text: 'PSA · BGS · CGC' },
            { icon: <ChevronRight size={13} />, text: 'ROI verdict' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 40, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: '#888', fontFamily: 'var(--font-body)' }}>
              <span style={{ color: '#F5B731' }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
