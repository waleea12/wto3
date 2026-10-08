import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const season = req.nextUrl.searchParams.get('season')
  const token = process.env.TMDB_READ_ACCESS_TOKEN
  if (!id || !/^\d+$/.test(id) || !season || !/^\d+$/.test(season)) {
    return NextResponse.json({ error: 'Invalid series or season' }, { status: 400 })
  }
  if (!token) return NextResponse.json({ error: 'TMDB is not configured' }, { status: 503 })

  try {
    const response = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/${season}?language=ar-SA`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (!response.ok) return NextResponse.json({ error: 'TMDB error' }, { status: response.status })
    return NextResponse.json(await response.json())
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 502 })
  }
}
