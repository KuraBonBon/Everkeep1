import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineUser,
  HiOutlineAcademicCap,
  HiOutlineColorSwatch,
  HiOutlineDatabase,
  HiOutlineDocumentDownload,
  HiOutlineInformationCircle,
  HiOutlineCheck,
  HiOutlineTag,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineSparkles,
  HiOutlineKey,
  HiOutlineShieldCheck,
} from 'react-icons/hi'
import useThemeStore, { themes } from '../../stores/useThemeStore'
import useProfileStore from '../../stores/useProfileStore'
import useJournalStore from '../../stores/useJournalStore'
import useArtifactStore from '../../stores/useArtifactStore'
import useMilestoneStore from '../../stores/useMilestoneStore'
import useCategoryStore from '../../stores/useCategoryStore'
import useAIStore, { AI_PROVIDERS } from '../../stores/useAIStore'
import useFinanceStore from '../../stores/useFinanceStore'
import useExportStore from '../../stores/useExportStore'
import useTutorialStore from '../../stores/useTutorialStore'
import { containerV, itemV } from '../../utils/animations'
import { CATEGORY_COLORS } from '../../constants/colors'
import './Settings.css'

const themeKeys = Object.keys(themes)
const ROLES = ['Student', 'Faculty', 'Staff', 'Alumni', 'Other']

const EMOJI_PICKER = [
  '📁', '💻', '📐', '🔬', '✍️', '🔭', '📚', '🎓', '🧠', '🎨',
  '🎵', '⚽', '🏋️', '💼', '📊', '🔧', '🌍', '🧪', '📝', '💡',
  '🎯', '🗂️', '📖', '🖥️', '📱', '🔒', '❤️', '⭐', '🚀', '🏠',
]

