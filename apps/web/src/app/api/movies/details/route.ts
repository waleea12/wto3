import { NextRequest, NextResponse } from 'next/server'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const API_KEY = process.env.TMDB_API_KEY!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const type = (searchParams.get('type') ?? 'movie') as 'movie' | 'tv'

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const res = await fetch(
      `${TMDB_BASE}/${type}/${id}?api_key=${API_KEY}&language=ar-SA&append_to_response=videos,credits`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return NextResponse.json({ error: 'TMDB error' }, { status: res.status })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
