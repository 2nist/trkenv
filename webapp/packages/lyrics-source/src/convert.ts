export function lrcToVtt(lines: Array<{ time?: number; text: string }>) {
  // lines: time in seconds
  const out: string[] = []
  out.push('WEBVTT')
  out.push('')
  let idx = 0
  for (const line of lines) {
    const start = typeof line.time === 'number' ? secondsToStamp(line.time) : '00:00.000'
    const end = typeof line.time === 'number' ? secondsToStamp((line.time as number) + 3) : '00:03.000'
    out.push(`${idx}`)
    out.push(`${start} --> ${end}`)
    out.push(line.text)
    out.push('')
    idx++
  }
  return out.join('\n')
}

function secondsToStamp(s: number) {
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = Math.floor(s % 60)
  const ms = Math.floor((s - Math.floor(s)) * 1000)
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}.${String(ms).padStart(3, '0')}`
}

function pad(n: number) { return String(n).padStart(2, '0') }

export function addVttToJcrd(jcrd: any, vttPath: string) {
  jcrd = jcrd || {}
  jcrd.assets = jcrd.assets || {}
  jcrd.assets.lyrics_vtt = vttPath
  return jcrd
}
