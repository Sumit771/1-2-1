export type MessageStatus = 'sent' | 'delivered' | 'seen'

export interface Message {
  id: string
  senderId: string
  senderUsername: string
  roomId: string
  content?: string
  imageUrl?: string
  imagePath?: string
  status: MessageStatus
  createdAt: string
}

export interface User {
  id: string
  username: string
  email: string
}
