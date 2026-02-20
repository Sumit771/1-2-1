import { useEffect, useRef, useState, useCallback } from 'react'
import { createSocket } from '../services/socket'
import type { Socket } from 'socket.io-client'
import type { Message } from '../types'

/**
 * Hook that manages socket lifecycle, reconnection, room re-join,
 * duplicate prevention and typing debounce logic.
 */
export function useSocket(token: string | null){
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const joinedRoomsRef = useRef<Set<string>>(new Set())
  const seenMessageIdsRef = useRef<Set<string>>(new Set())
  const typingTimers = useRef<Record<string, number>>({})

  const ensureSocket = useCallback(()=>{
    if(!token) return
    if(socketRef.current) return
    const s = createSocket(token)
    socketRef.current = s

    s.on('connect', ()=>{
      setConnected(true)
      // Re-join rooms after reconnect
      joinedRoomsRef.current.forEach(roomId=>{
        s.emit('room:join',{roomId}, (resp:any)=>{})
      })
    })

    s.on('disconnect', ()=>{
      setConnected(false)
    })

    s.on('connect_error', (err:any)=>{
      console.error('Socket connect error', err)
    })
  },[token])

  useEffect(()=>{
    ensureSocket()
    return ()=>{
      try{
        socketRef.current?.disconnect()
      }catch(e){}
      socketRef.current = null
    }
  },[ensureSocket])

  function sendMessage(payload:any, cb?: (res:any)=>void){
    if(!socketRef.current) return cb?.({ error: 'Not connected' })

    // Prevent duplicate send if id exists
    socketRef.current.emit('message:send', payload, cb)
  }

  function joinRoom(roomId:string, cb?: (res:any)=>void, publicKey?: string){
    if(!socketRef.current) return cb?.({ error: 'Not connected' })
    joinedRoomsRef.current.add(roomId)
    const payload: any = { roomId }
    if(publicKey){
      payload.publicKey = publicKey
    }
    socketRef.current.emit('room:join', payload, (res:any)=>{
      cb?.(res)
    })
  }

  function leaveRoom(roomId:string){
    if(!socketRef.current) return
    joinedRoomsRef.current.delete(roomId)
    socketRef.current.emit('room:leave', { roomId })
  }

  function onMessage(handler:(msg:Message)=>void){
    if(!socketRef.current) return
    socketRef.current.on('message:new', (msg:Message)=>{
      // Duplicate prevention
      if(seenMessageIdsRef.current.has(msg.id)) return
      seenMessageIdsRef.current.add(msg.id)
      handler(msg)
    })
  }

  function onMessageStatus(handler:(payload:any)=>void){
    socketRef.current?.on('message:statusUpdated', handler)
  }

  function sendMessageStatus(payload:{roomId:string;messageId:string;status:'sent'|'delivered'|'seen'}){
    socketRef.current?.emit('message:status', payload)
  }

  function startTyping(roomId:string){
    if(!socketRef.current) return
    socketRef.current.emit('typing:start', { roomId, isTyping: true })
    // debounce auto-clear
    if(typingTimers.current[roomId]){
      clearTimeout(typingTimers.current[roomId])
    }
    typingTimers.current[roomId] = window.setTimeout(()=>{
      socketRef.current?.emit('typing:stop', { roomId, isTyping: false })
      delete typingTimers.current[roomId]
    }, 2000)
  }

  function onTyping(handler:(payload:{userId:string;isTyping:boolean})=>void){
    socketRef.current?.on('typing:indicator', handler)
  }

  function onUserOnline(handler:(payload:{userId:string;isOnline:boolean})=>void){
    socketRef.current?.on('user:online', handler)
  }

  function onUserOffline(handler:(payload:{userId:string;isOnline:boolean})=>void){
    socketRef.current?.on('user:offline', handler)
  }

  return {
    socket: socketRef.current,
    connected,
    sendMessage,
    sendMessageStatus,
    joinRoom,
    leaveRoom,
    onMessage,
    onMessageStatus,
    startTyping,
    onTyping,
    onUserOnline,
    onUserOffline,
  }
}
