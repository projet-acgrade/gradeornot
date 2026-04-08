import { createClient } from '@supabase/supabase-js'
import { getPSAPrices } from './psa-prices'

const CACHE_TTL_HOURS = 6

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

export interface MarketData {
  raw: { avg: number | null; median: number | null; min: number | null; max: number | null; count: number }
  grades: { psa7: number | null; psa8: number | null; psa9: number | null; psa10: number | null }
  volume: { days7: number; days30: number }
  trends: { days7: number | null; days30: number | null }
  source: string
  gradeSource: string
  lastUpdated: string
}

function cardKey(cardName: string, game: string, setName?: string): string {
  return `${game}__${cardName}__${setName || 'any'}`.toLowerCase().replace(/\s+/g, '_')
}

function removeOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices
  const sorted = [...prices].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  return sorted.filter(p => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr)
}

function calcStats(prices: number[]) {
  const clean = removeOutliers(prices)
  if (clean.length === 0) return { avg: null, median: null, min: null, max: null, count: 0 }
  const sorted = [...clean].sort((a, b) => a - b)
  const avg = Math.round(clean.reduce((a, b) => a + b, 0) / clean.length * 100) / 100
  const median = sorted.length % 2 === 0
    ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 * 100) / 100
    : Math.round(sorted[Math.floor(sorted.length / 2)] * 100) / 100
  return { avg, median, min: Math.round(sorted[0] * 100) / 100, max: Math.round(sorted[sorted.length - 1] * 100) / 100, count: clean.length }
}

function calcTrend(current: number | null, past: number | null): number | null {
  if (!current || !past || past === 0) return null
  return Math.round(((current - past) / past) * 100 * 10) / 10
}

