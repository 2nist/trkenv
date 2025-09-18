/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Button } from './design-system';

// ===== THEME EDITOR COMPONENT =====

interface Theme {
  name: string;
  colors: {
    primary: string;
    neutral: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      overlay: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
    };
    border: {
      light: string;
      medium: string;
      dark: string;
    };
  };
  typography: {
    fontFamily: string;
    fontSize: {
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
    leading: {
      normal: string;
      relaxed: string;
      loose: string;
    };
    dymo: {
      fontSize: {
        base: string;
        lg: string;
        xl: string;
        '2xl': string;
      };
      letterSpacing: string;
      color: string;
    };
  };
  spacing: {
    base: string;
    component: string;
    section: string;
  };
  borders: {
    showBorders: boolean;
    thickness: string;
    borderStyle: string;
  };
  effects: {
    borderRadius: string;
    shadow: string;
    blur: string;
  };
  page?: {
    bgColor: string;
    bgImage: string; // CSS image value e.g., url('/path') or 'none'
    bgRepeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
    bgAttachment: 'scroll' | 'fixed' | 'local';
    bgSize: 'auto' | 'cover' | 'contain';
    bgPosition: 'center' | 'top' | 'bottom' | 'left' | 'right';
    opacity: number; // 0..1 applied to bg color
    applyTo?: 'page' | 'body'; // where to apply background
  };
  grid?: {
    show: boolean;
    // Prefer logical sizing names; keep legacy keys optional for backward compatibility
    inlineSize?: string; // logical width, e.g., '64px'
    blockSize?: string;  // logical height, e.g., '64px'
    // Legacy keys (deprecated):
    colWidth?: string;   // legacy width
    rowHeight?: string;  // legacy height
    color: string; // rgba color string for grid lines
  };
}

interface ThemeEditorProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSaveTheme: (theme: Theme) => void;
  savedThemes: Theme[];
  onLoadTheme: (theme: Theme) => void;
  onDeleteTheme: (themeName: string) => void;
}

