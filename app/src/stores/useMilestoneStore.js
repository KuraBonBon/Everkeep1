import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

/* ── Store ──────────────────────────────────────────────────────── */
const useMilestoneStore = create(
  persist(
    (set, get) => ({
      milestones: [],

      /* No-op — demo data removed, kept for Settings compatibility */
      clearDemoData: () => {},

      addMilestone: (ms) =>
        set((s) => ({
          milestones: [
            ...s.milestones,
            { ...ms, id: uuidv4(), parentId: ms.parentId || null, createdAt: Date.now(), linkedArtifactIds: ms.linkedArtifactIds || [] },
          ],
        })),

      /** Batch-create a parent milestone with children in one operation */
      addMilestoneTree: (parentData, childrenData = []) => {
        const parentId = uuidv4()
        const now = Date.now()
        const parent = {
          ...parentData,
          id: parentId,
          parentId: parentData.parentId || null,
          createdAt: now,
          linkedArtifactIds: parentData.linkedArtifactIds || [],
        }
        const children = childrenData.map((c, i) => ({
          title: c.title || '',
          description: c.description || '',
          date: c.date || parentData.date || '',
          course: c.course || parentData.course || '',
          status: c.status || 'upcoming',
          id: uuidv4(),
          parentId: parentId,
          createdAt: now + i + 1,
          linkedArtifactIds: [],
        }))
        set((s) => ({ milestones: [...s.milestones, parent, ...children] }))
      },

      updateMilestone: (id, patch) =>
        set((s) => {
          let updated = s.milestones.map((m) =>
            m.id === id ? { ...m, ...patch } : m
          )
          /* Cascading completion: when a milestone is marked completed,
             all descendants are also marked completed (Tree Topology) */
          if (patch.status === 'completed') {
            const toComplete = new Set([id])
            let changed = true
            while (changed) {
              changed = false
              updated.forEach((m) => {
                if (m.parentId && toComplete.has(m.parentId) && !toComplete.has(m.id)) {
                  toComplete.add(m.id)
                  changed = true
                }
              })
            }
            updated = updated.map((m) =>
              toComplete.has(m.id) ? { ...m, status: 'completed' } : m
            )
          }
          return { milestones: updated }
        }),

      deleteMilestone: (id) =>
        set((s) => {
          /* Cascade: also delete all descendants */
          const toDelete = new Set([id])
          let changed = true
          while (changed) {
            changed = false
            s.milestones.forEach((m) => {
              if (m.parentId && toDelete.has(m.parentId) && !toDelete.has(m.id)) {
                toDelete.add(m.id)
                changed = true
              }
            })
          }
          return { milestones: s.milestones.filter((m) => !toDelete.has(m.id)) }
        }),

      /** Swap a milestone's display position with its neighbour.
       *  direction: -1 = move up, +1 = move down (relative to current sorted view). */
      reorderMilestone: (id, direction) => {
        set((s) => {
          const sorted = [...s.milestones].sort(
            (a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) || new Date(a.date) - new Date(b.date)
          )
          // Ensure every item has a sortOrder
          sorted.forEach((m, i) => { if (m.sortOrder == null) m.sortOrder = i })
          const idx = sorted.findIndex((m) => m.id === id)
          const swapIdx = idx + direction
          if (swapIdx < 0 || swapIdx >= sorted.length) return s
          const orderA = sorted[idx].sortOrder
          const orderB = sorted[swapIdx].sortOrder
          return {
            milestones: s.milestones.map((m) => {
              if (m.id === sorted[idx].id) return { ...m, sortOrder: orderB }
              if (m.id === sorted[swapIdx].id) return { ...m, sortOrder: orderA }
              return m
            }),
          }
        })
      },

      getStats: () => {
        const ms = get().milestones
        return {
          total: ms.length,
          completed: ms.filter((m) => m.status === 'completed').length,
          inProgress: ms.filter((m) => m.status === 'in-progress').length,
          upcoming: ms.filter((m) => m.status === 'upcoming').length,
        }
      },

      /** Build a flat tree-ordered list: parents followed by their children (recursive), each with a `depth` field */
      getTree: () => {
        const ms = get().milestones
        const sorted = [...ms].sort(
          (a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) || new Date(a.date) - new Date(b.date)
        )
        const childrenOf = (pid) => sorted.filter((m) => (m.parentId || null) === pid)
        const result = []
        const walk = (pid, depth) => {
          childrenOf(pid).forEach((m) => {
            result.push({ ...m, depth })
            walk(m.id, depth + 1)
          })
        }
        walk(null, 0)
        return result
      },

      /** Return milestones due within the next `days` days that aren't completed */
      getUpcoming: (days = 3) => {
        const ms = get().milestones
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const cutoff = new Date(now.getTime() + days * 86400000)
        return ms
          .filter((m) => m.status !== 'completed')
          .filter((m) => {
            const d = new Date(m.date + 'T00:00:00')
            return d >= now && d <= cutoff
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date))
      },

      /** Check and fire desktop notifications for due-soon milestones */
      notifiedIds: [],
      checkNotifications: () => {
        if (!('Notification' in window)) return
        if (Notification.permission === 'default') Notification.requestPermission()
        if (Notification.permission !== 'granted') return

        const upcoming = get().getUpcoming(3)
        const { notifiedIds } = get()
        const today = new Date().toISOString().slice(0, 10)
        const sessionKey = `${today}-notified`

        upcoming.forEach((m) => {
          const nKey = `${m.id}-${sessionKey}`
          if (notifiedIds.includes(nKey)) return
          const d = new Date(m.date + 'T00:00:00')
          const now = new Date()
          now.setHours(0, 0, 0, 0)
          const diff = Math.round((d - now) / 86400000)
          const when = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : `in ${diff} days`
          new Notification('Everkeep — Milestone Reminder', {
            body: `"${m.title}" is due ${when}`,
            icon: undefined,
          })
          set((s) => ({ notifiedIds: [...s.notifiedIds, nKey] }))
        })
      },
    }),
    {
      name: 'campus-chronicle-milestones',
      partialize: (s) => ({
        milestones: s.milestones,
        _demoSeeded: s._demoSeeded,
      }),
    }
  )
)

export default useMilestoneStore
