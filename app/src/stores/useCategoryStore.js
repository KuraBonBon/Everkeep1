import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

/* ── Seed categories ─────────────────────────────────────────────── */
const DEMO_CATEGORIES = [
  { id: uuidv4(), name: 'CS 401 — Software Engineering', color: '#818cf8', icon: '💻' },
  { id: uuidv4(), name: 'CS 301 — Algorithms', color: '#60a5fa', icon: '🧮' },
  { id: uuidv4(), name: 'Thesis / Capstone', color: '#c084fc', icon: '📑' },
  { id: uuidv4(), name: 'OJT / Practicum', color: '#f87171', icon: '🏢' },
  { id: uuidv4(), name: 'General Academics', color: '#34d399', icon: '📚' },
  { id: uuidv4(), name: 'Personal Growth', color: '#f472b6', icon: '🌱' },
]

/* ── Store ────────────────────────────────────────────────────────── */
const useCategoryStore = create(
  persist(
    (set, get) => ({
      categories: [],
      _demoSeeded: false,

      seedDemoIfEmpty: () => {
        const s = get()
        if (s.categories.length === 0 && !s._demoSeeded) {
          set({ categories: DEMO_CATEGORIES, _demoSeeded: true })
        }
      },

      clearDemoData: () => {
        set({ categories: [], _demoSeeded: true })
      },

      addCategory: ({ name, color, icon }) => {
        const id = uuidv4()
        set((s) => ({
          categories: [
            ...s.categories,
            { id, name, color: color || '#9ca3b4', icon: icon || '📁' },
          ],
        }))
        return id
      },

      updateCategory: (id, patch) =>
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        })),

      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
        })),

      getCategory: (id) => get().categories.find((c) => c.id === id),
    }),
    {
      name: 'campus-chronicle-categories',
      partialize: (state) => Object.fromEntries(Object.entries(state).filter(([k]) => k !== '_demoSeeded')),
    }
  )
)

export default useCategoryStore
