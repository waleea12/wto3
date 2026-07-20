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
} from '@watch-party/types'
import { prisma } from '@watch-party/database'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

// In-memory room state for fast access
export const roomStates = new Map<string, SyncState & { hostId: string }>()

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

      // Upsert participant
      await prisma.participant.upsert({
        where: { roomId_userId: { roomId: room.id, userId } },
        update: {},
        create: { roomId: room.id, userId },
      })

      socket.data.roomSlug = roomSlug
      socket.join(roomSlug)

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
      const queue = sortedQueue(getQueue(roomSlug))

      // Notify other users in the room
      socket.to(roomSlug).emit('user_joined', {
        userId,
        userName: socket.data.userName,
        userAvatar: socket.data.userAvatar,
      })

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
      } as any)
    } catch (err) {
      console.error('join_room error:', err)
      socket.emit('error', { code: 'JOIN_ERROR', message: 'Failed to join room' })
    }
  })

  // LEAVE ROOM
  socket.on('leave_room', async () => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return

    socket.leave(roomSlug)
    socket.to(roomSlug).emit('user_left', {
      userId: socket.data.userId,
      userName: socket.data.userName,
      userAvatar: socket.data.userAvatar,
    })
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

    const state = roomStates.get(roomSlug)
    if (!state) return

    state.currentVideo = payload.videoId
    state.currentSource = payload.source
    state.currentTime = 0
    state.isPlaying = false
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
        isPlaying: false,
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

    const room = await prisma.room.findUnique({ where: { slug: roomSlug } })
    if (!room) return

    const message = await prisma.message.create({
      data: {
        roomId: room.id,
        userId: socket.data.userId,
        message: payload.message,
      },
    })

    const chatMessage = {
      id: message.id,
      roomId: room.id,
      userId: socket.data.userId,
      userName: socket.data.userName,
      userAvatar: socket.data.userAvatar,
      message: payload.message,
      createdAt: message.createdAt,
    }

    io.to(roomSlug).emit('chat_message', chatMessage)
  })

  // TYPING INDICATOR
  socket.on('typing', (payload: TypingPayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return
    socket.to(roomSlug).emit('typing', payload)
  })

  // HEARTBEAT - latency compensation
  socket.on('heartbeat', (payload: HeartbeatPayload) => {
    const roomSlug = socket.data.roomSlug
    if (!roomSlug) return

    const state = roomStates.get(roomSlug)
    if (!state || state.isPlaying === false) return

    const expectedTime = computeCurrentTime(state)
    const drift = Math.abs(payload.currentTime - expectedTime)

    const DRIFT_THRESHOLD_AUTO_SEEK = 0.5
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

    socket.to(roomSlug).emit('user_left', {
      userId: socket.data.userId,
      userName: socket.data.userName,
      userAvatar: socket.data.userAvatar,
    })

    const socketsInRoom = await io.in(roomSlug).fetchSockets()
    if (socketsInRoom.length === 0) {
      const state = roomStates.get(roomSlug)
      if (state) {
        await prisma.room.update({
          where: { slug: roomSlug },
          data: {
            currentTime: computeCurrentTime(state),
            isPlaying: false,
          },
        })
        roomStates.delete(roomSlug)
        roomQueues.delete(roomSlug)
      }
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
function computeCurrentTime(state: SyncState & { hostId: string }): number {
  if (!state.isPlaying) return state.currentTime
  const elapsed = (Date.now() - state.serverTimestamp) / 1000
  return state.currentTime + elapsed
}

function isHost(socket: IoSocket, roomSlug: string): boolean {
  const state = roomStates.get(roomSlug)
  if (!state) return false
  return state.hostId === socket.data.userId
}
