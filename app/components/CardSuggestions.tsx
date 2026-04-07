'use client'
import { Search, ChevronRight, AlertTriangle } from 'lucide-react'

interface CardSuggestion {
  cardName: string
  setName: string
  year: string
  rarity: string
  language: string
  confidence: number
  estimatedRawValue: number
}

interface CardSuggestionsProps {
  suggestions: CardSuggestion[]
  onSelect: (suggestion: CardSuggestion) => void
  onManualSearch: (query: string) => void
}

export default function CardSuggestions({ suggestions, onSelect, onManualSearch }: CardSuggestionsProps) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        borderRadius: 10, background: 'rgba(245,183,49,0.06)', border: '1px solid rgba(245,183,49,0.2)',
        marginBottom: 16
      }}>
        <AlertTriangle size={16} color="#F5B731" />
        <span style={{ fontSize: 13, color: '#F5B731', fontFamily: 'var(--font-body)' }}>
          Multiple cards detected — pick the right one
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {suggestions.map((s, i) => (
          <button key={i} onClick={() => onSelect(s)} style={{
            padding: '14px 16px', borderRadius: 12, background: '#111113',
            border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', textAlign: 'left',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            transition: 'border-color 0.15s'
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(245,183,49,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#E8E8EC', fontFamily: 'var(--font-body)', marginBottom: 4 }}>
                {s.cardName}
              </div>
              <div style={{ fontSize: 12, color: '#666', fontFamily: 'var(--font-body)' }}>
                {s.setName} · {s.year} · {s.rarity} · {s.language}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: '#F5B731' }}>${s.estimatedRawValue}</div>
                <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)' }}>{s.confidence}% match</div>
              </div>
              <ChevronRight size={14} color="#555" />
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 12, background: '#111113', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Search size={16} color="#555" style={{ flexShrink: 0, marginTop: 2 }} />
        <input
          type="text"
          placeholder="Search manually — e.g. Charizard Base Set 1999"
          onKeyDown={(e) => e.key === 'Enter' && onManualSearch((e.target as HTMLInputElement).value)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: '#E8E8EC', fontSize: 13, fontFamily: 'var(--font-body)'
          }}
        />
      </div>
    </div>
  )
}
