'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Zap, TrendingUp, Shield, ChevronRight, Camera } from 'lucide-react'

export default function Home() {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    setFile(f)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleAnalyze = async () => {
    if (!file || !preview) return
    setUploading(true)
    setError(null)
    try {
      const base64 = preview.split(',')[1]
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Analysis failed')
      }
      const data = await res.json()
      sessionStorage.setItem('gradeornot_result', JSON.stringify({ ...data, imagePreview: preview }))
      router.push('/results')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setUploading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #F5B731, #D4981A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={16} color="#0A0A0B" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 2, color: '#E8E8EC' }}>
            GRADEORNOT
          </span>
        </div>
        <a href="/history" style={{
          fontSize: 13, padding: '8px 16px', borderRadius: 8,
          background: 'rgba(245,183,49,0.1)', color: '#F5B731',
          border: '1px solid rgba(245,183,49,0.3)', textDecoration: 'none',
          fontFamily: 'var(--font-body)', fontWeight: 500
        }}>
          History
        </a>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 20,
            background: 'rgba(245,183,49,0.08)', border: '1px solid rgba(245,183,49,0.2)',
            marginBottom: 28
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5B731' }} />
            <span style={{ fontSize: 12, color: '#F5B731', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
              REAL ROI · REAL DATA · NO GUESSWORK
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(56px, 9vw, 96px)',
            letterSpacing: 4, lineHeight: 0.95, marginBottom: 24,
            background: 'linear-gradient(160deg, #FFFFFF 40%, #888 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
          }}>
            GRADE<br />
            <span style={{
              background: 'linear-gradient(135deg, #FFD580 0%, #F5B731 50%, #D4981A 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
            }}>OR NOT.</span>
          </h1>

          <p style={{ fontSize: 18, color: '#888', maxWidth: 520, margin: '0 auto', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
            Scan your TCG card. Get the exact grading cost, estimated grade, market value,
            and a clear verdict — before you spend a cent.
          </p>
        </div>

        <div style={{ maxWidth: 560, margin: '0 auto 80px' }}>
          {!preview ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'rgba(245,183,49,0.6)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 20, padding: '60px 40px', textAlign: 'center', cursor: 'pointer',
                background: dragging ? 'rgba(245,183,49,0.03)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
                background: 'rgba(245,183,49,0.1)', border: '1px solid rgba(245,183,49,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Upload size={24} color="#F5B731" />
              </div>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#E8E8EC', margin: '0 0 8px', fontFamily: 'var(--font-body)' }}>
                Drop your card photo here
              </p>
              <p style={{ fontSize: 13, color: '#666', margin: 0, fontFamily: 'var(--font-body)' }}>
                or click to browse · JPG, PNG, WEBP
              </p>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{
                borderRadius: 20, overflow: 'hidden', position: 'relative',
                border: '1px solid rgba(245,183,49,0.2)', background: '#111113'
              }}>
                <img src={preview} alt="Card preview"
                  style={{ width: '100%', maxHeight: 400, objectFit: 'contain', display: 'block' }} />
                {uploading && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(10,10,11,0.85)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16
                  }}>
                    <div style={{ position: 'relative', width: 80, height: 80 }}>
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        border: '2px solid transparent', borderTopColor: '#F5B731',
                        animation: 'spin 1s linear infinite'
                      }} />
                      <Zap size={28} color="#F5B731" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#F5B731', margin: '0 0 4px', letterSpacing: 1 }}>
                        ANALYZING CARD
                      </p>
                      <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Checking condition, grades & market value...</p>
                    </div>
                  </div>
                )}
              </div>
              {!uploading && (
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button onClick={() => { setPreview(null); setFile(null) }}
                    style={{
                      flex: 1, padding: '14px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#888', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)'
                    }}>
                    Change photo
                  </button>
                  <button onClick={handleAnalyze}
                    style={{
                      flex: 2, padding: '14px', borderRadius: 12,
                      background: 'linear-gradient(135deg, #F5B731, #D4981A)',
                      border: 'none', color: '#0A0A0B', fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}>
                    <Zap size={16} /> Analyze this card
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{
              marginTop: 16, padding: '12px 16px', borderRadius: 10,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              fontSize: 13, color: '#FC8181', fontFamily: 'var(--font-body)'
            }}>
              {error}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap',
          paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.06)'
        }}>
          {[
            { icon: <Camera size={14} />, text: 'AI condition analysis' },
            { icon: <TrendingUp size={14} />, text: 'Real market prices' },
            { icon: <Shield size={14} />, text: 'PSA · BGS · CGC costs' },
            { icon: <ChevronRight size={14} />, text: 'Instant ROI verdict' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 40,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              fontSize: 13, color: '#888', fontFamily: 'var(--font-body)'
            }}>
              <span style={{ color: '#F5B731' }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
