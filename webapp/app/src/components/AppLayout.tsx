import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ThemeEditor, useThemeEditor } from '../lib/theme-editor';
import { Button } from '@/src/lib/design-system';
import { CssEditProvider, useCssEdit } from '../lib/css-edit-mode';
import LabMenu from './LabMenu';
import { NAV_SECTIONS } from './nav/nav-config';

// ===== THEME EDITOR SIDEBAR INTEGRATION =====

interface AppLayoutProps {
  children: React.ReactNode;
  showThemeEditor?: boolean;
  onToggleThemeEditor?: () => void;
}

const LayoutInner: React.FC<AppLayoutProps> = ({
  children,
  showThemeEditor = false,
  onToggleThemeEditor,
}) => {
  const themeEditor = useThemeEditor();
  let cssEdit: ReturnType<typeof useCssEdit> | undefined;
  try { cssEdit = useCssEdit(); } catch {}

  // Left sidebar: resizable & collapsible
  const [sbWidth, setSbWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 320; // ~w-80
    const saved = Number(localStorage.getItem('app-left-sidebar-width'));
    return Number.isFinite(saved) && saved >= 220 && saved <= 540 ? saved : 320;
  });
  const [sbCollapsed, setSbCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('app-left-sidebar-collapsed') === '1';
  });
  const sbResizingRef = useRef<null | { startX: number; startW: number }>(null);

  useEffect(() => {
    // Persist and apply width via CSS variable to avoid inline styles
    try { localStorage.setItem('app-left-sidebar-width', String(sbWidth)); } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--app-left-sidebar-width', `${Math.round(sbWidth)}px`);
    }
  }, [sbWidth]);
  useEffect(() => { try { localStorage.setItem('app-left-sidebar-collapsed', sbCollapsed ? '1' : '0'); } catch {} }, [sbCollapsed]);

  const onSbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    sbResizingRef.current = { startX: e.clientX, startW: sbWidth };
    const onMove = (ev: MouseEvent) => {
      if (!sbResizingRef.current) return;
      const dx = ev.clientX - sbResizingRef.current.startX; // dragging right increases width
      let next = sbResizingRef.current.startW + dx;
      next = Math.max(220, Math.min(540, next));
      setSbWidth(next);
    };
    const onUp = () => {
      sbResizingRef.current = null;
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
    };
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      {/* Left Sidebar */}
  {!sbCollapsed ? (
        <div className="app-left-sidebar relative border-r border-[color:var(--border,#2a2d33)] bg-[var(--panel)] flex flex-col" data-css-ignore>
        {/* Sidebar Header */}
  <div className="p-4 border-b border-[color:var(--border,#2a2d33)] bg-[var(--surface)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--text)]">Navigation</h2>
            <div className="flex gap-2">
              {cssEdit && (
                <Button
                  data-css-ignore
                  variant={cssEdit.enabled ? 'primary' : 'outline'}
                  size="sm"
                  onClick={cssEdit.toggle}
                >
                  {cssEdit.enabled ? 'CSS Edit: ON' : 'CSS Edit'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Content */}
  <div className="flex-1 overflow-hidden text-[var(--text)]">
            <div className="p-4 space-y-4">
              {/* Navigation Links */}
                <div className="space-y-6">
                  {NAV_SECTIONS.map(section => (
                    <div key={section.title} className="space-y-2">
                      <h3 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
                        {section.title}
                      </h3>
                      <nav className="space-y-1">
                        {section.items.map(item => (
                          <Link key={item.label} href={item.href || '#'} className="block px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface)] rounded-md transition-colors">
                            {item.label}
                          </Link>
                        ))}
                      </nav>
                    </div>
                  ))}
                  <div className="border-t border-[color:var(--border,#2a2d33)] pt-4">
                    <h3 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">Lab Modules</h3>
                    <LabMenu />
                  </div>
                </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 text-sm text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--panel)] border border-[color:var(--border,#2a2d33)] rounded-md transition-colors text-left radius-var">
                    New Project
                  </button>
                  <button className="w-full px-3 py-2 text-sm text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--panel)] border border-[color:var(--border,#2a2d33)] rounded-md transition-colors text-left radius-var">
                    Import
                  </button>
                  <button className="w-full px-3 py-2 text-sm text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--panel)] border border-[color:var(--border,#2a2d33)] rounded-md transition-colors text-left radius-var">
                    Export
                  </button>
                </div>
              </div>

              {/* Current Theme Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">
                  Current Theme
                </h3>
                <div className="p-3 bg-[var(--surface)] rounded-md border border-[color:var(--border,#2a2d33)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border border-gray-300"></div>
                    <span className="text-sm font-medium text-[var(--text)]">
                      {themeEditor.currentTheme.name}
                    </span>
                  </div>
                  <p className="text-xs text-[color:var(--muted)]">
                    Click "Theme Editor" to customize
                  </p>
                </div>
              </div>
            </div>
        </div>
          {/* Resize handle */}
          <div
            className="absolute top-0 right-0 h-full w-1 cursor-ew-resize bg-transparent hover:bg-white/10"
            onMouseDown={onSbMouseDown}
            data-css-ignore
            title="Drag to resize"
          />
          {/* Collapse button */}
          <button
            className="absolute top-2 -right-3 w-6 h-6 rounded-full bg-white text-gray-700 border border-gray-300 shadow flex items-center justify-center"
            onClick={() => setSbCollapsed(true)}
            data-css-ignore
            title="Collapse sidebar"
          >
            ❯
          </button>
        </div>
      ) : (
        <div className="relative" data-css-ignore>
          {/* Collapsed rail (very small, just a toggle) */}
          <div className="bg-[var(--panel)] border-r border-[color:var(--border,#2a2d33)] w-2 h-full" />
          <button
            className="absolute top-2 left-1 w-6 h-6 rounded-full bg-white text-gray-700 border border-gray-300 shadow flex items-center justify-center"
            onClick={() => setSbCollapsed(false)}
            data-css-ignore
            title="Expand sidebar"
          >
            ❮
          </button>
        </div>
      )}

      {/* Main Content */}
  <div className="flex-1 bg-[var(--bg)] overflow-auto">
        {children}
      </div>
    </div>
  );
};

export const AppLayout: React.FC<AppLayoutProps> = (props) => (
  <CssEditProvider>
    <LayoutInner {...props} />
  </CssEditProvider>
);

// ===== HOOK FOR LAYOUT STATE =====

export const useAppLayout = () => {
  const [showThemeEditor, setShowThemeEditor] = useState(false);

  const toggleThemeEditor = () => {
    setShowThemeEditor(!showThemeEditor);
  };

  return {
    showThemeEditor,
    toggleThemeEditor,
  };
};