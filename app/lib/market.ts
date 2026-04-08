import { createClient } from '@supabase/supabase-js'
import { getPSAPrices } from './psa-prices'
import { getPriceChartingData } from './pricecharting'

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

async function getTrends(supabase: ReturnType<typeof getSupabase>, key: string, currentAvg: number | null) {
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

    const h = history as { raw_avg: number; recorded_at: string }[]
    const price7dAgo = h.find(p => p.recorded_at <= day7ago)?.raw_avg || null
    const price30dAgo = h.find(p => p.recorded_at <= day30ago)?.raw_avg || null

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

  // Fetch raw prices + PriceCharting en parallèle
  const gameLower = game.toLowerCase()
  let rawResult: { rawStats: ReturnType<typeof calcStats>; source: string } | null = null

  const [pokemonResult, magicResult, priceCharting, psaPrices] = await Promise.all([
    gameLower.includes('pokemon') || gameLower.includes('pokémon')
      ? fetchPokemonPrices(cardName, setName) : Promise.resolve(null),
    gameLower.includes('magic')
      ? fetchMagicPrices(cardName, setName) : Promise.resolve(null),
    getPriceChartingData(cardName, game),
    getPSAPrices(cardName, game),
  ])

  rawResult = pokemonResult || magicResult

  // Si PriceCharting a un prix RAW, on l'utilise comme référence supplémentaire
  if (priceCharting?.raw && rawResult) {
    const combined = [rawResult.rawStats.avg, priceCharting.raw].filter(Boolean) as number[]
    rawResult.rawStats = calcStats(combined)
  } else if (priceCharting?.raw && !rawResult) {
    rawResult = { rawStats: calcStats([priceCharting.raw]), source: 'PriceCharting' }
  }

  if (!rawResult) return null

  const baseRaw = rawResult.rawStats.median || rawResult.rawStats.avg || 0

  // Priorité des sources de prix gradés : PriceCharting > PSA > Estimés
  const grades = {
    psa7: priceCharting?.psa7 || psaPrices?.psa7 || (baseRaw > 0 ? Math.round(baseRaw * 1.2 * 100) / 100 : null),
    psa8: priceCharting?.psa8 || psaPrices?.psa8 || (baseRaw > 0 ? Math.round(baseRaw * 1.5 * 100) / 100 : null),
    psa9: priceCharting?.psa9 || psaPrices?.psa9 || (baseRaw > 0 ? Math.round(baseRaw * 2.2 * 100) / 100 : null),
    psa10: priceCharting?.psa10 || psaPrices?.psa10 || (baseRaw > 0 ? Math.round(baseRaw * 4.5 * 100) / 100 : null),
  }

  const gradeSource = priceCharting?.psa10 ? 'PriceCharting'
    : psaPrices?.psa10 ? 'PSA Price Guide'
    : 'Estimated (×multiplier)'

  const volume = {
    days7: priceCharting?.volume || 0,
    days30: priceCharting?.volume ? priceCharting.volume * 4 : 0
  }

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

  const sources = [rawResult.source]
  if (priceCharting) sources.push('PriceCharting')
  if (psaPrices) sources.push('PSA')

  const marketData: MarketData = {
    raw: rawResult.rawStats,
    grades,
    volume,
    trends,
    source: sources.join(' + '),
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
      volume_7d: volume.days7,
      volume_30d: volume.days30,
      trend_7d: trends.days7,
      trend_30d: trends.days30,
      source: marketData.source,
      grade_source: gradeSource,
      last_updated: new Date().toISOString()
    }, { onConflict: 'card_key' })
  } catch { /* cache save failed */ }

  return marketData
}

// Intégration eBay — priorité maximale quand disponible
import { getEbaySoldListings } from './ebay'

export async function getMarketDataWithEbay(cardName: string, game: string, setName?: string): Promise<MarketData | null> {
  const [baseData, ebayData] = await Promise.all([
    getMarketData(cardName, game, setName),
    getEbaySoldListings(cardName, game, setName)
  ])

  if (!ebayData) return baseData
  if (!baseData) return null

  // eBay override — données réelles prioritaires
  return {
    ...baseData,
    raw: ebayData.raw.count > 0 ? ebayData.raw : baseData.raw,
    grades: {
      psa7: ebayData.grades.psa7 || baseData.grades.psa7,
      psa8: ebayData.grades.psa8 || baseData.grades.psa8,
      psa9: ebayData.grades.psa9 || baseData.grades.psa9,
      psa10: ebayData.grades.psa10 || baseData.grades.psa10,
    },
    volume: ebayData.volume,
    trends: { days7: ebayData.trends.days7 || baseData.trends.days7, days30: baseData.trends.days30 },
    source: ebayData.raw.count > 0 ? `eBay + ${baseData.source}` : baseData.source,
    gradeSource: ebayData.grades.psa10 ? 'eBay Sold Listings' : baseData.gradeSource,
  }
}

// Intégration eBay — priorité maximale quand disponible
import { getEbaySoldListings } from './ebay'

export async function getMarketDataWithEbay(cardName: string, game: string, setName?: string): Promise<MarketData | null> {
  const [baseData, ebayData] = await Promise.all([
    getMarketData(cardName, game, setName),
    getEbaySoldListings(cardName, game, setName)
  ])

  if (!ebayData) return baseData
  if (!baseData) return null

  // eBay override — données réelles prioritaires
  return {
    ...baseData,
    raw: ebayData.raw.count > 0 ? ebayData.raw : baseData.raw,
    grades: {
      psa7: ebayData.grades.psa7 || baseData.grades.psa7,
      psa8: ebayData.grades.psa8 || baseData.grades.psa8,
      psa9: ebayData.grades.psa9 || baseData.grades.psa9,
      psa10: ebayData.grades.psa10 || baseData.grades.psa10,
    },
    volume: ebayData.volume,
    trends: { days7: ebayData.trends.days7 || baseData.trends.days7, days30: baseData.trends.days30 },
    source: ebayData.raw.count > 0 ? `eBay + ${baseData.source}` : baseData.source,
    gradeSource: ebayData.grades.psa10 ? 'eBay Sold Listings' : baseData.gradeSource,
  }
}
