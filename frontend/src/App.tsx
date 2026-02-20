import React from 'react'
import { AuthProvider } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import { EncryptionProvider } from './context/EncryptionContext'
import { TypingProvider } from './context/TypingContext'
import { MessageStatusProvider } from './context/MessageStatusContext'
import { OnlineStatusProvider } from './context/OnlineStatusContext'
import MainApp from './components/MainApp'
import AdminApp from './components/AdminApp'

export default function App(){
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')

  return (
    <AuthProvider>
      <EncryptionProvider>
        <ChatProvider>
          <TypingProvider>
            <MessageStatusProvider>
              <OnlineStatusProvider>
                {isAdminRoute ? <AdminApp /> : <MainApp />}
              </OnlineStatusProvider>
            </MessageStatusProvider>
          </TypingProvider>
        </ChatProvider>
      </EncryptionProvider>
    </AuthProvider>
  )
}
