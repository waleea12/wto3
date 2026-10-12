'use client'

import { getProviders, signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Clapperboard, LockKeyhole, Play, Users } from 'lucide-react'

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000'

export default function LoginPage() {
  const router = useRouter()
  const { status } = useSession()
  const [isRegistering, setIsRegistering] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleAvailable, setGoogleAvailable] = useState(false)

  useEffect(() => {
    getProviders().then((providers) => setGoogleAvailable(Boolean(providers?.google))).catch(() => setGoogleAvailable(false))
  }, [])

  useEffect(() => {
    if (status === 'authenticated') router.replace('/')
  }, [router, status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegistering) {
        const res = await fetch(`${SERVER_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        })
        const data = await res.json()
        if (!res.ok) {
          const errMsg = data.error || data.message || 'تعذر إنشاء الحساب'
          if (errMsg === 'Email already in use') throw new Error('هذا البريد مسجل مسبقاً، سجّل دخولك أو استخدم بريدًا آخر.')
          throw new Error(errMsg)
        }
      }
      const result = await signIn('credentials', { redirect: false, email, password })
      if (!result?.ok || result.error) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.')
      window.location.href = '/'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status !== 'unauthenticated') {
    return <main className="site-page auth-loading" dir="rtl"><span className="auth-loading-ring" /><p>جاري التحقق من تسجيل الدخول...</p></main>
  }

  return (
    <main className="site-page auth-page" dir="rtl">
      <div className="site-ambient site-ambient-one" aria-hidden="true" />
      <div className="auth-shell">
        <button className="auth-back" onClick={() => router.push('/')}><ArrowRight size={17} /> العودة للرئيسية</button>
        <div className="auth-layout">
          <div className="auth-story">
            <div className="auth-story-top"><span className="site-brand-icon"><Play size={18} fill="currentColor" /></span><strong>WTO3<span className="site-brand-dot">.</span></strong></div>
            <div className="auth-story-art"><div className="auth-story-orbit orbit-one" /><div className="auth-story-orbit orbit-two" /><div className="auth-story-disc"><Clapperboard size={50} strokeWidth={1.2} /></div><div className="auth-story-spark spark-one" /><div className="auth-story-spark spark-two" /></div>
            <div className="auth-story-copy"><span>سهرتكم تبدأ هنا</span><h1>جهزوا الفيلم،<br />واجتمعوا من أي مكان.</h1><p>غرفة خاصة لكم، مشاهدة متزامنة، وتعليقات ما تنتهي.</p><div className="auth-story-points"><span><Check size={15} /> مشاهدة مع الأصحاب</span><span><Check size={15} /> شات مباشر</span></div></div>
          </div>

          <div className="auth-form-side">
            <div className="auth-form-header"><div className="auth-mobile-brand"><span className="site-brand-icon"><Play size={17} fill="currentColor" /></span> WTO3<span className="site-brand-dot">.</span></div><span className="auth-kicker">{isRegistering ? 'حساب جديد' : 'أهلًا برجعتك'}</span><h2>{isRegistering ? 'انضم للسهرة.' : 'السهرة تنتظرك.'}</h2><p>{isRegistering ? 'أنشئ حسابك وابدأ غرفة المشاهدة خلال لحظات.' : 'سجّل دخولك وكمّل المشاهدة مع أصحابك.'}</p></div>
            <div className="auth-tabs"><button type="button" className={!isRegistering ? 'active' : ''} onClick={() => { setIsRegistering(false); setError('') }}>تسجيل الدخول</button><button type="button" className={isRegistering ? 'active' : ''} onClick={() => { setIsRegistering(true); setError('') }}>حساب جديد</button></div>
            <form onSubmit={handleSubmit} autoComplete="on" className="auth-form">
              {error && <div className="auth-error" role="alert">{error}</div>}
              {isRegistering && <label>الاسم المعروض<input type="text" name="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك في الغرفة" className="input-field" /></label>}
              <label>البريد الإلكتروني<input type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input-field" dir="ltr" /></label>
              <label>كلمة المرور<input type="password" name="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} required minLength={isRegistering ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field" dir="ltr" /></label>
              <button type="submit" disabled={loading} className="action-primary auth-submit">{loading ? 'لحظة واحدة...' : isRegistering ? 'إنشاء حساب' : 'تسجيل الدخول'}<ArrowLeft size={18} /></button>
            </form>
            {googleAvailable && <><div className="auth-divider"><span>أو أكمل باستخدام</span></div><button className="auth-google" onClick={() => signIn('google', { callbackUrl: '/' })}><span className="google-mark">G</span> حساب Google</button></>}
            <p className="auth-note"><LockKeyhole size={14} /> دخولك يبقى محفوظًا على هذا المتصفح</p>
          </div>
        </div>
        <div className="auth-bottom"><span>WTO3 © {new Date().getFullYear()}</span><span><Users size={14} /> سهرة تجمعكم</span></div>
      </div>
    </main>
  )
}
