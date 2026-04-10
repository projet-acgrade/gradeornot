import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getCardPrice } from '../../lib/prices'
import { getPSAPopulation, getDefaultProbabilities } from '../../lib/psa-population'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GRADING_SERVICES = {
  PSA: {
    name: 'PSA',
    tiers: [
      { name: 'Value', turnaround: '60-120 days', cost: 25 },
      { name: 'Regular', turnaround: '30-45 days', cost: 50 },
      { name: 'Express', turnaround: '10 days', cost: 150 },
      { name: 'Super Express', turnaround: '5 days', cost: 300 },
    ],
    shipping: { toGrader: 20, fromGrader: 20, insurance: 0.015 },
    url: 'https://www.psacard.com',
    logo: 'PSA'
  },
  BGS: {
    name: 'BGS (Beckett)',
    tiers: [
      { name: 'Economy', turnaround: '90 days', cost: 22 },
      { name: 'Standard', turnaround: '30 days', cost: 40 },
      { name: 'Express', turnaround: '10 days', cost: 100 },
      { name: 'Premium', turnaround: '3 days', cost: 250 },
    ],
    shipping: { toGrader: 18, fromGrader: 18, insurance: 0.01 },
    url: 'https://www.beckett.com/grading',
    logo: 'BGS'
  },
  CGC: {
    name: 'CGC',
    tiers: [
      { name: 'Economy', turnaround: '60-80 days', cost: 12 },
      { name: 'Standard', turnaround: '20-30 days', cost: 25 },
      { name: 'Express', turnaround: '10 days', cost: 50 },
      { name: 'Walkthrough', turnaround: '2 days', cost: 150 },
    ],
    shipping: { toGrader: 15, fromGrader: 15, insurance: 0.01 },
    url: 'https://www.cgccards.com',
    logo: 'CGC'
  }
}

function calculateROI(gradedValue: number, rawValue: number, gradingCost: number, shippingTotal: number) {
  const totalCost = gradingCost + shippingTotal
  const profit = gradedValue - rawValue - totalCost
  const roi = rawValue > 0 ? ((profit / rawValue) * 100) : 0
  return { profit: Math.round(profit), roi: Math.round(roi), totalCost: Math.round(totalCost) }
}

function estimateGradedValue(rawValue: number, psaGrade: number) {
  if (psaGrade >= 9.5) return { PSA10: Math.round(rawValue * 4), PSA9: Math.round(rawValue * 2), PSA8: Math.round(rawValue * 1.3) }
  if (psaGrade >= 8.5) return { PSA10: Math.round(rawValue * 3.5), PSA9: Math.round(rawValue * 1.8), PSA8: Math.round(rawValue * 1.2) }
  return { PSA10: Math.round(rawValue * 3), PSA9: Math.round(rawValue * 1.5), PSA8: Math.round(rawValue * 1.1) }
}

function buildGradingAnalysis(rawValue: number, psaGrade: number) {
  const gradedValues = estimateGradedValue(rawValue, psaGrade)
  const gradingAnalysis: Record<string, unknown> = {}
  for (const [serviceKey, service] of Object.entries(GRADING_SERVICES)) {
    const tiers = service.tiers.map(tier => {
      const shippingCost = service.shipping.toGrader + service.shipping.fromGrader
      const insuranceCost = Math.round(rawValue * service.shipping.insurance)
      const shippingTotal = shippingCost + insuranceCost
      const targetGrade = psaGrade >= 9.5 ? 'PSA10' : psaGrade >= 8.5 ? 'PSA9' : 'PSA8'
      const gradedValue = gradedValues[targetGrade as keyof typeof gradedValues]
      const roi = calculateROI(gradedValue, rawValue, tier.cost, shippingTotal)
      return { ...tier, shippingTotal, gradedValue, ...roi, worthIt: roi.profit > 20 && roi.roi > 30 }
    })
    gradingAnalysis[serviceKey] = { ...service, tiers, bestTier: tiers.find(t => t.worthIt) || tiers[0] }
  }
  return { gradingAnalysis, gradedValues }
}

