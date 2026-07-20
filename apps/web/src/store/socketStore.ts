'use client'

import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents, SyncState } from '@watch-party/types'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface SocketState {
  socket: AppSocket | null
  connected: boolean
  roomSlug: string | null
  syncState: SyncState | null
  connect: (token: string) => void
  disconnect: () => void
  setRoomSlug: (slug: string | null) => void
  setSyncState: (state: SyncState) => void
}

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000'

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,
  roomSlug: null,
  syncState: null,

  connect: (token: string) => {
    const existing = get().socket
    if (existing?.connected) return

    const socket: AppSocket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => set({ connected: true }))
    socket.on('disconnect', () => set({ connected: false }))
    socket.on('sync_state', (state) => set({ syncState: state }))

    set({ socket })
  },

  disconnect: () => {
    get().socket?.disconnect()
    set({ socket: null, connected: false, roomSlug: null, syncState: null })
  },

  setRoomSlug: (slug) => set({ roomSlug: slug }),
  setSyncState: (state) => set({ syncState: state }),
}))
