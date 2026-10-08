import { NextRequest, NextResponse } from 'next/server'

const TMDB_BASE = 'https://api.themoviedb.org/3'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie'
  const token = process.env.TMDB_READ_ACCESS_TOKEN

  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  if (!token) return NextResponse.json({ error: 'TMDB is not configured' }, { status: 503 })

  try {
    const res = await fetch(
      `${TMDB_BASE}/${type}/${id}?language=ar-SA&append_to_response=videos,credits`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, next: { revalidate: 3600 } }
    )
    if (!res.ok) return NextResponse.json({ error: 'TMDB error' }, { status: res.status })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
