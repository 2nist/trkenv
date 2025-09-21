import useSWR from 'swr'
import { PaletteListResponse, PaletteListItem } from '../types/api'

const apiBase = (process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000').replace(/\/$/, '')
const buildUrl = (u: string) => (u.startsWith('http') ? u : `${apiBase}${u.startsWith('/') ? '' : '/'}${u}`)

const fetcher = (url: string) => fetch(buildUrl(url)).then(r => {
  if (!r.ok) throw new Error('network error')
  return r.json()
})

export function usePalettes() {
  const { data, error, isLoading, mutate } = useSWR<PaletteListResponse>('/api/palettes', fetcher)
  return {
    items: data?.items || [],
    total: data?.total || 0,
    error,
    isLoading,
    mutate,
  }
}

export function usePalette(id: string) {
  const { data, error, isLoading, mutate } = useSWR<PaletteListItem>(id ? `/api/palettes/${id}` : null, fetcher)
  return { item: data, error, isLoading, mutate }
}
