'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Zap, Trash2, Edit2, Package } from 'lucide-react'
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
}

const GAMES = ['Pokemon', 'Magic: The Gathering', 'One Piece', 'Yu-Gi-Oh', 'Lorcana', 'Other']

function AddCardModal({ onClose, onAdd, userId }: { onClose: () => void; onAdd: (card: Partial<PortfolioCard>) => void; userId: string }) {
  const [form, setForm] = useState<Partial<PortfolioCard>>({
    quantity: 1,
    is_graded: false,
    game: 'Pokemon',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.card_name) return
    setSaving(true)
    onAdd(form)
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }}>
      <div style={{
        background: '#111113', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
        padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: 3, color: '#E8E8EC' }}>ADD CARD</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Card name */}
          <div>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>CARD NAME *</div>
            <input value={form.card_name || ''} onChange={e => setForm({ ...form, card_name: e.target.value })}
              placeholder="e.g. Charizard" style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#E8E8EC', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none'
              }} />
          </div>

          {/* Game */}
          <div>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>GAME</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GAMES.map(g => (
                <button key={g} onClick={() => setForm({ ...form, game: g })} style={{
                  padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
                  background: form.game === g ? 'rgba(245,183,49,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${form.game === g ? 'rgba(245,183,49,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: form.game === g ? '#F5B731' : '#666', fontFamily: 'var(--font-body)'
                }}>{g}</button>
              ))}
            </div>
          </div>

          {/* Set + quantity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>SET NAME</div>
              <input value={form.set_name || ''} onChange={e => setForm({ ...form, set_name: e.target.value })}
                placeholder="e.g. Base Set" style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#E8E8EC', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none'
                }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>QUANTITY</div>
              <input type="number" min="1" value={form.quantity || 1} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) })}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#E8E8EC', fontSize: 14, fontFamily: 'var(--font-mono)', outline: 'none'
                }} />
            </div>
          </div>

          {/* Purchase price + date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>PURCHASE PRICE ($)</div>
              <input type="number" step="0.01" value={form.purchase_price || ''} onChange={e => setForm({ ...form, purchase_price: parseFloat(e.target.value) })}
                placeholder="0.00" style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#E8E8EC', fontSize: 14, fontFamily: 'var(--font-mono)', outline: 'none'
                }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>PURCHASE DATE</div>
              <input type="date" value={form.purchase_date || ''} onChange={e => setForm({ ...form, purchase_date: e.target.value })}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#E8E8EC', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none'
                }} />
            </div>
          </div>

          {/* Graded toggle */}
          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.is_graded ? 16 : 0 }}>
              <div style={{ fontSize: 13, color: '#E8E8EC', fontFamily: 'var(--font-body)', fontWeight: 500 }}>This card is graded</div>
              <button onClick={() => setForm({ ...form, is_graded: !form.is_graded })} style={{
                width: 44, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none',
                background: form.is_graded ? '#F5B731' : 'rgba(255,255,255,0.1)',
                position: 'relative', transition: 'background 0.2s'
              }}>
                <div style={{
                  position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  left: form.is_graded ? 22 : 2, transition: 'left 0.2s'
                }} />
              </button>
            </div>
            {form.is_graded && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>SERVICE</div>
                  <select value={form.grading_service || 'PSA'} onChange={e => setForm({ ...form, grading_service: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E8EC', fontSize: 13, outline: 'none' }}>
                    <option>PSA</option>
                    <option>BGS</option>
                    <option>CGC</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>GRADE</div>
                  <input type="number" step="0.5" min="1" max="10" value={form.psa_grade || ''} onChange={e => setForm({ ...form, psa_grade: parseFloat(e.target.value) })}
                    placeholder="9.5" style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E8EC', fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>GRADING COST</div>
                  <input type="number" step="0.01" value={form.grading_cost || ''} onChange={e => setForm({ ...form, grading_cost: parseFloat(e.target.value) })}
                    placeholder="50" style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E8EC', fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none' }} />
                </div>
              </div>
            )}
          </div>

          {/* Current value */}
          <div>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>CURRENT VALUE ($)</div>
            <input type="number" step="0.01" value={form.current_value || ''} onChange={e => setForm({ ...form, current_value: parseFloat(e.target.value) })}
              placeholder="Market value today" style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#E8E8EC', fontSize: 14, fontFamily: 'var(--font-mono)', outline: 'none'
              }} />
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>NOTES</div>
            <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2} placeholder="Optional notes..." style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#E8E8EC', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', resize: 'none'
              }} />
          </div>

          <button onClick={handleSubmit} disabled={saving || !form.card_name} style={{
            padding: '14px', borderRadius: 12,
            background: form.card_name ? 'linear-gradient(135deg, #F5B731, #D4981A)' : 'rgba(255,255,255,0.06)',
            border: 'none', color: form.card_name ? '#0A0A0B' : '#555',
            fontSize: 15, fontWeight: 700, cursor: form.card_name ? 'pointer' : 'default', fontFamily: 'var(--font-body)'
          }}>
            {saving ? 'Adding...' : 'Add to portfolio'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PortfolioPage() {
  const [user, setUser] = useState<User | null>(null)
  const [cards, setCards] = useState<PortfolioCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
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
    if (data) setCards(data)
    setLoading(false)
  }

  const handleAdd = async (card: Partial<PortfolioCard>) => {
    if (!user) return
    const { data, error } = await supabase.from('portfolio').insert({ ...card, user_id: user.id }).select().single()
    if (!error && data) {
      setCards([data, ...cards])
      setShowAdd(false)
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.from('portfolio').delete().eq('id', id)
    setCards(cards.filter(c => c.id !== id))
  }

  // Stats
  const totalInvested = cards.reduce((a, c) => a + ((c.purchase_price || 0) * c.quantity) + (c.grading_cost || 0), 0)
  const totalValue = cards.reduce((a, c) => a + ((c.current_value || c.purchase_price || 0) * c.quantity), 0)
  const totalPnL = totalValue - totalInvested
  const pnlPct = totalInvested > 0 ? ((totalPnL / totalInvested) * 100).toFixed(1) : '0'
  const pnlPositive = totalPnL >= 0

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', color: '#F5B731', fontSize: 13, letterSpacing: 1 }}>LOADING...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B' }}>
      {showAdd && user && <AddCardModal onClose={() => setShowAdd(false)} onAdd={handleAdd} userId={user.id} />}

      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-body)' }}>
            <ArrowLeft size={16} /> Home
          </button>
          <div style={{ height: 20, width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555', letterSpacing: 1 }}>PORTFOLIO</span>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10,
          background: 'linear-gradient(135deg, #F5B731, #D4981A)', border: 'none',
          color: '#0A0A0B', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)'
        }}>
          <Plus size={14} /> Add card
        </button>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 32px 80px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 40 }}>
          {[
            { label: 'TOTAL CARDS', value: cards.reduce((a, c) => a + c.quantity, 0).toString(), color: '#E8E8EC' },
            { label: 'INVESTED', value: `$${totalInvested.toFixed(0)}`, color: '#E8E8EC' },
            { label: 'CURRENT VALUE', value: `$${totalValue.toFixed(0)}`, color: '#F5B731' },
            { label: 'P&L', value: `${pnlPositive ? '+' : ''}$${totalPnL.toFixed(0)} (${pnlPct}%)`, color: pnlPositive ? '#22C55E' : '#EF4444' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '20px', borderRadius: 14, background: '#111113', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: s.color, fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Cards list */}
        {cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Package size={48} color="#333" style={{ margin: '0 auto 20px', display: 'block' }} />
            <p style={{ color: '#555', fontFamily: 'var(--font-body)', marginBottom: 24, fontSize: 15 }}>
              Your portfolio is empty. Add your first card!
            </p>
            <button onClick={() => setShowAdd(true)} style={{
              padding: '12px 28px', borderRadius: 10,
              background: 'rgba(245,183,49,0.1)', border: '1px solid rgba(245,183,49,0.3)',
              color: '#F5B731', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)'
            }}>
              Add a card
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cards.map(card => {
              const invested = ((card.purchase_price || 0) * card.quantity) + (card.grading_cost || 0)
              const value = (card.current_value || card.purchase_price || 0) * card.quantity
              const pnl = value - invested
              const positive = pnl >= 0

              return (
                <div key={card.id} style={{
                  padding: '20px 24px', borderRadius: 14, background: '#111113',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', gap: 20
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#E8E8EC', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {card.card_name}
                      </div>
                      {card.is_graded && (
                        <div style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(245,183,49,0.1)', border: '1px solid rgba(245,183,49,0.2)', fontSize: 10, color: '#F5B731', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                          {card.grading_service} {card.psa_grade}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#555', fontFamily: 'var(--font-body)' }}>
                      {card.game}{card.set_name ? ` · ${card.set_name}` : ''}{card.quantity > 1 ? ` · ×${card.quantity}` : ''}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: '#F5B731', fontWeight: 700 }}>
                      ${value.toFixed(0)}
                    </div>
                    <div style={{ fontSize: 11, color: '#555' }}>invested ${invested.toFixed(0)}</div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      {positive ? <TrendingUp size={13} color="#22C55E" /> : <TrendingDown size={13} color="#EF4444" />}
                      <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', color: positive ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
                        {positive ? '+' : ''}${pnl.toFixed(0)}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#555' }}>P&L</div>
                  </div>

                  <button onClick={() => handleDelete(card.id)} style={{
                    width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
