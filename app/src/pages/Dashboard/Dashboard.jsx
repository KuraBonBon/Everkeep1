import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  HiOutlinePencilAlt,
  HiOutlineArchive,
  HiOutlineFlag,
  HiOutlineTrendingUp,
  HiOutlinePlus,
  HiOutlineCalendar,
  HiOutlineChevronRight,
  HiOutlineBookOpen,
  HiOutlineDocumentText,
  HiOutlineLightningBolt,
  HiOutlineSparkles,
  HiOutlineCash,
  HiOutlineAcademicCap,
  HiOutlineClock,
} from 'react-icons/hi'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import useJournalStore from '../../stores/useJournalStore'
import useArtifactStore from '../../stores/useArtifactStore'
import useMilestoneStore from '../../stores/useMilestoneStore'
import useProfileStore from '../../stores/useProfileStore'
import useFinanceStore from '../../stores/useFinanceStore'
import useCategoryStore from '../../stores/useCategoryStore'
import useAIStore from '../../stores/useAIStore'
import { containerV, itemV } from '../../utils/animations'
import { fmtDate, todayStr, daysUntil } from '../../utils/format'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const entries = useJournalStore((s) => s.entries)
  const journalStats = useJournalStore((s) => s.getStats)
  const weeklyActivity = useJournalStore((s) => s.getWeeklyActivity)
  const artifacts = useArtifactStore((s) => s.artifacts)
  const artifactStats = useArtifactStore((s) => s.getStats)
  const milestoneStats = useMilestoneStore((s) => s.getStats)
  const milestones = useMilestoneStore((s) => s.milestones)
  const categories = useCategoryStore((s) => s.categories)
  const profile = useProfileStore()
  const financeStats = useFinanceStore((s) => s.getMonthlyStats)
  const transactions = useFinanceStore((s) => s.transactions)
  const budgetCategories = useFinanceStore((s) => s.budgetCategories)
  const currency = useFinanceStore((s) => s.currency)
  const isAIConfigured = useAIStore((s) => s.isConfigured)

  const jStats = journalStats()
  const aStats = artifactStats()
  const msStats = milestoneStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weekly = useMemo(() => weeklyActivity(), [entries])
  const streak = jStats.streak

  const now = new Date()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fStats = useMemo(() => financeStats(now.getFullYear(), now.getMonth()), [transactions, budgetCategories])

  /* Today's entries */
  const today = todayStr()
  const todayEntries = useMemo(() => entries.filter((e) => e.date === today), [entries, today])

  /* Upcoming milestones (next 14 days, nearest first) */
  const upcomingMs = useMemo(
    () => milestones
      .filter((m) => m.status !== 'completed')
      .map((m) => ({ ...m, _days: daysUntil(m.date) }))
      .filter((m) => m._days >= -1 && m._days <= 14)
      .sort((a, b) => a._days - b._days)
      .slice(0, 5),
    [milestones]
  )

  /* Recent 3 entries */
  const recentEntries = entries.slice(0, 3)

  /* Category summary — aggregate entries, artifacts, milestones per category */
  const categorySummary = useMemo(() => {
    return categories.map((c) => {
      const jCount = entries.filter((e) => e.course === c.name).length
      const aCount = artifacts.filter((a) => a.course === c.name).length
      const msDone = milestones.filter((m) => m.course === c.name && m.status === 'completed').length
      const msTotal = milestones.filter((m) => m.course === c.name).length
      return { ...c, jCount, aCount, msDone, msTotal }
    }).filter((c) => c.jCount + c.aCount + c.msTotal > 0)
  }, [categories, entries, artifacts, milestones])

  /* Greeting */
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = profile.fullName.split(' ')[0]

  /* Today's date formatted nicely */
  const todayFormatted = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <motion.div className="dashboard" variants={containerV} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div className="dashboard__header" variants={itemV}>
        <div>
          <h1 className="dashboard__title">{greeting}{firstName ? `, ${firstName}` : ''}!</h1>
          <p className="dashboard__subtitle">{todayFormatted}</p>
        </div>
        <div className="dashboard__header-actions">

          <button className="btn btn--primary" onClick={() => navigate('/journal')}>
            <HiOutlinePlus size={18} /> New Entry
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div className="dashboard__stats" variants={itemV}>
        <StatCard icon={<HiOutlinePencilAlt size={22} />} label="Journal Entries" value={jStats.total} change={`+${jStats.thisWeek} this week`} color="indigo" />
        <StatCard icon={<HiOutlineArchive size={22} />} label="Artifacts Stored" value={aStats.total} change={`+${aStats.thisWeek} this week`} color="emerald" />
        <StatCard icon={<HiOutlineFlag size={22} />} label="Milestones Hit" value={msStats.completed} change={`${msStats.upcoming} upcoming`} color="amber" />
        <StatCard icon={<HiOutlineTrendingUp size={22} />} label="Streak" value={`${streak} days`} change={streak >= 5 ? 'Great momentum!' : 'Keep going!'} color="rose" />
      </motion.div>

      {/* Two-column: Today + Upcoming */}
      <motion.div className="dashboard__duo" variants={itemV}>
        {/* Today's Activity */}
        <div className="card">
          <div className="card__header">
            <h3><HiOutlineLightningBolt size={16} /> Today</h3>
            <span className="card__badge">{todayEntries.length} entries</span>
          </div>
          {todayEntries.length > 0 ? (
            <div className="dashboard__entries-list">
              {todayEntries.map((entry) => (
                <div key={entry.id} className="dashboard__entry-item" onClick={() => navigate('/journal')}>
                  <div className="dashboard__entry-icon"><HiOutlineDocumentText size={16} /></div>
                  <div className="dashboard__entry-info">
                    <span className="dashboard__entry-title">{entry.title}</span>
                    <span className="dashboard__entry-meta">
                      {entry.time}{entry.course && <> · <span className="tag tag--small">{entry.course}</span></>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard__empty-today">
              <HiOutlinePencilAlt size={24} />
              <p>No entries yet today</p>
              <button className="btn btn--primary btn--sm" onClick={() => navigate('/journal')}>
                <HiOutlinePlus size={14} /> Write something
              </button>
            </div>
          )}
        </div>

        {/* Upcoming Milestones */}
        <div className="card">
          <div className="card__header">
            <h3><HiOutlineCalendar size={16} /> Upcoming Deadlines</h3>
            <button className="card__link" onClick={() => navigate('/timeline')}>View All <HiOutlineChevronRight size={14} /></button>
          </div>
          {upcomingMs.length > 0 ? (
            <div className="dashboard__milestones-list">
              {upcomingMs.map((ms) => (
                <div key={ms.id} className="dashboard__milestone-item" onClick={() => navigate('/timeline')}>
                  <div className={`dashboard__milestone-status dashboard__milestone-status--${ms.status}`} />
                  <div className="dashboard__milestone-info">
                    <span className="dashboard__milestone-title">{ms.title}</span>
                    <span className="dashboard__milestone-meta">
                      {ms.course} · Deadline: {ms._days === 0 ? 'today' : ms._days < 0 ? 'overdue' : `${ms._days}d left`}
                    </span>
                  </div>
                  {ms._days <= 3 && ms._days >= 0 && (
                    <span className="dashboard__milestone-urgent">!</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="dashboard__empty-hint">No upcoming deadlines in the next 14 days.</p>
          )}
        </div>
      </motion.div>

      {/* Category overview + Weekly chart */}
      <motion.div className="dashboard__duo" variants={itemV}>
        {/* Category Overview */}
        <div className="card">
          <div className="card__header">
            <h3><HiOutlineAcademicCap size={16} /> By Category</h3>
            <span className="card__badge">{categorySummary.length} active</span>
          </div>
          {categorySummary.length > 0 ? (
            <div className="dashboard__course-list">
              {categorySummary.map((c) => (
                <div key={c.id} className="dashboard__course-row">
                  <span className="dashboard__course-icon" style={{ background: `${c.color}22`, color: c.color }}>{c.icon}</span>
                  <div className="dashboard__course-info">
                    <span className="dashboard__course-name">{c.name}</span>
                    <span className="dashboard__course-meta">
                      {c.jCount} entries · {c.aCount} artifacts · {c.msDone}/{c.msTotal} milestones
                    </span>
                  </div>
                  {c.msTotal > 0 && (
                    <div className="dashboard__course-progress">
                      <div className="dashboard__course-progress-track">
                        <div className="dashboard__course-progress-fill" style={{ width: `${Math.round((c.msDone / c.msTotal) * 100)}%`, background: c.color }} />
                      </div>
                      <span className="dashboard__course-progress-pct">{Math.round((c.msDone / c.msTotal) * 100)}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="dashboard__empty-hint">Assign categories to your entries and milestones to see cross-links.</p>
          )}
        </div>

        {/* Weekly Activity Chart */}
        <div className="card">
          <div className="card__header">
            <h3><HiOutlineClock size={16} /> This Week</h3>
            <span className="card__badge">Activity</span>
          </div>
          <div className="dashboard__chart">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weekly}>
                <defs>
                  <linearGradient id="gradEntries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                <Area type="monotone" dataKey="entries" stroke="var(--accent-primary)" strokeWidth={2} fill="url(#gradEntries)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Bottom: Recent Entries + Quick Info */}
      <motion.div className="dashboard__duo" variants={itemV}>
        {/* Recent Entries */}
        <div className="card">
          <div className="card__header">
            <h3><HiOutlineBookOpen size={16} /> Recent Entries</h3>
            <button className="card__link" onClick={() => navigate('/journal')}>View All <HiOutlineChevronRight size={14} /></button>
          </div>
          <div className="dashboard__entries-list">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="dashboard__entry-item" onClick={() => navigate('/journal')}>
                <div className="dashboard__entry-icon"><HiOutlineDocumentText size={16} /></div>
                <div className="dashboard__entry-info">
                  <span className="dashboard__entry-title">{entry.title}</span>
                  <span className="dashboard__entry-meta">
                    {fmtDate(entry.date)}{entry.course && <> · <span className="tag tag--small">{entry.course}</span></>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Finance + AI Status */}
        <div className="card">
          <div className="card__header">
            <h3><HiOutlineCash size={16} /> Quick Info</h3>
          </div>
          <div className="dashboard__finance-hint" onClick={() => navigate('/finance')}>
            <HiOutlineCash size={14} />
            <div>
              <span className="dashboard__ai-hint-title">Monthly Finance</span>
              <span className="dashboard__ai-hint-text">
                Income: {currency}{fStats.totalIncome.toLocaleString()} · Expenses: {currency}{fStats.totalExpense.toLocaleString()} · Balance: {currency}{fStats.balance.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="dashboard__ai-hint">
            <HiOutlineSparkles size={14} />
            <div>
              <span className="dashboard__ai-hint-title">AI Status</span>
              <span className="dashboard__ai-hint-text">
                {isAIConfigured()
                  ? 'AI is configured. Use it in Journal to summarize entries.'
                  : 'Add an API key in Settings to enable AI features.'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Stat Card component ────────────────────────────────────────── */
function StatCard({ icon, label, value, change, color }) {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__change">{change}</div>
    </div>
  )
}
