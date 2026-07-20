'use client'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import axios from 'axios'

const FEATURES = [
  { icon: '▶', label: 'YouTube' },
  { icon: '☁', label: 'Google Drive' },
  { icon: '✦', label: 'Live Chat' },
  { icon: '⟳', label: 'Real-time Sync' },
]

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
    } catch (err: any) {
      console.error(err)
      alert(err.response?.data?.error || 'حدث خطأ أثناء إنشاء الروم. تأكد من تشغيل السيرفر.')
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
      {/* Subtle background texture */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,160,60,0.18), transparent)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,160,60,0.10), transparent)' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(180,140,50,0.04) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-9">

        {/* ── Hero ──────────────────────────────── */}
        <div className="text-center space-y-5 animate-fade-in-up">
          {/* Monogram / logo */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 flex items-center justify-center rounded-full"
              style={{
                background: 'rgba(10,12,22,0.90)',
                border: '1px solid rgba(200,160,60,0.35)',
                boxShadow: '0 0 0 6px rgba(200,155,50,0.05), 0 8px 28px rgba(0,0,0,0.5)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <polygon points="5 3 19 12 5 21 5 3" fill="rgba(210,170,80,0.90)" />
              </svg>
            </div>

            {/* Thin decorative line */}
            <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg, transparent, rgba(200,160,60,0.40), transparent)' }} />
          </div>

          <div>
            <h1
              className="text-4xl font-bold tracking-tight leading-none"
              style={{ fontFamily: 'var(--font-playfair)', color: 'rgba(225,210,175,0.96)' }}
            >
              Watch Party
            </h1>
            <p
              className="mt-3 text-sm leading-relaxed"
              style={{ color: 'rgba(200,185,150,0.50)' }}
            >
              Watch videos in perfect sync with friends —<br className="hidden sm:block" /> anywhere, anytime.
            </p>
          </div>
        </div>

        {/* ── Feature pills ──────────────────────── */}
        <div className="flex flex-wrap gap-2 justify-center">
          {FEATURES.map((f) => (
            <span
              key={f.label}
              className="px-3 py-1 text-xs font-medium tracking-wide"
              style={{
                background: 'rgba(200,165,70,0.06)',
                color: 'rgba(200,180,130,0.52)',
                border: '1px solid rgba(200,160,60,0.12)',
                borderRadius: '3px',
                letterSpacing: '0.05em',
              }}
            >
              {f.icon} {f.label}
            </span>
          ))}
        </div>

        {/* ── Card ──────────────────────────────── */}
        <div
          className="w-full p-6 space-y-4"
          style={{
            background: 'rgba(12, 15, 26, 0.82)',
            border: '1px solid rgba(200,170,100,0.13)',
            borderRadius: '6px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          {/* Top inner border accent */}
          <div className="divider-gold -mx-6 -mt-6 mb-5" style={{ opacity: 0.6, borderRadius: '6px 6px 0 0' }} />

          {!session ? (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2
                  className="text-lg font-semibold"
                  style={{ fontFamily: 'var(--font-playfair)', color: 'rgba(220,205,170,0.95)' }}
                >
                  Get Started
                </h2>
                <p className="text-sm" style={{ color: 'rgba(200,185,150,0.40)' }}>
                  Sign in to create or join a room
                </p>
              </div>
              <button
                id="login-btn"
                onClick={() => router.push('/login')}
                className="btn-primary w-full py-3"
              >
                Sign In / Register
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* User info */}
              <div
                className="flex items-center gap-3 p-3"
                style={{
                  background: 'rgba(200,165,60,0.05)',
                  border: '1px solid rgba(200,160,60,0.13)',
                  borderRadius: '4px',
                }}
              >
                <div className="w-9 h-9 avatar text-sm">
                  {session.user.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'rgba(225,210,175,0.90)' }}>
                    {session.user.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'rgba(200,185,150,0.40)' }}>
                    {session.user.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-glow flex-shrink-0" />
                  <button
                    id="logout-btn"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    title="Sign Out"
                    className="w-7 h-7 flex items-center justify-center transition-all duration-200 flex-shrink-0"
                    style={{
                      background: 'rgba(200,60,60,0.10)',
                      border: '1px solid rgba(200,60,60,0.22)',
                      color: 'rgba(220,100,100,0.70)',
                      borderRadius: '4px',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Create New Room
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(200,165,70,0.10)' }} />
                <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: 'rgba(200,175,120,0.30)' }}>
                  or join
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(200,165,70,0.10)' }} />
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
        <p className="text-[11px] text-center tracking-wide" style={{ color: 'rgba(200,185,150,0.18)' }}>
          Powered by Next.js · Socket.io · PostgreSQL
        </p>
      </div>
    </main>
  )
}
