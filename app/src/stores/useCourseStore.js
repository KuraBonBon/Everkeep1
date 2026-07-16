import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

/* ── Demo courses (seeded once on first launch) ─────────────────── */
const DEMO_COURSES = [
  { id: 'course-1', name: 'CS 499 — Thesis', color: '#c084fc', icon: '📝', createdAt: Date.now() - 180 * 86400000 },
  { id: 'course-2', name: 'Capstone Project', color: '#818cf8', icon: '🚀', createdAt: Date.now() - 150 * 86400000 },
  { id: 'course-3', name: 'CS 401 — Database Systems', color: '#34d399', icon: '🗄️', createdAt: Date.now() - 120 * 86400000 },
  { id: 'course-4', name: 'CS 301 — Algorithms', color: '#60a5fa', icon: '⚡', createdAt: Date.now() - 100 * 86400000 },
  { id: 'course-5', name: 'OJT', color: '#fb923c', icon: '💼', createdAt: Date.now() - 90 * 86400000 },
]

const useCourseStore = create(
  persist(
    (set, get) => ({
      courses: [],
      _demoSeeded: false,

      seedDemoIfEmpty: () => {
        const s = get()
        if (s.courses.length === 0 && !s._demoSeeded) {
          set({ courses: DEMO_COURSES, _demoSeeded: true })
        }
      },

      clearDemoData: () => {
        const demoIds = new Set(DEMO_COURSES.map((d) => d.id))
        set((s) => ({
          courses: s.courses.filter((c) => !demoIds.has(c.id)),
          _demoSeeded: true,
        }))
      },

      addCourse: ({ name, color, icon }) => {
        const id = uuidv4()
        set((s) => ({
          courses: [...s.courses, { id, name, color: color || '#818cf8', icon: icon || '📁', createdAt: Date.now() }],
        }))
        return id
      },

      updateCourse: (id, patch) =>
        set((s) => ({
          courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      deleteCourse: (id) =>
        set((s) => ({ courses: s.courses.filter((c) => c.id !== id) })),

      getCourseById: (id) => get().courses.find((c) => c.id === id) || null,

      getCourseByName: (name) => get().courses.find((c) => c.name === name) || null,
    }),
    {
      name: 'campus-chronicle-courses',
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([k]) => k !== '_demoSeeded' && typeof state[k] !== 'function')
      ),
    }
  )
)

export default useCourseStore
