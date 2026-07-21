import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import axios from 'axios'

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
    }),
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
    async signIn({ account }) {
      if (account?.provider === 'google' && account.id_token) {
        return true
      }
      if (account?.provider === 'credentials') {
        return true
      }
      return false
    },
    async jwt({ token, account, user }) {
      if (account?.provider === 'credentials' && user) {
        token.serverToken = (user as any).serverToken
        token.userId = user.id
        token.name = user.name
        token.email = user.email
        token.picture = user.image
      } else if (account && user) {
        try {
          const response = await axios.post(`${SERVER_URL}/api/auth/google`, {
            idToken: account.id_token,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
          })
          token.serverToken = response.data.token
          token.accessToken = account.access_token
          token.refreshToken = account.refresh_token
          token.userId = response.data.user.id
          token.name = response.data.user.name
          token.email = response.data.user.email
          token.picture = response.data.user.avatar
        } catch (err) {
          console.error('Failed to sync user with server:', err)
        }
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
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
