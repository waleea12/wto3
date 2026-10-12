import type { ChatMessage } from '@watch-party/types'

export const messageInclude = {
  user: { select: { name: true, avatar: true } },
  replyTo: { select: { id: true, message: true, user: { select: { name: true } } } },
  reactions: { select: { emoji: true, userId: true } },
} as const

type LoadedMessage = {
  id: string
  roomId: string
  userId: string
  message: string
  createdAt: Date
  user: { name: string; avatar: string | null }
  replyTo: { id: string; message: string; user: { name: string } } | null
  reactions: { emoji: string; userId: string }[]
}

export function groupReactions(reactions: { emoji: string; userId: string }[]): ChatMessage['reactions'] {
  const groups = new Map<string, string[]>()
  for (const reaction of reactions) {
    groups.set(reaction.emoji, [...(groups.get(reaction.emoji) ?? []), reaction.userId])
  }
  return [...groups].map(([emoji, userIds]) => ({ emoji, userIds }))
}

export function toChatMessage(message: LoadedMessage): ChatMessage {
  return {
    id: message.id,
    roomId: message.roomId,
    userId: message.userId,
    userName: message.user.name,
    userAvatar: message.user.avatar,
    message: message.message,
    createdAt: message.createdAt,
    replyTo: message.replyTo
      ? { id: message.replyTo.id, userName: message.replyTo.user.name, message: message.replyTo.message }
      : null,
    reactions: groupReactions(message.reactions),
  }
}
