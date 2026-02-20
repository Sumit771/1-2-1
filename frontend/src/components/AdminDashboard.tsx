import React, { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function getAdminToken(){
  return localStorage.getItem('adminToken') || ''
}

export default function AdminDashboard(){
  const [users, setUsers] = useState<any[]>([])
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [editingId, setEditingId] = useState<string|null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAdminToken())
  const [searchTerm, setSearchTerm] = useState('')

  async function loadUsers(){
    try{
      const token = getAdminToken()
      if(!token) { setIsAuthenticated(false); return }

      const res = await fetch(`${API_BASE}/api/admin/users`, { headers: { 'x-admin-token': token } })
      
      if(res.status === 401) {
        localStorage.removeItem('adminToken')
        setIsAuthenticated(false)
        throw new Error('Invalid token')
      }
      
      if(!res.ok) throw new Error('Request failed')
      const data = await res.json()
      setUsers(data.users || [])
    }catch(err:any){
      if(err.message !== 'Invalid token') alert('Failed to load users: '+err.message)
    }
  }

  useEffect(()=>{ 
    if(isAuthenticated) loadUsers() 
  },[isAuthenticated])

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault()
    try{
      const token = getAdminToken()
      const url = editingId 
        ? `${API_BASE}/api/admin/users/${editingId}`
        : `${API_BASE}/api/admin/users`
      
      const method = editingId ? 'PUT' : 'POST'
      
      const body:any = { username, email }
      if(password) body.password = password

      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type':'application/json', 'x-admin-token': token }, 
        body: JSON.stringify(body) 
      })
      
      if(!res.ok){ const err = await res.json(); throw new Error(err.error||'Operation failed') }
      
      setUsername(''); setEmail(''); setPassword(''); setEditingId(null)
      await loadUsers()
    }catch(err:any){ alert('Action failed: '+err.message) }
  }

  async function deleteUser(id:string){
    if(!confirm('Are you sure you want to delete this user?')) return
    try{
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/users/${id}`, { 
        method: 'DELETE', 
        headers: { 'x-admin-token': token } 
      })
      if(!res.ok) throw new Error('Delete failed')
      await loadUsers()
    }catch(err:any){
      alert(err.message)
    }
  }

  function startEdit(u:any){
    setEditingId(u.id)
    setUsername(u.username)
    setEmail(u.email)
    setPassword('')
  }

  function cancelEdit(){
    setEditingId(null)
    setUsername('')
    setEmail('')
    setPassword('')
  }

  function logoutAdmin(){
    localStorage.removeItem('adminToken')
    window.location.reload()
  }

  if (!isAuthenticated) {
    return (
      <div style={{padding:40, maxWidth:400, margin:'80px auto', border:'1px solid #ddd', borderRadius:12, boxShadow:'0 4px 20px rgba(0,0,0,0.08)', background:'#fff'}}>
        <h3>Admin Login</h3>
        <form onSubmit={(e)=>{
          e.preventDefault()
          const val = (e.currentTarget.elements[0] as HTMLInputElement).value
          localStorage.setItem('adminToken', val)
          setIsAuthenticated(true)
        }} style={{display:'flex', gap:10, marginTop:10}}>
          <input placeholder="Enter Admin Token" type="password" style={{flex:1, padding:8}} />
          <button type="submit" style={{padding:'8px 16px'}}>Login</button>
        </form>
        <div style={{marginTop:15, fontSize:13, color:'#666'}}>
          Default token: <code>admin-secret</code><br/>
          (Defined in <code>backend/src/config/index.ts</code>)
        </div>
      </div>
    )
  }

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.includes(searchTerm)
  )

  return (
    <div style={{padding:24, maxWidth:1200, margin:'0 auto', fontFamily:'system-ui, sans-serif'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32, borderBottom:'1px solid #eee', paddingBottom:16}}>
        <div>
          <h2 style={{margin:0}}>Admin Dashboard</h2>
          <div style={{color:'#666', marginTop:4}}>Manage users and system access</div>
        </div>
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <div style={{background:'#f0f0f0', padding:'6px 12px', borderRadius:20, fontSize:14}}>
            <strong>{users.length}</strong> Total Users
          </div>
          <button onClick={logoutAdmin} style={{padding:'8px 16px', background:'#333', color:'#fff', border:'none', borderRadius:6, cursor:'pointer'}}>Logout</button>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'300px 1fr', gap:32}}>
        {/* Left Panel: Form */}
        <div>
          <div style={{background:'#f9f9f9', padding:20, borderRadius:8, border:'1px solid #eee', position:'sticky', top:20}}>
            <h3 style={{marginTop:0, marginBottom:16}}>{editingId ? 'Edit User' : 'Create User'}</h3>
            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{display:'block', fontSize:12, fontWeight:600, marginBottom:4, color:'#555'}}>Username</label>
                <input style={{width:'100%', padding:8, borderRadius:4, border:'1px solid #ddd'}} placeholder="username" value={username} onChange={e=>setUsername(e.target.value)} required />
              </div>
              <div>
                <label style={{display:'block', fontSize:12, fontWeight:600, marginBottom:4, color:'#555'}}>Email</label>
                <input style={{width:'100%', padding:8, borderRadius:4, border:'1px solid #ddd'}} placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} required />
              </div>
              <div>
                <label style={{display:'block', fontSize:12, fontWeight:600, marginBottom:4, color:'#555'}}>Password</label>
                <input style={{width:'100%', padding:8, borderRadius:4, border:'1px solid #ddd'}} placeholder={editingId ? "Leave blank to keep current" : "password"} value={password} onChange={e=>setPassword(e.target.value)} />
              </div>
              <div style={{display:'flex', gap:8, marginTop:8}}>
                <button type="submit" style={{flex:1, padding:10, background:'#007bff', color:'white', border:'none', borderRadius:4, cursor:'pointer', fontWeight:600}}>{editingId ? 'Update User' : 'Create User'}</button>
                {editingId && <button type="button" onClick={cancelEdit} style={{padding:10, background:'#e0e0e0', border:'none', borderRadius:4, cursor:'pointer'}}>Cancel</button>}
              </div>
            </form>
          </div>
        </div>

        {/* Right Panel: List */}
        <div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
            <h3 style={{margin:0}}>User List</h3>
            <input 
              placeholder="Search users..." 
              value={searchTerm} 
              onChange={e=>setSearchTerm(e.target.value)}
              style={{padding:'8px 12px', borderRadius:20, border:'1px solid #ddd', width:200}}
            />
          </div>
          
          <div style={{background:'#fff', border:'1px solid #eee', borderRadius:8, overflow:'hidden'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:14}}>
              <thead>
                <tr style={{background:'#f5f5f5', borderBottom:'1px solid #ddd'}}>
                  <th style={{textAlign:'left', padding:12, color:'#555'}}>User</th>
                  <th style={{textAlign:'left', padding:12, color:'#555'}}>Email / ID</th>
                  <th style={{textAlign:'right', padding:12, color:'#555'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={3} style={{padding:20, textAlign:'center', color:'#999'}}>No users found</td></tr>
                )}
                {filteredUsers.map(u=> (
                  <tr key={u.id} style={{borderBottom:'1px solid #eee'}}>
                    <td style={{padding:12}}>
                      <div style={{fontWeight:600}}>{u.username}</div>
                    </td>
                    <td style={{padding:12}}>
                      <div style={{color:'#333'}}>{u.email}</div>
                      <div style={{color:'#999', fontSize:11, fontFamily:'monospace', marginTop:2}}>{u.id}</div>
                    </td>
                    <td style={{padding:12, textAlign:'right'}}>
                      <button onClick={()=>startEdit(u)} style={{marginRight:8, padding:'4px 10px', background:'transparent', border:'1px solid #ddd', borderRadius:4, cursor:'pointer'}}>Edit</button>
                      <button onClick={()=>deleteUser(u.id)} style={{padding:'4px 10px', background:'#fff0f0', color:'#d32f2f', border:'1px solid #ffcdd2', borderRadius:4, cursor:'pointer'}}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
