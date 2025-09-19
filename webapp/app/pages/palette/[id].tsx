/* eslint-disable */
"use client";
import React from 'react';
import useSWR from 'swr';
import { Rnd } from 'react-rnd';

type NodeModel = {
  id: string;
  feature: string;
  component: string;
  variant?: string;
  position: { x: number; y: number };
  size?: { w: number; h: number };
  z?: number;
  props_overrides?: Record<string, any>;
  style_overrides?: React.CSSProperties | Record<string, any>;
};

type CanvasDoc = {
  id: string;
  experiment_id?: string;
  name: string;
  nodes: NodeModel[];
  groups: Array<{ id: string; name: string; node_ids: string[] }>;
  grid_size: number;
  snap: boolean;
  zoom: number;
  viewport: { x: number; y: number };
  meta: Record<string, any>;
};

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const Panel: React.FC<{ title?: string; children?: React.ReactNode } & Record<string, any>> = ({ title, children, ...rest }) => (
  <div className="bg-[var(--panel)] text-[var(--text)] border rounded-md p-2" {...rest}>
    {title && <div className="text-xs opacity-80 mb-1.5">{title}</div>}
    <div>{children}</div>
  </div>
);

const ChartPlaceholder: React.FC<{ type?: 'line' | 'bar' | 'area'; title?: string }> = ({ type = 'line', title }) => (
  <Panel title={title || `Chart (${type})`}>
    <div className="grid place-items-center h-full">
      <div className="opacity-70 text-xs">{type} chart placeholder</div>
    </div>
  </Panel>
);

const TextCard: React.FC<{ text?: string; title?: string }> = ({ text = 'Text', title }) => (
  <Panel title={title}>
    <div>{text}</div>
  </Panel>
);

function resolve(feature: string, component: string, variant?: string) {
  if (feature === 'panel' && component === 'Chart') return ChartPlaceholder;
  if (feature === 'panel' && component === 'Text') return TextCard;
  return null;
}

export default function PaletteEditorPage({ params }: { params: { id: string } }) {
  const { data, mutate } = useSWR<CanvasDoc>(`${API}/api/palettes/${params.id}`, fetcher);
  const [etag, setEtag] = React.useState<string | null>(null);
  const [snaps, setSnaps] = React.useState<Array<{ ts: string; path: string }>>([]);

  React.useEffect(() => {
    // Re-fetch to capture headers for ETag
    fetch(`${API}/api/palettes/${params.id}`).then(async (r) => {
      setEtag(r.headers.get('ETag'));
      const j = await r.json();
      mutate(j, { revalidate: false });
    });
    // Load snapshots list
    fetch(`${API}/api/palettes/${params.id}/snapshots`).then((r) => r.json()).then((j) => setSnaps(j.items || []));
  }, [params.id]);

  const debouncedRef = React.useRef<any>();
  const debounced = (fn: () => void, ms = 200) => {
    if (debouncedRef.current) clearTimeout(debouncedRef.current);
    debouncedRef.current = setTimeout(fn, ms);
  };

  const patchNode = async (nodeId: string, patch: Partial<NodeModel>) => {
    const r = await fetch(`${API}/api/palettes/${params.id}/nodes/${nodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(etag ? { 'If-Match': etag } : {}) },
      body: JSON.stringify(patch),
    });
    if (r.status === 409) {
      // stale: refetch full doc
      const gr = await fetch(`${API}/api/palettes/${params.id}`);
      setEtag(gr.headers.get('ETag'));
      const j = await gr.json();
      mutate(j, { revalidate: false });
      return;
    }
    const newEtag = r.headers.get('ETag');
    if (newEtag) setEtag(newEtag);
    const updatedNode = await r.json();
    // optimistic update in doc
    mutate((prev) => {
      if (!prev) return prev as any;
      return { ...prev, nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, ...updatedNode } : n)) } as any;
    }, { revalidate: false });
  };

  const createSnapshot = async () => {
    await fetch(`${API}/api/palettes/${params.id}/snapshot`, { method: 'POST' });
    const list = await fetch(`${API}/api/palettes/${params.id}/snapshots`).then((r) => r.json());
    setSnaps(list.items || []);
  };

  const addNode = async (node: Partial<NodeModel>) => {
    const r = await fetch(`${API}/api/palettes/${params.id}/nodes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(node) });
    const newEtag = r.headers.get('ETag');
    if (newEtag) setEtag(newEtag);
    const created = await r.json();
    mutate((prev) => {
      if (!prev) return prev as any;
      return { ...prev, nodes: [...(prev.nodes || []), created] } as any;
    }, { revalidate: false });
  };

  const restoreSnapshot = async (ts: string) => {
    const r = await fetch(`${API}/api/palettes/${params.id}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ts }) });
    const newEtag = r.headers.get('ETag');
    if (newEtag) setEtag(newEtag);
    const j = await r.json();
    mutate(j.doc, { revalidate: false });
  };

  if (!data) return <div className="p-4">Loading…</div>;

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-2 p-2 border-b bg-[var(--panel)]">
        <div className="text-sm font-medium">Palette: {data.name}</div>
        <button className="px-2 py-1 text-xs border rounded" onClick={createSnapshot}>Snapshot</button>
        <button
          className="px-2 py-1 text-xs border rounded"
          onClick={() => addNode({ feature: 'panel', component: 'Text', position: { x: 40, y: 40 }, size: { w: 240, h: 120 }, props_overrides: { title: 'Text', text: 'Hello' } })}
        >
          + Text
        </button>
        <button
          className="px-2 py-1 text-xs border rounded"
          onClick={() => addNode({ feature: 'panel', component: 'Chart', variant: 'line', position: { x: 320, y: 40 }, size: { w: 320, h: 180 }, props_overrides: { title: 'Chart' } })}
        >
          + Chart
        </button>
        <div className="ml-auto text-xs opacity-60">ETag: {etag || '—'}</div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative overflow-auto bg-[var(--bg)]">
          <div className="relative w-[2000px] h-[1200px]">
            {data.nodes?.map((n) => {
              const Comp = resolve(n.feature, n.component, n.variant);
              if (!Comp) return null;
              const w = n.size?.w ?? 240;
              const h = n.size?.h ?? 160;
              return (
                <Rnd
                  key={n.id}
                  default={{ x: n.position?.x ?? 0, y: n.position?.y ?? 0, width: w, height: h }}
                  bounds="parent"
                  onDragStop={(_, d) => {
                    debounced(() => patchNode(n.id, { position: { x: d.x, y: d.y } }), 250);
                  }}
                  onResizeStop={(_, __, ref, ___, pos) => {
                    const width = ref.offsetWidth; const height = ref.offsetHeight;
                    debounced(() => patchNode(n.id, { position: { x: pos.x, y: pos.y }, size: { w: width, h: height } }), 250);
                  }}
                >
                  <div className="w-full h-full">
                    <Comp title={(n as any).props_overrides?.title} text={(n as any).props_overrides?.text} />
                  </div>
                </Rnd>
              );
            })}
          </div>
        </div>
        <div className="w-64 border-l p-2 bg-[var(--panel)] overflow-auto">
          <div className="text-xs font-medium mb-2">Snapshots</div>
          <div className="space-y-1">
            {snaps.map((s) => (
              <div key={s.ts} className="flex items-center gap-2">
                <button className="px-2 py-1 text-xs border rounded" onClick={() => restoreSnapshot(s.ts)}>{s.ts}</button>
              </div>
            ))}
            {snaps.length === 0 && <div className="text-xs opacity-60">No snapshots yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
