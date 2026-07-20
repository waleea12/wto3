import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@watch-party/database'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { nanoid } from 'nanoid'
import axios from 'axios'
import { roomStates } from '../socket/roomHandlers'
import { ioServer } from '../socket/index'

export const roomRouter = Router()

// POST /api/rooms - create a new room
roomRouter.post('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const slug = nanoid(7)
    const room = await prisma.room.create({
      data: {
        slug,
        hostId: req.userId!,
        participants: {
          create: { userId: req.userId! },
        },
      },
      include: {
        host: { select: { id: true, name: true, avatar: true } },
        participants: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    })
    return res.status(201).json(room)
  } catch (err) {
    return next(err)
  }
})

// GET /api/rooms/:slug - get room info
roomRouter.get('/:slug', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const room = await prisma.room.findUnique({
      where: { slug: req.params.slug },
      include: {
        host: { select: { id: true, name: true, avatar: true } },
        participants: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    })
    if (!room) throw new AppError(404, 'Room not found')
    return res.json(room)
  } catch (err) {
    return next(err)
  }
})

// POST /api/rooms/:slug/join - join a room
roomRouter.post('/:slug/join', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const room = await prisma.room.findUnique({ where: { slug: req.params.slug } })
    if (!room) throw new AppError(404, 'Room not found')

    await prisma.participant.upsert({
      where: { roomId_userId: { roomId: room.id, userId: req.userId! } },
      update: {},
      create: { roomId: room.id, userId: req.userId! },
    })

    const updatedRoom = await prisma.room.findUnique({
      where: { id: room.id },
      include: {
        host: { select: { id: true, name: true, avatar: true } },
        participants: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    })
    return res.json(updatedRoom)
  } catch (err) {
    return next(err)
  }
})

// GET /api/rooms/:slug/messages - get chat history
roomRouter.get('/:slug/messages', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const room = await prisma.room.findUnique({ where: { slug: req.params.slug } })
    if (!room) throw new AppError(404, 'Room not found')
    const messages = await prisma.message.findMany({
      where: { roomId: room.id },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    return res.json(messages)
  } catch (err) {
    return next(err)
  }
})

// PATCH /api/rooms/:slug/transfer - transfer host
roomRouter.patch('/:slug/transfer', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { newHostId } = req.body as { newHostId: string }
    const room = await prisma.room.findUnique({ where: { slug: req.params.slug } })
    if (!room) throw new AppError(404, 'Room not found')
    if (room.hostId !== req.userId) throw new AppError(403, 'Only the host can transfer ownership')
    const updated = await prisma.room.update({
      where: { id: room.id },
      data: { hostId: newHostId },
    })
    return res.json(updated)
  } catch (err) {
    return next(err)
  }
})

// GET /api/rooms/:slug/stream - stream the current drive video using the host's token
roomRouter.get('/:slug/stream', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug
    const state = roomStates.get(slug)

    console.log(`[STREAM DEBUG] slug=${slug}`)
    console.log(`[STREAM DEBUG] state exists=${!!state}`)
    console.log(`[STREAM DEBUG] currentSource=${state?.currentSource}`)
    console.log(`[STREAM DEBUG] currentVideo=${state?.currentVideo}`)
    console.log(`[STREAM DEBUG] driveToken exists=${!!state?.driveToken}`)
    console.log(`[STREAM DEBUG] driveToken preview=${state?.driveToken?.substring(0,20)}...`)
    
    if (!state || state.currentSource !== 'drive' || !state.currentVideo) {
      console.log('[STREAM DEBUG] → 404: no state/video')
      return res.status(404).send('Stream not available or not a Drive video')
    }

    if (!state.driveToken) {
      // Try to find the host's socket and get the token from it
      let foundToken: string | undefined
      if (ioServer) {
        const socketsInRoom = await ioServer.in(slug).fetchSockets()
        const hostSocket = socketsInRoom.find((s) => s.data.userId === state.hostId)
        if (hostSocket) {
          foundToken = (hostSocket.data as any).driveToken
        }
      }
      if (foundToken) {
        state.driveToken = foundToken
        console.log(`[STREAM DEBUG] Found driveToken from host socket for room ${slug}`)
      } else {
        console.log('[STREAM DEBUG] → 401: no driveToken (host not connected or has no token)')
        return res.status(401).send('Host drive token not available. Host must re-join the room.')
      }
    }

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${state.currentVideo}?alt=media`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${state.driveToken}`,
    }
    
    if (req.headers.range) {
      headers['Range'] = req.headers.range
      console.log(`[STREAM DEBUG] Range header: ${req.headers.range}`)
    }

    console.log(`[STREAM DEBUG] Fetching from Drive: ${driveUrl}`)
    
    const response = await axios({
      method: 'GET',
      url: driveUrl,
      headers,
      responseType: 'stream',
      validateStatus: () => true,
    })

    console.log(`[STREAM DEBUG] Drive response status: ${response.status}`)
    console.log(`[STREAM DEBUG] Drive response content-type: ${response.headers['content-type']}`)
    console.log(`[STREAM DEBUG] Drive response content-length: ${response.headers['content-length']}`)

    if (response.status >= 400) {
      // Read error body for debugging
      let errBody = ''
      response.data.on('data', (chunk: Buffer) => { errBody += chunk.toString() })
      response.data.on('end', () => {
        console.error(`[STREAM DEBUG] Drive error body: ${errBody}`)
      })
      console.error(`[STREAM DEBUG] → Drive API Error: ${response.status}`)
      return res.status(response.status).send(`Drive API Error: ${response.status}`)
    }

    // Set CORS headers explicitly for media streaming
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Accept-Ranges', 'bytes')
    // Allow cross-origin loading (Helmet sets same-origin by default which blocks <video> cross-origin)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')

    // Forward relevant headers from Drive response
    const forwardHeaders = ['content-type', 'content-length', 'content-range', 'cache-control']
    for (const key of forwardHeaders) {
      const value = response.headers[key]
      if (value) res.setHeader(key, value)
    }
    
    console.log(`[STREAM DEBUG] → Streaming to client with status ${response.status}`)
    res.status(response.status)
    response.data.pipe(res)
  } catch (err) {
    console.error('[STREAM DEBUG] Proxy Stream Error:', err)
    return res.status(500).send('Proxy Stream Error')
  }
})

