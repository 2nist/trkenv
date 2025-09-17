import type { Meta, StoryObj } from '@storybook/react';
import LabMenu from '../components/LabMenu/LabMenu';
import LrcAttachButton from '../components/LrcAttachButton';
import { SongSearch } from '../components/SongSearch';

// GUI Components Stories
const meta: Meta = {
  title: 'GUI Components',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Collection of all GUI components and pages in the application.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

// Lab Menu Component
export const LabMenuStory: Story = {
  name: 'Lab Menu',
  render: () => <LabMenu />,
  parameters: {
    docs: {
      description: {
        story: 'The main navigation menu for lab modules and tools.',
      },
    },
  },
};

// LRC Attach Button Component
export const LrcAttachButtonStory: Story = {
  name: 'LRC Attach Button',
  render: () => <LrcAttachButton songId="sample-song-123" tempo={120} />,
  parameters: {
    docs: {
      description: {
        story: 'Button component for attaching LRC (Lyrics) files.',
      },
    },
  },
};

// Song Search Component
export const SongSearchStory: Story = {
  name: 'Song Search',
  render: () => <SongSearch />,
  parameters: {
    docs: {
      description: {
        story: 'Search component for finding songs in the library.',
      },
    },
  },
};