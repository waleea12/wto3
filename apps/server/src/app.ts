import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env } from './config/env'
import { authRouter } from './routes/auth'
import { roomRouter } from './routes/rooms'
import { driveRouter } from './routes/drive'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'

export function createApp() {
  const app = express()

  // Security middleware
  app.use(helmet())

  // CORS
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      },
      credentials: true,
    })
  )

  // Body parsing
  app.use(express.json({ limit: '10kb' }))
  app.use(express.urlencoded({ extended: true, limit: '10kb' }))

  // Request logging
  app.use(requestLogger)

  // Rate limiting
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  })
  app.use('/api/', limiter)

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // API Routes
  app.use('/api/auth', authRouter)
  app.use('/api/rooms', roomRouter)
  app.use('/api/drive', driveRouter)

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' })
  })

  // Error handler
  app.use(errorHandler)

  return app
}
