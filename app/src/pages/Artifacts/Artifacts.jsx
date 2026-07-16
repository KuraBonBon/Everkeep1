import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineArchive,
  HiOutlineSearch,
  HiOutlineViewGrid,
  HiOutlineViewList,
  HiOutlineDocumentText,
  HiOutlinePhotograph,
  HiOutlineLink,
  HiOutlineCode,
  HiOutlineFolder,
  HiOutlineEye,
  HiOutlineX,
  HiOutlinePlus,
  HiOutlineFilter,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineFlag,
  HiOutlineCloudUpload,
  HiOutlineDownload,
  HiOutlineChevronRight,
  HiOutlineFolderAdd,
} from 'react-icons/hi'
import useArtifactStore from '../../stores/useArtifactStore'
import useMilestoneStore from '../../stores/useMilestoneStore'
import useCategoryStore from '../../stores/useCategoryStore'
import { containerV, itemV } from '../../utils/animations'
import { fmtDate, fmtBytes } from '../../utils/format'
import { typeColors } from '../../constants/colors'
import './Artifacts.css'

/* ── Helpers ─────────────────────────────────────────────────────── */
const typeIcons = {
  document: HiOutlineDocumentText,
  image: HiOutlinePhotograph,
  link: HiOutlineLink,
  code: HiOutlineCode,
  folder: HiOutlineFolder,
}

const BLANK = { title: '', type: 'document', course: '', date: '', size: '', description: '', linkedMilestoneId: '', url: '' }
const typeMap = {
  Documents: 'document',
  Images: 'image',
  Code: 'code',
  Links: 'link',
  Folders: 'folder',
}



/* ── Mime → type helper ─────────────────────────────────────────── */
function mimeToType(mime) {
  if (!mime) return 'document'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'link'
  if (mime.includes('pdf') || mime.includes('word') || mime.includes('presentation') || mime.includes('spreadsheet') || mime.includes('text/')) return 'document'
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return 'folder'
  if (mime.includes('javascript') || mime.includes('json') || mime.includes('xml') || mime.includes('html') || mime.includes('css')) return 'code'
  return 'document'
}

