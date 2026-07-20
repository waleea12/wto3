import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from './errorHandler'

export interface AuthRequest extends Request {
  userId?: string
  userEmail?: string
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing or invalid authorization header'))
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string }
    req.userId = payload.userId
    req.userEmail = payload.email
    return next()
  } catch {
    return next(new AppError(401, 'Invalid or expired token'))
  }
}
