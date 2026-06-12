import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getLlmClient } from '@/lib/llm'
import { SYSTEM_PROMPT } from '@/lib/analysisPrompt'
import { DISCOVERY_SYSTEM_PROMPT } from '@/lib/discoveryPrompt'
import { signToken, getUserFromRequest } from '@/lib/auth'
import { researchCompany, researchDiscovery } from '@/lib/tavily'

export const maxDuration = 120

let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

function safeJsonParse(text) {
  if (!text) return null
  let s = text.trim()
  if (s.startsWith('```')) s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = s.indexOf('{'), end = s.lastIndexOf('}')
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1)
  try { return JSON.parse(s) } catch { return null }
}

async function runLlmJson(systemPrompt, userMsg, temperature = 0.4, maxTokens = 8000) {
  const llm = getLlmClient()
  const completion = await llm.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMsg },
    ],
    response_format: { type: 'json_object' },
    temperature,
    max_tokens: maxTokens,
  })
  const raw = completion.choices?.[0]?.message?.content || ''
  const fr = completion.choices?.[0]?.finish_reason
  if (fr !== 'stop') console.warn('LLM finish_reason:', fr, 'usage:', completion.usage)
  const parsed = safeJsonParse(raw)
  if (!parsed) throw new Error('Failed to parse LLM JSON output')
  return parsed
}

function setAuthCookie(response, token) {
  response.headers.append('Set-Cookie', `sa_token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`)
  return response
}

