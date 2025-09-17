import type { Meta, StoryObj } from '@storybook/react';
import TopNav from '../components/nav/TopNav';

// TopNav Component Stories
const meta: Meta = {
  title: 'Navigation/TopNav',
  component: TopNav,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The top navigation header with logo and theme switcher.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TopNav>;

// Default TopNav Story
export const Default: Story = {
  name: 'Default',
  render: () => <TopNav />,
  parameters: {
    docs: {
      description: {
        story: 'The default top navigation header.',
      },
    },
  },
};

// TopNav with Theme Switcher
export const WithThemeSwitcher: Story = {
  name: 'With Theme Switcher',
  render: () => <TopNav />,
  parameters: {
    docs: {
      description: {
        story: 'Top navigation with integrated theme switcher.',
      },
    },
  },
};