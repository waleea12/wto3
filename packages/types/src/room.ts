export type VideoSource = 'youtube' | 'drive'

export interface Room {
  id: string
  slug: string
  hostId: string
  currentVideo: string | null
  currentSource: VideoSource | null
  currentTime: number
  isPlaying: boolean
  createdAt: Date
}

export interface Participant {
  id: string
  roomId: string
  userId: string
  joinedAt: Date
  user: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
}

export interface RoomState {
  room: Room
  participants: Participant[]
  host: {
    id: string
    name: string
    avatar: string | null
  }
}

export interface CreateRoomResponse {
  slug: string
}