export const ThemeEditor: React.FC<ThemeEditorProps> = ({
  currentTheme,
  onThemeChange,
  onSaveTheme,
  savedThemes,
  onLoadTheme,
  onDeleteTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'core' | 'fonts' | 'borders' | 'page' | 'grid' | 'advanced' | 'themes'>('core');
  // Add tabs for page and grid
  const tabs: { id: any; label: string }[] = [
    { id: 'core', label: 'Core' },
    { id: 'fonts', label: 'Fonts' },
    { id: 'borders', label: 'Borders' },
    { id: 'page', label: 'Page' },
    { id: 'grid', label: 'Grid' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'themes', label: 'Themes' },
  ];
  const [themeName, setThemeName] = useState('');

  const updateTheme = (path: string, value: string | boolean) => {
    const newTheme = { ...currentTheme };
    const keys = path.split('.');
    let current: any = newTheme;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (current[k] === undefined || current[k] === null) {
        current[k] = {};
      }
      current = current[k];
    }
    current[keys[keys.length - 1]] = value;

    onThemeChange(newTheme);
  };

  const ColorPicker: React.FC<{
    label: string;
    value: string;
    path: string;
  }> = ({ label, value, path }) => {
    const idBase = `cp-${path.replace(/[^a-z0-9_-]/gi, '-')}`;
    const [text, setText] = React.useState(value);
    React.useEffect(() => {
      setText(value);
    }, [value]);

    const isValidColor = (s: string) => {
      if (!s) return false;
      const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
      const rgba = /^rgba?\((\s*\d+\s*,){2}\s*\d+\s*(,\s*(0|1|0?\.\d+))?\)$/;
      return hex.test(s) || rgba.test(s);
    };
    return (
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 min-w-0 flex-1" htmlFor={`${idBase}-text`}>{label}</label>
        <div className="flex items-center gap-2">
          <input
            id={`${idBase}-color`}
            type="color"
            value={value}
            title={`${label} color`}
            onChange={(e) => updateTheme(path, e.target.value)}
            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
          />
          <input
            id={`${idBase}-text`}
            type="text"
            value={text}
            title={`${label} color value`}
            placeholder="#RRGGBB or rgba(...)"
            onChange={(e) => {
              const v = e.target.value;
              setText(v);
              if (isValidColor(v)) {
                updateTheme(path, v);
              }
            }}
            onBlur={() => {
              if (!isValidColor(text)) {
                setText(value);
              } else if (text !== value) {
                updateTheme(path, text);
              }
            }}
            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded bg-white"
          />
        </div>
      </div>
    );
  };

  const RangeSlider: React.FC<{
    label: string;
    value: string;
    path: string;
    min: number;
    max: number;
    step: number;
    unit: string;
  }> = ({ label, value, path, min, max, step, unit }) => {
    const numericValue = parseFloat(value);
    const id = `rs-${path.replace(/[^a-z0-9_-]/gi, '-')}`;
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700" htmlFor={id}>{label}</label>
          <span className="text-xs text-gray-500">{numericValue}{unit}</span>
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={numericValue}
          onChange={(e) => updateTheme(path, `${e.target.value}${unit}`)}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    );
  };

  const SelectControl: React.FC<{
    label: string;
    value: string;
    path: string;
    options: { value: string; label: string }[];
  }> = ({ label, value, path, options }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700" htmlFor={`sel-${path.replace(/[^a-z0-9_-]/gi, '-')}`}>{label}</label>
      <select
        id={`sel-${path.replace(/[^a-z0-9_-]/gi, '-')}`}
        value={value}
        onChange={(e) => updateTheme(path, e.target.value)}
        title={label}
        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const ToggleControl: React.FC<{
    label: string;
    value: boolean;
    path: string;
  }> = ({ label, value, path }) => (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <button
        onClick={() => updateTheme(path, !value)}
        aria-label={label}
        title={label}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const CoreStylingTab = () => (
    <div className="space-y-6">
      {/* Colors Section */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Colors</h3>

        <div className="space-y-4">
          <ColorPicker label="Primary" value={currentTheme.colors.primary} path="colors.primary" />
          <ColorPicker label="Neutral" value={currentTheme.colors.neutral} path="colors.neutral" />
          <ColorPicker label="Success" value={currentTheme.colors.success} path="colors.success" />
          <ColorPicker label="Warning" value={currentTheme.colors.warning} path="colors.warning" />
          <ColorPicker label="Error" value={currentTheme.colors.error} path="colors.error" />
          <ColorPicker label="Info" value={currentTheme.colors.info} path="colors.info" />
        </div>

        <div className="mt-6 space-y-4">
          <h4 className="text-md font-medium text-gray-800">Background Colors</h4>
          <ColorPicker label="Primary BG" value={currentTheme.colors.background.primary} path="colors.background.primary" />
          <ColorPicker label="Secondary BG" value={currentTheme.colors.background.secondary} path="colors.background.secondary" />
          <ColorPicker label="Tertiary BG" value={currentTheme.colors.background.tertiary} path="colors.background.tertiary" />
        </div>

        <div className="mt-6 space-y-4">
          <h4 className="text-md font-medium text-gray-800">Text Colors</h4>
          <ColorPicker label="Primary Text" value={currentTheme.colors.text.primary} path="colors.text.primary" />
          <ColorPicker label="Secondary Text" value={currentTheme.colors.text.secondary} path="colors.text.secondary" />
          <ColorPicker label="Tertiary Text" value={currentTheme.colors.text.tertiary} path="colors.text.tertiary" />
        </div>
      </div>

      {/* Spacing Section */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spacing</h3>

        <div className="space-y-4">
          <RangeSlider
            label="Base Spacing"
            value={currentTheme.spacing.base}
            path="spacing.base"
            min={4}
            max={16}
            step={1}
            unit="px"
          />
          <RangeSlider
            label="Component Spacing"
            value={currentTheme.spacing.component}
            path="spacing.component"
            min={8}
            max={32}
            step={2}
            unit="px"
          />
          <RangeSlider
            label="Section Spacing"
            value={currentTheme.spacing.section}
            path="spacing.section"
            min={16}
            max={64}
            step={4}
            unit="px"
          />
        </div>
      </div>
    </div>
  );

  const FontsTab = () => (
    <div className="space-y-6">
      {/* General Typography */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">General Typography</h3>

        <SelectControl
          label="Font Family"
          value={currentTheme.typography.fontFamily}
          path="typography.fontFamily"
          options={[
            { value: 'Inter, system-ui, sans-serif', label: 'Inter (Sans)' },
            { value: "'JetBrains Mono', 'Fira Code', monospace", label: 'JetBrains Mono' },
            { value: "'Sharpie-Regular', 'Kalam', cursive", label: 'Sharpie (Handwritten)' },
            { value: "'Tox Typewriter', 'Courier New', monospace", label: 'Typewriter' },
            { value: "'Dymo', 'Impact', sans-serif", label: 'Dymo' },
          ]}
        />

        <div className="mt-4 grid grid-cols-2 gap-4">
          <RangeSlider
            label="Base Font Size"
            value={currentTheme.typography.fontSize.base}
            path="typography.fontSize.base"
            min={12}
            max={24}
            step={1}
            unit="px"
          />
          <RangeSlider
            label="Large Font Size"
            value={currentTheme.typography.fontSize.lg}
            path="typography.fontSize.lg"
            min={14}
            max={32}
            step={1}
            unit="px"
          />
        </div>
      </div>

      {/* Sharpie Font Controls (mapped from former Dymo) */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sharpie Font Controls</h3>

        <div className="space-y-4">
          <ColorPicker label="Sharpie Text Color" value={currentTheme.typography.dymo.color} path="typography.dymo.color" />

          <div className="grid grid-cols-2 gap-4">
            <RangeSlider
              label="Sharpie Base Size"
              value={currentTheme.typography.dymo.fontSize.base}
              path="typography.dymo.fontSize.base"
              min={16}
              max={48}
              step={2}
              unit="px"
            />
            <RangeSlider
              label="Sharpie Large Size"
              value={currentTheme.typography.dymo.fontSize.lg}
              path="typography.dymo.fontSize.lg"
              min={20}
              max={64}
              step={2}
              unit="px"
            />
          </div>

          <RangeSlider
            label="Sharpie Letter Spacing"
            value={currentTheme.typography.dymo.letterSpacing}
            path="typography.dymo.letterSpacing"
            min={-0.2}
            max={0.2}
            step={0.01}
            unit="em"
          />
        </div>
      </div>

      {/* Font Weights */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Font Weights</h3>

        <div className="grid grid-cols-2 gap-4">
          <SelectControl
            label="Normal Weight"
            value={currentTheme.typography.fontWeight.normal}
            path="typography.fontWeight.normal"
            options={[
              { value: '300', label: 'Light (300)' },
              { value: '400', label: 'Regular (400)' },
              { value: '500', label: 'Medium (500)' },
            ]}
          />
          <SelectControl
            label="Bold Weight"
            value={currentTheme.typography.fontWeight.bold}
            path="typography.fontWeight.bold"
            options={[
              { value: '600', label: 'Semi Bold (600)' },
              { value: '700', label: 'Bold (700)' },
              { value: '800', label: 'Extra Bold (800)' },
              { value: '900', label: 'Black (900)' },
            ]}
          />
        </div>
      </div>

      {/* Line Heights */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Heights</h3>

        <div className="space-y-4">
          <RangeSlider
            label="Normal Line Height"
            value={currentTheme.typography.leading.normal}
            path="typography.leading.normal"
            min={1}
            max={2}
            step={0.1}
            unit=""
          />
          <RangeSlider
            label="Relaxed Line Height"
            value={currentTheme.typography.leading.relaxed}
            path="typography.leading.relaxed"
            min={1.2}
            max={2.5}
            step={0.1}
            unit=""
          />
        </div>
      </div>
    </div>
  );

  const PageTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Page Background</h3>
        <div className="space-y-4">
          <ColorPicker label="Background Color" value={currentTheme.page?.bgColor || '#B79F7C'} path="page.bgColor" />
          <RangeSlider label="Color Opacity" value={(currentTheme.page?.opacity ?? 1).toString()} path="page.opacity" min={0} max={1} step={0.05} unit="" />
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Computed RGBA:</span>
            <span>
              {(() => {
                const hex = currentTheme.page?.bgColor || '#ffffff';
                const op = currentTheme.page?.opacity ?? 1;
                const h = hex.replace('#','');
                const full = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
                const r = parseInt(full.substring(0,2),16) || 255;
                const g = parseInt(full.substring(2,4),16) || 255;
                const b = parseInt(full.substring(4,6),16) || 255;
                const a = Math.max(0, Math.min(1, Number(op)));
                return `rgba(${r}, ${g}, ${b}, ${a})`;
              })()}
            </span>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Background Image (URL)</label>
            <input type="text" value={currentTheme.page?.bgImage || ''} onChange={(e)=>updateTheme('page.bgImage', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900" placeholder="e.g., url('/images/bg.png') or leave blank" />
          </div>
          <SelectControl label="Apply To" value={currentTheme.page?.applyTo || 'page'} path="page.applyTo" options={[
            { value: 'page', label: 'Page (html + body)' },
            { value: 'body', label: 'Body only' },
          ]} />
          <SelectControl label="Repeat" value={currentTheme.page?.bgRepeat || 'repeat'} path="page.bgRepeat" options={[
            { value: 'no-repeat', label: 'no-repeat' },
            { value: 'repeat', label: 'repeat' },
            { value: 'repeat-x', label: 'repeat-x' },
            { value: 'repeat-y', label: 'repeat-y' },
          ]} />
          <SelectControl label="Attachment" value={currentTheme.page?.bgAttachment || 'scroll'} path="page.bgAttachment" options={[
            { value: 'scroll', label: 'scroll' },
            { value: 'fixed', label: 'fixed' },
            { value: 'local', label: 'local' },
          ]} />
          <SelectControl label="Size" value={currentTheme.page?.bgSize || 'auto'} path="page.bgSize" options={[
            { value: 'auto', label: 'auto' },
            { value: 'cover', label: 'cover' },
            { value: 'contain', label: 'contain' },
          ]} />
          <SelectControl label="Position" value={currentTheme.page?.bgPosition || 'center'} path="page.bgPosition" options={[
            { value: 'center', label: 'center' },
            { value: 'top', label: 'top' },
            { value: 'bottom', label: 'bottom' },
            { value: 'left', label: 'left' },
            { value: 'right', label: 'right' },
          ]} />
        </div>
      </div>
    </div>
  );

  const GridTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Layout Grid Overlay</h3>
        <div className="space-y-4">
          <ToggleControl label="Show Grid" value={currentTheme.grid?.show || false} path="grid.show" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Inline Size (px)</label>
              <input
                id="grid-inline-size"
                type="number"
                title="Grid inline size in pixels"
                placeholder="e.g., 64"
                value={parseInt(currentTheme.grid?.inlineSize || currentTheme.grid?.colWidth || '64')}
                onChange={(e)=>updateTheme('grid.inlineSize', `${e.target.value}px`)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Block Size (px)</label>
              <input
                id="grid-block-size"
                type="number"
                title="Grid block size in pixels"
                placeholder="e.g., 64"
                value={parseInt(currentTheme.grid?.blockSize || currentTheme.grid?.rowHeight || '64')}
                onChange={(e)=>updateTheme('grid.blockSize', `${e.target.value}px`)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Grid Color (RGBA)</label>
            <input type="text" value={currentTheme.grid?.color || 'rgba(0,0,0,0.15)'} onChange={(e)=>updateTheme('grid.color', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900" placeholder="e.g., rgba(0,0,0,0.15)" />
          </div>
        </div>
      </div>
    </div>
  );

  const BordersTab = () => (
    <div className="space-y-6">
      {/* Border Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Border Settings</h3>

        <div className="space-y-4">
          <ToggleControl
            label="Show Borders"
            value={currentTheme.borders.showBorders}
            path="borders.showBorders"
          />

          <RangeSlider
            label="Border Width"
            value={currentTheme.borders.thickness}
            path="borders.thickness"
            min={0}
            max={4}
            step={0.5}
            unit="px"
          />

          <SelectControl
            label="Border Style"
            value={currentTheme.borders.borderStyle}
            path="borders.borderStyle"
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'dashed', label: 'Dashed' },
              { value: 'dotted', label: 'Dotted' },
              { value: 'none', label: 'None' },
            ]}
          />
        </div>
      </div>

      {/* Border Colors */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Border Colors</h3>

        <div className="space-y-4">
          <ColorPicker label="Light Border" value={currentTheme.colors.border.light} path="colors.border.light" />
          <ColorPicker label="Medium Border" value={currentTheme.colors.border.medium} path="colors.border.medium" />
          <ColorPicker label="Dark Border" value={currentTheme.colors.border.dark} path="colors.border.dark" />
        </div>
      </div>
    </div>
  );

  const AdvancedStylingTab = () => (
    <div className="space-y-6">
      {/* Effects Section */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Effects</h3>

        <div className="space-y-4">
          <RangeSlider
            label="Border Radius"
            value={currentTheme.effects.borderRadius}
            path="effects.borderRadius"
            min={0}
            max={24}
            step={1}
            unit="px"
          />
          <SelectControl
            label="Shadow Style"
            value={currentTheme.effects.shadow}
            path="effects.shadow"
            options={[
              { value: 'none', label: 'No Shadow' },
              { value: '0 1px 3px 0 rgb(0 0 0 / 0.1)', label: 'Subtle' },
              { value: '0 4px 6px -1px rgb(0 0 0 / 0.1)', label: 'Medium' },
              { value: '0 10px 15px -3px rgb(0 0 0 / 0.1)', label: 'Large' },
              { value: '0 20px 25px -5px rgb(0 0 0 / 0.25)', label: 'Extra Large' },
            ]}
          />
          <RangeSlider
            label="Blur Effect"
            value={currentTheme.effects.blur}
            path="effects.blur"
            min={0}
            max={20}
            step={1}
            unit="px"
          />
        </div>
      </div>
    </div>
  );

  const ThemesTab = () => (
    <div className="space-y-4">
      {/* Save Current Theme */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Theme</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Theme name"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (themeName.trim()) {
                onSaveTheme({ ...currentTheme, name: themeName.trim() });
                setThemeName('');
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Saved Themes */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Themes</h3>
        <div className="space-y-2">
          {savedThemes.map((theme) => (
            <div key={theme.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 rounded-full border border-gray-300" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <circle cx="8" cy="8" r="7" fill={theme.colors.primary} />
                </svg>
                <span className="text-gray-900 font-medium">{theme.name}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLoadTheme(theme)}
                >
                  Load
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteTheme(theme.name)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {savedThemes.length === 0 && (
            <p className="text-gray-500 text-center py-4">No saved themes yet</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-xl font-bold text-gray-900">Theme Editor</h2>
        <p className="text-sm text-gray-600">Customize your design system</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-3 py-3 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {activeTab === 'core' && <CoreStylingTab />}
        {activeTab === 'fonts' && <FontsTab />}
        {activeTab === 'borders' && <BordersTab />}
  {activeTab === 'advanced' && <AdvancedStylingTab />}
  {activeTab === 'page' && <PageTab />}
  {activeTab === 'grid' && <GridTab />}
        {activeTab === 'themes' && <ThemesTab />}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Reset to default theme
              const defaultTheme: Theme = {
                name: 'Default',
                colors: {
                  primary: '#c09254',
                  neutral: '#78716c',
                  success: '#16a34a',
                  warning: '#ca8a04',
                  error: '#dc2626',
                  info: '#2563eb',
                  background: {
                    primary: '#ffffff',
                    secondary: '#f8f9fa',
                    tertiary: '#e9ecef',
                    overlay: 'rgba(20, 15, 10, 0.95)',
                  },
                  text: {
                    primary: '#212529',
                    secondary: '#6c757d',
                    tertiary: '#adb5bd',
                    inverse: '#ffffff',
                  },
                  border: {
                    light: '#e9ecef',
                    medium: '#dee2e6',
                    dark: '#6c757d',
                  },
                },
                typography: {
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: {
                    base: '16px',
                    lg: '18px',
                    xl: '20px',
                    '2xl': '24px',
                  },
                  fontWeight: {
                    normal: '400',
                    medium: '500',
                    semibold: '600',
                    bold: '700',
                  },
                  // eslint-disable-next-line
                  leading: {
                    normal: '1.5',
                    relaxed: '1.625',
                    loose: '2',
                  },
                  dymo: {
                    fontSize: {
                      base: '32px',
                      lg: '40px',
                      xl: '48px',
                      '2xl': '64px',
                    },
                    letterSpacing: '-0.08em',
                    color: '#212529',
                  },
                },
                spacing: {
                  base: '8px',
                  component: '16px',
                  section: '32px',
                },
                borders: {
                  showBorders: false,
                  thickness: '1px',
                  borderStyle: 'solid',
                },
                effects: {
                  borderRadius: '8px',
                  shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  blur: '10px',
                },
                page: {
                  bgColor: '#ffffff',
                  bgImage: '',
                  bgRepeat: 'repeat',
                  bgAttachment: 'scroll',
                  bgSize: 'auto',
                  bgPosition: 'center',
                  opacity: 1,
                },
                grid: {
                  show: false,
                  inlineSize: '64px',
                  blockSize: '64px',
                  color: 'rgba(0,0,0,0.15)'
                }
              };
              onThemeChange(defaultTheme);
            }}
          >
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              updateTheme('page.bgColor', '#000000');
              updateTheme('page.opacity', 1 as any);
            }}
          >
            Set Page BG Black
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveTab('themes')}
          >
            Save Theme
          </Button>
        </div>
      </div>
    </div>
  );
};

// ===== SIDEBAR LAYOUT COMPONENT =====

interface SidebarLayoutProps {
  children: React.ReactNode;
  showThemeEditor?: boolean;
  themeEditorProps?: ThemeEditorProps;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  children,
  showThemeEditor = false,
  themeEditorProps,
}) => {
  return (
    <div className="flex h-screen bg-white">
      {showThemeEditor && themeEditorProps && (
        <ThemeEditor {...themeEditorProps} />
      )}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

// ===== THEME PROVIDER HOOK =====

export const useThemeEditor = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme>({
    name: 'Default',
    colors: {
      primary: '#c09254',
      neutral: '#78716c',
      success: '#16a34a',
      warning: '#ca8a04',
      error: '#dc2626',
      info: '#2563eb',
      background: {
        primary: '#ffffff',
        secondary: '#f8f9fa',
        tertiary: '#e9ecef',
        overlay: 'rgba(20, 15, 10, 0.95)',
      },
      text: {
        primary: '#212529',
        secondary: '#6c757d',
        tertiary: '#adb5bd',
        inverse: '#ffffff',
      },
      border: {
        light: '#e9ecef',
        medium: '#dee2e6',
        dark: '#6c757d',
      },
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: {
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      leading: {
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
      },
      dymo: {
        fontSize: {
          base: '32px',
          lg: '40px',
          xl: '48px',
          '2xl': '64px',
        },
        letterSpacing: '-0.08em',
        color: '#212529',
      },
    },
    spacing: {
      base: '8px',
      component: '16px',
      section: '32px',
    },
    borders: {
      showBorders: false,
      thickness: '1px',
      borderStyle: 'solid',
    },
    effects: {
      borderRadius: '8px',
      shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      blur: '10px',
    },
    page: {
      bgColor: '#ffffff',
      bgImage: '',
      bgRepeat: 'repeat',
      bgAttachment: 'scroll',
      bgSize: 'auto',
      bgPosition: 'center',
      opacity: 1,
    },
    grid: {
      show: false,
      inlineSize: '64px',
      blockSize: '64px',
      color: 'rgba(0,0,0,0.15)'
    }
  });

  const [savedThemes, setSavedThemes] = useState<Theme[]>([]);

  // Load themes from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('custom-themes');
    if (saved) {
      try {
        setSavedThemes(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved themes:', error);
      }
    }
  }, []);

  // Apply initial theme once on mount so CSS variables reflect currentTheme defaults
  useEffect(() => {
    applyThemeToCSS(currentTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save themes to localStorage
  const saveThemesToStorage = (themes: Theme[]) => {
    localStorage.setItem('custom-themes', JSON.stringify(themes));
  };

  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
    // Apply theme to CSS variables
    applyThemeToCSS(theme);
  };

  const handleSaveTheme = (theme: Theme) => {
    if (!theme.name || !theme.name.trim()) return;
    // Upsert by name: replace existing or append
    const idx = savedThemes.findIndex(t => t.name.toLowerCase() === theme.name.toLowerCase());
    let newThemes: Theme[];
    if (idx >= 0) {
      newThemes = savedThemes.slice();
      newThemes[idx] = theme;
    } else {
      newThemes = [...savedThemes, theme];
    }
    setSavedThemes(newThemes);
    saveThemesToStorage(newThemes);
  };

  const handleLoadTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    applyThemeToCSS(theme);
    // Move loaded theme to end (most-recent) without duplicating
    const others = savedThemes.filter(t => t.name !== theme.name);
    const newThemes = [...others, theme];
    setSavedThemes(newThemes);
    saveThemesToStorage(newThemes);
  };

  const handleDeleteTheme = (themeName: string) => {
    const newThemes = savedThemes.filter(t => t.name !== themeName);
    setSavedThemes(newThemes);
    saveThemesToStorage(newThemes);
  };

  return {
    currentTheme,
    savedThemes,
    onThemeChange: handleThemeChange,
    onSaveTheme: handleSaveTheme,
    onLoadTheme: handleLoadTheme,
    onDeleteTheme: handleDeleteTheme,
  };
};

// Helper function to apply theme to CSS variables
const applyThemeToCSS = (theme: Theme) => {
  const root = document.documentElement;
  const body = document.body;

  const hexToRgba = (hex: string, alpha: number) => {
    // Normalize shorthand #abc to #aabbcc
    const h = hex.replace('#','');
    const full = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
    const r = parseInt(full.substring(0,2),16);
    const g = parseInt(full.substring(2,4),16);
    const b = parseInt(full.substring(4,6),16);
    const a = Math.max(0, Math.min(1, alpha));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    if (typeof value === 'string') {
      root.style.setProperty(`--color-${key}`, value);
      // Also map primary color to 500 token for Tailwind classes like bg-primary-500
      if (key === 'primary') {
        root.style.setProperty('--color-primary-500', value);
      }
    } else {
      Object.entries(value).forEach(([subKey, subValue]) => {
        // Set nested tokens (e.g., text.primary -> --color-text-primary)
        root.style.setProperty(`--color-${key}-${subKey}`, subValue);
        // Also support Tailwind token naming for background colors (bg vs background)
        if (key === 'background') {
          root.style.setProperty(`--color-bg-${subKey}`, subValue);
        }
      });
    }
  });

  // Typography
  root.style.setProperty('--font-family-sans', theme.typography.fontFamily);
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-${key}`, value);
  });
  Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
    root.style.setProperty(`--font-weight-${key}`, value);
  });
  Object.entries(theme.typography.leading).forEach(([key, value]) => {
    root.style.setProperty(`--line-height-${key}`, value);
  });

  // Dymo Typography
  Object.entries(theme.typography.dymo.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-dymo-${key}`, value);
  });
  root.style.setProperty('--letter-spacing-dymo', theme.typography.dymo.letterSpacing);
  root.style.setProperty('--color-dymo', theme.typography.dymo.color);

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });
  // Provide common Tailwind spacing tokens so utility classes can pick up changes
  // Map base -> 4, component -> 6, section -> 8 as a reasonable default bridge
  root.style.setProperty('--spacing-4', theme.spacing.base);
  root.style.setProperty('--spacing-6', theme.spacing.component);
  root.style.setProperty('--spacing-8', theme.spacing.section);

  // Borders
  root.style.setProperty('--border-show', theme.borders.showBorders ? 'block' : 'none');
  // Map to Tailwind's default border width token so `border` uses this value
  root.style.setProperty('--border-width-1', theme.borders.thickness);
  // Keep a generic variable for custom CSS if needed
  root.style.setProperty('--border-width', theme.borders.thickness);
  root.style.setProperty('--border-style', theme.borders.borderStyle);

  // Effects
  Object.entries(theme.effects).forEach(([key, value]) => {
    if (key === 'borderRadius') {
      root.style.setProperty('--border-radius', value);
    } else if (key === 'shadow') {
      root.style.setProperty('--shadow', value);
    } else if (key === 'blur') {
      root.style.setProperty('--backdrop-blur', value);
    }
  });

  // Page background styling
  const page = theme.page || {
    bgColor: '#ffffff', bgImage: '', bgRepeat: 'repeat' as const, bgAttachment: 'scroll' as const,
    bgSize: 'auto' as const, bgPosition: 'center' as const, opacity: 1
  };
  try {
    const colorWithAlpha = hexToRgba(page.bgColor || '#ffffff', page.opacity ?? 1);
    // Expose as CSS variable and apply to html/body so outer wrappers inherit if transparent
    root.style.setProperty('--page-bg', colorWithAlpha);
    const targetRoot = page.applyTo === 'body' ? null : root;
    const targetBody = body;
    const img = page.bgImage && page.bgImage.trim().length > 0 ? page.bgImage : 'none';
    // Colors
    targetBody.style.backgroundColor = colorWithAlpha;
    if (targetRoot) targetRoot.style.backgroundColor = colorWithAlpha;
    // Images & properties
    targetBody.style.backgroundImage = img;
    if (targetRoot) targetRoot.style.backgroundImage = img;
    targetBody.style.backgroundRepeat = page.bgRepeat;
    if (targetRoot) targetRoot.style.backgroundRepeat = page.bgRepeat;
    targetBody.style.backgroundAttachment = page.bgAttachment;
    if (targetRoot) targetRoot.style.backgroundAttachment = page.bgAttachment;
    targetBody.style.backgroundSize = page.bgSize;
    if (targetRoot) targetRoot.style.backgroundSize = page.bgSize;
    targetBody.style.backgroundPosition = page.bgPosition;
    if (targetRoot) targetRoot.style.backgroundPosition = page.bgPosition;
  } catch {}

  // Grid overlay
  const grid = theme.grid || { show: false, inlineSize: '64px', blockSize: '64px', color: 'rgba(0,0,0,0.15)' };
  // Backward compatibility for legacy keys
  const gridInline = (grid.inlineSize ?? grid.colWidth ?? '64px');
  const gridBlock = (grid.blockSize ?? grid.rowHeight ?? '64px');
  let overlay = document.getElementById('theme-grid-overlay') as HTMLDivElement | null;
  if (grid.show) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'theme-grid-overlay';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '9998';
      document.body.appendChild(overlay);
    }
    overlay.style.backgroundImage = `repeating-linear-gradient(to right, ${grid.color}, ${grid.color} 1px, transparent 1px, transparent ${gridInline}), repeating-linear-gradient(to bottom, ${grid.color}, ${grid.color} 1px, transparent 1px, transparent ${gridBlock})`;
    overlay.style.backgroundSize = `${gridInline} ${gridBlock}`;
    overlay.style.display = 'block';
  } else if (overlay) {
    overlay.style.display = 'none';
  }
};