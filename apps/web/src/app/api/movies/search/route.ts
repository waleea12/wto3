import { NextRequest, NextResponse } from 'next/server'

const TMDB_BASE = 'https://api.themoviedb.org/3'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = process.env.TMDB_READ_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'TMDB is not configured' }, { status: 503 })
  const q = (searchParams.get('q') ?? '').trim().slice(0, 100)
  const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie'
  const page = Math.min(20, Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1))

  try {
    let url: string
    if (q.trim()) {
      url = `${TMDB_BASE}/search/${type}?query=${encodeURIComponent(q)}&page=${page}&language=ar-SA&include_adult=false`
    } else {
      url = `${TMDB_BASE}/trending/${type}/week?page=${page}&language=ar-SA`
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      next: { revalidate: 60 },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'TMDB error' }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
