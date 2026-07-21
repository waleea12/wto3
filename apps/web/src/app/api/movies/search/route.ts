import { NextRequest, NextResponse } from 'next/server'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const API_KEY = process.env.TMDB_API_KEY!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const type = (searchParams.get('type') ?? 'movie') as 'movie' | 'tv'
  const page = searchParams.get('page') ?? '1'

  try {
    let url: string
    if (q.trim()) {
      url = `${TMDB_BASE}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(q)}&page=${page}&language=ar-SA&include_adult=false`
    } else {
      url = `${TMDB_BASE}/trending/${type}/week?api_key=${API_KEY}&page=${page}&language=ar-SA`
    }

    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) {
      return NextResponse.json({ error: 'TMDB error' }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
