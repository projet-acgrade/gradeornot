'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'

interface ExportPDFProps {
  analysis: {
    cardName: string
    game: string
    setName: string
    year: string
    rarity: string
    language: string
    version: string
    setNumber: string
    condition: {
      overall: string
      centering: string
      surfaces: string
      corners: string
      edges: string
    }
    estimatedPSAGrade: number
    gradeConfidence: number
    estimatedRawValue: number
    estimatedGradedValue: { PSA10: number; PSA9: number; PSA8: number }
    gradingRecommendation: string
    recommendationReason: string
    keyIssues: string[]
    priceSource: string
    criteriaScores: {
      centering: number
      surfaces: number
      corners: number
      edges: number
    }
  }
  gradingAnalysis: Record<string, {
    name: string
    logo: string
    bestTier: {
      name: string
      cost: number
      turnaround: string
      shippingTotal: number
      gradedValue: number
      profit: number
      roi: number
    }
  }>
  imagePreview: string
}

export default function ExportPDF({ analysis, gradingAnalysis, imagePreview }: ExportPDFProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const W = 210
      const margin = 16
      let y = margin

      // Couleurs
      const gold = [245, 183, 49] as [number, number, number]
      const dark = [17, 17, 19] as [number, number, number]
      const text = [232, 232, 236] as [number, number, number]
      const muted = [136, 136, 136] as [number, number, number]
      const green = [34, 197, 94] as [number, number, number]
      const red = [239, 68, 68] as [number, number, number]

      // Background
      doc.setFillColor(10, 10, 11)
      doc.rect(0, 0, W, 297, 'F')

      // Header
      doc.setFillColor(...dark)
      doc.rect(0, 0, W, 28, 'F')
      doc.setFillColor(...gold)
      doc.rect(margin, 10, 6, 6, 'F')
      doc.setTextColor(...gold)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('GRADEORNOT', margin + 10, 15)
      doc.setTextColor(...muted)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('ANALYSIS REPORT', margin + 10, 21)
      doc.setTextColor(...muted)
      doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), W - margin, 15, { align: 'right' })
      y = 38

      // Card image
      try {
        const img = new Image()
        img.src = imagePreview
        await new Promise(resolve => { img.onload = resolve })
        const imgW = 50
        const imgH = (img.height / img.width) * imgW
        doc.addImage(imagePreview, 'JPEG', margin, y, imgW, Math.min(imgH, 70))
      } catch { /* image skip */ }

      // Card info (à droite de l'image)
      const infoX = margin + 55
      doc.setTextColor(...gold)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(`${analysis.game.toUpperCase()} · ${analysis.rarity}`, infoX, y + 6)

      doc.setTextColor(...text)
      doc.setFontSize(18)
      doc.text(analysis.cardName, infoX, y + 14)

      doc.setTextColor(...muted)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const subInfo = [analysis.setName, analysis.setNumber, analysis.year, analysis.language, analysis.version].filter(Boolean).join(' · ')
      doc.text(subInfo, infoX, y + 20)

      // PSA Grade box
      doc.setFillColor(...dark)
      doc.roundedRect(infoX, y + 24, 60, 20, 2, 2, 'F')
      doc.setTextColor(...muted)
      doc.setFontSize(7)
      doc.text('EST. PSA GRADE', infoX + 4, y + 30)
      const gradeColor = analysis.estimatedPSAGrade >= 9 ? green : gold
      doc.setTextColor(...gradeColor)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(analysis.estimatedPSAGrade.toString(), infoX + 4, y + 41)
      doc.setTextColor(...muted)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(`Confidence: ${analysis.gradeConfidence}%`, infoX + 20, y + 41)

      y += 78

      // Verdict
      const verdictColor = analysis.gradingRecommendation === 'GRADE' ? green
        : analysis.gradingRecommendation === 'SKIP' ? red : gold
      const verdictLabel = analysis.gradingRecommendation === 'GRADE' ? 'GRADE IT'
        : analysis.gradingRecommendation === 'SKIP' ? 'SKIP IT' : 'BORDERLINE'

      doc.setFillColor(verdictColor[0], verdictColor[1], verdictColor[2], 0.1)
      doc.roundedRect(margin, y, W - margin * 2, 18, 2, 2, 'F')
      doc.setTextColor(...verdictColor)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(verdictLabel, margin + 6, y + 7)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const splitReason = doc.splitTextToSize(analysis.recommendationReason, W - margin * 2 - 50)
      doc.text(splitReason[0], margin + 6, y + 13)
      y += 24

      // Market values
      doc.setTextColor(...muted)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('MARKET VALUES', margin, y)
      y += 5

      const valueBoxes = [
        { label: 'RAW VALUE', value: `$${analysis.estimatedRawValue}` },
        { label: 'PSA 10', value: `$${analysis.estimatedGradedValue.PSA10}` },
        { label: 'PSA 9', value: `$${analysis.estimatedGradedValue.PSA9}` },
        { label: 'PSA 8', value: `$${analysis.estimatedGradedValue.PSA8}` },
      ]
      const boxW = (W - margin * 2 - 9) / 4
      valueBoxes.forEach((box, i) => {
        const x = margin + i * (boxW + 3)
        doc.setFillColor(...dark)
        doc.roundedRect(x, y, boxW, 14, 1, 1, 'F')
        doc.setTextColor(...muted)
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.text(box.label, x + boxW / 2, y + 4, { align: 'center' })
        doc.setTextColor(...text)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(box.value, x + boxW / 2, y + 11, { align: 'center' })
      })
      y += 20

      // Condition scores
      doc.setTextColor(...muted)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('CONDITION BREAKDOWN', margin, y)
      y += 5

      const criteria = [
        { label: 'Centering', score: analysis.criteriaScores.centering, weight: '40%' },
        { label: 'Surfaces', score: analysis.criteriaScores.surfaces, weight: '30%' },
        { label: 'Corners', score: analysis.criteriaScores.corners, weight: '20%' },
        { label: 'Edges', score: analysis.criteriaScores.edges, weight: '10%' },
      ]

      criteria.forEach(c => {
        const barColor = c.score >= 8.5 ? green : c.score >= 7 ? gold : red
        doc.setTextColor(...text)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`${c.label} (${c.weight})`, margin, y + 4)
        doc.setTextColor(...muted)
        doc.text(c.score.toFixed(1), W - margin, y + 4, { align: 'right' })
        doc.setFillColor(40, 40, 45)
        doc.roundedRect(margin + 55, y, W - margin * 2 - 65, 4, 1, 1, 'F')
        doc.setFillColor(...barColor)
        doc.roundedRect(margin + 55, y, (W - margin * 2 - 65) * (c.score / 10), 4, 1, 1, 'F')
        y += 8
      })
      y += 6

      // Grading services
      doc.setTextColor(...muted)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('GRADING SERVICES', margin, y)
      y += 5

      Object.values(gradingAnalysis).forEach(service => {
        const best = service.bestTier
        doc.setFillColor(...dark)
        doc.roundedRect(margin, y, W - margin * 2, 22, 2, 2, 'F')

        doc.setTextColor(...gold)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(service.logo, margin + 4, y + 8)

        doc.setTextColor(...text)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`${best.name} · ${best.turnaround}`, margin + 4, y + 14)

        const cols = [
          { label: 'Grading fee', val: `$${best.cost}` },
          { label: 'Shipping', val: `+$${best.shippingTotal}` },
          { label: 'Graded value', val: `$${best.gradedValue}` },
          { label: 'Net profit', val: `${best.profit >= 0 ? '+' : ''}$${best.profit}` },
          { label: 'ROI', val: `${best.roi}%` },
        ]
        cols.forEach((col, i) => {
          const cx = margin + 50 + i * 28
          doc.setTextColor(...muted)
          doc.setFontSize(6)
          doc.text(col.label, cx, y + 8)
          const valColor = col.label === 'Net profit' ? (best.profit >= 0 ? green : red) : text
          doc.setTextColor(...valColor)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.text(col.val, cx, y + 15)
          doc.setFont('helvetica', 'normal')
        })
        y += 26
      })

      // Key issues
      if (analysis.keyIssues && analysis.keyIssues.length > 0) {
        y += 4
        doc.setTextColor(239, 68, 68)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('KEY ISSUES: ' + analysis.keyIssues.join(' · '), margin, y)
        y += 8
      }

      // Footer
      doc.setFillColor(...dark)
      doc.rect(0, 282, W, 15, 'F')
      doc.setTextColor(...muted)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('Generated by GradeOrNot · gradeornot.vercel.app · Data source: ' + analysis.priceSource, margin, 290)
      doc.text('Prices are estimates. Always verify before sending to grading.', W - margin, 290, { align: 'right' })

      doc.save(`GradeOrNot_${analysis.cardName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF export error:', err)
    }
    setLoading(false)
  }

  return (
    <button onClick={handleExport} disabled={loading} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '12px 24px', borderRadius: 12,
      background: 'rgba(245,183,49,0.08)', border: '1px solid rgba(245,183,49,0.3)',
      color: '#F5B731', fontSize: 14, cursor: loading ? 'default' : 'pointer',
      fontFamily: 'var(--font-body)', fontWeight: 500, opacity: loading ? 0.7 : 1
    }}>
      <Download size={16} />
      {loading ? 'Generating PDF...' : 'Export PDF report'}
    </button>
  )
}
