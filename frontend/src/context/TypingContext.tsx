import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface TypingUser {
  userId: string
  isTyping: boolean
  timeoutId?: number
}

const TypingContext = createContext<{
  typingUsers: Record<string, boolean>
  setTyping: (userId: string, isTyping: boolean, roomId: string) => void
}>({
  typingUsers: {},
  setTyping: () => {},
})

export const TypingProvider = ({ children }: { children: ReactNode }) => {
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
  const timeoutsRef = React.useRef<Record<string, number>>({})

  const setTyping = useCallback(
    (userId: string, isTyping: boolean, roomId: string) => {
      const key = `${roomId}:${userId}`

      if (typingUsers[key] === isTyping) return

      // Clear existing timeout
      if (timeoutsRef.current[key]) {
        clearTimeout(timeoutsRef.current[key])
      }

      // Set or clear typing status
      setTypingUsers((prev) => ({
        ...prev,
        [key]: isTyping,
      }))

      // Auto-clear after 4 seconds if not cleared by server
      if (isTyping) {
        timeoutsRef.current[key] = window.setTimeout(() => {
          setTypingUsers((prev) => ({
            ...prev,
            [key]: false,
          }))
          delete timeoutsRef.current[key]
        }, 4000)
      } else {
        delete timeoutsRef.current[key]
      }
    },
    [typingUsers]
  )

  return (
    <TypingContext.Provider value={{ typingUsers, setTyping }}>
      {children}
    </TypingContext.Provider>
  )
}

export function useTyping() {
  return useContext(TypingContext)
}
