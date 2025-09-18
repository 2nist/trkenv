import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

// ============ Types ============
export interface CssOverride { selector: string; props: Record<string,string>; label?: string }
interface CssEditContextValue {
  enabled: boolean;
  toggle(): void;
  selectedSelector?: string;
  selectedEl?: HTMLElement | null;
  overrides: Record<string, CssOverride>;
  updateProp(selector: string, prop: string, value: string): void;
  removeProp(selector: string, prop: string): void;
  setSelectorLabel(selector: string, label: string): void;
  clearSelector(selector: string): void;
  exportCss(): string;
}

const CssEditContext = createContext<CssEditContextValue | undefined>(undefined);

const STORAGE_KEY = 'css-edit-overrides';

// ============ Utilities ============
function loadOverrides(): Record<string, CssOverride> {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return {}; return JSON.parse(raw); } catch { return {}; }
}
function saveOverrides(data: Record<string, CssOverride>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function getBestSelector(el: HTMLElement): string {
  if (el.dataset.cssId) return `[data-css-id="${el.dataset.cssId}"]`;
  if (el.id) return `#${el.id}`;
  // build short path
  const parts: string[] = [];
  let cur: HTMLElement | null = el;
  while (cur && parts.length < 4 && cur.tagName.toLowerCase() !== 'body') {
    const tag = cur.tagName.toLowerCase();
    const cls = (cur.className || '').trim().split(/\s+/).filter(Boolean)[0];
    parts.unshift(cls ? `${tag}.${cls}` : tag);
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}

function buildCss(overrides: Record<string, CssOverride>): string {
  return Object.values(overrides).map(o => {
    const body = Object.entries(o.props).map(([k,v]) => `  ${k}: ${v};`).join('\n');
    return `${o.selector} {\n${body}\n}`;
  }).join('\n\n');
}

// ============ Provider ============
export const CssEditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enabled, setEnabled] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, CssOverride>>({});
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  const [selectedSelector, setSelectedSelector] = useState<string | undefined>();
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const hoverRef = useRef<HTMLElement | null>(null);

  // load overrides on mount
  useEffect(() => { setOverrides(loadOverrides()); }, []);

  // inject style tag
  useEffect(() => {
    if (!styleRef.current) {
      const st = document.createElement('style');
      st.id = 'css-edit-overrides';
      document.head.appendChild(st);
      styleRef.current = st;
    }
    styleRef.current!.textContent = buildCss(overrides);
    saveOverrides(overrides);
  }, [overrides]);

  // listeners when enabled
  useEffect(() => {
    if (!enabled) {
      if (hoverRef.current) { hoverRef.current.classList.remove('css-edit-hover'); hoverRef.current = null; }
      return;
    }
    function onMove(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target || target.closest('.css-edit-panel')) return;
      if (hoverRef.current && hoverRef.current !== target) hoverRef.current.classList.remove('css-edit-hover');
      hoverRef.current = target;
      hoverRef.current.classList.add('css-edit-hover');
    }
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target || target.closest('.css-edit-panel')) return;
      e.preventDefault(); e.stopPropagation();
      const sel = getBestSelector(target);
      setSelectedEl(target);
      setSelectedSelector(sel);
      if (!overrides[sel]) {
        setOverrides(prev => ({ ...prev, [sel]: { selector: sel, props: {} } }));
      }
    }
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      if (hoverRef.current) hoverRef.current.classList.remove('css-edit-hover');
    };
  }, [enabled, overrides]);

  const updateProp = (selector: string, prop: string, value: string) => {
    setOverrides(prev => {
      const cur = prev[selector] || { selector, props: {} };
      return { ...prev, [selector]: { ...cur, props: { ...cur.props, [prop]: value } } };
    });
  };
  const removeProp = (selector: string, prop: string) => {
    setOverrides(prev => {
      const cur = prev[selector]; if (!cur) return prev;
      const newProps = { ...cur.props }; delete newProps[prop];
      return { ...prev, [selector]: { ...cur, props: newProps } };
    });
  };
  const setSelectorLabel = (selector: string, label: string) => {
    setOverrides(prev => {
      const cur = prev[selector]; if (!cur) return prev;
      return { ...prev, [selector]: { ...cur, label } };
    });
  };
  const clearSelector = (selector: string) => {
    setOverrides(prev => { const n = { ...prev }; delete n[selector]; return n; });
    if (selectedSelector === selector) { setSelectedSelector(undefined); setSelectedEl(null); }
  };
  const exportCss = () => buildCss(overrides);
  const toggle = () => setEnabled(e => !e);

  return (
    <CssEditContext.Provider value={{ enabled, toggle, selectedEl, selectedSelector, overrides, updateProp, removeProp, setSelectorLabel, clearSelector, exportCss }}>
      {children}
      {enabled && selectedEl && selectedSelector && (
        <CssInspector selector={selectedSelector} element={selectedEl} />
      )}
    </CssEditContext.Provider>
  );
};