/* ── Component ──────────────────────────────────────────────────── */
export default function Artifacts() {
  const artifacts = useArtifactStore((s) => s.artifacts)
  const addArtifact = useArtifactStore((s) => s.addArtifact)
  const updateArtifact = useArtifactStore((s) => s.updateArtifact)
  const deleteArtifact = useArtifactStore((s) => s.deleteArtifact)
  const deleteArtifacts = useArtifactStore((s) => s.deleteArtifacts)
  const downloadFile = useArtifactStore((s) => s.downloadFile)
  const getFile = useArtifactStore((s) => s.getFile)
  const moveArtifact = useArtifactStore((s) => s.moveArtifact)
  const getBreadcrumb = useArtifactStore((s) => s.getBreadcrumb)
  const milestones = useMilestoneStore((s) => s.milestones)
  const categories = useCategoryStore((s) => s.categories)

  const [viewMode, setViewMode] = useState('grid')
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState('All')
  const [preview, setPreview] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [currentFolderId, setCurrentFolderId] = useState(null)

  /* Add/Edit modal */
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [folderModal, setFolderModal] = useState(false)
  const [folderName, setFolderName] = useState('')
  const fileInputRef = useRef(null)

  const typeFilters = ['All', 'Documents', 'Images', 'Code', 'Links', 'Folders']

  /* Filter + search */
  const filtered = useMemo(() => {
    let list = [...artifacts]
    /* Scope to current folder */
    list = list.filter((a) => (a.parentId || null) === currentFolderId)
    if (activeType !== 'All') {
      const mapped = typeMap[activeType]
      list = list.filter((a) => a.type === mapped)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.course.toLowerCase().includes(q)
      )
    }
    return list
  }, [artifacts, activeType, search, currentFolderId])

  /* Breadcrumb trail for current folder */
  const breadcrumb = useMemo(() => getBreadcrumb(currentFolderId), [currentFolderId, getBreadcrumb])

  /* Stats from store */
  const stats = useArtifactStore((s) => s.getStats)()
  const typeCounts = useMemo(() => {
    const counts = {}
    artifacts.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1
    })
    return counts
  }, [artifacts])

  /* Thumbnail URLs for image cards */
  const [thumbUrls, setThumbUrls] = useState({})
  useEffect(() => {
    let cancelled = false
    const imageArts = filtered.filter((a) => a.type === 'image' && a.fileKey && !thumbUrls[a.id])
    if (imageArts.length === 0) return
    ;(async () => {
      const newUrls = {}
      for (const art of imageArts) {
        if (cancelled) break
        const fileData = await getFile(art.id)
        if (fileData) newUrls[art.id] = URL.createObjectURL(fileData.blob)
      }
      if (!cancelled) setThumbUrls((prev) => ({ ...prev, ...newUrls }))
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.map((a) => a.id).join(',')])

  /* Clean up thumbnail object URLs on unmount */
  useEffect(() => {
    return () => {
      Object.values(thumbUrls).forEach((url) => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* handlers */
  const openAdd = () => { setEditing(null); setForm(BLANK); setSelectedFile(null); setModalOpen(true) }
  const createFolder = () => {
    if (!folderName.trim()) return
    addArtifact({ title: folderName.trim(), type: 'folder', description: '', course: '', date: new Date().toISOString().slice(0, 10), size: '', parentId: currentFolderId, linkedMilestoneId: null })
    setFolderName('')
    setFolderModal(false)
  }
  const openEdit = (art) => {
    setEditing(art)
    setForm({
      title: art.title, type: art.type, course: art.course,
      date: art.date, size: art.size, description: art.description,
      linkedMilestoneId: art.linkedMilestoneId || '',
      url: art.url || '',
    })
    setSelectedFile(null)
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(BLANK); setSelectedFile(null); setDragOver(false) }

  /* File selection via input or drag-and-drop */
  const handleFileSelect = useCallback((file) => {
    if (!file) return
    setSelectedFile(file)
    const autoType = mimeToType(file.type)
    setForm((f) => ({
      ...f,
      type: autoType,
      size: fmtBytes(file.size),
      title: f.title || file.name.replace(/\.[^.]+$/, ''),
    }))
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const onDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true) }, [])
  const onDragLeave = useCallback(() => setDragOver(false), [])

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const data = { ...form, linkedMilestoneId: form.linkedMilestoneId || null }
      if (editing) {
        updateArtifact(editing.id, data)
      } else {
        data.parentId = currentFolderId
        await addArtifact(data, selectedFile || undefined)
      }
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id) => {
    deleteArtifact(id)
    setConfirmDelete(null)
    if (preview?.id === id) setPreview(null)
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAll = () => setSelectedIds(new Set(filtered.map((a) => a.id)))
  const deselectAll = () => setSelectedIds(new Set())
  const handleBulkDelete = async () => {
    await deleteArtifacts([...selectedIds])
    setSelectedIds(new Set())
    setConfirmBulkDelete(false)
    if (preview && selectedIds.has(preview.id)) setPreview(null)
  }

  /* Preview with file blob loading */
  const openPreview = async (art) => {
    setPreview(art)
    setPreviewUrl(null)
    if (art.fileKey && art.fileMime?.startsWith('image/')) {
      const fileData = await getFile(art.id)
      if (fileData) setPreviewUrl(URL.createObjectURL(fileData.blob))
    }
  }
  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreview(null)
  }

  const getMilestoneName = (id) => milestones.find((m) => m.id === id)?.title || null

  return (
    <motion.div className="artifacts" variants={containerV} initial="hidden" animate="visible">
      {/* ── Header ─────────────────────────────────────── */}
      <motion.div className="artifacts__header" variants={itemV}>
        <div>
          <h1 className="artifacts__title">Artifact Vault</h1>
          <p className="artifacts__subtitle">
            {stats.total} artifacts · {stats.thisWeek} added this week
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn--outline" onClick={() => { setFolderName(''); setFolderModal(true) }}>
            <HiOutlineFolderAdd size={18} /> New Folder
          </button>
          <button className="btn btn--primary" onClick={openAdd}>
            <HiOutlinePlus size={18} /> Add Artifact
          </button>
        </div>
      </motion.div>

      {/* ── Breadcrumb ─────────────────────────────────── */}
      {currentFolderId && (
        <motion.div className="artifacts__breadcrumb" variants={itemV}>
          <button className="artifacts__breadcrumb-item" onClick={() => setCurrentFolderId(null)}>
            Vault
          </button>
          {breadcrumb.map((folder) => (
            <span key={folder.id} className="artifacts__breadcrumb-seg">
              <HiOutlineChevronRight size={12} />
              <button className="artifacts__breadcrumb-item" onClick={() => setCurrentFolderId(folder.id)}>
                {folder.title}
              </button>
            </span>
          ))}
        </motion.div>
      )}

      {/* ── Stats strip ────────────────────────────────── */}
      <motion.div className="artifacts__stats-strip" variants={itemV}>
        {/* eslint-disable-next-line no-unused-vars */}
        {Object.entries(typeIcons).map(([type, Icon]) => (
          <div key={type} className="artifacts__stat-chip" style={{ '--chip-color': typeColors[type] }}>
            <Icon size={16} />
            <span className="artifacts__stat-chip-count">{typeCounts[type] || 0}</span>
            <span className="artifacts__stat-chip-label">{type}s</span>
          </div>
        ))}
      </motion.div>

      {/* ── Toolbar ────────────────────────────────────── */}
      <motion.div className="artifacts__toolbar" variants={itemV}>
        <div className="artifacts__search">
          <HiOutlineSearch size={16} className="artifacts__search-icon" />
          <input
            type="text"
            placeholder="Search artifacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="artifacts__search-clear" onClick={() => setSearch('')}>
              <HiOutlineX size={14} />
            </button>
          )}
        </div>
        <div className="artifacts__toolbar-right">
          <div className="artifacts__type-filters">
            {typeFilters.map((filter) => (
              <button
                key={filter}
                className={`artifacts__type-btn ${activeType === filter ? 'artifacts__type-btn--active' : ''}`}
                onClick={() => setActiveType(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="artifacts__view-toggle">
            <button
              className={`artifacts__view-btn ${viewMode === 'grid' ? 'artifacts__view-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <HiOutlineViewGrid size={16} />
            </button>
            <button
              className={`artifacts__view-btn ${viewMode === 'list' ? 'artifacts__view-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <HiOutlineViewList size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Batch Actions Bar ──────────────────────────── */}
      {filtered.length > 0 && (
        <motion.div className="artifacts__batch-bar" variants={itemV}>
          <label className="artifacts__batch-toggle">
            <input
              type="checkbox"
              checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
              onChange={() => selectedIds.size === filtered.length ? deselectAll() : selectAll()}
            />
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
          </label>
          {selectedIds.size > 0 && (
            <>
              <button className="btn btn--outline btn--sm" onClick={deselectAll}>Deselect</button>
              <button className="btn btn--danger btn--sm" onClick={() => setConfirmBulkDelete(true)}>
                <HiOutlineTrash size={14} /> Delete Selected ({selectedIds.size})
              </button>
            </>
          )}
        </motion.div>
      )}

      {/* ── Grid / List ────────────────────────────────── */}
      {filtered.length === 0 ? (
        <motion.div className="artifacts__empty" variants={itemV}>
          <HiOutlineFilter size={36} />
          <p>No artifacts match your search.</p>
          <span>Try a different keyword or clear your filters.</span>
        </motion.div>
      ) : (
        <motion.div
          className={`artifacts__grid ${viewMode === 'list' ? 'artifacts__grid--list' : ''}`}
          variants={itemV}
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((artifact, i) => {
              const Icon = typeIcons[artifact.type] || HiOutlineArchive
              const color = typeColors[artifact.type] || '#818cf8'
              const linkedMs = getMilestoneName(artifact.linkedMilestoneId)
              return (
                <motion.div
                  key={artifact.id}
                  className="artifact-card"
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}
                  onClick={() => artifact.type === 'folder' ? setCurrentFolderId(artifact.id) : openPreview(artifact)}
                >
                  <input
                    type="checkbox"
                    className="artifact-card__select-cb"
                    checked={selectedIds.has(artifact.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(artifact.id)}
                  />
                  <div className="artifact-card__icon-area" style={{ '--artifact-color': color }}>
                    {artifact.type === 'image' && thumbUrls[artifact.id] ? (
                      <img src={thumbUrls[artifact.id]} alt={artifact.title} className="artifact-card__thumb" />
                    ) : (
                      <Icon size={28} />
                    )}
                    <span className="artifact-card__type-badge">{artifact.type}</span>
                  </div>
                  <div className="artifact-card__body">
                    <h4 className="artifact-card__title">{artifact.title}</h4>
                    {artifact.type === 'link' && artifact.url && (
                      <div className="artifact-card__link-badge">
                        <HiOutlineLink size={12} /> {(() => { try { return new URL(artifact.url).hostname } catch { return artifact.url } })()}
                      </div>
                    )}
                    <p className="artifact-card__desc">{artifact.description}</p>
                    {linkedMs && (
                      <div className="artifact-card__link-badge">
                        <HiOutlineFlag size={12} /> {linkedMs}
                      </div>
                    )}
                    <div className="artifact-card__meta">
                      <span className="artifact-card__course">{artifact.course}</span>
                      <span className="artifact-card__dot">·</span>
                      <span>{fmtDate(artifact.date)}</span>
                      <span className="artifact-card__dot">·</span>
                      <span>{artifact.size}</span>
                    </div>
                  </div>
                  <div className="artifact-card__actions" onClick={(e) => e.stopPropagation()}>
                    {artifact.type !== 'folder' && (
                      <button className="artifact-card__action" title="Preview" onClick={() => openPreview(artifact)}>
                        <HiOutlineEye size={16} />
                      </button>
                    )}
                    {artifact.type === 'folder' && (
                      <button className="artifact-card__action" title="Open Folder" onClick={() => setCurrentFolderId(artifact.id)}>
                        <HiOutlineFolder size={16} />
                      </button>
                    )}
                    {artifact.fileKey && (
                      <button className="artifact-card__action" title="Download" onClick={() => downloadFile(artifact.id)}>
                        <HiOutlineDownload size={16} />
                      </button>
                    )}
                    <button className="artifact-card__action" title="Edit" onClick={() => openEdit(artifact)}>
                      <HiOutlinePencil size={16} />
                    </button>
                    <button className="artifact-card__action artifact-card__action--danger" title="Delete" onClick={() => setConfirmDelete(artifact)}>
                      <HiOutlineTrash size={16} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Preview modal ──────────────────────────────── */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="artifacts__upload-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePreview}
          >
            <motion.div
              className="artifacts__preview"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="artifacts__preview-header">
                <div className="artifacts__preview-icon" style={{ color: typeColors[preview.type] }}>
                  {(() => { const I = typeIcons[preview.type] || HiOutlineArchive; return <I size={24} /> })()}
                </div>
                <div>
                  <h3>{preview.title}</h3>
                  <span className="artifacts__preview-meta">{preview.course} · {fmtDate(preview.date)} · {preview.size}</span>
                </div>
                <button className="artifacts__preview-close" onClick={closePreview}>
                  <HiOutlineX size={20} />
                </button>
              </div>
              <div className="artifacts__preview-body">
                {/* Inline image preview */}
                {previewUrl && (
                  <div className="artifacts__preview-image-wrap">
                    <img src={previewUrl} alt={preview.title} className="artifacts__preview-image" />
                  </div>
                )}
                <p>{preview.description}</p>
                {preview.type === 'link' && preview.url && (
                  <div className="artifacts__preview-file-info">
                    <HiOutlineLink size={16} />
                    <a href={preview.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', wordBreak: 'break-all' }}>
                      {preview.url}
                    </a>
                  </div>
                )}
                {preview.fileName && (
                  <div className="artifacts__preview-file-info">
                    <HiOutlineDocumentText size={16} />
                    <span>{preview.fileName}</span>
                    <span className="artifacts__preview-file-size">{preview.size}</span>
                  </div>
                )}
                {getMilestoneName(preview.linkedMilestoneId) && (
                  <div className="artifacts__preview-linked">
                    <HiOutlineFlag size={16} />
                    <span>Linked milestone: <strong>{getMilestoneName(preview.linkedMilestoneId)}</strong></span>
                  </div>
                )}
                <div className="artifacts__preview-detail-grid">
                  <div className="artifacts__preview-detail"><strong>Type</strong><span>{preview.type}</span></div>
                  <div className="artifacts__preview-detail"><strong>Category</strong><span>{preview.course}</span></div>
                  <div className="artifacts__preview-detail"><strong>Date</strong><span>{fmtDate(preview.date)}</span></div>
                  <div className="artifacts__preview-detail"><strong>Size</strong><span>{preview.size}</span></div>
                </div>
                {preview.fileKey && (
                  <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={() => downloadFile(preview.id)}>
                    <HiOutlineDownload size={16} /> Download File
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirm ─────────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="artifacts__upload-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              className="artifacts__upload"
              style={{ maxWidth: 420 }}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="artifacts__upload-header">
                <h3>Delete Artifact</h3>
                <button className="artifacts__preview-close" onClick={() => setConfirmDelete(null)}>
                  <HiOutlineX size={18} />
                </button>
              </div>
              <div className="artifacts__upload-body">
                <p>Are you sure you want to delete <strong>{confirmDelete.title}</strong>? This action cannot be undone.</p>
              </div>
              <div className="artifacts__upload-footer">
                <button className="btn btn--outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="btn btn--danger" onClick={() => handleDelete(confirmDelete.id)}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk Delete confirm ────────────────────────── */}
      <AnimatePresence>
        {confirmBulkDelete && (
          <motion.div
            className="artifacts__upload-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmBulkDelete(false)}
          >
            <motion.div
              className="artifacts__upload"
              style={{ maxWidth: 420 }}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="artifacts__upload-header">
                <h3>Delete {selectedIds.size} Artifact{selectedIds.size > 1 ? 's' : ''}</h3>
                <button className="artifacts__preview-close" onClick={() => setConfirmBulkDelete(false)}>
                  <HiOutlineX size={18} />
                </button>
              </div>
              <div className="artifacts__upload-body">
                <p>Are you sure you want to delete <strong>{selectedIds.size} selected artifact{selectedIds.size > 1 ? 's' : ''}</strong>? This action cannot be undone.</p>
              </div>
              <div className="artifacts__upload-footer">
                <button className="btn btn--outline" onClick={() => setConfirmBulkDelete(false)}>Cancel</button>
                <button className="btn btn--danger" onClick={handleBulkDelete}>Delete All</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New Folder modal ───────────────────────── */}
      <AnimatePresence>
        {folderModal && (
          <motion.div
            className="artifacts__upload-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFolderModal(false)}
          >
            <motion.div
              className="artifacts__upload"
              style={{ maxWidth: 420 }}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="artifacts__upload-header">
                <h3><HiOutlineFolderAdd size={18} /> New Folder</h3>
                <button className="artifacts__preview-close" onClick={() => setFolderModal(false)}>
                  <HiOutlineX size={18} />
                </button>
              </div>
              <div className="artifacts__upload-body">
                <input
                  className="artifacts__upload-input"
                  type="text"
                  placeholder="Folder name"
                  value={folderName}
                  autoFocus
                  onChange={(e) => setFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createFolder() }}
                />
              </div>
              <div className="artifacts__upload-footer">
                <button className="btn btn--outline" onClick={() => setFolderModal(false)}>Cancel</button>
                <button className="btn btn--primary" onClick={createFolder} disabled={!folderName.trim()}>Create Folder</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add / Edit modal ─────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="artifacts__upload-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="artifacts__upload"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="artifacts__upload-header">
                <h3>{editing ? 'Edit Artifact' : 'Add Artifact'}</h3>
                <button className="artifacts__preview-close" onClick={closeModal}>
                  <HiOutlineX size={18} />
                </button>
              </div>
              <div className="artifacts__upload-body">
                {/* ── File dropzone (only for new artifacts) ── */}
                {!editing && (
                  <div
                    className={`artifacts__upload-dropzone ${dragOver ? 'artifacts__upload-dropzone--active' : ''} ${selectedFile ? 'artifacts__upload-dropzone--has-file' : ''}`}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      style={{ display: 'none' }}
                      onChange={(e) => { handleFileSelect(e.target.files?.[0]); e.target.value = '' }}
                    />
                    {selectedFile ? (
                      <div className="artifacts__dropzone-selected">
                        <HiOutlineDocumentText size={22} />
                        <div>
                          <strong>{selectedFile.name}</strong>
                          <span>{fmtBytes(selectedFile.size)}</span>
                        </div>
                        <button className="artifacts__dropzone-remove" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setForm((f) => ({ ...f, size: '' })) }}>
                          <HiOutlineX size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="artifacts__dropzone-empty">
                        <HiOutlineCloudUpload size={28} />
                        <span>Drop a file here or click to browse</span>
                        <small>PDF, DOCX, images, code files, archives…</small>
                      </div>
                    )}
                  </div>
                )}

                <input
                  className="artifacts__upload-input"
                  type="text"
                  placeholder="Artifact title *"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <textarea
                  className="artifacts__upload-textarea"
                  placeholder="Description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                {form.type === 'link' && (
                  <input
                    className="artifacts__upload-input"
                    type="url"
                    placeholder="URL (e.g. https://example.com)"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                  />
                )}
                <div className="artifacts__upload-row">
                  <select
                    className="artifacts__upload-select"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="document">Document</option>
                    <option value="image">Image</option>
                    <option value="link">Link</option>
                    <option value="code">Code</option>
                  </select>
                  <select
                    className="artifacts__upload-input"
                    value={form.course}
                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                  >
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div className="artifacts__upload-row">
                  <input
                    className="artifacts__upload-input"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                  <input
                    className="artifacts__upload-input"
                    type="text"
                    placeholder={selectedFile ? 'Auto-computed' : 'Size (e.g. 2.4 MB)'}
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    readOnly={!!selectedFile}
                  />
                </div>
                <select
                  className="artifacts__upload-select"
                  value={form.linkedMilestoneId}
                  onChange={(e) => setForm({ ...form, linkedMilestoneId: e.target.value })}
                >
                  <option value="">Link to milestone (optional)</option>
                  {milestones.map((ms) => (
                    <option key={ms.id} value={ms.id}>{ms.title}</option>
                  ))}
                </select>
              </div>
              <div className="artifacts__upload-footer">
                <button className="btn btn--outline" onClick={closeModal}>Cancel</button>
                <button className="btn btn--primary" onClick={handleSave} disabled={!form.title.trim() || saving}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Artifact'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
