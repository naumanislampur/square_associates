'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(2)}B`
  return `$${Number(n).toFixed(n < 10 ? 2 : 1)}M`
}

export function exportPdf(data) {
  const a = data.analysis
  const c = a.company
  const f = a.financials
  const m = a.multiples
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(5, 7, 11); doc.rect(0, 0, W, 70, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold')
  doc.text('SQUARE ASSOCIATES', 40, 32)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 200, 220)
  doc.text('Private Company Intelligence · Confidential Analyst Report', 40, 50)
  doc.setTextColor(0, 0, 0); doc.setFontSize(20); doc.setFont('helvetica', 'bold')
  doc.text(c.name, 40, 110)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(`${c.sector} · ${c.industry} · ${c.country} · Founded ${c.year_founded} · ${c.employees} employees`, 40, 128)
  doc.setFontSize(9); doc.setTextColor(80, 80, 80)
  const desc = doc.splitTextToSize(c.description || '', W - 80)
  doc.text(desc, 40, 148)
  let y = 148 + desc.length * 12 + 10

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value (USD M)', 'Type', 'Confidence', 'Sources']],
    body: Object.entries(f).filter(([k, v]) => v && typeof v === 'object' && 'value' in v).map(([k, v]) => [
      k.replace(/_/g, ' ').replace('usd m', '(USD M)'),
      fmt(v.value), v.type, `${v.confidence}%`, v.source_count,
    ]),
    theme: 'striped', headStyles: { fillColor: [16, 31, 51], textColor: 255 }, styles: { fontSize: 9 },
  })
  y = doc.lastAutoTable.finalY + 16

  autoTable(doc, {
    startY: y,
    head: [['Multiple', 'Value']],
    body: [
      ['EV / Revenue', `${m.ev_revenue?.toFixed?.(2) ?? '—'}x`],
      ['EV / EBITDA', `${m.ev_ebitda?.toFixed?.(2) ?? '—'}x`],
      ['Revenue Growth', `${m.revenue_growth_pct?.toFixed?.(1) ?? '—'}%`],
      ['EBITDA Margin', `${m.ebitda_margin_pct?.toFixed?.(1) ?? '—'}%`],
      ['Profit Margin', `${m.profit_margin_pct?.toFixed?.(1) ?? '—'}%`],
    ],
    theme: 'striped', headStyles: { fillColor: [16, 31, 51], textColor: 255 }, styles: { fontSize: 9 },
  })
  y = doc.lastAutoTable.finalY + 16

  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
  doc.text('Comparable Companies', 40, y); y += 8
  autoTable(doc, {
    startY: y,
    head: [['Company', 'Country', 'Revenue', 'EBITDA', 'EV', 'EV/Rev', 'EV/EBITDA']],
    body: (a.comparables || []).map(co => [co.name, co.country, fmt(co.revenue_usd_m), fmt(co.ebitda_usd_m), fmt(co.enterprise_value_usd_m), `${co.ev_revenue?.toFixed?.(2) ?? '—'}x`, `${co.ev_ebitda?.toFixed?.(2) ?? '—'}x`]),
    theme: 'striped', headStyles: { fillColor: [16, 31, 51], textColor: 255 }, styles: { fontSize: 8 },
  })

  doc.addPage()
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('Analyst Insights', 40, 50)
  let yy = 70
  const sections = [
    ['Investment Thesis', a.insights.investment_thesis],
    ['Valuation Commentary', a.insights.valuation_commentary],
    ['Growth Potential', a.insights.growth_potential],
    ['Industry Positioning', a.insights.industry_positioning],
    ['Key Risks', (a.insights.key_risks || []).map(r => '• ' + r).join('\n')],
    ['Catalysts', (a.insights.catalysts || []).map(r => '• ' + r).join('\n')],
    ['Comparable Analysis Summary', a.insights.comparable_analysis_summary],
  ]
  for (const [title, body] of sections) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text(title, 40, yy); yy += 14
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
    const lines = doc.splitTextToSize(body || '', W - 80)
    if (yy + lines.length * 11 > 800) { doc.addPage(); yy = 50 }
    doc.text(lines, 40, yy); yy += lines.length * 11 + 10
    doc.setTextColor(0, 0, 0)
  }

  doc.save(`${c.name.replace(/\s+/g, '_')}_SquareAssociates.pdf`)
}

