import { app, BrowserWindow, shell, ipcMain, safeStorage, session } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/* ── Secure API key storage (OS-level encryption: DPAPI / Keychain) ── */
function getKeyStorePath() {
  return path.join(app.getPath('userData'), 'secure-keys.json')
}

function readKeyStore() {
  try {
    return JSON.parse(fs.readFileSync(getKeyStorePath(), 'utf8'))
  } catch {
    return {}
  }
}

function writeKeyStore(store) {
  fs.writeFileSync(getKeyStorePath(), JSON.stringify(store), 'utf8')
}

ipcMain.handle('secure-store-key', (_, providerId, apiKey) => {
  if (typeof providerId !== 'string' || typeof apiKey !== 'string') return false
  if (providerId.length > 64 || apiKey.length > 512) return false
  const store = readKeyStore()
  if (safeStorage.isEncryptionAvailable()) {
    store[providerId] = { e: true, d: safeStorage.encryptString(apiKey).toString('base64') }
  } else {
    store[providerId] = { e: false, d: apiKey }
  }
  writeKeyStore(store)
  return true
})

ipcMain.handle('secure-get-key', (_, providerId) => {
  if (typeof providerId !== 'string') return null
  const store = readKeyStore()
  const entry = store[providerId]
  if (!entry) return null
  try {
    return entry.e
      ? safeStorage.decryptString(Buffer.from(entry.d, 'base64'))
      : entry.d
  } catch {
    return null
  }
})

ipcMain.handle('secure-delete-key', (_, providerId) => {
  if (typeof providerId !== 'string') return false
  const store = readKeyStore()
  delete store[providerId]
  writeKeyStore(store)
  return true
})

ipcMain.handle('secure-get-all-keys', () => {
  const store = readKeyStore()
  const result = {}
  for (const [id, entry] of Object.entries(store)) {
    try {
      result[id] = entry.e
        ? safeStorage.decryptString(Buffer.from(entry.d, 'base64'))
        : entry.d
    } catch { /* skip corrupted entries */ }
  }
  return result
})

ipcMain.handle('secure-clear-all', () => {
  try {
    const p = getKeyStorePath()
    if (fs.existsSync(p)) fs.unlinkSync(p)
  } catch { /* ignore */ }
  return true
})

/* ── Disk space info (for Data & Storage section) ── */
ipcMain.handle('get-disk-space', () => {
  try {
    const userDataPath = app.getPath('userData')
    const stats = fs.statfsSync(userDataPath)
    const total = stats.blocks * stats.bsize
    const free = stats.bavail * stats.bsize
    return { total, free, path: userDataPath }
  } catch {
    return null
  }
})

/* ── Window ────────────────────────────────────────────────────── */
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Everkeep',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    autoHideMenuBar: true,
    backgroundColor: '#0d0f1a',
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  /* Block in-app navigation away from the app (anti-phishing / anti-redirect) */
  win.webContents.on('will-navigate', (event, url) => {
    const devServer = process.env.VITE_DEV_SERVER_URL
    if (devServer && url.startsWith(devServer)) return
    if (url.startsWith('file://')) return
    event.preventDefault()
  })
}

/* ── App lifecycle ─────────────────────────────────────────────── */
app.whenReady().then(() => {
  /* Restrict permissions (camera, mic, geolocation, etc.) */
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    const allowed = ['notifications']
    callback(allowed.includes(permission))
  })

  /* Content Security Policy */
  const isDev = !!process.env.VITE_DEV_SERVER_URL
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';" +
          ` script-src 'self'${isDev ? " 'unsafe-inline'" : ''};` +
          " style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;" +
          " img-src 'self' data: blob:;" +
          " font-src 'self' data: https://fonts.gstatic.com;" +
          " connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com https://api.anthropic.com https://openrouter.ai;" +
          " media-src 'self' blob: data:;" +
          " object-src 'none';" +
          " base-uri 'self';" +
          " form-action 'self';" +
          " frame-ancestors 'none';"
        ],
      },
    })
  })

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
