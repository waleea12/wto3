'use client'
import { useState, useEffect, useRef } from 'react'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  thumbnailLink?: string
  duration?: string
  modifiedTime: string
  size?: string
}

interface DriveBrowserProps {
  accessToken: string
  onSelect: (fileId: string, fileName: string) => void
  onClose: () => void
}

const VIDEO_MIMES = [
  'video/mp4',
  'video/x-matroska',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/mpeg',
  'video/3gpp',
].join(',')

function formatSize(bytes?: string) {
  if (!bytes) return ''
  const n = parseInt(bytes)
  if (n > 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} GB`
  if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`
  return `${(n / 1_000).toFixed(0)} KB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DriveBrowser({ accessToken, onSelect, onClose }: DriveBrowserProps) {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [pageToken, setPageToken] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [selected, setSelected] = useState<DriveFile | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchFiles()
    inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchFiles(nextPageToken?: string, query = search) {
    setLoading(true)
    setError('')
    try {
      const q = encodeURIComponent(
        `mimeType contains 'video/' and trashed = false${query ? ` and name contains '${query.replace(/'/g, "\\'")}'` : ''}`
      )
      const fields = encodeURIComponent(
        'nextPageToken,files(id,name,mimeType,thumbnailLink,modifiedTime,size)'
      )
      let url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime desc&pageSize=30`
      if (nextPageToken) url += `&pageToken=${nextPageToken}`

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Failed to fetch Drive files')
      }

      const data = await res.json()
      setFiles((prev) => nextPageToken ? [...prev, ...(data.files ?? [])] : (data.files ?? []))
      setPageToken(data.nextPageToken ?? null)
      setHasMore(!!data.nextPageToken)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load Drive files')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setFiles([])
    setPageToken(null)
    fetchFiles(undefined, search)
  }

  function handleConfirm() {
    if (!selected) return
    onSelect(selected.id, selected.name)
    onClose()
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal */}
      <div
        className="w-full max-w-xl rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'hsl(224 71% 6%)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#1a73e8,#0d47a1)' }}>
            {/* Drive icon */}
            <svg width="16" height="16" viewBox="0 0 87.3 78" fill="none">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0a15.4 15.4 0 0 0 2.1 7.85l4.5-6z" fill="#0066da" transform="scale(0.8)"/>
              <path d="M43.65 25L29.9 1.2a15.4 15.4 0 0 0-3.3 3.3L2.1 45.5A15.35 15.35 0 0 0 0 53.0h27.5L43.65 25z" fill="#00ac47" transform="scale(0.8)"/>
              <path d="M73.55 76.8a15.4 15.4 0 0 0 3.3-3.3l1.6-2.75 7.65-13.25a15.35 15.35 0 0 0 2.1-7.85H60.7l5.85 11.5 7 15.65z" fill="#ea4335" transform="scale(0.8)"/>
              <path d="M43.65 25L57.4 1.2C56.05.45 54.5 0 52.85 0H34.45c-1.65 0-3.2.45-4.55 1.2L43.65 25z" fill="#00832d" transform="scale(0.8)"/>
              <path d="M60.7 53H27.5L13.75 76.8c1.35.75 2.9 1.2 4.55 1.2h50.7c1.65 0 3.2-.45 4.55-1.2L60.7 53z" fill="#2684fc" transform="scale(0.8)"/>
              <path d="M73.4 26.5L59.65 3.3a15.4 15.4 0 0 0-2.25-2.1L43.65 25 60.7 53h27.45a15.35 15.35 0 0 0-2.1-7.85L73.4 26.5z" fill="#ffba00" transform="scale(0.8)"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-sm">Google Drive</h2>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>Select a video to play</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.40)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search videos in Drive..."
                className="input-field pl-9 py-2 text-sm"
              />
            </div>
            <button type="submit" className="btn-secondary px-3 py-2 text-sm flex-shrink-0">Search</button>
          </form>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading && files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="rgba(139,92,246,0.5)" strokeWidth="3"/>
                <path className="opacity-75" fill="#7c3aed" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>Loading your Drive videos...</p>
            </div>
          )}

          {error && (
            <div className="m-4 p-4 rounded-xl text-sm text-red-300"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {search ? 'No videos found for your search' : 'No videos found in your Drive'}
              </p>
            </div>
          )}

          <div className="p-2 space-y-1">
            {files.map((file) => {
              const isSelected = selected?.id === file.id
              return (
                <button
                  key={file.id}
                  onClick={() => setSelected(file)}
                  onDoubleClick={() => { setSelected(file); setTimeout(handleConfirm, 50) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left"
                  style={{
                    background: isSelected ? 'rgba(124,58,237,0.20)' : 'transparent',
                    border: isSelected ? '1px solid rgba(124,58,237,0.40)' : '1px solid transparent',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Thumbnail or icon */}
                  <div className="w-12 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {file.thumbnailLink ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.thumbnailLink} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: isSelected ? '#c4b5fd' : 'rgba(255,255,255,0.85)' }}>
                      {file.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {formatDate(file.modifiedTime)}{file.size ? ` · ${formatSize(file.size)}` : ''}
                    </p>
                  </div>

                  {/* Selected check */}
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" className="flex-shrink-0">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              )
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="px-4 pb-3">
              <button
                onClick={() => fetchFiles(pageToken ?? undefined)}
                disabled={loading}
                className="w-full py-2 text-sm rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {loading ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {selected ? (
            <p className="text-xs flex-1 truncate" style={{ color: 'rgba(255,255,255,0.50)' }}>
              Selected: <span style={{ color: 'rgba(196,181,253,0.90)' }}>{selected.name}</span>
            </p>
          ) : (
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>Double-click to play instantly</p>
          )}
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onClose} className="btn-ghost text-sm px-4 py-2">Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={!selected}
              className="btn-primary px-4 py-2 text-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Play Video
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
