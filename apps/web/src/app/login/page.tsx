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
      {/* Background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,160,60,0.15), transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(180,140,50,0.04) 0%, transparent 70%)' }} />
      </div>

      <div
        className="relative z-10 w-full max-w-md"
        style={{
          background: 'rgba(11, 14, 25, 0.90)',
          border: '1px solid rgba(200,170,100,0.13)',
          borderRadius: '6px',
          boxShadow: '0 24px 70px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.03)',
          overflow: 'hidden',
        }}
      >
        {/* Top gold accent bar */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent 0%, rgba(200,160,60,0.55) 40%, rgba(200,160,60,0.55) 60%, transparent 100%)' }} />

        <div className="p-8 space-y-7">
          {/* Header */}
          <div className="text-center space-y-3">
            <div
              className="w-12 h-12 flex items-center justify-center rounded-full mx-auto"
              style={{
                background: 'rgba(10,12,22,0.95)',
                border: '1px solid rgba(200,160,60,0.30)',
                boxShadow: '0 0 0 5px rgba(200,155,50,0.05)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <polygon points="5 3 19 12 5 21 5 3" fill="rgba(210,170,80,0.85)" />
              </svg>
            </div>
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-playfair)', color: 'rgba(225,210,175,0.95)' }}
              >
                Watch Party
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'rgba(200,185,150,0.42)' }}>
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
                  background: 'rgba(200,60,60,0.08)',
                  border: '1px solid rgba(200,60,60,0.25)',
                  borderRadius: '4px',
                  color: 'rgba(230,160,155,0.90)',
                }}
              >
                {error}
              </div>
            )}

            {isRegistering && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-wide uppercase" style={{ color: 'rgba(200,180,130,0.55)', letterSpacing: '0.07em' }}>
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
              <label className="block text-xs font-semibold tracking-wide uppercase" style={{ color: 'rgba(200,180,130,0.55)', letterSpacing: '0.07em' }}>
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
              <label className="block text-xs font-semibold tracking-wide uppercase" style={{ color: 'rgba(200,180,130,0.55)', letterSpacing: '0.07em' }}>
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
              className="btn-primary w-full py-3 mt-1"
            >
              {loading ? 'Please wait...' : (isRegistering ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(200,165,70,0.10)' }} />
            <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: 'rgba(200,175,120,0.30)' }}>
              or continue with
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(200,165,70,0.10)' }} />
          </div>

          {/* Google sign-in */}
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-3 px-5 py-2.5 font-medium text-sm transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.97)',
              color: '#1a1a2e',
              borderRadius: '4px',
              border: '1px solid rgba(0,0,0,0.08)',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f1f1' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.97)' }}
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
          <p className="text-center text-sm" style={{ color: 'rgba(200,185,150,0.42)' }}>
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsRegistering(!isRegistering); setError('') }}
              className="font-semibold transition-colors duration-200"
              style={{ color: 'rgba(210,170,80,0.85)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(220,185,100,1)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(210,170,80,0.85)' }}
            >
              {isRegistering ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}
