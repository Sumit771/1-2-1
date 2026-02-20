import React, { createContext, useContext, useState, ReactNode } from 'react'

/**
 * EncryptionContext manages E2E encryption keys for each chat room
 */
const EncryptionContext = createContext<{
  sharedSecrets: Record<string, Uint8Array>
  setSharedSecret: (roomId: string, secret: Uint8Array) => void
  getSharedSecret: (roomId: string) => Uint8Array | null
  theirPublicKeys: Record<string, string>
  setTheirPublicKey: (roomId: string, publicKey: string) => void
  getTheirPublicKey: (roomId: string) => string | null
}>({
  sharedSecrets: {},
  setSharedSecret: () => {},
  getSharedSecret: () => null,
  theirPublicKeys: {},
  setTheirPublicKey: () => {},
  getTheirPublicKey: () => null,
})

export const EncryptionProvider = ({ children }: { children: ReactNode }) => {
  const [sharedSecrets, setSharedSecrets] = useState<Record<string, Uint8Array>>({})
  const [theirPublicKeys, setTheirPublicKeys] = useState<Record<string, string>>({})

  function setSharedSecret(roomId: string, secret: Uint8Array) {
    setSharedSecrets((prev) => ({
      ...prev,
      [roomId]: secret,
    }))
  }

  function getSharedSecret(roomId: string): Uint8Array | null {
    return sharedSecrets[roomId] || null
  }

  function setTheirPublicKey(roomId: string, publicKey: string) {
    setTheirPublicKeys((prev) => ({
      ...prev,
      [roomId]: publicKey,
    }))
  }

  function getTheirPublicKey(roomId: string): string | null {
    return theirPublicKeys[roomId] || null
  }

  return (
    <EncryptionContext.Provider
      value={{
        sharedSecrets,
        setSharedSecret,
        getSharedSecret,
        theirPublicKeys,
        setTheirPublicKey,
        getTheirPublicKey,
      }}
    >
      {children}
    </EncryptionContext.Provider>
  )
}

export function useEncryption() {
  return useContext(EncryptionContext)
}
