import { useState, useRef, useEffect } from 'react'
import { Client } from '@langchain/langgraph-sdk'
import { useAuth } from '../../context/useAuth.js'
import Sidebar from '../Sidebar/Sidebar.jsx'
import TimeTravelPanel from '../TimeTravel/TimeTravelPanel.jsx'
import styles from './Chat.module.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://cripple-lee-personal-assistant-server.hf.space'
const client = new Client({ apiUrl: API_BASE })

function ChatMessage({ role, content, isStreaming }) {
  return (
    <div className={`${styles.message} ${role === 'human' ? styles.user : styles.agent}`}>
      <div className={styles.bubble}>
        <span className={styles.role}>{role === 'human' ? 'You' : 'AI'}</span>
        <p className={styles.content}>
          {content}
          {role === 'agent' && isStreaming && <span className={styles.cursor} aria-hidden="true" />}
        </p>
      </div>
    </div>
  )
}

const GREETING = { role: 'assistant', content: 'Hello! How can I help you today?', id: 0 }

export default function Chat() {
  const { hfToken } = useAuth()

  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [streamingId, setStreamingId] = useState(null)
  const [threadId, setThreadId] = useState(null)
  const [threads, setThreads] = useState([])
  const [showTimeTravel, setShowTimeTravel] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [activeCheckpointId, setActiveCheckpointId] = useState(null)
  // Remembers the forked checkpoint per thread, so reopening a conversation
  // from the sidebar shows the messages at the fork point instead of the tip.
  const [forkedCheckpoints, setForkedCheckpoints] = useState({})
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load persisted threads on mount so past conversations can be reopened.
  useEffect(() => {
    const loadThreads = async () => {
      try {
        const result = await client.threads.search({ limit: 20 })
        // Fetch message previews for each thread to show summaries in sidebar
        const threadsWithPreviews = await Promise.all(
          result.map(async (thread) => {
            try {
              const state = await client.threads.getState(thread.thread_id)
              const messages = state.values?.messages || []
              const firstUserMessage = messages.find((m) => m.type === 'human')
              const preview = firstUserMessage?.content
                ? String(firstUserMessage.content).slice(0, 50) +
                  (String(firstUserMessage.content).length > 50 ? '…' : '')
                : 'New conversation'
              return { ...thread, preview }
            } catch {
              return { ...thread, preview: 'New conversation' }
            }
          })
        )
        setThreads(threadsWithPreviews)
      } catch (err) {
        console.error('Failed to load threads:', err)
      }
    }
    loadThreads()
  }, [])

  const loadThreadHistory = async (id) => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      // If this conversation was forked at a checkpoint earlier, check out
      // the messages at that checkpoint instead of the thread tip.
      const forkCheckpointId = forkedCheckpoints[id]
      const state = forkCheckpointId
        ? await client.threads.getState(id, forkCheckpointId)
        : await client.threads.getState(id)
      const history = (state.values?.messages || [])
        .filter((m) => m?.content)
        .map((m, i) => ({
          role: m.type === 'human' ? 'human' : 'assistant',
          content: typeof m.content === 'string' ? m.content : '',
          id: m.id || i,
        }))
      setThreadId(id)
      // Drop the previous thread's checkpoints; the sync effect reloads them
      // for the newly selected thread if the panel is open.
      setHistory([])
      setMessages(history.length > 0 ? [GREETING, ...history] : [GREETING])
      setStreamingId(null)
      setInput('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch the checkpoint history for the given thread (newest first).
  const refreshHistory = async (id) => {
    if (!id) {
      setHistory([])
      return
    }
    setHistoryLoading(true)
    setError(null)
    try {
      const states = await client.threads.getHistory(id, { limit: 50 })
      setHistory(states)
    } catch (err) {
      setError(err.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Keep the time travel panel in sync with the selected conversation:
  // whenever the active thread changes while the panel is open, reload that
  // thread's checkpoints. The fetch is deferred to a microtask so no setState
  // runs synchronously in the effect body.
  useEffect(() => {
    if (!showTimeTravel) return
    let cancelled = false
    queueMicrotask(async () => {
      setHistoryLoading(true)
      try {
        const states = await client.threads.getHistory(threadId, { limit: 50 })
        if (!cancelled) setHistory(states)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [showTimeTravel, threadId])

  const handleToggleTimeTravel = () => {
    setShowTimeTravel((open) => !open)
  }

  const handleForkFromCheckpoint = async (state) => {
    console.log('Forking from checkpoint state:', state)
    if (loading || !threadId) return
    const checkpointId = state.checkpoint?.checkpoint_id
    if (!checkpointId) return
    setLoading(true)
    setError(null)
    try {
      // Load the state at the chosen checkpoint so the chat view shows the
      // conversation exactly as it was at that point in time.
      const pastState = await client.threads.getState(threadId, checkpointId)
      const pastMessages = (pastState.values?.messages || [])
        .filter((m) => m?.content)
        .map((m, i) => ({
          role: m.type === 'human' ? 'human' : 'assistant',
          content: typeof m.content === 'string' ? m.content : '',
          id: m.id || i,
        }))
      // Restore the last human message as the input so the user can continue
      // the conversation from that point, and show the rest of the messages in the chat view.
      const lastMessage = pastMessages.pop()
      setInput(lastMessage?.role === 'human' ? lastMessage.content : '')
      setMessages(pastMessages.length > 0 ? [GREETING, ...pastMessages] : [GREETING])
      // Remember the fork point; the next run passes it as checkpointId so
      // LangGraph forks the thread from this checkpoint instead of the tip.
      setActiveCheckpointId(checkpointId)
      // Associate the fork with this thread so selecting the conversation in
      // the sidebar later checks out the messages at this checkpoint.
      setForkedCheckpoints((prev) => ({ ...prev, [threadId]: checkpointId }))
      // Trim the checkpoint list to the timeline at the fork point: history
      // is newest-first, so keep everything from the forked checkpoint's
      // index onward (i.e. that checkpoint and all earlier ones).
      setHistory((prev) => {
        const forkIndex = prev.findIndex(
          (s) => s.checkpoint?.checkpoint_id === checkpointId
        )
        return forkIndex >= 0 ? prev.slice(forkIndex) : prev
      })
      // Clear the remaining transient states so the chat starts fresh from
      // the forked checkpoint: close the panel and reset input/streaming.
      setStreamingId(null)
      setShowTimeTravel(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNewConversation = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const thread = await client.threads.create()
      setThreadId(thread.thread_id)
      setActiveCheckpointId(null)
      setHistory([])
      setThreads((prev) => [{ ...thread, preview: 'New conversation' }, ...prev])
      setMessages([GREETING])
      setStreamingId(null)
      setInput('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteThread = async (id) => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      await client.threads.delete(id)
      setThreads((prev) => prev.filter((t) => t.thread_id !== id))
      setForkedCheckpoints((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      // If the deleted conversation is currently open, reset the chat view.
      if (id === threadId) {
        setThreadId(null)
        setActiveCheckpointId(null)
        setMessages([GREETING])
        setStreamingId(null)
        setInput('')
        setShowTimeTravel(false)
        setHistory([])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    
    const humanMessage = { role: 'human', content: text, id: messages.length }

    const updatedMessages = [...messages, humanMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)
    setError(null)

    updatedMessages.forEach(
      message => console.log('Message: <' + message.role + '> ' + message.content)
    )

    try {
      const assistantId = 'agent'
      let currentThreadId = threadId
      if (!currentThreadId) {
        const thread = await client.threads.create()
        currentThreadId = thread.thread_id
        setThreadId(currentThreadId)
        setThreads((prev) => [{ ...thread, preview: text.slice(0, 50) + (text.length > 50 ? '…' : '') }, ...prev])
      } else {
        // Update preview with latest user message for existing thread
        setThreads((prev) =>
          prev.map((t) =>
            t.thread_id === currentThreadId
              ? { ...t, preview: text.slice(0, 50) + (text.length > 50 ? '…' : '') }
              : t
          )
        )
      }

      let stream = null
      if (activeCheckpointId) {
        console.log('Sending message with checkpointId:', activeCheckpointId)

        const newConfig = await client.threads.updateState(
          currentThreadId,
          {
            values: { messages: [humanMessage] },
            checkpointId: activeCheckpointId,
          }
        )

        stream = client.runs.stream(
          currentThreadId,
          assistantId,
          {
            input: null,
            context: { hf_token: hfToken },
            streamMode: ['events'],
            checkpointId: newConfig.configurable?.checkpoint_id,
          }
        )
      } else {
        console.log('Sending message without checkpointId')
        stream = client.runs.stream(
          currentThreadId,
          assistantId,
          {
            input: { messages: [humanMessage] },
            context: { hf_token: hfToken },
            streamMode: ['events'],
          },
        )
      }

      let hasStartedStreaming = false

      for await (const event of stream) {
        console.log('Event:', event) // Debug log to see what events we're getting

        if (event.data.event === 'on_chat_model_stream') {
          // Handle values streaming
          const value = event.data.data.chunk?.content
          console.log('Values event:', value)
          if (value !== undefined) {
            const text = String(value)
            hasStartedStreaming = true
            
            setMessages((messages) => {
              // Find the last message if it's from the agent and currently streaming
              const lastMessageIndex = messages.length - 1
              if (lastMessageIndex >= 0 && messages[lastMessageIndex].role === 'assistant') {
                // Update the last message with accumulated content
                const updatedMessages = [...messages]
                updatedMessages[lastMessageIndex] = { 
                  ...updatedMessages[lastMessageIndex], 
                  content: updatedMessages[lastMessageIndex].content + text 
                }
                return updatedMessages
              } else {
                // Create the first assistant message
                setStreamingId(messages.length)
                return [...messages, { role: 'assistant', content: text, id: messages.length }]
              }
            })
          }
        } 
      }

      setStreamingId(null)
      // The run created a new checkpoint at the thread tip; clear the fork
      // point so following messages continue from the latest state, and drop
      // the thread's fork record since the fork is now part of its history.
      setActiveCheckpointId(null)
      setForkedCheckpoints((prev) => {
        const next = { ...prev }
        delete next[currentThreadId]
        return next
      })
      // Keep the time travel panel up to date with the new checkpoint.
      if (showTimeTravel) {
        refreshHistory(currentThreadId)
      }

      // If we didn't get any streaming content, show a message
      if (!hasStartedStreaming) {
        setMessages((messages) => [...messages, { role: 'assistant', content: 'There are some problems with the agent.' }])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
}

  return (
    <div className={styles.layout}>
      <Sidebar
        threads={threads}
        activeThreadId={threadId}
        loading={loading}
        onSelectThread={loadThreadHistory}
        onNewChat={handleNewConversation}
        onDeleteThread={handleDeleteThread}
      />
      <div className={styles.chat}>
        <header className={styles.header}>
          <h1>ASSISTANT</h1>
          <button
            type="button"
            className={styles.timeTravelToggle}
            onClick={handleToggleTimeTravel}
            disabled={loading || !threadId}
            title={threadId ? 'Browse checkpoints and fork the conversation' : 'Start a conversation first'}
            aria-pressed={showTimeTravel}
          >
            ⏱ Time travel
          </button>
        </header>

        <div className={styles.messages}>
          {messages.map((msg, index) => (
            <ChatMessage key={index} role={msg.role} content={msg.content} isStreaming={msg.id === streamingId} />
          ))}
          {loading && (
            <div className={styles.loading}>
              <span className={styles.spinner} aria-hidden="true" />
              Agent is thinking…
            </div>
          )}
          {error && <div className={styles.error}>Error: {error}</div>}
          <div ref={messagesEndRef} />
        </div>

        <form className={styles.inputArea} onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
            disabled={loading}
            aria-label="Message"
          />
          <button type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>
      {showTimeTravel && (
        <TimeTravelPanel
          history={history}
          loading={historyLoading}
          activeCheckpointId={activeCheckpointId}
          onFork={handleForkFromCheckpoint}
          onClose={() => setShowTimeTravel(false)}
        />
      )}
    </div>
  )
}
