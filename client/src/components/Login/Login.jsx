import { useState } from 'react'
import { useAuth } from '../../context/useAuth.js'
import styles from './Login.module.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://cripple-lee-personal-assistant-server.hf.space'

export default function Login() {
  const { setHfToken } = useAuth()
  const [token, setToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = token.trim()
    if (!trimmed) return

    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hf_token: trimmed }),
      })
      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`)
      }
      setHfToken(trimmed)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.login}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome</h1>
        <p className={styles.subtitle}>Enter your Hugging Face token to continue</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Hugging Face Token
            <input
              className={styles.input}
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="hf_..."
              autoComplete="off"
              aria-label="Hugging Face token"
              required
            />
          </label>

          <button
            className={styles.button}
            type="submit"
            disabled={submitting || !token.trim()}
          >
            {submitting ? 'Signing in…' : 'Continue'}
          </button>

          {error && <p className={styles.error} role="alert">{error}</p>}
        </form>

        <p className={styles.note}>
          Your token is kept in memory only and is used to authenticate with the LangGraph server.
        </p>
      </div>
    </div>
  )
}
