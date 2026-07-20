import type { VideoSource } from './room'
import type { ChatMessage, SendMessagePayload } from './chat'

// ── Queue Item ───────────────────────────────────────────────────────────────
export interface QueueItem {
  id: string            // unique id (client-generated uuid)
  videoId: string
  source: VideoSource
  title: string
  thumbnail?: string
  addedBy: string       // userId
  addedByName: string
  votes: string[]       // array of userIds who voted
}

// ── Server → Client ──────────────────────────────────────────────────────────
export interface ServerToClientEvents {
  sync_state: (state: SyncState) => void
  play: (payload: PlayPayload) => void
  pause: (payload: PausePayload) => void
  seek: (payload: SeekPayload) => void
  change_video: (payload: ChangeVideoPayload) => void
  chat_message: (message: ChatMessage) => void
  typing: (payload: TypingPayload) => void
  user_joined: (payload: UserPresencePayload) => void
  user_left: (payload: UserPresencePayload) => void
  host_changed: (payload: HostChangedPayload) => void
  error: (payload: SocketError) => void
  // Queue events
  queue_updated: (queue: QueueItem[]) => void
}

// ── Client → Server ──────────────────────────────────────────────────────────
export interface ClientToServerEvents {
  join_room: (payload: JoinRoomPayload, cb: (state: SyncState & { queue: QueueItem[] }) => void) => void
  leave_room: () => void
  play: (payload: PlayPayload) => void
  pause: (payload: PausePayload) => void
  seek: (payload: SeekPayload) => void
  change_video: (payload: ChangeVideoPayload) => void
  chat_message: (payload: SendMessagePayload) => void
  typing: (payload: TypingPayload) => void
  heartbeat: (payload: HeartbeatPayload) => void
  transfer_host: (payload: TransferHostPayload) => void
  // Queue events
  queue_add: (payload: QueueAddPayload) => void
  queue_remove: (payload: QueueRemovePayload) => void
  queue_vote: (payload: QueueVotePayload) => void
  queue_skip: () => void   // host only - skip current and play next
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  userId: string
  roomSlug: string
  userName: string
  userAvatar: string | null
}

export interface SyncState {
  currentVideo: string | null
  currentSource: VideoSource | null
  currentTime: number
  isPlaying: boolean
  serverTimestamp: number
  driveToken?: string
}

export interface PlayPayload {
  currentTime: number
  serverTimestamp: number
}

export interface PausePayload {
  currentTime: number
  serverTimestamp: number
}

export interface SeekPayload {
  currentTime: number
  serverTimestamp: number
}

export interface ChangeVideoPayload {
  videoId: string
  source: VideoSource
  title?: string
  driveToken?: string
}

export interface JoinRoomPayload {
  roomSlug: string
  token: string
  driveToken?: string
}

export interface TypingPayload {
  userId: string
  userName: string
  isTyping: boolean
}

export interface UserPresencePayload {
  userId: string
  userName: string
  userAvatar: string | null
}

export interface HostChangedPayload {
  newHostId: string
  newHostName: string
}

export interface HeartbeatPayload {
  currentTime: number
  buffered: number
  latency: number
}

export interface TransferHostPayload {
  newHostId: string
}

export interface SocketError {
  code: string
  message: string
}

// Queue payloads
export interface QueueAddPayload {
  item: QueueItem
}

export interface QueueRemovePayload {
  id: string   // QueueItem id
}

export interface QueueVotePayload {
  id: string   // QueueItem id
}
