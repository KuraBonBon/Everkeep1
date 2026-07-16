import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Fuse from 'fuse.js'
import {
  HiOutlineSearch,
  HiOutlineX,
  HiOutlinePencilAlt,
  HiOutlineArchive,
  HiOutlineClock,
  HiOutlineCash,
} from 'react-icons/hi'
import useJournalStore from '../../stores/useJournalStore'
import useArtifactStore from '../../stores/useArtifactStore'
import useMilestoneStore from '../../stores/useMilestoneStore'
import useFinanceStore from '../../stores/useFinanceStore'
import './GlobalSearch.css'

const MODULE_META = {
  journal:   { icon: HiOutlinePencilAlt, label: 'Journal',   path: '/journal',   color: '#818cf8' },
  artifact:  { icon: HiOutlineArchive,   label: 'Artifacts',  path: '/artifacts', color: '#c084fc' },
  milestone: { icon: HiOutlineClock,     label: 'Timeline',  path: '/timeline',  color: '#34d399' },
  finance:   { icon: HiOutlineCash,      label: 'Finance',   path: '/finance',   color: '#fbbf24' },
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()

  const entries = useJournalStore((s) => s.entries)
  const artifacts = useArtifactStore((s) => s.artifacts)
  const milestones = useMilestoneStore((s) => s.milestones)
  const transactions = useFinanceStore((s) => s.transactions)

  /* Build searchable items */
  const items = useMemo(() => [
    ...entries.map((e) => ({ module: 'journal', id: e.id, title: e.title, sub: e.tags?.join(', ') || e.date, raw: e })),
    ...artifacts.map((a) => ({ module: 'artifact', id: a.id, title: a.title, sub: a.type || a.description?.slice(0, 60), raw: a })),
    ...milestones.map((m) => ({ module: 'milestone', id: m.id, title: m.title, sub: m.status + ' — ' + m.date, raw: m })),
    ...transactions.map((t) => ({ module: 'finance', id: t.id, title: t.description || 'Transaction', sub: `${t.type} — ₱${t.amount}`, raw: t })),
  ], [entries, artifacts, milestones, transactions])

  const fuse = useMemo(() => new Fuse(items, {
    keys: ['title', 'sub'],
    threshold: 0.35,
    ignoreLocation: true,
  }), [items])

  const results = query.trim() ? fuse.search(query, { limit: 20 }).map((r) => r.item) : []

  /* Ctrl+K / Cmd+K to open */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  /* Focus input when opened */
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  /* Keyboard navigation inside results */
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault()
      goTo(results[selectedIdx])
    }
  }

  /* Scroll selected into view */
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx]
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const goTo = (item) => {
    const meta = MODULE_META[item.module]
    navigate(meta.path)
    setOpen(false)
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="global-search__overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setOpen(false)}
      >
        <motion.div
          className="global-search__dialog"
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="global-search__input-row">
            <HiOutlineSearch size={18} className="global-search__icon" />
            <input
              ref={inputRef}
              className="global-search__input"
              placeholder="Search everything… (entries, artifacts, milestones, transactions)"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0) }}
              onKeyDown={handleKeyDown}
            />
            <kbd className="global-search__kbd">Esc</kbd>
            <button className="global-search__close" onClick={() => setOpen(false)}>
              <HiOutlineX size={16} />
            </button>
          </div>

          {/* Results */}
          {query.trim() && (
            <div className="global-search__results" ref={listRef}>
              {results.length === 0 ? (
                <div className="global-search__empty">No results for "{query}"</div>
              ) : (
                results.map((item, i) => {
                  const meta = MODULE_META[item.module]
                  const Icon = meta.icon
                  return (
                    <button
                      key={`${item.module}-${item.id}`}
                      className={`global-search__result ${i === selectedIdx ? 'global-search__result--active' : ''}`}
                      onClick={() => goTo(item)}
                      onMouseEnter={() => setSelectedIdx(i)}
                    >
                      <Icon size={16} style={{ color: meta.color, flexShrink: 0 }} />
                      <div className="global-search__result-text">
                        <span className="global-search__result-title">{item.title}</span>
                        <span className="global-search__result-sub">{item.sub}</span>
                      </div>
                      <span className="global-search__result-badge" style={{ color: meta.color }}>{meta.label}</span>
                    </button>
                  )
                })
              )}
            </div>
          )}

          {!query.trim() && (
            <div className="global-search__hint">
              Start typing to search across all modules
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
