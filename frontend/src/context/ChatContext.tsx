import React, { createContext, useContext, useState, ReactNode } from 'react'
import type { Message } from '../types'

const ChatContext = createContext<{
  messages: Record<string, Message[]>
  addMessage: (roomId:string,msg:Message)=>void
  replaceMessages: (roomId:string,msgs:Message[])=>void
  activeRoomId: string | null
  setActiveRoom: (roomId: string | null) => void
  clearChats: () => void
}>({
  messages: {},
  addMessage: ()=>{},
  replaceMessages: ()=>{},
  activeRoomId: null,
  setActiveRoom: ()=>{},
  clearChats: ()=>{}
})

export const ChatProvider = ({children}:{children:ReactNode})=>{
  const [messages,setMessages] = useState<Record<string,Message[]>>({})
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)

  function addMessage(roomId:string,msg:Message){
    setMessages(prev=>({
      ...prev,
      [roomId]: [...(prev[roomId]||[]), msg]
    }))
  }

  function replaceMessages(roomId:string,msgs:Message[]){
    setMessages(prev=>({
      ...prev,
      [roomId]: msgs
    }))
  }

  function setActiveRoom(roomId: string | null){
    setActiveRoomId(roomId)
  }

  function clearChats(){
    setMessages({})
    setActiveRoomId(null)
  }

  return <ChatContext.Provider value={{messages,addMessage,replaceMessages, activeRoomId, setActiveRoom, clearChats}}>{children}</ChatContext.Provider>
}

export function useChat(){
  return useContext(ChatContext)
}
