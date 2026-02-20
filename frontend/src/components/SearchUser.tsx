import React, { useState, useRef } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { useEncryption } from '../context/EncryptionContext'
import { useSocket } from '../hooks/useSocket'
import { useMessageStatus } from '../context/MessageStatusContext'
import {
  retrieveKeypair,
  encodePublicKey,
  decodePublicKey,
  deriveSharedSecret,
} from '../services/encryption'

export default function SearchUser({ onClose }:{onClose:()=>void}){
  const { auth } = useAuth()
  const { replaceMessages, setActiveRoom } = useChat()
  const { setSharedSecret, setTheirPublicKey } = useEncryption()
  const { updateStatus } = useMessageStatus()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{id:string;username:string;email:string}[]>([])
  const [searching, setSearching] = useState(false)
  const socketHook = useSocket(auth.token)
  const debounceRef = useRef<number | null>(null)

  function doSearch(q:string){
    if(!q || q.trim().length < 2){
      setResults([])
      return
    }
    setSearching(true)
    api.get(`/users/search?q=${encodeURIComponent(q.trim())}`)
      .then(res=>{
        setResults(res.data.users || [])
      })
      .catch(()=>{
        setResults([])
      })
      .finally(()=>setSearching(false))
  }

  function onChange(e:React.ChangeEvent<HTMLInputElement>){
    const v = e.target.value
    setQuery(v)
    if(debounceRef.current) window.clearTimeout(debounceRef.current)
    // debounce 300ms
    // @ts-ignore
    debounceRef.current = window.setTimeout(()=>doSearch(v), 300)
  }

  async function startChatWithUser(userId:string){
    setLoading(true)
    try{
      const res = await api.post('/chat/rooms', { otherUserId: userId })
      const { roomId, messages } = res.data

      setActiveRoom(roomId)

      // Display messages returned by API immediately so chat opens even
      // if socket join is delayed.
      try{
        const apiMessages = (messages || []) as any[]
        const normalizedApi = apiMessages.map((m:any)=>(
          ({
            ...m,
            imageUrl: m.imageUrl && m.imageUrl.startsWith('/uploads') 
              ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/images/${m.imageUrl.split('/').pop()}?token=${auth.token}` 
              : m.imageUrl,
          })
        ))
        replaceMessages(roomId, normalizedApi)
      }catch(e){}

      // Get user's keypair and send it on join for E2E setup
      const keypair = retrieveKeypair(auth.user!.id)
      const publicKeyBase64 = keypair ? encodePublicKey(keypair.publicKey) : undefined

      // Ensure socket is connected before joining room
      const tryJoin = async () => {
        const start = Date.now()
        while(!socketHook.connected && Date.now() - start < 3000){
          await new Promise(r => setTimeout(r, 100))
        }
        socketHook.joinRoom(roomId, (resp:any)=>{
          if(resp?.error) return alert(resp.error || 'Failed joining room')
          
          // Setup E2E encryption if both keys are available
          if(keypair && resp.otherUserPublicKey){
            try{
              const theirPublicKey = decodePublicKey(resp.otherUserPublicKey)
              const sharedSecret = deriveSharedSecret(keypair.publicKey, theirPublicKey)
              setSharedSecret(roomId, sharedSecret)
              setTheirPublicKey(roomId, resp.otherUserPublicKey)
              console.log('[E2E] Derived shared secret for room', roomId)
            }catch(e){
              console.error('Failed to setup E2E encryption:', e)
            }
          }
          
          const incoming = (resp.messages || messages || [])
          const normalized = incoming.map((m:any)=>(
            ({
              ...m,
              imageUrl: m.imageUrl && m.imageUrl.startsWith('/uploads') 
                ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/images/${m.imageUrl.split('/').pop()}?token=${auth.token}` 
                : m.imageUrl,
            })
          ))
          normalized.forEach((m:any)=> updateStatus(m.id, m.status))
          replaceMessages(roomId, normalized)
          api.get('/chat/rooms').catch(()=>{})
        }, publicKeyBase64)
      }
      tryJoin()

      onClose()
    }catch(err:any){
      alert(err?.response?.data?.error || 'Failed to start chat')
    }finally{ setLoading(false) }
  }

  return (
    <div style={{position:'fixed',right:12,top:12,zIndex:60}}>
      <div style={{background:'#fff',border:'1px solid #ddd',padding:12,borderRadius:6,boxShadow:'0 4px 12px rgba(0,0,0,0.08)',minWidth:320}}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input placeholder="Search by username or email" value={query} onChange={onChange} style={{flex:1}} />
          <button type="button" onClick={onClose}>Close</button>
        </div>

        <div style={{marginTop:8}}>
          {searching && <div className="wa-subtle">Searching…</div>}
          {!searching && results.length===0 && query.trim().length>=2 && <div className="wa-subtle">No users found</div>}
          <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:8}}>
            {results.map(u=> (
              <div key={u.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:6,border:'1px solid #f0f0f0',borderRadius:6}}>
                <div>
                  <div style={{fontWeight:600}}>{u.username}</div>
                  <div className="wa-subtle" style={{fontSize:12}}>{u.email}</div>
                  <div className="wa-subtle" style={{fontSize:12}}>{u.id}</div>
                </div>
                <div>
                  <button disabled={loading} onClick={()=>startChatWithUser(u.id)}>Start</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
