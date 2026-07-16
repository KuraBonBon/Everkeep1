import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import localforage from 'localforage'

/* ── File blob store (IndexedDB via localforage) ────────────────── */
const fileStore = localforage.createInstance({
  name: 'campus-chronicle',
  storeName: 'artifact_files',
})

/**
 * Store a file blob in IndexedDB. Returns { fileKey, originalName, mime, size }.
 */
async function storeFile(file) {
  const fileKey = `artifact-file-${uuidv4()}`
  const arrayBuf = await file.arrayBuffer()
  await fileStore.setItem(fileKey, {
    data: arrayBuf,
    name: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    storedAt: Date.now(),
  })
  return {
    fileKey,
    originalName: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
  }
}

/**
 * Retrieve a stored file and return as a Blob with its original metadata.
 */
async function retrieveFile(fileKey) {
  const entry = await fileStore.getItem(fileKey)
  if (!entry) return null
  return {
    blob: new Blob([entry.data], { type: entry.mime }),
    name: entry.name,
    mime: entry.mime,
    size: entry.size,
  }
}

/**
 * Delete a stored file blob.
 */
async function deleteFile(fileKey) {
  await fileStore.removeItem(fileKey)
}

/**
 * Format byte size to human-readable string.
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/* ── Mime → artifact type mapping ────────────────────────────────── */
function mimeToType(mime) {
  if (!mime) return 'document'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'link'
  if (mime.includes('pdf') || mime.includes('word') || mime.includes('presentation') || mime.includes('spreadsheet') || mime.includes('text/')) return 'document'
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return 'folder'
  if (mime.includes('javascript') || mime.includes('json') || mime.includes('xml') || mime.includes('html') || mime.includes('css') || mime.includes('python') || mime.includes('java')) return 'code'
  return 'document'
}

/* ── Store ──────────────────────────────────────────────────────── */
const useArtifactStore = create(
  persist(
    (set, get) => ({
      artifacts: [],

      /* Add artifact with optional file (File object). Returns the new artifact. */
      addArtifact: async (artifact, file) => {
        const id = uuidv4()
        let fileMeta = {}
        if (file) {
          const stored = await storeFile(file)
          fileMeta = {
            fileKey: stored.fileKey,
            fileName: stored.originalName,
            fileMime: stored.mime,
            fileSize: stored.size,
            size: formatBytes(stored.size),
            type: artifact.type || mimeToType(stored.mime),
          }
        }
        const newArt = {
          ...artifact,
          ...fileMeta,
          id,
          createdAt: Date.now(),
          parentId: artifact.parentId || null,
          linkedMilestoneId: artifact.linkedMilestoneId || null,
        }
        set((s) => ({ artifacts: [newArt, ...s.artifacts] }))
        return newArt
      },

      updateArtifact: (id, patch) =>
        set((s) => ({
          artifacts: s.artifacts.map((a) =>
            a.id === id ? { ...a, ...patch } : a
          ),
        })),

      /* Delete artifact + clean up its file blob from IndexedDB */
      deleteArtifact: async (id) => {
        const art = get().artifacts.find((a) => a.id === id)
        if (art?.fileKey) await deleteFile(art.fileKey)
        set((s) => ({ artifacts: s.artifacts.filter((a) => a.id !== id) }))
      },

      /* Bulk delete artifacts + clean up file blobs */
      deleteArtifacts: async (ids) => {
        const arts = get().artifacts.filter((a) => ids.includes(a.id))
        for (const art of arts) {
          if (art.fileKey) await deleteFile(art.fileKey)
        }
        set((s) => ({ artifacts: s.artifacts.filter((a) => !ids.includes(a.id)) }))
      },

      /* Move an artifact into a folder (or root if parentId is null) */
      moveArtifact: (id, parentId) =>
        set((s) => ({
          artifacts: s.artifacts.map((a) =>
            a.id === id ? { ...a, parentId: parentId || null } : a
          ),
        })),

      /* Get the folder breadcrumb trail from root to given folderId */
      getBreadcrumb: (folderId) => {
        const arts = get().artifacts
        const trail = []
        let cur = folderId
        while (cur) {
          const folder = arts.find((a) => a.id === cur)
          if (!folder) break
          trail.unshift(folder)
          cur = folder.parentId
        }
        return trail
      },

      /* Retrieve the stored file blob — returns { blob, name, mime, size } or null */
      getFile: async (id) => {
        const art = get().artifacts.find((a) => a.id === id)
        if (!art?.fileKey) return null
        return retrieveFile(art.fileKey)
      },

      /* Download a stored artifact file */
      downloadFile: async (id) => {
        const art = get().artifacts.find((a) => a.id === id)
        if (!art?.fileKey) return
        const fileData = await retrieveFile(art.fileKey)
        if (!fileData) return
        const url = URL.createObjectURL(fileData.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileData.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      },

      getStats: () => {
        const arts = get().artifacts
        const topLevel = arts.filter((a) => !a.parentId)
        const now = Date.now()
        const thisWeek = topLevel.filter(
          (a) => a.createdAt >= now - 7 * 86400000
        )
        return { total: topLevel.length, thisWeek: thisWeek.length }
      },
    }),
    {
      name: 'campus-chronicle-artifacts',
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([k]) => typeof state[k] !== 'function')
      ),
    }
  )
)

export default useArtifactStore
