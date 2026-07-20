export interface User {
  id: string
  googleId: string
  name: string
  email: string
  avatar: string | null
  createdAt: Date
}

export interface SessionUser {
  id: string
  name: string
  email: string
  avatar: string | null
  accessToken: string
}
