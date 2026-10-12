'use client'

import { useState } from 'react'
import { CornerUpLeft, SmilePlus } from 'lucide-react'
import type { ChatMessage } from '@watch-party/types'

const EMOJIS = ['❤️', '😂', '🔥', '👏', '😮', '😢']

export default function ChatMessageItem({
  message,
  currentUserId,
  onReply,
  onReaction,
}: {
  message: ChatMessage
  currentUserId: string
  onReply: (message: ChatMessage) => void
  onReaction: (messageId: string, emoji: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  if (message.userId === 'system') {
    return <div className="chat-system"><span>{message.message}</span></div>
  }

  const own = message.userId === currentUserId
  return (
    <article className={`chat-message ${own ? 'is-own' : ''}`} data-message-id={message.id} dir="rtl">
      <div className="chat-message-avatar avatar">{message.userName?.[0]?.toUpperCase()}</div>
      <div className="chat-message-body">
        <div className="chat-message-author">{own ? 'أنت' : message.userName}</div>
        <div className="chat-message-bubble">
          {message.replyTo && (
            <div className="chat-reply-quote">
              <strong>{message.replyTo.userName}</strong>
              <span>{message.replyTo.message}</span>
            </div>
          )}
          <span>{message.message}</span>
        </div>
        {message.reactions?.length > 0 && (
          <div className="chat-reactions">
            {message.reactions.map(({ emoji, userIds }) => (
              <button key={emoji} type="button"
                className={`chat-reaction ${userIds.includes(currentUserId) ? 'is-active' : ''}`}
                onClick={() => onReaction(message.id, emoji)}
                aria-label={`${emoji} ${userIds.length} تفاعل`}>
                <span>{emoji}</span><span>{userIds.length}</span>
              </button>
            ))}
          </div>
        )}
        <div className="chat-message-actions">
          <button type="button" onClick={() => onReply(message)} aria-label={`الرد على ${message.userName}`}>
            <CornerUpLeft size={13} /> رد
          </button>
          <div className="chat-emoji-anchor">
            <button type="button" onClick={() => setPickerOpen((open) => !open)}
              aria-label="إضافة تفاعل" aria-expanded={pickerOpen}>
              <SmilePlus size={14} /> تفاعل
            </button>
            {pickerOpen && <div className="chat-emoji-picker" role="group" aria-label="اختر تفاعلاً">
              {EMOJIS.map((emoji) => (
                <button key={emoji} type="button" aria-label={`تفاعل ${emoji}`} onClick={() => {
                  onReaction(message.id, emoji)
                  setPickerOpen(false)
                }}>{emoji}</button>
              ))}
            </div>}
          </div>
        </div>
      </div>
    </article>
  )
}
