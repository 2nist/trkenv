import type { Meta, StoryObj } from '@storybook/react';

// Simple page component for demonstration
const SimplePage = () => (
  <div className="welcome-page">
    <h1>Welcome to TRK Studio</h1>
    <p>
      This is a sample page that demonstrates how you can add pages to the Storybook sidebar.
      Users can easily add or remove pages by creating story files.
    </p>
    <div className="info-box">
      <h2>How to Add Pages:</h2>
      <ol>
        <li>Create a page component in the <code>pages/</code> directory</li>
        <li>Create a story file with <code>.stories.tsx</code> extension</li>
        <li>The page will automatically appear in the sidebar</li>
        <li>Use DYMO font for consistent styling</li>
      </ol>
    </div>
  </div>
);

// Page Stories
const meta: Meta = {
  title: 'Pages/Welcome',
  component: SimplePage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Welcome page demonstrating the customizable sidebar system.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

// Welcome Page Story
export const Welcome: Story = {
  name: 'Welcome Page',
  render: () => <SimplePage />,
  parameters: {
    docs: {
      description: {
        story: 'The main welcome page for TRK Studio.',
      },
    },
  },
};