async function fetchPokemonPrices(cardName: string, setName?: string) {
  try {
    const query = setName ? `name:"${cardName}" set.name:"${setName}"` : `name:"${cardName}"`
    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&orderBy=-set.releaseDate&pageSize=3`,
      { headers: { 'X-Api-Key': process.env.POKEMONTCG_API_KEY || '' } }
    )
    const data = await res.json()
    if (!data.data || data.data.length === 0) return null
    const card = data.data[0]
    const tcg = card.tcgplayer?.prices
    if (!tcg) return null
    const rawPrices: number[] = []
    Object.values(tcg).forEach((pt: unknown) => {
      const p = pt as Record<string, number>
      if (p.market) rawPrices.push(p.market)
      else if (p.mid) rawPrices.push(p.mid)
    })
    return { rawStats: calcStats(rawPrices), source: 'TCGPlayer' }
  } catch { return null }
}

async function fetchMagicPrices(cardName: string, setName?: string) {
  try {
    const query = setName ? `!"${cardName}" e:${setName}` : `!"${cardName}"`
    const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=usd`)
    const data = await res.json()
    let card = data.data?.[0]
    if (!card) {
      const res2 = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`)
      card = await res2.json()
      if (card.object === 'error') return null
    }
    const prices = [
      card.prices?.usd ? parseFloat(card.prices.usd) : null,
      card.prices?.usd_foil ? parseFloat(card.prices.usd_foil) : null,
    ].filter(Boolean) as number[]
    return { rawStats: calcStats(prices), source: 'Scryfall' }
  } catch { return null }
}

async function getTrends(supabase: ReturnType<typeof createClient>, key: string, currentAvg: number | null) {
  try {
    const now = new Date()
    const day7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const day30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: history } = await supabase
      .from('price_history')
      .select('raw_avg, recorded_at')
      .eq('card_key', key)
      .order('recorded_at', { ascending: false })
      .limit(60)

    if (!history || history.length === 0) return { days7: null, days30: null }

    const price7dAgo = (history as {raw_avg: number; recorded_at: string}[]).find(h => h.recorded_at <= day7ago)?.raw_avg || null
    const price30dAgo = (history as {raw_avg: number; recorded_at: string}[]).find(h => h.recorded_at <= day30ago)?.raw_avg || null

    return {
      days7: calcTrend(currentAvg, price7dAgo),
      days30: calcTrend(currentAvg, price30dAgo)
    }
  } catch { return { days7: null, days30: null } }
}

export async function getMarketData(cardName: string, game: string, setName?: string): Promise<MarketData | null> {
  const key = cardKey(cardName, game, setName)
  const supabase = getSupabase()

  // Check cache
  try {
    const { data: cached } = await supabase
      .from('price_cache')
      .select('*')
      .eq('card_key', key)
      .single()

    if (cached) {
      const age = (Date.now() - new Date(cached.last_updated).getTime()) / 1000 / 3600
      if (age < CACHE_TTL_HOURS) {
        return {
          raw: cached.prices,
          grades: cached.grade_prices,
          volume: { days7: cached.volume_7d || 0, days30: cached.volume_30d || 0 },
          trends: { days7: cached.trend_7d, days30: cached.trend_30d },
          source: cached.source,
          gradeSource: cached.grade_source || 'Estimated',
          lastUpdated: cached.last_updated
        }
      }
    }
  } catch { /* no cache */ }

  // Fetch raw prices
  const gameLower = game.toLowerCase()
  let rawResult: { rawStats: ReturnType<typeof calcStats>; source: string } | null = null

  if (gameLower.includes('pokemon') || gameLower.includes('pokémon')) {
    rawResult = await fetchPokemonPrices(cardName, setName)
  } else if (gameLower.includes('magic')) {
    rawResult = await fetchMagicPrices(cardName, setName)
  }

  if (!rawResult) return null

  // Fetch real PSA graded prices
  const psaPrices = await getPSAPrices(cardName, game)
  const baseRaw = rawResult.rawStats.median || rawResult.rawStats.avg || 0

  const grades = psaPrices ? {
    psa7: psaPrices.psa7,
    psa8: psaPrices.psa8,
    psa9: psaPrices.psa9,
    psa10: psaPrices.psa10,
  } : {
    psa7: baseRaw > 0 ? Math.round(baseRaw * 1.2 * 100) / 100 : null,
    psa8: baseRaw > 0 ? Math.round(baseRaw * 1.5 * 100) / 100 : null,
    psa9: baseRaw > 0 ? Math.round(baseRaw * 2.2 * 100) / 100 : null,
    psa10: baseRaw > 0 ? Math.round(baseRaw * 4.5 * 100) / 100 : null,
  }

  const gradeSource = psaPrices ? 'PSA Price Guide' : 'Estimated (×multiplier)'

  // Calculate trends from history
  const trends = await getTrends(supabase, key, rawResult.rawStats.avg)

  // Save to price history
  try {
    await supabase.from('price_history').insert({
      card_key: key,
      card_name: cardName,
      game,
      raw_avg: rawResult.rawStats.avg,
      raw_median: rawResult.rawStats.median,
      psa7: grades.psa7,
      psa8: grades.psa8,
      psa9: grades.psa9,
      psa10: grades.psa10,
    })
  } catch { /* history save failed */ }

  const marketData: MarketData = {
    raw: rawResult.rawStats,
    grades,
    volume: { days7: 0, days30: 0 },
    trends,
    source: rawResult.source,
    gradeSource,
    lastUpdated: new Date().toISOString()
  }

  // Save to cache
  try {
    await supabase.from('price_cache').upsert({
      card_key: key,
      card_name: cardName,
      game,
      set_name: setName,
      prices: marketData.raw,
      grade_prices: marketData.grades,
      volume_7d: 0,
      volume_30d: 0,
      trend_7d: trends.days7,
      trend_30d: trends.days30,
      source: marketData.source,
      grade_source: gradeSource,
      last_updated: new Date().toISOString()
    }, { onConflict: 'card_key' })
  } catch { /* cache save failed */ }

  return marketData
}