async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'Square Associates Intelligence API' }))
    }

    // ===== AUTH =====
    if (route === '/auth/signup' && method === 'POST') {
      const { email, password, name } = await request.json()
      if (!email || !password) return handleCORS(NextResponse.json({ error: 'email & password required' }, { status: 400 }))
      const existing = await db.collection('users').findOne({ email: email.toLowerCase() })
      if (existing) return handleCORS(NextResponse.json({ error: 'email already registered' }, { status: 409 }))
      const hash = await bcrypt.hash(password, 10)
      const user = { id: uuidv4(), email: email.toLowerCase(), name: name || email.split('@')[0], password_hash: hash, role: 'analyst', created_at: new Date() }
      await db.collection('users').insertOne(user)
      const token = await signToken({ id: user.id, email: user.email, role: user.role, name: user.name })
      const resp = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token })
      setAuthCookie(resp, token)
      return handleCORS(resp)
    }

    if (route === '/auth/login' && method === 'POST') {
      const { email, password } = await request.json()
      if (!email || !password) return handleCORS(NextResponse.json({ error: 'email & password required' }, { status: 400 }))
      const user = await db.collection('users').findOne({ email: email.toLowerCase() })
      if (!user) return handleCORS(NextResponse.json({ error: 'invalid credentials' }, { status: 401 }))
      const ok = await bcrypt.compare(password, user.password_hash)
      if (!ok) return handleCORS(NextResponse.json({ error: 'invalid credentials' }, { status: 401 }))
      const token = await signToken({ id: user.id, email: user.email, role: user.role, name: user.name })
      const resp = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token })
      setAuthCookie(resp, token)
      return handleCORS(resp)
    }

    if (route === '/auth/me' && method === 'GET') {
      const u = await getUserFromRequest(request)
      if (!u) return handleCORS(NextResponse.json({ user: null }))
      return handleCORS(NextResponse.json({ user: { id: u.id, email: u.email, name: u.name, role: u.role } }))
    }

    if (route === '/auth/logout' && method === 'POST') {
      const resp = NextResponse.json({ ok: true })
      resp.headers.append('Set-Cookie', `sa_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`)
      return handleCORS(resp)
    }

    // POST /api/analyze
    if (route === '/analyze' && method === 'POST') {
      const body = await request.json()
      const companyName = (body.company_name || '').trim()
      const context = body.context || ''
      const force = !!body.force
      const skipSearch = !!body.skip_search
      if (!companyName) return handleCORS(NextResponse.json({ error: 'company_name is required' }, { status: 400 }))

      const ctxHash = context ? '_' + Buffer.from(context).toString('base64').slice(0, 24) : ''
      const key = companyName.toLowerCase() + ctxHash
      const col = db.collection('analyses')
      if (!force) {
        const existing = await col.findOne({ key })
        if (existing) { const { _id, ...rest } = existing; return handleCORS(NextResponse.json({ ...rest, cached: true })) }
      }

      // === Tavily grounded research ===
      let research = { grounding: '', sources: [], hasGrounding: false }
      if (!skipSearch) {
        try { research = await researchCompany(companyName, context) } catch (e) { console.error('Tavily failed', e.message) }
      }

      const groundingBlock = research.hasGrounding
        ? `\n\nLIVE WEB RESEARCH (from Tavily — use as PRIMARY EVIDENCE for facts, financials, founding date, locations, funding rounds, valuations). Cite these in source_notes:\n${research.grounding}\n\nIMPORTANT: If the research above explicitly states financial figures, founding year, employee count, or funding rounds for THIS company, USE THOSE EXACT VALUES with type="actual" and confidence 85-95. Do NOT contradict the research.`
        : `\n\n(No live web research available — rely on prior knowledge and anti-hallucination rules.)`

      const userMsg = context
        ? `Company: ${companyName}\n\nUSER-PROVIDED CONTEXT (GROUND TRUTH — must be honored exactly):\n${context}${groundingBlock}\n\nProduce the full structured JSON analysis as specified. Honor BOTH the user context AND the web research as authoritative sources. CRITICAL: the "comparables" array MUST contain EXACTLY 10 real companies — do not return fewer.`
        : `Company: ${companyName}${groundingBlock}\n\nProduce the full structured JSON analysis as specified. CRITICAL: the "comparables" array MUST contain EXACTLY 10 real companies — do not return fewer.`

      const analysis = await runLlmJson(SYSTEM_PROMPT, userMsg)
      // attach sources to the analysis
      analysis._tavily_sources = research.sources
      const doc = { id: uuidv4(), key, company_name: companyName, context, analysis, created_at: new Date() }
      await col.updateOne({ key }, { $set: doc }, { upsert: true })
      return handleCORS(NextResponse.json({ ...doc, cached: false }))
    }

    // ===== DISCOVERY (Tavily grounded) =====
    if (route === '/discover' && method === 'POST') {
      const filters = await request.json()
      const key = 'disc_' + Buffer.from(JSON.stringify(filters)).toString('base64').slice(0, 80)
      const col = db.collection('discoveries')
      if (!filters.force) {
        const existing = await col.findOne({ key })
        if (existing) { const { _id, ...rest } = existing; return handleCORS(NextResponse.json({ ...rest, cached: true })) }
      }
      // Tavily-grounded discovery
      let research = { grounding: '', sources: [], hasGrounding: false }
      if (!filters.skip_search) {
        try { research = await researchDiscovery(filters) } catch (e) { console.error('Tavily discovery failed', e.message) }
      }
      const groundingBlock = research.hasGrounding
        ? `\n\nLIVE WEB RESEARCH (multi-source — use as PRIMARY SOURCE for real company names, locations, financials, founding years). Cite the Tavily source URLs in the source_url field for each company you return.\n${research.grounding}\n`
        : `\n\n(No live web research available — rely on prior knowledge.)`
      const prompt = `Filters:\n${JSON.stringify(filters, null, 2)}${groundingBlock}\n\nReturn 20 REAL matching private companies as specified, citing source_url from the research where possible.`
      const result = await runLlmJson(DISCOVERY_SYSTEM_PROMPT, prompt, 0.3)
      result._tavily_sources = research.sources
      const doc = { id: uuidv4(), key, filters, result, created_at: new Date() }
      await col.updateOne({ key }, { $set: doc }, { upsert: true })
      return handleCORS(NextResponse.json({ ...doc, cached: false }))
    }

    // ===== RECENT / DETAIL =====
    if (route === '/companies/recent' && method === 'GET') {
      const col = db.collection('analyses')
      const docs = await col.find({}).sort({ created_at: -1 }).limit(12).toArray()
      const items = docs.map(({ _id, analysis, ...rest }) => ({
        ...rest,
        company: analysis?.company,
        financials: {
          revenue_usd_m: analysis?.financials?.revenue_usd_m?.value ?? null,
          enterprise_value_usd_m: analysis?.financials?.enterprise_value_usd_m?.value ?? null,
          ebitda_usd_m: analysis?.financials?.ebitda_usd_m?.value ?? null,
        },
        overall_confidence: analysis?.overall_confidence ?? null,
      }))
      return handleCORS(NextResponse.json({ items }))
    }

    if (route.startsWith('/companies/') && method === 'GET') {
      const id = route.split('/')[2]
      const doc = await db.collection('analyses').findOne({ id })
      if (!doc) return handleCORS(NextResponse.json({ error: 'not found' }, { status: 404 }))
      const { _id, ...rest } = doc
      return handleCORS(NextResponse.json(rest))
    }

    // ===== DASHBOARD STATS =====
    if (route === '/dashboard/stats' && method === 'GET') {
      const col = db.collection('analyses')
      const docs = await col.find({}).limit(500).toArray()
      const all = docs.map(d => d.analysis).filter(Boolean)
      const bySector = {}, byCountry = {}, byContinent = {}, byIndustry = {}
      const evs = [], revenues = [], ebitdas = []
      const sectorMultiples = {}
      for (const a of all) {
        const c = a.company || {}
        const f = a.financials || {}
        const m = a.multiples || {}
        const rev = f.revenue_usd_m?.value || 0
        const ebitda = f.ebitda_usd_m?.value || 0
        const ev = f.enterprise_value_usd_m?.value || 0
        if (rev) revenues.push(rev)
        if (ebitda) ebitdas.push(ebitda)
        if (ev) evs.push(ev)
        const sec = c.sector || 'Unknown'
        bySector[sec] = bySector[sec] || { sector: sec, count: 0, total_rev: 0, total_ev: 0, total_ebitda: 0 }
        bySector[sec].count++; bySector[sec].total_rev += rev; bySector[sec].total_ev += ev; bySector[sec].total_ebitda += ebitda
        if (!sectorMultiples[sec]) sectorMultiples[sec] = { ev_rev: [], ev_ebitda: [] }
        if (m.ev_revenue) sectorMultiples[sec].ev_rev.push(m.ev_revenue)
        if (m.ev_ebitda) sectorMultiples[sec].ev_ebitda.push(m.ev_ebitda)
        const ctry = c.country || 'Unknown'
        byCountry[ctry] = byCountry[ctry] || { country: ctry, count: 0, total_rev: 0, total_ev: 0 }
        byCountry[ctry].count++; byCountry[ctry].total_rev += rev; byCountry[ctry].total_ev += ev
        const cont = c.continent || 'Unknown'
        byContinent[cont] = byContinent[cont] || { continent: cont, count: 0, total_ev: 0 }
        byContinent[cont].count++; byContinent[cont].total_ev += ev
        const ind = c.industry || 'Unknown'
        byIndustry[ind] = byIndustry[ind] || { industry: ind, count: 0, total_ev: 0 }
        byIndustry[ind].count++; byIndustry[ind].total_ev += ev
      }
      const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0
      const sectors = Object.values(bySector).map(s => ({ ...s, avg_rev: s.total_rev/s.count, avg_ev: s.total_ev/s.count, avg_ebitda: s.total_ebitda/s.count, avg_ev_revenue: avg(sectorMultiples[s.sector].ev_rev), avg_ev_ebitda: avg(sectorMultiples[s.sector].ev_ebitda) })).sort((a,b)=>b.count-a.count)
      const countries = Object.values(byCountry).map(c => ({ ...c, avg_rev: c.total_rev/c.count, avg_ev: c.total_ev/c.count })).sort((a,b)=>b.count-a.count)
      const continents = Object.values(byContinent).map(c => ({ ...c, avg_ev: c.total_ev/c.count })).sort((a,b)=>b.count-a.count)
      const industries = Object.values(byIndustry).map(i => ({ ...i, avg_ev: i.total_ev/i.count })).sort((a,b)=>b.count-a.count)
      return handleCORS(NextResponse.json({
        totals: { companies: all.length, avg_revenue: avg(revenues), avg_ev: avg(evs), avg_ebitda: avg(ebitdas), total_ev: evs.reduce((a,b)=>a+b,0) },
        sectors, countries, continents, industries,
      }))
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
