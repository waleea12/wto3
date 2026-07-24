'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000'

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegistering) {
        // Register the user first
        const res = await fetch(`${SERVER_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        })
        const data = await res.json()
        if (!res.ok) {
          const errMsg = data.error || data.message || 'Registration failed'
          if (errMsg === 'Email already in use') {
            throw new Error('هذا البريد مسجل مسبقاً، يرجى تسجيل الدخول المباشر أو استخدام جوجل.')
          }
          throw new Error(errMsg)
        }
      }

      // Login using next-auth credentials
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })

      if (result?.error) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.')
      }

      // Navigate on success
      window.location.href = '/'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations — subtle clouds */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[8%] left-[10%] animate-pixel-float" style={{ animationDelay: '0s', opacity: 0.5 }}>
          <div className="w-16 h-7 bg-white border-2 border-[#1a1a2e]" style={{ boxShadow: '3px 3px 0 #1a1a2e' }}>
            <div className="w-8 h-4 bg-white border-2 border-[#1a1a2e] absolute -top-2 left-2" />
          </div>
        </div>
        <div className="absolute top-[20%] right-[12%] animate-pixel-float" style={{ animationDelay: '1.5s', opacity: 0.5 }}>
          <div className="w-14 h-6 bg-white border-2 border-[#1a1a2e]" style={{ boxShadow: '3px 3px 0 #1a1a2e' }}>
            <div className="w-7 h-4 bg-white border-2 border-[#1a1a2e] absolute -top-2 left-1" />
          </div>
        </div>
      </div>

      {/* Window container */}
      <div className="pixel-window relative z-10 w-full max-w-md" style={{ overflow: 'hidden' }}>
        {/* Title bar */}
        <div className="pixel-window-titlebar" style={{ borderBottom: '3px solid #1a1a2e' }}>
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
            {isRegistering ? 'register.exe' : 'login.exe'}
          </span>
        </div>

        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div
              className="w-14 h-14 flex items-center justify-center mx-auto"
              style={{
                background: '#FFC940',
                border: '3px solid #1a1a2e',
                boxShadow: '4px 4px 0px #1a1a2e',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1a1a2e">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </div>
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-pixel)', color: '#1a1a2e', fontSize: '1rem' }}
              >
                Watch Party
              </h1>
              <p className="mt-1 text-sm" style={{ color: '#1a1a2e', opacity: 0.55, fontFamily: 'var(--font-mono)' }}>
                {isRegistering ? 'Create an account to join the party' : 'Sign in to join the party'}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="p-3 text-sm"
                style={{
                  background: '#FFF5F5',
                  border: '2px solid #FF5F57',
                  color: '#CC0000',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {error}
              </div>
            )}

            {isRegistering && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: '#1a1a2e', opacity: 0.6, fontFamily: 'var(--font-mono)' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: '#1a1a2e', opacity: 0.6, fontFamily: 'var(--font-mono)' }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: '#1a1a2e', opacity: 0.6, fontFamily: 'var(--font-mono)' }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2"
            >
              {loading ? 'Please wait...' : (isRegistering ? '⭐ Create Account' : '⚡ Sign In')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1" style={{ height: 2, background: '#1a1a2e', opacity: 0.12 }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#1a1a2e', opacity: 0.35, fontFamily: 'var(--font-mono)' }}>
              or continue with
            </span>
            <div className="flex-1" style={{ height: 2, background: '#1a1a2e', opacity: 0.12 }} />
          </div>

          {/* Google sign-in */}
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-3 px-5 py-2.5 font-bold text-sm transition-all duration-100"
            style={{
              background: '#fff',
              color: '#1a1a2e',
              border: '2px solid #1a1a2e',
              boxShadow: '3px 3px 0px #1a1a2e',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(1px, 1px)';
              e.currentTarget.style.boxShadow = '1px 1px 0px #1a1a2e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = '3px 3px 0px #1a1a2e';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>

          {/* Toggle register / login */}
          <p className="text-center text-sm" style={{ color: '#1a1a2e', opacity: 0.5, fontFamily: 'var(--font-mono)' }}>
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsRegistering(!isRegistering); setError('') }}
              className="font-bold transition-all duration-100 underline"
              style={{ color: '#1a1a2e' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#FFC940' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#1a1a2e' }}
            >
              {isRegistering ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}