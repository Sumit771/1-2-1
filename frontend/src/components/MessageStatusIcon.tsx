import React from 'react'

interface MessageStatusIconProps {
  status: 'sent' | 'delivered' | 'seen'
}

export function MessageStatusIcon({ status }: MessageStatusIconProps) {
  // WhatsApp colors: #53bdeb for read (blue), #8696a0 for delivered/sent (grey)
  const color = status === 'seen' ? '#53bdeb' : '#8696a0'

  if (status === 'sent') {
    return (
      <svg viewBox="0 0 16 15" width="16" height="15" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }}>
        <path fill={color} d="M10.91 3.316l-4.858 8.821-3.043-3.034-1.11 1.105 4.153 4.138 5.968-10.84-1.11-1.19z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 16 15" width="16" height="15" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }}>
      <path fill={color} d="M15.01 3.316l-4.782 8.681-1.902-1.902-1.11 1.11 3.012 3.012 5.892-10.71-1.11-1.191z" />
      <path fill={color} d="M6.02 11.997l-4.858-4.858 1.11-1.11 3.748 3.748 1.11 1.11-1.11 1.11z" />
    </svg>
  )
}
