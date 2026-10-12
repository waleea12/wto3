import type { Server, Socket } from 'socket.io'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  PlayPayload,
  PausePayload,
  SeekPayload,
  ChangeVideoPayload,
  SendMessagePayload,
  TypingPayload,
  HeartbeatPayload,
  TransferHostPayload,
  SyncState,
  JoinRoomPayload,
  QueueItem,
  QueueAddPayload,
  QueueRemovePayload,
  QueueVotePayload,
  MessageReactionPayload,
  UserPresencePayload,
} from '@watch-party/types'
import { prisma } from '@watch-party/database'
import { groupReactions, messageInclude, toChatMessage } from '../lib/chat'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

// In-memory room state for fast access
type RoomRuntimeState = SyncState & { hostId: string; duration?: number }
export const roomStates = new Map<string, RoomRuntimeState>()

// A brief browser close or network switch should not announce a departure.
const PRESENCE_GRACE_MS = 2 * 60 * 1000
const pendingDepartures = new Map<string, {
  timer: ReturnType<typeof setTimeout>
  user: UserPresencePayload
}>()

// In-memory queue per room
const roomQueues = new Map<string, QueueItem[]>()

function getQueue(roomSlug: string): QueueItem[] {
  if (!roomQueues.has(roomSlug)) roomQueues.set(roomSlug, [])
  return roomQueues.get(roomSlug)!
}

// Sort queue by votes descending
function sortedQueue(q: QueueItem[]): QueueItem[] {
  return [...q].sort((a, b) => b.votes.length - a.votes.length)
}

