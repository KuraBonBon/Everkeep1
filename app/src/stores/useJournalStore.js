import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

/* ── Native date helpers (replaces date-fns to avoid v4 edge-cases) */
const pad = (n) => String(n).padStart(2, '0')
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/* ── Seed demo entries ──────────────────────────────────────────── */
const DEMO_ENTRIES = [
  {
    id: uuidv4(),
    title: 'Sprint 3 Retrospective — What Went Well',
    content:
      'This sprint was particularly productive. Our team managed to complete all the stories in the backlog and even started on stretch goals. The daily standup meetings were more focused and helped identify blockers early. Key takeaway: smaller, well-defined stories lead to faster delivery and less context-switching.',
    date: '2026-03-07',
    time: '21:32',
    tags: ['Capstone', 'Agile'],
    course: 'Capstone Project',
    createdAt: Date.now() - 3 * 86400000,
  },
  {
    id: uuidv4(),
    title: 'Database Schema Review — Normalization Notes',
    content:
      'Reviewed the database schema for our campus system. Found several areas where we can improve normalization. The student_courses table needs a composite key instead of a surrogate. Also identified potential indexing improvements for the query patterns we use most frequently. Will implement changes in next migration.',
    date: '2026-03-06',
    time: '15:15',
    tags: ['CS 401', 'Database'],
    course: 'CS 401 — Database Systems',
    createdAt: Date.now() - 4 * 86400000,
  },
  {
    id: uuidv4(),
    title: 'Weekly Reflection — Week 8 of Second Semester',
    content:
      "This week I realized how much I've grown as a developer. Looking back at my code from first year compared to now, the difference is remarkable. I'm starting to think more about architecture and design patterns rather than just making things work. The journey from spaghetti code to structured systems has been rewarding.",
    date: '2026-03-05',
    time: '20:45',
    tags: ['General', 'Growth'],
    course: '',
    createdAt: Date.now() - 5 * 86400000,
  },
  {
    id: uuidv4(),
    title: 'UI Prototype Feedback — Consultant Meeting',
    content:
      'Had a great meeting with my thesis consultant today. The feedback was constructive — need to improve the navigation flow and add more visual hierarchy to the dashboard. The color palette was approved though, and the offline-first approach was well-received. Next step: implement the theme system.',
    date: '2026-03-04',
    time: '14:00',
    tags: ['Thesis', 'UI/UX'],
    course: 'CS 499 — Thesis',
    createdAt: Date.now() - 6 * 86400000,
  },
  {
    id: uuidv4(),
    title: 'Algorithms Study Session — Dynamic Programming',
    content:
      'Spent 3 hours on dynamic programming problems today. Finally understood the tabulation approach for longest common subsequence. The key insight is building the solution bottom-up from the base cases. Also solved 2 medium-level problems on online judges. Feeling confident for the midterm.',
    date: '2026-03-03',
    time: '11:20',
    tags: ['CS 301', 'Algorithms'],
    course: 'CS 301 — Algorithms',
    createdAt: Date.now() - 7 * 86400000,
  },
  {
    id: uuidv4(),
    title: 'Team Meeting Notes — Feature Prioritization',
    content:
      "We used MoSCoW prioritization to decide on features for the next release. Must-haves include the search functionality and data export. Should-haves include the timeline view. Could-haves are the theme customization. We agreed to defer the AI sentiment feature to phase 2.",
    date: '2026-03-02',
    time: '16:30',
    tags: ['Capstone', 'Planning'],
    course: 'Capstone Project',
    createdAt: Date.now() - 8 * 86400000,
  },
  {
    id: uuidv4(),
    title: 'OJT Documentation — Week 2 Summary',
    content:
      'Documented my second week of on-the-job training at the IT department. Tasks included setting up workstations, basic network troubleshooting, and shadowing the senior developer. Learning a lot about real-world enterprise environments vs academic projects.',
    date: '2026-02-28',
    time: '17:00',
    tags: ['OJT', 'Documentation'],
    course: 'OJT',
    createdAt: Date.now() - 10 * 86400000,
  },
  {
    id: uuidv4(),
    title: 'Research Paper Analysis — Affective Computing in Education',
    content:
      'Read three papers on affective computing applications in education. Key finding: even simple sentiment analysis on student reflections can improve self-awareness and metacognition. This strongly supports our planned AI feature for Everkeep. Will include these in the literature review.',
    date: '2026-02-26',
    time: '19:45',
    tags: ['Thesis', 'Research'],
    course: 'CS 499 — Thesis',
    createdAt: Date.now() - 12 * 86400000,
  },
]

/* ── Store ──────────────────────────────────────────────────────── */
const useJournalStore = create(
  persist(
    (set, get) => ({
      entries: [],
      _demoSeeded: false,

      /* Seed demo entries once, only if store has never had data */
      seedDemoIfEmpty: () => {
        const s = get()
        if (s.entries.length === 0 && !s._demoSeeded) {
          set({ entries: DEMO_ENTRIES, _demoSeeded: true })
        }
      },

      /* Remove all demo entries (keep user-created ones) */
      clearDemoData: () => {
        const demoIds = new Set(DEMO_ENTRIES.map((d) => d.id))
        set((s) => ({
          entries: s.entries.filter((e) => !demoIds.has(e.id)),
          _demoSeeded: true,
        }))
      },

      /* ---- CRUD ------------------------------------------------- */
      addEntry: ({ title, content, tags, course }) => {
        const now = new Date()
        const newId = uuidv4()
        set((s) => ({
          entries: [
            {
              id: newId,
              title,
              content,
              tags: tags || [],
              course: course || '',
              date: fmtDate(now),
              time: fmtTime(now),
              createdAt: Date.now(),
            },
            ...s.entries,
          ],
        }))
        return newId
      },

      updateEntry: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === id ? { ...e, ...patch } : e
          ),
        })),

      deleteEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      /* ---- Derived getters -------------------------------------- */
      getEntry: (id) => get().entries.find((e) => e.id === id),

      /** Stats used by the Dashboard */
      getStats: () => {
        const entries = get().entries
        const now = Date.now()
        const oneWeekAgo = now - 7 * 86400000
        const thisWeek = entries.filter((e) => e.createdAt >= oneWeekAgo)

        /* Consecutive-day writing streak */
        let streak = 0
        if (entries.length) {
          const dates = [...new Set(entries.map((e) => e.date))].sort().reverse()
          streak = 1
          for (let i = 1; i < dates.length; i++) {
            const prev = new Date(dates[i - 1] + 'T00:00:00')
            const curr = new Date(dates[i] + 'T00:00:00')
            if (prev - curr <= 86400000 * 1.5) streak++
            else break
          }
        }

        return {
          total: entries.length,
          thisWeek: thisWeek.length,
          tags: [...new Set(entries.flatMap((e) => e.tags))],
          streak,
        }
      },

      /** Weekly activity data for the area chart */
      getWeeklyActivity: () => {
        const entries = get().entries
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const counts = Array(7).fill(0)
        const now = Date.now()
        entries.forEach((e) => {
          if (e.createdAt >= now - 7 * 86400000) {
            const day = new Date(e.createdAt).getDay()
            counts[day]++
          }
        })
        return days.map((d, i) => ({ day: d, entries: counts[i] }))
      },
    }),
    {
      name: 'campus-chronicle-journal',
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([k]) => k !== '_demoSeeded' && typeof state[k] !== 'function')
      ),
    }
  )
)

export default useJournalStore
