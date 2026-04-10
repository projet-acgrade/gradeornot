export interface DecisionRule {
  id: string
  label: string
  passed: boolean
  value: string
  weight: number
  detail: string
}

export interface DecisionResult {
  verdict: 'GRADE' | 'SKIP' | 'MAYBE'
  confidence: number
  score: number
  rules: DecisionRule[]
  summary: string
  bestService: string
  bestTier: string
}

interface DecisionInput {
  psaGrade: number
  rawValue: number
  gradedValues: { PSA10: number; PSA9: number; PSA8: number }
  gradeProbabilities: { psa10: number; psa9: number; psa8: number; psa7: number }
  gradingCost: number
  shippingTotal: number
  sellingFee: number
  criteriaScores: { centering: number; surfaces: number; corners: number; edges: number }
  keyIssues: string[]
  game: string
  rarity: string
}

export function runDecisionEngine(input: DecisionInput): DecisionResult {
  const {
    psaGrade, rawValue, gradedValues, gradeProbabilities,
    gradingCost, shippingTotal, sellingFee, criteriaScores, keyIssues
  } = input

  const totalCost = rawValue + gradingCost + shippingTotal

  // Valeur attendue pondérée
  const expectedValue =
    (gradedValues.PSA10 * gradeProbabilities.psa10 / 100) +
    (gradedValues.PSA9 * gradeProbabilities.psa9 / 100) +
    (gradedValues.PSA8 * gradeProbabilities.psa8 / 100) +
    (rawValue * 0.85 * gradeProbabilities.psa7 / 100)

  const netExpected = expectedValue * (1 - sellingFee / 100)
  const netProfit = netExpected - totalCost
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0
  const breakEven = totalCost / (1 - sellingFee / 100)

  // Règles de décision
  const rules: DecisionRule[] = []

  // 1. ROI minimum
  const roiPassed = roi >= 30
  rules.push({
    id: 'roi',
    label: 'ROI ≥ 30%',
    passed: roiPassed,
    value: `${roi.toFixed(1)}%`,
    weight: 30,
    detail: roiPassed
      ? `Expected ROI of ${roi.toFixed(1)}% exceeds the 30% minimum threshold`
      : `Expected ROI of ${roi.toFixed(1)}% is below the 30% minimum — grading costs too high relative to upside`
  })

  // 2. Profit net positif
  const profitPassed = netProfit > 20
  rules.push({
    id: 'profit',
    label: 'Net profit > $20',
    passed: profitPassed,
    value: `$${netProfit.toFixed(0)}`,
    weight: 25,
    detail: profitPassed
      ? `Expected net profit of $${netProfit.toFixed(0)} after all fees`
      : `Expected net profit of $${netProfit.toFixed(0)} — margin too thin to justify the risk`
  })

  // 3. Grade minimum PSA 8
  const gradePassed = psaGrade >= 7.5
  rules.push({
    id: 'grade',
    label: 'Est. grade ≥ PSA 7.5',
    passed: gradePassed,
    value: `PSA ${psaGrade}`,
    weight: 20,
    detail: gradePassed
      ? `Estimated grade of ${psaGrade} is sufficient for grading to add value`
      : `Estimated grade of ${psaGrade} — cards below PSA 8 rarely justify grading costs`
  })

  // 4. Probabilité PSA 9+ acceptable
  const prob9Plus = gradeProbabilities.psa9 + gradeProbabilities.psa10
  const probPassed = prob9Plus >= 25
  rules.push({
    id: 'probability',
    label: 'PSA 9+ probability ≥ 25%',
    passed: probPassed,
    value: `${prob9Plus}%`,
    weight: 15,
    detail: probPassed
      ? `${prob9Plus}% chance of PSA 9 or better — solid upside potential`
      : `Only ${prob9Plus}% chance of PSA 9+ — too much downside risk`
  })

  // 5. Valeur brute minimum
  const valuePassed = rawValue >= 15
  rules.push({
    id: 'value',
    label: 'Raw value ≥ $15',
    passed: valuePassed,
    value: `$${rawValue}`,
    weight: 10,
    detail: valuePassed
      ? `Raw value of $${rawValue} is sufficient — grading fees are proportionate`
      : `Raw value of $${rawValue} is too low — grading fees would exceed the card's value`
  })

  // Score pondéré
  const totalWeight = rules.reduce((a, r) => a + r.weight, 0)
  const passedWeight = rules.filter(r => r.passed).reduce((a, r) => a + r.weight, 0)
  const score = Math.round((passedWeight / totalWeight) * 100)

  // Niveau de confiance basé sur la clarté des données
  const hasRealPrices = rawValue > 0
  const hasRealGrade = psaGrade > 0
  const issueCount = keyIssues.length
  const weightedScore = criteriaScores
    ? criteriaScores.centering * 0.4 + criteriaScores.surfaces * 0.3 + criteriaScores.corners * 0.2 + criteriaScores.edges * 0.1
    : 0

  let confidence = 50
  if (hasRealPrices) confidence += 15
  if (hasRealGrade) confidence += 10
  if (Math.abs(psaGrade - weightedScore) < 1) confidence += 15 // cohérence grade/scores
  if (issueCount > 0 && issueCount < 5) confidence += 10 // issues détectées = analyse précise
  confidence = Math.min(confidence, 92)

  // Verdict final
  let verdict: 'GRADE' | 'SKIP' | 'MAYBE'
  if (score >= 70) verdict = 'GRADE'
  else if (score <= 35) verdict = 'SKIP'
  else verdict = 'MAYBE'

  // Summary
  const passedRules = rules.filter(r => r.passed)
  const failedRules = rules.filter(r => !r.passed)

  let summary = ''
  if (verdict === 'GRADE') {
    summary = `${passedRules.length}/${rules.length} criteria met. ${passedRules[0]?.detail || ''}`
  } else if (verdict === 'SKIP') {
    summary = `Only ${passedRules.length}/${rules.length} criteria met. ${failedRules[0]?.detail || ''}`
  } else {
    summary = `${passedRules.length}/${rules.length} criteria met — marginal case. ${failedRules[0]?.detail || ''}`
  }

  return {
    verdict,
    confidence,
    score,
    rules,
    summary,
    bestService: 'PSA',
    bestTier: 'Regular',
  }
}
