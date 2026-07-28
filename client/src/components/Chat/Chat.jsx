import { useState, useRef, useEffect } from 'react'
import { Client } from '@langchain/langgraph-sdk'
import { useAuth } from '../../context/useAuth.js'
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

export default function Chat() {
  const { hfToken } = useAuth()

  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! How can I help you today?', id: 0 },
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
      const thread = await client.threads.create()
      const stream = client.runs.stream(
        thread.thread_id,
        assistantId,
        {
          input: { messages: updatedMessages },
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
            
            setMessages((messages) => {
              // Find the last message if it's from the agent and currently streaming
              const lastMessageIndex = messages.length - 1
              if (lastMessageIndex >= 0 && messages[lastMessageIndex].role === 'assistant') {
                // Update the last message with accumulated content
                const updatedMessages = [...messages]
                updatedMessages[lastMessageIndex] = { 
                  ...updatedMessages[lastMessageIndex], 
                  content: text 
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
