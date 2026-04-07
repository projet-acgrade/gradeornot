import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getCardPrice } from '../../lib/prices'

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

export async function POST(req: NextRequest) {
  try {
    const { image, mimeType, overrideCard, manualSearch } = await req.json()
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

    let analysis

    if (overrideCard) {
      // User selected a suggestion — use it directly with condition analysis only
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
  "gradeConfidence": "High | Medium | Low",
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
      // Manual search override
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
  "gradeConfidence": "High | Medium | Low",
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
      // Full auto identification
      const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
            {
              type: 'text',
              text: `You are a professional TCG card identifier and grader. Analyze this card image carefully.

If you can identify the card with HIGH confidence, respond with a single card object.
If there is ambiguity (multiple possible versions, sets, or languages), provide up to 3 suggestions.

Respond ONLY with valid JSON in one of these two formats:

FORMAT A - Single card (high confidence):
{
  "cardName": "exact name",
  "game": "Pokemon | Magic: The Gathering | One Piece | Yu-Gi-Oh | Lorcana | Other",
  "setName": "set name",
  "setNumber": "card number if visible e.g. 4/102",
  "year": "year",
  "rarity": "Holo Rare | Ultra Rare | Common | etc",
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
  "gradeConfidence": "High | Medium | Low",
  "estimatedRawValue": 50,
  "gradingRecommendation": "GRADE | SKIP | MAYBE",
  "recommendationReason": "1-2 sentences",
  "keyIssues": [],
  "isCardDetected": true,
  "ambiguous": false
}

FORMAT B - Multiple suggestions (ambiguous):
{
  "isCardDetected": true,
  "ambiguous": true,
  "suggestions": [
    {
      "cardName": "name",
      "setName": "set",
      "year": "year",
      "rarity": "rarity",
      "language": "language",
      "confidence": 85,
      "estimatedRawValue": 45
    }
  ]
}

If no card detected: { "isCardDetected": false }
Be conservative with grades. Be precise with card identification including version and set number.`
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

    // Return suggestions if ambiguous
    if (analysis.ambiguous && analysis.suggestions) {
      return NextResponse.json({ suggestions: analysis.suggestions })
    }

    // Fetch real market price
    const realPrice = await getCardPrice(analysis.cardName, analysis.game, analysis.setName)
    const rawValue = realPrice.found && realPrice.prices.market
      ? Math.round(realPrice.prices.market)
      : analysis.estimatedRawValue || 50

    const { gradingAnalysis, gradedValues } = buildGradingAnalysis(rawValue, analysis.estimatedPSAGrade)

    const enrichedAnalysis = {
      ...analysis,
      estimatedRawValue: rawValue,
      estimatedGradedValue: gradedValues,
      realPriceFound: realPrice.found,
      priceSource: realPrice.found
        ? (analysis.game?.toLowerCase().includes('magic') ? 'Scryfall' : 'TCGPlayer')
        : 'AI Estimate',
      realPriceData: realPrice.found ? realPrice.prices : null,
      cardImage: realPrice.image || null,
    }

    // Save to Supabase
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

    return NextResponse.json({ analysis: enrichedAnalysis, gradingAnalysis })

  } catch (err: unknown) {
    console.error('Analysis error:', err)
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Could not parse card analysis. Try a clearer image.' }, { status: 422 })
    }
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}
