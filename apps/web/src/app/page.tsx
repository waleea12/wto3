'use client'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import axios from 'axios'

const FEATURES = [
  { icon: '★', label: 'YouTube' },
  { icon: '☁', label: 'Google Drive' },
  { icon: '◆', label: 'Live Chat' },
  { icon: '↻', label: 'Real-time Sync' },
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
      {/* Background decorations — clouds */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Pixel clouds */}
        <div className="absolute top-[10%] left-[12%] animate-pixel-float" style={{ animationDelay: '0s' }}>
          <div className="w-20 h-8 bg-white border-2 border-[#1a1a2e]" style={{ boxShadow: '4px 4px 0 #1a1a2e' }}>
            <div className="w-10 h-5 bg-white border-2 border-[#1a1a2e] absolute -top-3 left-3" />
            <div className="w-8 h-5 bg-white border-2 border-[#1a1a2e] absolute -top-3 right-3" />
          </div>
        </div>
        <div className="absolute top-[18%] right-[15%] animate-pixel-float" style={{ animationDelay: '1s' }}>
          <div className="w-16 h-7 bg-white border-2 border-[#1a1a2e]" style={{ boxShadow: '4px 4px 0 #1a1a2e' }}>
            <div className="w-8 h-4 bg-white border-2 border-[#1a1a2e] absolute -top-2 left-2" />
            <div className="w-7 h-4 bg-white border-2 border-[#1a1a2e] absolute -top-2 right-2" />
          </div>
        </div>
        <div className="absolute top-[25%] left-[60%] animate-pixel-float" style={{ animationDelay: '2s' }}>
          <div className="w-24 h-9 bg-white border-2 border-[#1a1a2e]" style={{ boxShadow: '4px 4px 0 #1a1a2e' }}>
            <div className="w-12 h-6 bg-white border-2 border-[#1a1a2e] absolute -top-3 left-4" />
            <div className="w-10 h-6 bg-white border-2 border-[#1a1a2e] absolute -top-3 right-3" />
          </div>
        </div>
        {/* Pixel trees */}
        <div className="absolute bottom-[18%] left-[8%]" style={{ zIndex: 1 }}>
          <div className="w-2 h-8 bg-[#795548] mx-auto" />
          <div className="w-10 h-12 -mt-2 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-8 bg-[#4CAF50] border-2 border-[#1a1a2e]" />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-8 bg-[#388E3C] border-2 border-[#1a1a2e]" />
          </div>
        </div>
        <div className="absolute bottom-[18%] right-[10%]" style={{ zIndex: 1 }}>
          <div className="w-2 h-8 bg-[#795548] mx-auto" />
          <div className="w-10 h-12 -mt-2 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-8 bg-[#4CAF50] border-2 border-[#1a1a2e]" />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-8 bg-[#388E3C] border-2 border-[#1a1a2e]" />
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">

        {/* ── Hero ──────────────────────────────── */}
        <div className="text-center space-y-5 animate-fade-in-up">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-16 h-16 flex items-center justify-center"
              style={{
                background: '#FFC940',
                border: '3px solid #1a1a2e',
                boxShadow: '4px 4px 0px #1a1a2e',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#1a1a2e">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </div>
          </div>

          <div>
            <h1
              className="text-3xl font-bold leading-tight text-pixel"
              style={{ color: '#1a1a2e', fontSize: '1.35rem', lineHeight: 1.8, fontFamily: 'var(--font-pixel)' }}
            >
              Watch Party
            </h1>
            <p
              className="mt-3 text-sm leading-relaxed"
              style={{ color: '#1a1a2e', opacity: 0.7, fontFamily: 'var(--font-mono)' }}
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
              className="px-3 py-1 text-xs font-semibold tracking-wide"
              style={{
                background: '#fff',
                color: '#1a1a2e',
                border: '2px solid #1a1a2e',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
              }}
            >
              {f.icon} {f.label}
            </span>
          ))}
        </div>

        {/* ── Card with pixel-window style ──────── */}
        <div className="pixel-window w-full p-6 space-y-5" style={{ position: 'relative' }}>
          {/* Title bar */}
          <div className="pixel-window-titlebar -mx-6 -mt-6 mb-0" style={{ borderBottom: '3px solid #1a1a2e' }}>
            <div className="pixel-dot pixel-dot-red" />
            <div className="pixel-dot pixel-dot-yellow" />
            <div className="pixel-dot pixel-dot-green" />
            <span style={{
              fontSize: '9px',
              fontFamily: 'var(--font-pixel)',
              color: '#1a1a2e',
              opacity: 0.6,
              marginLeft: 8,
            }}>
              watchparty.exe
            </span>
          </div>

          {!session ? (
            <div className="space-y-4 pt-2">
              <div className="text-center space-y-1">
                <h2
                  className="text-lg font-bold"
                  style={{ fontFamily: 'var(--font-pixel)', color: '#1a1a2e', fontSize: '0.85rem' }}
                >
                  Get Started
                </h2>
                <p className="text-sm" style={{ color: '#1a1a2e', opacity: 0.55, fontFamily: 'var(--font-mono)' }}>
                  Sign in to create or join a room
                </p>
              </div>
              <button
                id="login-btn"
                onClick={() => router.push('/login')}
                className="btn-primary w-full py-3"
              >
                ⚡ Sign In / Register
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* User info */}
              <div
                className="flex items-center gap-3 p-3"
                style={{
                  background: '#f9f9f9',
                  border: '2px solid #1a1a2e',
                }}
              >
                <div className="w-9 h-9 avatar text-sm">
                  {session.user.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#1a1a2e', fontFamily: 'var(--font-mono)' }}>
                    {session.user.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: '#1a1a2e', opacity: 0.5, fontFamily: 'var(--font-mono)' }}>
                    {session.user.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 flex-shrink-0" style={{ background: '#28C840', border: '1.5px solid #1a1a2e', animation: 'pulseGlow 2.2s ease-in-out infinite' }} />
                  <button
                    id="logout-btn"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    title="Sign Out"
                    className="w-8 h-8 flex items-center justify-center transition-all duration-100 flex-shrink-0"
                    style={{
                      background: '#fff',
                      border: '2px solid #FF5F57',
                      color: '#FF5F57',
                      boxShadow: '2px 2px 0px #1a1a2e',
                      fontFamily: 'var(--font-mono)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translate(1px, 1px)';
                      e.currentTarget.style.boxShadow = '1px 1px 0px #1a1a2e';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translate(0, 0)';
                      e.currentTarget.style.boxShadow = '2px 2px 0px #1a1a2e';
                    }}
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
                    Creating...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    ⭐ Create New Room
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1" style={{ height: 2, background: '#1a1a2e', opacity: 0.15 }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#1a1a2e', opacity: 0.4, fontFamily: 'var(--font-mono)' }}>
                  or join
                </span>
                <div className="flex-1" style={{ height: 2, background: '#1a1a2e', opacity: 0.15 }} />
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
                  → Join
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-center tracking-wide" style={{ color: '#1a1a2e', opacity: 0.25, fontFamily: 'var(--font-mono)' }}>
          by wleed
        </p>
      </div>
    </main>
  )
}