export function exportExcel(data) {
  const a = data.analysis
  const c = a.company
  const f = a.financials
  const wb = XLSX.utils.book_new()

  const profile = [
    ['Field', 'Value'],
    ['Name', c.name], ['Website', c.website], ['HQ', c.headquarters],
    ['Country', c.country], ['Region', c.region], ['Continent', c.continent],
    ['Sector', c.sector], ['Industry', c.industry], ['Sub-Industry', c.sub_industry],
    ['Employees', c.employees], ['Year Founded', c.year_founded],
    ['Description', c.description], ['Overall Confidence', a.overall_confidence],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(profile), 'Profile')

  const fin = [['Metric', 'Value (USD M)', 'Type', 'Confidence %', 'Sources', 'Last Updated', 'Source Notes']]
  Object.entries(f).filter(([k, v]) => v && typeof v === 'object' && 'value' in v).forEach(([k, v]) => {
    fin.push([k, v.value, v.type, v.confidence, v.source_count, v.last_updated, v.source_notes])
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fin), 'Financials')

  const m = a.multiples
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Multiple', 'Value'], ['EV/Revenue', m.ev_revenue], ['EV/EBITDA', m.ev_ebitda],
    ['Revenue Growth %', m.revenue_growth_pct], ['EBITDA Margin %', m.ebitda_margin_pct], ['Profit Margin %', m.profit_margin_pct],
  ]), 'Multiples')

  const comps = [['Name', 'Country', 'Sector', 'Industry', 'Revenue (USD M)', 'EBITDA (USD M)', 'EV (USD M)', 'EV/Rev', 'EV/EBITDA', 'Employees', 'Rationale']]
  ;(a.comparables || []).forEach(co => comps.push([co.name, co.country, co.sector, co.industry, co.revenue_usd_m, co.ebitda_usd_m, co.enterprise_value_usd_m, co.ev_revenue, co.ev_ebitda, co.employees, co.rationale]))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(comps), 'Comparables')

  const ins = a.insights
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Section', 'Content'],
    ['Investment Thesis', ins.investment_thesis], ['Valuation Commentary', ins.valuation_commentary],
    ['Growth Potential', ins.growth_potential], ['Industry Positioning', ins.industry_positioning],
    ['Key Risks', (ins.key_risks || []).join(' | ')], ['Catalysts', (ins.catalysts || []).join(' | ')],
    ['Comparable Analysis Summary', ins.comparable_analysis_summary],
  ]), 'Insights')

  XLSX.writeFile(wb, `${c.name.replace(/\s+/g, '_')}_SquareAssociates.xlsx`)
}

export function exportCsv(data) {
  const a = data.analysis
  const rows = [['Section', 'Field', 'Value']]
  const c = a.company
  Object.entries(c).forEach(([k, v]) => rows.push(['Profile', k, v]))
  Object.entries(a.financials).filter(([k, v]) => v && typeof v === 'object' && 'value' in v).forEach(([k, v]) => {
    rows.push(['Financials', `${k} value`, v.value])
    rows.push(['Financials', `${k} type`, v.type])
    rows.push(['Financials', `${k} confidence`, v.confidence])
  })
  Object.entries(a.multiples).forEach(([k, v]) => rows.push(['Multiples', k, v]))
  ;(a.comparables || []).forEach((co, i) => Object.entries(co).forEach(([k, v]) => rows.push([`Comparable_${i + 1}`, k, v])))
  const csv = rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a2 = document.createElement('a')
  a2.href = url; a2.download = `${c.name.replace(/\s+/g, '_')}_SquareAssociates.csv`; a2.click()
  URL.revokeObjectURL(url)
}