export const useCssEdit = () => {
  const ctx = useContext(CssEditContext);
  if (!ctx) throw new Error('useCssEdit must be used within CssEditProvider');
  return ctx;
};

// ============ Inspector Panel ============
const COMMON_PROPS: { key: string; label: string; type?: 'color' | 'text' }[] = [
  { key: 'background', label: 'Background' },
  { key: 'color', label: 'Text Color' },
  { key: 'borderRadius', label: 'Radius' },
  { key: 'padding', label: 'Padding' },
  { key: 'margin', label: 'Margin' },
  { key: 'boxShadow', label: 'Shadow' },
  { key: 'fontSize', label: 'Font Size' },
  { key: 'fontWeight', label: 'Font Weight' },
  { key: 'lineHeight', label: 'Line Height' },
  { key: 'gap', label: 'Gap' },
];

const CssInspector: React.FC<{ selector: string; element: HTMLElement }> = ({ selector, element }) => {
  const { overrides, updateProp, removeProp, clearSelector, setSelectorLabel, exportCss } = useCssEdit();
  const ov = overrides[selector];
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [customProp, setCustomProp] = useState('');
  const [customValue, setCustomValue] = useState('');

  // position panel near element
  useEffect(() => {
    const elRect = element.getBoundingClientRect();
    const panel = panelRef.current;
    if (panel) {
      const top = Math.max(8, elRect.top + window.scrollY - panel.offsetHeight - 8);
      const left = Math.min(window.innerWidth - panel.offsetWidth - 8, Math.max(8, elRect.left + window.scrollX));
      panel.style.top = `${top}px`;
      panel.style.left = `${left}px`;
    }
  }, [element, selector, ov?.props, showAll]);

  return (
    <div ref={panelRef} className="css-edit-panel fixed z-[9999] max-w-xs w-72 bg-white border border-gray-300 shadow-lg rounded-md p-3 text-xs font-sans space-y-3">
      <div className="flex items-center justify-between">
        <strong className="truncate" title={selector}>{ov.label || selector}</strong>
        <button onClick={() => clearSelector(selector)} className="text-red-600 hover:underline">✕</button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {COMMON_PROPS.map(p => (
          <PropRow key={p.key} propKey={p.key} label={p.label} value={ov.props[p.key]} onChange={v => updateProp(selector, p.key, v)} onRemove={() => removeProp(selector, p.key)} />
        ))}
        {showAll && Object.entries(ov.props).filter(([k]) => !COMMON_PROPS.find(cp => cp.key === k)).map(([k,v]) => (
          <PropRow key={k} propKey={k} label={k} value={v} onChange={val => updateProp(selector, k, val)} onRemove={() => removeProp(selector, k)} />
        ))}
      </div>
      <div className="flex gap-2">
        <input className="flex-1 border border-gray-300 rounded px-1 py-0.5" placeholder="prop" value={customProp} onChange={e=>setCustomProp(e.target.value)} />
        <input className="flex-1 border border-gray-300 rounded px-1 py-0.5" placeholder="value" value={customValue} onChange={e=>setCustomValue(e.target.value)} />
        <button className="px-2 border border-gray-300 rounded bg-gray-50" onClick={() => { if (customProp && customValue) { updateProp(selector, customProp, customValue); setCustomProp(''); setCustomValue(''); } }}>Add</button>
      </div>
      <div className="flex justify-between items-center">
        <button className="text-blue-600 hover:underline" onClick={() => setShowAll(s=>!s)}>{showAll ? 'Hide Others' : 'Show All'}</button>
        <button className="text-gray-600 hover:underline" onClick={() => {
          const css = exportCss();
          navigator.clipboard?.writeText(css).catch(()=>{});
        }}>Copy CSS</button>
      </div>
      <div className="flex items-center gap-2">
        <input className="flex-1 border border-gray-300 rounded px-1 py-0.5" placeholder="Label" value={ov.label || ''} onChange={e=>setSelectorLabel(selector, e.target.value)} />
      </div>
      <p className="text-[10px] text-gray-500 leading-snug">Edit Mode: Click other elements to switch. Hover highlights. Overrides persist locally.</p>
    </div>
  );
};

const PropRow: React.FC<{ propKey: string; label: string; value?: string; onChange: (v: string) => void; onRemove: () => void }> = ({ propKey, label, value, onChange, onRemove }) => {
  return (
    <div className="flex items-center gap-2">
      <label className="w-20 truncate" title={propKey}>{label}</label>
      <input className="flex-1 border border-gray-300 rounded px-1 py-0.5" value={value || ''} onChange={e=>onChange(e.target.value)} placeholder="value" />
      {value && <button onClick={onRemove} className="text-red-500">×</button>}
    </div>
  );
};
