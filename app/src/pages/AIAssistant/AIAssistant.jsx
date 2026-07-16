import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineChatAlt2,
  HiOutlinePaperAirplane,
  HiOutlineTrash,
  HiOutlinePencilAlt,
  HiOutlineClock,
  HiOutlineCash,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineClipboardCopy,
  HiOutlineChevronDown,
  HiOutlineRefresh,
  HiOutlineAdjustments,
  HiOutlineX,
  HiOutlinePlus,
  HiOutlineMenu,
} from 'react-icons/hi'
import useChatStore from '../../stores/useChatStore'
import useAIStore from '../../stores/useAIStore'
import { containerV, itemV } from '../../utils/animations'
import './AIAssistant.css'

const ACTION_META = {
  create_journal: { icon: HiOutlinePencilAlt, label: 'Journal' },
  create_timeline: { icon: HiOutlineClock, label: 'Timeline' },
  add_transaction: { icon: HiOutlineCash, label: 'Finance' },
}

const SUGGESTIONS = [
  'Create a study plan for my finals next week',
  'Write a reflection about today\'s lecture on data structures',
  'Log a $12 lunch expense for today',
  'Help me plan a thesis project from start to finish',
]

const EMPTY_MESSAGES = []

function formatTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/* ── Simple rich-text renderer for AI responses ───── */
function RichText({ text }) {
  if (!text) return null

  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g)

  return parts.map((part, i) => {
    // Code block
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3)
      const firstNewline = lines.indexOf('\n')
      const lang = firstNewline > 0 ? lines.slice(0, firstNewline).trim() : ''
      const code = lang ? lines.slice(firstNewline + 1) : lines
      return (
        <div key={i} className="assistant-code-block">
          {lang && <span className="assistant-code-block__lang">{lang}</span>}
          <pre><code>{code.trim()}</code></pre>
        </div>
      )
    }

    // Inline formatting: process line by line
    return part.split('\n').map((line, j) => {
      const lineKey = `${i}-${j}`

      // Empty line = paragraph break
      if (!line.trim()) return <br key={lineKey} />

      // Heading lines (# Heading)
      const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const Tag = level === 1 ? 'strong' : level === 2 ? 'strong' : 'em'
        return <p key={lineKey} className="assistant-rich-heading"><Tag>{formatInline(headingMatch[2])}</Tag></p>
      }

      // Unordered list items
      if (/^\s*[-*•]\s+/.test(line)) {
        return <p key={lineKey} className="assistant-rich-li">{formatInline(line.replace(/^\s*[-*•]\s+/, ''))}</p>
      }

      // Numbered list items
      if (/^\s*\d+[.)]\s+/.test(line)) {
        return <p key={lineKey} className="assistant-rich-li assistant-rich-li--num">{formatInline(line.replace(/^\s*\d+[.)]\s+/, ''))}</p>
      }

      // Regular text
      return <span key={lineKey}>{formatInline(line)}{j < part.split('\n').length - 1 ? '\n' : ''}</span>
    })
  })
}

