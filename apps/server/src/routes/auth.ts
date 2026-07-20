import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '@watch-party/database'
import { env } from '../config/env'
import { signToken, verifyToken } from '../lib/jwt'
import { encrypt } from '../lib/crypto'
import { AppError } from '../middleware/errorHandler'
import bcrypt from 'bcryptjs'

export const authRouter = Router()

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET)

// POST /api/auth/google
// Accepts { idToken, accessToken, refreshToken } from NextAuth (which already exchanged the code)
authRouter.post('/google', async (req, res, next) => {
  try {
    const { idToken, accessToken, refreshToken } = req.body as {
      idToken: string
      accessToken?: string
      refreshToken?: string
    }
    if (!idToken) throw new AppError(400, 'Missing idToken')

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (!payload?.sub) throw new AppError(401, 'Invalid Google id_token')

    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null

    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: {
        name: payload.name ?? '',
        avatar: payload.picture ?? null,
        ...(encryptedRefreshToken && { refreshToken: encryptedRefreshToken }),
      },
      create: {
        googleId: payload.sub,
        name: payload.name ?? '',
        email: payload.email ?? '',
        avatar: payload.picture ?? null,
        refreshToken: encryptedRefreshToken,
      },
    })

    const jwtToken = signToken({ userId: user.id, email: user.email })

    return res.json({
      token: jwtToken,
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    })
  } catch (err) {
    return next(err)
  }
})

// POST /api/auth/register
// Accepts { name, email, password }
authRouter.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      throw new AppError(400, 'Missing name, email, or password')
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      throw new AppError(400, 'Email already in use')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })

    const jwtToken = signToken({ userId: user.id, email: user.email })

    return res.json({
      token: jwtToken,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    })
  } catch (err) {
    return next(err)
  }
})

// POST /api/auth/login
// Accepts { email, password }
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      throw new AppError(400, 'Missing email or password')
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password) {
      throw new AppError(401, 'Invalid email or password')
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      throw new AppError(401, 'Invalid email or password')
    }

    const jwtToken = signToken({ userId: user.id, email: user.email })

    return res.json({
      token: jwtToken,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    })
  } catch (err) {
    return next(err)
  }
})

// GET /api/auth/me
authRouter.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) throw new AppError(401, 'Unauthorized')
    const payload = verifyToken(authHeader.slice(7))
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) throw new AppError(404, 'User not found')
    return res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar })
  } catch (err) {
    return next(err)
  }
})

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  return res.json({ ok: true })
})
