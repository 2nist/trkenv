import type { Meta, StoryObj } from '@storybook/react';
import { ThemeSwitcher } from '../ui/theme-switcher';

// Theme Switcher Component Stories
const meta: Meta = {
  title: 'UI/ThemeSwitcher',
  component: ThemeSwitcher,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Theme switcher component for changing between different visual themes.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    themes: {
      control: 'object',
      description: 'Array of available theme names',
    },
    onSet: {
      action: 'themeChanged',
      description: 'Callback function when theme is changed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ThemeSwitcher>;

// Default Theme Switcher
export const Default: Story = {
  name: 'Default',
  render: (args) => <ThemeSwitcher {...args} />,
  args: {
    themes: ['midnight', 'current'],
    onSet: (theme: string) => console.log('Theme changed to:', theme),
  },
  parameters: {
    docs: {
      description: {
        story: 'Default theme switcher with midnight and current themes.',
      },
    },
  },
};

// Multiple Themes
export const MultipleThemes: Story = {
  name: 'Multiple Themes',
  render: (args) => <ThemeSwitcher {...args} />,
  args: {
    themes: ['midnight', 'current', 'glass', 'minimal'],
    onSet: (theme: string) => console.log('Theme changed to:', theme),
  },
  parameters: {
    docs: {
      description: {
        story: 'Theme switcher with multiple theme options.',
      },
    },
  },
};

// Single Theme
export const SingleTheme: Story = {
  name: 'Single Theme',
  render: (args) => <ThemeSwitcher {...args} />,
  args: {
    themes: ['midnight'],
    onSet: (theme: string) => console.log('Theme changed to:', theme),
  },
  parameters: {
    docs: {
      description: {
        story: 'Theme switcher with only one theme option.',
      },
    },
  },
};