function systemMsg(msg: string) {
  return {
    id: `system-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: 'system',
    userName: 'System',
    userAvatar: null,
    message: msg,
    createdAt: new Date(),
    roomId: '',
    replyTo: null,
    reactions: [],
  }
}

function departureKey(roomSlug: string, userId: string) {
  return `${roomSlug}:${userId}`
}

function cancelDeparture(roomSlug: string, userId: string) {
  const key = departureKey(roomSlug, userId)
  const pending = pendingDepartures.get(key)
  if (pending) clearTimeout(pending.timer)
  pendingDepartures.delete(key)
}

async function connectedUsers(io: IoServer, roomSlug: string): Promise<UserPresencePayload[]> {
  const sockets = await io.in(roomSlug).fetchSockets()
  const users = new Map<string, UserPresencePayload>()
  for (const current of sockets) {
    users.set(current.data.userId, {
      userId: current.data.userId,
      userName: current.data.userName,
      userAvatar: current.data.userAvatar,
    })
  }
  return [...users.values()]
}

export async function onlineUsers(io: IoServer, roomSlug: string): Promise<UserPresencePayload[]> {
  const users = new Map<string, UserPresencePayload>()
  for (const [key, pending] of pendingDepartures) {
    if (key.startsWith(`${roomSlug}:`)) users.set(pending.user.userId, pending.user)
  }
  for (const user of await connectedUsers(io, roomSlug)) users.set(user.userId, user)
  return [...users.values()]
}

async function publishPresence(io: IoServer, roomSlug: string) {
  io.to(roomSlug).emit('presence_updated', await onlineUsers(io, roomSlug))
}

async function finishDeparture(io: IoServer, roomSlug: string, user: UserPresencePayload) {
  if (!(await connectedUsers(io, roomSlug)).some((current) => current.userId === user.userId)) {
    io.to(roomSlug).emit('user_left', user)
    io.to(roomSlug).emit('chat_message', systemMsg(`${user.userName} left the room 👋`))
  }
  await publishPresence(io, roomSlug)
}

async function depart(io: IoServer, roomSlug: string, user: UserPresencePayload, immediate = false) {
  if ((await connectedUsers(io, roomSlug)).some((current) => current.userId === user.userId)) return
  const key = departureKey(roomSlug, user.userId)
  if (immediate) {
    cancelDeparture(roomSlug, user.userId)
    await finishDeparture(io, roomSlug, user)
  } else if (!pendingDepartures.has(key)) {
    const timer = setTimeout(() => {
      pendingDepartures.delete(key)
      finishDeparture(io, roomSlug, user).catch((error) => console.error('presence grace error:', error))
    }, PRESENCE_GRACE_MS)
    pendingDepartures.set(key, { timer, user })
    await publishPresence(io, roomSlug)
  }
}

async function settleFinishedVideo(io: IoServer, roomSlug: string, state: RoomRuntimeState) {
  if (!state.isPlaying || !state.duration || computeCurrentTime(state) < state.duration - 0.25) return false
  state.currentTime = Math.max(0, state.duration - 0.25)
  state.isPlaying = false
  state.serverTimestamp = Date.now()
  await prisma.room.update({
    where: { slug: roomSlug },
    data: { currentTime: state.currentTime, isPlaying: false },
  })
  io.to(roomSlug).emit('pause', { currentTime: state.currentTime, serverTimestamp: state.serverTimestamp })
  return true
}

export function registerRoomHandlers(io: IoServer, socket: IoSocket) {
  // JOIN ROOM
  socket.on('join_room', async (payload: JoinRoomPayload, callback) => {
    try {
      const { roomSlug } = payload
      const userId = socket.data.userId

      const room = await prisma.room.findUnique({
        where: { slug: roomSlug },
        include: { host: { select: { id: true } } },
      })

      if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' })
        return
      }

      const wasOnline = (await onlineUsers(io, roomSlug)).some((user) => user.userId === userId)
      const previousRoom = socket.data.roomSlug
      if (previousRoom && previousRoom !== roomSlug) {
        socket.leave(previousRoom)
        await depart(io, previousRoom, {
          userId, userName: socket.data.userName, userAvatar: socket.data.userAvatar,
        }, true)
      }

      // Upsert participant
      await prisma.participant.upsert({
        where: { roomId_userId: { roomId: room.id, userId } },
        update: {},
        create: { roomId: room.id, userId },
      })

      socket.data.roomSlug = roomSlug
      socket.join(roomSlug)
      cancelDeparture(roomSlug, userId)

      // Initialize or get room state
      const isHostJoining = room.hostId === userId
      if (payload.driveToken && isHostJoining) {
        ;(socket.data as any).driveToken = payload.driveToken
      }

      if (!roomStates.has(roomSlug)) {
        roomStates.set(roomSlug, {
          currentVideo: room.currentVideo,
          currentSource: room.currentSource,
          currentTime: room.currentTime,
          isPlaying: room.isPlaying,
          serverTimestamp: Date.now(),
          hostId: room.hostId,
          driveToken: isHostJoining ? payload.driveToken : undefined,
        })
      } else if (payload.driveToken && isHostJoining) {
        roomStates.get(roomSlug)!.driveToken = payload.driveToken
      }

      const state = roomStates.get(roomSlug)!
      await settleFinishedVideo(io, roomSlug, state)
      const queue = sortedQueue(getQueue(roomSlug))

      // Notify other users in the room
      if (!wasOnline) {
        socket.to(roomSlug).emit('user_joined', {
          userId,
          userName: socket.data.userName,
          userAvatar: socket.data.userAvatar,
        })
        io.to(roomSlug).emit('chat_message', systemMsg(`${socket.data.userName} joined the room 👋`))
      }
      await publishPresence(io, roomSlug)

      // Return current state + queue to joining client
      callback({
        currentVideo: state.currentVideo,
        currentSource: state.currentSource,
        currentTime: computeCurrentTime(state),
        isPlaying: state.isPlaying,
        serverTimestamp: Date.now(),
        isHost: state.hostId === userId,
        hostId: state.hostId,
        queue,
        participants: await onlineUsers(io, roomSlug),
      } as any)
    } catch (err) {
      console.error('join_room error:', err)
      socket.emit('error', { code: 'JOIN_ERROR', message: 'Failed to join room' })
    }
  })

  // LEAVE ROOM
  socket.on('leave_room', async (payload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return

    socket.leave(roomSlug)
    socket.data.roomSlug = ''
    await depart(io, roomSlug, {
      userId: socket.data.userId,
      userName: socket.data.userName,
      userAvatar: socket.data.userAvatar,
    }, payload?.immediate === true)
  })

  // PLAY
  socket.on('play', async (payload: PlayPayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return
    if (!isHost(socket, roomSlug)) return

    const state = roomStates.get(roomSlug)
    if (!state) return

    state.currentTime = payload.currentTime
    state.isPlaying = true
    state.serverTimestamp = Date.now()

    await prisma.room.update({
      where: { slug: roomSlug },
      data: { currentTime: payload.currentTime, isPlaying: true },
    })

    socket.to(roomSlug).emit('play', {
      currentTime: payload.currentTime,
      serverTimestamp: state.serverTimestamp,
    })
  })

  // PAUSE
  socket.on('pause', async (payload: PausePayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return
    if (!isHost(socket, roomSlug)) return

    const state = roomStates.get(roomSlug)
    if (!state) return

    state.currentTime = payload.currentTime
    state.isPlaying = false
    state.serverTimestamp = Date.now()

    await prisma.room.update({
      where: { slug: roomSlug },
      data: { currentTime: payload.currentTime, isPlaying: false },
    })

    socket.to(roomSlug).emit('pause', {
      currentTime: payload.currentTime,
      serverTimestamp: state.serverTimestamp,
    })
  })

  // SEEK
  socket.on('seek', async (payload: SeekPayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return
    if (!isHost(socket, roomSlug)) return

    const state = roomStates.get(roomSlug)
    if (!state) return

    state.currentTime = payload.currentTime
    state.serverTimestamp = Date.now()

    await prisma.room.update({
      where: { slug: roomSlug },
      data: { currentTime: payload.currentTime },
    })

    socket.to(roomSlug).emit('seek', {
      currentTime: payload.currentTime,
      serverTimestamp: state.serverTimestamp,
    })
  })

  // CHANGE VIDEO (host direct play - bypasses queue)
  socket.on('change_video', async (payload: ChangeVideoPayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return
    if (!isHost(socket, roomSlug)) return

    if (payload.source === 'movie') {
      if (!/^(?:movie:[1-9]\d*|tv:[1-9]\d*:[1-9]\d*:[1-9]\d*)$/.test(payload.videoId)) return
    }

    const state = roomStates.get(roomSlug)
    if (!state) return

    state.currentVideo = payload.videoId
    state.currentSource = payload.source
    state.currentTime = 0
    state.duration = undefined
    state.isPlaying = payload.source !== 'movie'
    state.serverTimestamp = Date.now()
    const tokenToUse = payload.driveToken || (socket.data as any).driveToken
    if (tokenToUse) {
      state.driveToken = tokenToUse
    }

    await prisma.room.update({
      where: { slug: roomSlug },
      data: {
        currentVideo: payload.videoId,
        currentSource: payload.source,
        currentTime: 0,
        isPlaying: state.isPlaying,
      },
    })

    io.to(roomSlug).emit('change_video', payload)
  })

  // QUEUE: ADD (any user)
  socket.on('queue_add', (payload: QueueAddPayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return

    const queue = getQueue(roomSlug)
    // Avoid duplicates
    if (queue.find((q) => q.id === payload.item.id)) return

    queue.push(payload.item)
    io.to(roomSlug).emit('queue_updated', sortedQueue(queue))
  })

  // QUEUE: REMOVE (host or item owner)
  socket.on('queue_remove', (payload: QueueRemovePayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return

    const queue = getQueue(roomSlug)
    const item = queue.find((q) => q.id === payload.id)
    if (!item) return

    // Only host or the person who added it can remove
    const state = roomStates.get(roomSlug)
    const isHostUser = state?.hostId === socket.data.userId
    const isOwner = item.addedBy === socket.data.userId
    if (!isHostUser && !isOwner) return

    const newQueue = queue.filter((q) => q.id !== payload.id)
    roomQueues.set(roomSlug, newQueue)
    io.to(roomSlug).emit('queue_updated', sortedQueue(newQueue))
  })

  // QUEUE: VOTE (toggle vote for any user)
  socket.on('queue_vote', (payload: QueueVotePayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return

    const queue = getQueue(roomSlug)
    const item = queue.find((q) => q.id === payload.id)
    if (!item) return

    const uid = socket.data.userId
    if (item.votes.includes(uid)) {
      item.votes = item.votes.filter((v) => v !== uid) // un-vote
    } else {
      item.votes.push(uid) // vote
    }

    io.to(roomSlug).emit('queue_updated', sortedQueue(queue))
  })

  // QUEUE: SKIP (host only - play next item)
  socket.on('queue_skip', async () => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return
    if (!isHost(socket, roomSlug)) return

    await playNextInQueue(io, roomSlug)
  })

  // CHAT MESSAGE
  socket.on('chat_message', async (payload: SendMessagePayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return
    const text = typeof payload?.message === 'string' ? payload.message.trim() : ''
    if (!text || text.length > 2000) return
    try {
      const room = await prisma.room.findUnique({ where: { slug: roomSlug }, select: { id: true } })
      if (!room) return
      let replyToId: string | undefined
      if (typeof payload.replyToId === 'string') {
        const reply = await prisma.message.findFirst({
          where: { id: payload.replyToId, roomId: room.id },
          select: { id: true },
        })
        if (!reply) return
        replyToId = reply.id
      }
      const message = await prisma.message.create({
        data: { roomId: room.id, userId: socket.data.userId, message: text, replyToId },
        include: messageInclude,
      })
      io.to(roomSlug).emit('chat_message', toChatMessage(message))
    } catch (error) {
      console.error('chat_message error:', error)
    }
  })

  socket.on('message_reaction', async (payload: MessageReactionPayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug || !payload || typeof payload.messageId !== 'string') return
    const allowed = ['❤️', '😂', '🔥', '👏', '😮', '😢']
    if (!allowed.includes(payload.emoji)) return
    try {
      const message = await prisma.message.findFirst({
        where: { id: payload.messageId, room: { slug: roomSlug } },
        select: { id: true },
      })
      if (!message) return
      const key = { messageId_userId_emoji: {
        messageId: message.id, userId: socket.data.userId, emoji: payload.emoji,
      } }
      const existing = await prisma.messageReaction.findUnique({ where: key, select: { id: true } })
      if (existing) await prisma.messageReaction.delete({ where: key })
      else await prisma.messageReaction.create({ data: {
        messageId: message.id, userId: socket.data.userId, emoji: payload.emoji,
      } })
      const reactions = await prisma.messageReaction.findMany({
        where: { messageId: message.id }, select: { emoji: true, userId: true },
      })
      io.to(roomSlug).emit('message_reactions', {
        messageId: message.id, reactions: groupReactions(reactions),
      })
    } catch (error) {
      console.error('message_reaction error:', error)
    }
  })

  // TYPING INDICATOR
  socket.on('typing', (payload: TypingPayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return
    socket.to(roomSlug).emit('typing', {
      userId: socket.data.userId,
      userName: socket.data.userName,
      isTyping: Boolean(payload?.isTyping),
    })
  })

  // HEARTBEAT - latency compensation
  socket.on('heartbeat', async (payload: HeartbeatPayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return

    const state = roomStates.get(roomSlug)
    if (!state || !Number.isFinite(payload?.currentTime) || payload.currentTime < 0) return

    // Host is the source of truth; never correct the host.
    // Instead, silently align the server's estimated time with the host's actual time.
    if (isHost(socket, roomSlug)) {
      if (state.currentSource === 'youtube' && typeof payload.duration === 'number' && Number.isFinite(payload.duration) && payload.duration > 0) {
        state.duration = payload.duration
      }
      if (!state.isPlaying) return
      state.currentTime = payload.currentTime
      state.serverTimestamp = Date.now()
      await settleFinishedVideo(io, roomSlug, state)
      return
    }

    if (!state.isPlaying || await settleFinishedVideo(io, roomSlug, state)) return

    const expectedTime = computeCurrentTime(state)
    const drift = Math.abs(payload.currentTime - expectedTime)

    const DRIFT_THRESHOLD_AUTO_SEEK = 1.5
    if (drift > DRIFT_THRESHOLD_AUTO_SEEK) {
      socket.emit('sync_state', {
        currentVideo: state.currentVideo,
        currentSource: state.currentSource,
        currentTime: expectedTime,
        isPlaying: state.isPlaying,
        serverTimestamp: Date.now(),
      })
    }
  })

  // TRANSFER HOST
  socket.on('transfer_host', async (payload: TransferHostPayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return
    if (!isHost(socket, roomSlug)) return

    await prisma.room.update({
      where: { slug: roomSlug },
      data: { hostId: payload.newHostId },
    })

    const state = roomStates.get(roomSlug)
    if (state) state.hostId = payload.newHostId

    const newHost = await prisma.user.findUnique({ where: { id: payload.newHostId } })
    io.to(roomSlug).emit('host_changed', {
      newHostId: payload.newHostId,
      newHostName: newHost?.name ?? 'Unknown',
    })
  })

  // DISCONNECT cleanup
  socket.on('disconnect', async () => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return
    try {
      await depart(io, roomSlug, {
        userId: socket.data.userId,
        userName: socket.data.userName,
        userAvatar: socket.data.userAvatar,
      })
    } catch (error) {
      console.error('disconnect presence error:', error)
    }
  })
}

// Play next item in queue (called on skip or video end signal)
async function playNextInQueue(io: IoServer, roomSlug: string) {
  const queue = getQueue(roomSlug)
  if (queue.length === 0) return

  const sorted = sortedQueue(queue)
  const next = sorted[0]

  // Remove it from queue
  const newQueue = queue.filter((q) => q.id !== next.id)
  roomQueues.set(roomSlug, newQueue)

  // Update room state
  const state = roomStates.get(roomSlug)
  if (state) {
    state.currentVideo = next.videoId
    state.currentSource = next.source
    state.currentTime = 0
    state.duration = undefined
    state.isPlaying = false
    state.serverTimestamp = Date.now()
  }

  await prisma.room.update({
    where: { slug: roomSlug },
    data: {
      currentVideo: next.videoId,
      currentSource: next.source,
      currentTime: 0,
      isPlaying: false,
    },
  })

  io.to(roomSlug).emit('change_video', {
    videoId: next.videoId,
    source: next.source,
    title: next.title,
  })
  io.to(roomSlug).emit('queue_updated', sortedQueue(newQueue))
}

// Compute current playback position accounting for elapsed time
function computeCurrentTime(state: RoomRuntimeState): number {
  if (!state.isPlaying) return state.currentTime
  const elapsed = (Date.now() - state.serverTimestamp) / 1000
  return state.currentTime + elapsed
}

function isHost(socket: IoSocket, roomSlug: string): boolean {
  const state = roomStates.get(roomSlug)
  if (!state) return false
  return state.hostId === socket.data.userId
}
