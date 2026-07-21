'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

// ── Colour tokens (same palette as room page) ────────────────────────────────
const C = {
  gold:       'rgba(210,170,80,0.88)',
  goldFaint:  'rgba(200,165,70,0.12)',
  goldBorder: 'rgba(200,160,60,0.20)',
  text90:     'rgba(225,210,175,0.92)',
  text70:     'rgba(210,195,160,0.70)',
  text50:     'rgba(200,185,150,0.50)',
  text30:     'rgba(200,180,135,0.30)',
  text20:     'rgba(200,180,135,0.20)',
  bgPanel:    'rgba(6,8,18,0.98)',
  border:     'rgba(200,170,100,0.10)',
  borderSub:  'rgba(200,170,100,0.07)',
}

const IMG_BASE = 'https://image.tmdb.org/t/p'

interface TMDBMovie {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  release_date?: string
  first_air_date?: string
  overview: string
  media_type?: string
  genre_ids?: number[]
  original_language?: string
}

interface MovieLibraryProps {
  isHost: boolean
  onPlay: (tmdbId: number, title: string, type: 'movie' | 'tv') => void
  onClose: () => void
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(200,170,100,0.06)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        aspectRatio: '2/3',
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }} />
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{ height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.06)', marginBottom: 6 }} />
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.04)', width: '60%' }} />
      </div>
    </div>
  )
}

// ── Star Rating ───────────────────────────────────────────────────────────────
function StarRating({ score }: { score: number }) {
  const pct = Math.round(score * 10)
  const color = score >= 7 ? '#4ade80' : score >= 5 ? C.gold : 'rgba(220,100,100,0.85)'
  return (
    <span style={{ color, fontWeight: 700, fontSize: 11, letterSpacing: '0.02em' }}>
      ★ {score.toFixed(1)}
    </span>
  )
}

// ── Movie Card ────────────────────────────────────────────────────────────────
function MovieCard({
  movie,
  type,
  onClick,
  isHost,
  onPlay,
}: {
  movie: TMDBMovie
  type: 'movie' | 'tv'
  onClick: () => void
  isHost: boolean
  onPlay: (e: React.MouseEvent) => void
}) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgErr, setImgErr]     = useState(false)
  const title = movie.title ?? movie.name ?? 'بدون عنوان'
  const year  = (movie.release_date ?? movie.first_air_date ?? '').slice(0, 4)
  const posterUrl = movie.poster_path && !imgErr
    ? `${IMG_BASE}/w342${movie.poster_path}`
    : null

  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(200,170,100,0.08)',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
      className="movie-card-hover"
    >
      {/* Poster */}
      <div style={{ aspectRatio: '2/3', position: 'relative', background: 'rgba(0,0,0,0.4)' }}>
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={title}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgErr(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,100,0.15)" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
        {/* Rating badge */}
        {movie.vote_average > 0 && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(200,170,100,0.18)',
            borderRadius: 4,
            padding: '2px 5px',
          }}>
            <StarRating score={movie.vote_average} />
          </div>
        )}
        {/* Type badge */}
        <div style={{
          position: 'absolute', top: 6, left: 6,
          background: type === 'tv' ? 'rgba(99,102,241,0.70)' : 'rgba(200,160,60,0.55)',
          backdropFilter: 'blur(4px)',
          borderRadius: 3,
          padding: '1px 5px',
          fontSize: 9,
          fontWeight: 700,
          color: 'white',
          letterSpacing: '0.06em',
        }}>
          {type === 'tv' ? 'مسلسل' : 'فيلم'}
        </div>
        {/* Hover overlay */}
        <div className="movie-card-overlay" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 8px 10px',
          opacity: 0,
          transition: 'opacity 0.2s ease',
        }}>
          {isHost && (
            <button
              onClick={onPlay}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, hsl(38 68% 44%), hsl(38 72% 54%))',
                color: 'hsl(220 22% 8%)',
                border: 'none',
                borderRadius: 5,
                padding: '7px 0',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              تشغيل للجميع
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '8px 10px 10px' }}>
        <p style={{
          fontSize: 11, fontWeight: 600, color: C.text90,
          margin: 0, lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{title}</p>
        <p style={{ fontSize: 10, color: C.text30, margin: '3px 0 0', letterSpacing: '0.03em' }}>{year}</p>
      </div>
    </div>
  )
}

