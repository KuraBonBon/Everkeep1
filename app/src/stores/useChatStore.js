import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import useAIStore, { callProvider } from './useAIStore'
import useMilestoneStore from './useMilestoneStore'
import useJournalStore from './useJournalStore'
import useFinanceStore from './useFinanceStore'

const SYSTEM_PROMPT = `You are Everkeep AI — a helpful study-companion chatbot embedded inside an Electron app for students. You can chat normally AND take actions when the user asks you to create something.

Available actions (use EXACTLY this format when the user requests something):

1. Create a journal reflection:
:::ACTION:create_journal
{"title":"...", "content":"...", "tags":["..."], "course":""}
:::END_ACTION

2. Create a project timeline (with sub-steps):
:::ACTION:create_timeline
{"title":"...", "description":"...", "date":"YYYY-MM-DD", "course":"", "steps":[{"title":"...","description":"...","date":"YYYY-MM-DD"}]}
:::END_ACTION

3. Add a finance transaction:
:::ACTION:add_transaction
{"type":"expense|income", "amount":0, "category":"...", "description":"...", "date":"YYYY-MM-DD"}
:::END_ACTION

Rules:
- Only use actions when the user explicitly asks to create/add something.
- You can include multiple actions in one response if the user requests several things.
- Always include a short conversational message alongside actions explaining what you did.
- For timelines, the top-level object is the project; "steps" are the sub-milestones.
- For finance, type is either "expense" or "income". The category should be a reasonable guess.
- Dates should be in YYYY-MM-DD format. Use reasonable future dates if the user doesn't specify.
- Keep responses concise and helpful. You're a study assistant.`

function parseActions(text) {
  const actions = []
  const regex = /:::ACTION:(\w+)\s+([\s\S]*?):::END_ACTION/g
  let match
  while ((match = regex.exec(text)) !== null) {
    try {
      const type = match[1]
      let jsonStr = match[2].trim()
      // Fix trailing commas
      jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1')
      const data = JSON.parse(jsonStr)
      actions.push({ type, data, id: uuidv4() })
    } catch { /* skip malformed action */ }
  }
  return actions
}

function stripActionBlocks(text) {
  return text.replace(/:::ACTION:\w+\s+[\s\S]*?:::END_ACTION/g, '').trim()
}

function executeAction(action) {
  const { type, data } = action
  switch (type) {
    case 'create_journal': {
      useJournalStore.getState().addEntry({
        title: data.title || 'Untitled',
        content: data.content || '',
        tags: data.tags || [],
        course: data.course || '',
      })
      return { success: true, label: `Created journal entry: "${data.title}"` }
    }
    case 'create_timeline': {
      const parent = {
        title: data.title || 'Untitled Project',
        description: data.description || '',
        date: data.date || '',
        course: data.course || '',
        status: 'upcoming',
        linkedArtifactIds: [],
        parentId: null,
      }
      const children = (data.steps || []).map((s) => ({
        title: s.title || '',
        description: s.description || '',
        date: s.date || '',
        course: data.course || '',
        status: 'upcoming',
      }))
      useMilestoneStore.getState().addMilestoneTree(parent, children)
      return { success: true, label: `Created project "${data.title}" with ${children.length} step(s)` }
    }
    case 'add_transaction': {
      useFinanceStore.getState().addTransaction({
        type: data.type || 'expense',
        amount: data.amount || 0,
        category: data.category || 'Other',
        description: data.description || '',
        date: data.date || new Date().toISOString().slice(0, 10),
      })
      return { success: true, label: `Added ${data.type}: ${data.category} — $${data.amount}` }
    }
    default:
      return { success: false, label: `Unknown action: ${type}` }
  }
}

