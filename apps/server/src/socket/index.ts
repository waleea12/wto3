import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '@watch-party/types'
import { prisma } from '@watch-party/database'
import { verifyToken } from '../lib/jwt'
import { registerRoomHandlers } from './roomHandlers'
import { env } from '../config/env'

// Exported so routes can access socket info (e.g., find host's driveToken)
export let ioServer: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null

export function createSocketServer(httpServer: HttpServer) {
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())

  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
      pingInterval: 5000,
      pingTimeout: 10000,
    }
  )

  ioServer = io

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token as string
      if (!token) return next(new Error('Missing auth token'))

      const payload = verifyToken(token)
      const user = await prisma.user.findUnique({ where: { id: payload.userId } })
      if (!user) return next(new Error('User not found'))

      socket.data.userId = user.id
      socket.data.userName = user.name
      socket.data.userAvatar = user.avatar
      return next()
    } catch {
      return next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.data.userId})`)
    registerRoomHandlers(io, socket)

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} - ${reason}`)
    })
  })

  return io
}