// Convertit les labels de condition en scores numériques
function conditionToScore(value: string, type: 'centering' | 'surfaces' | 'corners' | 'edges'): number {
  if (type === 'centering') {
    if (value.includes('Perfect')) return 10
    if (value.includes('Good')) return 8
    if (value.includes('Off')) return 6
    if (value.includes('Poor')) return 4
    return 7
  }
  if (type === 'surfaces') {
    if (value.includes('Clean')) return 10
    if (value.includes('Minor')) return 8
    if (value.includes('Scratches')) return 5
    if (value.includes('Heavy')) return 3
    return 7
  }
  if (type === 'corners') {
    if (value.includes('Sharp')) return 10
    if (value.includes('Light')) return 8
    if (value.includes('Rounded')) return 5
    if (value.includes('Heavy')) return 3
    return 7
  }
  if (type === 'edges') {
    if (value.includes('Clean')) return 10
    if (value.includes('Light')) return 8
    if (value.includes('Chipped')) return 5
    if (value.includes('Heavy')) return 3
    return 7
  }
  return 7
}

export async function POST(req: NextRequest) {
  try {
    const { image, mimeType, overrideCard, manualSearch, userId } = await req.json()
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

    let analysis

    if (overrideCard) {
      const condRes = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
            {
              type: 'text',
              text: `Analyze ONLY the physical condition of this card. The card is: ${overrideCard.cardName} from ${overrideCard.setName}.

Respond ONLY with valid JSON:
{
  "condition": {
    "overall": "Mint | Near Mint | Excellent | Very Good | Good | Poor",
    "centering": "Perfect | Good | Off | Poor",
    "surfaces": "Clean | Minor scratches | Scratches | Heavy wear",
    "corners": "Sharp | Light wear | Rounded | Heavy wear",
    "edges": "Clean | Light wear | Chipped | Heavy wear"
  },
  "estimatedPSAGrade": 8.5,
  "gradeConfidence": 75,
  "gradingRecommendation": "GRADE | SKIP | MAYBE",
  "recommendationReason": "1-2 sentences",
  "keyIssues": []
}`
            }
          ]
        }]
      })
      const condText = condRes.content[0].type === 'text' ? condRes.content[0].text : ''
      const condData = JSON.parse(condText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
      analysis = { ...overrideCard, ...condData, isCardDetected: true }

    } else if (manualSearch) {
      const searchRes = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
            {
              type: 'text',
              text: `The user says this card is: "${manualSearch}". Analyze the card condition and confirm identification.

Respond ONLY with valid JSON:
{
  "cardName": "confirmed name",
  "game": "Pokemon | Magic: The Gathering | One Piece | Yu-Gi-Oh | Lorcana | Other",
  "setName": "set name",
  "year": "year",
  "rarity": "rarity",
  "language": "language",
  "condition": {
    "overall": "Mint | Near Mint | Excellent | Very Good | Good | Poor",
    "centering": "Perfect | Good | Off | Poor",
    "surfaces": "Clean | Minor scratches | Scratches | Heavy wear",
    "corners": "Sharp | Light wear | Rounded | Heavy wear",
    "edges": "Clean | Light wear | Chipped | Heavy wear"
  },
  "estimatedPSAGrade": 8.5,
  "gradeConfidence": 75,
  "estimatedRawValue": 50,
  "gradingRecommendation": "GRADE | SKIP | MAYBE",
  "recommendationReason": "1-2 sentences",
  "keyIssues": [],
  "isCardDetected": true
}`
            }
          ]
        }]
      })
      const searchText = searchRes.content[0].type === 'text' ? searchRes.content[0].text : ''
      analysis = JSON.parse(searchText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

    } else {
      const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
            {
              type: 'text',
              text: `You are a professional TCG card grader with 20 years of PSA/BGS experience. Analyze this specific card image with extreme visual precision.

STEP 1 — CENTERING (PSA weight 40%):
Look at the card borders carefully. Measure visually the white border widths.
10.0=perfect 55/45, 9.5=57/43, 9.0=60/40, 8.5=62/38, 8.0=65/35, 7.0=70/30, 6.0=75/25, 5.0=80/20
Give a SPECIFIC decimal score based on what you actually see.

STEP 2 — SURFACES (PSA weight 30%):
Examine front and back for scratches, print lines, stains, creases, holo damage, yellowing.
10.0=pristine, 9.5=one micro mark, 9.0=1-2 tiny marks, 8.5=few light marks, 8.0=light scratches, 7.0=moderate, 6.0=heavy.
Give a SPECIFIC decimal score.

STEP 3 — CORNERS (PSA weight 20%):
Examine all 4 corners for fraying, rounding, whitening.
10.0=razor sharp all 4, 9.5=one micro fray, 9.0=one slight fray, 8.5=two corners slight, 8.0=2-3 fraying, 7.0=rounded, 6.0=heavily worn.
Give a SPECIFIC decimal score.

STEP 4 — EDGES (PSA weight 10%):
Examine all 4 edges for chipping, roughness, nicking.
10.0=perfect, 9.5=one micro nick, 9.0=minor nick, 8.5=2-3 nicks, 8.0=chipping visible, 7.0=moderate chipping.
Give a SPECIFIC decimal score.

SCORING RULES:
- Use decimals: 8.5, 7.5, 9.5 not just round numbers
- Scores MUST differ from each other based on what you actually see
- Most cards score 6.0-9.0, very few deserve 9.5+
- If image is blurry/dark, reduce all scores by 0.5-1.0
- A card with PSA grade 5 should have criteria scores averaging around 5, not 8

KEY ISSUES: Only list defects you can ACTUALLY SEE with specifics:
- "Left border ~30% wider than right (estimated 65/35 centering)"
- "Diagonal scratch visible on front surface"
- "Bottom-left corner shows fraying"
Empty array [] if card looks clean. DO NOT invent issues.

If high confidence, respond FORMAT A. If ambiguous, respond FORMAT B.

FORMAT A:
{
  "cardName": "exact name",
  "game": "Pokemon | Magic: The Gathering | One Piece | Yu-Gi-Oh | Lorcana | Other",
  "setName": "set name",
  "setNumber": "card number e.g. 4/102",
  "year": "year",
  "rarity": "rarity",
  "language": "English | Japanese | French | etc",
  "version": "1st Edition | Unlimited | Shadow | Reverse Holo | etc",
  "condition": {
    "overall": "Mint | Near Mint | Excellent | Very Good | Good | Poor",
    "centering": "Perfect | Good | Off | Poor",
    "surfaces": "Clean | Minor scratches | Scratches | Heavy wear",
    "corners": "Sharp | Light wear | Rounded | Heavy wear",
    "edges": "Clean | Light wear | Chipped | Heavy wear"
  },
  "estimatedPSAGrade": 8.5,
  "gradeConfidence": 75,
  "estimatedRawValue": 50,
  "gradingRecommendation": "GRADE | SKIP | MAYBE",
  "recommendationReason": "1-2 sentences",
  "keyIssues": [],
  "isCardDetected": true,
  "ambiguous": false
}

FORMAT B:
{
  "isCardDetected": true,
  "ambiguous": true,
  "suggestions": [
    { "cardName": "name", "setName": "set", "year": "year", "rarity": "rarity", "language": "language", "confidence": 85, "estimatedRawValue": 45 }
  ]
}

If no card: { "isCardDetected": false }

IMPORTANT: gradeConfidence must be a NUMBER 0-100 (not "High"/"Medium"/"Low").
Be conservative with grades. Be precise with card identification.`
            }
          ]
        }]
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      analysis = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    }

    if (!analysis.isCardDetected) {
      return NextResponse.json({ error: 'No trading card detected. Please upload a clear photo.' }, { status: 400 })
    }

    if (analysis.ambiguous && analysis.suggestions) {
      return NextResponse.json({ suggestions: analysis.suggestions })
    }

    // Calcule les scores numériques par critère
    // Utiliser les scores numériques de Claude directement si disponibles
    const criteriaScores = analysis.criteriaScores ? {
      centering: Number(analysis.criteriaScores.centering) || conditionToScore(analysis.condition?.centering || '', 'centering'),
      surfaces: Number(analysis.criteriaScores.surfaces) || conditionToScore(analysis.condition?.surfaces || '', 'surfaces'),
      corners: Number(analysis.criteriaScores.corners) || conditionToScore(analysis.condition?.corners || '', 'corners'),
      edges: Number(analysis.criteriaScores.edges) || conditionToScore(analysis.condition?.edges || '', 'edges'),
    } : {
      centering: conditionToScore(analysis.condition?.centering || '', 'centering'),
      surfaces: conditionToScore(analysis.condition?.surfaces || '', 'surfaces'),
      corners: conditionToScore(analysis.condition?.corners || '', 'corners'),
      edges: conditionToScore(analysis.condition?.edges || '', 'edges'),
    }

    // Normalise gradeConfidence en nombre
    let confidence = analysis.gradeConfidence
    if (typeof confidence === 'string') {
      confidence = confidence === 'High' ? 80 : confidence === 'Medium' ? 60 : 40
    }
    confidence = Math.min(100, Math.max(0, Number(confidence) || 60))

    const realPrice = await getCardPrice(analysis.cardName, analysis.game, analysis.setName)
    const rawValue = realPrice.found && realPrice.prices.market
      ? Math.round(realPrice.prices.market)
      : analysis.estimatedRawValue || 50

    const { gradingAnalysis, gradedValues } = buildGradingAnalysis(rawValue, analysis.estimatedPSAGrade)

    const enrichedAnalysis = {
      ...analysis,
      estimatedRawValue: rawValue,
      estimatedGradedValue: gradedValues,
      criteriaScores,
      gradeConfidence: confidence,
      realPriceFound: realPrice.found,
      priceSource: realPrice.found
        ? (analysis.game?.toLowerCase().includes('magic') ? 'Scryfall' : 'TCGPlayer')
        : 'AI Estimate',
      realPriceData: realPrice.found ? realPrice.prices : null,
      cardImage: realPrice.image || null,
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
        await supabase.from('scans').insert({
          card_name: enrichedAnalysis.cardName,
          game: enrichedAnalysis.game,
          psa_grade_estimate: enrichedAnalysis.estimatedPSAGrade,
          raw_value: rawValue,
          recommendation: enrichedAnalysis.gradingRecommendation,
          full_analysis: { analysis: enrichedAnalysis, gradingAnalysis }
        })
      } catch { /* optional */ }
    }

    // Fetch real PSA population probabilities
    const psaPop = await getPSAPopulation(analysis.cardName, analysis.game)
    const gradeProbabilities = psaPop
      ? psaPop.probabilities
      : getDefaultProbabilities(analysis.estimatedPSAGrade, enrichedAnalysis.gradeConfidence)

    const finalAnalysis = {
      ...enrichedAnalysis,
      gradeProbabilities,
      psaPopulation: psaPop ? {
        total: psaPop.total,
        byGrade: psaPop.byGrade,
        source: psaPop.source
      } : null,
    }

    return NextResponse.json({ analysis: finalAnalysis, gradingAnalysis })

  } catch (err: unknown) {
    console.error('Analysis error:', err)
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Could not parse card analysis. Try a clearer image.' }, { status: 422 })
    }
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}
