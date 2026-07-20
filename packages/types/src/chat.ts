export interface ChatMessage {
  id: string
  roomId: string
  userId: string
  userName: string
  userAvatar: string | null
  message: string
  createdAt: Date
}

export interface SendMessagePayload {
  message: string
}
