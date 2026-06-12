'use client'

import { useEffect, useState } from 'react'
import { Search, Sparkles, Globe2, TrendingUp, Building2, Loader2, Activity, BarChart3, Briefcase, Layers, ShieldCheck, Cpu, FileDown, FileSpreadsheet, FileText, LogIn, LogOut, User, Filter, PieChart as PieIcon, Map } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis, PieChart, Pie, Cell, Treemap } from 'recharts'
import { exportPdf, exportExcel, exportCsv } from '@/lib/exporters'

const SAMPLE_QUERIES = ['Razorpay', 'Stripe', 'Revolut', 'Canva', 'OpenAI', 'Notion', 'Plaid', 'Klarna', 'Databricks']
const CONTINENTS = ['Asia', 'Europe', 'North America', 'South America', 'Africa', 'Oceania']
const SECTORS = ['Technology','Financial Services','Healthcare','Industrials','Consumer Goods','Consumer Services','Energy','Real Estate','Telecommunications','Materials','Utilities','Transportation','Agriculture','Education','Media & Entertainment']
const COUNTRIES = ['United States','United Kingdom','Germany','France','Netherlands','Spain','Italy','Switzerland','Sweden','Ireland','India','China','Japan','South Korea','Singapore','Indonesia','Malaysia','Thailand','Vietnam','Philippines','UAE','Saudi Arabia','Israel','Australia','New Zealand','Canada','Mexico','Brazil','Argentina','Chile','South Africa','Nigeria','Kenya','Egypt']
const INDUSTRIES_BY_SECTOR = {
  'Technology': ['SaaS','Cybersecurity','AI / ML','Data Analytics','Cloud Computing','DevTools','EdTech','Gaming','Hardware','Semiconductors','Robotics','SpaceTech'],
  'Financial Services': ['FinTech','Payments','Lending','Wealth Management','Asset Management','Insurance','InsurTech','RegTech','Crypto','Neobank'],
  'Healthcare': ['Biotechnology','Medical Devices','HealthTech','Diagnostics','Pharma','Digital Health','Telemedicine'],
  'Industrials': ['Manufacturing','Aerospace','Defense','Logistics','Construction','3D Printing'],
  'Consumer Goods': ['D2C','Apparel','F&B','Beauty','Home Goods','Pet'],
  'Consumer Services': ['E-commerce','Travel','Hospitality','Restaurants','Marketplaces'],
  'Energy': ['Renewables','Solar','Wind','Battery','Hydrogen','Oil & Gas'],
  'Real Estate': ['PropTech','REIT','Co-working','Residential','Commercial'],
  'Telecommunications': ['5G','Network Infrastructure','VOIP','Satellite'],
  'Materials': ['Chemicals','Mining','Metals','Advanced Materials'],
  'Utilities': ['Water','Power','Waste','Grid'],
  'Transportation': ['Mobility','Logistics','Autonomous Vehicles','Last-mile','Aviation'],
  'Agriculture': ['AgTech','Vertical Farming','Food Production','Aquaculture'],
  'Education': ['EdTech','K-12','Higher-Ed','Skills','Tutoring'],
  'Media & Entertainment': ['Streaming','Gaming','Music','Sports','Publishing','Creator Economy'],
}
const PIE_COLORS = ['#34d399','#38bdf8','#a78bfa','#f472b6','#facc15','#fb7185','#22d3ee','#fbbf24','#818cf8','#4ade80','#f87171','#60a5fa']

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(2)}B`
  return `$${Number(n).toFixed(n < 10 ? 2 : 1)}M`
}
function fmtPct(n) { if (n===null||n===undefined||isNaN(n)) return '—'; return `${Number(n).toFixed(1)}%` }
function fmtNum(n) { if (n===null||n===undefined||isNaN(n)) return '—'; if (Math.abs(n)>=1000) return `${(n/1000).toFixed(1)}k`; return `${n}` }

function TypeChip({ type }) {
  const map = { actual:'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', derived:'bg-sky-500/15 text-sky-300 border-sky-500/30', ai_estimated:'bg-amber-500/15 text-amber-300 border-amber-500/30' }
  const label = { actual:'Actual', derived:'Derived', ai_estimated:'AI Estimate' }[type] || type
  return <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${map[type] || 'bg-slate-700/40 text-slate-300 border-slate-600'}`}>{label}</span>
}

function MetricCard({ label, m }) {
  if (!m) return null
  return (
    <div className="rounded-lg border border-slate-800 bg-gradient-to-b from-slate-900/60 to-slate-950/60 p-4">
      <div className="flex items-center justify-between"><div className="text-xs uppercase tracking-wider text-slate-400">{label}</div><TypeChip type={m.type} /></div>
      <div className="mt-2 text-2xl font-semibold text-slate-100 font-mono">{fmt(m.value)}</div>
      <div className="mt-3 flex items-center gap-2"><Progress value={m.confidence || 0} className="h-1" /><span className="text-[10px] text-slate-400 font-mono w-8 text-right">{m.confidence || 0}%</span></div>
      <div className="mt-2 text-[10px] text-slate-500">{m.source_count || 0} sources · Updated {m.last_updated || '—'}</div>
    </div>
  )
}

function Header({ view, setView, user, onAuthClick, onLogout }) {
  const navs = [
    { id: 'home', label: 'Search' },
    { id: 'discovery', label: 'Discovery' },
    { id: 'dashboards', label: 'Dashboards' },
  ]
  return (
    <header className="border-b border-slate-800/70 bg-[#05070b]/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3 gap-4">
        <button onClick={()=>setView('home')} className="flex items-center gap-2 text-slate-100 shrink-0">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-emerald-400 via-teal-400 to-sky-500 grid place-items-center text-[#05070b] font-black">S</div>
          <div className="leading-tight text-left">
            <div className="font-semibold tracking-tight">Square Associates</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Intelligence Terminal</div>
          </div>
        </button>
        <nav className="hidden md:flex items-center gap-1">
          {navs.map(n => (
            <button key={n.id} onClick={()=>setView(n.id)} className={`px-3 py-1.5 rounded-md text-sm transition ${view===n.id ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'}`}>{n.label}</button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1 text-xs text-slate-300"><User className="w-3.5 h-3.5" />{user.name}</div>
              <Button size="sm" variant="ghost" onClick={onLogout} className="text-slate-400 hover:text-slate-100"><LogOut className="w-3.5 h-3.5" /></Button>
            </div>
          ) : (
            <Button size="sm" onClick={onAuthClick} variant="outline" className="border-slate-700 text-slate-200 bg-transparent hover:bg-slate-800"><LogIn className="w-3.5 h-3.5 mr-1.5" />Sign In</Button>
          )}
        </div>
      </div>
    </header>
  )
}

function FilterPill({ label, value, onClear, children }) {
  const active = value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${active ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-500'}`}>
          <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
          {active ? <span className="font-medium">{Array.isArray(value) ? value.join(' · ') : value}</span> : <span className="text-slate-500">any</span>}
          {active && <span onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); onClear() }} className="ml-1 text-slate-400 hover:text-red-400 cursor-pointer">×</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="bg-slate-950 border-slate-800 text-slate-100 w-72" align="start">
        {children}
      </PopoverContent>
    </Popover>
  )
}

