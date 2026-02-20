import nacl from 'tweetnacl'
import { encode as encodeBase64, decode as decodeBase64 } from 'js-base64'

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(arr: Uint8Array): string {
  return encodeBase64(String.fromCharCode.apply(null, Array.from(arr)))
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(decodeBase64(str), 'binary'))
}

/**
 * Generate a keypair for the current user
 */
export function generateKeypair() {
  return nacl.box.keyPair()
}

/**
 * Derive a shared secret from two users' public keys.
 * This uses a deterministic approach for symmetric encryption.
 */
export function deriveSharedSecret(
  myPublicKey: Uint8Array,
  theirPublicKey: Uint8Array
): Uint8Array {
  // Combine both public keys in a deterministic order
  // and hash to get a shared secret
  const combined = new Uint8Array(64)
  combined.set(myPublicKey)
  combined.set(theirPublicKey, 32)

  // Use nacl.hash to derive a key
  const hash = nacl.hash(combined)
  // Take first 32 bytes as the shared secret
  return hash.slice(0, 32)
}

/**
 * Encrypt a message using a shared secret
 * Returns base64 string: nonce(24) + ciphertext
 */
export function encryptMessage(message: string, sharedSecret: Uint8Array): string {
  const nonce = nacl.randomBytes(24)
  const messageBytes = new TextEncoder().encode(message)

  const encrypted = nacl.secretbox(messageBytes, nonce, sharedSecret)
  if (!encrypted) {
    throw new Error('Encryption failed')
  }

  // Combine nonce + ciphertext
  const combined = new Uint8Array(nonce.length + encrypted.length)
  combined.set(nonce)
  combined.set(encrypted, nonce.length)

  // Encode to base64 for transmission
  return uint8ArrayToBase64(combined)
}

/**
 * Decrypt a message using a shared secret
 * Input: base64 string: nonce(24) + ciphertext
 */
export function decryptMessage(encrypted: string, sharedSecret: Uint8Array): string {
  try {
    // Decode from base64
    const combined = new Uint8Array(Buffer.from(decodeBase64(encrypted), 'binary'))

    // Extract nonce and ciphertext
    const nonce = combined.slice(0, 24)
    const ciphertext = combined.slice(24)

    // Decrypt
    const decrypted = nacl.secretbox.open(ciphertext, nonce, sharedSecret)
    if (!decrypted) {
      throw new Error('Decryption failed')
    }

    // Decode to string
    return new TextDecoder().decode(decrypted)
  } catch (err) {
    console.error('Decryption error:', err)
    return '[Decryption failed]'
  }
}

/**
 * Store keypair in localStorage
 */
export function storeKeypair(
  userId: string,
  publicKey: Uint8Array,
  secretKey: Uint8Array
): void {
  const keyData = {
    publicKey: uint8ArrayToBase64(publicKey),
    secretKey: uint8ArrayToBase64(secretKey),
  }
  localStorage.setItem(`nacl_keypair_${userId}`, JSON.stringify(keyData))
}

/**
 * Retrieve keypair from localStorage
 */
export function retrieveKeypair(userId: string): { publicKey: Uint8Array; secretKey: Uint8Array } | null {
  const stored = localStorage.getItem(`nacl_keypair_${userId}`)
  if (!stored) return null

  try {
    const keyData = JSON.parse(stored)
    return {
      publicKey: base64ToUint8Array(keyData.publicKey),
      secretKey: base64ToUint8Array(keyData.secretKey),
    }
  } catch {
    return null
  }
}

/**
 * Export public key to hex string for transport
 */
export function encodePublicKey(key: Uint8Array): string {
  return uint8ArrayToBase64(key)
}

/**
 * Import public key from hex string
 */
export function decodePublicKey(encoded: string): Uint8Array {
  return base64ToUint8Array(encoded)
}