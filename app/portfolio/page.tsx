'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Package, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface PortfolioCard {
  id: string
  card_name: string
  game: string
  set_name: string | null
  language: string | null
  version: string | null
  condition: string | null
  quantity: number
  purchase_price: number | null
  purchase_date: string | null
  current_value: number | null
  is_graded: boolean
  grading_service: string | null
  psa_grade: number | null
  grading_cost: number | null
  notes: string | null
  image_url: string | null
  status: 'raw' | 'sent' | 'graded' | 'sold'
  sent_date: string | null
  graded_date: string | null
  sold_date: string | null
  sold_price: number | null
  final_grade: number | null
  final_grading_service: string | null
}

const STATUS_CONFIG = {
  raw: { label: 'RAW', color: '#888', bg: 'rgba(136,136,136,0.1)', border: 'rgba(136,136,136,0.2)' },
  sent: { label: 'SENT', color: '#F5B731', bg: 'rgba(245,183,49,0.1)', border: 'rgba(245,183,49,0.2)' },
  graded: { label: 'GRADED', color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
  sold: { label: 'SOLD', color: '#888', bg: 'rgba(136,136,136,0.08)', border: 'rgba(136,136,136,0.15)' },
}

const GAMES = ['Pokemon', 'Magic: The Gathering', 'One Piece', 'Yu-Gi-Oh', 'Lorcana', 'Other']

function AddCardModal({ onClose, onAdd }: { onClose: () => void; onAdd: (card: Partial<PortfolioCard>) => void }) {
  const [form, setForm] = useState<Partial<PortfolioCard>>({ quantity: 1, is_graded: false, game: 'Pokemon', status: 'raw' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.card_name) return
    setSaving(true)
    onAdd(form)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#111113', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 3, color: '#E8E8EC' }}>ADD CARD</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>CARD NAME *</div>
            <input value={form.card_name || ''} onChange={e => setForm({ ...form, card_name: e.target.value })}
              placeholder="e.g. Charizard" style={{ width: '100%', padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E8EC', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none' }} />
          </div>

          <div>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>GAME</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {GAMES.map(g => (
                <button key={g} onClick={() => setForm({ ...form, game: g })} style={{
                  padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 11,
                  background: form.game === g ? 'rgba(245,183,49,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${form.game === g ? 'rgba(245,183,49,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: form.game === g ? '#F5B731' : '#666', fontFamily: 'var(--font-body)'
                }}>{g}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>SET</div>
              <input value={form.set_name || ''} onChange={e => setForm({ ...form, set_name: e.target.value })}
                placeholder="Base Set" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E8EC', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>QTY</div>
              <input type="number" min="1" value={form.quantity || 1} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E8EC', fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>PURCHASE PRICE ($)</div>
              <input type="number" step="0.01" value={form.purchase_price || ''} onChange={e => setForm({ ...form, purchase_price: parseFloat(e.target.value) })}
                placeholder="0.00" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E8EC', fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>CURRENT VALUE ($)</div>
              <input type="number" step="0.01" value={form.current_value || ''} onChange={e => setForm({ ...form, current_value: parseFloat(e.target.value) })}
                placeholder="Market value" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E8EC', fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none' }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>STATUS</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['raw', 'sent', 'graded', 'sold'] as const).map(s => {
                const cfg = STATUS_CONFIG[s]
                return (
                  <button key={s} onClick={() => setForm({ ...form, status: s })} style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                    background: form.status === s ? cfg.bg : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${form.status === s ? cfg.border : 'rgba(255,255,255,0.06)'}`,
                    color: form.status === s ? cfg.color : '#444',
                    fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700
                  }}>{cfg.label}</button>
                )
              })}
            </div>
          </div>

          {/* Graded toggle */}
          <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.is_graded ? 14 : 0 }}>
              <span style={{ fontSize: 13, color: '#E8E8EC', fontFamily: 'var(--font-body)' }}>This card is graded</span>
              <button onClick={() => setForm({ ...form, is_graded: !form.is_graded })} style={{
                width: 40, height: 22, borderRadius: 11, cursor: 'pointer', border: 'none',
                background: form.is_graded ? '#F5B731' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s'
              }}>
                <div style={{ position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', left: form.is_graded ? 20 : 2, transition: 'left 0.2s' }} />
              </button>
            </div>
            {form.is_graded && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#555', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>SERVICE</div>
                  <select value={form.grading_service || 'PSA'} onChange={e => setForm({ ...form, grading_service: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E8EC', fontSize: 12, outline: 'none' }}>
                    <option>PSA</option><option>BGS</option><option>CGC</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#555', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>GRADE</div>
                  <input type="number" step="0.5" min="1" max="10" value={form.psa_grade || ''} onChange={e => setForm({ ...form, psa_grade: parseFloat(e.target.value) })}
                    placeholder="9.5" style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E8EC', fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none' }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#555', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>COST ($)</div>
                  <input type="number" step="0.01" value={form.grading_cost || ''} onChange={e => setForm({ ...form, grading_cost: parseFloat(e.target.value) })}
                    placeholder="50" style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E8EC', fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none' }} />
                </div>
              </div>
            )}
          </div>

          <button onClick={handleSubmit} disabled={saving || !form.card_name} style={{
            padding: '13px', borderRadius: 10,
            background: form.card_name ? 'linear-gradient(135deg, #F5B731, #D4981A)' : 'rgba(255,255,255,0.06)',
            border: 'none', color: form.card_name ? '#0A0A0B' : '#555',
            fontSize: 14, fontWeight: 700, cursor: form.card_name ? 'pointer' : 'default', fontFamily: 'var(--font-body)'
          }}>
            {saving ? 'Adding...' : 'Add to portfolio'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CardRow({ card, onDelete, onStatusChange }: {
  card: PortfolioCard
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: PortfolioCard['status']) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[card.status]
  const invested = ((card.purchase_price || 0) * card.quantity) + (card.grading_cost || 0)
  const value = card.status === 'sold'
    ? (card.sold_price || 0) * card.quantity
    : (card.current_value || card.purchase_price || 0) * card.quantity
  const pnl = value - invested
  const pnlPositive = pnl >= 0

  return (
    <div style={{ borderRadius: 14, background: '#111113', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Status badge */}
        <div style={{ padding: '4px 10px', borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: cfg.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{cfg.label}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#E8E8EC', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
            {card.card_name}
            {card.is_graded && card.psa_grade && (
              <span style={{ marginLeft: 8, fontSize: 11, color: '#F5B731', fontFamily: 'var(--font-mono)' }}>{card.grading_service} {card.psa_grade}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#555' }}>{card.game}{card.set_name ? ` · ${card.set_name}` : ''}{card.quantity > 1 ? ` · ×${card.quantity}` : ''}</div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color: '#F5B731', fontWeight: 700 }}>${value.toFixed(0)}</div>
          <div style={{ fontSize: 10, color: '#555' }}>invested ${invested.toFixed(0)}</div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 70 }}>
          <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', color: pnlPositive ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
            {pnlPositive ? '+' : ''}${pnl.toFixed(0)}
          </div>
          <div style={{ fontSize: 10, color: '#555' }}>P&L</div>
        </div>

        <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ paddingTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 10 }}>UPDATE STATUS</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['raw', 'sent', 'graded', 'sold'] as const).map(s => {
                const c = STATUS_CONFIG[s]
                return (
                  <button key={s} onClick={() => onStatusChange(card.id, s)} style={{
                    flex: 1, padding: '7px', borderRadius: 8, cursor: 'pointer',
                    background: card.status === s ? c.bg : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${card.status === s ? c.border : 'rgba(255,255,255,0.06)'}`,
                    color: card.status === s ? c.color : '#444',
                    fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700
                  }}>{c.label}</button>
                )
              })}
            </div>
          </div>
          <button onClick={() => onDelete(card.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
            color: '#EF4444', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)'
          }}>
            <Trash2 size={12} /> Remove card
          </button>
        </div>
      )}
    </div>
  )
}

