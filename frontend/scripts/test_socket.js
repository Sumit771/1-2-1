import axios from 'axios'
import { io } from 'socket.io-client'

try {
  const res = await axios.post('http://localhost:3000/api/auth/login', {
    email: 'alice@example.com',
    password: 'password123',
  })

  const token = res.data.token
  console.log('Login success, token preview:', token.slice(0,20) + '...')

  // Ensure the room exists via API
  await axios.post('http://localhost:3000/api/chat/rooms', { otherUserId: 'user_2' }, {
    headers: { Authorization: `Bearer ${token}` }
  })

  const socket = io('http://localhost:3000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: false,
  })

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id)
    socket.emit('room:join', { roomId: 'user_1_user_2' }, (resp) => {
      console.log('room:join response:', resp)
    })
  })

  socket.on('connect_error', (err) => {
    console.error('socket connect_error:', err)
    process.exit(1)
  })

  socket.on('message:new', (msg) => {
    console.log('message:new', msg)
  })

  socket.on('message:statusUpdated', (p) => {
    console.log('message:statusUpdated', p)
  })

  // keep open for 10s
  setTimeout(() => {
    console.log('Closing test socket')
    socket.close()
    process.exit(0)
  }, 10000)
} catch (err) {
  console.error('Login or socket error:', err?.response?.data || err.message || err)
  process.exit(1)
}
