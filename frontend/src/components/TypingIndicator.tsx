import React from 'react'

export function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#9aa6a8',
          animation: 'pulse 1.4s infinite',
        }}
      />
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#9aa6a8',
          animation: 'pulse 1.4s infinite 0.2s',
        }}
      />
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#9aa6a8',
          animation: 'pulse 1.4s infinite 0.4s',
        }}
      />
      <style>{`
        @keyframes pulse {
          0%, 60%, 100% { opacity: 0.3; }
          30% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
