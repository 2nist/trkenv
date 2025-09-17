import { lrclibGetSynced } from './lrclib'
import { lrcToVtt, addVttToJcrd } from './convert'
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

export type Meta = { artist?: string; title: string; album?: string; duration?: number }

export async function resolveLyrics(meta: Meta, opts: { cacheDir?: string; allowOnline?: boolean; prefer?: 'whisperx'|'lrclib' } = {}) {
  const cacheDir = opts.cacheDir || path.resolve(process.cwd(), 'data', 'lyrics_cache')
  fs.mkdirSync(cacheDir, { recursive: true })
  const slug = `${(meta.artist||'').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-${meta.title.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-${Math.round(meta.duration||0)}`
  const base = path.join(cacheDir, slug)
  const lrcPath = `${base}.lrc`
  const vttPath = `${base}.vtt`
  const jcrdPath = `${base}.jcrd.json`

  // 1) cache
  if (fs.existsSync(jcrdPath) || fs.existsSync(vttPath) || fs.existsSync(lrcPath)) {
    return { source: 'cache', vttPath: fs.existsSync(vttPath) ? vttPath : null, lrcPath: fs.existsSync(lrcPath) ? lrcPath : null }
  }

  // 2) try lrclib if allowed
  if (opts.allowOnline && opts.prefer !== 'whisperx') {
    try {
      const data = await lrclibGetSynced({ title: meta.title, artist: meta.artist, album: meta.album, duration: meta.duration })
      if (data && (data.lrc || data.vtt)) {
        if (data.lrc) fs.writeFileSync(lrcPath, data.lrc, 'utf-8')
        if (data.vtt) fs.writeFileSync(vttPath, data.vtt, 'utf-8')
        // update jcrd minimal
        const j = addVttToJcrd({}, vttPath)
        fs.writeFileSync(jcrdPath, JSON.stringify(j, null, 2), 'utf-8')
        return { source: 'lrclib', vttPath: data.vtt ? vttPath : null, lrcPath: data.lrc ? lrcPath : null }
      }
    } catch (err) {
      // continue to whisperx
      console.warn('lrclib failed', err)
    }
  }

  // 3) fallback to whisperx (offline ASR) - expects services/asr/whisperx_run.py to accept a vocal stem path and emit vtt
  try {
    // the caller must provide a path in meta.title? Here we expect meta.album to hold the vocal path as a fallback convention. In real flow, pass vocal stem path explicitly.
    const vocalPath = (meta as any).vocalPath || meta.album || null
    if (vocalPath && fs.existsSync(vocalPath)) {
      const out = spawnSync('python', [String(path.resolve('services','asr','whisperx_run.py')), '--input', vocalPath, '--out-vtt', vttPath], { encoding: 'utf-8', stdio: 'inherit' })
      if (fs.existsSync(vttPath)) {
        const j = addVttToJcrd({}, vttPath)
        fs.writeFileSync(jcrdPath, JSON.stringify(j, null, 2), 'utf-8')
        return { source: 'whisperx', vttPath, lrcPath: fs.existsSync(lrcPath) ? lrcPath : null }
      }
    }
  } catch (err) {
    console.warn('whisperx failed', err)
  }

  return { source: 'none', vttPath: null, lrcPath: null }
}
