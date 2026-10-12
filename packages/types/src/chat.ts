export interface ChatMessage {
  id: string
  roomId: string
  userId: string
  userName: string
  userAvatar: string | null
  message: string
  createdAt: Date | string
  replyTo: { id: string; userName: string; message: string } | null
  reactions: { emoji: string; userIds: string[] }[]
}

export interface SendMessagePayload {
  message: string
  replyToId?: string
}

export interface MessageReactionPayload {
  messageId: string
  emoji: string
}

export interface MessageReactionsUpdate {
  messageId: string
  reactions: ChatMessage['reactions']
}
