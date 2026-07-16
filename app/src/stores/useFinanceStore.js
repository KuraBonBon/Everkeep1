import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

/* ── Default budget categories ──────────────────────────────────── */
const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food', icon: '🍔', color: '#f87171', budget: 3000 },
  { id: 'transport', name: 'Transport', icon: '🚌', color: '#60a5fa', budget: 1500 },
  { id: 'printing', name: 'Printing', icon: '🖨️', color: '#818cf8', budget: 500 },
  { id: 'school-fees', name: 'School Fees', icon: '🎓', color: '#c084fc', budget: 5000 },
  { id: 'project-materials', name: 'Project Materials', icon: '📦', color: '#34d399', budget: 2000 },
  { id: 'misc', name: 'Miscellaneous', icon: '📎', color: '#9ca3b4', budget: 1000 },
]

/* ── Demo transactions ──────────────────────────────────────────── */
const DEMO_TRANSACTIONS = [
  { id: uuidv4(), type: 'expense', amount: 150, category: 'food', description: 'Lunch at canteen', date: '2026-03-15', createdAt: Date.now() },
  { id: uuidv4(), type: 'expense', amount: 85, category: 'transport', description: 'Jeepney fare — school', date: '2026-03-14', createdAt: Date.now() - 86400000 },
  { id: uuidv4(), type: 'income', amount: 5000, category: 'misc', description: 'Monthly allowance', date: '2026-03-01', createdAt: Date.now() - 14 * 86400000 },
  { id: uuidv4(), type: 'expense', amount: 350, category: 'printing', description: 'Thesis draft print', date: '2026-03-10', createdAt: Date.now() - 5 * 86400000 },
  { id: uuidv4(), type: 'expense', amount: 1200, category: 'project-materials', description: 'USB drive + folders', date: '2026-03-08', createdAt: Date.now() - 7 * 86400000 },
  { id: uuidv4(), type: 'expense', amount: 200, category: 'food', description: 'Group study snacks', date: '2026-03-12', createdAt: Date.now() - 3 * 86400000 },
  { id: uuidv4(), type: 'income', amount: 2000, category: 'misc', description: 'Freelance web project', date: '2026-03-05', createdAt: Date.now() - 10 * 86400000 },
  { id: uuidv4(), type: 'expense', amount: 75, category: 'transport', description: 'Tricycle fare — field visit', date: '2026-03-13', createdAt: Date.now() - 2 * 86400000 },
]

/* ── Store ──────────────────────────────────────────────────────── */
const useFinanceStore = create(
  persist(
    (set, get) => ({
      transactions: [],
      budgetCategories: DEFAULT_CATEGORIES,
      currency: '₱',
      _demoSeeded: false,

      seedDemoIfEmpty: () => {
        const s = get()
        if (s.transactions.length === 0 && !s._demoSeeded) {
          set({ transactions: DEMO_TRANSACTIONS, _demoSeeded: true })
        }
      },

      clearDemoData: () => {
        set({ transactions: [], _demoSeeded: true })
      },

      /* ── CRUD ────────────────────────────────────────── */
      addTransaction: ({ type, amount, category, description, date }) => {
        set((s) => ({
          transactions: [
            {
              id: uuidv4(),
              type,
              amount: parseFloat(amount) || 0,
              category,
              description: description || '',
              date: date || new Date().toISOString().slice(0, 10),
              createdAt: Date.now(),
            },
            ...s.transactions,
          ],
        }))
      },

      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...patch } : t
          ),
        })),

      deleteTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        })),

      /* ── Budget management ───────────────────────────── */
      updateBudget: (categoryId, budget) =>
        set((s) => ({
          budgetCategories: s.budgetCategories.map((c) =>
            c.id === categoryId ? { ...c, budget: parseFloat(budget) || 0 } : c
          ),
        })),

      addBudgetCategory: ({ name, icon, color, budget }) => {
        const id = name.toLowerCase().replace(/\s+/g, '-')
        set((s) => ({
          budgetCategories: [
            ...s.budgetCategories,
            { id, name, icon: icon || '📁', color: color || '#9ca3b4', budget: parseFloat(budget) || 0 },
          ],
        }))
      },

      deleteBudgetCategory: (id) =>
        set((s) => ({
          budgetCategories: s.budgetCategories.filter((c) => c.id !== id),
        })),

      /* ── Derived getters ─────────────────────────────── */
      getMonthlyStats: (year, month) => {
        const txns = get().transactions
        const cats = get().budgetCategories
        const filtered = txns.filter((t) => {
          const d = new Date(t.date + 'T00:00:00')
          return d.getFullYear() === year && d.getMonth() === month
        })

        const totalIncome = filtered
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0)

        const totalExpense = filtered
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)

        const byCategory = {}
        cats.forEach((c) => { byCategory[c.id] = { ...c, spent: 0 } })
        filtered.filter((t) => t.type === 'expense').forEach((t) => {
          if (byCategory[t.category]) byCategory[t.category].spent += t.amount
        })

        return {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          byCategory: Object.values(byCategory),
          transactionCount: filtered.length,
        }
      },

      getRecentTransactions: (limit = 10) => {
        return [...get().transactions]
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, limit)
      },

      /**
       * Import transactions from CSV text.
       * Expected columns: date, description, amount, type (income|expense), category
       * First row is treated as header.
       */
      importCSV: (csvText) => {
        const lines = csvText.trim().split(/\r?\n/)
        if (lines.length < 2) return 0
        const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
        const dateIdx = header.findIndex((h) => h === 'date')
        const descIdx = header.findIndex((h) => h.includes('desc'))
        const amtIdx = header.findIndex((h) => h === 'amount' || h === 'amt')
        const typeIdx = header.findIndex((h) => h === 'type')
        const catIdx = header.findIndex((h) => h.includes('categ'))

        const newTxns = []
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim())
          if (cols.length < 2) continue
          const amount = parseFloat(cols[amtIdx] ?? cols[2]) || 0
          if (amount === 0) continue
          newTxns.push({
            id: uuidv4(),
            date: cols[dateIdx] ?? cols[0] ?? new Date().toISOString().slice(0, 10),
            description: cols[descIdx] ?? cols[1] ?? '',
            amount: Math.abs(amount),
            type: (cols[typeIdx] ?? (amount < 0 ? 'expense' : 'income')).toLowerCase().includes('expense') ? 'expense' : 'income',
            category: cols[catIdx] ?? 'misc',
            createdAt: Date.now(),
          })
        }
        if (newTxns.length > 0) {
          set((s) => ({ transactions: [...newTxns, ...s.transactions] }))
        }
        return newTxns.length
      },
    }),
    {
      name: 'campus-chronicle-finance',
      partialize: (state) => Object.fromEntries(Object.entries(state).filter(([k]) => k !== '_demoSeeded')),
    }
  )
)

export default useFinanceStore
