import React, { useState } from 'react'
import AdminDashboard from './AdminDashboard'
import AdminLogin from './AdminLogin'

export default function AdminApp() {
  const [hasToken, setHasToken] = useState<boolean>(!!localStorage.getItem('adminToken'))

  return (
    <div className="app">
      <div className="sidebar">
        <h3>Admin Panel</h3>
        <p className="small-muted">Manage users and chat stats</p>
      </div>
      <div className="main">
        {hasToken && localStorage.getItem('adminToken') ? (
          <AdminDashboard />
        ) : (
          <AdminLogin
            onLogin={(token) => {
              localStorage.setItem('adminToken', token)
              setHasToken(true)
            }}
          />
        )}
      </div>
    </div>
  )
}

