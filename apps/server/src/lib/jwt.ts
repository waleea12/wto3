import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export function signToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

export function verifyToken(token: string): { userId: string; email: string } {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string }
}
