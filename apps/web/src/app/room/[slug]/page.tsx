'use client'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { useSocketStore } from '@/store/socketStore'
import axios from 'axios'
import DriveBrowser from '@/components/DriveBrowser'
// MovieLibrary removed


const SERVER = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000'

type VideoSource = 'youtube' | 'drive' | 'movie' | null

interface RoomState {
  isHost: boolean
  hostId: string
  currentVideo: string | null
  currentSource: VideoSource
  currentTime: number
  isPlaying: boolean
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  userAvatar: string | null
  message: string
  createdAt: Date | string
}

interface Participant {
  user: { id: string; name: string; avatar: string | null }
}

interface QueueItem {
  id: string
  videoId: string
  source: VideoSource
  title: string
  thumbnail?: string
  addedBy: string
  addedByName: string
  votes: string[]
}

// ── Colour tokens ─────────────────────────────────────────────────────────────
const C = {
  gold:       'rgba(210,170,80,0.88)',
  goldFaint:  'rgba(200,165,70,0.12)',
  goldBorder: 'rgba(200,160,60,0.20)',
  text90:     'rgba(225,210,175,0.92)',
  text70:     'rgba(210,195,160,0.70)',
  text50:     'rgba(200,185,150,0.50)',
  text30:     'rgba(200,180,135,0.30)',
  text20:     'rgba(200,180,135,0.20)',
  bgPanel:    'rgba(10,12,22,0.92)',
  bgCard:     'rgba(200,165,60,0.05)',
  border:     'rgba(200,170,100,0.10)',
  borderSub:  'rgba(200,170,100,0.07)',
}

// ── YouTube Search Modal ──────────────────────────────────────────────────────
interface YTResult {
  id: string
  title: string
  thumbnail: string
  channel: string
  duration: string
}

