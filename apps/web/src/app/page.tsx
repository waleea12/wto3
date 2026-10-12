'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { ArrowLeft, ArrowUpLeft, Film, History, Link2, LogOut, MessageCircle, Play, Plus, Radio, Users } from 'lucide-react'

const FEATURES = [
  { icon: Film, title: 'كل ما تحب تتابعه', text: 'أفلام ومسلسلات ومقاطع يوتيوب في مكان واحد.' },
  { icon: Users, title: 'غرفة تجمعكم', text: 'شارك رابط الغرفة مع أصحابك وابدأوا التشغيل.' },
  { icon: MessageCircle, title: 'تعليق لحظة بلحظة', text: 'شات مباشر يبقى قريب منك طول السهرة.' },
]

export default function HomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastRoomSlug, setLastRoomSlug] = useState('')

  useEffect(() => {
    setLastRoomSlug(session?.user.id ? window.localStorage.getItem(`wto3:lastRoom:${session.user.id}`) ?? '' : '')
  }, [session?.user.id])

  async function createRoom() {
    if (!session) { router.push('/login'); return }
    setLoading(true)
    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/rooms`, {}, {
        headers: { Authorization: `Bearer ${session.user.serverToken}` },
      })
      router.push(`/room/${data.slug}`)
    } catch (err: any) {
      console.error(err)
      alert(err.response?.data?.error || 'تعذر إنشاء الغرفة. حاول مرة ثانية.')
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
    <main className="site-page" dir="rtl">
      <div className="site-ambient site-ambient-one" aria-hidden="true" />
      <div className="site-ambient site-ambient-two" aria-hidden="true" />
      <div className="site-shell">
        <header className="site-nav">
          <div className="site-brand">
            <span className="site-brand-icon"><Play size={18} fill="currentColor" strokeWidth={1.5} /></span>
            <span>WTO3<span className="site-brand-dot">.</span></span>
          </div>
          <div className="site-nav-actions">
            {session ? <>
              <span className="nav-user"><span className="nav-user-avatar">{session.user.name?.[0]?.toUpperCase()}</span><span className="nav-user-name">{session.user.name}</span></span>
              <button id="logout-btn" className="nav-icon-button" onClick={() => signOut({ callbackUrl: '/login' })} title="تسجيل الخروج" aria-label="تسجيل الخروج"><LogOut size={17} /></button>
            </> : <button className="nav-login" onClick={() => router.push('/login')}>دخول <ArrowUpLeft size={16} /></button>}
          </div>
        </header>

        <section className="home-hero">
          <div className="hero-copy">
            <div className="hero-eyebrow"><span className="eyebrow-line" /> مكانكم، فيلمكم، وسهرتكم</div>
            <h1>غرف الأفلام<br /><span>والمسلسلات.</span></h1>
            <p className="hero-description">افتح غرفة، اختر اللي تبي تتابعه، وخل أصحابك يدخلون معك. تشغيل متزامن وشات مباشر يخلي كل لحظة مشتركة.</p>
            {session ? <div className="hero-actions">
              <button id="create-room-btn" className="action-primary" onClick={createRoom} disabled={loading}><Plus size={19} strokeWidth={2.4} /> {loading ? 'جاري إنشاء الغرفة...' : 'أنشئ غرفة جديدة'} <ArrowLeft size={19} className="action-arrow" /></button>
              <form className="join-form" onSubmit={joinRoom}>
                <label htmlFor="room-code-input">عندك رمز غرفة؟</label>
                <div className="join-form-row"><input id="room-code-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="اكتب رمز الغرفة" autoComplete="off" dir="ltr" /><button id="join-room-btn" type="submit" disabled={!slug.trim()} aria-label="انضم للغرفة"><ArrowLeft size={20} /></button></div>
              </form>
            </div> : <div className="hero-actions"><button id="login-btn" className="action-primary" onClick={() => router.push('/login')}>ابدأ المشاهدة <ArrowLeft size={19} className="action-arrow" /></button><span className="hero-action-note">جهّز السهرة في أقل من دقيقة</span></div>}
            {session && lastRoomSlug && <button className="resume-room" onClick={() => router.push(`/room/${encodeURIComponent(lastRoomSlug)}`)}><History size={16} /> العودة إلى غرفتك <span dir="ltr">{lastRoomSlug}</span><ArrowLeft size={15} /></button>}
            <div className="hero-benefits"><span><Radio size={15} /> تشغيل متزامن</span><span><MessageCircle size={15} /> دردشة مباشرة</span><span><Link2 size={15} /> مشاركة سهلة</span></div>
          </div>

          <div className="hero-visual" aria-label="معاينة لغرفة المشاهدة">
            <div className="visual-halo" />
            <div className="preview-card">
              <div className="preview-header"><div className="preview-brand"><span className="preview-brand-icon"><Play size={11} fill="currentColor" /></span> WTO3 <span className="preview-room-name">/ ليلة الفيلم</span></div><span className="preview-live"><span /> LIVE</span></div>
              <div className="preview-screen"><div className="preview-sun" /><div className="preview-landscape preview-landscape-back" /><div className="preview-landscape preview-landscape-front" /><div className="preview-play"><Play size={25} fill="currentColor" /></div><span className="preview-screen-label">المشاهدة بدأت الآن</span></div>
              <div className="preview-timeline"><span /><div><i /></div><time>01:24 / 02:08</time></div>
              <div className="preview-footer"><span><Users size={15} /> 4 يشاهدون الآن</span><span><MessageCircle size={15} /> الشات مباشر</span></div>
            </div>
            <div className="preview-chat"><span className="preview-chat-avatar">ن</span><div><strong>نورة</strong><p>هذا المشهد رهيب 🔥</p></div><span className="preview-chat-time">الآن</span></div>
          </div>
        </section>

        <section className="features-section" aria-label="مميزات الموقع">
          <div className="section-heading"><span>كل شيء لسهرة أفضل</span><p>من أول تشغيل إلى آخر رسالة.</p></div>
          <div className="feature-grid">{FEATURES.map(({ icon: Icon, title, text }, index) => <div className="feature-card" key={title}><span className="feature-index">0{index + 1}</span><div className="feature-icon"><Icon size={22} strokeWidth={1.8} /></div><h2>{title}</h2><p>{text}</p></div>)}</div>
        </section>
        <footer className="site-footer"><span>WTO3 © {new Date().getFullYear()}</span><span>by wleed</span></footer>
      </div>
    </main>
  )
}
