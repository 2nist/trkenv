/* eslint-disable */
"use client";
import React from 'react';
import { resolveEntry, NodeModel } from '../lib/palette-registry';

export type CanvasDoc = {
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

type Props = { doc: CanvasDoc; style?: React.CSSProperties };

export const CanvasRenderer: React.FC<Props> = ({ doc, style }) => {
  return (
    <div className="relative overflow-auto bg-[var(--bg)]" style={style}>
      {doc.nodes?.map((n) => {
        const entry = resolveEntry(n);
        if (!entry) return null;
        const { Component, defaults } = entry;
        const w = n.size?.w ?? 240;
        const h = n.size?.h ?? 160;
        const z = n.z ?? 0;
        const nodeStyle: React.CSSProperties = {
          position: 'absolute',
          transform: `translate(${n.position?.x ?? 0}px, ${n.position?.y ?? 0}px)`,
          width: w,
          height: h,
          zIndex: z,
          ...(n.style_overrides as any),
        };
        const props = { ...(defaults || {}), ...(n.props_overrides || {}), style: nodeStyle };
        return <Component key={n.id} {...props} />;
      })}
    </div>
  );
};

export default CanvasRenderer;