export default function Settings() {
  const activeTheme = useThemeStore((s) => s.activeTheme)
  const setTheme = useThemeStore((s) => s.setTheme)

  /* Profile store */
  const profile = useProfileStore()
  const updateProfile = useProfileStore((s) => s.updateProfile)

  /* Category store */
  const categories = useCategoryStore((s) => s.categories)
  const addCategory = useCategoryStore((s) => s.addCategory)
  const updateCategory = useCategoryStore((s) => s.updateCategory)
  const deleteCategory = useCategoryStore((s) => s.deleteCategory)

  /* Stats from stores for storage section */
  const entries = useJournalStore((s) => s.entries)
  const journalCount = entries.length
  const artifactCount = useArtifactStore((s) => s.artifacts.length)
  const milestoneCount = useMilestoneStore((s) => s.milestones.length)
  const transactions = useFinanceStore((s) => s.transactions)
  const currency = useFinanceStore((s) => s.currency)
  const financeCount = transactions.length

  /* AI store */
  const activeProvider = useAIStore((s) => s.activeProvider)
  const activeModel = useAIStore((s) => s.activeModel)
  const providerKeys = useAIStore((s) => s.providerKeys)
  const providerStatus = useAIStore((s) => s.providerStatus)
  const setProviderKey = useAIStore((s) => s.setProviderKey)
  const removeProviderKey = useAIStore((s) => s.removeProviderKey)
  const setActiveProvider = useAIStore((s) => s.setActiveProvider)
  const setActiveModel = useAIStore((s) => s.setActiveModel)
  const testKey = useAIStore((s) => s.testKey)
  const aiUsageLog = useAIStore((s) => s.aiUsageLog)
  const getUsageStats = useAIStore((s) => s.getUsageStats)
  const clearUsageLog = useAIStore((s) => s.clearUsageLog)

  /* Export store */
  const exportJournalDocx = useExportStore((s) => s.exportJournalDocx)
  const exportJournalXlsx = useExportStore((s) => s.exportJournalXlsx)
  const exportFinanceXlsx = useExportStore((s) => s.exportFinanceXlsx)
  const isExporting = useExportStore((s) => s.isExporting)
  const exportError = useExportStore((s) => s.exportError)
  const summarizeText = useAIStore((s) => s.summarizeText)
  const isAIConfigured = useAIStore((s) => s.isConfigured)

  /* Export state */
  const [exportAiToggle, setExportAiToggle] = useState(false)

  /* Disk space state */
  const [diskInfo, setDiskInfo] = useState(null)

  useEffect(() => {
    window.electronAPI?.getDiskSpace?.().then((info) => {
      if (info) setDiskInfo(info)
    })
  }, [])

  /* AI key input state */
  const [aiKeyInput, setAiKeyInput] = useState('')
  const [aiKeyProvider, setAiKeyProvider] = useState('openai')

  /* Toast for save feedback */
  const [toast, setToast] = useState(null)

  /* Category modal state */
  const [showCatModal, setShowCatModal] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [catName, setCatName] = useState('')
  const [catColor, setCatColor] = useState(CATEGORY_COLORS[0])
  const [catIcon, setCatIcon] = useState('📁')

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  /* Profile field change handler */
  const handleField = (field) => (e) => {
    updateProfile({ [field]: e.target.value })
  }

  /* Compute initials from name */
  const handleName = (e) => {
    const name = e.target.value
    const parts = name.trim().split(' ').filter(Boolean)
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase()
    updateProfile({ fullName: name, avatarInitials: initials })
  }

  /* Category CRUD */
  const openCatModal = (cat = null) => {
    if (cat) {
      setEditingCat(cat)
      setCatName(cat.name)
      setCatColor(cat.color)
      setCatIcon(cat.icon)
    } else {
      setEditingCat(null)
      setCatName('')
      setCatColor(CATEGORY_COLORS[0])
      setCatIcon('📁')
    }
    setShowCatModal(true)
  }

  const handleSaveCat = () => {
    if (!catName.trim()) return
    if (editingCat) {
      updateCategory(editingCat.id, { name: catName.trim(), color: catColor, icon: catIcon })
      showToast('Category updated')
    } else {
      addCategory({ name: catName.trim(), color: catColor, icon: catIcon })
      showToast('Category added')
    }
    setShowCatModal(false)
  }

  const handleDeleteCat = (id) => {
    deleteCategory(id)
    showToast('Category removed')
  }

  /* AI key handlers */
  const handleSaveKey = () => {
    if (!aiKeyInput.trim()) return
    setProviderKey(aiKeyProvider, aiKeyInput.trim())
    setAiKeyInput('')
    showToast(`${AI_PROVIDERS[aiKeyProvider].name} key saved`)
  }

  const handleTestKey = async (providerId) => {
    showToast(`Validating ${AI_PROVIDERS[providerId].name} key...`)
    const result = await testKey(providerId)
    showToast(result.valid
      ? `✓ ${AI_PROVIDERS[providerId].name} key is valid!`
      : `✗ ${AI_PROVIDERS[providerId].name}: ${result.error || 'validation failed'}`)
  }

  const handleRemoveKey = (providerId) => {
    removeProviderKey(providerId)
    showToast(`${AI_PROVIDERS[providerId].name} key removed`)
  }

  /* Role-dependent subtitle */
  const profileSubtitle = profile.role === 'Student'
    ? `${profile.program} — ${profile.yearLevel}`
    : profile.role === 'Faculty'
      ? profile.position || 'Faculty'
      : profile.role === 'Staff'
        ? profile.position || 'Staff'
        : profile.role === 'Alumni'
          ? profile.previousProgram || 'Alumni'
          : profile.department || 'Member'

  /* Estimated storage (rough estimate based on item counts) */
  const journalSize = (journalCount * 1.2).toFixed(1)
  const artifactSize = (artifactCount * 1.8).toFixed(1)
  const financeSize = (financeCount * 0.3).toFixed(1)
  const metaSize = '4.2'
  const totalSize = (parseFloat(journalSize) + parseFloat(artifactSize) + parseFloat(financeSize) + parseFloat(metaSize)).toFixed(1)
  const diskTotalGB = diskInfo ? (diskInfo.total / (1024 ** 3)).toFixed(1) : null
  const diskFreeGB = diskInfo ? (diskInfo.free / (1024 ** 3)).toFixed(1) : null
  const diskUsedGB = diskInfo ? ((diskInfo.total - diskInfo.free) / (1024 ** 3)).toFixed(1) : null
  const diskUsagePct = diskInfo ? (((diskInfo.total - diskInfo.free) / diskInfo.total) * 100).toFixed(1) : null

  return (
    <motion.div className="settings" variants={containerV} initial="hidden" animate="visible">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="settings__toast"
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
          >
            <HiOutlineCheck size={16} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="settings__header" variants={itemV}>
        <h1 className="settings__title">Settings</h1>
        <p className="settings__subtitle">Manage your profile, categories, preferences, and data</p>
      </motion.div>

      <div className="settings__grid">
        {/* ── Profile ──────────────────────────────────── */}
        <motion.div className="settings__section" variants={itemV}>
          <div className="settings__section-header">
            <HiOutlineUser size={18} />
            <h3>Profile</h3>
          </div>
          <div className="settings__section-body">
            <div className="settings__profile-card">
              <div className="settings__profile-avatar">{profile.avatarInitials}</div>
              <div className="settings__profile-info">
                <span className="settings__profile-name">{profile.fullName}</span>
                <span className="settings__profile-detail">{profileSubtitle}</span>
              </div>
            </div>
            <div className="settings__field">
              <label>Full Name</label>
              <input type="text" value={profile.fullName} onChange={handleName} />
            </div>
            <div className="settings__field">
              <label>Role</label>
              <select value={profile.role} onChange={handleField('role')}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="settings__field">
              <label>Email</label>
              <input type="text" value={profile.email} onChange={handleField('email')} />
            </div>
            <div className="settings__field">
              <label>Organization</label>
              <input type="text" value={profile.organization} onChange={handleField('organization')} placeholder="e.g. SPIST" />
            </div>
            <div className="settings__field">
              <label>Department</label>
              <input type="text" value={profile.department} onChange={handleField('department')} placeholder="e.g. IT Department" />
            </div>
          </div>
        </motion.div>

        {/* ── Context (role-adaptive) ──────────────────── */}
        <motion.div className="settings__section" variants={itemV}>
          <div className="settings__section-header">
            <HiOutlineAcademicCap size={18} />
            <h3>{profile.role === 'Student' ? 'Academic Context' : profile.role === 'Alumni' ? 'Alumni Details' : 'Role Details'}</h3>
          </div>
          <div className="settings__section-body">
            {profile.role === 'Student' && (
              <>
                <div className="settings__field">
                  <label>Student / ID Number</label>
                  <input type="text" value={profile.idNumber} onChange={handleField('idNumber')} />
                </div>
                <div className="settings__field">
                  <label>Program</label>
                  <input type="text" value={profile.program} onChange={handleField('program')} />
                </div>
                <div className="settings__field">
                  <label>Year Level</label>
                  <select value={profile.yearLevel} onChange={handleField('yearLevel')}>
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year</option>
                  </select>
                </div>
                <div className="settings__field">
                  <label>Current Term</label>
                  <input type="text" value={profile.currentTerm} onChange={handleField('currentTerm')} />
                </div>
                <div className="settings__field">
                  <label>Thesis Adviser / Supervisor</label>
                  <input type="text" value={profile.supervisor} onChange={handleField('supervisor')} />
                </div>
              </>
            )}
            {(profile.role === 'Faculty' || profile.role === 'Staff') && (
              <>
                <div className="settings__field">
                  <label>ID Number</label>
                  <input type="text" value={profile.idNumber} onChange={handleField('idNumber')} />
                </div>
                <div className="settings__field">
                  <label>Position / Title</label>
                  <input type="text" value={profile.position} onChange={handleField('position')} placeholder="e.g. Instructor I" />
                </div>
                <div className="settings__field">
                  <label>Supervisor / Department Head</label>
                  <input type="text" value={profile.supervisor} onChange={handleField('supervisor')} />
                </div>
              </>
            )}
            {profile.role === 'Other' && (
              <>
                <div className="settings__field">
                  <label>ID Number (optional)</label>
                  <input type="text" value={profile.idNumber} onChange={handleField('idNumber')} />
                </div>
                <div className="settings__field">
                  <label>Role Description</label>
                  <input type="text" value={profile.position} onChange={handleField('position')} placeholder="e.g. Researcher, Volunteer" />
                </div>
              </>
            )}
            {profile.role === 'Alumni' && (
              <>
                <div className="settings__field">
                  <label>Previous Program / Department</label>
                  <input type="text" value={profile.previousProgram} onChange={handleField('previousProgram')} placeholder="e.g. BS Computer Science" />
                </div>
                <div className="settings__field">
                  <label>Graduation Year</label>
                  <input type="text" value={profile.graduationYear} onChange={handleField('graduationYear')} placeholder="e.g. 2023" />
                </div>
                <div className="settings__field">
                  <label>Current Affiliation</label>
                  <input type="text" value={profile.currentAffiliation} onChange={handleField('currentAffiliation')} placeholder="e.g. Accenture Philippines" />
                </div>
                <div className="settings__field">
                  <label>Mentor / Former Adviser</label>
                  <input type="text" value={profile.supervisor} onChange={handleField('supervisor')} />
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* ── Categories / Workspaces ──────────────────── */}
        <motion.div className="settings__section settings__section--full" variants={itemV}>
          <div className="settings__section-header">
            <HiOutlineTag size={18} />
            <h3>Categories / Workspaces</h3>
          </div>
          <div className="settings__section-body">
            <div className="settings__cat-grid">
              {categories.map((cat) => (
                <div key={cat.id} className="settings__cat-item">
                  <span className="settings__cat-icon" style={{ background: `${cat.color}20`, color: cat.color }}>{cat.icon}</span>
                  <span className="settings__cat-name">{cat.name}</span>
                  <button className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto', padding: '2px 6px' }} onClick={() => openCatModal(cat)}>✏️</button>
                  <button className="btn btn--ghost btn--sm" style={{ padding: '2px 6px', color: 'var(--danger)' }} onClick={() => handleDeleteCat(cat.id)}>🗑️</button>
                </div>
              ))}
            </div>
            <button className="btn btn--outline settings__cat-add" onClick={() => openCatModal()}>
              <HiOutlinePlus size={16} /> Add Category
            </button>
          </div>
        </motion.div>

        {/* ── Appearance ───────────────────────────────── */}
        <motion.div className="settings__section" variants={itemV}>
          <div className="settings__section-header">
            <HiOutlineColorSwatch size={18} />
            <h3>Appearance</h3>
          </div>
          <div className="settings__section-body">
            <div className="settings__theme-grid">
              {themeKeys.map((key) => {
                const t = themes[key]
                const isActive = activeTheme === key
                return (
                  <motion.div
                    key={key}
                    className={`settings__theme-option ${isActive ? 'settings__theme-option--active' : ''}`}
                    onClick={() => { setTheme(key); showToast(`Theme: ${t.label}`) }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="settings__theme-preview" style={{ background: t.preview }} />
                    {isActive && (
                      <motion.div
                        className="settings__theme-check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <HiOutlineCheck size={12} />
                      </motion.div>
                    )}
                    <span>{t.label}</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* ── AI Configuration (BYOK) ──────────────── */}
        <motion.div className="settings__section settings__section--full" variants={itemV}>
          <div className="settings__section-header">
            <HiOutlineSparkles size={18} />
            <h3>AI Configuration (BYOK)</h3>
          </div>
          <div className="settings__section-body">
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Bring Your Own Key — add API keys for AI providers to enable summarization, action extraction, and reflection intelligence. Keys are stored locally on your device only. You choose the model — no defaults are assumed.
            </p>

            {/* Setup guide */}
            <div className="settings__byok-guide">
              <p className="settings__byok-guide-title">How to get started</p>
              <ol className="settings__byok-guide-steps">
                <li>Pick a provider below and visit their platform to create a free or paid API key.</li>
                <li>Copy the key and paste it in the input field, then click <strong>Save Key</strong>.</li>
                <li>Select the provider as your <strong>Active Provider</strong> and enter a <strong>Model ID</strong>.</li>
              </ol>
              <div className="settings__byok-links">
                {Object.values(AI_PROVIDERS).map((p) => (
                  <a key={p.id} className="settings__byok-link" href={p.docsUrl} target="_blank" rel="noopener noreferrer">
                    <span>{p.icon}</span> {p.name} — Get API Key ↗
                  </a>
                ))}
              </div>
            </div>

            {/* Active provider selector */}
            <div className="settings__field">
              <label>Active Provider</label>
              <select value={activeProvider || ''} onChange={(e) => e.target.value && setActiveProvider(e.target.value)}>
                <option value="">None (AI disabled)</option>
                {Object.values(AI_PROVIDERS).map((p) => (
                  <option key={p.id} value={p.id} disabled={!providerKeys[p.id]}>
                    {p.icon} {p.name} {providerKeys[p.id] ? (providerStatus[p.id] === 'valid' ? '✓' : '') : '(no key)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Model selector — free-text with hint suggestions */}
            {activeProvider && AI_PROVIDERS[activeProvider] && (
              <div className="settings__field">
                <label>
                  Model ID
                  {!activeModel && <span className="settings__model-required">⚠ Required</span>}
                </label>
                <input
                  type="text"
                  list={`models-${activeProvider}`}
                  value={activeModel || ''}
                  onChange={(e) => setActiveModel(e.target.value)}
                  placeholder="Paste your model ID (required)"
                  className={`settings__ai-key-input${!activeModel ? ' settings__ai-key-input--warn' : ''}`}
                />
                <datalist id={`models-${activeProvider}`}>
                  {AI_PROVIDERS[activeProvider].hints.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                {activeModel ? (
                  <span style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2 }}>
                    ✓ Using: {activeModel}
                  </span>
                ) : (
                  <span style={{ fontSize: 10, color: 'var(--text-warning, #f59e0b)', marginTop: 2 }}>
                    AI features disabled until a model ID is set. Browse models: <a href={AI_PROVIDERS[activeProvider].modelsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{AI_PROVIDERS[activeProvider].name} Models</a>
                  </span>
                )}
              </div>
            )}

            {/* Add key */}
            <div className="settings__ai-key-add">
              <select value={aiKeyProvider} onChange={(e) => setAiKeyProvider(e.target.value)} className="settings__ai-provider-select">
                {Object.values(AI_PROVIDERS).map((p) => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </select>
              <input
                type="password"
                value={aiKeyInput}
                onChange={(e) => setAiKeyInput(e.target.value)}
                placeholder={AI_PROVIDERS[aiKeyProvider]?.keyPlaceholder || 'API key'}
                className="settings__ai-key-input"
              />
              <button className="btn btn--primary btn--sm" onClick={handleSaveKey} disabled={!aiKeyInput.trim()}>
                <HiOutlineKey size={14} /> Save Key
              </button>
            </div>

            {/* Saved keys list */}
            <div className="settings__ai-keys-list">
              {Object.entries(providerKeys).map(([pid, key]) => {
                const provider = AI_PROVIDERS[pid]
                if (!provider) return null
                const status = providerStatus[pid] || 'untested'
                return (
                  <div key={pid} className="settings__ai-key-item">
                    <span className="settings__ai-key-provider">{provider.icon} {provider.name}</span>
                    <span className="settings__ai-key-masked">{key.slice(0, 8)}...{key.slice(-4)}</span>
                    <span className={`settings__ai-key-status settings__ai-key-status--${status}`}>
                      {status === 'valid' ? '✓ Valid' : status === 'invalid' ? '✗ Invalid' : status === 'testing' ? '⏳ Validating...' : '? Untested'}
                    </span>
                    <button className="btn btn--outline btn--sm" onClick={() => handleTestKey(pid)} title="Validates key auth without using tokens (zero cost)">Validate</button>
                    <button className="settings__cat-btn settings__cat-btn--danger" onClick={() => handleRemoveKey(pid)}>
                      <HiOutlineTrash size={14} />
                    </button>
                  </div>
                )
              })}
              {Object.keys(providerKeys).length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                  No API keys configured yet. Add a key above to enable AI features.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── AI Usage Monitor ─────────────────────────── */}
        <motion.div className="settings__section settings__section--full" variants={itemV}>
          <div className="settings__section-header">
            <HiOutlineShieldCheck size={18} />
            <h3>AI Usage Monitor</h3>
          </div>
          <div className="settings__section-body">
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Track every AI request made from this device. All usage is logged locally so you can audit which models are called, when, and whether they succeeded.
            </p>

            {/* Stats cards */}
            {(() => {
              const stats = getUsageStats()
              return (
                <div className="settings__ai-stats">
                  <div className="settings__ai-stat-card">
                    <span className="settings__ai-stat-value">{stats.requestsToday}</span>
                    <span className="settings__ai-stat-label">Requests today</span>
                  </div>
                  <div className="settings__ai-stat-card">
                    <span className="settings__ai-stat-value">{stats.requestsThisMonth}</span>
                    <span className="settings__ai-stat-label">This month</span>
                  </div>
                  <div className="settings__ai-stat-card">
                    <span className="settings__ai-stat-value">{stats.successRate}%</span>
                    <span className="settings__ai-stat-label">Success rate</span>
                  </div>
                  <div className="settings__ai-stat-card">
                    <span className="settings__ai-stat-value" title={stats.topModel || '—'}>{stats.topModel ? stats.topModel.split('/').pop() : '—'}</span>
                    <span className="settings__ai-stat-label">Top model</span>
                  </div>
                </div>
              )
            })()}

            {/* Recent requests log */}
            {aiUsageLog.length > 0 ? (
              <>
                <div className="settings__ai-log">
                  <table className="settings__ai-log-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Feature</th>
                        <th>Model</th>
                        <th>Status</th>
                        <th>Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiUsageLog.slice(0, 15).map((entry, i) => (
                        <tr key={i} className={entry.status === 'error' ? 'settings__ai-log-row--error' : ''}>
                          <td>{entry.ts ? new Date(entry.ts).toLocaleTimeString() : '—'}</td>
                          <td>{entry.feature}</td>
                          <td title={entry.model}>{entry.model ? entry.model.split('/').pop() : '—'}</td>
                          <td>{entry.status === 'ok' ? '✓' : '✗'}</td>
                          <td>{entry.latencyMs ? `${(entry.latencyMs / 1000).toFixed(1)}s` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="btn btn--outline btn--sm" onClick={clearUsageLog} style={{ marginTop: 8, fontSize: 11 }}>
                  Clear Log
                </button>
              </>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                No AI requests logged yet. Usage appears here automatically when you use AI features.
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Document Export ──────────────────────────── */}
        <motion.div className="settings__section settings__section--full" variants={itemV}>
          <div className="settings__section-header">
            <HiOutlineDocumentDownload size={18} />
            <h3>Document Export</h3>
          </div>
          <div className="settings__section-body">
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Export your journal entries as Word documents (.docx) or spreadsheets (.xlsx). Finance data exports as Excel with summary and category breakdown sheets.
            </p>

            {/* AI Enhancement toggle */}
            <div className="settings__field" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <label style={{ flex: 1, margin: 0 }}>
                AI-Enhanced Export
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>
                  {isAIConfigured() ? 'Add AI summaries and insights to exports' : 'Configure AI key in settings above to enable'}
                </span>
              </label>
              <button
                className={`settings__toggle ${exportAiToggle ? 'settings__toggle--on' : ''}`}
                onClick={() => setExportAiToggle(!exportAiToggle)}
                disabled={!isAIConfigured()}
                style={{ flexShrink: 0 }}
              >
                <span className="settings__toggle-knob" />
              </button>
            </div>

            <div className="settings__backup-actions" style={{ flexWrap: 'wrap' }}>
              <button
                className="btn btn--primary"
                disabled={isExporting || entries.length === 0}
                onClick={() => exportJournalDocx(entries, { aiEnhance: exportAiToggle, summarizeText: exportAiToggle ? summarizeText : null })}
              >
                <HiOutlineDocumentDownload size={16} /> Journal → .docx
              </button>
              <button
                className="btn btn--outline"
                disabled={isExporting || entries.length === 0}
                onClick={() => exportJournalXlsx(entries)}
              >
                <HiOutlineDocumentDownload size={16} /> Journal → .xlsx
              </button>
              <button
                className="btn btn--outline"
                disabled={isExporting || transactions.length === 0}
                onClick={() => exportFinanceXlsx(transactions, currency, { aiEnhance: exportAiToggle, summarizeText: exportAiToggle ? summarizeText : null })}
              >
                <HiOutlineDocumentDownload size={16} /> Finance → .xlsx
              </button>
            </div>
            {isExporting && (
              <p style={{ fontSize: 11, color: 'var(--accent-primary)' }}>Exporting{exportAiToggle ? ' with AI enhancement' : ''}…</p>
            )}
            {exportError && (
              <p style={{ fontSize: 11, color: 'var(--danger)' }}>Export error: {exportError}</p>
            )}
          </div>
        </motion.div>

        {/* ── Data & Storage ───────────────────────────── */}
        <motion.div className="settings__section" variants={itemV}>
          <div className="settings__section-header">
            <HiOutlineDatabase size={18} />
            <h3>Data & Storage</h3>
          </div>
          <div className="settings__section-body">
            <div className="settings__storage-bar">
              <div className="settings__storage-label">
                <span>Local Storage Used</span>
                <span>{totalSize} MB (app data)</span>
              </div>
              <div className="settings__storage-track">
                <div className="settings__storage-fill" style={{ width: `${Math.min(100, (parseFloat(totalSize) / 500) * 100).toFixed(1)}%` }} />
              </div>
            </div>
            {diskInfo && (
              <div className="settings__disk-info">
                <div className="settings__storage-label">
                  <span>System Disk</span>
                  <span>{diskUsedGB} GB / {diskTotalGB} GB ({diskFreeGB} GB free)</span>
                </div>
                <div className="settings__storage-track">
                  <div className="settings__storage-fill settings__storage-fill--disk" style={{ width: `${diskUsagePct}%` }} />
                </div>
                <span className="settings__disk-path">Data stored at: {diskInfo.path}</span>
              </div>
            )}
            <div className="settings__storage-breakdown">
              <div className="settings__storage-item">
                <span className="settings__storage-dot" style={{ background: '#818cf8' }} />
                <span>Journal Entries ({journalCount}): ~{journalSize} MB</span>
              </div>
              <div className="settings__storage-item">
                <span className="settings__storage-dot" style={{ background: '#34d399' }} />
                <span>Artifacts ({artifactCount}): ~{artifactSize} MB</span>
              </div>
              <div className="settings__storage-item">
                <span className="settings__storage-dot" style={{ background: '#f59e0b' }} />
                <span>Finance ({financeCount}): ~{financeSize} MB</span>
              </div>
              <div className="settings__storage-item">
                <span className="settings__storage-dot" style={{ background: '#fbbf24' }} />
                <span>Milestones ({milestoneCount}) + Settings: ~{metaSize} MB</span>
              </div>
            </div>
            <div className="settings__data-actions">
              <button className="btn btn--outline btn--danger" onClick={async () => {
                if (!window.confirm('This will erase ALL your data and reset Everkeep to its first-launch state. Continue?')) return
                /* Clear ALL persisted data from localStorage */
                localStorage.clear()
                /* Clear OS-encrypted API keys */
                try { await window.electronAPI?.secureClearAll?.() } catch { /* ok */ }
                window.location.reload()
              }}>
                <HiOutlineTrash size={16} /> Factory Reset
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Tutorial & Help ─────────────────────────── */}
        <motion.div className="settings__section settings__section--full" variants={itemV}>
          <div className="settings__section-header">
            <HiOutlineAcademicCap size={18} />
            <h3>Tutorial & Help</h3>
          </div>
          <div className="settings__section-body">
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
              New around here? Take the full guided tour, or replay a specific section's guide.
            </p>

            <button
              className="btn btn--primary"
              onClick={() => useTutorialStore.getState().startTutorial()}
              style={{ width: 'fit-content', marginBottom: 10 }}
            >
              <HiOutlineSparkles size={16} /> Replay Guided Tour
            </button>

            <button
              className="btn btn--outline"
              onClick={() => useTutorialStore.getState().resetOnboarding()}
              style={{ width: 'fit-content', marginBottom: 18 }}
            >
              Replay Welcome Setup
            </button>

            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Feature Guides
            </p>
            <div className="settings__guide-grid">
              {[
                { key: 'dashboard', label: 'Dashboard', icon: '📊' },
                { key: 'journal',   label: 'Journal',   icon: '📝' },
                { key: 'artifacts', label: 'Artifacts',  icon: '📁' },
                { key: 'timeline',  label: 'Timeline',   icon: '🎯' },
                { key: 'insights',  label: 'AI Insights', icon: '🤖' },
                { key: 'finance',   label: 'Finance',    icon: '💰' },
                { key: 'assistant', label: 'AI Assistant', icon: '💬' },
                { key: 'settings',  label: 'Settings',   icon: '⚙️' },
                { key: 'tips',      label: 'Tips & Shortcuts', icon: '⌨️' },
              ].map((g) => (
                <button
                  key={g.key}
                  className="btn btn--outline settings__guide-btn"
                  onClick={() => useTutorialStore.getState().startFeatureGuide(g.key)}
                >
                  <span>{g.icon}</span> {g.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── About ────────────────────────────────────── */}
        <motion.div className="settings__section settings__section--full" variants={itemV}>
          <div className="settings__section-header">
            <HiOutlineInformationCircle size={18} />
            <h3>About Everkeep</h3>
          </div>
          <div className="settings__section-body settings__about">
            <p>
              <strong>Everkeep</strong> is a hybrid personal archive, planning, and insight system
              designed for the academic community — students, faculty, staff, and alumni alike.
              Whether you're documenting coursework, tracking milestones, managing finances, or preserving
              your institutional journey, Everkeep adapts to your role and needs. Works offline with
              optional online features like AI summaries and insights.
            </p>
            <div className="settings__about-meta">
              <span>Version 2.5.0</span>
              <span>·</span>
              <span>Built with React + Vite + Zustand</span>
              <span>·</span>
              <span>AY 2025–2026 Thesis Project</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Category Modal */}
      <AnimatePresence>
        {showCatModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCatModal(false)}>
            <motion.div className="settings__cat-modal" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
              <div className="settings__cat-modal-header">
                <h3>{editingCat ? 'Edit Category' : 'New Category'}</h3>
                <button onClick={() => setShowCatModal(false)}><HiOutlineX size={20} /></button>
              </div>
              <div className="settings__cat-modal-body">
                <div className="settings__field">
                  <label>Name</label>
                  <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. CS 401 — Software Engineering" />
                </div>
                <div className="settings__field">
                  <label>Icon</label>
                  <div className="settings__emoji-picker">
                    {EMOJI_PICKER.map((em) => (
                      <button
                        key={em}
                        type="button"
                        className={`settings__emoji-btn ${catIcon === em ? 'settings__emoji-btn--active' : ''}`}
                        onClick={() => setCatIcon(em)}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="settings__field">
                  <label>Color</label>
                  <div className="settings__cat-color-grid">
                    {CATEGORY_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`settings__cat-color-swatch ${catColor === c ? 'settings__cat-color-swatch--active' : ''}`}
                        style={{ background: c }}
                        onClick={() => setCatColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="settings__cat-modal-footer">
                <button className="btn" onClick={() => setShowCatModal(false)}>Cancel</button>
                <button className="btn btn--primary" onClick={handleSaveCat} disabled={!catName.trim()}>
                  {editingCat ? 'Update' : 'Add Category'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
