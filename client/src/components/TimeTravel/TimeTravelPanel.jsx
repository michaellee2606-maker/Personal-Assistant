import styles from './TimeTravelPanel.module.css'

function formatCheckpointLabel(state, index) {
  const checkpoint = state.checkpoint
  const createdAt = checkpoint?.ts ? new Date(checkpoint.ts) : null
  const messages = state.values?.messages || []
  const lastMessage = messages[messages.length - 1]
  const snippet = lastMessage?.content
    ? String(lastMessage.content).slice(0, 40) +
      (String(lastMessage.content).length > 40 ? '…' : '')
    : '(empty state)'

  return {
    step: state.metadata?.step ?? index,
    source: state.metadata?.source ?? 'unknown',
    time: createdAt
      ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '—',
    snippet,
    messageCount: messages.length,
  }
}

export default function TimeTravelPanel({
  history,
  loading,
  activeCheckpointId,
  onFork,
  onClose,
}) {
  return (
    <aside className={styles.panel} aria-label="Time travel">
      <div className={styles.header}>
        <h2 className={styles.title}>Time travel</h2>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close time travel panel"
          title="Close"
        >
          ✕
        </button>
      </div>
      <p className={styles.hint}>
        Select a past checkpoint to fork the conversation from that point.
      </p>
      {loading ? (
        <div className={styles.loading}>
          <span className={styles.spinner} aria-hidden="true" />
          Loading history…
        </div>
      ) : history.length === 0 ? (
        <p className={styles.empty}>No checkpoints yet. Send a message first.</p>
      ) : (
        <ul className={styles.list}>
          {history.map((state, index) => {
            const info = formatCheckpointLabel(state, index)
            const checkpointId = state.checkpoint?.checkpoint_id
            const isLatest = index === 0
            return (
              <li key={checkpointId ?? index} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemMeta}>
                    {isLatest && <span className={styles.latestBadge}>latest</span>}
                    <span className={styles.step}>step {info.step}</span>
                    <span className={styles.time}>{info.time}</span>
                  </span>
                  <span className={styles.snippet} title={info.snippet}>
                    {info.snippet}
                  </span>
                  <span className={styles.count}>
                    {info.messageCount} message{info.messageCount === 1 ? '' : 's'}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.forkButton}
                  disabled={loading || checkpointId === activeCheckpointId}
                  onClick={() => onFork(state)}
                  title={
                    checkpointId === activeCheckpointId
                      ? 'Currently at this checkpoint'
                      : 'Fork conversation from here'
                  }
                >
                  {checkpointId === activeCheckpointId ? '✓ current' : '⏱ fork'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