function Hero({ query, setQuery, ctx, setCtx, showCtx, setShowCtx, filters, setFilters, onAnalyze, loading, featured }) {
  const setF = (k, v) => setFilters({ ...filters, [k]: v })
  const clearF = (k) => { const c = { ...filters }; delete c[k]; setFilters(c) }
  const industries = filters.sector ? (INDUSTRIES_BY_SECTOR[filters.sector] || []) : []
  const revRange = (filters.revenue_min !== undefined || filters.revenue_max !== undefined)
    ? `$${filters.revenue_min ?? 0}M – $${filters.revenue_max ?? '∞'}M`
    : null
  const activeCount = Object.keys(filters).filter(k => filters[k] !== '' && filters[k] !== null && filters[k] !== undefined).length
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-30" style={{backgroundImage:'radial-gradient(ellipse at top, rgba(16,185,129,0.18), transparent 60%), radial-gradient(ellipse at bottom right, rgba(56,189,248,0.18), transparent 60%)'}}/>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="inline-flex w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          GPT-4o powered · Real-time AI valuation · Global private company coverage
        </div>
        <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          The intelligence platform <br />
          <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">for private companies.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-slate-400 text-lg">Search any private company globally. Get AI-estimated revenue, EBITDA, enterprise value, valuation multiples, comparable companies and analyst-grade insights — with confidence scoring on every metric.</p>
        <form onSubmit={(e)=>{e.preventDefault(); onAnalyze(query, { context: ctx, filters })}} className="mt-8 max-w-3xl">
          <div className="flex items-stretch gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-2 focus-within:border-emerald-400/60 focus-within:shadow-[0_0_0_4px_rgba(16,185,129,0.08)] transition">
            <Search className="w-5 h-5 text-slate-400 self-center ml-2" />
            <Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search any private company — e.g. Razorpay, Canva, Notion" className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base text-slate-100 placeholder:text-slate-500" />
            <Button type="submit" disabled={loading || !query.trim()} className="bg-emerald-500 text-slate-900 hover:bg-emerald-400 font-semibold px-6">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing</> : <><Sparkles className="w-4 h-4 mr-2" />Run AI Valuation</>}
            </Button>
          </div>

          {/* Inline filter pills */}
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1"><Filter className="w-3 h-3" />Filters</span>

            <FilterPill label="Continent" value={filters.continent} onClear={()=>clearF('continent')}>
              <div className="space-y-1 max-h-72 overflow-auto">
                {CONTINENTS.map(c => (<button key={c} type="button" onClick={()=>setF('continent', c)} className={`block w-full text-left px-2 py-1.5 rounded text-sm hover:bg-slate-800 ${filters.continent===c?'bg-emerald-500/10 text-emerald-200':''}`}>{c}</button>))}
              </div>
            </FilterPill>

            <FilterPill label="Country" value={filters.country} onClear={()=>clearF('country')}>
              <Input placeholder="Type country" value={filters.country || ''} onChange={e=>setF('country', e.target.value)} className="bg-slate-900 border-slate-700 mb-2 text-sm" />
              <div className="space-y-0.5 max-h-56 overflow-auto">
                {COUNTRIES.filter(c => !filters.country || c.toLowerCase().includes(filters.country.toLowerCase())).slice(0,20).map(c => (<button key={c} type="button" onClick={()=>setF('country', c)} className={`block w-full text-left px-2 py-1 rounded text-sm hover:bg-slate-800 ${filters.country===c?'bg-emerald-500/10 text-emerald-200':''}`}>{c}</button>))}
              </div>
            </FilterPill>

            <FilterPill label="Sector" value={filters.sector} onClear={()=>{ const c={...filters}; delete c.sector; delete c.industry; setFilters(c) }}>
              <div className="space-y-0.5 max-h-72 overflow-auto">
                {SECTORS.map(s => (<button key={s} type="button" onClick={()=>setFilters({...filters, sector:s, industry: undefined})} className={`block w-full text-left px-2 py-1.5 rounded text-sm hover:bg-slate-800 ${filters.sector===s?'bg-emerald-500/10 text-emerald-200':''}`}>{s}</button>))}
              </div>
            </FilterPill>

            <FilterPill label="Industry" value={filters.industry} onClear={()=>clearF('industry')}>
              {!filters.sector ? (
                <div className="text-xs text-slate-400">Pick a Sector first to see industries.</div>
              ) : (
                <>
                  <Input placeholder="Type or pick" value={filters.industry || ''} onChange={e=>setF('industry', e.target.value)} className="bg-slate-900 border-slate-700 mb-2 text-sm" />
                  <div className="space-y-0.5 max-h-56 overflow-auto">
                    {industries.filter(i => !filters.industry || i.toLowerCase().includes(filters.industry.toLowerCase())).map(i => (<button key={i} type="button" onClick={()=>setF('industry', i)} className={`block w-full text-left px-2 py-1 rounded text-sm hover:bg-slate-800 ${filters.industry===i?'bg-emerald-500/10 text-emerald-200':''}`}>{i}</button>))}
                  </div>
                </>
              )}
            </FilterPill>

            <FilterPill label="Revenue" value={revRange} onClear={()=>{ const c={...filters}; delete c.revenue_min; delete c.revenue_max; setFilters(c) }}>
              <div className="space-y-2">
                <div><label className="text-[10px] uppercase tracking-wider text-slate-400">Min (USD M)</label><Input type="number" value={filters.revenue_min ?? ''} onChange={e=>setF('revenue_min', e.target.value === '' ? undefined : Number(e.target.value))} className="bg-slate-900 border-slate-700 mt-1" /></div>
                <div><label className="text-[10px] uppercase tracking-wider text-slate-400">Max (USD M)</label><Input type="number" value={filters.revenue_max ?? ''} onChange={e=>setF('revenue_max', e.target.value === '' ? undefined : Number(e.target.value))} className="bg-slate-900 border-slate-700 mt-1" /></div>
                <div className="flex gap-1 flex-wrap pt-1">
                  {[['<1M',0,1],['1-10M',1,10],['10-50M',10,50],['50-200M',50,200],['200M-1B',200,1000],['1B+',1000,undefined]].map(([l,mn,mx])=>(
                    <button key={l} type="button" onClick={()=>setFilters({...filters, revenue_min:mn, revenue_max:mx})} className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">{l}</button>
                  ))}
                </div>
              </div>
            </FilterPill>

            <FilterPill label="Stage" value={filters.stage} onClear={()=>clearF('stage')}>
              <div className="space-y-0.5">
                {['Pre-seed','Seed','Series A','Series B','Series C','Series D+','Growth','Pre-IPO','Bootstrapped'].map(s => (<button key={s} type="button" onClick={()=>setF('stage', s)} className={`block w-full text-left px-2 py-1.5 rounded text-sm hover:bg-slate-800 ${filters.stage===s?'bg-emerald-500/10 text-emerald-200':''}`}>{s}</button>))}
              </div>
            </FilterPill>

            <FilterPill label="Employees" value={filters.employees} onClear={()=>clearF('employees')}>
              <div className="space-y-0.5">
                {['1-10','11-50','51-200','201-500','501-1000','1000-5000','5000+'].map(e => (<button key={e} type="button" onClick={()=>setF('employees', e)} className={`block w-full text-left px-2 py-1.5 rounded text-sm hover:bg-slate-800 ${filters.employees===e?'bg-emerald-500/10 text-emerald-200':''}`}>{e}</button>))}
              </div>
            </FilterPill>

            {activeCount > 0 && (
              <button type="button" onClick={()=>setFilters({})} className="text-[11px] text-slate-400 hover:text-red-300 underline underline-offset-2 ml-1">Clear all</button>
            )}
          </div>

          <div className="mt-3">
            <button type="button" onClick={()=>setShowCtx(!showCtx)} className="text-xs text-slate-400 hover:text-emerald-300">
              {showCtx ? '− Hide' : '+ Add'} extra context (recommended for small / new / regional companies)
            </button>
          </div>
          {showCtx && (
            <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <label className="text-[11px] uppercase tracking-wider text-slate-400">Additional Context — treated as GROUND TRUTH</label>
              <textarea value={ctx} onChange={e=>setCtx(e.target.value)} rows={4} placeholder={"e.g.\nFounded: March 2025\nAnnual Revenue: ₹12 lakh (~$15k)\nProduct: AI-powered logistics platform for SMBs in Mumbai"} className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-md p-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/60" />
              <p className="mt-1 text-[10px] text-slate-500">The more facts you provide, the more accurate the report.</p>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
            <span>Try:</span>
            {SAMPLE_QUERIES.map(s => (<button key={s} type="button" onClick={()=>{ setQuery(s); onAnalyze(s) }} className="hover:text-emerald-300 hover:border-emerald-400/40 border border-slate-700 rounded-full px-3 py-1 transition">{s}</button>))}
          </div>
        </form>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{icon:Cpu,label:'AI Valuation Engine',sub:'GPT-4o multi-source synthesis'},{icon:Layers,label:'Comparable Co. Analysis',sub:'10+ peer benchmarks'},{icon:BarChart3,label:'Confidence Scoring',sub:'Actual · Derived · AI'},{icon:Briefcase,label:'M&A / PE / VC Ready',sub:'Institutional grade output'}].map(({icon:Icon,label,sub}) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <Icon className="w-5 h-5 text-emerald-300" />
              <div className="mt-3 text-sm font-medium text-slate-100">{label}</div>
              <div className="text-xs text-slate-400">{sub}</div>
            </div>
          ))}
        </div>
        {featured.length > 0 && (
          <div className="mt-14">
            <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2 text-slate-300"><TrendingUp className="w-4 h-4 text-emerald-300" /><span className="font-medium">Recent intelligence</span></div><span className="text-xs text-slate-500 font-mono">{featured.length} companies</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {featured.slice(0,6).map((c) => (
                <button key={c.id} onClick={()=>onAnalyze(c.company_name)} className="text-left rounded-xl border border-slate-800 bg-slate-900/40 hover:border-emerald-500/40 hover:bg-slate-900/70 transition p-4 group">
                  <div className="flex items-start justify-between"><div><div className="font-semibold text-slate-100 group-hover:text-emerald-300">{c.company?.name || c.company_name}</div><div className="text-xs text-slate-400 mt-0.5">{c.company?.country} · {c.company?.industry}</div></div><Badge variant="outline" className="border-slate-700 text-slate-300">{c.overall_confidence}%</Badge></div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]"><div><div className="text-slate-500">Revenue</div><div className="text-slate-200 font-mono">{fmt(c.financials?.revenue_usd_m)}</div></div><div><div className="text-slate-500">EBITDA</div><div className="text-slate-200 font-mono">{fmt(c.financials?.ebitda_usd_m)}</div></div><div><div className="text-slate-500">EV</div><div className="text-slate-200 font-mono">{fmt(c.financials?.enterprise_value_usd_m)}</div></div></div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function ConfidenceGauge({ value }) {
  const v = Number(value || 0)
  const data = [{ name: 'c', value: v, fill: v > 70 ? '#34d399' : v > 50 ? '#60a5fa' : '#f59e0b' }]
  return (
    <div className="relative w-full h-44">
      <ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={210} endAngle={-30}><PolarAngleAxis type="number" domain={[0,100]} tick={false} /><RadialBar background={{ fill: 'rgba(148,163,184,0.12)' }} dataKey="value" cornerRadius={20} /></RadialBarChart></ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-4xl font-mono font-semibold text-slate-100">{v}</div><div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Overall Confidence</div></div></div>
    </div>
  )
}

