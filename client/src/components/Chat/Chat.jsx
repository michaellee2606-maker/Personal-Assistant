import { useState, useRef, useEffect } from 'react'
import { Client } from '@langchain/langgraph-sdk'
import { useAuth } from '../../context/useAuth.js'
import styles from './Chat.module.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://cripple-lee-personal-assistant-server.hf.space'
const client = new Client({ apiUrl: API_BASE })

function ChatMessage({ role, content, isStreaming }) {
  return (
    <div className={`${styles.message} ${role === 'user' ? styles.user : styles.agent}`}>
      <div className={styles.bubble}>
        <span className={styles.role}>{role === 'user' ? 'You' : 'AI'}</span>
        <p className={styles.content}>
          {content}
          {role === 'agent' && isStreaming && <span className={styles.cursor} aria-hidden="true" />}
        </p>
      </div>
    </div>
  )
}

export default function Chat() {
  const { hfToken } = useAuth()

  const [messages, setMessages] = useState([
    { role: 'agent', content: 'Hello! How can I help you today?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [streamingId, setStreamingId] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const assistantId = 'agent'
      const thread = await client.threads.create()
      const stream = client.runs.stream(
        thread.thread_id,
        assistantId,
        {
          input: { changeme: text },
          context: { hf_token: hfToken },
          streamMode: ['messages'],
        },
      )

      let hasStartedStreaming = false

      for await (const event of stream) {
        console.log('Event:', event) // Debug log to see what events we're getting

        if (event.event === 'messages/partial') {
          // Handle values streaming
          const value = event.data[0]?.content
          console.log('Values event:', value)
          if (value !== undefined) {
            const text = String(value)
            hasStartedStreaming = true
            
            setMessages((prev) => {
              // Find the last message if it's from the agent and currently streaming
              const lastMessageIndex = prev.length - 1
              if (lastMessageIndex >= 0 && prev[lastMessageIndex].role === 'agent') {
                // Update the last message with accumulated content
                const updatedMessages = [...prev]
                updatedMessages[lastMessageIndex] = { 
                  ...updatedMessages[lastMessageIndex], 
                  content: text 
                }
                return updatedMessages
              } else {
                // Create the first assistant message
                setStreamingId(prev.length)
                return [...prev, { role: 'agent', content: text, id: prev.length }]
              }
            })
          }
        } 
      }

      setStreamingId(null)

      // If we didn't get any streaming content, show a message
      if (!hasStartedStreaming) {
        setMessages((prev) => [...prev, { role: 'agent', content: 'There are some problems with the agent.' }])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.chat}>
      <header className={styles.header}>
        <h1>PERSONAL ASSISTANT</h1>
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
  )
}
