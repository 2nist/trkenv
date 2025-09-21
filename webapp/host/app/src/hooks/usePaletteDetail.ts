import useSWR from 'swr'

type PaletteDetail = {
  id: string
  name?: string
  doc?: any
}

const apiBase = (process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000').replace(/\/$/, '')
const buildUrl = (u: string) => (u.startsWith('http') ? u : `${apiBase}${u.startsWith('/') ? '' : '/'}${u}`)

const fetcherWithEtag = async (url: string) => {
  const res = await fetch(buildUrl(url))
  if (!res.ok) throw new Error('network')
  const etag = res.headers.get('etag') || res.headers.get('ETag') || res.headers.get('updated_at')
  const data = await res.json()
  return { data, etag }
}

export function usePaletteDetail(id?: string) {
  const { data, error, mutate } = useSWR(id ? `/api/palettes/${id}` : null, fetcherWithEtag)
  return {
    detail: data?.data as PaletteDetail | undefined,
    etag: data?.etag as string | undefined,
    error,
    mutate,
  }
}

export async function updatePaletteName(id: string, name: string, etag?: string) {
  const headers: Record<string,string> = {'Content-Type':'application/json'}
  if (etag) headers['If-Match'] = etag
  const res = await fetch(buildUrl(`/api/palettes/${id}`), { method: 'PATCH', headers, body: JSON.stringify({ name }) })
  const txt = await res.text().catch(()=>'')
  if (!res.ok) {
    // Throw structured error so callers can handle status codes
    const err: any = new Error(`update failed: ${res.status} ${txt}`)
    err.status = res.status
    err.body = txt
    throw err
  }
  // If success, parse JSON
  try {
    return JSON.parse(txt || '{}')
  } catch (_) {
    return {}
  }
}