const useChatStore = create(
  persist(
    (set, get) => ({
      /* ── Conversation state ──────── */
      conversations: [],          // [{ id, title, createdAt, updatedAt }]
      activeConversationId: null,
      messagesByConversation: {},  // { [convId]: messages[] }
      isLoading: false,
      customSystemPrompt: '',

      setCustomSystemPrompt: (prompt) => set({ customSystemPrompt: prompt }),

      /* ── Conversation management ── */
      newConversation: () => {
        const id = uuidv4()
        set((s) => ({
          conversations: [
            { id, title: 'New Chat', createdAt: Date.now(), updatedAt: Date.now() },
            ...s.conversations,
          ],
          activeConversationId: id,
          messagesByConversation: { ...s.messagesByConversation, [id]: [] },
        }))
        return id
      },

      switchConversation: (id) => set({ activeConversationId: id }),

      deleteConversation: (id) => {
        set((s) => {
          const convs = s.conversations.filter((c) => c.id !== id)
          const msgs = { ...s.messagesByConversation }
          delete msgs[id]
          const activeId = s.activeConversationId === id
            ? (convs[0]?.id || null)
            : s.activeConversationId
          return { conversations: convs, messagesByConversation: msgs, activeConversationId: activeId }
        })
      },

      clearChat: () => {
        const { activeConversationId } = get()
        if (!activeConversationId) return
        set((s) => ({
          messagesByConversation: {
            ...s.messagesByConversation,
            [activeConversationId]: [],
          },
        }))
      },

      /* ── Messaging ─────────────── */
      sendMessage: async (content) => {
        if (!content.trim()) return
        const aiStore = useAIStore.getState()

        let activeId = get().activeConversationId
        if (!activeId) activeId = get().newConversation()

        const currentMsgs = get().messagesByConversation[activeId] || []
        const isFirst = currentMsgs.length === 0
        const titleUpdate = isFirst
          ? (content.length > 50 ? content.slice(0, 47) + '...' : content)
          : null

        if (!aiStore.isConfigured()) {
          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === activeId
                ? { ...c, ...(titleUpdate ? { title: titleUpdate } : {}), updatedAt: Date.now() }
                : c
            ),
            messagesByConversation: {
              ...s.messagesByConversation,
              [activeId]: [
                ...currentMsgs,
                { id: uuidv4(), role: 'user', content, timestamp: Date.now() },
                { id: uuidv4(), role: 'assistant', content: 'Please configure an AI provider in Settings first.', timestamp: Date.now() },
              ],
            },
          }))
          return
        }

        const userMsg = { id: uuidv4(), role: 'user', content, timestamp: Date.now() }
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === activeId
              ? { ...c, ...(titleUpdate ? { title: titleUpdate } : {}), updatedAt: Date.now() }
              : c
          ),
          messagesByConversation: {
            ...s.messagesByConversation,
            [activeId]: [...currentMsgs, userMsg],
          },
          isLoading: true,
        }))

        const history = [...(get().messagesByConversation[activeId] || []).slice(-20)]
        const custom = get().customSystemPrompt?.trim()
        const systemContent = custom
          ? SYSTEM_PROMPT + '\n\n--- Custom Instructions from the user ---\n' + custom
          : SYSTEM_PROMPT
        const chatMessages = [
          { role: 'system', content: systemContent },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ]

        const { activeProvider, activeModel, providerKeys } = aiStore
        const key = providerKeys[activeProvider]
        const start = Date.now()

        try {
          const reply = await callProvider(activeProvider, key, activeModel, chatMessages, null)
          const actions = parseActions(reply)
          const cleanContent = stripActionBlocks(reply) || reply

          const assistantMsg = {
            id: uuidv4(),
            role: 'assistant',
            content: cleanContent,
            timestamp: Date.now(),
            actions: actions.length > 0 ? actions : undefined,
          }

          set((s) => ({
            messagesByConversation: {
              ...s.messagesByConversation,
              [activeId]: [...(s.messagesByConversation[activeId] || []), assistantMsg],
            },
            isLoading: false,
          }))
          aiStore.recordUsage({ ts: new Date().toISOString(), feature: 'chat', provider: activeProvider, model: activeModel, status: 'ok', latencyMs: Date.now() - start })
        } catch (err) {
          const errMsg = {
            id: uuidv4(),
            role: 'assistant',
            content: `Sorry, something went wrong: ${err.message}`,
            timestamp: Date.now(),
          }
          set((s) => ({
            messagesByConversation: {
              ...s.messagesByConversation,
              [activeId]: [...(s.messagesByConversation[activeId] || []), errMsg],
            },
            isLoading: false,
          }))
          aiStore.recordUsage({ ts: new Date().toISOString(), feature: 'chat', provider: activeProvider, model: activeModel, status: 'error', latencyMs: Date.now() - start, error: err.message })
        }
      },

      executeAction: (actionId) => {
        const activeId = get().activeConversationId
        if (!activeId) return
        set((s) => ({
          messagesByConversation: {
            ...s.messagesByConversation,
            [activeId]: (s.messagesByConversation[activeId] || []).map((msg) => {
              if (!msg.actions) return msg
              const action = msg.actions.find((a) => a.id === actionId)
              if (!action) return msg
              const result = executeAction(action)
              const existing = msg.actionResults || {}
              return { ...msg, actionResults: { ...existing, [actionId]: result } }
            }),
          },
        }))
      },
    }),
    {
      name: 'everkeep-chat',
      version: 1,
      migrate: (persistedState, version) => {
        if (version < 1) {
          const oldMessages = persistedState?.messages || []
          const customSystemPrompt = persistedState?.customSystemPrompt || ''
          if (oldMessages.length > 0) {
            const id = uuidv4()
            return {
              conversations: [{ id, title: 'Previous Chat', createdAt: Date.now(), updatedAt: Date.now() }],
              activeConversationId: id,
              messagesByConversation: { [id]: oldMessages },
              customSystemPrompt,
            }
          }
          return { conversations: [], activeConversationId: null, messagesByConversation: {}, customSystemPrompt }
        }
        return persistedState
      },
      partialize: (state) => {
        const convs = Array.isArray(state.conversations) ? state.conversations.slice(0, 50) : []
        return {
          conversations: convs,
          activeConversationId: state.activeConversationId ?? null,
          messagesByConversation: Object.fromEntries(
            convs.map((c) => [
              c.id,
              (state.messagesByConversation?.[c.id] || []).slice(-100),
            ])
          ),
          customSystemPrompt: state.customSystemPrompt || '',
        }
      },
    },
  ),
)

export default useChatStore
