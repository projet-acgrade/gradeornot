import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export interface PriceAlert {
  cardName: string
  game: string
  oldPrice: number
  newPrice: number
  changePercent: number
  userEmail: string
}

export interface GradingOpportunity {
  cardName: string
  game: string
  rawValue: number
  psa10Value: number
  estimatedROI: number
  userEmail: string
}

export async function sendPriceAlert(alert: PriceAlert) {
  const isUp = alert.changePercent >= 0
  const emoji = isUp ? '📈' : '📉'
  const color = isUp ? '#22C55E' : '#EF4444'

  await getResend().emails.send({
    from: 'GradeOrNot <alerts@gradeornot.vercel.app>',
    to: alert.userEmail,
    subject: `${emoji} ${alert.cardName} price ${isUp ? 'up' : 'down'} ${Math.abs(alert.changePercent)}%`,
    html: `
      <div style="font-family: monospace; background: #0A0A0B; color: #E8E8EC; padding: 32px; max-width: 500px; margin: 0 auto; border-radius: 16px;">
        <div style="font-size: 24px; font-weight: 700; letter-spacing: 4px; color: #F5B731; margin-bottom: 24px;">GRADEORNOT</div>
        <div style="font-size: 13px; color: #555; letter-spacing: 2px; margin-bottom: 16px;">PRICE ALERT</div>
        <div style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">${alert.cardName}</div>
        <div style="font-size: 13px; color: #666; margin-bottom: 24px;">${alert.game}</div>
        <div style="display: flex; gap: 16px; margin-bottom: 24px;">
          <div style="flex: 1; padding: 16px; background: #111113; border-radius: 10px; text-align: center;">
            <div style="font-size: 11px; color: #555; margin-bottom: 8px;">PREVIOUS</div>
            <div style="font-size: 20px; font-weight: 700;">$${alert.oldPrice.toFixed(2)}</div>
          </div>
          <div style="flex: 1; padding: 16px; background: #111113; border-radius: 10px; text-align: center;">
            <div style="font-size: 11px; color: #555; margin-bottom: 8px;">NEW PRICE</div>
            <div style="font-size: 20px; font-weight: 700; color: ${color};">$${alert.newPrice.toFixed(2)}</div>
          </div>
          <div style="flex: 1; padding: 16px; background: #111113; border-radius: 10px; text-align: center;">
            <div style="font-size: 11px; color: #555; margin-bottom: 8px;">CHANGE</div>
            <div style="font-size: 20px; font-weight: 700; color: ${color};">${isUp ? '+' : ''}${alert.changePercent.toFixed(1)}%</div>
          </div>
        </div>
        <a href="https://gradeornot.vercel.app" style="display: block; padding: 14px; background: #F5B731; color: #0A0A0B; text-decoration: none; text-align: center; border-radius: 10px; font-weight: 700; font-size: 14px;">
          View Analysis →
        </a>
        <div style="font-size: 10px; color: #333; margin-top: 24px; text-align: center;">
          You're receiving this because you have price alerts enabled in GradeOrNot.
        </div>
      </div>
    `
  })
}

export async function sendGradingOpportunity(opp: GradingOpportunity) {
  await getResend().emails.send({
    from: 'GradeOrNot <alerts@gradeornot.vercel.app>',
    to: opp.userEmail,
    subject: `⚡ Grading opportunity: ${opp.cardName} — ${opp.estimatedROI}% ROI`,
    html: `
      <div style="font-family: monospace; background: #0A0A0B; color: #E8E8EC; padding: 32px; max-width: 500px; margin: 0 auto; border-radius: 16px;">
        <div style="font-size: 24px; font-weight: 700; letter-spacing: 4px; color: #F5B731; margin-bottom: 24px;">GRADEORNOT</div>
        <div style="font-size: 13px; color: #555; letter-spacing: 2px; margin-bottom: 16px;">GRADING OPPORTUNITY</div>
        <div style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">${opp.cardName}</div>
        <div style="font-size: 13px; color: #666; margin-bottom: 24px;">${opp.game}</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px;">
          <div style="padding: 14px; background: #111113; border-radius: 10px; text-align: center;">
            <div style="font-size: 10px; color: #555; margin-bottom: 6px;">RAW VALUE</div>
            <div style="font-size: 18px; font-weight: 700;">$${opp.rawValue}</div>
          </div>
          <div style="padding: 14px; background: #111113; border-radius: 10px; text-align: center;">
            <div style="font-size: 10px; color: #555; margin-bottom: 6px;">PSA 10</div>
            <div style="font-size: 18px; font-weight: 700; color: #F5B731;">$${opp.psa10Value}</div>
          </div>
          <div style="padding: 14px; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2); border-radius: 10px; text-align: center;">
            <div style="font-size: 10px; color: #555; margin-bottom: 6px;">EST. ROI</div>
            <div style="font-size: 18px; font-weight: 700; color: #22C55E;">+${opp.estimatedROI}%</div>
          </div>
        </div>
        <a href="https://gradeornot.vercel.app" style="display: block; padding: 14px; background: #F5B731; color: #0A0A0B; text-decoration: none; text-align: center; border-radius: 10px; font-weight: 700; font-size: 14px;">
          Analyze this card →
        </a>
      </div>
    `
  })
}

export async function checkPortfolioAlerts(userId: string, userEmail: string) {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Récupérer les cartes du portfolio
  const { data: cards } = await supabase
    .from('portfolio')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['raw', 'graded'])

  if (!cards || cards.length === 0) return { sent: 0 }

  let alertsSent = 0

  for (const card of cards) {
    // Vérifier l'historique des prix
    const cardKey = `${card.game}__${card.card_name}__${card.set_name || 'any'}`.toLowerCase().replace(/\s+/g, '_')
    
    const { data: history } = await supabase
      .from('price_history')
      .select('raw_avg, recorded_at')
      .eq('card_key', cardKey)
      .order('recorded_at', { ascending: false })
      .limit(2)

    if (!history || history.length < 2) continue

    const current = history[0].raw_avg
    const previous = history[1].raw_avg

    if (!current || !previous) continue

    const changePercent = ((current - previous) / previous) * 100

    // Alerte si variation > 10%
    if (Math.abs(changePercent) >= 10) {
      await sendPriceAlert({
        cardName: card.card_name,
        game: card.game,
        oldPrice: previous,
        newPrice: current,
        changePercent: Math.round(changePercent * 10) / 10,
        userEmail,
      })
      alertsSent++
    }
  }

  return { sent: alertsSent }
}
