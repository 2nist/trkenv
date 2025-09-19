/* eslint-disable */
import React from 'react';

export type NodeModel = {
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

export type RegistryEntry = {
  Component: React.ComponentType<any>;
  defaults?: Record<string, any>;
};

// Simple built-in examples
const Panel: React.FC<{ title?: string; children?: React.ReactNode; style?: React.CSSProperties } & Record<string, any>> = ({ title, children, style, ...rest }) => (
  <div className="bg-[var(--panel)] text-[var(--text)] border rounded-md p-2" style={style} {...rest}>
    {title && <div className="text-xs opacity-80 mb-1.5">{title}</div>}
    <div>{children}</div>
  </div>
);

const ChartPlaceholder: React.FC<{ type?: 'line'|'bar'|'area'; style?: React.CSSProperties; title?: string }> = ({ type = 'line', style, title }) => (
  <Panel title={title || `Chart (${type})`} style={{ ...style }}>
    <div className="grid place-items-center h-full">
      <div className="opacity-70 text-xs">{type} chart placeholder</div>
    </div>
  </Panel>
);

const TextCard: React.FC<{ text?: string; style?: React.CSSProperties; title?: string }> = ({ text = 'Text', style, title }) => (
  <Panel title={title} style={style}>
    <div>{text}</div>
  </Panel>
);

// Registry mapping feature/component/variant to components
export type RegistryKey = `${string}/${string}${string}` | string;

type KeyFn = (feature: string, component: string, variant?: string) => string;
const keyOf: KeyFn = (f, c, v) => `${f}:${c}:${v || ''}`;

const registry = new Map<string, RegistryEntry>();

function register(feature: string, component: string, variant: string | undefined, entry: RegistryEntry){
  registry.set(keyOf(feature, component, variant), entry);
}

// Built-in sample registrations
register('panel','Chart','line', { Component: ChartPlaceholder, defaults: { type: 'line', title: 'Line' } });
register('panel','Chart','bar',  { Component: ChartPlaceholder, defaults: { type: 'bar', title: 'Bar' } });
register('panel','Text','',      { Component: TextCard, defaults: { text: 'Hello TRK' } });

export function resolveEntry(n: Pick<NodeModel,'feature'|'component'|'variant'>): RegistryEntry | null {
  return registry.get(keyOf(n.feature, n.component, n.variant))
    || registry.get(keyOf(n.feature, n.component, ''))
    || null;
}

export function registerComponent(feature: string, component: string, variant: string | undefined, entry: RegistryEntry){
  register(feature, component, variant, entry);
}
