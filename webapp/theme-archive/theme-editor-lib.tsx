// Archived theme-editor lib (minimal stub to keep history)

export const ThemeEditor = () => null;
export const SidebarLayout = ({ children }: any) => children;
export const useThemeEditor = () => ({
  currentTheme: {},
  savedThemes: [],
  onThemeChange: () => {},
  onSaveTheme: () => {},
  onLoadTheme: () => {},
  onDeleteTheme: () => {},
});

export default ThemeEditor;
