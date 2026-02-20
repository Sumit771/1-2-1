import React, { useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

interface LoginProps {
  onSwitchToRegister: () => void
}

export default function Login({ onSwitchToRegister }: LoginProps) {
  const [email, setEmail] = useState('alice@example.com')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      const { token, user } = res.data
      login(token, user)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 360 }}>
      <h2>Sign in</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 12 }}>
          <label className="small-muted" style={{ display: 'block', marginBottom: 4 }}>
            Email
          </label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            required
            autoComplete="email"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="small-muted" style={{ display: 'block', marginBottom: 4 }}>
            Password
          </label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            autoComplete="current-password"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        {error && (
          <div style={{ color: '#e57373', fontSize: 14, marginBottom: 12 }}>{error}</div>
        )}
        <button type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="small-muted" style={{ marginTop: 12 }}>Demo users: alice / bob, password: password123</p>
      <p className="small-muted" style={{ marginTop: 16 }}>
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
        >
          Sign up
        </button>
      </p>
    </div>
  )
}
