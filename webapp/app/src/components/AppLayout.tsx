import React, { useState } from 'react';
import { ThemeEditor, useThemeEditor } from '../lib/theme-editor';
import { Button } from '../lib/design-system';
import { CssEditProvider, useCssEdit } from '../lib/css-edit-mode';

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

  return (
    <div className="flex min-h-screen bg-[var(--page-bg,#ffffff)]">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-[var(--layout-sidebar-bg,#f7f7f9)] flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 bg-[var(--layout-header-bg,#ffffff)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {showThemeEditor ? 'Theme Editor' : 'Navigation'}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleThemeEditor}
              >
                {showThemeEditor ? 'Navigation' : 'Theme Editor'}
              </Button>
              {cssEdit && (
                <Button
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
        <div className="flex-1 overflow-hidden">
          {showThemeEditor ? (
            <div className="h-full">
              <ThemeEditor {...themeEditor} />
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Navigation Links */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
                  Navigation
                </h3>
                <nav className="space-y-1">
                  <a
                    href="/"
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Home
                  </a>
                  <a
                    href="/design"
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Design System
                  </a>
                  <a
                    href="/theme-editor"
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Theme Editor
                  </a>
                  <a
                    href="/songs"
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Songs
                  </a>
                  <a
                    href="/timeline"
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Timeline
                  </a>
                </nav>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 text-sm text-gray-700 bg-[var(--layout-surface-bg,#ffffff)] hover:bg-gray-100 border border-gray-300 rounded-md transition-colors text-left radius-var">
                    New Project
                  </button>
                  <button className="w-full px-3 py-2 text-sm text-gray-700 bg-[var(--layout-surface-bg,#ffffff)] hover:bg-gray-100 border border-gray-300 rounded-md transition-colors text-left radius-var">
                    Import
                  </button>
                  <button className="w-full px-3 py-2 text-sm text-gray-700 bg-[var(--layout-surface-bg,#ffffff)] hover:bg-gray-100 border border-gray-300 rounded-md transition-colors text-left radius-var">
                    Export
                  </button>
                </div>
              </div>

              {/* Current Theme Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
                  Current Theme
                </h3>
                <div className="p-3 bg-[var(--layout-surface-bg,#ffffff)] rounded-md border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border border-gray-300"></div>
                    <span className="text-sm font-medium text-gray-900">
                      {themeEditor.currentTheme.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Click "Theme Editor" to customize
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-[var(--page-bg,#ffffff)] overflow-auto">
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