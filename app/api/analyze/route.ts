import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

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

export async function POST(req: NextRequest) {
  try {
    const { image, mimeType } = await req.json()
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp', data: image }
          },
          {
            type: 'text',
            text: `You are a professional TCG card grader and market analyst. Analyze this trading card image carefully.

Respond ONLY with valid JSON, no markdown, no explanation outside the JSON:

{
  "cardName": "exact card name",
  "game": "Pokemon | Magic: The Gathering | One Piece | Yu-Gi-Oh | Lorcana | Other",
  "setName": "set name if visible",
  "year": "year if visible or estimated",
  "rarity": "Common | Uncommon | Rare | Ultra Rare | Secret Rare | Holo | etc",
  "language": "English | Japanese | French | etc",
  "condition": {
    "overall": "Mint | Near Mint | Excellent | Very Good | Good | Poor",
    "centering": "Perfect | Good | Off | Poor",
    "surfaces": "Clean | Minor scratches | Scratches | Heavy wear",
    "corners": "Sharp | Light wear | Rounded | Heavy wear",
    "edges": "Clean | Light wear | Chipped | Heavy wear"
  },
  "estimatedPSAGrade": 9.5,
  "gradeConfidence": "High | Medium | Low",
  "estimatedRawValue": 45,
  "estimatedGradedValue": {
    "PSA10": 180,
    "PSA9": 95,
    "PSA8": 60
  },
  "gradingRecommendation": "GRADE | SKIP | MAYBE",
  "recommendationReason": "Short reason 1-2 sentences",
  "keyIssues": ["any notable issues"],
  "currency": "USD",
  "isCardDetected": true
}

If no card is detected set isCardDetected to false and use null for numeric values.
Be realistic and conservative. Market values should reflect current TCG market (2024-2025).`
          }
        ]
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const analysis = JSON.parse(cleanText)

    if (!analysis.isCardDetected) {
      return NextResponse.json({ error: 'No trading card detected. Please upload a clear photo of your card.' }, { status: 400 })
    }

    const gradingAnalysis: Record<string, unknown> = {}

    for (const [serviceKey, service] of Object.entries(GRADING_SERVICES)) {
      const tiers = service.tiers.map(tier => {
        const shippingCost = service.shipping.toGrader + service.shipping.fromGrader
        const insuranceCost = Math.round((analysis.estimatedRawValue || 50) * service.shipping.insurance)
        const shippingTotal = shippingCost + insuranceCost
        const targetGrade = analysis.estimatedPSAGrade >= 9.5 ? 'PSA10' : analysis.estimatedPSAGrade >= 8.5 ? 'PSA9' : 'PSA8'
        const gradedValue = analysis.estimatedGradedValue?.[targetGrade] || (analysis.estimatedRawValue * 2)
        const roi = calculateROI(gradedValue, analysis.estimatedRawValue || 50, tier.cost, shippingTotal)
        return { ...tier, shippingTotal, gradedValue, ...roi, worthIt: roi.profit > 20 && roi.roi > 30 }
      })
      gradingAnalysis[serviceKey] = { ...service, tiers, bestTier: tiers.find(t => t.worthIt) || tiers[0] }
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
        await supabase.from('scans').insert({
          card_name: analysis.cardName,
          game: analysis.game,
          psa_grade_estimate: analysis.estimatedPSAGrade,
          raw_value: analysis.estimatedRawValue,
          recommendation: analysis.gradingRecommendation,
          full_analysis: { analysis, gradingAnalysis }
        })
      } catch { /* Supabase optional */ }
    }

    return NextResponse.json({ analysis, gradingAnalysis })

  } catch (err: unknown) {
    console.error('Analysis error:', err)
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Could not parse card analysis. Please try with a clearer image.' }, { status: 422 })
    }
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}
