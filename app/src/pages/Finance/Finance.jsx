import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineCash,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlinePlus,
  HiOutlineX,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineChartBar,
  HiOutlineCalendar,
} from 'react-icons/hi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import useFinanceStore from '../../stores/useFinanceStore'
import { fmtDateShort as fmtDate } from '../../utils/format'
import { containerV, itemV } from '../../utils/animations'
import './Finance.css'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function Finance() {
  const transactions = useFinanceStore((s) => s.transactions)
  const budgetCategories = useFinanceStore((s) => s.budgetCategories)
  const currency = useFinanceStore((s) => s.currency)
  const addTransaction = useFinanceStore((s) => s.addTransaction)
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction)
  const getMonthlyStats = useFinanceStore((s) => s.getMonthlyStats)
  const updateBudget = useFinanceStore((s) => s.updateBudget)

  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear] = useState(now.getFullYear())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [txType, setTxType] = useState('expense')
  const [txAmount, setTxAmount] = useState('')
  const [txCategory, setTxCategory] = useState('food')
  const [txDesc, setTxDesc] = useState('')
  const [txDate, setTxDate] = useState(now.toISOString().slice(0, 10))

  // eslint-disable-next-line react-hooks/exhaustive-deps -- transactions & budgetCategories intentionally trigger recomputation
  const stats = useMemo(() => getMonthlyStats(viewYear, viewMonth), [transactions, budgetCategories, viewYear, viewMonth, getMonthlyStats])

  /* Category spending for pie chart */
  const categoryPieData = useMemo(() =>
    stats.byCategory
      .filter((c) => c.spent > 0)
      .map((c) => ({ name: c.name, value: c.spent, color: c.color })),
    [stats]
  )

  /* Budget vs actual bar data */
  const budgetBarData = useMemo(() =>
    stats.byCategory
      .filter((c) => c.budget > 0 || c.spent > 0)
      .map((c) => ({ name: c.name, budget: c.budget, spent: c.spent, color: c.color })),
    [stats]
  )

  /* Monthly transactions sorted */
  const monthlyTransactions = useMemo(() => {
    return [...transactions]
      .filter((t) => {
        const d = new Date(t.date + 'T00:00:00')
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [transactions, viewYear, viewMonth])

  const getCategoryInfo = (catId) => budgetCategories.find((c) => c.id === catId) || { name: catId, icon: '📁', color: '#9ca3b4' }

  const handleAddTransaction = () => {
    if (!txAmount || parseFloat(txAmount) <= 0) return
    addTransaction({ type: txType, amount: txAmount, category: txCategory, description: txDesc, date: txDate })
    setShowAddModal(false)
    setTxAmount('')
    setTxDesc('')
  }

  const fmtCurrency = (n) => `${currency}${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

  return (
    <motion.div className="finance" variants={containerV} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div className="finance__header" variants={itemV}>
        <div>
          <h1 className="finance__title">Personal Finance</h1>
          <p className="finance__subtitle">Track your spending, set budgets, and stay in control</p>
        </div>
        <div className="finance__header-actions">
          <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
            <HiOutlinePlus size={18} /> Add Transaction
          </button>
        </div>
      </motion.div>

      {/* Month selector */}
      <motion.div className="finance__month-selector" variants={itemV}>
        <HiOutlineCalendar size={16} />
        <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m} {viewYear}</option>)}
        </select>
      </motion.div>

      {/* Stats cards */}
      <motion.div className="finance__stats" variants={itemV}>
        <div className="finance__stat-card finance__stat-card--income">
          <HiOutlineTrendingUp size={20} />
          <div className="finance__stat-value">{fmtCurrency(stats.totalIncome)}</div>
          <div className="finance__stat-label">Income</div>
        </div>
        <div className="finance__stat-card finance__stat-card--expense">
          <HiOutlineTrendingDown size={20} />
          <div className="finance__stat-value">{fmtCurrency(stats.totalExpense)}</div>
          <div className="finance__stat-label">Expenses</div>
        </div>
        <div className={`finance__stat-card ${stats.balance >= 0 ? 'finance__stat-card--positive' : 'finance__stat-card--negative'}`}>
          <HiOutlineCash size={20} />
          <div className="finance__stat-value">{fmtCurrency(stats.balance)}</div>
          <div className="finance__stat-label">Balance</div>
        </div>
        <div className="finance__stat-card finance__stat-card--count">
          <HiOutlineChartBar size={20} />
          <div className="finance__stat-value">{stats.transactionCount}</div>
          <div className="finance__stat-label">Transactions</div>
        </div>
      </motion.div>

      <div className="finance__grid">
        {/* Budget vs Actual chart */}
        <motion.div className="finance__card" variants={itemV}>
          <div className="finance__card-header">
            <h3><HiOutlineChartBar size={16} /> Budget vs Actual</h3>
            <button className="btn btn--outline btn--sm" onClick={() => setShowBudgetModal(true)}>Edit Budgets</button>
          </div>
          {budgetBarData.length > 0 ? (
            <div className="finance__chart">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={budgetBarData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                  <Bar dataKey="budget" fill="rgba(129, 140, 248, 0.3)" radius={[4, 4, 0, 0]} name="Budget" />
                  <Bar dataKey="spent" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="finance__empty-hint">No spending data for this month yet.</p>
          )}
        </motion.div>

        {/* Spending breakdown pie */}
        <motion.div className="finance__card" variants={itemV}>
          <div className="finance__card-header">
            <h3><HiOutlineCash size={16} /> Spending Breakdown</h3>
          </div>
          {categoryPieData.length > 0 ? (
            <div className="finance__pie-area">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryPieData} cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={3} dataKey="value">
                    {categoryPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="finance__pie-legend">
                {categoryPieData.map((d) => (
                  <span key={d.name} className="finance__pie-legend-item">
                    <span className="finance__pie-dot" style={{ background: d.color }} />
                    {d.name} ({fmtCurrency(d.value)})
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="finance__empty-hint">Add expense transactions to see breakdown.</p>
          )}
        </motion.div>

        {/* Budget category progress */}
        <motion.div className="finance__card finance__card--full" variants={itemV}>
          <div className="finance__card-header">
            <h3>Category Budgets</h3>
          </div>
          <div className="finance__budget-list">
            {stats.byCategory.filter((c) => c.budget > 0).map((cat) => {
              const pct = cat.budget > 0 ? Math.min(100, Math.round((cat.spent / cat.budget) * 100)) : 0
              const isOver = cat.spent > cat.budget
              return (
                <div key={cat.id} className="finance__budget-row">
                  <span className="finance__budget-icon" style={{ background: `${cat.color}20`, color: cat.color }}>{cat.icon}</span>
                  <div className="finance__budget-info">
                    <div className="finance__budget-name-row">
                      <span className="finance__budget-name">{cat.name}</span>
                      <span className={`finance__budget-amount ${isOver ? 'finance__budget-amount--over' : ''}`}>
                        {fmtCurrency(cat.spent)} / {fmtCurrency(cat.budget)}
                      </span>
                    </div>
                    <div className="finance__budget-track">
                      <motion.div
                        className={`finance__budget-fill ${isOver ? 'finance__budget-fill--over' : ''}`}
                        style={{ background: isOver ? 'var(--danger)' : cat.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  </div>
                  <span className={`finance__budget-pct ${isOver ? 'finance__budget-pct--over' : ''}`}>{pct}%</span>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Recent transactions */}
        <motion.div className="finance__card finance__card--full" variants={itemV}>
          <div className="finance__card-header">
            <h3>Recent Transactions</h3>
            <span className="finance__card-badge">{monthlyTransactions.length} this month</span>
          </div>
          <div className="finance__tx-list">
            {monthlyTransactions.length === 0 ? (
              <p className="finance__empty-hint">No transactions for this month.</p>
            ) : (
              monthlyTransactions.map((tx) => {
                const cat = getCategoryInfo(tx.category)
                return (
                  <div key={tx.id} className="finance__tx-item">
                    <span className="finance__tx-icon" style={{ background: `${cat.color}20`, color: cat.color }}>{cat.icon}</span>
                    <div className="finance__tx-info">
                      <span className="finance__tx-desc">{tx.description || cat.name}</span>
                      <span className="finance__tx-meta">{cat.name} · {fmtDate(tx.date)}</span>
                    </div>
                    <span className={`finance__tx-amount ${tx.type === 'income' ? 'finance__tx-amount--income' : 'finance__tx-amount--expense'}`}>
                      {tx.type === 'income' ? '+' : '-'}{fmtCurrency(tx.amount)}
                    </span>
                    <button className="finance__tx-delete" title="Delete" onClick={() => deleteTransaction(tx.id)}>
                      <HiOutlineTrash size={14} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)}>
            <motion.div className="finance__modal" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
              <div className="finance__modal-header">
                <h3><HiOutlinePlus size={18} /> Add Transaction</h3>
                <button onClick={() => setShowAddModal(false)}><HiOutlineX size={20} /></button>
              </div>
              <div className="finance__modal-body">
                <div className="finance__type-toggle">
                  <button className={`finance__type-btn ${txType === 'expense' ? 'finance__type-btn--active finance__type-btn--expense' : ''}`} onClick={() => setTxType('expense')}>Expense</button>
                  <button className={`finance__type-btn ${txType === 'income' ? 'finance__type-btn--active finance__type-btn--income' : ''}`} onClick={() => setTxType('income')}>Income</button>
                </div>
                <div className="settings__field">
                  <label>Amount ({currency})</label>
                  <input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                </div>
                <div className="settings__field">
                  <label>Category</label>
                  <select value={txCategory} onChange={(e) => setTxCategory(e.target.value)}>
                    {budgetCategories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div className="settings__field">
                  <label>Description</label>
                  <input type="text" value={txDesc} onChange={(e) => setTxDesc(e.target.value)} placeholder="What was this for?" />
                </div>
                <div className="settings__field">
                  <label>Date</label>
                  <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
                </div>
              </div>
              <div className="finance__modal-footer">
                <button className="btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button className="btn btn--primary" onClick={handleAddTransaction} disabled={!txAmount || parseFloat(txAmount) <= 0}>
                  Add {txType === 'income' ? 'Income' : 'Expense'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Budget Modal */}
      <AnimatePresence>
        {showBudgetModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBudgetModal(false)}>
            <motion.div className="finance__modal" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
              <div className="finance__modal-header">
                <h3><HiOutlinePencil size={18} /> Edit Monthly Budgets</h3>
                <button onClick={() => setShowBudgetModal(false)}><HiOutlineX size={20} /></button>
              </div>
              <div className="finance__modal-body">
                {budgetCategories.map((cat) => (
                  <div key={cat.id} className="finance__budget-edit-row">
                    <span className="finance__budget-edit-icon" style={{ color: cat.color }}>{cat.icon}</span>
                    <span className="finance__budget-edit-name">{cat.name}</span>
                    <div className="finance__budget-edit-input">
                      <span>{currency}</span>
                      <input
                        type="number"
                        value={cat.budget}
                        onChange={(e) => updateBudget(cat.id, e.target.value)}
                        min="0"
                        step="100"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="finance__modal-footer">
                <button className="btn btn--primary" onClick={() => setShowBudgetModal(false)}>Done</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
