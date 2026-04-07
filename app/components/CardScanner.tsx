'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, Upload, X, RotateCcw, Zap, FlipHorizontal } from 'lucide-react'

interface CardScannerProps {
  onImageReady: (base64: string, mimeType: string, preview: string) => void
}

export default function CardScanner({ onImageReady }: CardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [mode, setMode] = useState<'idle' | 'camera' | 'preview'>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [detecting, setDetecting] = useState(false)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const startCamera = async (facing: 'environment' | 'user' = 'environment') => {
    stopCamera()
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setMode('camera')
    } catch {
      setCameraError('Camera access denied. Please use file upload instead.')
    }
  }

  const flipCamera = async () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newFacing)
    await startCamera(newFacing)
  }

  const cropCard = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): string => {
    const { width, height } = canvas
    const cropRatio = 0.85
    const cropW = Math.floor(width * cropRatio)
    const cropH = Math.floor(height * cropRatio)
    const cropX = Math.floor((width - cropW) / 2)
    const cropY = Math.floor((height - cropH) / 2)
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = cropW
    tempCanvas.height = cropH
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
    return tempCanvas.toDataURL('image/jpeg', 0.92)
  }

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    setDetecting(true)
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    setTimeout(() => {
      const cropped = cropCard(canvas, ctx)
      stopCamera()
      setPreview(cropped)
      setMode('preview')
      setDetecting(false)
      const base64 = cropped.split(',')[1]
      onImageReady(base64, 'image/jpeg', cropped)
    }, 400)
  }, [stopCamera, onImageReady])

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const cropped = cropCard(canvas, ctx)
        setPreview(cropped)
        setMode('preview')
        const base64 = cropped.split(',')[1]
        onImageReady(base64, 'image/jpeg', cropped)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const reset = () => {
    stopCamera()
    setPreview(null)
    setMode('idle')
    setCameraError(null)
  }

  if (mode === 'preview' && preview) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(245,183,49,0.3)', background: '#111113' }}>
          <img src={preview} alt="Card preview" style={{ width: '100%', maxHeight: 420, objectFit: 'contain', display: 'block' }} />
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(10,10,11,0.8)', borderRadius: 8, padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: 6,
            border: '1px solid rgba(245,183,49,0.2)'
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
            <span style={{ fontSize: 10, color: '#22C55E', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>CARD DETECTED</span>
          </div>
        </div>
        <button onClick={reset} style={{
          marginTop: 12, width: '100%', padding: '12px', borderRadius: 12,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#888', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}>
          <RotateCcw size={14} /> Try another card
        </button>
      </div>
    )
  }

  if (mode === 'camera') {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(245,183,49,0.2)', background: '#000', position: 'relative' }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', maxHeight: 420, display: 'block', objectFit: 'cover' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: '55%', aspectRatio: '63/88', border: '2px solid rgba(245,183,49,0.5)', borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
          </div>
          {detecting && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(245,183,49,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#F5B731', letterSpacing: 1 }}>SCANNING...</div>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
            <button onClick={reset} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
            <button onClick={capturePhoto} style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #F5B731, #D4981A)', border: '3px solid rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={24} color="#0A0A0B" />
            </button>
            <button onClick={flipCamera} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FlipHorizontal size={16} />
            </button>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#555', marginTop: 12, fontFamily: 'var(--font-body)' }}>
          Centre your card in the frame and tap the button
        </p>
      </div>
    )
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'rgba(245,183,49,0.6)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 20, padding: '50px 40px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(245,183,49,0.03)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s ease', marginBottom: 16
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px', background: 'rgba(245,183,49,0.1)', border: '1px solid rgba(245,183,49,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Upload size={24} color="#F5B731" />
        </div>
        <p style={{ fontSize: 16, fontWeight: 500, color: '#E8E8EC', margin: '0 0 8px', fontFamily: 'var(--font-body)' }}>
          Drop your card photo here
        </p>
        <p style={{ fontSize: 13, color: '#666', margin: 0, fontFamily: 'var(--font-body)' }}>
          or click to browse · JPG, PNG, WEBP
        </p>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
      </div>
      <button onClick={() => startCamera('environment')} style={{
        width: '100%', padding: '14px', borderRadius: 12,
        background: 'rgba(245,183,49,0.06)', border: '1px solid rgba(245,183,49,0.2)',
        color: '#F5B731', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
      }}>
        <Camera size={18} /> Use camera
      </button>
      {cameraError && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#FC8181' }}>
          {cameraError}
        </div>
      )}
    </div>
  )
}
