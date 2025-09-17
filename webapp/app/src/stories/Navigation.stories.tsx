import type { Meta, StoryObj } from '@storybook/react';
import SideNav from '../components/nav/SideNav';

// Navigation Components Stories
const meta: Meta = {
  title: 'Navigation/SideNav',
  component: SideNav,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The main sidebar navigation component with persistent layout.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SideNav>;

// Default SideNav Story
export const Default: Story = {
  name: 'Default',
  render: () => <SideNav />,
  parameters: {
    docs: {
      description: {
        story: 'The default sidebar navigation with all navigation links and lab modules.',
      },
    },
  },
};

// Compact SideNav Story
export const Compact: Story = {
  name: 'Compact',
  render: () => (
    <div className="w-48">
      <SideNav />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A more compact version of the sidebar navigation.',
      },
    },
  },
};