function YouTubeModal({
  onPlay,
  onQueue,
  isHost,
  onClose,
}: {
  onPlay: (id: string, title: string, thumbnail: string) => void
  onQueue: (id: string, title: string, thumbnail: string) => void
  isHost: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<YTResult[]>([])
  const [loading, setLoading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [tab, setTab] = useState<'search' | 'url'>('search')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function extractId(url: string) {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return m ? m[1] : null
  }

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
      if (apiKey) {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=12&key=${apiKey}`)
        if (res.ok) {
          const data = await res.json()
          setResults((data.items ?? []).map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails?.medium?.url ?? '',
            channel: item.snippet.channelTitle,
            duration: '',
          })))
          return
        }
      }
      // Fallback: Invidious
      const inv = await fetch(`https://inv.nadeko.net/api/v1/search?q=${encodeURIComponent(query)}&type=video`)
      if (inv.ok) {
        const data = await inv.json()
        setResults((data ?? []).slice(0, 12).map((v: any) => ({
          id: v.videoId,
          title: v.title,
          thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          channel: v.author,
          duration: formatDuration(v.lengthSeconds),
        })))
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }

  function formatDuration(secs: number) {
    if (!secs) return ''
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  }

  function handleUrl(e: React.FormEvent) {
    e.preventDefault()
    const id = extractId(urlInput)
    if (!id) return
    const title = urlInput
    const thumbnail = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
    if (isHost) onPlay(id, title, thumbnail)
    else onQueue(id, title, thumbnail)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-2xl flex flex-col overflow-hidden"
        style={{
          background: 'rgba(11,14,24,0.98)',
          border: '1px solid rgba(200,170,100,0.14)',
          borderRadius: '6px',
          maxHeight: '88dvh',
          boxShadow: '0 32px 80px rgba(0,0,0,0.75)',
        }}>
        {/* Gold top accent */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(200,160,60,0.50), transparent)', flexShrink: 0 }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(200,170,100,0.08)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center"
              style={{ background: 'rgba(255,0,0,0.12)', border: '1px solid rgba(255,0,0,0.22)', borderRadius: '4px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" fill="#ff4444"/>
                <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
              </svg>
            </div>
            <span className="font-semibold text-sm" style={{ color: C.text90 }}>YouTube</span>
            {!isHost && (
              <span className="text-xs px-2 py-0.5"
                style={{ background: C.goldFaint, color: C.gold, border: '1px solid ' + C.goldBorder, borderRadius: '3px' }}>
                سيُضاف للطابور
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center transition-colors duration-150"
            style={{ background: 'rgba(255,255,255,0.05)', color: C.text50, borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-3 gap-1 flex-shrink-0">
          {(['search', 'url'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 text-sm font-medium transition-all duration-200"
              style={tab === t
                ? { background: C.goldFaint, color: C.gold, border: '1px solid ' + C.goldBorder, borderRadius: '3px' }
                : { background: 'transparent', color: C.text30, border: '1px solid transparent', borderRadius: '3px' }}>
              {t === 'search' ? '🔍 بحث' : '🔗 رابط مباشر'}
            </button>
          ))}
        </div>

        <div className="p-5 flex-1 overflow-y-auto scrollbar-thin">
          {tab === 'url' ? (
            <form onSubmit={handleUrl} className="flex gap-3">
              <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://youtube.com/watch?v=..." className="input-field flex-1" />
              <button type="submit" className="btn-primary px-5 flex-shrink-0">
                {isHost ? 'تشغيل' : '+ طابور'}
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={search} className="flex gap-2 mb-5">
                <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن مقطع..." className="input-field flex-1" />
                <button type="submit" disabled={loading} className="btn-primary px-5 flex-shrink-0">
                  {loading
                    ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  }
                </button>
              </form>

              {results.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.map((v) => (
                    <div key={v.id} className="overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.03)', border: C.border, borderRadius: '4px' }}>
                      <div className="relative" style={{ aspectRatio: '16/9' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                        {v.duration && (
                          <span className="absolute bottom-1 right-1 px-1 text-[10px] font-bold text-white"
                            style={{ background: 'rgba(0,0,0,0.75)', borderRadius: '2px' }}>{v.duration}</span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-sm font-medium leading-tight line-clamp-2 mb-1" style={{ color: C.text90 }}>{v.title}</p>
                        <p className="text-xs mb-2.5" style={{ color: C.text30 }}>{v.channel}</p>
                        <div className="flex gap-2">
                          {isHost && (
                            <button onClick={() => onPlay(v.id, v.title, v.thumbnail)}
                              className="flex-1 py-1.5 text-xs font-semibold transition-all"
                              style={{ background: 'linear-gradient(135deg, hsl(38 68% 44%), hsl(38 72% 52%))', color: 'hsl(220 22% 8%)', borderRadius: '3px' }}>
                              ▶ تشغيل
                            </button>
                          )}
                          <button onClick={() => onQueue(v.id, v.title, v.thumbnail)}
                            className="flex-1 py-1.5 text-xs font-semibold transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: C.text70, borderRadius: '3px' }}>
                            + طابور
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <div className="w-14 h-14 flex items-center justify-center"
                    style={{ background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.12)', borderRadius: '4px' }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" fill="rgba(255,68,68,0.45)"/>
                      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="rgba(255,255,255,0.45)"/>
                    </svg>
                  </div>
                  <p className="text-sm" style={{ color: C.text30 }}>ابحث عن أي مقطع على يوتيوب</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Queue Panel ───────────────────────────────────────────────────────────────
function QueuePanel({
  queue,
  isHost,
  userId,
  onVote,
  onRemove,
  onSkip,
}: {
  queue: QueueItem[]
  isHost: boolean
  userId: string
  onVote: (id: string) => void
  onRemove: (id: string) => void
  onSkip: () => void
}) {
  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,100,0.15)" strokeWidth="1.5">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        <p className="text-xs" style={{ color: C.text20 }}>الطابور فارغ</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {isHost && (
        <button onClick={onSkip}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold tracking-wide transition-all"
          style={{ background: C.goldFaint, border: '1px solid ' + C.goldBorder, color: C.gold, borderRadius: '3px' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
          </svg>
          تشغيل التالي
        </button>
      )}
      {queue.map((item, idx) => {
        const hasVoted = item.votes.includes(userId)
        const isOwner = item.addedBy === userId
        return (
          <div key={item.id} className="flex gap-2.5 p-2.5 group"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(200,170,100,0.07)', borderRadius: '4px' }}>
            {/* Rank */}
            <div className="w-5 flex-shrink-0 flex items-start justify-center pt-0.5">
              <span className="text-[10px] font-bold" style={{ color: C.text20 }}>#{idx + 1}</span>
            </div>

            {/* Thumbnail */}
            {item.thumbnail && item.source === 'youtube' && (
              <div className="flex-shrink-0 overflow-hidden" style={{ width: 56, height: 32, borderRadius: '3px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
              </div>
            )}
            {item.source === 'drive' && (
              <div className="flex-shrink-0 w-14 h-8 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                <svg width="14" height="14" viewBox="0 0 87.3 78" fill="none">
                  <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0a15.4 15.4 0 0 0 2.1 7.85z" fill="#0066da"/>
                  <path d="M43.65 25L29.9 1.2a15.4 15.4 0 0 0-3.3 3.3L2.1 45.5A15.35 15.35 0 0 0 0 53.0h27.5L43.65 25z" fill="#00ac47"/>
                  <path d="M60.7 53H27.5L13.75 76.8c1.35.75 2.9 1.2 4.55 1.2h50.7c1.65 0 3.2-.45 4.55-1.2L60.7 53z" fill="#2684fc"/>
                </svg>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium line-clamp-2 leading-tight" style={{ color: C.text90 }}>{item.title || item.videoId}</p>
              <p className="text-[10px] mt-0.5" style={{ color: C.text30 }}>بواسطة {item.addedByName}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <button onClick={() => onVote(item.id)}
                className="flex flex-col items-center gap-0.5 px-1.5 py-1 transition-all"
                style={hasVoted
                  ? { background: C.goldFaint, border: '1px solid ' + C.goldBorder, color: C.gold, borderRadius: '3px' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: C.text30, borderRadius: '3px' }
                }>
                <svg width="9" height="9" viewBox="0 0 24 24" fill={hasVoted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
                <span className="text-[10px] font-bold leading-none">{item.votes.length}</span>
              </button>

              {(isOwner || isHost) && (
                <button onClick={() => onRemove(item.id)}
                  className="p-1 opacity-0 group-hover:opacity-100 transition-all"
                  style={{ background: 'rgba(200,60,60,0.10)', color: 'rgba(220,100,100,0.65)', borderRadius: '3px' }}
                  title="إزالة">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Room Page ────────────────────────────────────────────────────────────
export default function RoomPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: session } = useSession()
  const router = useRouter()
  const { socket, connected, connect } = useSocketStore()

  const [room, setRoom] = useState<RoomState | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [chatInput, setChatInput] = useState('')
  const [copyMsg, setCopyMsg] = useState('')
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [showDriveBrowser, setShowDriveBrowser] = useState(false)
  const [showYouTubeModal, setShowYouTubeModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'queue'>('chat')


  const playerRef = useRef<HTMLIFrameElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const isPlayingRef = useRef<boolean>(false)
  const ytCurrentTimeRef = useRef<number>(0)
  const roomSourceRef = useRef<VideoSource>(null)

  useEffect(() => {
    if (session?.user.serverToken && !connected) connect(session.user.serverToken)
  }, [session, connected, connect])

  useEffect(() => {
    isPlayingRef.current = room?.isPlaying ?? false
    roomSourceRef.current = room?.currentSource ?? null
  }, [room?.isPlaying, room?.currentSource])

  const lastPlayerState = useRef<number>(-1)
  useEffect(() => {
    if (!socket || room?.currentSource !== 'youtube') return
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://www.youtube.com') return
      try {
        const data = JSON.parse(e.data)
        if (data.event === 'infoDelivery' && data.info) {
          const state = data.info.playerState
          const time = data.info.currentTime ?? room?.currentTime ?? 0
          ytCurrentTimeRef.current = time
          if (state !== undefined && state !== lastPlayerState.current) {
            lastPlayerState.current = state
            if (room?.isHost) {
              if (state === 1) socket.emit('play', { currentTime: time, serverTimestamp: Date.now() })
              else if (state === 2) socket.emit('pause', { currentTime: time, serverTimestamp: Date.now() })
            }
          }
        }
      } catch (err) {}
    }
    window.addEventListener('message', handleMessage)
    const listenInterval = setInterval(() => {
      if (playerRef.current?.contentWindow) {
        playerRef.current.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*')
      }
    }, 1000)
    return () => {
      window.removeEventListener('message', handleMessage)
      clearInterval(listenInterval)
    }
  }, [room?.isHost, room?.currentSource, socket, room?.currentTime])

  useEffect(() => {
    if (!socket || !connected || !slug) return

    socket.emit('join_room', {
      roomSlug: slug,
      token: session?.user.serverToken ?? '',
      driveToken: (session?.user as any)?.accessToken ?? undefined
    }, (state: any) => {
      setRoom((prev) => ({
        isHost: state.isHost ?? prev?.isHost ?? false,
        hostId: state.hostId ?? prev?.hostId ?? '',
        currentVideo: state.currentVideo,
        currentSource: state.currentSource as VideoSource,
        currentTime: state.currentTime,
        isPlaying: state.isPlaying,
      }))
      if (state.queue) setQueue(state.queue)
    })

    socket.on('user_joined', (data: any) => {
      setParticipants((prev) => [
        ...prev.filter((p) => p.user.id !== data.userId),
        { user: { id: data.userId, name: data.userName, avatar: data.userAvatar ?? null } },
      ])
    })
    socket.on('user_left', (data: any) => setParticipants((prev) => prev.filter((p) => p.user.id !== data.userId)))
    socket.on('play', (p: any) => {
      setRoom((r) => r ? { ...r, isPlaying: true, currentTime: p.currentTime } : r)
      if (videoRef.current) { videoRef.current.currentTime = p.currentTime; videoRef.current.play() }
      if (playerRef.current?.contentWindow) {
        playerRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [p.currentTime, true] }), '*')
        playerRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*')
      }
    })
    socket.on('pause', (p: any) => {
      setRoom((r) => r ? { ...r, isPlaying: false, currentTime: p.currentTime } : r)
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = p.currentTime }
      if (playerRef.current?.contentWindow) {
        playerRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*')
      }
    })
    socket.on('seek', (p: any) => {
      setRoom((r) => r ? { ...r, currentTime: p.currentTime } : r)
      if (videoRef.current) videoRef.current.currentTime = p.currentTime
      if (playerRef.current?.contentWindow) {
        playerRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [p.currentTime, true] }), '*')
      }
    })
    socket.on('change_video', (p: any) => setRoom((r) => r ? { ...r, currentVideo: p.videoId, currentSource: p.source as VideoSource, currentTime: 0, isPlaying: true } : r))
    socket.on('chat_message', (msg: any) => { setMessages((prev) => [...prev, msg as ChatMessage]); chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) })
    socket.on('typing', (p: any) => {
      if (p.userId === session?.user.id) return
      setTypingUsers((prev) => p.isTyping ? [...new Set([...prev, p.userName])] : prev.filter((u) => u !== p.userName))
    })
    socket.on('sync_state', (state: any) => {
      setRoom((r) => r ? { ...r, currentTime: state.currentTime, isPlaying: state.isPlaying } : r)
      if (videoRef.current) { videoRef.current.currentTime = state.currentTime; if (state.isPlaying) videoRef.current.play(); else videoRef.current.pause() }
      if (playerRef.current?.contentWindow) {
        playerRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [state.currentTime, true] }), '*')
        playerRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: state.isPlaying ? 'playVideo' : 'pauseVideo', args: [] }), '*')
      }
    })
    socket.on('host_changed', (p: any) => setRoom((r) => r ? { ...r, hostId: p.newHostId, isHost: p.newHostId === session?.user.id } : r))
    socket.on('queue_updated', (q: any) => setQueue(q))

    return () => {
      socket.emit('leave_room')
      ;(['user_joined','user_left','play','pause','seek','change_video','chat_message','typing','sync_state','host_changed','queue_updated'] as any[]).forEach((e) => socket.off(e))
    }
  }, [socket, connected, slug, session])

  useEffect(() => {
    if (!session) return
    const headers = { Authorization: `Bearer ${session.user.serverToken}` }
    axios.get(`${SERVER}/api/rooms/${slug}`, { headers })
      .then(({ data }) => setParticipants(data.participants ?? []))
      .catch(() => router.push('/'))
    axios.get(`${SERVER}/api/rooms/${slug}/messages`, { headers })
      .then(({ data }) => { setMessages(data); setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150) })
  }, [slug, session, router])

  // Auto-scroll to bottom whenever messages change or tab switches to chat
  useEffect(() => {
    if (sidebarTab === 'chat') {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [messages, sidebarTab])

  useEffect(() => {
    if (!socket || !connected) return
    heartbeatInterval.current = setInterval(() => {
      const source = roomSourceRef.current
      let currentTime = 0
      if (source === 'drive') currentTime = videoRef.current?.currentTime ?? 0
      else if (source === 'youtube') currentTime = ytCurrentTimeRef.current
      socket.emit('heartbeat', { currentTime, buffered: 0, latency: 0 })
    }, 5000)
    return () => { if (heartbeatInterval.current) clearInterval(heartbeatInterval.current) }
  }, [socket, connected, room?.currentTime])

  useEffect(() => {
    if (!room || !videoRef.current || room.currentSource !== 'drive') return
    const video = videoRef.current
    function syncOnReady() {
      if (!room) return
      video.currentTime = room.currentTime
      if (room.isPlaying) video.play().catch(() => {})
      else video.pause()
    }
    if (video.readyState >= 1) syncOnReady()
    else {
      video.addEventListener('loadedmetadata', syncOnReady, { once: true })
      return () => video.removeEventListener('loadedmetadata', syncOnReady)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.currentVideo, room?.currentSource])

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(
        !!document.fullscreenElement ||
        !!(document as any).webkitFullscreenElement
      )
    }
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
    }
  }, [])

  function toggleFullscreen() {
    const isFs =
      !!document.fullscreenElement ||
      !!(document as any).webkitFullscreenElement

    if (!isFs) {
      // On iOS Safari, requestFullscreen on a div doesn't work.
      // For Drive (video element), use the video's native fullscreen.
      // For YouTube (iframe), try container then iframe.
      const vid = videoRef.current
      const container = videoContainerRef.current
      const iframe = playerRef.current

      if (room?.currentSource === 'drive' && vid) {
        // Native video fullscreen (works on all mobile browsers)
        if (vid.requestFullscreen) {
          vid.requestFullscreen().catch(() => {})
        } else if ((vid as any).webkitEnterFullscreen) {
          // iOS Safari native video fullscreen
          ;(vid as any).webkitEnterFullscreen()
        } else if ((vid as any).webkitRequestFullscreen) {
          ;(vid as any).webkitRequestFullscreen()
        }
      } else if (container) {
        // YouTube: try container fullscreen
        if (container.requestFullscreen) {
          container.requestFullscreen().catch(() => {
            // Fallback: try iframe
            if (iframe?.requestFullscreen) iframe.requestFullscreen().catch(() => {})
            else if ((iframe as any)?.webkitRequestFullscreen) (iframe as any).webkitRequestFullscreen()
          })
        } else if ((container as any).webkitRequestFullscreen) {
          ;(container as any).webkitRequestFullscreen()
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      } else if ((document as any).webkitExitFullscreen) {
        ;(document as any).webkitExitFullscreen()
      }
    }
  }

  function handleYouTubePlay(id: string, title: string, thumbnail: string) {
    socket?.emit('change_video', { videoId: id, source: 'youtube', title })
    setShowYouTubeModal(false)
  }



  const handleYouTubeQueue = useCallback((id: string, title: string, thumbnail: string) => {
    if (!session) return
    const item: QueueItem = {
      id: `${id}-${Date.now()}`,
      videoId: id,
      source: 'youtube',
      title,
      thumbnail,
      addedBy: session.user.id,
      addedByName: session.user.name ?? 'Unknown',
      votes: [session.user.id],
    }
    socket?.emit('queue_add', { item } as any)
    setShowYouTubeModal(false)
    setSidebarTab('queue')
  }, [socket, session])

  function handleDriveSelect(fileId: string, fileName: string) {
    if (!room?.isHost) return
    socket?.emit('change_video', {
      videoId: fileId,
      source: 'drive',
      title: fileName,
      driveToken: (session?.user as any)?.accessToken ?? undefined
    })
  }

  function handleQueueVote(id: string) { socket?.emit('queue_vote', { id } as any) }
  function handleQueueRemove(id: string) { socket?.emit('queue_remove', { id } as any) }
  function handleQueueSkip() { socket?.emit('queue_skip' as any) }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || !socket) return
    socket.emit('chat_message', { message: chatInput.trim() })
    setChatInput('')
    socket.emit('typing', { userId: session?.user.id ?? '', userName: session?.user.name ?? '', isTyping: false })
  }

  function onTyping(val: string) {
    setChatInput(val)
    if (!socket || !session) return
    socket.emit('typing', { userId: session.user.id, userName: session.user.name ?? '', isTyping: true })
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      socket.emit('typing', { userId: session.user.id, userName: session.user.name ?? '', isTyping: false })
    }, 2000)
  }

  function copyInvite() {
    navigator.clipboard.writeText(window.location.href)
    setCopyMsg('Copied!')
    setTimeout(() => setCopyMsg(''), 2000)
  }

  const handlePlay = (eOrTime?: number | React.SyntheticEvent<any>) => { 
    if (!room?.isHost) return; 
    const time = typeof eOrTime === 'number' ? eOrTime : videoRef.current?.currentTime ?? 0;
    socket?.emit('play', { currentTime: time, serverTimestamp: Date.now() }) 
  }
  const handlePause = (eOrTime?: number | React.SyntheticEvent<any>) => { 
    if (!room?.isHost) return; 
    const time = typeof eOrTime === 'number' ? eOrTime : videoRef.current?.currentTime ?? 0;
    socket?.emit('pause', { currentTime: time, serverTimestamp: Date.now() }) 
  }
  const handleSeeked = (eOrTime?: number | React.SyntheticEvent<any>) => { 
    if (!room?.isHost) return; 
    const time = typeof eOrTime === 'number' ? eOrTime : videoRef.current?.currentTime ?? 0;
    socket?.emit('seek', { currentTime: time, serverTimestamp: Date.now() }) 
  }

  const stableYoutubeUrl = useMemo(() => {
    if (!room?.currentVideo || room.currentSource !== 'youtube') return ''
    return `https://www.youtube.com/embed/${room.currentVideo}?enablejsapi=1&start=${Math.floor(room.currentTime || 0)}&autoplay=1&playsinline=1`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.currentVideo, room?.currentSource])

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-background overflow-hidden">

      {/* ── Main area (desktop: flex-col flex-1; mobile: just video+controls) ── */}
      <div className="flex flex-col min-w-0 flex-1 md:flex-1">

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{
            backdropFilter: 'blur(20px)',
            background: 'rgba(8,10,20,0.88)',
            borderBottom: '1px solid rgba(200,170,100,0.09)',
          }}>
          <div className="flex items-center gap-2.5">
            <button onClick={() => router.push('/')} className="btn-ghost p-2 -ml-2" title="Leave Room">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-7 h-7 flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(10,12,22,0.95)',
                border: '1px solid rgba(200,160,60,0.28)',
                borderRadius: '4px',
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(210,170,80,0.85)"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm hidden sm:inline" style={{ color: C.text90, fontFamily: 'var(--font-playfair)' }}>Watch Party</span>
              <span className="text-sm hidden sm:inline" style={{ color: C.text30 }}>/</span>
              <span className="text-sm font-mono" style={{ color: C.text50 }}>{slug}</span>
              {room?.isHost && <span className="badge-host text-[10px] sm:text-xs">★ Host</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse-glow' : 'bg-red-400'}`} />
              <span className="text-xs hidden sm:inline" style={{ color: C.text30 }}>{connected ? 'Live' : 'Offline'}</span>
            </div>
            <button id="invite-btn" onClick={copyInvite} className="btn-ghost flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5">
              {copyMsg
                ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg><span className="hidden sm:inline">{copyMsg}</span></>
                : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span className="hidden sm:inline">Invite</span></>
              }
            </button>

            {/* Logout */}
            {session && (
              <button id="logout-room-btn" onClick={() => signOut({ callbackUrl: '/login' })} title="Sign Out"
                className="w-8 h-8 flex items-center justify-center transition-all duration-200"
                style={{ background: 'rgba(200,60,60,0.08)', border: '1px solid rgba(200,60,60,0.20)', color: 'rgba(220,100,100,0.65)', borderRadius: '4px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            )}
            {session && (
              <div className="w-7 h-7 avatar text-xs hidden sm:flex">{session.user.name?.[0]?.toUpperCase()}</div>
            )}
          </div>
        </header>

        {/* Video area — mobile: 40dvh fixed; desktop: flex-1 */}
        <div ref={videoContainerRef}
          data-video-container
          className="mobile-video-h md:flex-1 bg-black flex items-center justify-center relative overflow-hidden group"
        >
          {!room?.currentVideo && (
            <div className="text-center space-y-4 px-6">
              <div className="w-20 h-20 flex items-center justify-center mx-auto"
                style={{ background: 'rgba(200,165,60,0.04)', border: '1px solid rgba(200,170,100,0.10)', borderRadius: '6px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,100,0.18)" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              <div>
                <p className="text-base font-medium" style={{ color: C.text30, fontFamily: 'var(--font-playfair)' }}>No video selected</p>
                <p className="text-sm mt-1" style={{ color: C.text20 }}>
                  {room?.isHost ? 'اضغط على YouTube أو Drive' : 'أضف مقطع للطابور أو انتظر الهوست'}
                </p>
              </div>
            </div>
          )}
          {room?.currentVideo && room.currentSource === 'youtube' && (
            <iframe ref={playerRef}
              src={stableYoutubeUrl}
              className={`w-full h-full ${!room.isHost ? 'pointer-events-none' : ''}`}
              allow="autoplay; fullscreen"
              allowFullScreen
              onLoad={() => {
                if (!isPlayingRef.current) {
                  setTimeout(() => {
                    playerRef.current?.contentWindow?.postMessage(
                      JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*'
                    )
                  }, 1500)
                }
              }}
            />
          )}
          {room?.currentVideo && room.currentSource === 'drive' && (
            <video key={room.currentVideo} ref={videoRef}
              src={`${SERVER}/api/rooms/${slug}/stream`}
              controls={!!room.isHost} className={`w-full h-full ${!room.isHost ? 'pointer-events-none' : ''}`}
              playsInline
              onPlay={handlePlay} onPause={handlePause} onSeeked={handleSeeked} />
          )}
          {/* Fullscreen button */}
          <button onClick={toggleFullscreen} title={isFullscreen ? 'تصغير' : 'تكبير'}
            className="absolute bottom-3 right-3 w-9 h-9 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 opacity-80 hover:opacity-100 transition-all duration-200 z-20"
            style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(200,170,100,0.22)', color: C.text70, backdropFilter: 'blur(8px)', borderRadius: '6px', pointerEvents: 'auto' }}>
            {isFullscreen
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            }
          </button>
        </div>

        {/* Host Controls */}
        {room?.isHost && (
          <div className="flex-shrink-0 p-3 md:p-4"
            style={{ backdropFilter: 'blur(20px)', background: 'rgba(8,10,20,0.85)', borderTop: '1px solid rgba(200,170,100,0.08)' }}>
            <div className="flex gap-2">
              <button id="youtube-picker-btn" onClick={() => setShowYouTubeModal(true)}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 font-medium text-sm flex-1 transition-all duration-200"
                style={{ background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.20)', color: 'rgba(255,130,130,0.85)', borderRadius: '4px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" fill="rgba(255,80,80,0.80)"/>
                  <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
                </svg>
                <span>YouTube</span>
              </button>
              <button onClick={() => setShowDriveBrowser(true)}
                className="btn-secondary px-3 md:px-5 flex-shrink-0 flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 87.3 78" fill="none">
                  <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0a15.4 15.4 0 0 0 2.1 7.85l4.5-6z" fill="#0066da" transform="scale(0.8)"/>
                  <path d="M43.65 25L29.9 1.2a15.4 15.4 0 0 0-3.3 3.3L2.1 45.5A15.35 15.35 0 0 0 0 53.0h27.5L43.65 25z" fill="#00ac47" transform="scale(0.8)"/>
                  <path d="M73.55 76.8a15.4 15.4 0 0 0 3.3-3.3l1.6-2.75 7.65-13.25a15.35 15.35 0 0 0 2.1-7.85H60.7l5.85 11.5 7 15.65z" fill="#ea4335" transform="scale(0.8)"/>
                  <path d="M43.65 25L57.4 1.2C56.05.45 54.5 0 52.85 0H34.45c-1.65 0-3.2.45-4.55 1.2L43.65 25z" fill="#00832d" transform="scale(0.8)"/>
                  <path d="M60.7 53H27.5L13.75 76.8c1.35.75 2.9 1.2 4.55 1.2h50.7c1.65 0 3.2-.45 4.55-1.2L60.7 53z" fill="#2684fc" transform="scale(0.8)"/>
                  <path d="M73.4 26.5L59.65 3.3a15.4 15.4 0 0 0-2.25-2.1L43.65 25 60.7 53h27.45a15.35 15.35 0 0 0-2.1-7.85L73.4 26.5z" fill="#ffba00" transform="scale(0.8)"/>
                </svg>
                <span className="hidden sm:inline">Drive</span>
              </button>
            </div>
          </div>
        )}

        {/* Non-host: add to queue */}
        {!room?.isHost && room !== null && (
          <div className="flex-shrink-0 px-3 pb-3 pt-2"
            style={{ backdropFilter: 'blur(20px)', background: 'rgba(8,10,20,0.82)', borderTop: '1px solid rgba(200,170,100,0.07)' }}>
            <button onClick={() => setShowYouTubeModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium tracking-wide transition-all"
              style={{ background: C.goldFaint, border: '1px solid ' + C.goldBorder, color: C.gold, borderRadius: '4px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              أضف مقطع للطابور
            </button>
          </div>
        )}

        {/* ── Mobile chat area ── */}
        <div className="md:hidden flex flex-col flex-1 overflow-hidden"
          style={{ background: 'rgba(8,10,20,0.97)', minHeight: 0 }}>
          <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid rgba(200,170,100,0.07)' }}>
            {(['chat', 'queue'] as const).map((t) => (
              <button key={t} onClick={() => setSidebarTab(t)}
                className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-all relative"
                style={sidebarTab === t
                  ? { color: C.gold, background: C.goldFaint }
                  : { color: C.text30, background: 'transparent' }
                }>
                {t === 'chat' ? 'Chat' : `Queue${queue.length > 0 ? ` (${queue.length})` : ''}`}
                {sidebarTab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: C.gold, opacity: 0.60 }} />}
              </button>
            ))}
          </div>

          {sidebarTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-6">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,100,0.10)" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p className="text-xs" style={{ color: C.text20 }}>No messages yet. Say hi!</p>
                  </div>
                )}
                {messages.map((msg) => {
                  const isOwn = msg.userId === session?.user.id
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="w-6 h-6 avatar text-[10px] self-end flex-shrink-0">{msg.userName?.[0]?.toUpperCase()}</div>
                      <div className={`max-w-[80%] space-y-0.5 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        <span className="text-xs px-1" style={{ color: C.text30, textAlign: isOwn ? 'right' : 'left' }}>
                          {isOwn ? 'You' : msg.userName}
                        </span>
                        <div className="px-3 py-2 text-sm leading-relaxed"
                          style={isOwn
                            ? { background: 'linear-gradient(135deg, hsl(38 62% 42%), hsl(38 66% 50%))', color: 'hsl(220 22% 10%)', borderRadius: '12px 12px 3px 12px' }
                            : { background: 'rgba(255,255,255,0.05)', color: C.text70, border: '1px solid rgba(200,170,100,0.08)', borderRadius: '12px 12px 12px 3px' }
                          }>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 avatar text-[10px] flex-shrink-0" style={{ opacity: 0.5 }}>{typingUsers[0]?.[0]?.toUpperCase()}</div>
                    <div className="px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,170,100,0.07)', borderRadius: '12px 12px 12px 3px' }}>
                      <div className="flex gap-1 items-center h-4">
                        {[0, 150, 300].map((delay) => (
                          <span key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ background: C.gold, opacity: 0.45, animationDelay: `${delay}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(200,170,100,0.07)' }}>
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input id="chat-input-mobile" value={chatInput} onChange={(e) => onTyping(e.target.value)}
                    placeholder="Send a message..." className="input-field flex-1 py-2" />
                  <button id="send-message-btn-mobile" type="submit" disabled={!chatInput.trim()}
                    className="w-9 h-9 flex items-center justify-center transition-all duration-200 flex-shrink-0 disabled:opacity-35"
                    style={{ background: 'linear-gradient(135deg, hsl(38 62% 42%), hsl(38 66% 50%))', borderRadius: '4px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(220 22% 10%)" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </form>
              </div>
            </>
          )}

          {sidebarTab === 'queue' && (
            <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
              <QueuePanel
                queue={queue}
                isHost={room?.isHost ?? false}
                userId={session?.user.id ?? ''}
                onVote={handleQueueVote}
                onRemove={handleQueueRemove}
                onSkip={handleQueueSkip}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Sidebar (desktop only) ── */}
      <aside
        className="hidden md:flex md:w-72 md:flex-col"
        style={{
          borderLeft: '1px solid rgba(200,170,100,0.08)',
          background: 'rgba(8,10,20,0.97)',
        }}>

        <div className="flex items-center justify-between px-4 py-3 md:hidden flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(200,170,100,0.08)', background: 'rgba(5,7,15,0.95)' }}>
          <span className="text-sm font-semibold" style={{ color: C.text70, fontFamily: 'var(--font-playfair)' }}>Watch Party</span>
          <button onClick={() => setShowChat(false)} className="btn-ghost p-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Participants */}
        <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(200,170,100,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.text30, letterSpacing: '0.10em' }}>Participants</h3>
            <span className="text-xs px-2 py-0.5 font-semibold"
              style={{ background: 'rgba(255,255,255,0.05)', color: C.text50, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '3px' }}>
              {participants.length}
            </span>
          </div>
          <div className="space-y-2 max-h-24 overflow-y-auto scrollbar-thin">
            {participants.map((p) => (
              <div key={p.user.id} className="flex items-center gap-2.5">
                <div className="w-6 h-6 avatar text-[10px]">{p.user.name?.[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0"><p className="text-sm truncate" style={{ color: C.text70 }}>{p.user.name}</p></div>
                {p.user.id === room?.hostId && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                )}
              </div>
            ))}
            {participants.length === 0 && <p className="text-xs" style={{ color: C.text20 }}>No participants yet...</p>}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid rgba(200,170,100,0.07)' }}>
          {(['chat', 'queue'] as const).map((t) => (
            <button key={t} onClick={() => setSidebarTab(t)}
              className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-all relative"
              style={sidebarTab === t
                ? { color: C.gold, background: C.goldFaint }
                : { color: C.text30, background: 'transparent' }
              }>
              {t === 'chat' ? 'Chat' : `Queue${queue.length > 0 ? ` (${queue.length})` : ''}`}
              {sidebarTab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: C.gold, opacity: 0.60 }} />}
            </button>
          ))}
        </div>

        {/* Chat panel */}
        {sidebarTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-8">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,100,0.10)" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <p className="text-xs" style={{ color: C.text20 }}>No messages yet. Say hi!</p>
                </div>
              )}
              {messages.map((msg) => {
                const isOwn = msg.userId === session?.user.id
                return (
                  <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-6 h-6 avatar text-[10px] self-end flex-shrink-0">{msg.userName?.[0]?.toUpperCase()}</div>
                    <div className={`max-w-[80%] space-y-0.5 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      <span className="text-xs px-1" style={{ color: C.text30, textAlign: isOwn ? 'right' : 'left' }}>
                        {isOwn ? 'You' : msg.userName}
                      </span>
                      <div className="px-3 py-2 text-sm leading-relaxed"
                        style={isOwn
                          ? { background: 'linear-gradient(135deg, hsl(38 62% 42%), hsl(38 66% 50%))', color: 'hsl(220 22% 10%)', borderRadius: '12px 12px 3px 12px' }
                          : { background: 'rgba(255,255,255,0.05)', color: C.text70, border: '1px solid rgba(200,170,100,0.08)', borderRadius: '12px 12px 12px 3px' }
                        }>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                )
              })}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 avatar text-[10px] flex-shrink-0" style={{ opacity: 0.5 }}>{typingUsers[0]?.[0]?.toUpperCase()}</div>
                  <div className="px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,170,100,0.07)', borderRadius: '12px 12px 12px 3px' }}>
                    <div className="flex gap-1 items-center h-4">
                      {[0, 150, 300].map((delay) => (
                        <span key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: C.gold, opacity: 0.45, animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(200,170,100,0.07)' }}>
              <form onSubmit={sendMessage} className="flex gap-2">
                <input id="chat-input" value={chatInput} onChange={(e) => onTyping(e.target.value)}
                  placeholder="Send a message..." className="input-field flex-1 py-2" />
                <button id="send-message-btn" type="submit" disabled={!chatInput.trim()}
                  className="w-9 h-9 flex items-center justify-center transition-all duration-200 flex-shrink-0 disabled:opacity-35"
                  style={{ background: 'linear-gradient(135deg, hsl(38 62% 42%), hsl(38 66% 50%))', borderRadius: '4px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(220 22% 10%)" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </form>
            </div>
          </>
        )}

        {/* Queue panel */}
        {sidebarTab === 'queue' && (
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
            <QueuePanel
              queue={queue}
              isHost={room?.isHost ?? false}
              userId={session?.user.id ?? ''}
              onVote={handleQueueVote}
              onRemove={handleQueueRemove}
              onSkip={handleQueueSkip}
            />
          </div>
        )}
      </aside>

      {/* YouTube modal */}
      {showYouTubeModal && (
        <YouTubeModal
          onPlay={handleYouTubePlay}
          onQueue={handleYouTubeQueue}
          isHost={room?.isHost ?? false}
          onClose={() => setShowYouTubeModal(false)}
        />
      )}

      {showDriveBrowser && (session?.user as any)?.accessToken && (
        <DriveBrowser
          accessToken={(session!.user as any).accessToken}
          onSelect={handleDriveSelect}
          onClose={() => setShowDriveBrowser(false)}
        />
      )}
    </div>
  )
}
