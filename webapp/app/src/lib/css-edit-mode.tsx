/* eslint-disable */
"use client";
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
  exportJson(): string;
  renameSelector(oldSel: string, newSel: string): void;
  resetAll(): void;
  // new features
  undo(): void;
  redo(): void;
  canUndo: boolean;
  canRedo: boolean;
  pasteCss(css: string): void;
  filterMode: boolean;
  toggleFilterMode(): void;
  tokens: Record<string,string>;
  tokenize(items: { selector: string; prop: string; token: string }[]): void;
  deleteToken(name: string): void;
  updateToken(name: string, value: string): void;
  // presets
  presets: Record<string, { name: string; props: Record<string,string> }>;
  savePreset(name: string, selector?: string): void;
  applyPreset(name: string, selector?: string): void;
  deletePreset(name: string): void;
}

const CssEditContext = createContext<CssEditContextValue | undefined>(undefined);

const STORAGE_KEY = 'css-edit-overrides';
const TOKENS_KEY = 'css-edit-tokens';
const PRESETS_KEY = 'css-edit-presets-v1';
const HISTORY_LIMIT = 15;

// ============ Utilities ============
function loadOverrides(): Record<string, CssOverride> {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return {}; return JSON.parse(raw); } catch { return {}; }
}
function saveOverrides(data: Record<string, CssOverride>) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} }
function loadTokens(): Record<string,string> { try { const raw = localStorage.getItem(TOKENS_KEY); if (!raw) return {}; return JSON.parse(raw);} catch { return {}; } }
function saveTokens(tokens: Record<string,string>) { try { localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens)); } catch {} }

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

function buildCss(overrides: Record<string, CssOverride>, tokens?: Record<string,string>): string {
  const toKebab = (s: string) => s.includes('-') ? s : s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
  const tokenBlock = tokens && Object.keys(tokens).length
    ? `:root{\n${Object.entries(tokens).map(([k,v])=>`  --${k}: ${v};`).join('\n')}\n}\n\n`
    : '';
  const rules = Object.values(overrides).map(o => {
    const body = Object.entries(o.props).map(([k,v]) => `  ${toKebab(k)}: ${v};`).join('\n');
    return `${o.selector} {\n${body}\n}`;
  }).join('\n\n');
  return tokenBlock + rules;
}