function formatInline(text) {
  // Split by inline code first to avoid processing inside code
  const segments = text.split(/(`[^`]+`)/g)
  return segments.map((seg, i) => {
    if (seg.startsWith('`') && seg.endsWith('`')) {
      return <code key={i} className="assistant-inline-code">{seg.slice(1, -1)}</code>
    }
    // Bold **text**
    const parts = seg.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return <strong key={`${i}-${j}`}>{p.slice(2, -2)}</strong>
      }
      return p
    })
  })
}

function getTimeGroup(timestamp) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const d = new Date(timestamp)
  if (d >= startOfToday) return 'Today'
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  if (d >= startOfYesterday) return 'Yesterday'
  const weekAgo = new Date(startOfToday); weekAgo.setDate(weekAgo.getDate() - 7)
  if (d >= weekAgo) return '7 Days'
  const monthAgo = new Date(startOfToday); monthAgo.setDate(monthAgo.getDate() - 30)
  if (d >= monthAgo) return '30 Days'
  return 'Older'
}

export default function AIAssistant() {
  const conversations = useChatStore((s) => s.conversations)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const messages = useChatStore((s) => s.messagesByConversation[s.activeConversationId] || EMPTY_MESSAGES)
  const isLoading = useChatStore((s) => s.isLoading)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const executeAction = useChatStore((s) => s.executeAction)
  const newConversation = useChatStore((s) => s.newConversation)
  const switchConversation = useChatStore((s) => s.switchConversation)
  const deleteConversation = useChatStore((s) => s.deleteConversation)
  const customSystemPrompt = useChatStore((s) => s.customSystemPrompt)
  const setCustomSystemPrompt = useChatStore((s) => s.setCustomSystemPrompt)
  const aiConfigured = useAIStore((s) => s.isConfigured)()

  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [promptPanelOpen, setPromptPanelOpen] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState(customSystemPrompt || '')
  const [historyOpen, setHistoryOpen] = useState(true)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const textareaRef = useRef(null)

  /* Auto-focus & clear input on conversation switch */
  useEffect(() => {
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    textareaRef.current?.focus()
  }, [activeConversationId])

  /* Auto-scroll to bottom on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  /* Track scroll position for scroll-to-bottom button */
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setShowScrollBtn(!atBottom && messages.length > 3)
  }, [messages.length])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input.trim())
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaInput = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* clipboard not available */ }
  }

  /* Retry: re-send the last user message */
  const handleRetry = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMsg) sendMessage(lastUserMsg.content)
  }

  /* Create All pending actions in a message */
  const handleCreateAll = (msg) => {
    if (!msg.actions) return
    msg.actions.forEach((action) => {
      if (!msg.actionResults?.[action.id]) {
        executeAction(action.id)
      }
    })
  }

  /* Check if message is an error */
  const isError = (msg) => msg.role === 'assistant' && msg.content?.startsWith('Sorry, something went wrong')

  /* Count pending actions in a message */
  const pendingActions = (msg) => {
    if (!msg.actions) return 0
    return msg.actions.filter((a) => !msg.actionResults?.[a.id]).length
  }

  const handleSavePrompt = () => {
    setCustomSystemPrompt(draftPrompt)
    setPromptPanelOpen(false)
  }

  const handleOpenPromptPanel = () => {
    setDraftPrompt(customSystemPrompt || '')
    setPromptPanelOpen(true)
  }

  const handleNewChat = () => {
    newConversation()
    textareaRef.current?.focus()
  }

  return (
    <motion.div className="assistant-page" variants={containerV} initial="hidden" animate="visible">
      {/* Chat History Sidebar */}
      <aside className={`assistant-history${historyOpen ? '' : ' assistant-history--collapsed'}`}>
        <div className="assistant-history__header">
          <button className="assistant-history__new" onClick={handleNewChat}>
            <HiOutlinePlus size={16} /> New Chat
          </button>
        </div>
        <div className="assistant-history__list">
          {conversations.length === 0 ? (
            <p className="assistant-history__empty">No conversations yet</p>
          ) : (() => {
            const groups = {}
            conversations.forEach((c) => {
              const group = getTimeGroup(c.updatedAt)
              if (!groups[group]) groups[group] = []
              groups[group].push(c)
            })
            return Object.entries(groups).map(([label, convs]) => (
              <div key={label} className="assistant-history__group">
                <span className="assistant-history__group-label">{label}</span>
                {convs.map((c) => (
                  <div
                    key={c.id}
                    className={`assistant-history__item${c.id === activeConversationId ? ' assistant-history__item--active' : ''}`}
                    onClick={() => switchConversation(c.id)}
                  >
                    <span className="assistant-history__item-title">{c.title}</span>
                    <button
                      className="assistant-history__item-delete"
                      onClick={(e) => { e.stopPropagation(); deleteConversation(c.id) }}
                      title="Delete conversation"
                    >
                      <HiOutlineTrash size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ))
          })()}
        </div>
      </aside>

      {/* Main Chat Column */}
      <div className="assistant-main">
      {/* Header */}
      <motion.div className="assistant-page__header" variants={itemV}>
        <div className="assistant-page__header-left">
          <button
            className="assistant-page__sidebar-toggle"
            onClick={() => setHistoryOpen((v) => !v)}
            title={historyOpen ? 'Hide chat history' : 'Show chat history'}
          >
            <HiOutlineMenu size={18} />
          </button>
          <div>
            <h1 className="assistant-page__title">AI Assistant</h1>
            <p className="assistant-page__subtitle">
              {aiConfigured
                ? 'Ask me anything or tell me to create entries, timelines, or expenses.'
                : 'Configure an AI provider in Settings to get started.'}
            </p>
          </div>
        </div>
        <div className="assistant-page__header-actions">
          <button
            className="btn btn--outline"
            onClick={handleOpenPromptPanel}
            title="Custom Instructions"
          >
            <HiOutlineAdjustments size={14} /> Instructions
          </button>
          <button className="btn btn--primary" onClick={handleNewChat}>
            <HiOutlinePlus size={14} /> New Chat
          </button>
        </div>
      </motion.div>

      {/* System Prompt Panel */}
      <AnimatePresence>
        {promptPanelOpen && (
          <motion.div
            className="assistant-prompt-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="assistant-prompt-panel__header">
              <div>
                <h3>Custom Instructions</h3>
                <p>Tell the AI how to behave, what tone to use, or any rules to follow. These instructions are applied to every message.</p>
              </div>
              <button className="assistant-prompt-panel__close" onClick={() => setPromptPanelOpen(false)}>
                <HiOutlineX size={16} />
              </button>
            </div>
            <textarea
              className="assistant-prompt-panel__input"
              placeholder={"Example instructions:\n• Always respond in formal academic tone\n• Focus on my Computer Science thesis topic\n• When creating timelines, include research phases\n• Keep responses concise and structured\n• Use bullet points for action items"}
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              rows={5}
            />
            <div className="assistant-prompt-panel__footer">
              <span className="assistant-prompt-panel__hint">
                {customSystemPrompt ? '✓ Custom instructions active' : 'No custom instructions set'}
              </span>
              <div className="assistant-prompt-panel__btns">
                {customSystemPrompt && (
                  <button
                    className="btn btn--outline assistant-prompt-panel__clear"
                    onClick={() => { setDraftPrompt(''); setCustomSystemPrompt(''); setPromptPanelOpen(false) }}
                  >
                    Remove
                  </button>
                )}
                <button className="btn btn--outline" onClick={() => setPromptPanelOpen(false)}>Cancel</button>
                <button className="btn btn--primary" onClick={handleSavePrompt}>Save</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        className="assistant-page__messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="assistant-page__empty">
            <div className="assistant-page__empty-icon">
              <HiOutlineChatAlt2 size={26} />
            </div>
            <h3>How can I help?</h3>
            <p>
              I can answer questions, create journal entries, plan project timelines, or log expenses.
              Just ask!
            </p>
            <div className="assistant-page__suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="assistant-page__suggestion"
                  onClick={() => { setInput(s); textareaRef.current?.focus() }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`assistant-msg assistant-msg--${msg.role}${isError(msg) ? ' assistant-msg--error' : ''}`}>
                <div className="assistant-msg__avatar">
                  {msg.role === 'user' ? '👤' : '✦'}
                </div>
                <div className="assistant-msg__content">
                  <div className="assistant-msg__bubble">
                    {msg.role === 'assistant' ? <RichText text={msg.content} /> : msg.content}
                  </div>
                  {/* Action cards */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="assistant-msg__actions">
                      {pendingActions(msg) > 1 && (
                        <button
                          className="assistant-action__create-all"
                          onClick={() => handleCreateAll(msg)}
                        >
                          <HiOutlineCheckCircle size={13} /> Create All ({pendingActions(msg)})
                        </button>
                      )}
                      {msg.actions.map((action) => {
                        const meta = ACTION_META[action.type] || { icon: HiOutlineCheckCircle, label: action.type }
                        const Icon = meta.icon
                        const result = msg.actionResults?.[action.id]
                        return (
                          <div key={action.id} className="assistant-action">
                            <div className="assistant-action__info">
                              <div className={`assistant-action__icon assistant-action__icon--${action.type}`}>
                                <Icon size={14} />
                              </div>
                              <span className="assistant-action__label">
                                {result ? result.label : action.data?.title || meta.label}
                              </span>
                            </div>
                            {result ? (
                              result.success ? (
                                <span className="assistant-action__btn assistant-action__btn--done">
                                  <HiOutlineCheckCircle size={12} /> Done
                                </span>
                              ) : (
                                <span className="assistant-action__btn assistant-action__btn--failed">
                                  <HiOutlineExclamation size={12} /> Failed
                                </span>
                              )
                            ) : (
                              <button
                                className="assistant-action__btn assistant-action__btn--execute"
                                onClick={() => executeAction(action.id)}
                              >
                                Create
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="assistant-msg__meta">
                    <span className="assistant-msg__time">{formatTime(msg.timestamp)}</span>
                    {msg.role === 'assistant' && !isError(msg) && (
                      <button
                        className={`assistant-msg__copy${copied === msg.content ? ' assistant-msg__copy--done' : ''}`}
                        onClick={() => handleCopy(msg.content)}
                        title="Copy message"
                      >
                        <HiOutlineClipboardCopy size={12} />
                        {copied === msg.content ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  {/* Retry button on error messages */}
                  {isError(msg) && (
                    <button className="assistant-msg__retry" onClick={handleRetry}>
                      <HiOutlineRefresh size={12} /> Retry
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="assistant-msg assistant-msg--assistant">
                <div className="assistant-msg__avatar">✦</div>
                <div className="assistant-msg__bubble">
                  <div className="assistant-msg__loading">
                    <span className="assistant-msg__dot" />
                    <span className="assistant-msg__dot" />
                    <span className="assistant-msg__dot" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll-to-bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            className="assistant-page__scroll-btn"
            onClick={scrollToBottom}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <HiOutlineChevronDown size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="assistant-page__input-area">
        <div className="assistant-page__input-row">
          <textarea
            ref={textareaRef}
            className="assistant-page__textarea"
            placeholder={aiConfigured ? 'Type a message… (Shift+Enter for new line)' : 'Configure AI in Settings first'}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            disabled={!aiConfigured || isLoading}
            rows={1}
          />
          <button
            className="assistant-page__send"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !aiConfigured}
          >
            <HiOutlinePaperAirplane size={18} style={{ transform: 'rotate(90deg)' }} />
          </button>
        </div>
      </div>
      </div>{/* .assistant-main */}
    </motion.div>
  )
}
