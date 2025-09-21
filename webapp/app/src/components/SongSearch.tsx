'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

// Mock data for Storybook
const mockSongs = [
  { id: 'song-1', title: 'Summer Nights', artist: 'Demo Artist' },
  { id: 'song-2', title: 'Electric Dreams', artist: 'Synth Wave' },
  { id: 'song-3', title: 'Midnight Groove', artist: 'Jazz Master' },
  { id: 'song-4', title: 'Ocean Waves', artist: 'Ambient Sounds' },
]

export function SongSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [songs, setSongs] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if we're in Storybook environment
  const isStorybook = typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '6006'

  // Prefer build-time env; fall back to same host on 8010, then localhost:8010
  const API = process.env.NEXT_PUBLIC_API_BASE
    || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8010` : 'http://127.0.0.1:8010')

  async function fetchSongs() {
    setLoading(true)
    setError(null)
    try {
      // Use mock data in Storybook to avoid CORS issues
      if (isStorybook) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500))
        const filteredSongs = mockSongs.filter(song =>
          song.title.toLowerCase().includes(q.toLowerCase()) ||
          song.artist.toLowerCase().includes(q.toLowerCase())
        )
        setSongs(filteredSongs)
      } else {
        // Real API call for production
        const res = await fetch(`${API}/songs?q=${encodeURIComponent(q)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setSongs(data.songs || [])
      }
    } catch (err: any) {
      console.error('fetchSongs failed', err)
      setError(String(err?.message || err))
      setSongs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSongs() }, [])

  return (
    <div className="p-3 border rounded bg-[color:var(--surface,#0f1216)] text-[color:var(--text,#f5f5f5)] border-[color:var(--border,#2a2d33)]">
      <div className="flex gap-2">
        <input
          className="border border-[color:var(--border,#2a2d33)] bg-[color:var(--surface,#15191f)] text-[color:var(--text,#f5f5f5)] placeholder-[color:var(--muted,#9aa2ad)] p-1 flex-1 rounded"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="search"
        />
        <button className="btn-tape" onClick={fetchSongs}>Search</button>
      </div>
      {isStorybook && (
        <div className="mt-2 text-xs p-2 rounded bg-[color:var(--surface,#15191f)] text-[color:var(--muted,#9aa2ad)]">
          📚 Running in Storybook - using mock data
        </div>
      )}
      <div className="mt-3">
        {loading && <div className="text-sm text-[color:var(--muted,#9aa2ad)]">Loading…</div>}
        {error && <div className="text-sm text-red-400">{error}</div>}
        {songs.map(s => (
          <div key={s.id} className="p-2 border-b border-[color:var(--border,#2a2d33)] flex justify-between items-center">
            <div>
              <div className="font-dymo">{s.title}</div>
              <div className="text-sm text-[color:var(--muted,#9aa2ad)]">{s.artist || s.id}</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-tape" onClick={() => router.push(`/timeline-cps/${s.id}`)}>Open</button>
              <button className="btn-tape" onClick={async ()=>{
                // Optional inline preview
                try {
                  setLoading(true); setError(null)
                  if (isStorybook) {
                    setSelected({ id: s.id, title: s.title, artist: s.artist, source: { mock: true, environment: 'storybook' } })
                  } else {
                    const r = await fetch(`${API}/songs/${s.id}`)
                    if (!r.ok) throw new Error(`HTTP ${r.status}`)
                    setSelected(await r.json())
                  }
                } catch (err: any) {
                  console.error('preview song failed', err)
                  setError(String(err?.message || err))
                } finally { setLoading(false) }
              }}>Preview</button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="mt-3 p-2 border rounded bg-[color:var(--surface,#15191f)] border-[color:var(--border,#2a2d33)] text-[color:var(--text,#f5f5f5)]">
          <h4 className="font-dymo">{selected.title}</h4>
          <pre className="text-xs">{JSON.stringify(selected.source, null, 2)}</pre>
            <div className="mt-2">
            <input id="tag" className="border border-[color:var(--border,#2a2d33)] bg-[color:var(--surface,#0f1216)] text-[color:var(--text,#f5f5f5)] placeholder-[color:var(--muted,#9aa2ad)] p-1 mr-2 rounded" placeholder="new tag" />
            <button className="btn-tape" onClick={async ()=>{
              const el = (document.getElementById('tag') as HTMLInputElement)
              const tag = el?.value
              if (!tag) return
              try {
                setLoading(true); setError(null)
                if (isStorybook) {
                  // Mock tag addition for Storybook
                  console.log('Mock: Added tag', tag, 'to song', selected.id)
                  el.value = ''
                } else {
                  // Real API call for production
                  const resp = await fetch(`${API}/songs/${selected.id}/tags`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag }) })
                  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
                  el.value = ''
                }
              } catch (err: any) {
                console.error('add tag failed', err)
                setError(String(err?.message || err))
              } finally { setLoading(false) }
            }}>Add Tag</button>
          </div>
        </div>
      )}
    </div>
  )
}
