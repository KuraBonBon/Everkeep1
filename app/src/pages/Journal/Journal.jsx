import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlinePencilAlt,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineTag,
  HiOutlineX,
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineChevronDown,
  HiOutlineSparkles,
  HiOutlineDocumentText,
} from 'react-icons/hi'
import Fuse from 'fuse.js'
import useJournalStore from '../../stores/useJournalStore'
import useAIStore from '../../stores/useAIStore'
import useCategoryStore from '../../stores/useCategoryStore'
import { containerV as containerVariants, itemV as itemVariants } from '../../utils/animations'
import { fmtDate } from '../../utils/format'
import { getTagColor } from '../../constants/colors'
import './Journal.css'

const fuseOptions = { keys: ['title', 'content', 'tags'], threshold: 0.35, ignoreLocation: true }

export default function Journal() {
  const entries = useJournalStore((s) => s.entries)
  const addEntry = useJournalStore((s) => s.addEntry)
  const updateEntry = useJournalStore((s) => s.updateEntry)
  const deleteEntry = useJournalStore((s) => s.deleteEntry)

  const isAIConfigured = useAIStore((s) => s.isConfigured)
  const summarizeText = useAIStore((s) => s.summarizeText)
  const aiLoading = useAIStore((s) => s.isLoading)
  const aiError = useAIStore((s) => s.lastError)

  const [selectedId, setSelectedId] = useState(entries[0]?.id ?? null)
  const [showCompose, setShowCompose] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTagFilter, setActiveTagFilter] = useState(null)
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [contextMenuId, setContextMenuId] = useState(null)

  const [compTitle, setCompTitle] = useState('')
  const [compContent, setCompContent] = useState('')
  const [compTagInput, setCompTagInput] = useState('')
  const [compTags, setCompTags] = useState([])
  const [compCourse, setCompCourse] = useState('')
  const categories = useCategoryStore((s) => s.categories)

  /* AI states for detail pane */
  const [aiSummary, setAiSummary] = useState(null)

  const allTags = useMemo(() => [...new Set(entries.flatMap((e) => e.tags))].sort(), [entries])

  const filteredEntries = useMemo(() => {
    let list = entries
    if (activeTagFilter) list = list.filter((e) => e.tags.includes(activeTagFilter))
    if (searchQuery.trim()) {
      const fuse = new Fuse(list, fuseOptions)
      list = fuse.search(searchQuery).map((r) => r.item)
    }
    return list
  }, [entries, searchQuery, activeTagFilter])

  const selectedEntry = entries.find((e) => e.id === selectedId) || filteredEntries[0] || null

  const openCompose = (entry = null) => {
    if (entry) {
      setEditingEntry(entry)
      setCompTitle(entry.title)
      setCompContent(entry.content)
      setCompTags([...entry.tags])
      setCompCourse(entry.course || '')
    } else {
      setEditingEntry(null)
      setCompTitle('')
      setCompContent('')
      setCompTags([])
      setCompCourse('')
    }
    setCompTagInput('')
    setShowCompose(true)
  }

  const handleSave = () => {
    if (!compTitle.trim()) return
    if (editingEntry) {
      updateEntry(editingEntry.id, {
        title: compTitle.trim(), content: compContent.trim(), tags: compTags, course: compCourse,
      })
    } else {
      const newId = addEntry({
        title: compTitle.trim(), content: compContent.trim(), tags: compTags, course: compCourse,
      })
      if (newId) {
        setSelectedId(newId)
      } else {
        setTimeout(() => {
          const latest = useJournalStore.getState().entries[0]
          if (latest) setSelectedId(latest.id)
        }, 0)
      }
    }
    setShowCompose(false)
  }

  const handleAISummarize = async () => {
    if (!selectedEntry) return
    setAiSummary(null)
    const result = await summarizeText(selectedEntry.content)
    if (result) setAiSummary(result)
  }

  const handleDelete = (id) => {
    deleteEntry(id)
    setContextMenuId(null)
    if (selectedId === id) setSelectedId(filteredEntries.find((e) => e.id !== id)?.id ?? null)
  }

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && compTagInput.trim()) {
      e.preventDefault()
      const tag = compTagInput.trim()
      if (!compTags.includes(tag)) setCompTags([...compTags, tag])
      setCompTagInput('')
    }
  }

  const removeCompTag = (tag) => setCompTags(compTags.filter((t) => t !== tag))

  return (
    <motion.div className="journal" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div className="journal__header" variants={itemVariants}>
        <div>
          <h1 className="journal__title">Reflection Journal</h1>
          <p className="journal__subtitle">{entries.length} entries · Capturing your reflections and progress</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn--primary" onClick={() => openCompose()}>
            <HiOutlinePlus size={18} /> New Reflection
          </button>
        </div>
      </motion.div>

      {/* Toolbar */}
      <motion.div className="journal__toolbar" variants={itemVariants}>
        <div className="journal__search">
          <HiOutlineSearch size={16} className="journal__search-icon" />
          <input type="text" placeholder="Search entries..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {searchQuery && (
            <button className="journal__search-clear" onClick={() => setSearchQuery('')}><HiOutlineX size={14} /></button>
          )}
        </div>
        <div className="journal__filters">
          {/* Tag filter */}
          <div className="journal__filter-wrapper">
            <button className={`journal__filter-btn ${activeTagFilter ? 'journal__filter-btn--active' : ''}`} onClick={() => setShowTagDropdown(!showTagDropdown)}>
              <HiOutlineTag size={15} /> {activeTagFilter || 'Tags'} <HiOutlineChevronDown size={12} />
            </button>
            <AnimatePresence>
              {showTagDropdown && (
                <motion.div className="journal__dropdown" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <button className="journal__dropdown-item" onClick={() => { setActiveTagFilter(null); setShowTagDropdown(false) }}>All Tags</button>
                  {allTags.map((tag) => (
                    <button key={tag} className={`journal__dropdown-item ${activeTagFilter === tag ? 'journal__dropdown-item--active' : ''}`} onClick={() => { setActiveTagFilter(tag); setShowTagDropdown(false) }}>
                      <span className="journal__dropdown-dot" style={{ background: getTagColor(tag) }} /> {tag}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {activeTagFilter && (
            <button className="journal__filter-clear" onClick={() => setActiveTagFilter(null)}>
              <HiOutlineX size={13} /> Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div className="journal__content" variants={itemVariants}>
        <div className="journal__list">
          {filteredEntries.length === 0 && <div className="journal__empty"><span>📝</span><p>No entries found</p></div>}
          {filteredEntries.map((entry) => (
            <motion.div key={entry.id} className={`journal__list-item ${selectedEntry?.id === entry.id ? 'journal__list-item--active' : ''}`} onClick={() => { setSelectedId(entry.id); setAiSummary(null) }} layout>
              <div className="journal__list-item-header">
                <span className="journal__list-item-icon"><HiOutlineDocumentText size={14} /></span>
                <span className="journal__list-item-date">{fmtDate(entry.date)}</span>
              </div>
              <h4 className="journal__list-item-title">{entry.title}</h4>
              <p className="journal__list-item-preview">{entry.content.slice(0, 100)}...</p>
              <div className="journal__list-item-tags">
                {entry.tags.map((tag) => (<span key={tag} className="journal__tag" style={{ '--tag-color': getTagColor(tag) }}>{tag}</span>))}
              </div>
            </motion.div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {selectedEntry && (
            <motion.div className="journal__detail" key={selectedEntry.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div className="journal__detail-header">
                <div className="journal__detail-meta">
                  <span className="journal__detail-date">{fmtDate(selectedEntry.date)} at {selectedEntry.time}</span>
                </div>
                <div className="journal__detail-actions">
                  <button className="journal__detail-action-btn" title="Edit" onClick={() => openCompose(selectedEntry)}><HiOutlinePencil size={16} /></button>
                  <div className="journal__context-wrapper">
                    <button className="journal__detail-action-btn" onClick={() => setContextMenuId(contextMenuId === selectedEntry.id ? null : selectedEntry.id)}><HiOutlineDotsVertical size={18} /></button>
                    <AnimatePresence>
                      {contextMenuId === selectedEntry.id && (
                        <motion.div className="journal__context-menu" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                          <button onClick={() => openCompose(selectedEntry)}><HiOutlinePencil size={14} /> Edit Entry</button>
                          <button className="journal__context-danger" onClick={() => handleDelete(selectedEntry.id)}><HiOutlineTrash size={14} /> Delete Entry</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
              <h2 className="journal__detail-title">{selectedEntry.title}</h2>
              <div className="journal__detail-tags">
                {selectedEntry.tags.map((tag) => (<span key={tag} className="journal__tag journal__tag--large" style={{ '--tag-color': getTagColor(tag) }}><HiOutlineTag size={11} /> {tag}</span>))}
              </div>

              {/* AI Actions */}
              <div className="journal__ai-actions">
                <button
                  className="journal__ai-action-btn"
                  onClick={handleAISummarize}
                  disabled={!isAIConfigured() || aiLoading}
                  title={isAIConfigured() ? 'Summarize this entry with AI' : 'Configure AI in Settings first'}
                >
                  <HiOutlineSparkles size={14} />
                  {aiLoading ? 'Analyzing…' : 'AI Summarize'}
                </button>
              </div>

              {/* AI Summary result */}
              {aiSummary && (
                <div className="journal__ai-badge">
                  <HiOutlineSparkles size={14} />
                  <div style={{ flex: 1 }}>
                    <span className="journal__ai-badge-label">AI Summary</span>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{aiSummary}</p>
                  </div>
                </div>
              )}

              {/* AI Error */}
              {aiError && (
                <div className="journal__ai-badge" style={{ borderColor: 'color-mix(in srgb, #f87171 25%, transparent)', background: 'color-mix(in srgb, #f87171 6%, transparent)' }}>
                  <span style={{ color: '#f87171', fontSize: 12 }}>Error: {aiError}</span>
                </div>
              )}

              <div className="journal__detail-content">
                {selectedEntry.content.split('\n').map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCompose(false)}>
            <motion.div className="journal__compose" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
              <div className="journal__compose-header">
                <h3><HiOutlinePencilAlt size={18} /> {editingEntry ? 'Edit Reflection' : 'New Reflection'}</h3>
                <button onClick={() => setShowCompose(false)}><HiOutlineX size={20} /></button>
              </div>
              <div className="journal__compose-body">
                <input type="text" className="journal__compose-title" placeholder="Give your reflection a title..." value={compTitle} onChange={(e) => setCompTitle(e.target.value)} />
                <div className="journal__compose-meta-row">
                  <select className="journal__compose-course" value={compCourse} onChange={(e) => setCompCourse(e.target.value)}>
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                  <div className="journal__compose-tag-input">
                    <HiOutlineTag size={14} />
                    <input type="text" placeholder="Add tag + Enter" value={compTagInput} onChange={(e) => setCompTagInput(e.target.value)} onKeyDown={handleAddTag} />
                  </div>
                </div>
                {compTags.length > 0 && (
                  <div className="journal__compose-tags">
                    {compTags.map((tag) => (
                      <span key={tag} className="journal__tag" style={{ '--tag-color': getTagColor(tag) }}>
                        {tag} <button onClick={() => removeCompTag(tag)}><HiOutlineX size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <textarea className="journal__compose-textarea" placeholder="Start writing your reflection..." rows={10} value={compContent} onChange={(e) => setCompContent(e.target.value)} />
              </div>
              <div className="journal__compose-footer">
                <button className="btn" onClick={() => setShowCompose(false)}>Cancel</button>
                <button className="btn btn--primary" onClick={handleSave} disabled={!compTitle.trim()}>{editingEntry ? 'Update Entry' : 'Save Entry'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
