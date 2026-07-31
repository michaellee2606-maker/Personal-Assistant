import styles from './TimeTravelPanel.module.css'

function formatCheckpointLabel(state, index) {
  const messages = state.values?.messages || []
  const lastMessage = messages[messages.length - 1]
  const snippet = lastMessage?.content
    ? String(lastMessage.content).slice(0, 40) +
      (String(lastMessage.content).length > 40 ? '…' : '')
    : '(empty state)'

  return {
    source: state.metadata?.source ?? 'unknown',
    snippet,
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
            console.log('History index:', index)
            console.log('History state:', state)
            
            if ('__start__' === state.next?.[0] || undefined === state.next?.[0]) {
              console.log('Skipping checkpoint')
              return null
            }

            const info = formatCheckpointLabel(state, index)
            const checkpointId = state.checkpoint?.checkpoint_id
            const isLatest = index === 0
            return (
              <li key={checkpointId ?? index} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.snippet} title={info.snippet}>
                    {info.snippet}
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
