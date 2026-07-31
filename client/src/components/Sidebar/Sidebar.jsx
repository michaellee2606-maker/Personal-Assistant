import { useState } from 'react'
import styles from './Sidebar.module.css'

function formatThreadLabel(thread) {
  // Show message preview if available, otherwise fall back to timestamp
  if (thread.preview) {
    return thread.preview
  }
  const date = new Date(thread.created_at)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  return isToday
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function Sidebar({ threads, activeThreadId, loading, onSelectThread, onNewChat, onDeleteThread }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.top}>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <span className={`${styles.chevron} ${collapsed ? styles.chevronRight : ''}`} aria-hidden="true">
            ‹
          </span>
        </button>

        <button
          type="button"
          className={styles.newChat}
          onClick={onNewChat}
          disabled={loading}
          title="New conversation"
        >
          <span className={styles.newChatIcon} aria-hidden="true">+</span>
          <span className={styles.newChatLabel}>New chat</span>
        </button>
      </div>

      <nav className={styles.threadList} aria-label="Conversations">
        {threads.length === 0 && !collapsed && (
          <p className={styles.empty}>No conversations yet</p>
        )}
        {threads.map((t) => (
          <div
            key={t.thread_id}
            className={`${styles.threadItem} ${t.thread_id === activeThreadId ? styles.active : ''}`}
          >
            <button
              type="button"
              className={styles.threadButton}
              onClick={() => onSelectThread(t.thread_id)}
              disabled={loading}
              title={collapsed ? formatThreadLabel(t) : t.thread_id}
            >
              <span className={styles.threadIcon} aria-hidden="true">🗪</span>
              <span className={styles.threadLabel}>{formatThreadLabel(t)}</span>
            </button>
            {!collapsed && (
              <button
                type="button"
                className={styles.deleteThread}
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteThread(t.thread_id)
                }}
                disabled={loading}
                aria-label="Delete conversation"
                title="Delete conversation"
              >
                🗑
              </button>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
