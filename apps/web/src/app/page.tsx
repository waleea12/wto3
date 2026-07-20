'use client'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import axios from 'axios'

const FEATURES = ['🎬 YouTube', '☁️ Google Drive', '💬 Live Chat', '⚡ Real-time Sync']

export default function HomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)

  async function createRoom() {
    if (!session) { router.push('/login'); return }
    setLoading(true)
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/rooms`,
        {},
        { headers: { Authorization: `Bearer ${session.user.serverToken}` } }
      )
      router.push(`/room/${data.slug}`)
    } finally {
      setLoading(false)
    }
  }

  function joinRoom(e: React.FormEvent) {
    e.preventDefault()
    if (!slug.trim()) return
    if (!session) { router.push('/login'); return }
    router.push(`/room/${slug.trim()}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(139,92,246,0.09)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'rgba(99,102,241,0.08)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-10">

        {/* Hero */}
        <div className="text-center space-y-4 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-2"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <h1 className="text-5xl font-black tracking-tight">
            <span className="text-white">Watch</span>
            <span className="text-gradient"> Party</span>
          </h1>
          <p className="text-base leading-relaxed max-w-xs mx-auto" style={{ color: 'rgba(255,255,255,0.50)' }}>
            Watch videos in perfect sync with friends — anywhere, anytime.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {FEATURES.map((f) => (
            <span
              key={f}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.50)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* Card */}
        <div className="w-full glass rounded-2xl p-6 space-y-4" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
          {!session ? (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-white">Get Started</h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>Sign in to create or join a room</p>
              </div>
              <button
                id="login-btn"
                onClick={() => router.push('/login')}
                className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-[#7c3aed] text-white font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                style={{ boxShadow: '0 4px 14px rgba(124,58,237,0.39)' }}
              >
                Sign In / Register
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* User info */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <div className="w-9 h-9 avatar text-sm">
                  {session.user.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{session.user.name}</p>
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.40)' }}>{session.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-glow flex-shrink-0" />
                  <button
                    id="logout-btn"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    title="Sign Out"
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(239,68,68,0.75)' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Create room */}
              <button
                id="create-room-btn"
                onClick={createRoom}
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Creating Room...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Create New Room
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.28)' }}>OR JOIN</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {/* Join room */}
              <form onSubmit={joinRoom} className="flex gap-2">
                <input
                  id="room-code-input"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="Enter room code..."
                  className="input-field flex-1"
                />
                <button
                  id="join-room-btn"
                  type="submit"
                  className="btn-secondary px-4 py-2.5 flex-shrink-0"
                >
                  Join
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.20)' }}>
          Powered by Next.js · Socket.io · PostgreSQL
        </p>
      </div>
    </main>
  )
}
