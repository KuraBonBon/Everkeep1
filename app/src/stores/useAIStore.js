import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import useChatStore from './useChatStore'

/**
 * Append the user's custom instructions (if any) to a system prompt.
 * Reads from useChatStore so it applies globally to all AI features.
 */
function withCustomInstructions(systemPrompt) {
  const custom = useChatStore.getState().customSystemPrompt?.trim()
  if (!custom) return systemPrompt
  return systemPrompt + '\n\n--- Custom Instructions from the user ---\n' + custom
}

/*
 * AI Provider Adapter Layer — BYOK (Bring Your Own Key)
 * Supports: OpenAI-compatible, Google Gemini, Anthropic Claude, OpenRouter
 * No default models — the user must explicitly choose a model ID.
 * All keys stored locally on-device only.
 */

/* ── Provider definitions ──────────────────────────────────────── */
export const AI_PROVIDERS = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    baseUrl: 'https://api.openai.com/v1',
    hints: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    modelsUrl: 'https://platform.openai.com/docs/models',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '✨',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    hints: ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash'],
    keyPlaceholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/apikey',
    modelsUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    icon: '🧠',
    baseUrl: 'https://api.anthropic.com/v1',
    hints: ['claude-sonnet-4-20250514', 'claude-haiku-35-20241022'],
    keyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    modelsUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: '🔀',
    baseUrl: 'https://openrouter.ai/api/v1',
    hints: ['openrouter/healer-alpha', 'google/gemini-2.5-pro', 'anthropic/claude-sonnet-4'],
    keyPlaceholder: 'sk-or-...',
    docsUrl: 'https://openrouter.ai/keys',
    modelsUrl: 'https://openrouter.ai/models',
  },
}

/* ── Unified chat completion adapter ───────────────────────────── */
async function callProvider(providerId, apiKey, model, messages, signal, options = {}) {
  const provider = AI_PROVIDERS[providerId]
  if (!provider) throw new Error(`Unknown provider: ${providerId}`)
  const maxTokens = options.maxTokens || 4096

  if (providerId === 'gemini') {
    return callGemini(apiKey, model, messages, signal, maxTokens)
  }

  /* OpenAI-compatible: works for openai, openrouter, claude (messages API) */
  const isAnthropic = providerId === 'claude'
  const url = isAnthropic
    ? `${provider.baseUrl}/messages`
    : `${provider.baseUrl}/chat/completions`

  const headers = {
    'Content-Type': 'application/json',
  }

  if (isAnthropic) {
    headers['x-api-key'] = apiKey
    headers['anthropic-version'] = '2023-06-01'
    headers['anthropic-dangerous-direct-browser-access'] = 'true'
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  if (providerId === 'openrouter') {
    headers['HTTP-Referer'] = 'https://everkeep.app'
    headers['X-Title'] = 'Everkeep'
  }

  const systemMsg = messages.find((m) => m.role === 'system')
  const userMsgs = messages.filter((m) => m.role !== 'system')

  const body = isAnthropic
    ? {
        model,
        max_tokens: maxTokens,
        system: systemMsg?.content || '',
        messages: userMsgs,
      }
    : {
        model,
        messages,
        max_tokens: maxTokens,
      }

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`${provider.name} API error (${resp.status}): ${err}`)
  }

  const data = await resp.json()

  if (isAnthropic) {
    return data.content?.[0]?.text || ''
  }
  return data.choices?.[0]?.message?.content || ''
}

/* ── Gemini adapter ────────────────────────────────────────────── */
async function callGemini(apiKey, model, messages, signal, maxTokens = 4096) {
  const url = `${AI_PROVIDERS.gemini.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  const systemMsg = messages.find((m) => m.role === 'system')
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const body = {
    contents,
    ...(systemMsg && {
      systemInstruction: { parts: [{ text: systemMsg.content }] },
    }),
    generationConfig: { maxOutputTokens: maxTokens },
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Gemini API error (${resp.status}): ${err}`)
  }

  const data = await resp.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

