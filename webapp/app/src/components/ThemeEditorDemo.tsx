import React from 'react';
import { ThemeEditor, useThemeEditor } from '../lib/theme-editor';
import { Button, Card, Heading, Text } from '../lib/design-system';

// ===== USAGE EXAMPLE =====

const ThemeEditorDemo: React.FC = () => {
  const themeEditor = useThemeEditor();

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Theme Editor Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-white p-4">
          <ThemeEditor {...themeEditor} />
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 space-y-8 bg-white">
          {/* Header */}
          <div className="text-center">
            <Heading level={1}>Theme Editor Demo</Heading>
            <Text variant="large" className="mt-2">
              Customize your design system in real-time
            </Text>
          </div>

          {/* Live Preview Components */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Button Examples */}
            <Card variant="elevated" padding="lg">
              <Heading level={3} className="mb-4">Buttons</Heading>
              <div className="space-y-3">
                <Button variant="primary" size="sm">Primary Button</Button>
                <Button variant="secondary" size="md">Secondary Button</Button>
                <Button variant="outline" size="lg">Outline Button</Button>
              </div>
            </Card>

            {/* Typography Examples */}
            <Card variant="elevated" padding="lg">
              <Heading level={3} className="mb-4">Typography</Heading>
              <div className="space-y-3">
                <Heading level={1}>Heading 1</Heading>
                <Heading level={2}>Heading 2</Heading>
                <Text variant="base">This is base text with normal styling.</Text>
                <Text variant="small" className="text-gray-600">
                  This is smaller text for secondary content.
                </Text>
              </div>
            </Card>

            {/* Color Palette */}
            <Card variant="elevated" padding="lg">
              <Heading level={3} className="mb-4">Color Palette</Heading>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary-500"></div>
                  <span className="text-sm">Primary</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-neutral-500"></div>
                  <span className="text-sm">Neutral</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-success"></div>
                  <span className="text-sm">Success</span>
                </div>
              </div>
            </Card>

            {/* Spacing Examples */}
            <Card variant="elevated" padding="lg">
              <Heading level={3} className="mb-4">Spacing</Heading>
              <div className="space-y-4">
                <div className="bg-primary-100 p-2 rounded">
                  <span className="text-sm">Tight spacing</span>
                </div>
                <div className="bg-primary-200 p-4 rounded">
                  <span className="text-sm">Normal spacing</span>
                </div>
                <div className="bg-primary-300 p-6 rounded">
                  <span className="text-sm">Relaxed spacing</span>
                </div>
              </div>
            </Card>

            {/* Effects Examples */}
            <Card variant="elevated" padding="lg">
              <Heading level={3} className="mb-4">Effects</Heading>
              <div className="space-y-4">
                <div className="bg-bg-secondary p-4 rounded shadow-sm">
                  <span className="text-sm">Small shadow</span>
                </div>
                <div className="bg-bg-secondary p-4 rounded shadow">
                  <span className="text-sm">Medium shadow</span>
                </div>
                <div className="bg-bg-secondary p-4 rounded shadow-lg">
                  <span className="text-sm">Large shadow</span>
                </div>
              </div>
            </Card>

            {/* Font Examples */}
            <Card variant="elevated" padding="lg">
              <Heading level={3} className="mb-4">Fonts</Heading>
              <div className="space-y-3">
                <p className="font-sans text-base">Sans Serif Font</p>
                <p className="font-mono text-sm">Monospace Font</p>
                <p className="font-handwritten text-dymo-base tracking-dymo">Sharpie Font</p>
              </div>
            </Card>
          </div>

          {/* Instructions */}
          <Card variant="outlined" padding="lg">
            <Heading level={2} className="mb-4">How to Use</Heading>
            <div className="space-y-3 text-sm">
              <p>
                <strong>Core Tab:</strong> Customize basic colors, typography, and spacing
              </p>
              <p>
                <strong>Advanced Tab:</strong> Fine-tune effects, font weights, and line heights
              </p>
              <p>
                <strong>Themes Tab:</strong> Save your custom themes and load them later
              </p>
              <p>
                <strong>Live Preview:</strong> See changes instantly applied to all components
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ThemeEditorDemo;