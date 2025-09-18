import { useRouter } from "next/router";
import Link from "next/link";
import { Button, Card, Heading, Text } from '../src/lib/design-system';

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-6 flex items-center justify-center font-typewriter bg-white">
      <div className="max-w-4xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center">
          <Heading level={1} className="mb-4 font-dymo">Welcome to TRK Lab</Heading>
          <Text variant="large" className="text-gray-600 mb-6">
            Your creative workspace with integrated design system customization
          </Text>
          <div className="flex justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/theme-editor-integration')}
            >
              Try Theme Editor
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/design')}
            >
              View Components
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="elevated" padding="lg" className="text-center bg-white">
            <div className="text-4xl mb-4 text-blue-500">■</div>
            <Heading level={3} className="mb-2">Theme Editor</Heading>
            <Text variant="small" className="text-gray-600 mb-4">
              Customize your design system with our integrated theme editor in the left sidebar
            </Text>
            <button className="w-full px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors">
              Try It Now
            </button>
          </Card>

          <Card variant="elevated" padding="lg" className="text-center bg-white">
            <div className="text-4xl mb-4 text-green-500">□</div>
            <Heading level={3} className="mb-2">Component Library</Heading>
            <Text variant="small" className="text-gray-600 mb-4">
              Pre-built components using your design tokens for consistent UI
            </Text>
            <button className="w-full px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors">
              Browse Components
            </button>
          </Card>

          <Card variant="elevated" padding="lg" className="text-center bg-white">
            <div className="text-4xl mb-4 text-purple-500">♪</div>
            <Heading level={3} className="mb-2">Music Tools</Heading>
            <Text variant="small" className="text-gray-600 mb-4">
              Specialized tools for music production and audio engineering
            </Text>
            <button className="w-full px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors">
              Explore Tools
            </button>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card variant="outlined" padding="lg" className="bg-white">
          <Heading level={2} className="mb-4 text-center">Quick Start</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Heading level={3} className="mb-3">Customize Your Theme</Heading>
              <ol className="space-y-2 text-sm list-decimal list-inside text-gray-700">
                <li>Click "Theme Editor" in the top navigation</li>
                <li>Use the color pickers to change colors</li>
                <li>Adjust typography and spacing sliders</li>
                <li>Save your theme for future use</li>
              </ol>
            </div>
            <div>
              <Heading level={3} className="mb-3">Use Components</Heading>
              <ol className="space-y-2 text-sm list-decimal list-inside text-gray-700">
                <li>Import components from the design system</li>
                <li>Use semantic class names like `bg-primary`</li>
                <li>Components automatically use your theme</li>
                <li>Maintain consistency across your app</li>
              </ol>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-gray-500">
          <Text variant="small">
            Built with Next.js, TypeScript, and Tailwind CSS
          </Text>
        </div>
      </div>
    </main>
  );
}