function Report({ data, onBack, onReAnalyze, refreshing }) {
  if (!data) return null
  const a = data.analysis, c = a.company, f = a.financials, m = a.multiples, ins = a.insights, lfr = f?.last_funding_round
  const compChartData = (a.comparables || []).map(x => ({ name: x.name.length > 14 ? x.name.slice(0,12)+'…' : x.name, revenue: x.revenue_usd_m, ev: x.enterprise_value_usd_m, ebitda: x.ebitda_usd_m }))
  return (
    <section className="max-w-7xl mx-auto px-6 py-8">
      <button onClick={onBack} className="text-sm text-slate-400 hover:text-emerald-300 mb-4">← Back</button>
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">{c.name}</h2>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10">{c.sector}</Badge>
              <Badge variant="outline" className="border-sky-500/40 text-sky-300 bg-sky-500/10">{c.industry}</Badge>
              {c.sub_industry && <Badge variant="outline" className="border-slate-700 text-slate-300">{c.sub_industry}</Badge>}
              {data.cached && <Badge variant="outline" className="border-slate-700 text-slate-400">cached</Badge>}
            </div>
            <div className="mt-2 text-sm text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
              <span><Globe2 className="inline w-3.5 h-3.5 mr-1" />{c.headquarters}, {c.country} · {c.region} · {c.continent}</span>
              <span><Building2 className="inline w-3.5 h-3.5 mr-1" />{fmtNum(c.employees)} employees</span>
              <span>Founded {c.year_founded}</span>
              {c.website && <a className="text-emerald-300 hover:underline" href={c.website.startsWith('http')?c.website:`https://${c.website}`} target="_blank" rel="noreferrer">{c.website}</a>}
            </div>
            <p className="mt-4 max-w-3xl text-slate-300 leading-relaxed">{c.description}</p>
            {(ins.data_quality_warning && ins.data_quality_warning.trim()) || a.overall_confidence < 50 ? (
              <div className="mt-4 max-w-3xl rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200 text-sm flex gap-2">
                <span className="font-semibold shrink-0">⚠ Low confidence:</span>
                <span>{ins.data_quality_warning || 'Limited public data on this company. Estimates are AI-derived from industry benchmarks and have high uncertainty. Use the "Add known facts" field on the search page to supply ground-truth context and re-analyze.'}</span>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={()=>exportPdf(data)} className="border-slate-700 bg-transparent hover:bg-slate-800 text-slate-100"><FileText className="w-3.5 h-3.5 mr-1.5" />Export PDF</Button>
              <Button size="sm" variant="outline" onClick={()=>exportExcel(data)} className="border-slate-700 bg-transparent hover:bg-slate-800 text-slate-100"><FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />Export Excel</Button>
              <Button size="sm" variant="outline" onClick={()=>exportCsv(data)} className="border-slate-700 bg-transparent hover:bg-slate-800 text-slate-100"><FileDown className="w-3.5 h-3.5 mr-1.5" />Export CSV</Button>
            </div>
          </div>
          <div className="w-full md:w-72 shrink-0">
            <Card className="bg-slate-950/70 border-slate-800"><CardContent className="p-3"><ConfidenceGauge value={a.overall_confidence} /><Button variant="outline" size="sm" onClick={onReAnalyze} disabled={refreshing} className="w-full mt-2 border-slate-700 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/40 bg-transparent">{refreshing ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Re-analyzing</> : <><Sparkles className="w-3.5 h-3.5 mr-2" />Force Re-analyze</>}</Button></CardContent></Card>
          </div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Revenue" m={f.revenue_usd_m} />
        <MetricCard label="EBITDA" m={f.ebitda_usd_m} />
        <MetricCard label="Enterprise Value" m={f.enterprise_value_usd_m} />
        <MetricCard label="Est. Valuation" m={f.estimated_valuation_usd_m} />
        <MetricCard label="EBIT" m={f.ebit_usd_m} />
        <MetricCard label="Net Income" m={f.net_income_usd_m} />
        <MetricCard label="Funding Raised" m={f.funding_raised_usd_m} />
        <Card className="bg-gradient-to-b from-slate-900/60 to-slate-950/60 border-slate-800"><CardContent className="p-4"><div className="text-xs uppercase tracking-wider text-slate-400">Last Funding</div><div className="mt-1 text-lg font-semibold text-slate-100">{lfr?.round_type || '—'}</div><div className="text-xs text-slate-400">{lfr?.date}</div><div className="mt-1 font-mono text-slate-200">{fmt(lfr?.amount_usd_m)}</div><div className="mt-1 text-[10px] text-slate-500 truncate">{(lfr?.lead_investors||[]).join(', ')}</div></CardContent></Card>
      </div>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        {[['EV / Revenue', m.ev_revenue?.toFixed?.(2) ?? '—', 'x'],['EV / EBITDA', m.ev_ebitda?.toFixed?.(2) ?? '—', 'x'],['Revenue Growth', fmtPct(m.revenue_growth_pct), ''],['EBITDA Margin', fmtPct(m.ebitda_margin_pct), ''],['Profit Margin', fmtPct(m.profit_margin_pct), '']].map(([k,v,suf]) => (
          <div key={k} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"><div className="text-xs uppercase tracking-wider text-slate-400">{k}</div><div className="mt-1 text-2xl font-mono text-slate-100">{v}{suf}</div></div>
        ))}
      </div>
      <Tabs defaultValue="insights" className="mt-8">
        <TabsList className="bg-slate-900/60 border border-slate-800"><TabsTrigger value="insights">AI Insights</TabsTrigger><TabsTrigger value="comparables">Comparables</TabsTrigger><TabsTrigger value="charts">Charts</TabsTrigger><TabsTrigger value="sources">Sources</TabsTrigger></TabsList>
        <TabsContent value="insights" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {[['Investment Thesis',ins.investment_thesis],['Valuation Commentary',ins.valuation_commentary],['Growth Potential',ins.growth_potential],['Industry Positioning',ins.industry_positioning]].map(([t,b])=>(
              <Card key={t} className="bg-slate-900/40 border-slate-800"><CardHeader><CardTitle className="text-base text-slate-100">{t}</CardTitle></CardHeader><CardContent className="text-sm text-slate-300 leading-relaxed">{b}</CardContent></Card>
            ))}
            <Card className="bg-slate-900/40 border-slate-800"><CardHeader><CardTitle className="text-base text-slate-100">Key Risks</CardTitle></CardHeader><CardContent><ul className="text-sm text-slate-300 space-y-2 list-disc pl-5">{(ins.key_risks||[]).map((r,i)=>(<li key={i}>{r}</li>))}</ul></CardContent></Card>
            <Card className="bg-slate-900/40 border-slate-800"><CardHeader><CardTitle className="text-base text-slate-100">Catalysts</CardTitle></CardHeader><CardContent><ul className="text-sm text-slate-300 space-y-2 list-disc pl-5">{(ins.catalysts||[]).map((r,i)=>(<li key={i}>{r}</li>))}</ul></CardContent></Card>
          </div>
          <Card className="mt-4 bg-slate-900/40 border-slate-800"><CardHeader><CardTitle className="text-base text-slate-100">Comparable Analysis Summary</CardTitle></CardHeader><CardContent className="text-sm text-slate-300 leading-relaxed">{ins.comparable_analysis_summary}</CardContent></Card>
        </TabsContent>
        <TabsContent value="comparables" className="mt-4">
          <Card className="bg-slate-900/40 border-slate-800"><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Company</TableHead><TableHead className="text-slate-400">Country</TableHead><TableHead className="text-slate-400">Industry</TableHead><TableHead className="text-slate-400 text-right">Revenue</TableHead><TableHead className="text-slate-400 text-right">EBITDA</TableHead><TableHead className="text-slate-400 text-right">EV</TableHead><TableHead className="text-slate-400 text-right">EV/Rev</TableHead><TableHead className="text-slate-400 text-right">EV/EBITDA</TableHead><TableHead className="text-slate-400">Src</TableHead></TableRow></TableHeader>
              <TableBody>{(a.comparables||[]).map((co,i)=>(
                <TableRow key={i} className="border-slate-800 hover:bg-slate-900/60"><TableCell className="font-medium text-slate-100">{co.name}<div className="text-[10px] text-slate-500 max-w-[300px] truncate">{co.rationale}</div></TableCell><TableCell className="text-slate-300">{co.country}</TableCell><TableCell className="text-slate-300">{co.industry}</TableCell><TableCell className="text-right font-mono text-slate-200">{fmt(co.revenue_usd_m)}</TableCell><TableCell className="text-right font-mono text-slate-200">{fmt(co.ebitda_usd_m)}</TableCell><TableCell className="text-right font-mono text-slate-200">{fmt(co.enterprise_value_usd_m)}</TableCell><TableCell className="text-right font-mono text-emerald-300">{co.ev_revenue?.toFixed?.(2) ?? '—'}x</TableCell><TableCell className="text-right font-mono text-emerald-300">{co.ev_ebitda?.toFixed?.(2) ?? '—'}x</TableCell><TableCell>{co.source_url ? <a href={co.source_url} target="_blank" rel="noreferrer" className="text-emerald-300 text-xs hover:underline">↗</a> : '—'}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="charts" className="mt-4">
          <Card className="bg-slate-900/40 border-slate-800"><CardHeader><CardTitle className="text-base text-slate-100">Comparable Companies — Revenue vs EV vs EBITDA ($M)</CardTitle></CardHeader><CardContent><div className="w-full h-[380px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={compChartData}><CartesianGrid stroke="#1e293b" strokeDasharray="3 3" /><XAxis dataKey="name" tick={{fill:'#94a3b8', fontSize: 11}} interval={0} angle={-20} textAnchor="end" height={70} /><YAxis tick={{fill:'#94a3b8', fontSize: 11}} /><Tooltip contentStyle={{background:'#0b1220', border:'1px solid #1e293b', borderRadius:8}} labelStyle={{color:'#e2e8f0'}} /><Bar dataKey="revenue" fill="#34d399" radius={[4,4,0,0]} /><Bar dataKey="ev" fill="#38bdf8" radius={[4,4,0,0]} /><Bar dataKey="ebitda" fill="#a78bfa" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
        </TabsContent>
        <TabsContent value="sources" className="mt-4">
          {(a._tavily_sources && a._tavily_sources.length > 0) && (
            <Card className="bg-slate-900/40 border-slate-800 mb-4">
              <CardHeader><CardTitle className="text-base text-slate-100 flex items-center gap-2"><Globe2 className="w-4 h-4 text-emerald-300" />Live Web Sources <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 ml-2">Tavily · {a._tavily_sources.length} citations</Badge></CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400 w-24">Category</TableHead><TableHead className="text-slate-400">Source</TableHead><TableHead className="text-slate-400">Snippet</TableHead></TableRow></TableHeader>
                  <TableBody>{a._tavily_sources.map((s,i)=>(
                    <TableRow key={i} className="border-slate-800">
                      <TableCell><Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">{s.tag}</Badge></TableCell>
                      <TableCell className="text-slate-100"><a href={s.url} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">{s.title}</a><div className="text-[10px] text-slate-500 truncate max-w-md">{s.url}</div></TableCell>
                      <TableCell className="text-slate-400 text-xs max-w-md">{s.snippet}</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          <Card className="bg-slate-900/40 border-slate-800"><CardHeader><CardTitle className="text-base text-slate-100">Metric Provenance</CardTitle></CardHeader><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Metric</TableHead><TableHead className="text-slate-400">Type</TableHead><TableHead className="text-slate-400 text-right">Confidence</TableHead><TableHead className="text-slate-400 text-right">Sources</TableHead><TableHead className="text-slate-400">Last Updated</TableHead><TableHead className="text-slate-400">Reasoning / Source Notes</TableHead></TableRow></TableHeader>
              <TableBody>{Object.entries(f).filter(([k,v])=>v && typeof v==='object' && 'value' in v).map(([k,v])=>(
                <TableRow key={k} className="border-slate-800"><TableCell className="text-slate-100">{k.replace(/_/g,' ').replace('usd m','(USD M)')}</TableCell><TableCell><TypeChip type={v.type} /></TableCell><TableCell className="text-right font-mono text-slate-200">{v.confidence}%</TableCell><TableCell className="text-right font-mono text-slate-200">{v.source_count}</TableCell><TableCell className="text-slate-300">{v.last_updated}</TableCell><TableCell className="text-slate-400 text-xs max-w-md">{v.source_notes}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}

function DiscoveryView({ onSelectCompany }) {
  const [filters, setFilters] = useState({ continent: 'Asia', country: 'India', sector: 'Technology', industry: 'SaaS', revenue_min: 1, revenue_max: 50 })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function search(force = false) {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await fetch('/api/discover', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...filters, force }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Discovery failed')
      setResult({ ...j.result, cached: j.cached })
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 text-slate-300 mb-2"><Filter className="w-4 h-4 text-emerald-300" /><h2 className="text-2xl font-semibold tracking-tight">Discovery Engine</h2><Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 ml-2">Tavily-grounded</Badge></div>
      <p className="text-slate-400 text-sm max-w-3xl">Filter the global private-company universe. The engine runs 4 parallel web searches via Tavily, then AI extracts and ranks 20 verifiable real companies with linked source URLs.</p>
      <Card className="mt-6 bg-slate-900/40 border-slate-800">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-slate-400">Continent</label>
              <Select value={filters.continent} onValueChange={v=>setFilters({...filters,continent:v})}><SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100 mt-1"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-950 border-slate-700 text-slate-100">{CONTINENTS.map(c=>(<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select>
            </div>
            <div><label className="text-[11px] uppercase tracking-wider text-slate-400">Country (optional)</label><Input value={filters.country} onChange={e=>setFilters({...filters,country:e.target.value})} placeholder="e.g. India" className="bg-slate-950 border-slate-700 text-slate-100 mt-1" /></div>
            <div><label className="text-[11px] uppercase tracking-wider text-slate-400">Sector</label>
              <Select value={filters.sector} onValueChange={v=>setFilters({...filters,sector:v})}><SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100 mt-1"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-950 border-slate-700 text-slate-100 max-h-72">{SECTORS.map(s=>(<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select>
            </div>
            <div><label className="text-[11px] uppercase tracking-wider text-slate-400">Industry</label><Input value={filters.industry} onChange={e=>setFilters({...filters,industry:e.target.value})} placeholder="e.g. SaaS" className="bg-slate-950 border-slate-700 text-slate-100 mt-1" /></div>
            <div><label className="text-[11px] uppercase tracking-wider text-slate-400">Revenue Min ($M)</label><Input type="number" value={filters.revenue_min} onChange={e=>setFilters({...filters,revenue_min:Number(e.target.value)})} className="bg-slate-950 border-slate-700 text-slate-100 mt-1" /></div>
            <div><label className="text-[11px] uppercase tracking-wider text-slate-400">Revenue Max ($M)</label><Input type="number" value={filters.revenue_max} onChange={e=>setFilters({...filters,revenue_max:Number(e.target.value)})} className="bg-slate-950 border-slate-700 text-slate-100 mt-1" /></div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={()=>search(false)} disabled={loading} className="bg-emerald-500 text-slate-900 hover:bg-emerald-400 font-semibold">{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Discovering</> : <><Sparkles className="w-4 h-4 mr-2" />Run Discovery</>}</Button>
            <Button onClick={()=>search(true)} disabled={loading} variant="outline" className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">Force Refresh</Button>
          </div>
          {error && <div className="mt-3 text-sm text-red-300">{error}</div>}
        </CardContent>
      </Card>
      {loading && <Card className="mt-4 bg-slate-900/40 border-slate-800"><CardContent className="p-6 flex items-center gap-3 text-slate-300"><Loader2 className="w-5 h-5 animate-spin text-emerald-300" /><div><div className="font-medium">Running 4 parallel Tavily web searches + AI extraction…</div><div className="text-xs text-slate-400">Typically 25–45s for grounded discovery.</div></div></CardContent></Card>}
      {result?.companies && (
        <>
          <Card className="mt-6 bg-slate-900/40 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base text-slate-100">{result.companies.length} matching companies</CardTitle>
                <div className="flex items-center gap-2">
                  {result._tavily_sources?.length > 0 && <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10">Tavily · {result._tavily_sources.length} citations</Badge>}
                  {result.cached && <Badge variant="outline" className="border-slate-700 text-slate-400">cached</Badge>}
                </div>
              </div>
              {result.summary && <p className="text-sm text-slate-400 mt-2">{result.summary}</p>}
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Company</TableHead><TableHead className="text-slate-400">Country</TableHead><TableHead className="text-slate-400">Industry</TableHead><TableHead className="text-slate-400 text-right">Revenue</TableHead><TableHead className="text-slate-400 text-right">EBITDA</TableHead><TableHead className="text-slate-400 text-right">EV</TableHead><TableHead className="text-slate-400 text-right">EV/Rev</TableHead><TableHead className="text-slate-400 text-right">EV/EBITDA</TableHead><TableHead className="text-slate-400 text-right">Conf.</TableHead><TableHead className="text-slate-400">Source</TableHead></TableRow></TableHeader>
                <TableBody>
                  {result.companies.map((co,i)=>(
                    <TableRow key={i} className="border-slate-800 hover:bg-slate-900/60">
                      <TableCell className="font-medium">
                        <button onClick={()=>onSelectCompany(co.name)} className="text-slate-100 hover:text-emerald-300 text-left">{co.name}</button>
                        <div className="text-[10px] text-slate-500 max-w-[280px] truncate">{co.one_liner}</div>
                      </TableCell>
                      <TableCell className="text-slate-300">{co.country}</TableCell>
                      <TableCell className="text-slate-300">{co.industry}</TableCell>
                      <TableCell className="text-right font-mono text-slate-200">{fmt(co.revenue_usd_m)}</TableCell>
                      <TableCell className="text-right font-mono text-slate-200">{fmt(co.ebitda_usd_m)}</TableCell>
                      <TableCell className="text-right font-mono text-slate-200">{fmt(co.enterprise_value_usd_m)}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-300">{co.ev_revenue?.toFixed?.(2) ?? '—'}x</TableCell>
                      <TableCell className="text-right font-mono text-emerald-300">{co.ev_ebitda?.toFixed?.(2) ?? '—'}x</TableCell>
                      <TableCell className="text-right text-slate-400">{co.confidence}%</TableCell>
                      <TableCell>{co.source_url ? <a href={co.source_url} target="_blank" rel="noreferrer" className="text-emerald-300 text-xs hover:underline">↗</a> : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {result._tavily_sources?.length > 0 && (
            <Card className="mt-4 bg-slate-900/40 border-slate-800">
              <CardHeader><CardTitle className="text-base text-slate-100 flex items-center gap-2"><Globe2 className="w-4 h-4 text-emerald-300" />Live Web Sources Used</CardTitle></CardHeader>
              <CardContent className="p-0 max-h-72 overflow-auto">
                <Table>
                  <TableBody>{result._tavily_sources.slice(0,30).map((s,i)=>(
                    <TableRow key={i} className="border-slate-800">
                      <TableCell className="w-20"><Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">{s.tag}</Badge></TableCell>
                      <TableCell><a href={s.url} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline text-sm">{s.title}</a><div className="text-[10px] text-slate-500 truncate">{s.snippet}</div></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  )
}

function DashboardsView() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(()=>{ (async()=>{ try { const r=await fetch('/api/dashboard/stats'); const j=await r.json(); setStats(j) } finally { setLoading(false) } })() }, [])

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-16 text-slate-400 flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Loading dashboards…</div>
  if (!stats || !stats.totals?.companies) return <div className="max-w-7xl mx-auto px-6 py-16 text-slate-400">No data yet — run some company analyses first to populate dashboards.</div>

  const sectorPie = (stats.sectors || []).map(s=>({ name: s.sector, value: s.count }))
  const countryBar = (stats.countries || []).slice(0,10).map(c=>({ name: c.country, count: c.count, avg_ev: c.avg_ev }))
  const industryTree = (stats.industries || []).slice(0,12).map(i=>({ name: i.industry, size: i.count, ev: i.avg_ev }))

  return (
    <section className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 text-slate-300 mb-2"><PieIcon className="w-4 h-4 text-emerald-300" /><h2 className="text-2xl font-semibold tracking-tight">Executive Dashboards</h2></div>
      <p className="text-slate-400 text-sm">Aggregate intelligence across all analyzed private companies.</p>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Companies', stats.totals.companies, ''],['Avg Revenue', fmt(stats.totals.avg_revenue), ''],['Avg EV', fmt(stats.totals.avg_ev), ''],['Total EV', fmt(stats.totals.total_ev), '']].map(([l,v])=>(
          <div key={l} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"><div className="text-xs uppercase tracking-wider text-slate-400">{l}</div><div className="mt-1 text-2xl font-mono text-slate-100">{v}</div></div>
        ))}
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/40 border-slate-800"><CardHeader><CardTitle className="text-base text-slate-100">Sector Distribution</CardTitle></CardHeader><CardContent>
          <div className="w-full h-[300px]"><ResponsiveContainer><PieChart><Pie data={sectorPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={2}>{sectorPie.map((_,i)=>(<Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />))}</Pie><Tooltip contentStyle={{background:'#0b1220', border:'1px solid #1e293b', borderRadius:8}} /></PieChart></ResponsiveContainer></div>
        </CardContent></Card>
        <Card className="bg-slate-900/40 border-slate-800"><CardHeader><CardTitle className="text-base text-slate-100">Top Countries by Coverage</CardTitle></CardHeader><CardContent>
          <div className="w-full h-[300px]"><ResponsiveContainer><BarChart data={countryBar}><CartesianGrid stroke="#1e293b" strokeDasharray="3 3" /><XAxis dataKey="name" tick={{fill:'#94a3b8', fontSize:11}} angle={-25} textAnchor="end" height={60} interval={0} /><YAxis tick={{fill:'#94a3b8', fontSize:11}} /><Tooltip contentStyle={{background:'#0b1220', border:'1px solid #1e293b', borderRadius:8}} /><Bar dataKey="count" fill="#38bdf8" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
        </CardContent></Card>
      </div>

      <Card className="mt-4 bg-slate-900/40 border-slate-800"><CardHeader><CardTitle className="text-base text-slate-100">Industry Treemap (by company count, color = avg EV)</CardTitle></CardHeader><CardContent>
        <div className="w-full h-[340px]"><ResponsiveContainer><Treemap data={industryTree} dataKey="size" nameKey="name" stroke="#0b1220" fill="#34d399" content={<CustomTreemap />} /></ResponsiveContainer></div>
      </CardContent></Card>

      <Card className="mt-4 bg-slate-900/40 border-slate-800"><CardHeader><CardTitle className="text-base text-slate-100">Sector-Level Multiples & Averages</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-slate-400">Sector</TableHead><TableHead className="text-slate-400 text-right">Companies</TableHead><TableHead className="text-slate-400 text-right">Avg Rev</TableHead><TableHead className="text-slate-400 text-right">Avg EBITDA</TableHead><TableHead className="text-slate-400 text-right">Avg EV</TableHead><TableHead className="text-slate-400 text-right">Avg EV/Rev</TableHead><TableHead className="text-slate-400 text-right">Avg EV/EBITDA</TableHead></TableRow></TableHeader>
            <TableBody>{(stats.sectors||[]).map((s,i)=>(
              <TableRow key={i} className="border-slate-800"><TableCell className="text-slate-100">{s.sector}</TableCell><TableCell className="text-right font-mono text-slate-200">{s.count}</TableCell><TableCell className="text-right font-mono text-slate-200">{fmt(s.avg_rev)}</TableCell><TableCell className="text-right font-mono text-slate-200">{fmt(s.avg_ebitda)}</TableCell><TableCell className="text-right font-mono text-slate-200">{fmt(s.avg_ev)}</TableCell><TableCell className="text-right font-mono text-emerald-300">{s.avg_ev_revenue?.toFixed?.(2) ?? '—'}x</TableCell><TableCell className="text-right font-mono text-emerald-300">{s.avg_ev_ebitda?.toFixed?.(2) ?? '—'}x</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}

const CustomTreemap = (props) => {
  const { x, y, width, height, name, ev } = props
  if (width < 1 || height < 1) return null
  const colors = ['#0f766e','#0e7490','#1d4ed8','#7c3aed','#be185d','#b45309','#15803d']
  const fill = colors[Math.floor(((ev||0)/2000) % colors.length)]
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#0b1220" />
      {width > 50 && height > 20 && (<text x={x+6} y={y+18} fill="#e2e8f0" fontSize={11}>{name}</text>)}
    </g>
  )
}

function AuthDialog({ open, setOpen, onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const body = mode === 'login' ? { email, password } : { email, password, name }
      const r = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Failed')
      onAuth(j.user); setOpen(false)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-md">
        <DialogHeader><DialogTitle>{mode==='login' ? 'Sign In' : 'Create Account'} — Square Associates</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 mt-2">
          {mode==='signup' && <Input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} className="bg-slate-900 border-slate-700" />}
          <Input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="bg-slate-900 border-slate-700" />
          <Input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="bg-slate-900 border-slate-700" />
          {err && <div className="text-sm text-red-300">{err}</div>}
          <Button type="submit" disabled={busy} className="w-full bg-emerald-500 text-slate-900 hover:bg-emerald-400 font-semibold">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode==='login' ? 'Sign In' : 'Create Account')}</Button>
          <button type="button" onClick={()=>setMode(mode==='login'?'signup':'login')} className="text-sm text-slate-400 hover:text-emerald-300 w-full text-center">{mode==='login' ? 'No account? Sign up' : 'Have an account? Sign in'}</button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function App() {
  const [view, setView] = useState('home')
  const [query, setQuery] = useState('')
  const [ctx, setCtx] = useState('')
  const [showCtx, setShowCtx] = useState(false)
  const [filters, setFilters] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [featured, setFeatured] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)

  async function loadFeatured() { try { const r=await fetch('/api/companies/recent'); const j=await r.json(); setFeatured(j.items||[]) } catch {} }
  async function loadMe() { try { const r=await fetch('/api/auth/me'); const j=await r.json(); setUser(j.user) } catch {} }
  useEffect(() => { loadFeatured(); loadMe() }, [])

  async function analyze(name, opts = {}) {
    if (!name?.trim()) return
    setError(''); setView('home')
    if (opts.force) setRefreshing(true); else setLoading(true)
    try {
      // Merge filters into context as ground truth
      const filtersToUse = opts.filters !== undefined ? opts.filters : filters
      const filterLines = []
      if (filtersToUse?.continent) filterLines.push(`Continent: ${filtersToUse.continent}`)
      if (filtersToUse?.country) filterLines.push(`Country: ${filtersToUse.country}`)
      if (filtersToUse?.sector) filterLines.push(`Sector: ${filtersToUse.sector}`)
      if (filtersToUse?.industry) filterLines.push(`Industry: ${filtersToUse.industry}`)
      if (filtersToUse?.revenue_min !== undefined || filtersToUse?.revenue_max !== undefined) filterLines.push(`Revenue Range: $${filtersToUse.revenue_min ?? 0}M – $${filtersToUse.revenue_max ?? '∞'}M`)
      if (filtersToUse?.stage) filterLines.push(`Funding Stage: ${filtersToUse.stage}`)
      if (filtersToUse?.employees) filterLines.push(`Employee Range: ${filtersToUse.employees}`)
      const filterCtx = filterLines.length ? `Filter hints (user-asserted attributes — honor these):\n${filterLines.join('\n')}` : ''
      const baseCtx = opts.context !== undefined ? opts.context : (name.trim().toLowerCase() === query.trim().toLowerCase() ? ctx : '')
      const contextToSend = [filterCtx, baseCtx].filter(Boolean).join('\n\n')
      const res = await fetch('/api/analyze', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ company_name: name.trim(), context: contextToSend, force: !!opts.force || !!contextToSend }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
      setResult(data); loadFeatured(); window.scrollTo({top:0, behavior:'smooth'})
    } catch (e) { setError(e.message || 'Unexpected error') } finally { setLoading(false); setRefreshing(false) }
  }

  async function logout() { await fetch('/api/auth/logout', { method:'POST' }); setUser(null) }

  return (
    <div className="min-h-screen">
      <Header view={view} setView={(v)=>{ setView(v); if (v!=='home') setResult(null) }} user={user} onAuthClick={()=>setAuthOpen(true)} onLogout={logout} />
      {view === 'home' && !result && (
        <>
          <Hero query={query} setQuery={setQuery} ctx={ctx} setCtx={setCtx} showCtx={showCtx} setShowCtx={setShowCtx} filters={filters} setFilters={setFilters} onAnalyze={analyze} loading={loading} featured={featured} />
          {(loading || error) && (
            <div className="max-w-7xl mx-auto px-6 pb-12">
              {loading && <Card className="bg-slate-900/40 border-slate-800"><CardContent className="p-6 flex items-center gap-4"><Loader2 className="w-6 h-6 animate-spin text-emerald-300" /><div><div className="font-medium text-slate-100">Running AI valuation engine</div><div className="text-xs text-slate-400">Synthesizing financials, comparable companies and analyst insights — this typically takes 20–45s.</div></div></CardContent></Card>}
              {error && <Card className="bg-red-500/10 border-red-500/30 mt-3"><CardContent className="p-4 text-red-300 text-sm">{error}</CardContent></Card>}
            </div>
          )}
        </>
      )}
      {view === 'home' && result && <Report data={result} onBack={()=>setResult(null)} onReAnalyze={()=>analyze(result.company_name, {force:true})} refreshing={refreshing} />}
      {view === 'discovery' && <DiscoveryView onSelectCompany={analyze} />}
      {view === 'dashboards' && <DashboardsView />}
      <AuthDialog open={authOpen} setOpen={setAuthOpen} onAuth={setUser} />
      <footer className="border-t border-slate-800/60 mt-16"><div className="max-w-7xl mx-auto px-6 py-8 text-xs text-slate-500 flex flex-wrap gap-2 justify-between"><span>Square Associates · Private Company Intelligence Platform</span><span>Estimates are AI-derived and for analyst use only — not investment advice.</span></div></footer>
    </div>
  )
}

export default App
