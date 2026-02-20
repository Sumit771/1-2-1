import { io, Socket } from 'socket.io-client'
import type { Message } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export type BackendEvents = {
  'message:new': (msg: Message) => void
  'message:statusUpdated': (payload: { messageId: string; status: string }) => void
  'typing:indicator': (payload: { userId: string; isTyping: boolean }) => void
}

export type ClientToServer = {
  'message:send': (payload: any, cb?: (res:any)=>void) => void
  'message:status': (payload: any) => void
  'room:join': (payload: any, cb?: (res:any)=>void) => void
  'room:leave': (payload: any) => void
  'typing:start': (payload: any) => void
  'typing:stop': (payload: any) => void
}

export function createSocket(token: string){
  const socket: Socket = io(API_BASE, {
    path: '/socket.io',
    auth: { token },
    // try XHR-polling first for environments where native WebSocket may be blocked,
    // then upgrade to websocket
    transports: ['polling','websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelayMax: 5000
  })

  return socket
}
