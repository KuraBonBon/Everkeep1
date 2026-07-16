import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineClock,
  HiOutlinePlus,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineDotsCircleHorizontal,
  HiOutlineCalendar,
  HiOutlineAcademicCap,
  HiOutlineDocumentDownload,
  HiOutlineFilter,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineArchive,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineLightningBolt,
  HiOutlineUpload,
  HiOutlineDocumentText,
  HiOutlineMinus,
  HiOutlineArrowLeft,
} from 'react-icons/hi'
import useMilestoneStore from '../../stores/useMilestoneStore'
import useArtifactStore from '../../stores/useArtifactStore'
import useCategoryStore from '../../stores/useCategoryStore'
import useAIStore from '../../stores/useAIStore'
import { containerV, itemV } from '../../utils/animations'
import { fmtDateLong as fmtDate } from '../../utils/format'
import './Timeline.css'

const statusIcons = {
  completed: HiOutlineCheckCircle,
  'in-progress': HiOutlineExclamationCircle,
  upcoming: HiOutlineDotsCircleHorizontal,
}

const statusLabels = {
  completed: 'Completed',
  'in-progress': 'In Progress',
  upcoming: 'Upcoming',
}

const BLANK_MS = { title: '', description: '', date: '', course: '', status: 'upcoming', linkedArtifactIds: [], parentId: null }

