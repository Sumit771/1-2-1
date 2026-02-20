import React, { useState, useEffect } from 'react'
import Login from './Login'
import Register from './Register'
import ChatWindow from './ChatWindow'
import SearchUser from './SearchUser'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import AdminApp from './AdminApp'

export default function MainApp() {
  const { auth, logout } = useAuth()
  const { clearChats } = useChat()
  const [showRegister, setShowRegister] = useState(false)

  if (window.location.pathname === '/admin') {
    return <AdminApp />
  }

  // Auto-logout after 1 minute of inactivity
  useEffect(() => {
    if (!auth.token) return

    let timeoutId: number
    const INACTIVITY_LIMIT = 60 * 1000 // 1 minute

    const resetTimer = () => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        logout()
        clearChats()
      }, INACTIVITY_LIMIT)
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => {
      window.clearTimeout(timeoutId)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [auth.token, logout, clearChats])

  const AuthForm = showRegister ? (
    <Register onSwitchToLogin={() => setShowRegister(false)} />
  ) : (
    <Login onSwitchToRegister={() => setShowRegister(true)} />
  )
  const [showSearch, setShowSearch] = useState(false)

  return (
    <div className="app">
      {/* <div className="sidebar">
        <h3>Ephemeral Chat</h3>
        <p className="small-muted">Secure 1:1 ephemeral messaging</p>
      </div> */}
      <div className="main">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="header">
            {auth.user ? (
              <div style={{display:'flex', gap:10, alignItems:'center'}}>
                <span>Logged in as {auth.user.username}</span>
                <button onClick={()=>{ logout(); clearChats() }} style={{fontSize:12, padding:'2px 6px', cursor:'pointer'}}>Logout</button>
              </div>
            ) : (
              'Not logged in'
            )}
          </div>
          <div>
            <button onClick={()=>setShowSearch(true)} style={{padding:6,borderRadius:6}}>🔍</button>
          </div>
        </div>
        {showSearch && <SearchUser onClose={()=>setShowSearch(false)} />}
        {auth.token ? <ChatWindow /> : AuthForm}
      </div>
    </div>
  )
}
