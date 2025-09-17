import fetch from 'node-fetch'

export async function lrclibGetSynced({ title, artist, album, duration }: { title: string; artist?: string; album?: string; duration?: number }) {
  const params = new URLSearchParams()
  if (title) params.set('track_name', title)
  if (artist) params.set('artist_name', artist)
  if (album) params.set('album_name', album)
  if (typeof duration === 'number') params.set('duration', String(Math.round(duration)))
  const url = `https://lrclib.net/api/get?${params.toString()}`
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`lrclib fetch failed: ${res.status}`)
  const data = await res.json()
  // Expecting { lrc: '...', vtt: '...', meta: {...} }
  return data
}