/* ── Key format pre-checks ─────────────────────────────────────── */
const KEY_FORMAT = {
  openai:     { prefix: 'sk-', minLen: 20, label: 'OpenAI keys start with sk- and are 20+ chars' },
  gemini:     { prefix: 'AIza', minLen: 30, label: 'Gemini keys start with AIza and are 30+ chars' },
  claude:     { prefix: 'sk-ant-', minLen: 20, label: 'Claude keys start with sk-ant- and are 20+ chars' },
  openrouter: { prefix: 'sk-or-', minLen: 20, label: 'OpenRouter keys start with sk-or- and are 20+ chars' },
}

function checkKeyFormat(providerId, apiKey) {
  const fmt = KEY_FORMAT[providerId]
  if (!fmt) return
  if (!apiKey.startsWith(fmt.prefix))
    throw new Error(`Invalid key format — ${fmt.label}`)
  if (apiKey.length < fmt.minLen)
    throw new Error(`Key too short — ${fmt.label}`)
}

/* ── Non-generative key validation ─────────────────────────────── */
async function validateKey(providerId, apiKey) {
  const provider = AI_PROVIDERS[providerId]
  if (!provider) throw new Error(`Unknown provider: ${providerId}`)

  /* Stage 1: Format check (instant, offline) */
  checkKeyFormat(providerId, apiKey)

  /* Stage 2: Network auth check (no generation, zero cost) */
  if (providerId === 'gemini') {
    const url = `${provider.baseUrl}/models?key=${encodeURIComponent(apiKey)}`
    const resp = await fetch(url, { method: 'GET' })
    if (!resp.ok) throw new Error(`Gemini key invalid (${resp.status})`)
    const data = await resp.json()
    if (!data.models || data.models.length === 0) throw new Error('Gemini key returned no models — likely invalid')
    return true
  }

  if (providerId === 'claude') {
    /* POST /messages with deliberately incomplete body
       401/403 → bad key. 400 → auth passed (bad request body = key is legit). */
    const resp = await fetch(`${provider.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: 'x', max_tokens: 1, messages: [] }),
    })
    if (resp.status === 401 || resp.status === 403) throw new Error('Invalid API key')
    /* Only 400 (validation_error) confirms the key itself is good */
    if (resp.status === 400) return true
    /* Anything else (e.g. 200 shouldn't happen, 5xx = transient) */
    throw new Error(`Unexpected response (${resp.status}) — try again`)
  }

  if (providerId === 'openrouter') {
    /* OpenRouter: GET /auth/key is authenticated — returns { data: { ... } } for valid keys */
    const resp = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://everkeep.app',
        'X-Title': 'Everkeep',
      },
    })
    if (!resp.ok) throw new Error(`OpenRouter key invalid (${resp.status})`)
    const data = await resp.json()
    if (!data.data) throw new Error('OpenRouter key response missing data — key may be invalid')
    return true
  }

  /* OpenAI: GET /models requires a valid key */
  const resp = await fetch(`${provider.baseUrl}/models`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  if (!resp.ok) throw new Error(`OpenAI key invalid (${resp.status})`)
  const data = await resp.json()
  if (!data.data || data.data.length === 0) throw new Error('OpenAI key returned no models — likely invalid')
  return true
}

/* ── AI Store ──────────────────────────────────────────────────── */
const MAX_USAGE_LOG = 100

const useAIStore = create(
  persist(
    (set, get) => ({
      /* Provider configuration */
      activeProvider: null,
      activeModel: null,
      modelByProvider: {},    // { openrouter: 'openrouter/healer-alpha', gemini: 'gemini-2.0-flash' }
      providerKeys: {},       // { openai: 'sk-...', gemini: 'AIza...' }
      providerStatus: {},     // { openai: 'valid', gemini: 'untested' }

      /* AI usage monitoring (persisted) */
      aiUsageLog: [],         // [{ ts, feature, provider, model, status, latencyMs, error }]

      /* AI interaction state (not persisted — see partialize below) */
      isLoading: false,
      lastResult: null,
      lastError: null,
      _abortController: null,
      _keysReady: false,

      /* ── Usage tracking ──────────────────────────────── */
      recordUsage: (entry) => {
        set((s) => ({
          aiUsageLog: [entry, ...s.aiUsageLog].slice(0, MAX_USAGE_LOG),
        }))
      },

      getUsageStats: () => {
        const log = get().aiUsageLog
        const now = new Date()
        const todayStr = now.toISOString().slice(0, 10)
        const monthStr = now.toISOString().slice(0, 7)

        const today = log.filter((e) => e.ts?.startsWith(todayStr))
        const thisMonth = log.filter((e) => e.ts?.startsWith(monthStr))

        const modelCounts = {}
        log.forEach((e) => {
          if (e.model) modelCounts[e.model] = (modelCounts[e.model] || 0) + 1
        })
        const topModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]

        return {
          requestsToday: today.length,
          requestsThisMonth: thisMonth.length,
          successRate: log.length
            ? Math.round((log.filter((e) => e.status === 'ok').length / log.length) * 100)
            : 0,
          topModel: topModel ? topModel[0] : null,
          recentErrors: log.filter((e) => e.status === 'error').slice(0, 5),
        }
      },

      clearUsageLog: () => set({ aiUsageLog: [] }),

      /* ── Key management ──────────────────────────────── */
      setProviderKey: (providerId, key) => {
        set((s) => ({
          providerKeys: { ...s.providerKeys, [providerId]: key },
          providerStatus: { ...s.providerStatus, [providerId]: key ? 'untested' : 'none' },
        }))
        window.electronAPI?.secureStoreKey?.(providerId, key)
      },

      removeProviderKey: (providerId) => {
        set((s) => {
          const keys = { ...s.providerKeys }
          const status = { ...s.providerStatus }
          delete keys[providerId]
          delete status[providerId]
          return {
            providerKeys: keys,
            providerStatus: status,
            ...(s.activeProvider === providerId ? { activeProvider: null, activeModel: null } : {}),
          }
        })
        window.electronAPI?.secureDeleteKey?.(providerId)
      },

      setActiveProvider: (providerId) => {
        /* Restore the user's last-chosen model for this provider, or null */
        const modelByProvider = get().modelByProvider
        set({
          activeProvider: providerId,
          activeModel: modelByProvider[providerId] || null,
        })
      },

      setActiveModel: (model) => {
        const activeProvider = get().activeProvider
        set((s) => ({
          activeModel: model,
          modelByProvider: activeProvider
            ? { ...s.modelByProvider, [activeProvider]: model }
            : s.modelByProvider,
        }))
      },

      /* ── Validate key (non-generative — zero cost) ─── */
      testKey: async (providerId) => {
        const key = get().providerKeys[providerId]
        if (!key) return { valid: false, error: 'No key saved for this provider' }

        set((s) => ({
          providerStatus: { ...s.providerStatus, [providerId]: 'testing' },
        }))

        try {
          await validateKey(providerId, key)
          set((s) => ({
            providerStatus: { ...s.providerStatus, [providerId]: 'valid' },
          }))
          return { valid: true }
        } catch (err) {
          set((s) => ({
            providerStatus: { ...s.providerStatus, [providerId]: 'invalid' },
          }))
          return { valid: false, error: err.message }
        }
      },

      /* ── Model-required guard ────────────────────────── */
      _requireModelOrFail: () => {
        const { activeProvider, activeModel, providerKeys } = get()
        if (!activeProvider || !providerKeys[activeProvider]) {
          set({ lastError: 'No AI provider configured. Add a key in Settings.' })
          return null
        }
        if (!activeModel) {
          set({ lastError: 'No model selected. Set a Model ID in Settings → AI Configuration.' })
          return null
        }
        return { provider: activeProvider, model: activeModel, key: providerKeys[activeProvider] }
      },

      /* ── Request lifecycle ─────────────────────────── */
      _startRequest: () => {
        const prev = get()._abortController
        if (prev) prev.abort()
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 60000)
        set({ _abortController: controller, isLoading: true, lastError: null })
        return { signal: controller.signal, done: () => clearTimeout(timer) }
      },

      cancelRequest: () => {
        const ctrl = get()._abortController
        if (ctrl) ctrl.abort()
        set({ isLoading: false, lastError: 'Request cancelled', _abortController: null })
      },

      hydrateKeys: async () => {
        try {
          if (window.electronAPI?.secureGetAllKeys) {
            const keys = await window.electronAPI.secureGetAllKeys()
            if (keys && Object.keys(keys).length > 0) {
              set({ providerKeys: keys, _keysReady: true })
              return
            }
          }
        } catch { /* secure storage unavailable */ }
        /* Migration: if keys still exist from old localStorage persist, keep & migrate them */
        const current = get().providerKeys
        if (current && Object.keys(current).length > 0) {
          if (window.electronAPI?.secureStoreKey) {
            for (const [pid, key] of Object.entries(current)) {
              await window.electronAPI.secureStoreKey(pid, key).catch(() => {})
            }
          }
          set({ _keysReady: true })
          return
        }
        set({ _keysReady: true })
      },

      /* ── AI Actions ──────────────────────────────────── */
      summarizeText: async (text) => {
        const cfg = get()._requireModelOrFail()
        if (!cfg) return null

        const req = get()._startRequest()
        const start = Date.now()
        try {
          const result = await callProvider(cfg.provider, cfg.key, cfg.model, [
            { role: 'system', content: withCustomInstructions('You are a concise academic assistant. Summarize the following text in 2-3 sentences, focusing on key takeaways and action items.') },
            { role: 'user', content: text },
          ], req.signal)
          req.done()
          set({ isLoading: false, lastResult: result, _abortController: null })
          get().recordUsage({ ts: new Date().toISOString(), feature: 'summarize', provider: cfg.provider, model: cfg.model, status: 'ok', latencyMs: Date.now() - start })
          return result
        } catch (err) {
          req.done()
          const msg = err.name === 'AbortError' ? 'Request timed out or was cancelled' : err.message
          set({ isLoading: false, lastError: msg, _abortController: null })
          get().recordUsage({ ts: new Date().toISOString(), feature: 'summarize', provider: cfg.provider, model: cfg.model, status: 'error', latencyMs: Date.now() - start, error: msg })
          return null
        }
      },

      extractActions: async (text) => {
        const cfg = get()._requireModelOrFail()
        if (!cfg) return null

        const req = get()._startRequest()
        const start = Date.now()
        try {
          const result = await callProvider(cfg.provider, cfg.key, cfg.model, [
            { role: 'system', content: withCustomInstructions('Extract action items from this text. Return them as a numbered list. If no clear action items exist, say "No action items found." Be concise.') },
            { role: 'user', content: text },
          ], req.signal)
          req.done()
          set({ isLoading: false, lastResult: result, _abortController: null })
          get().recordUsage({ ts: new Date().toISOString(), feature: 'actions', provider: cfg.provider, model: cfg.model, status: 'ok', latencyMs: Date.now() - start })
          return result
        } catch (err) {
          req.done()
          const msg = err.name === 'AbortError' ? 'Request timed out or was cancelled' : err.message
          set({ isLoading: false, lastError: msg, _abortController: null })
          get().recordUsage({ ts: new Date().toISOString(), feature: 'actions', provider: cfg.provider, model: cfg.model, status: 'error', latencyMs: Date.now() - start, error: msg })
          return null
        }
      },

      generateReflection: async (journalEntries, milestoneData, financeData) => {
        const cfg = get()._requireModelOrFail()
        if (!cfg) return null

        const req = get()._startRequest()
        const start = Date.now()
        try {
          const entrySummaries = journalEntries
            .slice(0, 10)
            .map((e) => `[${e.date}] ${e.title}: ${e.content.slice(0, 200)}`)
            .join('\n')

          let context = entrySummaries
          if (milestoneData) context += `\n\nMILESTONE PROGRESS:\n${milestoneData}`
          if (financeData) context += `\n\nFINANCE SUMMARY:\n${financeData}`

          const result = await callProvider(cfg.provider, cfg.key, cfg.model, [
            { role: 'system', content: withCustomInstructions('You are an academic reflection assistant. Based on the journal entries, milestone progress, and financial data below, provide a comprehensive weekly reflection summary highlighting: 1) Key themes and patterns, 2) Progress made on goals and milestones, 3) Financial habits and observations, 4) Specific actionable recommendations for next week. Keep it under 300 words.') },
            { role: 'user', content: context },
          ], req.signal)
          req.done()
          set({ isLoading: false, lastResult: result, _abortController: null })
          get().recordUsage({ ts: new Date().toISOString(), feature: 'reflection', provider: cfg.provider, model: cfg.model, status: 'ok', latencyMs: Date.now() - start })
          return result
        } catch (err) {
          req.done()
          const msg = err.name === 'AbortError' ? 'Request timed out or was cancelled' : err.message
          set({ isLoading: false, lastError: msg, _abortController: null })
          get().recordUsage({ ts: new Date().toISOString(), feature: 'reflection', provider: cfg.provider, model: cfg.model, status: 'error', latencyMs: Date.now() - start, error: msg })
          return null
        }
      },

      /**
       * Generate a milestone tree from a text prompt or document content.
       * Returns an object { parent: { title, description, date }, children: [{ title, description, date }] }
       * or null on failure.
       */
      generateMilestoneTree: async (prompt, documentText) => {
        const cfg = get()._requireModelOrFail()
        if (!cfg) return null

        const req = get()._startRequest()
        const start = Date.now()
        try {
          const userContent = documentText
            ? `Context document:\n${documentText.slice(0, 25000)}\n\nUser request: ${prompt}`
            : prompt

          const result = await callProvider(cfg.provider, cfg.key, cfg.model, [
            { role: 'system', content: withCustomInstructions(`You are a project planning assistant. Given a goal or document, create a milestone timeline tree.
Return a JSON object in this format (you may wrap it in a markdown code block):
{
  "parent": { "title": "Main Goal", "description": "Overall objective", "date": "YYYY-MM-DD" },
  "children": [
    { "title": "Step 1", "description": "First sub-task", "date": "YYYY-MM-DD" },
    { "title": "Step 2", "description": "Second sub-task", "date": "YYYY-MM-DD" }
  ]
}
Rules:
- The parent is the overarching milestone. Children are concrete sub-steps to achieve it.
- Generate 3-8 meaningful children depending on complexity.
- Dates should be reasonable estimates spread out from today. Use ISO format (YYYY-MM-DD).
- Descriptions should be actionable and specific (1-2 sentences each).
- You MUST include the JSON in your response. It is the only part that matters.`) },
            { role: 'user', content: userContent },
          ], req.signal, { maxTokens: 8192 })

          req.done()

          /* Robust JSON extraction — handles code fences, trailing commas,
             truncated output, leading/trailing prose from weaker models */
          let parsed
          const tryParse = (str) => {
            /* strip trailing commas before } or ] */
            const fixed = str.replace(/,\s*([}\]])/g, '$1')
            return JSON.parse(fixed)
          }
          try {
            /* 1. Strip code fences */
            let cleaned = result.replace(/```(?:json|JSON)?\s*/g, '').replace(/```\s*$/g, '').trim()

            /* 2. Try direct parse */
            try { parsed = tryParse(cleaned) } catch { /* fallback below */ }

            /* 3. Extract outermost { ... } */
            if (!parsed) {
              const match = cleaned.match(/\{[\s\S]*\}/)
              if (match) try { parsed = tryParse(match[0]) } catch { /* fallback below */ }
            }

            /* 4. Handle truncated JSON — try closing open brackets */
            if (!parsed) {
              let candidate = cleaned.match(/\{[\s\S]*/)?.[0] || cleaned
              candidate = candidate.replace(/,\s*$/, '')
              /* count open vs close brackets */
              const opens  = (candidate.match(/\[/g) || []).length - (candidate.match(/\]/g) || []).length
              const braces = (candidate.match(/\{/g) || []).length - (candidate.match(/\}/g) || []).length
              for (let i = 0; i < opens;  i++) candidate += ']'
              for (let i = 0; i < braces; i++) candidate += '}'
              try { parsed = tryParse(candidate) } catch { /* give up */ }
            }

            if (!parsed) throw new Error('AI response was not valid JSON. Try a higher-quality model or rephrase your prompt.')
          } catch (parseErr) {
            throw parseErr
          }

          if (!parsed?.parent?.title || !Array.isArray(parsed?.children)) {
            throw new Error('AI returned an unexpected format. Try again with a clearer prompt.')
          }

          set({ isLoading: false, lastResult: JSON.stringify(parsed, null, 2), _abortController: null })
          get().recordUsage({ ts: new Date().toISOString(), feature: 'milestone-ai', provider: cfg.provider, model: cfg.model, status: 'ok', latencyMs: Date.now() - start })
          return parsed
        } catch (err) {
          req.done()
          const msg = err.name === 'AbortError' ? 'Request timed out or was cancelled' : err.message
          set({ isLoading: false, lastError: msg, _abortController: null })
          get().recordUsage({ ts: new Date().toISOString(), feature: 'milestone-ai', provider: cfg.provider, model: cfg.model, status: 'error', latencyMs: Date.now() - start, error: msg })
          return null
        }
      },

      /**
       * Summarize media (audio/video) or documents (pdf/docx/pptx/txt).
       */
      summarizeMedia: async (file) => {
        const cfg = get()._requireModelOrFail()
        if (!cfg) return null

        const req = get()._startRequest()
        const mimeType = file.type || 'application/octet-stream'
        const isAudio = mimeType.startsWith('audio/')
        const isVideo = mimeType.startsWith('video/')
        const isDocument = /\.(pdf|docx?|pptx?|txt|rtf|csv|md)$/i.test(file.name) ||
          mimeType.startsWith('application/pdf') ||
          mimeType.includes('document') ||
          mimeType.includes('presentation') ||
          mimeType.startsWith('text/')

        /* Document path: extract text → summarize via standard text pipeline */
        if (isDocument) {
          const start = Date.now()
          try {
            let textContent = ''

            if (mimeType.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
              textContent = await file.text()
            } else {
              /* Binary docs (pdf/docx/pptx) — send as base64 via each provider's multimodal API */
              const arrayBuf = await file.arrayBuffer()
              const base64 = btoa(new Uint8Array(arrayBuf).reduce((d, b) => d + String.fromCharCode(b), ''))
              const docPrompt = `Analyze this document. Provide: 1) A concise summary, 2) Key points or topics, 3) Any action items. Be thorough but structured.`
              let result

              if (cfg.provider === 'gemini') {
                const provider = AI_PROVIDERS.gemini
                const url = `${provider.baseUrl}/models/${cfg.model}:generateContent?key=${encodeURIComponent(cfg.key)}`
                const body = {
                  contents: [{ parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: docPrompt },
                  ] }],
                  generationConfig: { maxOutputTokens: 4096 },
                }
                const resp = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                  signal: req.signal,
                })
                if (!resp.ok) {
                  const err = await resp.text()
                  throw new Error(`Gemini API error (${resp.status}): ${err}`)
                }
                const data = await resp.json()
                result = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
              } else if (cfg.provider === 'openai' || cfg.provider === 'openrouter') {
                const provider = AI_PROVIDERS[cfg.provider]
                const url = `${provider.baseUrl}/chat/completions`
                const hdrs = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.key}` }
                if (cfg.provider === 'openrouter') {
                  hdrs['HTTP-Referer'] = 'https://everkeep.app'
                  hdrs['X-Title'] = 'Everkeep'
                }
                const body = {
                  model: cfg.model,
                  messages: [
                    { role: 'system', content: withCustomInstructions('You are an academic document analyst. Analyze documents thoroughly and provide structured summaries.') },
                    { role: 'user', content: [
                      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
                      { type: 'text', text: docPrompt },
                    ] },
                  ],
                  max_tokens: 4096,
                }
                const resp = await fetch(url, { method: 'POST', headers: hdrs, body: JSON.stringify(body), signal: req.signal })
                if (!resp.ok) {
                  const errText = await resp.text()
                  if (resp.status === 400 || resp.status === 422) {
                    throw new Error(`${provider.name}: Model "${cfg.model}" may not support document files. Try a multimodal model like gpt-4o or google/gemini-2.5-pro.`)
                  }
                  throw new Error(`${provider.name} API error (${resp.status}): ${errText}`)
                }
                const data = await resp.json()
                result = data.choices?.[0]?.message?.content || ''
              } else if (cfg.provider === 'claude') {
                const provider = AI_PROVIDERS.claude
                const url = `${provider.baseUrl}/messages`
                const hdrs = {
                  'Content-Type': 'application/json',
                  'x-api-key': cfg.key,
                  'anthropic-version': '2023-06-01',
                  'anthropic-dangerous-direct-browser-access': 'true',
                }
                const body = {
                  model: cfg.model,
                  max_tokens: 4096,
                  system: withCustomInstructions('You are an academic document analyst. Analyze documents thoroughly and provide structured summaries.'),
                  messages: [{ role: 'user', content: [
                    { type: 'document', source: { type: 'base64', media_type: mimeType, data: base64 } },
                    { type: 'text', text: docPrompt },
                  ] }],
                }
                const resp = await fetch(url, { method: 'POST', headers: hdrs, body: JSON.stringify(body), signal: req.signal })
                if (!resp.ok) {
                  const errText = await resp.text()
                  if (resp.status === 400) {
                    throw new Error(`Claude: Model may not support this document type. Try a newer Claude model or use Gemini.`)
                  }
                  throw new Error(`Claude API error (${resp.status}): ${errText}`)
                }
                const data = await resp.json()
                result = data.content?.[0]?.text || ''
              }

              req.done()
              set({ isLoading: false, lastResult: result, _abortController: null })
              get().recordUsage({ ts: new Date().toISOString(), feature: 'document', provider: cfg.provider, model: cfg.model, status: 'ok', latencyMs: Date.now() - start })
              return result
            }

            /* Text-based document: summarize via standard text pipeline */
            const truncated = textContent.slice(0, 30000)
            const result = await callProvider(cfg.provider, cfg.key, cfg.model, [
              { role: 'system', content: withCustomInstructions('You are an academic document analyst. Analyze the following document content. Provide: 1) A concise summary, 2) Key topics or points, 3) Any action items mentioned. Be thorough but structured.') },
              { role: 'user', content: truncated },
            ], req.signal)
            req.done()
            set({ isLoading: false, lastResult: result, _abortController: null })
            get().recordUsage({ ts: new Date().toISOString(), feature: 'document', provider: cfg.provider, model: cfg.model, status: 'ok', latencyMs: Date.now() - start })
            return result
          } catch (err) {
            req.done()
            const msg = err.name === 'AbortError' ? 'Request timed out or was cancelled' : err.message
            set({ isLoading: false, lastError: msg, _abortController: null })
            get().recordUsage({ ts: new Date().toISOString(), feature: 'document', provider: cfg.provider, model: cfg.model, status: 'error', latencyMs: Date.now() - start, error: msg })
            return null
          }
        }

        /* Audio/Video path: multimodal API */
        const start = Date.now()
        const mediaType = isAudio ? 'audio' : isVideo ? 'video' : 'media'
        try {
          const arrayBuf = await file.arrayBuffer()
          const base64 = btoa(
            new Uint8Array(arrayBuf).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )

          const prompt = `Analyze and summarize this ${mediaType} file. Provide: 1) A concise summary of the content, 2) Key topics or points discussed, 3) Any action items mentioned. Be thorough but structured.`
          let result

          /* Gemini: best native multimodal support for audio/video */
          if (cfg.provider === 'gemini') {
            const provider = AI_PROVIDERS.gemini
            const url = `${provider.baseUrl}/models/${cfg.model}:generateContent?key=${encodeURIComponent(cfg.key)}`
            const body = {
              contents: [{
                parts: [
                  { inlineData: { mimeType, data: base64 } },
                  { text: prompt },
                ],
              }],
              generationConfig: { maxOutputTokens: 4096 },
            }
            const resp = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
              signal: req.signal,
            })
            if (!resp.ok) {
              const err = await resp.text()
              throw new Error(`Gemini API error (${resp.status}): ${err}`)
            }
            const data = await resp.json()
            result = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
          }

          /* OpenAI / OpenRouter: use data URL in image_url content part
             This is the correct multimodal format — image_url accepts any data: URI */
          else if (cfg.provider === 'openai' || cfg.provider === 'openrouter') {
            const provider = AI_PROVIDERS[cfg.provider]
            const url = `${provider.baseUrl}/chat/completions`
            const hdrs = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cfg.key}`,
            }
            if (cfg.provider === 'openrouter') {
              hdrs['HTTP-Referer'] = 'https://everkeep.app'
              hdrs['X-Title'] = 'Everkeep'
            }

            const body = {
              model: cfg.model,
              messages: [
                { role: 'system', content: withCustomInstructions('You are an academic assistant that analyzes audio and video recordings. Provide clear, structured summaries.') },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image_url',
                      image_url: { url: `data:${mimeType};base64,${base64}` },
                    },
                    { type: 'text', text: prompt },
                  ],
                },
              ],
              max_tokens: 4096,
            }
            const resp = await fetch(url, {
              method: 'POST',
              headers: hdrs,
              body: JSON.stringify(body),
              signal: req.signal,
            })
            if (!resp.ok) {
              const errText = await resp.text()
              /* If the model doesn't support this media type, give a clear message */
              if (resp.status === 400 || resp.status === 422) {
                throw new Error(`${provider.name}: Model "${cfg.model}" may not support ${mediaType} files. Try a multimodal model like gpt-4o or gemini-2.0-flash.`)
              }
              throw new Error(`${provider.name} API error (${resp.status}): ${errText}`)
            }
            const data = await resp.json()
            result = data.choices?.[0]?.message?.content || ''
          }

          /* Claude: use document type for media content */
          else if (cfg.provider === 'claude') {
            const provider = AI_PROVIDERS.claude
            const url = `${provider.baseUrl}/messages`
            const hdrs = {
              'Content-Type': 'application/json',
              'x-api-key': cfg.key,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            }

            const body = {
              model: cfg.model,
              max_tokens: 4096,
              system: withCustomInstructions('You are an academic assistant that analyzes audio and video recordings. Provide clear, structured summaries.'),
              messages: [{
                role: 'user',
                content: [
                  {
                    type: 'document',
                    source: { type: 'base64', media_type: mimeType, data: base64 },
                  },
                  { type: 'text', text: prompt },
                ],
              }],
            }
            const resp = await fetch(url, {
              method: 'POST',
              headers: hdrs,
              body: JSON.stringify(body),
              signal: req.signal,
            })
            if (!resp.ok) {
              const errText = await resp.text()
              if (resp.status === 400) {
                throw new Error(`Claude: Model may not support ${mediaType} files directly. Try Gemini for best audio/video support.`)
              }
              throw new Error(`Claude API error (${resp.status}): ${errText}`)
            }
            const data = await resp.json()
            result = data.content?.[0]?.text || ''
          }

          else {
            throw new Error(`Media summarization not supported for provider: ${cfg.provider}`)
          }

          req.done()
          set({ isLoading: false, lastResult: result, _abortController: null })
          get().recordUsage({ ts: new Date().toISOString(), feature: 'media', provider: cfg.provider, model: cfg.model, status: 'ok', latencyMs: Date.now() - start })
          return result
        } catch (err) {
          req.done()
          const msg = err.name === 'AbortError' ? 'Request timed out or was cancelled' : err.message
          set({ isLoading: false, lastError: msg, _abortController: null })
          get().recordUsage({ ts: new Date().toISOString(), feature: 'media', provider: cfg.provider, model: cfg.model, status: 'error', latencyMs: Date.now() - start, error: msg })
          return null
        }
      },

      /* ── Utility ─────────────────────────────────────── */
      isConfigured: () => {
        const { activeProvider, activeModel, providerKeys } = get()
        return !!(activeProvider && providerKeys[activeProvider] && activeModel)
      },

      clearError: () => set({ lastError: null }),
    }),
    {
      name: 'campus-chronicle-ai',
      partialize: (state) => ({
        activeProvider: state.activeProvider,
        activeModel: state.activeModel,
        modelByProvider: state.modelByProvider,
        providerStatus: state.providerStatus,
        providerKeys: state.providerKeys,
        aiUsageLog: state.aiUsageLog,
      }),
      onRehydrateStorage: () => () => {
        useAIStore.getState().hydrateKeys()
      },
    }
  )
)

export { callProvider }
export default useAIStore
