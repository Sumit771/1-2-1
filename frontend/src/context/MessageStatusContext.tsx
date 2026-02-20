import React, { createContext, useContext, useState, ReactNode } from 'react'

interface MessageStatusTracker {
  [messageId: string]: 'sent' | 'delivered' | 'seen'
}

const MessageStatusContext = createContext<{
  statusMap: MessageStatusTracker
  updateStatus: (messageId: string, status: 'sent' | 'delivered' | 'seen') => void
  getStatus: (messageId: string) => 'sent' | 'delivered' | 'seen'
}>({
  statusMap: {},
  updateStatus: () => {},
  getStatus: () => 'sent',
})

export const MessageStatusProvider = ({ children }: { children: ReactNode }) => {
  const [statusMap, setStatusMap] = useState<MessageStatusTracker>({})

  const updateStatus = (messageId: string, status: 'sent' | 'delivered' | 'seen') => {
    setStatusMap((prev) => ({
      ...prev,
      [messageId]: status,
    }))
  }

  const getStatus = (messageId: string) => {
    return statusMap[messageId] || 'sent'
  }

  return (
    <MessageStatusContext.Provider value={{ statusMap, updateStatus, getStatus }}>
      {children}
    </MessageStatusContext.Provider>
  )
}

export function useMessageStatus() {
  return useContext(MessageStatusContext)
}