// Presets helpers
type CssPreset = { name: string; props: Record<string,string> };
function loadPresets(): Record<string, CssPreset> {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // seed defaults
  const defaults: CssPreset[] = [
    { name: 'Soft Card', props: { background: 'color-mix(in oklab, var(--bg) 90%, white 10%)', color: 'var(--text)', borderRadius: '12px', padding: '16px', boxShadow: '0 6px 18px rgba(0,0,0,0.18)', border: '1px solid color-mix(in oklab, var(--border) 70%, transparent 30%)' } },
    { name: 'Glass Panel', props: { background: 'rgba(255,255,255,0.06)', color: 'var(--text)', borderRadius: '14px', padding: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' } },
    { name: 'Muted Panel', props: { background: 'color-mix(in oklab, var(--panel) 80%, black 20%)', color: 'var(--text)', borderRadius: '10px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } },
    { name: 'Accent Button', props: { background: 'var(--accent-10)', color: '#fff', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 6px 16px rgba(0,0,0,0.2)' } },
    { name: 'Badge', props: { background: 'color-mix(in oklab, var(--accent-10) 15%, transparent 85%)', color: 'var(--text)', borderRadius: '9999px', padding: '2px 8px', border: '1px solid color-mix(in oklab, var(--accent-10) 30%, transparent 70%)' } },
  ];
  const rec: Record<string, CssPreset> = {};
  defaults.forEach(p => { rec[p.name] = p; });
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(rec)); } catch {}
  return rec;
}
function savePresets(presets: Record<string, CssPreset>) { try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); } catch {} }

// ============ Provider ============
export const CssEditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enabled, setEnabled] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, CssOverride>>({});
  const [tokens, setTokens] = useState<Record<string,string>>({});
  const [filterMode, setFilterMode] = useState(false);
  const [presets, setPresets] = useState<Record<string, CssPreset>>({});
  const historyRef = useRef<{ overrides: Record<string,CssOverride>; tokens: Record<string,string> }[]>([]);
  const futureRef = useRef<{ overrides: Record<string,CssOverride>; tokens: Record<string,string> }[]>([]);
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  const [selectedSelector, setSelectedSelector] = useState<string | undefined>();
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const hoverRef = useRef<HTMLElement | null>(null);

  // load overrides on mount
  useEffect(() => { setOverrides(loadOverrides()); setTokens(loadTokens()); setPresets(loadPresets()); }, []);

  // inject style tag
  useEffect(() => {
    if (!styleRef.current) {
      const st = document.createElement('style');
      st.id = 'css-edit-overrides';
      document.head.appendChild(st);
      styleRef.current = st;
    }
    styleRef.current!.textContent = buildCss(overrides, tokens);
    saveOverrides(overrides); saveTokens(tokens);
  }, [overrides, tokens]);

  function pushHistory(snapshot?: { overrides: Record<string,CssOverride>; tokens: Record<string,string> }) {
    const snap = snapshot || { overrides: structuredClone(overrides), tokens: structuredClone(tokens) };
    historyRef.current.push(snap);
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    futureRef.current = [];
  }

  // seed history after initial load
  useEffect(() => {
    if (historyRef.current.length === 0 && (Object.keys(overrides).length || Object.keys(tokens).length)) {
      pushHistory();
    }
  }, [overrides, tokens]);

  // listeners when enabled
  useEffect(() => {
    if (!enabled) {
      if (hoverRef.current) { hoverRef.current.classList.remove('css-edit-hover'); hoverRef.current = null; }
      return;
    }
    function onMove(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target || target.closest('.css-edit-panel')) return;
      if (target.closest('[data-css-ignore]')) return;
      if (filterMode && !target.closest('[data-css-editable]') && !target.hasAttribute('data-css-editable')) return;
      if (hoverRef.current && hoverRef.current !== target) hoverRef.current.classList.remove('css-edit-hover');
      hoverRef.current = target;
      hoverRef.current.classList.add('css-edit-hover');
    }
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target || target.closest('.css-edit-panel')) return;
      // allow normal clicks on ignored elements (like the CSS Edit toggle button)
      if (target.closest('[data-css-ignore]')) return;
      if (filterMode && !target.closest('[data-css-editable]') && !target.hasAttribute('data-css-editable')) return;
      e.preventDefault(); e.stopPropagation();
      const sel = getBestSelector(target);
      setSelectedEl(target);
      setSelectedSelector(sel);
      if (!overrides[sel]) {
        pushHistory();
        setOverrides(prev => ({ ...prev, [sel]: { selector: sel, props: {} } }));
      }
    }
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setEnabled(false); };
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey, true);
      if (hoverRef.current) hoverRef.current.classList.remove('css-edit-hover');
    };
  }, [enabled, overrides, filterMode]);

  const updateProp = (selector: string, prop: string, value: string) => {
    pushHistory();
    setOverrides(prev => {
      const cur = prev[selector] || { selector, props: {} };
      return { ...prev, [selector]: { ...cur, props: { ...cur.props, [prop]: value } } };
    });
  };
  const removeProp = (selector: string, prop: string) => {
    pushHistory();
    setOverrides(prev => {
      const cur = prev[selector]; if (!cur) return prev;
      const newProps = { ...cur.props }; delete newProps[prop];
      return { ...prev, [selector]: { ...cur, props: newProps } };
    });
  };
  const setSelectorLabel = (selector: string, label: string) => {
    pushHistory();
    setOverrides(prev => {
      const cur = prev[selector]; if (!cur) return prev;
      return { ...prev, [selector]: { ...cur, label } };
    });
  };
  const clearSelector = (selector: string) => {
    pushHistory();
    setOverrides(prev => { const n = { ...prev }; delete n[selector]; return n; });
    if (selectedSelector === selector) { setSelectedSelector(undefined); setSelectedEl(null); }
  };
  const exportCss = () => buildCss(overrides, tokens);
  const exportJson = () => JSON.stringify({ overrides, tokens }, null, 2);
  const renameSelector = (oldSel: string, newSel: string) => {
    if (!oldSel || !newSel || oldSel === newSel) return;
    pushHistory();
    setOverrides(prev => {
      const copy = { ...prev };
      const existing = copy[oldSel]; if (!existing) return prev;
      const target = copy[newSel];
      // Merge if target exists
      copy[newSel] = target ? { ...target, props: { ...target.props, ...existing.props } } : { ...existing, selector: newSel };
      delete copy[oldSel];
      return copy;
    });
    if (selectedSelector === oldSel) setSelectedSelector(newSel);
  };
  const resetAll = () => {
    if (confirm('Reset ALL CSS overrides? This cannot be undone.')) {
      pushHistory();
      setOverrides({}); setTokens({});
      setSelectedEl(null); setSelectedSelector(undefined);
    }
  };
  const undo = () => {
    if (!historyRef.current.length) return;
    const last = historyRef.current.pop()!;
    futureRef.current.push({ overrides: structuredClone(overrides), tokens: structuredClone(tokens) });
    setOverrides(last.overrides); setTokens(last.tokens);
  };
  const redo = () => {
    if (!futureRef.current.length) return;
    const next = futureRef.current.pop()!;
    historyRef.current.push({ overrides: structuredClone(overrides), tokens: structuredClone(tokens) });
    setOverrides(next.overrides); setTokens(next.tokens);
  };
  const canUndo = historyRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  const pasteCss = (css: string) => {
    if (!css) return;
    pushHistory();
    const blocks = css.split('}');
    const additions: Record<string,CssOverride> = {};
    blocks.forEach(b => {
      const seg = b.trim(); if (!seg) return;
      const i = seg.indexOf('{'); if (i === -1) return;
      const sel = seg.slice(0,i).trim();
      const body = seg.slice(i+1).trim(); if (!sel || !body) return;
      const props: Record<string,string> = {};
      body.split(';').forEach(line => {
        const ln = line.trim(); if (!ln) return;
        const ci = ln.indexOf(':'); if (ci === -1) return;
        const k = ln.slice(0,ci).trim(); const v = ln.slice(ci+1).trim(); if (k) props[k] = v;
      });
      if (Object.keys(props).length) {
        additions[sel] = { selector: sel, props: { ...(overrides[sel]?.props||{}), ...props } };
      }
    });
    setOverrides(prev => ({ ...prev, ...additions }));
  };

  const toggleFilterMode = () => setFilterMode(f=>!f);

  const tokenize = (items: { selector: string; prop: string; token: string }[]) => {
    if (!items.length) return;
    pushHistory();
    setOverrides(prev => {
      const copy = { ...prev };
      const newTokens: Record<string,string> = {};
      items.forEach(it => {
        const ov = copy[it.selector]; if (!ov) return;
        const val = ov.props[it.prop]; if (!val) return;
        const name = it.token.replace(/^--/, '');
        newTokens[name] = val;
        ov.props[it.prop] = `var(--${name})`;
      });
      setTokens(tk => ({ ...tk, ...newTokens }));
      return copy;
    });
  };
  const deleteToken = (name: string) => {
    if (!tokens[name]) return;
    pushHistory();
    const varRef = `var(--${name})`; const val = tokens[name];
    setOverrides(prev => {
      const c: typeof prev = {};
      Object.entries(prev).forEach(([sel,ov]) => {
        const newProps: Record<string,string> = {};
        Object.entries(ov.props).forEach(([k,v]) => { newProps[k] = v === varRef ? val : v; });
        c[sel] = { ...ov, props: newProps };
      });
      return c;
    });
    setTokens(tk => { const n={...tk}; delete n[name]; return n; });
  };
  const updateToken = (name: string, value: string) => {
    if (!tokens[name]) return;
    pushHistory();
    setTokens(tk => ({ ...tk, [name]: value }));
  };
  const toggle = () => setEnabled(e => !e);

  // Global shortcut: Ctrl/Cmd+Shift+E toggles editor
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey; if (mod && e.shiftKey && (e.key === 'E' || e.key === 'e')) { e.preventDefault(); toggle(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  // Presets API
  const savePreset = (name: string, selector?: string) => {
    const sel = selector || selectedSelector;
    if (!name || !sel) return;
    const ov = overrides[sel]; if (!ov) return;
    const next = { ...presets, [name]: { name, props: { ...ov.props } } };
    setPresets(next); savePresets(next);
  };
  const applyPreset = (name: string, selector?: string) => {
    const sel = selector || selectedSelector; if (!sel) return;
    const p = presets[name]; if (!p) return;
    pushHistory();
    setOverrides(prev => {
      const cur = prev[sel] || { selector: sel, props: {} };
      return { ...prev, [sel]: { ...cur, props: { ...cur.props, ...p.props } } };
    });
  };
  const deletePreset = (name: string) => {
    if (!presets[name]) return;
    const n = { ...presets }; delete n[name]; setPresets(n); savePresets(n);
  };

  return (
    <CssEditContext.Provider value={{ enabled, toggle, selectedEl, selectedSelector, overrides, updateProp, removeProp, setSelectorLabel, clearSelector, exportCss, exportJson, renameSelector, resetAll, undo, redo, canUndo, canRedo, pasteCss, filterMode, toggleFilterMode, tokens, tokenize, deleteToken, updateToken, presets, savePreset, applyPreset, deletePreset }}>
      {children}
      {enabled && <CssDockPanel />}
      {enabled && <CssEditMiniBar onOff={() => setEnabled(false)} />}
      {enabled && Object.keys(tokens).length > 0 && <TokensPanel />}
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

// Docked right-side panel
const CssDockPanel: React.FC = () => {
  const { selectedSelector, overrides, updateProp, removeProp, setSelectorLabel, clearSelector, exportCss, exportJson, renameSelector, resetAll, undo, redo, canUndo, canRedo, pasteCss, filterMode, toggleFilterMode, tokens, tokenize, presets, applyPreset, savePreset, deletePreset } = useCssEdit();
  const selector = selectedSelector;
  const ov = selector ? overrides[selector] : undefined;
  const [tab, setTab] = useState<'selected'|'presets'>('selected');
  const [customProp, setCustomProp] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [selectorDraft, setSelectorDraft] = useState(selector || '');
  const [editingSelector, setEditingSelector] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 360;
    const saved = +localStorage.getItem('css-edit-panel-width')!;
    return Number.isFinite(saved) && saved >= 280 && saved <= 640 ? saved : 360;
  });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('css-edit-panel-collapsed') === '1';
  });
  const resizingRef = useRef<null | { startX: number; startW: number }>(null);

  useEffect(() => { setSelectorDraft(selector || ''); }, [selector]);
  useEffect(() => { try { localStorage.setItem('css-edit-panel-width', String(width)); } catch {} }, [width]);
  useEffect(() => {
    // Drive panel width via CSS variable to avoid inline styles
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--css-edit-panel-width', `${Math.round(width)}px`);
    }
  }, [width]);
  useEffect(() => { try { localStorage.setItem('css-edit-panel-collapsed', collapsed ? '1' : '0'); } catch {} }, [collapsed]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    resizingRef.current = { startX: e.clientX, startW: width };
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const dx = resizingRef.current.startX - ev.clientX; // dragging left increases width
      let next = resizingRef.current.startW + dx;
      next = Math.max(280, Math.min(640, next));
      setWidth(next);
    };
    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
    };
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
  };

  if (collapsed) {
    return (
      <div className="fixed top-0 right-0 h-full z-[9998]">
        <button className="absolute top-2 -left-10 rotate-180 bg-white border border-gray-300 rounded-l px-2 py-1 shadow" onClick={()=>setCollapsed(false)} title="Expand CSS Editor">❯</button>
      </div>
    );
  }

  return (
    <div className="css-edit-panel css-edit-right-panel fixed top-0 right-0 h-full z-[9998] bg-white border-l border-gray-300 shadow-xl text-[13px] font-sans flex">
      <div className="w-1 cursor-ew-resize bg-gray-200 hover:bg-gray-300" onMouseDown={onMouseDown} title="Drag to resize" />
      <div className="flex-1 p-3 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button className={`px-2 py-1 rounded ${tab==='selected'?'bg-gray-900 text-white':'bg-gray-100'}`} onClick={()=>setTab('selected')}>Selected</button>
            <button className={`px-2 py-1 rounded ${tab==='presets'?'bg-gray-900 text-white':'bg-gray-100'}`} onClick={()=>setTab('presets')}>Presets</button>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-gray-700" onClick={()=>setCollapsed(true)} title="Collapse">❯</button>
            <button disabled={!canUndo} className={`text-gray-700 ${!canUndo?'opacity-40':''}`} onClick={undo}>Undo</button>
            <button disabled={!canRedo} className={`text-gray-700 ${!canRedo?'opacity-40':''}`} onClick={redo}>Redo</button>
            <button className={`text-gray-700 ${filterMode?'underline':''}`} onClick={toggleFilterMode}>Filter</button>
          </div>
        </div>
      {tab === 'selected' && (
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="mb-2">
            {selector ? (
              <div className="flex items-center gap-2">
                {editingSelector ? (
                  <input className="flex-1 border border-blue-400 rounded px-1 py-0.5" value={selectorDraft} onChange={e=>setSelectorDraft(e.target.value)} placeholder="CSS selector" />
                ) : (
                  <strong className="truncate" title={selector}>{ov?.label || selector}</strong>
                )}
                {!editingSelector && <button className="text-blue-600 text-[12px]" onClick={()=>{ setSelectorDraft(selector); setEditingSelector(true); }}>edit</button>}
                {editingSelector && <button className="text-green-600 text-[12px]" onClick={()=>{ const newSel = selectorDraft.trim(); if (selector && newSel) { renameSelector(selector, newSel); } setEditingSelector(false); }}>save</button>}
                {editingSelector && <button className="text-gray-500 text-[12px]" onClick={()=>{ setEditingSelector(false); }}>cancel</button>}
                {selector && <button onClick={() => selector && clearSelector(selector)} className="text-red-600" title="Remove selector">✕</button>}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">Click an element to start editing.</p>
            )}
          </div>
          {selector && ov && (
            <>
              <div className="space-y-2">
                {COMMON_PROPS.map(p => (
                  <PropRow key={p.key} propKey={p.key} label={p.label} value={ov.props[p.key]} onChange={v => updateProp(selector, p.key, v)} onRemove={() => removeProp(selector, p.key)} />
                ))}
                {showAll && Object.entries(ov.props).filter(([k]) => !COMMON_PROPS.find(cp => cp.key === k)).map(([k,v]) => (
                  <PropRow key={k} propKey={k} label={k} value={v} onChange={val => updateProp(selector, k, val)} onRemove={() => removeProp(selector, k)} />
                ))}
              </div>
              <div className="flex gap-2 my-2">
                <input className="flex-1 border border-gray-300 rounded px-1 py-0.5" placeholder="prop" value={customProp} onChange={e=>setCustomProp(e.target.value)} />
                <input className="flex-1 border border-gray-300 rounded px-1 py-0.5" placeholder="value" value={customValue} onChange={e=>setCustomValue(e.target.value)} />
                <button className="px-2 border border-gray-300 rounded bg-gray-50" onClick={() => { if (customProp && customValue) { updateProp(selector, customProp, customValue); setCustomProp(''); setCustomValue(''); } }}>Add</button>
              </div>
              <div className="flex flex-wrap gap-2 items-center my-2">
                <button className="text-blue-600 hover:underline" onClick={() => setShowAll(s=>!s)}>{showAll ? 'Hide Others' : 'Show All'}</button>
                <button className="text-gray-700" onClick={async()=>{ try { const txt = await navigator.clipboard.readText(); pasteCss(txt); } catch {} }}>Paste</button>
                <button className="text-gray-700" onClick={() => { const css = exportCss(); navigator.clipboard?.writeText(css).catch(()=>{}); }}>Copy CSS</button>
                <button className="text-gray-700" onClick={() => { const json = exportJson(); navigator.clipboard?.writeText(json).catch(()=>{}); }}>Copy JSON</button>
                <button className="text-gray-700" onClick={() => {
                  const items = COMMON_PROPS.map(p=>p.key).filter(k=>overrides[selector].props[k]).map((k,i)=>({ selector, prop:k, token:`${k}-${i+1}` }));
                  const uniq: { selector:string; prop:string; token:string }[] = [];
                  const seen = new Set<string>();
                  items.forEach(it => { if(!seen.has(it.token)){ uniq.push(it); seen.add(it.token);} });
                  tokenize(uniq);
                }}>Tokenize</button>
                <button className="text-red-600" onClick={() => resetAll()}>Reset All</button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <input className="flex-1 border border-gray-300 rounded px-1 py-0.5" placeholder="Label" value={ov.label || ''} onChange={e=>setSelectorLabel(selector, e.target.value)} />
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center gap-2">
                  <input className="flex-1 border border-gray-300 rounded px-1 py-0.5" placeholder="Preset name" value={presetName} onChange={e=>setPresetName(e.target.value)} />
                  <button className="px-2 border border-gray-300 rounded bg-gray-50" onClick={()=>{ if (presetName) { savePreset(presetName, selector); setPresetName(''); } }}>Save Preset</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {tab === 'presets' && (
        <div className="flex-1 overflow-y-auto pr-1">
          {Object.keys(presets).length === 0 && (
            <p className="text-gray-600 text-sm">No presets yet. Save one from the Selected tab.</p>
          )}
          <div className="space-y-2">
            {Object.values(presets).map(p => (
              <div key={p.name} className="border border-gray-200 rounded p-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500 truncate" title={Object.entries(p.props).map(([k,v])=>`${k}: ${v}`).join('; ')}>
                    {Object.keys(p.props).slice(0,4).join(', ')}{Object.keys(p.props).length>4?'…':''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-2 py-1 rounded bg-gray-900 text-white" onClick={()=>applyPreset(p.name)}>Apply</button>
                  <button className="px-2 py-1 rounded border" onClick={()=>deletePreset(p.name)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

const colorLike = /color|background|shadow/i;
const PropRow: React.FC<{ propKey: string; label: string; value?: string; onChange: (v: string) => void; onRemove: () => void }> = ({ propKey, label, value, onChange, onRemove }) => {
  const isColor = colorLike.test(propKey);
  return (
    <div className="flex items-center gap-2">
      <label className="w-20 truncate" title={propKey}>{label}</label>
      {isColor && (
        <input
          type="color"
          className="w-7 h-7 p-0 border border-gray-300 rounded"
          value={(/^#[0-9a-fA-F]{6}$/).test(value||'') ? value : '#000000'}
          onChange={e=>onChange(e.target.value)}
          title={propKey}
        />
      )}
      <input className="flex-1 border border-gray-300 rounded px-1 py-0.5" value={value || ''} onChange={e=>onChange(e.target.value)} placeholder="value" />
      {isColor && <button className="text-[10px] px-1 py-0.5 border border-gray-300 rounded" onClick={() => {
        const resp = prompt(`${propKey} value:`, value || '');
        if (resp !== null) onChange(resp);
      }}>…</button>}
      {value && <button onClick={onRemove} className="text-red-500">×</button>}
    </div>
  );
};

const TokensPanel: React.FC = () => {
  const { tokens, deleteToken, updateToken } = useCssEdit();
  const names = Object.keys(tokens);
  if (!names.length) return null;
  return (
    <div className="css-edit-panel fixed bottom-2 right-2 z-[9998] w-64 max-h-60 overflow-y-auto bg-white border border-gray-300 shadow rounded-md p-2 text-[11px] space-y-2">
      <div className="flex items-center justify-between"><strong className="text-xs">Tokens</strong></div>
      {names.map(n => (
        <div key={n} className="flex items-center gap-1">
          <span className="flex-none text-gray-600 truncate" title={n}>--{n}</span>
            <input className="flex-1 border border-gray-300 rounded px-1 py-0.5" value={tokens[n]} onChange={e=>updateToken(n, e.target.value)} aria-label={`Token ${n} value`} title={`Token ${n} value`} placeholder="value" />
          <button className="text-red-500" onClick={()=>deleteToken(n)}>×</button>
        </div>
      ))}
    </div>
  );
};

const CssEditMiniBar: React.FC<{ onOff: () => void }> = ({ onOff }) => {
  return (
    <div className="css-edit-panel fixed top-2 right-2 z-[9999] px-2 py-1 bg-white/95 border border-gray-300 rounded shadow text-xs flex items-center gap-2">
      <span className="text-gray-700">CSS Edit: ON</span>
      <span className="text-gray-500">(Press Esc to exit)</span>
      <button className="px-2 py-0.5 rounded bg-gray-900 text-white" onClick={onOff}>Off</button>
    </div>
  );
};
