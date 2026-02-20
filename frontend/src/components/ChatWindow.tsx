import React, {useEffect, useMemo, useRef, useState} from 'react'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { useEncryption } from '../context/EncryptionContext'
import { useTyping } from '../context/TypingContext'
import { useMessageStatus } from '../context/MessageStatusContext'
import { useOnlineStatus } from '../context/OnlineStatusContext'
import ImageUploader from './ImageUploader'
import { TypingIndicator } from './TypingIndicator'
import { MessageStatusIcon } from './MessageStatusIcon'
import type { Message } from '../types'
import api from '../services/api'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
import { useSocket } from '../hooks/useSocket'
import { 
  encryptMessage, 
  decryptMessage, 
  deriveSharedSecret, 
  retrieveKeypair, 
  encodePublicKey, 
  decodePublicKey 
} from '../services/encryption'

export default function ChatWindow(){
  const { auth } = useAuth()
  const { messages, addMessage, replaceMessages, activeRoomId, setActiveRoom } = useChat()
  const { getSharedSecret, setSharedSecret, setTheirPublicKey } = useEncryption()
  const { typingUsers, setTyping } = useTyping()
  const { updateStatus, getStatus } = useMessageStatus()
  const socketHook = useSocket(auth.token)
  // activeRoomId is stored in ChatContext
  const [usersList,setUsersList] = useState<{id:string;username:string;email:string}[]>([])
  const [roomsList,setRoomsList] = useState<any[]>([])
  const [text,setText] = useState('')
  const [mobileShowChat,setMobileShowChat] = useState(false)
  const [uploadStatus,setUploadStatus] = useState<{stage:'idle'|'compressing'|'uploading'|'done'|'error';progress?:number;previewUrl?:string} | null>(null)
  const { setOnline, setOnlineUsers, isOnline } = useOnlineStatus()
  const listRef = useRef<HTMLDivElement|null>(null)
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  const normalizeImageUrl = (url?: string) => {
    if (!url) return undefined
    return url.startsWith('/uploads') 
      ? `${API_BASE}/api/images/${url.split('/').pop()}?token=${auth.token}` 
      : url
  }

  useEffect(()=>{
    if(auth.token){
      // register handlers with the hook
      socketHook.onMessage((msg:Message)=>{
        // Normalize image url and ensure roomId exists
        let displayContent = msg.content
        
        // Try to decrypt if we have a shared secret
        if(msg.content && msg.roomId){
          const sharedSecret = getSharedSecret(msg.roomId)
          if(sharedSecret){
            try{
              displayContent = decryptMessage(msg.content, sharedSecret)
            }catch(e){
              console.error('Failed to decrypt message:', e)
              displayContent = msg.content
            }
          }
        }
        
        const normalized: Message = {
          ...msg,
          roomId: msg.roomId,
          content: displayContent,
          imageUrl: normalizeImageUrl(msg.imageUrl),
        }

        if(normalized.roomId){
          addMessage(normalized.roomId, normalized)
          updateStatus(normalized.id, normalized.status)
          // mark delivered for receiver
          if(normalized.senderId !== auth.user?.id){
            socketHook.sendMessageStatus({ roomId: normalized.roomId, messageId: normalized.id, status: 'delivered' })
          }
          // if I'm viewing this room, mark seen immediately
          if(normalized.senderId !== auth.user?.id && normalized.roomId === activeRoomId){
            socketHook.sendMessageStatus({ roomId: normalized.roomId, messageId: normalized.id, status: 'seen' })
          }
        }
      })
      socketHook.onMessageStatus((p:any)=>{
        updateStatus(p.messageId, p.status)
      })
      socketHook.onTyping((p:any)=>{
        if(activeRoomId){
          setTyping(p.userId, p.isTyping, activeRoomId)
        }
      })
      socketHook.onUserOnline((p:any)=>{
        if(p?.userId) setOnline(p.userId, true)
      })
      socketHook.onUserOffline((p:any)=>{
        if(p?.userId) setOnline(p.userId, false)
      })
    }
  },[auth.token, activeRoomId, getSharedSecret])

  useEffect(()=>{
    if(!auth.token) return

    // load users and rooms for sidebar
    ;(async ()=>{
      try{
        const u = await api.get('/users')
        setUsersList(u.data.users || [])

        const r = await api.get('/chat/rooms')
        setRoomsList(r.data.rooms || [])

        const online = await api.get('/chat/online-users')
        setOnlineUsers(online.data.onlineUserIds || [])
      }catch(e){
        console.error('Failed loading users/rooms', e)
      }
    })()
  },[auth.token])

  useEffect(()=>{
    // auto-scroll
    if(listRef.current){
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  },[messages, activeRoomId])

  // When another component sets the active room (e.g. SearchUser),
  // ensure the mobile view shows the chat panel.
  useEffect(()=>{
    if(activeRoomId){
      setMobileShowChat(true)
    }
  },[activeRoomId])

  async function startChatWithDemo(){
    try{
      // Use demo users seeded on server: fetch first other user
      // Fetch persisted users JSON directly from server
      const usersRes = await fetch(`${API_BASE}/users_db.json`)
      const usersJson = await usersRes.json()
      // usersJson is an array of user objects
      const users = Array.isArray(usersJson) ? usersJson : []
      if(users.length===0) return alert('No other users')
      const other = users[0]

      // Create or get room via backend API (proper UI flow)
      const createRes = await api.post('/chat/rooms', { otherUserId: other.id })
      const { roomId, messages } = createRes.data

      setActiveRoom(roomId)

      // Join via socket hook and load messages returned by API
      socketHook.joinRoom(roomId, (resp:any)=>{
        if(resp.error) return alert(resp.error)
        const incoming = resp.messages || messages || []
        const normalized = (incoming as Message[]).map((m)=>({
          ...m,
          imageUrl: normalizeImageUrl(m.imageUrl),
        }))
        normalized.forEach((m: Message)=>updateStatus(m.id, m.status))
        replaceMessages(roomId, normalized)
      })
    }catch(err:any){
      console.error(err)
    }
  }

  async function startChatWithUser(otherId:string){
    try{
      const createRes = await api.post('/chat/rooms', { otherUserId: otherId })
      const { roomId, messages } = createRes.data

      setActiveRoom(roomId)
      setMobileShowChat(true)

      // display messages returned by API immediately so chat opens
      try{
        const normalizedApi = (messages || []).map((m:Message)=>(
          ({
            ...m,
            imageUrl: normalizeImageUrl(m.imageUrl),
          })
        ))
        normalizedApi.forEach((m:Message)=>updateStatus(m.id, m.status))
        replaceMessages(roomId, normalizedApi)
      }catch(e){}

      // Get user's keypair and send it on join for E2E setup
      const keypair = retrieveKeypair(auth.user!.id)
      const publicKeyBase64 = keypair ? encodePublicKey(keypair.publicKey) : undefined

      socketHook.joinRoom(roomId, (resp:any)=>{
        if(resp.error) return alert(resp.error)
        
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
        
        const normalized = (resp.messages || messages || []).map((m:Message)=>({
          ...m,
          imageUrl: normalizeImageUrl(m.imageUrl),
        }))
        normalized.forEach((m: Message)=>updateStatus(m.id, m.status))
        replaceMessages(roomId, normalized)
        // refresh rooms list
        api.get('/chat/rooms').then(r=>setRoomsList(r.data.rooms||[])).catch(()=>{})
      }, publicKeyBase64)
    }catch(err:any){
      console.error('startChatWithUser error',err)
    }
  }

  function handleSend(){
    if(!activeRoomId) return alert('Join a room first')
    if(!text.trim()) return
    
    let contentToSend = text
    
    // Encrypt message if we have a shared secret for this room
    const sharedSecret = getSharedSecret(activeRoomId)
    if(sharedSecret){
      try{
        contentToSend = encryptMessage(text, sharedSecret)
      }catch(e){
        console.error('Encryption failed:', e)
        alert('Failed to encrypt message')
        return
      }
    }
    
    const payload = { roomId: activeRoomId, content: contentToSend }

    socketHook.sendMessage(payload, (res:any)=>{
      if(res?.error){
        alert(res.error)
      }
    })

    setText('')
  }

  async function handleImageUploaded(url:string){
    if(!activeRoomId) return alert('Join a room first')
    // backend returns a relative path (/uploads/xxx.webp)
    const relative = url.startsWith('/uploads') ? url : url
    const payload = { roomId: activeRoomId, imageUrl: relative }
    socketHook.sendMessage(payload, (res:any)=>{})
  }

  const activeRoom = useMemo(()=>{
    if(!activeRoomId) return null
    return roomsList.find(r=>r.id===activeRoomId) || null
  },[activeRoomId, roomsList])

  const roomTypingUserId = useMemo(()=>{
    if(!activeRoomId) return null
    const key = Object.keys(typingUsers).find(k=>k.startsWith(activeRoomId+':') && typingUsers[k])
    return key ? key.split(':')[1] : null
  },[activeRoomId, typingUsers])

  // Mark unseen incoming messages as seen when opening room
  useEffect(()=>{
    if(!activeRoomId) return
    const roomMsgs = messages[activeRoomId] || []
    roomMsgs.forEach(m=>{
      if(m.senderId !== auth.user?.id && m.status !== 'seen'){
        socketHook.sendMessageStatus({ roomId: activeRoomId, messageId: m.id, status: 'seen' })
      }
    })
  },[activeRoomId])

  return (
    <div className="wa-app">
      <aside className={"wa-sidebar " + (mobileShowChat ? "wa-hide-on-mobile" : "")}>
        <header className="wa-sidebar-header">
          <div className="wa-avatar-circle">{auth.user?.username?.[0]?.toUpperCase() || 'U'}</div>
          <div style={{display:'flex',flexDirection:'column',gap:2}}>
            <div style={{fontWeight:600}}>Chats</div>
            <div className="wa-subtle">{socketHook.connected ? 'Connected' : 'Connecting...'}</div>
          </div>
          {/* <div style={{marginLeft:'auto'}}>
            <button type="button" className="wa-ghost-btn" onClick={startChatWithDemo}>Demo</button>
          </div> */}
        </header>

        <section className="wa-chat-list">
          {roomsList.length===0 && <div className="wa-empty-list">No chats yet</div>}
          {roomsList.map(r=>(
            <button
              key={r.id}
              className={"wa-chat-list-item " + (r.id===activeRoomId ? "active" : "")}
              onClick={()=>{
                setActiveRoom(r.id)
                setMobileShowChat(true)
                socketHook.joinRoom(r.id,(resp:any)=>{
                  if(resp.error) return alert(resp.error)
                  const normalized = (resp.messages || []).map((m:Message)=>({
                    ...m,
                    imageUrl: normalizeImageUrl(m.imageUrl),
                  }))
                  replaceMessages(r.id, normalized)
                })
              }}
            >
              <div className="wa-avatar-circle wa-avatar-small">{(r.otherUsername||'U')[0]?.toUpperCase()}</div>
              <div className="wa-chat-list-main">
                <div className="wa-chat-list-top">
                  <span className="wa-chat-name">{r.otherUsername}</span>
                  {r.lastMessage?.createdAt && (
                    <span className="wa-chat-time">
                      {new Date(r.lastMessage.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                    </span>
                  )}
                </div>
                <div className="wa-chat-list-bottom">
                  <span className="wa-chat-preview">
                    {r.lastMessage?.imageUrl ? '📷 Photo' : (r.lastMessage?.content || 'No messages')}
                  </span>
                </div>
              </div>
              {(r.otherUserOnline || isOnline(r.otherUserId)) && <span className="wa-online-dot" />}
            </button>
          ))}
        </section>

        <section className="wa-user-list">
          <div className="wa-list-title">Start new chat</div>
          <div className="wa-user-scroll">
            {usersList.filter(u=>u.id!==auth.user?.id).map(u=>(
              <button key={u.id} className="wa-user-pill" onClick={()=>startChatWithUser(u.id)}>
                <span className={"wa-presence-dot " + (isOnline(u.id) ? "online" : "offline")} />
                {u.username}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <main className={"wa-main " + (!mobileShowChat ? "wa-hide-on-mobile" : "")}>
        {activeRoomId ? (
          <>
            <header className="wa-chat-header">
              <button type="button" className="wa-back-btn" onClick={()=>setMobileShowChat(false)}>←</button>
              <div className="wa-avatar-circle wa-avatar-small">{(activeRoom?.otherUsername||'U')[0]?.toUpperCase()}</div>
              <div style={{display:'flex',flexDirection:'column',gap:2}}>
                <div className="wa-chat-header-name">{activeRoom?.otherUsername || 'Chat'}</div>
                <div className="wa-chat-header-status">
                  {(activeRoom?.otherUserOnline || (activeRoom?.otherUserId && isOnline(activeRoom.otherUserId))) ? 'online' : 'offline'}
                  {roomTypingUserId ? ' • typing…' : ''}
                </div>
              </div>
            </header>

            <div className="wa-messages" ref={listRef}>
              {(messages[activeRoomId]||[]).map(m=>(
                <div key={m.id} className={"wa-message-row " + (m.senderId===auth.user!.id ? 'me':'them')}>
                  <div className="wa-message-bubble">
                    {m.imageUrl && (
                      <img 
                        src={m.imageUrl} 
                        className="wa-image" 
                        alt="attachment" 
                        onClick={() => setViewingImage(m.imageUrl || null)} 
                        style={{cursor: 'pointer'}} 
                      />
                    )}
                    {m.content && <div className="wa-message-text">{m.content}</div>}
                    <div className="wa-message-meta">
                      <span className="wa-time">{new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                      {m.senderId===auth.user!.id && (
                        <span className="wa-status-icon">
                          <MessageStatusIcon status={getStatus(m.id)} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {uploadStatus && uploadStatus.stage !== 'idle' && (
                <div className="wa-message-row me">
                  <div className="wa-message-bubble wa-upload-bubble">
                    {uploadStatus.previewUrl && (
                      <img 
                        src={uploadStatus.previewUrl} 
                        className="wa-image" 
                        alt="uploading" 
                        style={{opacity: uploadStatus.stage==='done' ? 1 : 0.6, cursor: 'pointer'}} 
                        onClick={() => setViewingImage(uploadStatus.previewUrl || null)} 
                      />
                    )}
                    <div className="wa-message-text">
                      {uploadStatus.stage === 'compressing' && 'Compressing image…'}
                      {uploadStatus.stage === 'uploading' && `Uploading… ${uploadStatus.progress || 0}%`}
                      {uploadStatus.stage === 'done' && 'Sending…'}
                      {uploadStatus.stage === 'error' && 'Upload failed'}
                    </div>
                    {uploadStatus.stage === 'uploading' && (
                      <div className="wa-progress">
                        <div className="wa-progress-bar" style={{width: `${uploadStatus.progress || 0}%`}} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {roomTypingUserId && (
                <div className="wa-message-row them">
                  <div className="wa-message-bubble wa-typing-bubble">
                    <TypingIndicator />
                  </div>
                </div>
              )}
            </div>

            <footer className="wa-input-bar">
              <ImageUploader onUploaded={handleImageUploaded} onStatus={setUploadStatus} />
              <input
                className="wa-input"
                value={text}
                onChange={e=>{
                  setText(e.target.value)
                  if(activeRoomId) socketHook.startTyping(activeRoomId)
                }}
                placeholder="Type a message"
              />
              <button type="button" onClick={handleSend} className="wa-send-btn">➤</button>
            </footer>
          </>
        ) : (
          <div className="wa-empty-state">
            <div>
              <div style={{fontSize:18,fontWeight:600,marginBottom:6}}>Select a chat</div>
              <div className="wa-subtle">Pick a conversation from the left to start messaging.</div>
            </div>
          </div>
        )}
      </main>

      {viewingImage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 2000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setViewingImage(null)}>
          <img src={viewingImage} style={{maxWidth: '90%', maxHeight: '90%', objectFit: 'contain'}} alt="Preview" />
          <button style={{
            position: 'absolute', top: 20, right: 20, 
            background: 'transparent', border: 'none', color: '#fff', fontSize: 30, cursor: 'pointer'
          }}>×</button>
        </div>
      )}
    </div>
  )
}
