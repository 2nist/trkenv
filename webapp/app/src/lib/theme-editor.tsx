/* eslint-disable */
// Theme editor archived. See `webapp/theme-archive/` for the original implementation.

// Lightweight stubs kept to avoid breaking imports in the app after removing the interactive
// theme editor. If you need the full editor later, restore from `webapp/theme-archive/`.

import React from 'react';

export const ThemeEditor: React.FC<any> = () => null;
export const SidebarLayout: React.FC<any> = ({ children }) => <>{children}</>;
export const useThemeEditor = () => ({
  currentTheme: {},
  savedThemes: [],
  onThemeChange: () => {},
  onSaveTheme: () => {},
  onLoadTheme: () => {},
  onDeleteTheme: () => {},
});

export default ThemeEditor;