export default function PortfolioPage() {
  const [user, setUser] = useState<User | null>(null)
  const [cards, setCards] = useState<PortfolioCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all' | 'raw' | 'sent' | 'graded' | 'sold'>('all')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      fetchCards(data.user.id)
    })
  }, [router])

  const fetchCards = async (userId: string) => {
    const { data } = await supabase.from('portfolio').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (data) setCards(data as PortfolioCard[])
    setLoading(false)
  }

  const handleAdd = async (card: Partial<PortfolioCard>) => {
    if (!user) return
    const { data, error } = await supabase.from('portfolio').insert({ ...card, user_id: user.id }).select().single()
    if (!error && data) { setCards([data as PortfolioCard, ...cards]); setShowAdd(false) }
  }

  const handleDelete = async (id: string) => {
    await supabase.from('portfolio').delete().eq('id', id)
    setCards(cards.filter(c => c.id !== id))
  }

  const handleStatusChange = async (id: string, status: PortfolioCard['status']) => {
    await supabase.from('portfolio').update({ status }).eq('id', id)
    setCards(cards.map(c => c.id === id ? { ...c, status } : c))
  }

  const filtered = filter === 'all' ? cards : cards.filter(c => c.status === filter)

  // Stats globales
  const totalInvested = cards.reduce((a, c) => a + ((c.purchase_price || 0) * c.quantity) + (c.grading_cost || 0), 0)
  const totalValue = cards.filter(c => c.status !== 'sold').reduce((a, c) => a + ((c.current_value || c.purchase_price || 0) * c.quantity), 0)
  const totalSold = cards.filter(c => c.status === 'sold').reduce((a, c) => a + ((c.sold_price || 0) * c.quantity), 0)
  const totalPnL = totalValue + totalSold - totalInvested
  const pnlPositive = totalPnL >= 0

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', color: '#F5B731', fontSize: 13, letterSpacing: 1 }}>LOADING...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B' }}>
      {showAdd && <AddCardModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}

      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: '#0A0A0B', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>
            <ArrowLeft size={14} /> Home
          </button>
          <div style={{ height: 14, width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555', letterSpacing: 1 }}>PORTFOLIO</span>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10,
          background: 'linear-gradient(135deg, #F5B731, #D4981A)', border: 'none',
          color: '#0A0A0B', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)'
        }}>
          <Plus size={13} /> Add card
        </button>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 80px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'CARDS', value: cards.reduce((a, c) => a + c.quantity, 0).toString(), color: '#E8E8EC' },
            { label: 'INVESTED', value: `$${totalInvested.toFixed(0)}`, color: '#E8E8EC' },
            { label: 'PORTFOLIO VALUE', value: `$${totalValue.toFixed(0)}`, color: '#F5B731' },
            { label: 'TOTAL P&L', value: `${pnlPositive ? '+' : ''}$${totalPnL.toFixed(0)}`, color: pnlPositive ? '#22C55E' : '#EF4444' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '16px', borderRadius: 12, background: '#111113', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontFamily: 'var(--font-mono)', color: s.color, fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['all', 'raw', 'sent', 'graded', 'sold'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 11,
              background: filter === f ? 'rgba(245,183,49,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filter === f ? 'rgba(245,183,49,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: filter === f ? '#F5B731' : '#555', fontFamily: 'var(--font-mono)', fontWeight: 700,
              textTransform: 'uppercase'
            }}>
              {f === 'all' ? `ALL (${cards.length})` : `${STATUS_CONFIG[f].label} (${cards.filter(c => c.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Package size={40} color="#333" style={{ margin: '0 auto 16px', display: 'block' }} />
            <p style={{ color: '#555', fontFamily: 'var(--font-body)', marginBottom: 20 }}>
              {filter === 'all' ? 'No cards yet. Add your first card!' : `No ${filter} cards.`}
            </p>
            {filter === 'all' && (
              <button onClick={() => setShowAdd(true)} style={{ padding: '10px 24px', borderRadius: 10, background: 'rgba(245,183,49,0.1)', border: '1px solid rgba(245,183,49,0.3)', color: '#F5B731', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Add a card
              </button>
            )}
          </div>
        ) : (
          filtered.map(card => (
            <CardRow key={card.id} card={card} onDelete={handleDelete} onStatusChange={handleStatusChange} />
          ))
        )}
      </div>
    </div>
  )
}
