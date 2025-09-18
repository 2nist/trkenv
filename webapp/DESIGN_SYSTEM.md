# TRK Lab Design System Documentation

## Overview

This design system provides a comprehensive set of design tokens, components, and utilities for consistent styling across the TRK Lab application. It uses CSS custom properties (CSS variables) for theming and Tailwind CSS for utility classes.

## Design Tokens

### Color Palette

The design system includes a comprehensive color palette with semantic naming:

#### Primary Colors
- `primary-50` through `primary-950`: Full spectrum from light to dark
- Usage: Main brand colors, primary actions, links

#### Neutral Colors
- `neutral-50` through `neutral-950`: Grayscale palette
- Usage: Text, backgrounds, borders, subtle elements

#### Semantic Colors
- `success`: Green tones for positive states
- `warning`: Yellow/amber tones for caution states
- `error`: Red tones for error states
- `info`: Blue tones for informational states

#### Background Colors
- `bg-primary`: Main background
- `bg-secondary`: Secondary background (cards, panels)
- `bg-tertiary`: Tertiary background (hover states, accents)
- `bg-overlay`: Overlay backgrounds (modals, dropdowns)

#### Text Colors
- `text-primary`: Main text color
- `text-secondary`: Secondary text (subtitles, descriptions)
- `text-tertiary`: Tertiary text (placeholders, captions)
- `text-inverse`: Text on dark backgrounds

#### Border Colors
- `border-light`: Subtle borders
- `border-medium`: Standard borders
- `border-dark`: Strong borders

### Typography

#### Font Families
```css
--font-family-sans: 'Inter', system-ui, sans-serif;
--font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;
--font-family-handwritten: 'Sharpie-Regular', cursive;
--font-family-typewriter: 'Tox Typewriter', monospace;
--font-family-dymo: 'Dymo', sans-serif;
```

#### Font Sizes
- `xs`: 0.75rem (12px)
- `sm`: 0.875rem (14px)
- `base`: 1rem (16px)
- `lg`: 1.125rem (18px)
- `xl`: 1.25rem (20px)
- `2xl`: 1.5rem (24px)
- `3xl`: 1.875rem (30px)
- `4xl`: 2.25rem (36px)

#### Font Weights
- `thin`: 100
- `light`: 300
- `normal`: 400
- `medium`: 500
- `semibold`: 600
- `bold`: 700
- `extrabold`: 800
- `black`: 900

#### Line Heights
- `tight`: 1.25
- `snug`: 1.375
- `normal`: 1.5
- `relaxed`: 1.625
- `loose`: 2

### Spacing

The spacing system uses a consistent scale:
- `0`: 0px
- `px`: 1px
- `0.5`: 0.125rem (2px)
- `1`: 0.25rem (4px)
- `2`: 0.5rem (8px)
- `3`: 0.75rem (12px)
- `4`: 1rem (16px)
- `6`: 1.5rem (24px)
- `8`: 2rem (32px)
- `12`: 3rem (48px)
- `16`: 4rem (64px)
- `24`: 6rem (96px)

### Borders

#### Border Radius
- `none`: 0px
- `sm`: 0.125rem (2px)
- `DEFAULT`: 0.25rem (4px)
- `md`: 0.375rem (6px)
- `lg`: 0.5rem (8px)
- `xl`: 0.75rem (12px)
- `2xl`: 1rem (16px)
- `3xl`: 1.5rem (24px)
- `full`: 9999px

#### Border Width
- `0`: 0px
- `1`: 1px (default)
- `2`: 2px
- `4`: 4px
- `8`: 8px

### Shadows

- `none`: No shadow
- `xs`: Subtle shadow
- `sm`: Small shadow
- `DEFAULT`: Standard shadow
- `md`: Medium shadow
- `lg`: Large shadow
- `xl`: Extra large shadow
- `2xl`: Double extra large shadow
- `inner`: Inner shadow

## Usage Examples

### Using Design Tokens in Tailwind Classes

```tsx
// Colors
<div className="bg-primary-500 text-text-inverse">
  Primary button
</div>

// Typography
<h1 className="text-4xl font-bold text-text-primary leading-tight">
  Heading
</h1>

<p className="text-base text-text-secondary leading-relaxed">
  Body text
</p>

// Spacing
<div className="p-6 space-y-4">
  <div>Content</div>
</div>

// Borders and shadows
<div className="border border-border-medium rounded-lg shadow-md">
  Card content
</div>
```

