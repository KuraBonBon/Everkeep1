import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlinePencilAlt,
  HiOutlineX,
  HiOutlineTag,
  HiOutlinePlus,
  HiOutlineCash,
  HiOutlineClock,
  HiOutlineArchive,
  HiOutlineCloudUpload,
} from 'react-icons/hi'
import useJournalStore from '../../stores/useJournalStore'
import useFinanceStore from '../../stores/useFinanceStore'
import useMilestoneStore from '../../stores/useMilestoneStore'
import useArtifactStore from '../../stores/useArtifactStore'
import useCategoryStore from '../../stores/useCategoryStore'
import useTutorialStore from '../../stores/useTutorialStore'
import './QuickCapture.css'

const MODES = [
  { id: 'journal', label: 'Journal', icon: HiOutlinePencilAlt },
  { id: 'finance', label: 'Finance', icon: HiOutlineCash },
  { id: 'milestone', label: 'Milestone', icon: HiOutlineClock },
  { id: 'artifact', label: 'Artifact', icon: HiOutlineArchive },
]

export default function QuickCapture() {
  const addEntry = useJournalStore((s) => s.addEntry)
  const addTransaction = useFinanceStore((s) => s.addTransaction)
  const addMilestone = useMilestoneStore((s) => s.addMilestone)
  const addArtifact = useArtifactStore((s) => s.addArtifact)
  const categories = useCategoryStore((s) => s.categories)
  const budgetCategories = useFinanceStore((s) => s.budgetCategories)
  const tutorialActive = useTutorialStore((s) => s.tutorialActive)

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('journal')

  /* Journal fields */
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState([])
  const [course, setCourse] = useState('')

  /* Finance fields */
  const [txType, setTxType] = useState('expense')
  const [txAmount, setTxAmount] = useState('')
  const [txCategory, setTxCategory] = useState('food')
  const [txDesc, setTxDesc] = useState('')

  /* Milestone fields */
  const [msTitle, setMsTitle] = useState('')
  const [msDesc, setMsDesc] = useState('')
  const [msDate, setMsDate] = useState(new Date().toISOString().slice(0, 10))

  /* Artifact fields */
  const [artTitle, setArtTitle] = useState('')
  const [artDesc, setArtDesc] = useState('')
  const [artType, setArtType] = useState('document')
  const [artFile, setArtFile] = useState(null)
  const artFileRef = useRef(null)

  const reset = () => {
    setTitle(''); setContent(''); setTagInput(''); setTags([]); setCourse('')
    setTxType('expense'); setTxAmount(''); setTxCategory('food'); setTxDesc('')
    setMsTitle(''); setMsDesc(''); setMsDate(new Date().toISOString().slice(0, 10))
    setArtTitle(''); setArtDesc(''); setArtType('document'); setArtFile(null)
  }

  const handleArtFile = useCallback((file) => {
    if (!file) return
    setArtFile(file)
    const mime = file.type || ''
    let autoType = 'document'
    if (mime.startsWith('image/')) autoType = 'image'
    else if (mime.includes('javascript') || mime.includes('json') || mime.includes('xml') || mime.includes('html') || mime.includes('css') || mime.includes('python') || mime.includes('java')) autoType = 'code'
    else if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) autoType = 'folder'
    setArtType(autoType)
    if (!artTitle.trim()) setArtTitle(file.name.replace(/\.[^.]+$/, ''))
  }, [artTitle])

  const handleSave = async () => {
    if (mode === 'journal') {
      if (!title.trim()) return
      addEntry({ title: title.trim(), content: content.trim(), tags, course })
    } else if (mode === 'finance') {
      if (!txAmount || parseFloat(txAmount) <= 0) return
      addTransaction({ type: txType, amount: txAmount, category: txCategory, description: txDesc, date: new Date().toISOString().slice(0, 10) })
    } else if (mode === 'milestone') {
      if (!msTitle.trim()) return
      addMilestone({ title: msTitle.trim(), description: msDesc.trim(), date: msDate, course: '', status: 'upcoming' })
    } else if (mode === 'artifact') {
      if (!artTitle.trim()) return
      await addArtifact({ title: artTitle.trim(), description: artDesc.trim(), type: artType }, artFile || undefined)
    }
    reset()
    setOpen(false)
  }

  const canSave = mode === 'journal' ? title.trim() : mode === 'finance' ? txAmount && parseFloat(txAmount) > 0 : mode === 'milestone' ? msTitle.trim() : artTitle.trim()

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const t = tagInput.trim()
      if (!tags.includes(t)) setTags([...tags, t])
      setTagInput('')
    }
  }

  return (
    <>
      {/* FAB — hidden during guided tour */}
      <AnimatePresence>
        {!open && !tutorialActive && (
          <motion.button
            className="quick-capture__fab"
            onClick={() => setOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Quick Capture"
          >
            <HiOutlinePlus size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="quick-capture__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { reset(); setOpen(false) }}
          >
            <motion.div
              className="quick-capture__panel"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="quick-capture__header">
                <h4><HiOutlinePlus size={16} /> Quick Capture</h4>
                <button onClick={() => { reset(); setOpen(false) }}><HiOutlineX size={18} /></button>
              </div>

              {/* Mode tabs */}
              <div className="quick-capture__tabs">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    className={`quick-capture__tab ${mode === m.id ? 'quick-capture__tab--active' : ''}`}
                    onClick={() => setMode(m.id)}
                 >
                    <m.icon size={14} /> {m.label}
                  </button>
                ))}
              </div>

              {/* Journal form */}
              {mode === 'journal' && (
                <>
                  <input
                    className="quick-capture__title"
                    placeholder="Title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                  />
                  <textarea
                    className="quick-capture__content"
                    placeholder="Write something quick..."
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  <div className="quick-capture__meta">
                    <select value={course} onChange={(e) => setCourse(e.target.value)} className="quick-capture__course">
                      <option value="">No category</option>
                      {categories.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                    </select>
                    <div className="quick-capture__tag-input">
                      <HiOutlineTag size={13} />
                      <input placeholder="Tag + Enter" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} />
                    </div>
                  </div>
                  {tags.length > 0 && (
                    <div className="quick-capture__tags">
                      {tags.map((t) => (
                        <span key={t} className="quick-capture__tag">
                          {t}
                          <button onClick={() => setTags(tags.filter((x) => x !== t))}><HiOutlineX size={10} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Finance form */}
              {mode === 'finance' && (
                <>
                  <div className="quick-capture__row">
                    <select value={txType} onChange={(e) => setTxType(e.target.value)} className="quick-capture__course">
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <input
                      className="quick-capture__title"
                      type="number"
                      placeholder="Amount"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      autoFocus
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <input
                    className="quick-capture__title"
                    placeholder="Description..."
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                  />
                  <select value={txCategory} onChange={(e) => setTxCategory(e.target.value)} className="quick-capture__course">
                    {budgetCategories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </>
              )}

              {/* Milestone form */}
              {mode === 'milestone' && (
                <>
                  <input
                    className="quick-capture__title"
                    placeholder="Milestone title..."
                    value={msTitle}
                    onChange={(e) => setMsTitle(e.target.value)}
                    autoFocus
                  />
                  <textarea
                    className="quick-capture__content"
                    placeholder="Description..."
                    rows={2}
                    value={msDesc}
                    onChange={(e) => setMsDesc(e.target.value)}
                  />
                  <input
                    type="date"
                    className="quick-capture__title"
                    value={msDate}
                    onChange={(e) => setMsDate(e.target.value)}
                  />
                </>
              )}

              {/* Artifact form */}
              {mode === 'artifact' && (
                <>
                  <div
                    className={`quick-capture__file-picker ${artFile ? 'quick-capture__file-picker--has-file' : ''}`}
                    onClick={() => artFileRef.current?.click()}
                  >
                    <input
                      ref={artFileRef}
                      type="file"
                      style={{ display: 'none' }}
                      onChange={(e) => { handleArtFile(e.target.files?.[0]); e.target.value = '' }}
                    />
                    {artFile ? (
                      <>
                        <HiOutlineArchive size={16} />
                        <div className="quick-capture__file-picker-info">
                          <span className="quick-capture__file-picker-name">{artFile.name}</span>
                          <span className="quick-capture__file-picker-size">{(artFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <button className="quick-capture__file-picker-remove" onClick={(e) => { e.stopPropagation(); setArtFile(null) }}>
                          <HiOutlineX size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <HiOutlineCloudUpload size={16} />
                        <span>Attach a file (optional)</span>
                      </>
                    )}
                  </div>
                  <input
                    className="quick-capture__title"
                    placeholder="Artifact title..."
                    value={artTitle}
                    onChange={(e) => setArtTitle(e.target.value)}
                    autoFocus
                  />
                  <textarea
                    className="quick-capture__content"
                    placeholder="Description..."
                    rows={2}
                    value={artDesc}
                    onChange={(e) => setArtDesc(e.target.value)}
                  />
                  <select value={artType} onChange={(e) => setArtType(e.target.value)} className="quick-capture__course">
                    <option value="document">Document</option>
                    <option value="image">Image</option>
                    <option value="code">Code</option>
                    <option value="link">Link</option>
                    <option value="other">Other</option>
                  </select>
                </>
              )}

              <button
                className="quick-capture__save"
                onClick={handleSave}
                disabled={!canSave}
              >
                {mode === 'journal' ? 'Save Entry' : mode === 'finance' ? 'Save Transaction' : mode === 'milestone' ? 'Save Milestone' : 'Save Artifact'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
