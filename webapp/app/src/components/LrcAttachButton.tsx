import React from 'react'

// Small LRC parser fallback: extracts lines with timestamp [mm:ss.xx] and text
function parseLrc(text: string) {
  const lines: Array<{ time?: number; text: string }> = []
  const re = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(re)
    if (m) {
      const mins = Number(m[1])
      const secs = Number(m[2])
      const ms = m[3] ? Number((m[3] + '000').slice(0,3)) : 0
      const total = mins * 60 + secs + ms / 1000
      lines.push({ time: total, text: m[4].trim() })
    } else if (raw.trim()) {
      lines.push({ text: raw.trim() })
    }
  }
  return { lines }
}

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

function secondsToBeats(sec: number, tempo: number) {
  return sec * (tempo / 60.0)
}

export default function LrcAttachButton({ songId, tempo }: { songId: string, tempo?: number }) {
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const text = await f.text()
    // lrclib.parse returns an object with lines array
    let parsed: any = []
    try {
      // try using our local parser (compatible shape with lrclib)
      const p = parseLrc(text)
      parsed = p.lines || []
    } catch (err) {
      // fallback simple parse: split lines
      parsed = text.split(/\r?\n/).map(l => ({ time: null, text: l }))
    }

    const out: Array<{ text: string; beat?: number | null }> = []
    const t = tempo || 120
    for (const item of parsed) {
      const timeSec = item.time ?? item.timeSeconds ?? (Array.isArray(item.times) && item.times[0]) ?? null
      if (timeSec != null) {
        const beat = secondsToBeats(Number(timeSec), t)
        out.push({ text: item.text || '', beat })
      } else {
        out.push({ text: item.text || '', beat: null })
      }
    }

    // Check if we're in Storybook environment
    const isStorybook = typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '6006'

    // POST to backend
    try {
      if (isStorybook) {
        // Mock the API call in Storybook
        console.log('📚 Storybook: Mock attaching LRC lyrics to song', songId, 'with', out.length, 'lines')
        alert(`📚 Storybook: Mock attached ${out.length} lyric lines to song ${songId}`)
      } else {
        // Real API call for production
        await fetch(`${apiBase}/v1/songs/${songId}/attach-lyrics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lines: out, mode: 'append' }),
        })
        // optionally, you might want to trigger a UI refresh (SWR mutate) from caller
      }
    } catch (err) {
      console.error('Failed to attach lrc', err)
    }
  }

  return (
    <label className="btn-tape-sm">
      Attach LRC
      <input type="file" accept=".lrc,.txt" onChange={onFile} className="hidden" />
    </label>
  )
}
