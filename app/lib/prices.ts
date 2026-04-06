// PokéTCG API - gratuit, pas besoin de clé pour commencer
const POKÉTCG_API = 'https://api.pokemontcg.io/v2'

// Scryfall API - gratuit, pas de clé nécessaire
const SCRYFALL_API = 'https://api.scryfall.com'

export interface CardPrice {
  name: string
  set: string
  image: string | null
  prices: {
    low: number | null
    mid: number | null
    high: number | null
    market: number | null
  }
  found: boolean
}

export async function getPokemonPrice(cardName: string, setName?: string): Promise<CardPrice> {
  try {
    const query = setName
      ? `name:"${cardName}" set.name:"${setName}"`
      : `name:"${cardName}"`

    const res = await fetch(
      `${POKÉTCG_API}/cards?q=${encodeURIComponent(query)}&orderBy=-set.releaseDate&pageSize=1`,
      { headers: { 'X-Api-Key': process.env.POKEMONTCG_API_KEY || '' } }
    )
    const data = await res.json()

    if (!data.data || data.data.length === 0) {
      // Essai sans le set
      const res2 = await fetch(
        `${POKÉTCG_API}/cards?q=${encodeURIComponent(`name:"${cardName}"`)}&orderBy=-set.releaseDate&pageSize=1`,
        { headers: { 'X-Api-Key': process.env.POKEMONTCG_API_KEY || '' } }
      )
      const data2 = await res2.json()
      if (!data2.data || data2.data.length === 0) return { name: cardName, set: '', image: null, prices: { low: null, mid: null, high: null, market: null }, found: false }

      const card = data2.data[0]
      const tcg = card.tcgplayer?.prices
      const priceData = tcg?.holofoil || tcg?.normal || tcg?.reverseHolofoil || Object.values(tcg || {})[0] || {}
      return {
        name: card.name,
        set: card.set?.name || '',
        image: card.images?.large || card.images?.small || null,
        prices: {
          low: priceData.low || null,
          mid: priceData.mid || null,
          high: priceData.high || null,
          market: priceData.market || null,
        },
        found: true
      }
    }

    const card = data.data[0]
    const tcg = card.tcgplayer?.prices
    const priceData = tcg?.holofoil || tcg?.normal || tcg?.reverseHolofoil || Object.values(tcg || {})[0] || {}
    return {
      name: card.name,
      set: card.set?.name || '',
      image: card.images?.large || card.images?.small || null,
      prices: {
        low: priceData.low || null,
        mid: priceData.mid || null,
        high: priceData.high || null,
        market: priceData.market || null,
      },
      found: true
    }
  } catch {
    return { name: cardName, set: '', image: null, prices: { low: null, mid: null, high: null, market: null }, found: false }
  }
}

export async function getMagicPrice(cardName: string, setName?: string): Promise<CardPrice> {
  try {
    const query = setName ? `!"${cardName}" e:${setName}` : `!"${cardName}"`
    const res = await fetch(
      `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}&order=usd&dir=desc`,
    )
    const data = await res.json()

    if (!data.data || data.data.length === 0) {
      const res2 = await fetch(`${SCRYFALL_API}/cards/named?fuzzy=${encodeURIComponent(cardName)}`)
      const card = await res2.json()
      if (card.object === 'error') return { name: cardName, set: '', image: null, prices: { low: null, mid: null, high: null, market: null }, found: false }
      return {
        name: card.name,
        set: card.set_name || '',
        image: card.image_uris?.normal || null,
        prices: {
          low: card.prices?.usd ? parseFloat(card.prices.usd) * 0.8 : null,
          mid: card.prices?.usd ? parseFloat(card.prices.usd) : null,
          high: card.prices?.usd ? parseFloat(card.prices.usd) * 1.3 : null,
          market: card.prices?.usd ? parseFloat(card.prices.usd) : null,
        },
        found: true
      }
    }

    const card = data.data[0]
    return {
      name: card.name,
      set: card.set_name || '',
      image: card.image_uris?.normal || null,
      prices: {
        low: card.prices?.usd ? parseFloat(card.prices.usd) * 0.8 : null,
        mid: card.prices?.usd ? parseFloat(card.prices.usd) : null,
        high: card.prices?.usd ? parseFloat(card.prices.usd) * 1.3 : null,
        market: card.prices?.usd ? parseFloat(card.prices.usd) : null,
      },
      found: true
    }
  } catch {
    return { name: cardName, set: '', image: null, prices: { low: null, mid: null, high: null, market: null }, found: false }
  }
}

export async function getCardPrice(cardName: string, game: string, setName?: string): Promise<CardPrice> {
  const gameLower = game.toLowerCase()
  if (gameLower.includes('pokemon') || gameLower.includes('pokémon')) {
    return getPokemonPrice(cardName, setName)
  }
  if (gameLower.includes('magic')) {
    return getMagicPrice(cardName, setName)
  }
  // Pour One Piece, Yu-Gi-Oh, Lorcana : on retourne null (l'IA garde son estimation)
  return { name: cardName, set: setName || '', image: null, prices: { low: null, mid: null, high: null, market: null }, found: false }
}
