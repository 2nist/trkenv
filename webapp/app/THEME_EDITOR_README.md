# 🎨 Theme Editor

A powerful GUI component for customizing your design system in real-time.

## ✨ Features

- **🎨 Core Styling**: Colors, typography, and spacing controls
- **⚡ Advanced Options**: Effects, font weights, and line heights
- **💾 Theme Management**: Save, load, and delete custom themes
- **🔄 Live Preview**: See changes instantly applied
- **📱 Responsive**: Works perfectly in sidebar layouts

## 🚀 Quick Start

```tsx
import { ThemeEditor, SidebarLayout, useThemeEditor } from './lib/theme-editor';

function MyApp() {
  const themeEditor = useThemeEditor();

  return (
    <SidebarLayout
      showThemeEditor={true}
      themeEditorProps={themeEditor}
    >
      <YourAppContent />
    </SidebarLayout>
  );
}
```

## 🎛️ Controls

### Core Tab
- **Colors**: Primary, neutral, semantic, and background colors
- **Typography**: Font family, sizes, and basic weights
- **Spacing**: Base, component, and section spacing

### Advanced Tab
- **Effects**: Border radius, shadows, and blur effects
- **Font Weights**: Normal, medium, semibold, and bold weights
- **Line Heights**: Normal, relaxed, and loose line heights

### Themes Tab
- **Save Theme**: Save current theme with custom name
- **Load Theme**: Load previously saved themes
- **Delete Theme**: Remove unwanted themes

## 🎯 Usage Examples

### Basic Theme Customization
```tsx
const themeEditor = useThemeEditor();

// Change primary color
themeEditor.onThemeChange({
  ...themeEditor.currentTheme,
  colors: {
    ...themeEditor.currentTheme.colors,
    primary: '#ff6b6b'
  }
});
```

### Save Custom Theme
```tsx
themeEditor.onSaveTheme({
  ...themeEditor.currentTheme,
  name: 'My Custom Theme'
});
```

### Load Saved Theme
```tsx
const savedTheme = themeEditor.savedThemes.find(t => t.name === 'Dark Mode');
if (savedTheme) {
  themeEditor.onLoadTheme(savedTheme);
}
```

## 🔧 Integration

### With Next.js Pages
```tsx
// pages/theme-editor.tsx
import ThemeEditorDemo from '../components/ThemeEditorDemo';

// NOTE: The Theme Editor has been archived. The original interactive editor
// and related assets were moved to `webapp/theme-archive/`. The project now
// keeps minimal no-op shims to avoid breaking imports; Tailwind tokens remain
// the canonical source of runtime design variables.

export default function ThemeEditorPage() {
  return <div>The Theme Editor has been archived. See webapp/theme-archive/</div>;
}
```

### With App Router
```tsx
// app/theme-editor/page.tsx
import ThemeEditorDemo from '../../components/ThemeEditorDemo';

export default function ThemeEditorPage() {
  return <ThemeEditorDemo />;
}
```

## 🎨 Customization

### Custom Color Pickers
```tsx
<ColorPicker
  label="Accent Color"
  value={theme.colors.accent}
  path="colors.accent"
/>
```

### Custom Range Sliders
```tsx
<RangeSlider
  label="Custom Property"
  value="16px"
  path="custom.property"
  min={8}
  max={32}
  step={2}
  unit="px"
/>
```

### Custom Select Controls
```tsx
<SelectControl
  label="Animation Speed"
  value="normal"
  path="animation.speed"
  options={[
    { value: 'slow', label: 'Slow' },
    { value: 'normal', label: 'Normal' },
    { value: 'fast', label: 'Fast' }
  ]}
/>
```

## 💾 Persistence

Themes are automatically saved to `localStorage` with the key `custom-themes`. The theme editor will:

- Load saved themes on component mount
- Save themes when you click "Save Theme"
- Apply themes to CSS variables in real-time
- Persist theme changes across browser sessions

## 🎯 Best Practices

1. **Start with Core**: Begin with basic colors and typography
2. **Test Across Components**: Use the live preview to test changes
3. **Save Iterations**: Save different versions as you refine
4. **Consider Accessibility**: Test color contrast and readability
5. **Document Themes**: Use descriptive names for saved themes

## 🔄 Live Preview

The theme editor provides instant visual feedback:

- **Real-time Updates**: Changes apply immediately
- **Component Gallery**: See effects on buttons, cards, typography
- **Color Palette**: Visual color swatches
- **Typography Scale**: Live text examples
- **Spacing Examples**: Visual spacing demonstrations

## 🎨 Design System Integration

Works seamlessly with your existing design tokens:

- Maps to CSS custom properties
- Integrates with Tailwind utilities
- Supports your component library
- Maintains design consistency

## 🚀 Advanced Features

- **Theme Inheritance**: Build upon existing themes
- **Export/Import**: Share themes between projects
- **Version Control**: Track theme changes over time
- **Collaboration**: Share theme configurations

---

**Ready to customize?** Open the theme editor and start creating your perfect design system! 🎨✨