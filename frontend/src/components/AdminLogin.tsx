import React, { useState } from 'react'

export default function AdminLogin({ onLogin }:{onLogin:(token:string)=>void}){
  const [token, setToken] = useState('')

  function submit(e:React.FormEvent){
    e.preventDefault()
    if(!token) return alert('Enter admin token')
    localStorage.setItem('adminToken', token)
    onLogin(token)
  }

  return (
    <form onSubmit={submit} style={{padding:12}}>
      <h3>Admin Login</h3>
      <div style={{marginBottom:8}}>
        <input className="input" placeholder="Admin token" value={token} onChange={e=>setToken(e.target.value)} />
      </div>
      <button type="submit">Enter Admin</button>
    </form>
  )
}
