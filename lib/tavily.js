// Tavily web search grounding for company intelligence
const TAVILY_URL = 'https://api.tavily.com/search'

async function tavilySearch({ query, maxResults = 5, depth = 'basic', includeDomains, days }) {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return null
  try {
    const body = {
      api_key: apiKey,
      query,
      search_depth: depth,
      max_results: maxResults,
      include_answer: true,
      include_raw_content: false,
    }
    if (includeDomains?.length) body.include_domains = includeDomains
    if (days) body.days = days
    const r = await fetch(TAVILY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) {
      console.error('Tavily error', r.status, await r.text())
      return null
    }
    return await r.json()
  } catch (e) {
    console.error('Tavily exception', e.message)
    return null
  }
}

/**
 * Multi-angle discovery research for filter-based company lists.
 * Returns grounded text + source list to inform a 20-company synthesis.
 */
export async function researchDiscovery(filters) {
  const geo = filters.country || filters.continent || 'global'
  const sector = filters.sector || ''
  const industry = filters.industry || ''
  const revBand = (filters.revenue_min !== undefined || filters.revenue_max !== undefined)
    ? `revenue ${filters.revenue_min ?? 0}M to ${filters.revenue_max ?? '1B+'}`
    : ''
  const stage = filters.stage ? `${filters.stage} stage` : ''

  const tag = (industry || sector || 'private').trim()

  const queries = [
    { tag: 'TOP', q: `top private ${tag} companies in ${geo} ${revBand} ${stage}`.replace(/\s+/g,' ').trim() },
    { tag: 'STARTUPS', q: `fast growing ${tag} startups ${geo} 2024 2025 ${stage}`.replace(/\s+/g,' ').trim() },
    { tag: 'FUNDED', q: `${tag} companies ${geo} funding round Series A Series B Series C valuation ${revBand}`.replace(/\s+/g,' ').trim() },
    { tag: 'LIST', q: `list of ${tag} companies ${geo} private not public`.replace(/\s+/g,' ').trim() },
  ]

  const settled = await Promise.allSettled(queries.map(({ q }) => tavilySearch({ query: q, maxResults: 8, depth: 'advanced' })))
  let grounding = ''
  const allSources = []
  settled.forEach((res, i) => {
    if (res.status !== 'fulfilled' || !res.value) return
    const { answer, results } = res.value
    grounding += `\n### ${queries[i].tag} — "${queries[i].q}"\n`
    if (answer) grounding += `Synthesized: ${answer}\n`
    ;(results || []).slice(0, 8).forEach((r, idx) => {
      grounding += `[${queries[i].tag}-${idx + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${(r.content || '').slice(0, 800)}\n\n`
      allSources.push({ tag: queries[i].tag, title: r.title, url: r.url, snippet: (r.content || '').slice(0, 240) })
    })
  })
  return { grounding: grounding.trim(), sources: allSources, hasGrounding: !!grounding.trim() }
}

/**
 * Multi-angle company research for a single named company.
 * Returns a synthesized text block of "grounding context" plus a flat source list.
 */
export async function researchCompany(companyName, userContext = '') {
  const ctxHint = userContext ? ` ${userContext.slice(0, 200)}` : ''
  const queries = [
    { tag: 'PROFILE', q: `${companyName} company profile headquarters founded employees industry${ctxHint}` },
    { tag: 'FINANCIALS', q: `${companyName} revenue EBITDA valuation funding round annual report` },
    { tag: 'NEWS', q: `${companyName} recent news 2024 2025 product growth competitors` },
    { tag: 'PEERS', q: `${companyName} competitors alternatives similar companies peers comparison` },
  ]
  const settled = await Promise.allSettled(queries.map(({ q }) => tavilySearch({ query: q, maxResults: 5, depth: 'basic' })))
  let grounding = ''
  const allSources = []
  settled.forEach((res, i) => {
    if (res.status !== 'fulfilled' || !res.value) return
    const { answer, results } = res.value
    grounding += `\n### ${queries[i].tag} SEARCH\n`
    if (answer) grounding += `Tavily synthesized answer: ${answer}\n`
    const snipLen = queries[i].tag === 'PEERS' ? 350 : 500
    ;(results || []).slice(0, 5).forEach((r, idx) => {
      grounding += `[${queries[i].tag}-${idx + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${(r.content || '').slice(0, snipLen)}\n\n`
      allSources.push({ tag: queries[i].tag, title: r.title, url: r.url, snippet: (r.content || '').slice(0, 240) })
    })
  })
  return { grounding: grounding.trim(), sources: allSources, hasGrounding: !!grounding.trim() }
}
