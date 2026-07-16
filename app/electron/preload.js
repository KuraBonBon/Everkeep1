// Preload must be CommonJS — sandbox: true blocks ESM import
const { contextBridge, ipcRenderer } = require('electron')

/* Allowlist of IPC channels — rejects arbitrary channel invocations */
const ALLOWED_CHANNELS = new Set([
  'secure-store-key',
  'secure-get-key',
  'secure-delete-key',
  'secure-get-all-keys',
  'secure-clear-all',
  'get-disk-space',
])

function safeInvoke(channel, ...args) {
  if (!ALLOWED_CHANNELS.has(channel)) {
    return Promise.reject(new Error(`IPC channel "${channel}" is not allowed`))
  }
  return ipcRenderer.invoke(channel, ...args)
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  secureStoreKey: (providerId, apiKey) => safeInvoke('secure-store-key', providerId, apiKey),
  secureGetKey: (providerId) => safeInvoke('secure-get-key', providerId),
  secureDeleteKey: (providerId) => safeInvoke('secure-delete-key', providerId),
  secureGetAllKeys: () => safeInvoke('secure-get-all-keys'),
  secureClearAll: () => safeInvoke('secure-clear-all'),
  getDiskSpace: () => safeInvoke('get-disk-space'),
})
