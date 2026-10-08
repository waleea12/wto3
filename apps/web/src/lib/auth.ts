import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import axios from 'axios'

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000'
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim()
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_AUTH_ENABLED === 'true' && googleClientId && googleClientSecret ? [GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/youtube.readonly',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })] : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const res = await axios.post(`${SERVER_URL}/api/auth/login`, {
            email: credentials.email,
            password: credentials.password,
          })
          if (res.data?.user) {
            return {
              id: res.data.user.id,
              name: res.data.user.name,
              email: res.data.user.email,
              image: res.data.user.avatar,
              serverToken: res.data.token,
            }
          }
          return null
        } catch (error) {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, user }) {
      if (account?.provider === 'credentials') return Boolean((user as any)?.serverToken)
      if (account?.provider !== 'google' || !account.id_token) return false

      try {
        const { data } = await axios.post(`${SERVER_URL}/api/auth/google`, {
          idToken: account.id_token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
        })
        Object.assign(user, {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          image: data.user.avatar,
          serverToken: data.token,
          accessToken: account.access_token,
        })
        return true
      } catch (error) {
        console.error('Google account could not be connected to the watch party server', error)
        return false
      }
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        token.serverToken = (user as any).serverToken
        token.userId = user.id
        token.name = user.name
        token.email = user.email
        token.picture = user.image
        token.accessToken = (user as any).accessToken
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.userId as string
      session.user.serverToken = token.serverToken as string
      session.user.accessToken = token.accessToken as string
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  // Persist the NextAuth JWT in the browser for 30 days, so a refresh or
  // reopening the browser does not require signing in again.
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