// ── Movie Detail Panel ────────────────────────────────────────────────────────
function MovieDetailPanel({
  movie,
  type,
  isHost,
  onPlay,
  onClose,
}: {
  movie: TMDBMovie
  type: 'movie' | 'tv'
  isHost: boolean
  onPlay: () => void
  onClose: () => void
}) {
  const title = movie.title ?? movie.name ?? 'بدون عنوان'
  const year = (movie.release_date ?? movie.first_air_date ?? '').slice(0, 4)
  const backdropUrl = movie.backdrop_path
    ? `${IMG_BASE}/w780${movie.backdrop_path}`
    : null
  const posterUrl = movie.poster_path
    ? `${IMG_BASE}/w342${movie.poster_path}`
    : null

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: C.bgPanel,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease-out',
      }}
    >
      {/* Backdrop */}
      <div style={{ position: 'relative', height: 180, flexShrink: 0, overflow: 'hidden', background: '#000' }}>
        {backdropUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdropUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }} />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(6,8,18,0.95) 100%)',
        }} />
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 30, height: 30, borderRadius: 6,
            background: 'rgba(0,0,0,0.60)', border: '1px solid rgba(255,255,255,0.10)',
            color: C.text70, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        {/* Poster + title overlay */}
        <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ width: 58, height: 87, borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(200,170,100,0.20)' }}>
            {posterUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={posterUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)' }} />
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text90, margin: 0, lineHeight: 1.3 }}>{title}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              {year && <span style={{ fontSize: 11, color: C.text50 }}>{year}</span>}
              {movie.vote_average > 0 && <StarRating score={movie.vote_average} />}
              <span style={{
                fontSize: 9, fontWeight: 700, color: 'white', letterSpacing: '0.06em',
                background: type === 'tv' ? 'rgba(99,102,241,0.70)' : 'rgba(200,160,60,0.55)',
                borderRadius: 3, padding: '1px 5px',
              }}>{type === 'tv' ? 'مسلسل' : 'فيلم'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Overview */}
        {movie.overview && (
          <div>
            <h4 style={{ fontSize: 10, fontWeight: 700, color: C.text30, textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 6px' }}>القصة</h4>
            <p style={{ fontSize: 12, color: C.text70, lineHeight: 1.7, margin: 0 }}>{movie.overview}</p>
          </div>
        )}

        {/* Language */}
        {movie.original_language && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,170,100,0.08)', fontSize: 11, color: C.text50 }}>
              🌍 {movie.original_language.toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Play button */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid ' + C.borderSub, flexShrink: 0 }}>
        {isHost ? (
          <button
            onClick={onPlay}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, hsl(38 68% 44%), hsl(38 72% 54%))',
              color: 'hsl(220 22% 8%)',
              border: 'none', borderRadius: 6,
              padding: '11px 0', fontSize: 13,
              fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            ▶ تشغيل للجميع الآن
          </button>
        ) : (
          <div style={{ textAlign: 'center', fontSize: 12, color: C.text30, padding: '8px 0' }}>
            فقط الـ Host يمكنه تشغيل الأفلام
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Movie Library Component ──────────────────────────────────────────────
export default function MovieLibrary({ isHost, onPlay, onClose }: MovieLibraryProps) {
  const [query, setQuery]           = useState('')
  const [debouncedQuery, setDebounced] = useState('')
  const [results, setResults]       = useState<TMDBMovie[]>([])
  const [trending, setTrending]     = useState<TMDBMovie[]>([])
  const [loading, setLoading]       = useState(false)
  const [mediaType, setMediaType]   = useState<'movie' | 'tv'>('movie')
  const [selectedMovie, setSelected]= useState<TMDBMovie | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on open
  useEffect(() => { inputRef.current?.focus() }, [])

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350)
    return () => clearTimeout(t)
  }, [query])

  // Fetch trending on mount / type change
  useEffect(() => {
    fetch(`/api/movies/search?type=${mediaType}`)
      .then(r => r.json())
      .then(d => setTrending(d.results ?? []))
      .catch(() => {})
  }, [mediaType])

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return }
    setLoading(true)
    fetch(`/api/movies/search?q=${encodeURIComponent(debouncedQuery)}&type=${mediaType}`)
      .then(r => r.json())
      .then(d => setResults(d.results ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debouncedQuery, mediaType])

  const handlePlay = useCallback((movie: TMDBMovie) => {
    const title = movie.title ?? movie.name ?? 'فيلم'
    onPlay(movie.id, title, mediaType)
    onClose()
  }, [onPlay, onClose, mediaType])

  const displayList = debouncedQuery.trim() ? results : trending

  return (
    <>
      {/* Inject card hover styles + keyframes */}
      <style>{`
        .movie-card-hover:hover {
          transform: translateY(-3px);
          border-color: rgba(200,170,100,0.20) !important;
          box-shadow: 0 8px 28px rgba(0,0,0,0.45);
        }
        .movie-card-hover:hover .movie-card-overlay {
          opacity: 1 !important;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        {/* Modal */}
        <div style={{
          width: '100%', maxWidth: 760,
          maxHeight: '90dvh',
          display: 'flex', flexDirection: 'column',
          background: C.bgPanel,
          border: '1px solid rgba(200,170,100,0.13)',
          borderRadius: 10,
          boxShadow: '0 40px 100px rgba(0,0,0,0.80)',
          animation: 'fadeInModal 0.25s ease-out',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Gold top line */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(200,160,60,0.55), transparent)', flexShrink: 0 }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid ' + C.borderSub, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Popcorn icon */}
              <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(200,160,60,0.10)', border: '1px solid rgba(200,160,60,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                🍿
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text90 }}>مكتبة الأفلام</p>
                <p style={{ margin: 0, fontSize: 10, color: C.text30 }}>مدعوم من TMDB • بدون إعلانات</p>
              </div>
            </div>
            {/* Type toggle + close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(['movie', 'tv'] as const).map(t => (
                <button key={t} onClick={() => { setMediaType(t); setQuery(''); setResults([]) }}
                  style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                    background: mediaType === t ? C.goldFaint : 'transparent',
                    color: mediaType === t ? C.gold : C.text30,
                    borderColor: mediaType === t ? C.goldBorder : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >{t === 'movie' ? '🎬 أفلام' : '📺 مسلسلات'}</button>
              ))}
              <button onClick={onClose}
                style={{ width: 28, height: 28, borderRadius: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', color: C.text50, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ padding: '12px 18px 0', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.35 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`ابحث عن ${mediaType === 'movie' ? 'فيلم' : 'مسلسل'}...`}
                className="input-field"
                style={{ paddingLeft: 36, paddingRight: query ? 36 : 14, width: '100%' }}
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults([]) }}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.text30, cursor: 'pointer', padding: 2 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
            {/* Section label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10 }}>
              <div style={{ flex: 1, height: 1, background: C.borderSub }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: C.text20, letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0 }}>
                {loading ? '⏳ جاري البحث...' : debouncedQuery.trim() ? `نتائج "${debouncedQuery}"` : `🔥 الأكثر رواجاً هذا الأسبوع`}
              </span>
              <div style={{ flex: 1, height: 1, background: C.borderSub }} />
            </div>
          </div>

          {/* Grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 18px', position: 'relative' }}>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : displayList.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                {displayList.map(movie => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    type={mediaType}
                    isHost={isHost}
                    onClick={() => setSelected(movie)}
                    onPlay={e => { e.stopPropagation(); handlePlay(movie) }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 8, background: 'rgba(200,160,60,0.06)', border: '1px solid rgba(200,160,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  🎬
                </div>
                <p style={{ fontSize: 13, color: C.text30, margin: 0 }}>
                  {debouncedQuery ? 'لا توجد نتائج لهذا البحث' : 'جاري تحميل الأفلام...'}
                </p>
              </div>
            )}

            {/* Movie detail panel */}
            {selectedMovie && (
              <MovieDetailPanel
                movie={selectedMovie}
                type={mediaType}
                isHost={isHost}
                onPlay={() => handlePlay(selectedMovie)}
                onClose={() => setSelected(null)}
              />
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '8px 18px', borderTop: '1px solid ' + C.borderSub, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 9, color: C.text20 }}>
              {!isHost && 'فقط الـ Host يمكنه تشغيل الأفلام'}
              {isHost && 'اضغط على أي فيلم للتفاصيل أو اضغط ▶ للتشغيل المباشر'}
            </p>
            <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 9, color: C.text20, textDecoration: 'none', letterSpacing: '0.05em' }}>
              🎞 TMDB
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
