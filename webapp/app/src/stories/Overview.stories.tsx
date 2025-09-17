import type { Meta, StoryObj } from '@storybook/react';

// Welcome component for Storybook overview
const WelcomeComponent = () => (
  <div className="welcome-container p-8 max-w-4xl mx-auto font-typewriter">
    <h1 className="text-4xl font-bold text-gray-900 mb-4 font-dymo">
      🎨 TRK Studio Storybook
    </h1>

    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
      Welcome to the TRK Studio component library! This Storybook contains all the reusable
      components, UI elements, and pages for the DAWSheet music production application.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-xl font-bold text-gray-900 mb-3 font-dymo">
          🧭 Navigation
        </h3>
        <ul className="text-gray-600 ml-4 space-y-1">
          <li>SideNav - Main sidebar navigation</li>
          <li>TopNav - Header with logo and theme switcher</li>
          <li>NavLink - Individual navigation links</li>
        </ul>
      </div>

      <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-xl font-bold text-gray-900 mb-3 font-dymo">
          🎛️ UI Components
        </h3>
        <ul className="text-gray-600 ml-4 space-y-1">
          <li>ThemeSwitcher - Theme selection dropdown</li>
          <li>LabMenu - Lab modules navigation</li>
          <li>SongSearch - Song library search</li>
        </ul>
      </div>

      <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-xl font-bold text-gray-900 mb-3 font-dymo">
          📄 Pages
        </h3>
        <ul className="text-gray-600 ml-4 space-y-1">
          <li>Welcome Page - Getting started</li>
          <li>Editor - Song editing interface</li>
          <li>Library - Song management</li>
        </ul>
      </div>
    </div>

    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-300">
      <h3 className="text-xl font-bold text-gray-900 mb-3 font-dymo">
        🚀 Getting Started
      </h3>
      <ul className="text-gray-600 ml-4 space-y-1">
        <li>Use the sidebar to navigate between different components</li>
        <li>Click "Docs" to see component documentation</li>
        <li>Use the controls panel to modify component props</li>
        <li>All components use the DYMO font for consistent branding</li>
      </ul>
    </div>
  </div>
);

// Storybook Overview
const meta: Meta = {
  title: 'Overview/Welcome',
  component: WelcomeComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Welcome page and overview of the TRK Studio Storybook.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

// Welcome Story
export const Welcome: Story = {
  name: 'Welcome to TRK Studio',
  render: () => <WelcomeComponent />,
  parameters: {
    docs: {
      description: {
        story: 'Overview of all available components and getting started guide.',
      },
    },
  },
};