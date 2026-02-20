import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface OnlineStatusContextValue {
  onlineUserIds: Set<string>
  isOnline: (userId: string) => boolean
  setOnline: (userId: string, online: boolean) => void
  setOnlineUsers: (ids: string[]) => void
}

const OnlineStatusContext = createContext<OnlineStatusContextValue>({
  onlineUserIds: new Set(),
  isOnline: () => false,
  setOnline: () => {},
  setOnlineUsers: () => {},
})

export function OnlineStatusProvider({ children }: { children: ReactNode }) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())

  const setOnline = useCallback((userId: string, online: boolean) => {
    setOnlineUserIds((prev) => {
      const next = new Set(prev)
      if (online) next.add(userId)
      else next.delete(userId)
      return next
    })
  }, [])

  const setOnlineUsers = useCallback((ids: string[]) => {
    setOnlineUserIds(new Set(ids))
  }, [])

  const isOnline = useCallback(
    (userId: string) => onlineUserIds.has(userId),
    [onlineUserIds]
  )

  return (
    <OnlineStatusContext.Provider
      value={{ onlineUserIds, isOnline, setOnline, setOnlineUsers }}
    >
      {children}
    </OnlineStatusContext.Provider>
  )
}

export function useOnlineStatus() {
  return useContext(OnlineStatusContext)
}
