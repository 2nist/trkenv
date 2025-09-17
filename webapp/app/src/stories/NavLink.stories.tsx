import type { Meta, StoryObj } from '@storybook/react';
import NavLink from '../components/nav/NavLink';

// NavLink Component Stories
const meta: Meta = {
  title: 'Navigation/NavLink',
  component: NavLink,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Individual navigation link component with active state styling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    href: {
      control: 'text',
      description: 'The URL path for the navigation link',
    },
    children: {
      control: 'text',
      description: 'The display text for the navigation link',
    },
  },
};

export default meta;
type Story = StoryObj<typeof NavLink>;

// Default NavLink Story
export const Default: Story = {
  name: 'Default',
  render: (args) => <NavLink {...args} />,
  args: {
    href: '/home',
    children: 'Home',
  },
  parameters: {
    docs: {
      description: {
        story: 'A standard navigation link.',
      },
    },
  },
};

// Active NavLink Story
export const Active: Story = {
  name: 'Active',
  render: (args) => <NavLink {...args} />,
  args: {
    href: '/',
    children: 'Home',
  },
  parameters: {
    docs: {
      description: {
        story: 'An active navigation link (when current path matches).',
      },
    },
    nextjs: {
      router: {
        pathname: '/',
      },
    },
  },
};

// Different Links
export const Library: Story = {
  name: 'Library Link',
  render: (args) => <NavLink {...args} />,
  args: {
    href: '/songs',
    children: 'Library',
  },
  parameters: {
    docs: {
      description: {
        story: 'Navigation link for the song library.',
      },
    },
  },
};

export const Editor: Story = {
  name: 'Editor Link',
  render: (args) => <NavLink {...args} />,
  args: {
    href: '/editor',
    children: 'Editor',
  },
  parameters: {
    docs: {
      description: {
        story: 'Navigation link for the song editor.',
      },
    },
  },
};