### Using Component Library

```tsx
import { Button, Card, Input, Heading, Text } from './lib/design-system';

// Buttons
<Button variant="primary" size="lg">
  Primary Action
</Button>

<Button variant="secondary" size="md">
  Secondary Action
</Button>

<Button variant="outline" size="sm">
  Outline Action
</Button>

// Cards
<Card variant="elevated" padding="lg">
  <Heading level={2}>Card Title</Heading>
  <Text>Card content with proper spacing and typography.</Text>
</Card>

// Forms
<Input
  variant="default"
  size="md"
  placeholder="Enter your name"
  onChange={setName}
/>
```

### Custom Components with Design Tokens

```tsx
const CustomCard = ({ children, variant = 'default' }) => {
  const baseClasses = 'bg-bg-primary border border-border-light rounded-lg';
  const variantClasses = {
    default: 'shadow-sm',
    elevated: 'shadow-lg',
    outlined: 'border-border-medium shadow-none',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} p-6`}>
      {children}
    </div>
  );
};
```

## Theme System

The design system supports dynamic theming through CSS custom properties. Themes are defined in JSON files and loaded via the theme loader.

### Theme Structure

```json
{
  "colors": {
    "primary": {
      "50": "#f0f9ff",
      "500": "#3b82f6",
      "900": "#1e3a8a"
    },
    "bg": {
      "primary": "#ffffff",
      "secondary": "#f8fafc"
    }
  },
  "fonts": {
    "sans": "Inter",
    "mono": "JetBrains Mono"
  }
}
```

### Switching Themes

```javascript
// Using the theme loader
import { loadTheme } from './theme/theme-loader.js';

loadTheme('midnight'); // Switch to midnight theme
```

## Best Practices

### 1. Use Semantic Tokens
```tsx
// ✅ Good: Use semantic tokens
<div className="bg-bg-primary text-text-primary">

// ❌ Avoid: Hardcoded colors
<div className="bg-white text-gray-900">
```

### 2. Consistent Spacing
```tsx
// ✅ Good: Use spacing scale
<div className="p-6 space-y-4">

// ❌ Avoid: Arbitrary values
<div className="p-5 space-y-3.5">
```

### 3. Component Composition
```tsx
// ✅ Good: Compose with design system components
<Card>
  <Heading level={3}>Title</Heading>
  <Text>Content</Text>
  <Button>Action</Button>
</Card>

// ❌ Avoid: Inline styles
<div className="bg-white p-4 rounded shadow">
  <h3 className="text-lg font-bold">Title</h3>
  <p>Content</p>
  <button className="bg-blue-500 text-white px-4 py-2 rounded">
    Action
  </button>
</div>
```

### 4. Responsive Design
```tsx
// ✅ Good: Mobile-first responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// ❌ Avoid: Fixed breakpoints
<div className="flex flex-col lg:flex-row">
```

## Migration Guide

### From Legacy Classes to Design Tokens

```tsx
// Before (legacy)
<div className="bg-white text-gray-900 border border-gray-200 rounded shadow-sm">

// After (design tokens)
<div className="bg-bg-primary text-text-primary border border-border-light rounded shadow-sm">
```

### Component Refactoring

1. Replace hardcoded colors with semantic tokens
2. Use spacing scale instead of arbitrary values
3. Apply consistent typography classes
4. Use component library for common patterns

## File Structure

```
webapp/
├── theme/
│   ├── tokens.css          # Design token definitions
│   ├── themes/             # Theme JSON files
│   │   ├── current.json
│   │   ├── midnight.json
│   │   └── ...
│   └── theme-loader.js     # Theme loading logic
├── app/
│   ├── tailwind.config.ts  # Tailwind configuration
│   └── src/
│       └── lib/
│           └── design-system.tsx  # Component library
```

## Contributing

When adding new components or tokens:

1. Define tokens in `tokens.css` first
2. Update `tailwind.config.ts` to expose tokens
3. Add component styles to `design-system.tsx`
4. Update this documentation
5. Test across all themes

## Support

For questions about the design system:
- Check this documentation first
- Review the component library examples
- Test changes across different themes
- Ensure accessibility compliance