/* ── Component ──────────────────────────────────────────────────── */
export default function Timeline() {
  const milestones = useMilestoneStore((s) => s.milestones)
  const addMilestone = useMilestoneStore((s) => s.addMilestone)
  const addMilestoneTree = useMilestoneStore((s) => s.addMilestoneTree)
  const updateMilestone = useMilestoneStore((s) => s.updateMilestone)
  const deleteMilestone = useMilestoneStore((s) => s.deleteMilestone)
  const reorderMilestone = useMilestoneStore((s) => s.reorderMilestone)
  const getTree = useMilestoneStore((s) => s.getTree)
  const globalStats = useMilestoneStore((s) => s.getStats)()
  const artifacts = useArtifactStore((s) => s.artifacts)
  const categories = useCategoryStore((s) => s.categories)

  const aiConfigured = useAIStore((s) => s.isConfigured)()
  const generateMilestoneTree = useAIStore((s) => s.generateMilestoneTree)
  const aiLoading = useAIStore((s) => s.isLoading)
  const aiError = useAIStore((s) => s.lastError)
  const cancelRequest = useAIStore((s) => s.cancelRequest)

  /* ── Project navigation ────────────────────────── */
  const [activeProject, setActiveProject] = useState(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [collapsed, setCollapsed] = useState({})

  /* modal state */
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK_MS)
  const [subSteps, setSubSteps] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(null)

  /* AI generation panel */
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiDocText, setAiDocText] = useState('')
  const [aiFileName, setAiFileName] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [aiCourse, setAiCourse] = useState('')
  const fileInputRef = useRef(null)

  /* ── Derived data ──────────────────────────────── */
  const projects = useMemo(() => milestones.filter((m) => !m.parentId), [milestones])
  const activeProjectData = useMemo(
    () => activeProject ? milestones.find((m) => m.id === activeProject) : null,
    [activeProject, milestones],
  )

  const isDescendantOf = (ms, parentId) => {
    let cur = ms.parentId
    while (cur) {
      if (cur === parentId) return true
      const parent = milestones.find((p) => p.id === cur)
      cur = parent?.parentId || null
    }
    return false
  }

  const getProjectStats = (projectId) => {
    const desc = milestones.filter((m) => isDescendantOf(m, projectId))
    const total = desc.length
    const completed = desc.filter((m) => m.status === 'completed').length
    const inProgress = desc.filter((m) => m.status === 'in-progress').length
    return { total, completed, inProgress, upcoming: total - completed - inProgress, progress: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }

  const stats = useMemo(() => {
    if (activeProject) return getProjectStats(activeProject)
    return globalStats
  }, [activeProject, milestones, globalStats])

  const toggleCollapse = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }))
  const getChildCount = (id) => milestones.filter((m) => m.parentId === id).length

  /* Build tree scoped to active project, apply status filter + collapse */
  const filtered = useMemo(() => {
    if (!activeProject) return []
    const tree = getTree()
    let list = tree.filter((m) => isDescendantOf(m, activeProject))
    const baseDepth = (tree.find((m) => m.id === activeProject)?.depth || 0) + 1
    list = list.map((m) => ({ ...m, depth: m.depth - baseDepth }))
    if (statusFilter !== 'all') list = list.filter((m) => m.status === statusFilter)
    return list.filter((m) => {
      let cur = m.parentId
      while (cur && cur !== activeProject) {
        if (collapsed[cur]) return false
        const parent = milestones.find((p) => p.id === cur)
        cur = parent?.parentId || null
      }
      return true
    })
  }, [milestones, statusFilter, getTree, collapsed, activeProject])

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') return projects
    return projects.filter((p) => p.status === statusFilter)
  }, [projects, statusFilter])

  /* ── Handlers ──────────────────────────────────── */
  const openAdd = (parentId = null) => {
    const effectiveParent = parentId || activeProject || null
    setEditing(null)
    setForm({ ...BLANK_MS, parentId: effectiveParent })
    setSubSteps([])
    setModalOpen(true)
  }
  const openEdit = (ms) => {
    setEditing(ms)
    setForm({
      title: ms.title, description: ms.description, date: ms.date,
      course: ms.course, status: ms.status,
      linkedArtifactIds: ms.linkedArtifactIds || [],
      parentId: ms.parentId || null,
    })
    setSubSteps([])
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(BLANK_MS); setSubSteps([]) }

  const handleSave = () => {
    if (!form.title.trim()) return
    if (editing) {
      updateMilestone(editing.id, form)
    } else if (subSteps.length > 0) {
      addMilestoneTree(form, subSteps.filter((s) => s.title.trim()))
    } else {
      addMilestone(form)
    }
    closeModal()
  }

  const addSubStep = () => setSubSteps((s) => [...s, { title: '', description: '', date: '' }])
  const updateSubStep = (idx, patch) => setSubSteps((s) => s.map((step, i) => i === idx ? { ...step, ...patch } : step))
  const removeSubStep = (idx) => setSubSteps((s) => s.filter((_, i) => i !== idx))

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAiFileName(file.name)
    try {
      const text = await file.text()
      setAiDocText(text)
    } catch {
      setAiDocText('')
      setAiFileName('')
    }
  }

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() && !aiDocText) return
    const result = await generateMilestoneTree(aiPrompt.trim(), aiDocText || undefined)
    if (result) setAiResult(result)
  }

  const handleAIAccept = (course = '') => {
    if (!aiResult) return
    const parent = {
      title: aiResult.parent.title,
      description: aiResult.parent.description || '',
      date: aiResult.parent.date || '',
      course,
      status: 'upcoming',
      linkedArtifactIds: [],
      parentId: null,
    }
    const children = (aiResult.children || []).map((c) => ({
      title: c.title,
      description: c.description || '',
      date: c.date || '',
      course,
      status: 'upcoming',
    }))
    addMilestoneTree(parent, children)
    setAiPanelOpen(false)
    setAiPrompt('')
    setAiDocText('')
    setAiFileName('')
    setAiResult(null)
    setAiCourse('')
  }

  const closeAIPanel = () => {
    if (aiLoading) cancelRequest()
    setAiPanelOpen(false)
    setAiPrompt('')
    setAiDocText('')
    setAiFileName('')
    setAiResult(null)
    setAiCourse('')
  }

  const handleDeleteConfirm = (id) => {
    deleteMilestone(id)
    setConfirmDelete(null)
    if (id === activeProject) setActiveProject(null)
  }

  const toggleArtifactLink = (artId) => {
    setForm((f) => {
      const has = f.linkedArtifactIds.includes(artId)
      return { ...f, linkedArtifactIds: has ? f.linkedArtifactIds.filter((x) => x !== artId) : [...f.linkedArtifactIds, artId] }
    })
  }

  const exportSummary = () => {
    const lines = ['MILESTONE TIMELINE SUMMARY', '='.repeat(40), '']
    const tree = getTree()
    const exportTree = activeProject
      ? tree.filter((m) => m.id === activeProject || isDescendantOf(m, activeProject))
      : tree
    exportTree.forEach((ms) => {
      const indent = '  '.repeat(ms.depth)
      lines.push(`${indent}[${statusLabels[ms.status]}] ${ms.title}`)
      lines.push(`${indent}  Deadline: ${ms.date}  |  Category: ${ms.course}`)
      if (ms.description) lines.push(`${indent}  ${ms.description}`)
      const linked = artifacts.filter((a) => (ms.linkedArtifactIds || []).includes(a.id))
      if (linked.length) {
        lines.push(`${indent}  Linked artifacts: ${linked.map((a) => a.title).join(', ')}`)
      }
      lines.push('')
    })
    lines.push(`Progress: ${stats.completed}/${stats.total} (${stats.progress}%)`)
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'milestone-summary.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  const getLinkedArtifacts = (ms) => artifacts.filter((a) => (ms.linkedArtifactIds || []).includes(a.id))

  return (
    <motion.div className="timeline-page" variants={containerV} initial="hidden" animate="visible">
      {/* ── Header ───────────────────────────────────── */}
      <motion.div className="timeline-page__header" variants={itemV}>
        <div>
          {activeProject && (
            <button className="timeline-page__back-btn" onClick={() => setActiveProject(null)}>
              <HiOutlineArrowLeft size={14} /> All Projects
            </button>
          )}
          <h1 className="timeline-page__title">
            {activeProject ? activeProjectData?.title || 'Project' : 'Milestone Timeline'}
          </h1>
          <p className="timeline-page__subtitle">
            {activeProject
              ? `${stats.completed} of ${stats.total} steps completed · ${stats.progress}% progress`
              : `${projects.length} project${projects.length !== 1 ? 's' : ''} · ${globalStats.completed} of ${globalStats.total} milestones completed`}
          </p>
        </div>
        <div className="timeline-page__header-actions">
          <button className="btn btn--outline" onClick={exportSummary}>
            <HiOutlineDocumentDownload size={16} /> Export
          </button>
          {aiConfigured && !activeProject && (
            <button className="btn btn--outline timeline-page__ai-btn" onClick={() => setAiPanelOpen(true)}>
              <HiOutlineLightningBolt size={16} /> AI Generate
            </button>
          )}
          <button className="btn btn--primary" onClick={() => openAdd()}>
            <HiOutlinePlus size={18} /> {activeProject ? 'Add Step' : 'Add Project'}
          </button>
        </div>
      </motion.div>

      {/* ── Progress bar (project detail only) ───────── */}
      {activeProject && (
        <motion.div className="timeline-page__progress-section" variants={itemV}>
          <div className="timeline-page__progress-labels">
            <span>Project Progress</span>
            <span className="timeline-page__progress-pct">{stats.progress}%</span>
          </div>
          <div className="timeline-page__progress-bar">
            <motion.div
              className="timeline-page__progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${stats.progress}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
          <div className="timeline-page__progress-stats">
            <div className="timeline-page__stat">
              <span className="timeline-page__stat-dot timeline-page__stat-dot--completed" />
              <span>Completed ({stats.completed})</span>
            </div>
            <div className="timeline-page__stat">
              <span className="timeline-page__stat-dot timeline-page__stat-dot--in-progress" />
              <span>In Progress ({stats.inProgress})</span>
            </div>
            <div className="timeline-page__stat">
              <span className="timeline-page__stat-dot timeline-page__stat-dot--upcoming" />
              <span>Upcoming ({stats.upcoming})</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Status filter ────────────────────────────── */}
      <motion.div className="timeline-page__filters" variants={itemV}>
        {['all', 'completed', 'in-progress', 'upcoming'].map((s) => (
          <button
            key={s}
            className={`timeline-page__filter-btn ${statusFilter === s ? 'timeline-page__filter-btn--active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : statusLabels[s] || s}
          </button>
        ))}
      </motion.div>

      {/* ── Project Cards (top-level view) ───────────── */}
      {!activeProject && (
        <>
          {filteredProjects.length === 0 ? (
            <motion.div className="timeline-page__empty" variants={itemV}>
              <HiOutlineClock size={36} />
              <p>{projects.length === 0 ? 'No projects yet. Create your first one!' : 'No projects match this filter.'}</p>
            </motion.div>
          ) : (
            <motion.div className="timeline-page__projects-grid" variants={containerV}>
              {filteredProjects.map((project) => {
                const pStats = getProjectStats(project.id)
                const StatusIcon = statusIcons[project.status]
                return (
                  <motion.div
                    key={project.id}
                    className={`timeline-page__project-card timeline-page__project-card--${project.status}`}
                    variants={itemV}
                    whileHover={{ y: -2 }}
                    onClick={() => setActiveProject(project.id)}
                  >
                    <div className="timeline-page__project-card-header">
                      <span className={`timeline__status-badge timeline__status-badge--${project.status}`}>
                        <StatusIcon size={12} /> {statusLabels[project.status]}
                      </span>
                      {project.course && (
                        <span className="timeline-page__project-course">
                          <HiOutlineAcademicCap size={11} /> {project.course}
                        </span>
                      )}
                    </div>
                    <h3 className="timeline-page__project-card-title">{project.title}</h3>
                    {project.description && (
                      <p className="timeline-page__project-card-desc">{project.description}</p>
                    )}
                    <div className="timeline-page__project-card-progress">
                      <div className="timeline-page__project-progress-bar">
                        <div
                          className="timeline-page__project-progress-fill"
                          style={{ width: `${pStats.progress}%` }}
                        />
                      </div>
                      <span className="timeline-page__project-progress-text">
                        {pStats.completed}/{pStats.total} steps · {pStats.progress}%
                      </span>
                    </div>
                    <div className="timeline-page__project-card-footer">
                      {project.date && (
                        <span className="timeline-page__project-date">
                          <HiOutlineCalendar size={11} /> {fmtDate(project.date)}
                        </span>
                      )}
                      <div className="timeline-page__project-card-actions">
                        <button className="timeline__card-btn" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(project) }}>
                          <HiOutlinePencil size={14} />
                        </button>
                        <button className="timeline__card-btn timeline__card-btn--danger" title="Delete" onClick={(e) => { e.stopPropagation(); setConfirmDelete(project) }}>
                          <HiOutlineTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </>
      )}

      {/* ── Step Timeline (inside a project) ──────────── */}
      {activeProject && (
        <>
          {filtered.length === 0 ? (
            <motion.div className="timeline-page__empty" variants={itemV}>
              <HiOutlineFilter size={36} />
              <p>{stats.total === 0 ? 'No steps yet. Add your first step!' : 'No steps match this filter.'}</p>
            </motion.div>
          ) : (
            <motion.div className="timeline" variants={itemV}>
              <div className="timeline__line" />
              <AnimatePresence mode="popLayout">
                {filtered.map((milestone, i) => {
                  const StatusIcon = statusIcons[milestone.status]
                  const linkedArts = getLinkedArtifacts(milestone)
                  const childCount = getChildCount(milestone.id)
                  const isCollapsed = collapsed[milestone.id]
                  const depth = milestone.depth || 0
                  return (
                    <motion.div
                      key={milestone.id}
                      className={`timeline__item timeline__item--${milestone.status}${depth > 0 ? ' timeline__item--child' : ''}`}
                      style={{ marginLeft: depth * 32 }}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                    >
                      <div className={`timeline__node timeline__node--${milestone.status}${depth > 0 ? ' timeline__node--sub' : ''}`}>
                        <StatusIcon size={depth > 0 ? 12 : 16} />
                      </div>
                      <div className="timeline__card">
                        <div className="timeline__card-header">
                          <div className="timeline__card-header-left">
                            {childCount > 0 && (
                              <button
                                className={`timeline__collapse-btn${isCollapsed ? ' timeline__collapse-btn--collapsed' : ''}`}
                                onClick={() => toggleCollapse(milestone.id)}
                                title={isCollapsed ? 'Expand' : 'Collapse'}
                              >
                                <HiOutlineChevronRight size={14} />
                              </button>
                            )}
                            <span className={`timeline__status-badge timeline__status-badge--${milestone.status}`}>
                              {statusLabels[milestone.status]}
                            </span>
                            {childCount > 0 && (
                              <span className="timeline__child-count">{childCount} sub</span>
                            )}
                            {depth > 0 && (
                              <span className="timeline__depth-indicator">Sub-step</span>
                            )}
                          </div>
                          <span className="timeline__date">
                            <HiOutlineCalendar size={12} /> Deadline: {fmtDate(milestone.date)}
                          </span>
                        </div>
                        <h4 className="timeline__card-title">{milestone.title}</h4>
                        <p className="timeline__card-desc">{milestone.description}</p>
                        {milestone.createdAt && (
                          <span className="timeline__created-at">
                            Created {fmtDate(new Date(milestone.createdAt).toISOString().slice(0, 10))}
                          </span>
                        )}
                        {linkedArts.length > 0 && (
                          <div className="timeline__linked-artifacts">
                            <HiOutlineArchive size={12} />
                            {linkedArts.map((a) => (
                              <span key={a.id} className="timeline__linked-tag">{a.title}</span>
                            ))}
                          </div>
                        )}
                        <div className="timeline__card-footer">
                          <span className="timeline__course">
                            <HiOutlineAcademicCap size={13} /> {milestone.course}
                          </span>
                          <div className="timeline__card-actions">
                            <button className="timeline__card-btn" title="Add sub-step" onClick={() => openAdd(milestone.id)}>
                              <HiOutlinePlus size={14} />
                            </button>
                            <button className="timeline__card-btn" title="Move up" onClick={() => reorderMilestone(milestone.id, -1)} disabled={i === 0}>
                              <HiOutlineChevronUp size={14} />
                            </button>
                            <button className="timeline__card-btn" title="Move down" onClick={() => reorderMilestone(milestone.id, 1)} disabled={i === filtered.length - 1}>
                              <HiOutlineChevronDown size={14} />
                            </button>
                            <button className="timeline__card-btn" title="Edit" onClick={() => openEdit(milestone)}>
                              <HiOutlinePencil size={14} />
                            </button>
                            <button className="timeline__card-btn timeline__card-btn--danger" title="Delete" onClick={() => setConfirmDelete(milestone)}>
                              <HiOutlineTrash size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}

      {/* ── Delete confirm ────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="timeline-page__modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              className="timeline-page__modal"
              style={{ maxWidth: 420 }}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="timeline-page__modal-header">
                <h3>Delete {confirmDelete.parentId ? 'Step' : 'Project'}</h3>
                <button onClick={() => setConfirmDelete(null)}><HiOutlineX size={18} /></button>
              </div>
              <div className="timeline-page__modal-body">
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Are you sure you want to delete <strong>{confirmDelete.title}</strong>?
                  {getChildCount(confirmDelete.id) > 0 && (
                    <> This will also delete <strong>{getChildCount(confirmDelete.id)} sub-step(s)</strong>.</>
                  )}{' '}
                  This cannot be undone.
                </p>
              </div>
              <div className="timeline-page__modal-footer">
                <button className="btn btn--outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="btn btn--danger" onClick={() => handleDeleteConfirm(confirmDelete.id)}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add / Edit Modal ─────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="timeline-page__modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="timeline-page__modal"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="timeline-page__modal-header">
                <h3>{editing ? 'Edit' : 'Add'} {form.parentId ? 'Step' : 'Project'}</h3>
                <button onClick={closeModal}><HiOutlineX size={18} /></button>
              </div>
              <div className="timeline-page__modal-body">
                <div className="timeline-page__modal-field">
                  <label>Title *</label>
                  <input
                    type="text"
                    placeholder={form.parentId ? 'Step title' : 'Project title'}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="timeline-page__modal-field">
                  <label>Description</label>
                  <textarea
                    rows={4}
                    placeholder={form.parentId ? 'What does this step involve?' : 'What is this project about?'}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="timeline-page__modal-row">
                  <div className="timeline-page__modal-field">
                    <label>Deadline</label>
                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="timeline-page__modal-field">
                    <label>Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="upcoming">Upcoming</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="timeline-page__modal-field">
                  <label>Category</label>
                  <select
                    value={form.course}
                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                  >
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                {artifacts.length > 0 && (
                  <div className="timeline-page__modal-field">
                    <label>Link Artifacts</label>
                    <div className="timeline-page__artifact-picker">
                      {artifacts.map((art) => (
                        <label key={art.id} className="timeline-page__artifact-option">
                          <input
                            type="checkbox"
                            checked={form.linkedArtifactIds.includes(art.id)}
                            onChange={() => toggleArtifactLink(art.id)}
                          />
                          <span>{art.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Sub-Steps Builder (new projects only) ── */}
                {!editing && !form.parentId && (
                  <div className="timeline-page__modal-field">
                    <label>Sub-Steps</label>
                    <div className="timeline-page__substeps">
                      {subSteps.map((step, idx) => (
                        <div key={idx} className="timeline-page__substep-row">
                          <span className="timeline-page__substep-num">{idx + 1}</span>
                          <input
                            type="text"
                            placeholder="Sub-step title"
                            value={step.title}
                            onChange={(e) => updateSubStep(idx, { title: e.target.value })}
                          />
                          <input
                            type="text"
                            placeholder="Brief description"
                            value={step.description}
                            onChange={(e) => updateSubStep(idx, { description: e.target.value })}
                          />
                          <input
                            type="date"
                            value={step.date}
                            onChange={(e) => updateSubStep(idx, { date: e.target.value })}
                          />
                          <button className="timeline-page__substep-remove" onClick={() => removeSubStep(idx)}>
                            <HiOutlineMinus size={14} />
                          </button>
                        </div>
                      ))}
                      <button className="timeline-page__substep-add" onClick={addSubStep}>
                        <HiOutlinePlus size={14} /> Add Sub-Step
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="timeline-page__modal-footer">
                <button className="btn btn--outline" onClick={closeModal}>Cancel</button>
                <button className="btn btn--primary" onClick={handleSave} disabled={!form.title.trim()}>
                  {editing ? 'Save Changes' : subSteps.length > 0 ? 'Create Project' : form.parentId ? 'Add Step' : 'Add Project'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Generation Panel ──────────────────────── */}
      <AnimatePresence>
        {aiPanelOpen && (
          <motion.div
            className="timeline-page__modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAIPanel}
          >
            <motion.div
              className="timeline-page__modal timeline-page__modal--wide"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="timeline-page__modal-header">
                <h3><HiOutlineLightningBolt size={18} /> Generate Project with AI</h3>
                <button onClick={closeAIPanel}><HiOutlineX size={18} /></button>
              </div>
              <div className="timeline-page__modal-body">
                {!aiResult ? (
                  <>
                    <p className="timeline-page__ai-hint">
                      Describe your goal or project — the AI will create a project timeline with sub-steps.
                      You can also upload a document for context.
                    </p>
                    <div className="timeline-page__modal-field">
                      <label>Prompt *</label>
                      <textarea
                        rows={5}
                        placeholder="e.g. Build a thesis on machine learning — from proposal to defense"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        disabled={aiLoading}
                      />
                    </div>
                    <div className="timeline-page__modal-field">
                      <label>Upload Document (optional)</label>
                      <div className="timeline-page__ai-upload">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.md,.csv,.pdf,.docx,.doc"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                        />
                        <button
                          className="btn btn--outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={aiLoading}
                        >
                          <HiOutlineUpload size={14} /> {aiFileName || 'Choose File'}
                        </button>
                        {aiFileName && (
                          <span className="timeline-page__ai-file-name">
                            <HiOutlineDocumentText size={14} /> {aiFileName}
                            <button onClick={() => { setAiDocText(''); setAiFileName('') }}>
                              <HiOutlineX size={12} />
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                    {aiError && (
                      <div className="timeline-page__ai-error">{aiError}</div>
                    )}
                    {aiLoading && (
                      <div className="timeline-page__ai-loading">
                        <span className="timeline-page__ai-spinner" />
                        Generating project timeline…
                      </div>
                    )}
                  </>
                ) : (
                  <div className="timeline-page__ai-preview">
                    <div className="timeline-page__ai-parent">
                      <span className="timeline-page__ai-label">Project</span>
                      <h4>{aiResult.parent.title}</h4>
                      <p>{aiResult.parent.description}</p>
                      {aiResult.parent.date && <span className="timeline-page__ai-date"><HiOutlineCalendar size={12} /> {aiResult.parent.date}</span>}
                    </div>
                    <div className="timeline-page__ai-children">
                      <span className="timeline-page__ai-label">Steps ({aiResult.children.length})</span>
                      {aiResult.children.map((c, i) => (
                        <div key={i} className="timeline-page__ai-child">
                          <span className="timeline-page__substep-num">{i + 1}</span>
                          <div>
                            <strong>{c.title}</strong>
                            <p>{c.description}</p>
                            {c.date && <span className="timeline-page__ai-date"><HiOutlineCalendar size={12} /> {c.date}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="timeline-page__modal-field">
                      <label>Assign Category (optional)</label>
                      <select value={aiCourse} onChange={(e) => setAiCourse(e.target.value)}>
                        <option value="">No category</option>
                        {categories.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="timeline-page__modal-footer">
                {!aiResult ? (
                  <>
                    <button className="btn btn--outline" onClick={closeAIPanel} disabled={aiLoading}>Cancel</button>
                    {aiLoading ? (
                      <button className="btn btn--outline" onClick={cancelRequest}>
                        Cancel Generation
                      </button>
                    ) : (
                      <button
                        className="btn btn--primary"
                        onClick={handleAIGenerate}
                        disabled={!aiPrompt.trim() && !aiDocText}
                      >
                        <HiOutlineLightningBolt size={14} /> Generate Project
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button className="btn btn--outline" onClick={() => setAiResult(null)}>Back</button>
                    <button
                      className="btn btn--primary"
                      onClick={() => handleAIAccept(aiCourse)}
                    >
                      <HiOutlineCheckCircle size={14} /> Accept &amp; Create
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
