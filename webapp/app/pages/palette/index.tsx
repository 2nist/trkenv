/* eslint-disable */
import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/router';

type PaletteListItem = { id: string; name?: string; experiment_id?: string; updated_at?: string };
type ListResponse = { items: PaletteListItem[]; total: number };

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PaletteListPage() {
  const router = useRouter();
  const { data, error, mutate } = useSWR<ListResponse>(`${API}/api/palettes`, fetcher, { refreshInterval: 5000 });

  const createPalette = async () => {
    const r = await fetch(`${API}/api/palettes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Canvas' }) });
    const j = await r.json();
    // navigate to editor
    router.push(`/palette/${j.id}`);
  };

  if (error) return <div className="p-4">Failed to load palettes.</div>;
  const items = data?.items || [];

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold">Palettes</h2>
        <button className="ml-auto px-3 py-1.5 text-sm border rounded" onClick={createPalette}>New Palette</button>
      </div>
      {items.length === 0 && <div className="text-sm opacity-70">No palettes yet.</div>}
      <div className="divide-y border rounded">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--panel)]/50">
            <div className="flex-1">
              <Link href={`/palette/${it.id}`} className="text-sm text-blue-400 hover:underline">
                {it.name || it.id}
              </Link>
              <div className="text-[11px] opacity-60">
                {it.experiment_id ? `exp: ${it.experiment_id} · ` : ''}updated: {it.updated_at || '—'}
              </div>
            </div>
            <Link href={`/palette/${it.id}`} className="px-2 py-1 text-xs border rounded">Open</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
