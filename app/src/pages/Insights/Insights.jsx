import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HiOutlineSparkles,
  HiOutlineTrendingUp,
  HiOutlineDocumentText,
  HiOutlineCash,
  HiOutlineAcademicCap,
  HiOutlineCalendar,
  HiOutlineFlag,
} from 'react-icons/hi'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import useJournalStore from '../../stores/useJournalStore'
import useArtifactStore from '../../stores/useArtifactStore'
import useMilestoneStore from '../../stores/useMilestoneStore'
import useFinanceStore from '../../stores/useFinanceStore'
import useAIStore from '../../stores/useAIStore'
import useCategoryStore from '../../stores/useCategoryStore'
import { containerV, itemV } from '../../utils/animations'
import { TAG_COLOR_PALETTE as TAG_COLORS } from '../../constants/colors'
import './Insights.css'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Insights() {
  const entries = useJournalStore((s) => s.entries)
  const artifacts = useArtifactStore((s) => s.artifacts)
  const milestones = useMilestoneStore((s) => s.milestones)
  const categories = useCategoryStore((s) => s.categories)
  const financeStats = useFinanceStore((s) => s.getMonthlyStats)
  const currency = useFinanceStore((s) => s.currency)
  const isAIConfigured = useAIStore((s) => s.isConfigured)
  const summarizeText = useAIStore((s) => s.summarizeText)
  const aiLoading = useAIStore((s) => s.isLoading)

  const generateReflection = useAIStore((s) => s.generateReflection)

  const [aiSummary, setAiSummary] = useState(null)
  const [aiReflection, setAiReflection] = useState(null)

  /* Monthly finance */
  const now = new Date()
  const fYear = now.getFullYear()
  const fMonth = now.getMonth()
  const fStats = useMemo(() => financeStats(fYear, fMonth), [financeStats, fYear, fMonth])

  /* Tag distribution from real entries */
  const tagDist = useMemo(() => {
    const counts = {}
    entries.forEach((e) => e.tags?.forEach((t) => { counts[t] = (counts[t] || 0) + 1 }))
    const total = entries.length || 1
    return Object.entries(counts)
      .map(([label, count], i) => ({
        label,
        pct: Math.round((count / total) * 100),
        color: TAG_COLORS[i % TAG_COLORS.length],
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6)
  }, [entries])

  /* Weekly writing volume (last 8 weeks) */
  const writingTrend = useMemo(() => {
    const weeks = []
    const today = new Date()
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - (i * 7 + today.getDay()))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const weekEntries = entries.filter((e) => {
        const d = new Date(e.date + 'T00:00:00')
        return d >= weekStart && d <= weekEnd
      })
      const wordCount = weekEntries.reduce((sum, e) => sum + (e.content?.split(/\s+/).length || 0), 0)
      weeks.push({
        week: `W${8 - i}`,
        entries: weekEntries.length,
        words: wordCount,
      })
    }
    return weeks
  }, [entries])

  /* Tag frequency from real entries */
  const tagFrequency = useMemo(() => {
    const counts = {}
    entries.forEach((e) => e.tags?.forEach((t) => { counts[t] = (counts[t] || 0) + 1 }))
    const colors = ['#34d399', '#818cf8', '#f472b6', '#60a5fa', '#c084fc', '#fbbf24', '#fb923c', '#f87171']
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count], i) => ({ label: `${label} (${count})`, color: colors[i % colors.length] }))
  }, [entries])

  /* Writing patterns (real data) */
  const avgWordsPerEntry = useMemo(() => {
    if (!entries.length) return 0
    const totalWords = entries.reduce((sum, e) => sum + (e.content?.split(/\s+/).length || 0), 0)
    return Math.round(totalWords / entries.length)
  }, [entries])

  const uniqueTags = useMemo(() => [...new Set(entries.flatMap((e) => e.tags))].length, [entries])

  /* Activity by day of week */
  const dayActivity = useMemo(() => {
    const counts = Array(7).fill(0)
    entries.forEach((e) => {
      const d = new Date(e.date + 'T00:00:00').getDay()
      counts[d]++
    })
    return DAY_NAMES.map((day, i) => ({ day, entries: counts[i] }))
  }, [entries])

  /* Category breakdown */
  const categoryBreakdown = useMemo(() => {
    return categories.map((c) => {
      const jCount = entries.filter((e) => e.course === c.name).length
      const aCount = artifacts.filter((a) => a.course === c.name).length
      const msDone = milestones.filter((m) => m.course === c.name && m.status === 'completed').length
      const msTotal = milestones.filter((m) => m.course === c.name).length
      return { ...c, jCount, aCount, msDone, msTotal }
    }).filter((c) => c.jCount + c.aCount + c.msTotal > 0)
  }, [categories, entries, artifacts, milestones])

  /* Monthly milestone completions (last 7 months) */
  const monthlyMilestones = useMemo(() => {
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const mo = d.getMonth()
      const yr = d.getFullYear()
      const label = d.toLocaleDateString('en-US', { month: 'short' })
      const count = milestones.filter((m) => {
        if (m.status !== 'completed') return false
        const md = new Date(m.date + 'T00:00:00')
        return md.getMonth() === mo && md.getFullYear() === yr
      }).length
      data.push({ month: label, milestones: count })
    }
    return data
  }, [milestones])

  return (
    <motion.div className="insights" variants={containerV} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div className="insights__header" variants={itemV}>
        <div>
          <h1 className="insights__title">Insights</h1>
          <p className="insights__subtitle">Activity patterns, category progress &amp; AI analysis</p>
        </div>
        <span className={`dev-badge ${isAIConfigured() ? 'dev-badge--live' : 'dev-badge--preview'}`}>{isAIConfigured() ? 'AI Active' : 'Preview'}</span>
      </motion.div>

      <div className="insights__grid">
        {/* ── Writing Volume Trend ────────────────────── */}
        <motion.div className="insights__card insights__section--full" variants={itemV}>
          <div className="insights__card-header">
            <h3><HiOutlineTrendingUp size={16} /> Writing Volume</h3>
            <span className="insights__card-badge">{entries.length > 0 ? 'Live' : 'No Data'}</span>
          </div>
          <div className="insights__chart">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={writingTrend}>
                <defs>
                  <linearGradient id="gradInsEntries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradInsWords" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                <Area type="monotone" dataKey="entries" stroke="#818cf8" strokeWidth={2} fill="url(#gradInsEntries)" name="Entries" />
                <Area type="monotone" dataKey="words" stroke="#34d399" strokeWidth={2} fill="url(#gradInsWords)" name="Words" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ── Tag Distribution ──────────────────────────── */}
        <motion.div className="insights__card" variants={itemV}>
          <div className="insights__card-header">
            <h3><HiOutlineSparkles size={16} /> Tag Distribution</h3>
            <span className="insights__card-badge">{tagDist.length > 0 ? 'Live' : 'No Data'}</span>
          </div>
          <div className="insights__emotion-bars">
            {tagDist.length > 0 ? tagDist.map((em) => (
              <div key={em.label} className="insights__emotion-row">
                <span className="insights__emotion-label">{em.label}</span>
                <div className="insights__emotion-track">
                  <motion.div
                    className="insights__emotion-fill"
                    style={{ background: em.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${em.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                </div>
                <span className="insights__emotion-pct">{em.pct}%</span>
              </div>
            )) : (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                Add tags to your journal entries to see distribution.
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Activity by Day ──────────────────────────── */}
        <motion.div className="insights__card" variants={itemV}>
          <div className="insights__card-header">
            <h3><HiOutlineCalendar size={16} /> Activity by Day</h3>
            <span className="insights__card-badge">Pattern</span>
          </div>
          <div className="insights__chart">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dayActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                <Bar dataKey="entries" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ── Writing Patterns ─────────────────────────── */}
        <motion.div className="insights__card" variants={itemV}>
          <div className="insights__card-header">
            <h3><HiOutlineDocumentText size={16} /> Writing Patterns</h3>
            <span className="insights__card-badge">Live</span>
          </div>
          <div className="insights__pattern-grid">
            <div className="insights__pattern-stat">
              <span className="insights__pattern-value">{entries.length}</span>
              <span className="insights__pattern-label">Total Entries</span>
            </div>
            <div className="insights__pattern-stat">
              <span className="insights__pattern-value">{avgWordsPerEntry}</span>
              <span className="insights__pattern-label">Avg Words / Entry</span>
            </div>
            <div className="insights__pattern-stat">
              <span className="insights__pattern-value">{uniqueTags}</span>
              <span className="insights__pattern-label">Unique Tags</span>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Top Tags
            </p>
            <div className="insights__tag-cloud">
              {tagFrequency.length > 0 ? tagFrequency.map((t) => (
                <span key={t.label} className="insights__ai-tag" style={{ '--tag-color': t.color }}>{t.label}</span>
              )) : (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No tags yet — add tags to your journal entries.</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Milestone Completions ──────────────────── */}
        <motion.div className="insights__card" variants={itemV}>
          <div className="insights__card-header">
            <h3><HiOutlineFlag size={16} /> Milestone Completions</h3>
            <span className="insights__card-badge">Monthly</span>
          </div>
          <div className="insights__chart">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyMilestones}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                <Bar dataKey="milestones" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ── Category Breakdown ─────────────────────────── */}
        <motion.div className="insights__card insights__section--full" variants={itemV}>
          <div className="insights__card-header">
            <h3><HiOutlineAcademicCap size={16} /> Category Breakdown</h3>
            <span className="insights__card-badge">{categoryBreakdown.length} categories</span>
          </div>
          {categoryBreakdown.length > 0 ? (
            <div className="insights__course-grid">
              {categoryBreakdown.map((c) => (
                <div key={c.id} className="insights__course-card">
                  <div className="insights__course-card-header">
                    <span className="insights__course-icon" style={{ background: `${c.color}22`, color: c.color }}>{c.icon}</span>
                    <span className="insights__course-name">{c.name}</span>
                  </div>
                  <div className="insights__course-stats">
                    <div><strong>{c.jCount}</strong> entries</div>
                    <div><strong>{c.aCount}</strong> artifacts</div>
                    <div><strong>{c.msDone}/{c.msTotal}</strong> milestones</div>
                  </div>
                  {c.msTotal > 0 && (
                    <div className="insights__course-progress">
                      <div className="insights__course-progress-track">
                        <motion.div
                          className="insights__course-progress-fill"
                          style={{ background: c.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round((c.msDone / c.msTotal) * 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                      <span className="insights__course-progress-pct">{Math.round((c.msDone / c.msTotal) * 100)}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
              Assign categories to your entries, artifacts, and milestones to see cross-linked progress.
            </p>
          )}
        </motion.div>

        {/* ── Monthly Finance Summary ─────────────────── */}
        <motion.div className="insights__card" variants={itemV}>
          <div className="insights__card-header">
            <h3><HiOutlineCash size={16} /> Monthly Finance</h3>
            <span className="insights__card-badge">Live</span>
          </div>
          <div className="insights__pattern-grid">
            <div className="insights__pattern-stat">
              <span className="insights__pattern-value" style={{ color: '#34d399' }}>{currency}{fStats.totalIncome.toLocaleString()}</span>
              <span className="insights__pattern-label">Income</span>
            </div>
            <div className="insights__pattern-stat">
              <span className="insights__pattern-value" style={{ color: '#f87171' }}>{currency}{fStats.totalExpense.toLocaleString()}</span>
              <span className="insights__pattern-label">Expenses</span>
            </div>
            <div className="insights__pattern-stat">
              <span className="insights__pattern-value">{currency}{fStats.balance.toLocaleString()}</span>
              <span className="insights__pattern-label">Balance</span>
            </div>
          </div>
        </motion.div>

        {/* ── AI Analysis ─────────────────────────────── */}
        <motion.div className="insights__card insights__section--full" variants={itemV}>
          <div className="insights__card-header">
            <h3><HiOutlineSparkles size={16} /> AI Analysis</h3>
            <span className="insights__card-badge">{isAIConfigured() ? 'AI Active' : 'Add Key'}</span>
          </div>
          {isAIConfigured() ? (
            <div className="insights__ai-analysis">
              {/* Weekly Digest */}
              <div className="insights__ai-block">
                <div className="insights__ai-block-header">
                  <span className="insights__ai-block-title">Weekly Digest</span>
                  <span className="insights__ai-block-desc">Key themes, progress highlights &amp; suggestions</span>
                </div>
                {aiSummary ? (
                  <p className="insights__ai-result">{aiSummary}</p>
                ) : (
                  <button
                    className="btn btn--primary btn--sm"
                    disabled={aiLoading || entries.length < 2}
                    onClick={async () => {
                      const recentEntries = entries.slice(0, 7)
                      const recentMs = milestones.slice(0, 10)
                      const msSummary = recentMs.length > 0
                        ? `\n\nMILESTONE PROGRESS:\n` + recentMs.map((m) => `[${m.status}] ${m.title} (due: ${m.date || 'N/A'})`).join('\n')
                        : ''
                      const financeSummary = `\n\nFINANCE (this month): Income: ${currency}${fStats.totalIncome}, Expenses: ${currency}${fStats.totalExpense}, Balance: ${currency}${fStats.balance}`
                      const prompt = `Analyze this student's weekly data across journals, milestones, and finances. Provide a comprehensive digest with: (1) Key themes from journal entries, (2) Milestone progress and upcoming deadlines, (3) Financial observations, (4) Three specific actionable recommendations for next week.\n\n` +
                        `JOURNAL ENTRIES:\n` +
                        recentEntries.map((e) => `[${e.date}] ${e.title} (${e.course || 'Uncategorized'}): ${e.content.slice(0, 300)}`).join('\n\n') +
                        msSummary + financeSummary
                      const result = await summarizeText(prompt)
                      if (result) setAiSummary(result)
                    }}
                  >
                    {aiLoading ? 'Generating…' : entries.length < 2 ? 'Need 2+ entries' : 'Generate Digest'}
                  </button>
                )}
              </div>

              {/* Reflection */}
              <div className="insights__ai-block">
                <div className="insights__ai-block-header">
                  <span className="insights__ai-block-title">Weekly Reflection</span>
                  <span className="insights__ai-block-desc">AI-generated reflection across all your activity</span>
                </div>
                {aiReflection ? (
                  <p className="insights__ai-result">{aiReflection}</p>
                ) : (
                  <button
                    className="btn btn--primary btn--sm"
                    disabled={aiLoading || entries.length < 2}
                    onClick={async () => {
                      const recentEntries = entries.slice(0, 7)
                      const recentMs = milestones.slice(0, 10)
                      const msSummary = recentMs.length > 0
                        ? recentMs.map((m) => `[${m.status}] ${m.title} (due: ${m.date || 'N/A'})`).join('\n')
                        : ''
                      const financeSummary = `Income: ${currency}${fStats.totalIncome}, Expenses: ${currency}${fStats.totalExpense}, Balance: ${currency}${fStats.balance}`
                      const result = await generateReflection(recentEntries, msSummary, financeSummary)
                      if (result) setAiReflection(result)
                    }}
                  >
                    {aiLoading ? 'Generating…' : entries.length < 2 ? 'Need 2+ entries' : 'Generate Reflection'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
              Add an API key in Settings to enable AI-powered analysis.
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
